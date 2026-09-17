// ============================================================
// QUESTS - Dynamic Quest Management
// ============================================================

let allQuests = [];
let currentEditQuest = null; // Track which sub-quest's dialogues are being edited

function getDialogueDelta(dlg, optionKey) {
  const explicit = dlg?.[`option_${optionKey}_delta`];
  if (explicit !== undefined && explicit !== null && explicit !== '') {
    return Number(explicit);
  }

  const isCorrect = Boolean(dlg?.[`option_${optionKey}_correct`]);
  if (isCorrect) return 0;

  return Number(dlg?.suspicion_penalty ?? 10);
}

function formatDelta(delta) {
  const value = Number(delta || 0);
  return `${value > 0 ? '+' : ''}${value}`;
}

function dialogueHasChoices(dlg) {
  return Boolean(
    String(dlg?.option_a_text || '').trim() ||
    String(dlg?.option_b_text || '').trim() ||
    String(dlg?.option_c_text || '').trim()
  );
}

function formatSpeakerSegment(name, text) {
  const safeName = String(name || '').trim();
  const safeText = String(text || '').trim();
  if (!safeName && !safeText) return '';
  if (!safeName) return safeText;
  if (!safeText) return `${safeName}:`;
  return `${safeName}:\n${safeText}`;
}

const MAX_DIALOGUE_SPEAKER_BLOCKS = 5;

function normalizeDialogueSpeakerBlocks(blocks, fallbackNpcName = 'NPC') {
  const normalized = (Array.isArray(blocks) ? blocks : [])
    .slice(0, MAX_DIALOGUE_SPEAKER_BLOCKS)
    .map(block => ({
      name: String(block?.name || '').trim(),
      text: String(block?.text || '').trim()
    }));

  if (normalized.length === 0) {
    normalized.push({ name: fallbackNpcName || 'NPC', text: '' });
  }

  if (!normalized[0].name) {
    normalized[0].name = fallbackNpcName || 'NPC';
  }

  return normalized.slice(0, MAX_DIALOGUE_SPEAKER_BLOCKS);
}

function parseDialogueBlocks(rawText, fallbackNpcName = 'NPC') {
  const text = String(rawText || '').replace(/\r/g, '').trim();
  const speakerPattern = /^([^:\n]+):\n([\s\S]*?)(?=\n\n[^:\n]+:\n|$)/gm;
  const narrationSegments = [];
  const speakerBlocks = [];
  let lastIndex = 0;
  let match;

  while ((match = speakerPattern.exec(text)) !== null) {
    const leadingText = text.slice(lastIndex, match.index).trim();
    if (leadingText) {
      narrationSegments.push(leadingText);
    }

    speakerBlocks.push({
      name: match[1].trim(),
      text: match[2].trim()
    });

    lastIndex = match.index + match[0].length;
  }

  const trailingText = text.slice(lastIndex).trim();
  if (trailingText) {
    narrationSegments.push(trailingText);
  }

  if (speakerBlocks.length === 0) {
    return {
      narrationText: '',
      speakerBlocks: normalizeDialogueSpeakerBlocks([
        { name: fallbackNpcName || 'NPC', text }
      ], fallbackNpcName)
    };
  }

  return {
    narrationText: narrationSegments.join('\n\n').trim(),
    speakerBlocks: normalizeDialogueSpeakerBlocks(speakerBlocks, fallbackNpcName)
  };
}

function buildDialogueRowsFromBlocks(narrationText, speakerBlocks, choicePayload, fallbackNpcName = 'NPC') {
  const cleanedNarration = String(narrationText || '').trim();
  const normalizedBlocks = normalizeDialogueSpeakerBlocks(speakerBlocks, fallbackNpcName)
    .map((block, index) => ({
      name: String(block.name || '').trim() || (index === 0 ? fallbackNpcName : ''),
      text: String(block.text || '').trim()
    }))
    .filter(block => block.text);

  if (normalizedBlocks.length === 0) {
    return [];
  }

  return normalizedBlocks.map((block, index) => {
    const isLastBlock = index === normalizedBlocks.length - 1;
    const hasChoicePayload = Boolean(
      choicePayload.option_a_text ||
      choicePayload.option_b_text ||
      choicePayload.option_c_text
    );
    const attachChoices = isLastBlock && hasChoicePayload;
    const npcText = index === 0 && cleanedNarration
      ? `${cleanedNarration}\n\n${block.text}`.trim()
      : block.text;

    return {
      npc_name: block.name || fallbackNpcName,
      npc_text: npcText,
      option_a_text: attachChoices ? choicePayload.option_a_text : '',
      option_b_text: attachChoices ? choicePayload.option_b_text : '',
      option_c_text: attachChoices ? choicePayload.option_c_text : null,
      option_a_correct: attachChoices ? choicePayload.option_a_correct : 0,
      option_b_correct: attachChoices ? choicePayload.option_b_correct : 0,
      option_c_correct: attachChoices ? choicePayload.option_c_correct : 0,
      option_a_delta: attachChoices ? choicePayload.option_a_delta : 0,
      option_b_delta: attachChoices ? choicePayload.option_b_delta : 0,
      option_c_delta: attachChoices ? choicePayload.option_c_delta : 0,
      suspicion_penalty: attachChoices ? choicePayload.suspicion_penalty : 0,
      context_notes: attachChoices ? choicePayload.context_notes : ''
    };
  });
}

function getDialogueSpeakerBlocksFromForm(prefix) {
  return Array.from(document.querySelectorAll(`#${prefix}-speaker-list [data-dialogue-speaker-block]`)).map(block => ({
    name: block.querySelector('[data-speaker-name]')?.value?.trim() || '',
    text: block.querySelector('[data-speaker-text]')?.value?.trim() || ''
  }));
}

function getDialogueChoiceValues(prefix) {
  const option_a_text = document.getElementById(`${prefix}-opta`)?.value?.trim() || '';
  const option_b_text = document.getElementById(`${prefix}-optb`)?.value?.trim() || '';
  const option_c_text = document.getElementById(`${prefix}-optc`)?.value?.trim() || null;

  const correctOption = document.querySelector(`input[name="${prefix}-correct"]:checked`)?.value;
  const option_a_correct = correctOption === 'a' ? 1 : 0;
  const option_b_correct = correctOption === 'b' ? 1 : 0;
  const option_c_correct = correctOption === 'c' ? 1 : 0;

  const option_a_delta = parseInt(document.getElementById(`${prefix}-delta-a`)?.value, 10);
  const option_b_delta = parseInt(document.getElementById(`${prefix}-delta-b`)?.value, 10);
  const option_c_delta = parseInt(document.getElementById(`${prefix}-delta-c`)?.value, 10);

  return {
    option_a_text,
    option_b_text,
    option_c_text,
    option_a_correct,
    option_b_correct,
    option_c_correct,
    option_a_delta,
    option_b_delta,
    option_c_delta,
    suspicion_penalty: Number.isFinite(option_b_delta) ? option_b_delta : 10,
    context_notes: document.getElementById(`${prefix}-notes`)?.value?.trim() || ''
  };
}

async function createDialogueRow(questId, payload, sequenceOrder) {
  const isNarrationOnlyRow = !payload.option_a_text && !payload.option_b_text && !payload.option_c_text;
  const createPayload = {
    ...payload,
    ...(sequenceOrder !== undefined ? { sequence_order: sequenceOrder } : {})
  };

  if (isNarrationOnlyRow) {
    createPayload.option_a_text = ' ';
    createPayload.option_b_text = ' ';
  }

  const result = await apiCall(`/quests/${questId}/dialogues`, {
    method: 'POST',
    body: JSON.stringify(createPayload)
  });

  if (isNarrationOnlyRow) {
    await apiCall(`/quests/dialogues/${result.dialogueId}`, {
      method: 'PUT',
      body: JSON.stringify({
        option_a_text: '',
        option_b_text: '',
        option_c_text: null,
        option_a_correct: 0,
        option_b_correct: 0,
        option_c_correct: 0,
        option_a_delta: 0,
        option_b_delta: 0,
        option_c_delta: 0,
        suspicion_penalty: 0,
        context_notes: ''
      })
    });
  }

  return result;
}

async function shiftDialogueSequenceOrders(questId, startingSequence, delta) {
  if (!delta) return;

  const data = await apiCall(`/quests/${questId}/dialogues`);
  const laterDialogues = (data.dialogues || [])
    .filter(dlg => dlg.sequence_order > startingSequence)
    .sort((a, b) => delta > 0
      ? b.sequence_order - a.sequence_order
      : a.sequence_order - b.sequence_order);

  for (const dialogue of laterDialogues) {
    await apiCall(`/quests/dialogues/${dialogue.id}`, {
      method: 'PUT',
      body: JSON.stringify({ sequence_order: dialogue.sequence_order + delta })
    });
  }
}

function bindDialogueSpeakerControls(prefix) {
  const addButton = document.getElementById(`${prefix}-speaker-add`);
  if (addButton) {
    addButton.onclick = event => {
      event.preventDefault();
      event.stopPropagation();
      addDialogueSpeakerBlock(prefix);
    };
  }

  const container = document.getElementById(`${prefix}-speaker-list`);
  if (!container) return;

  container.querySelectorAll('[data-remove-speaker-index]').forEach(button => {
    button.onclick = event => {
      event.preventDefault();
      event.stopPropagation();
      const index = Number(button.dataset.removeSpeakerIndex);
      removeDialogueSpeakerBlock(prefix, index);
    };
  });
}

function renderDialogueSpeakerBlocks(prefix, blocks) {
  const container = document.getElementById(`${prefix}-speaker-list`);
  if (!container) return;

  const normalized = normalizeDialogueSpeakerBlocks(blocks);
  container.innerHTML = normalized.map((block, index) => `
    <div class="dlg-form-field" data-dialogue-speaker-block>
      <div class="dlg-form-row">
        <div class="dlg-form-field dlg-f-half">
          <label>NPC ${index + 1} Name</label>
          <input type="text" data-speaker-name value="${esc(block.name)}" placeholder="e.g., Basilio, Simoun, Isagani">
        </div>
        <div class="dlg-form-field dlg-f-half">
          <label>NPC ${index + 1} Dialogue</label>
          <textarea data-speaker-text rows="3" placeholder="Dialogue line for NPC ${index + 1}...">${esc(block.text)}</textarea>
        </div>
      </div>
      ${normalized.length > 1 ? `
        <div class="dlg-form-actions">
          <button class="dlg-form-cancel" type="button" data-remove-speaker-index="${index}">REMOVE NPC ${index + 1}</button>
        </div>
      ` : ''}
    </div>
  `).join('');

  const addButton = document.getElementById(`${prefix}-speaker-add`);
  if (addButton) {
    const isMaxed = normalized.length >= MAX_DIALOGUE_SPEAKER_BLOCKS;
    addButton.disabled = isMaxed;
    addButton.textContent = isMaxed ? 'MAX 5 NPCS' : '+ ADD NPC';
  }

  bindDialogueSpeakerControls(prefix);
}

function addDialogueSpeakerBlock(prefix) {
  const blocks = getDialogueSpeakerBlocksFromForm(prefix);
  if (blocks.length >= MAX_DIALOGUE_SPEAKER_BLOCKS) {
    showT('Maximum of 5 NPC dialogue blocks per line', 'error');
    return;
  }

  blocks.push({ name: '', text: '' });
  renderDialogueSpeakerBlocks(prefix, blocks);
}

function removeDialogueSpeakerBlock(prefix, index) {
  const blocks = getDialogueSpeakerBlocksFromForm(prefix);
  if (blocks.length <= 1) return;

  blocks.splice(index, 1);
  renderDialogueSpeakerBlocks(prefix, blocks);
}

// ============================================================
// QUEST HIERARCHY
// A bottom-up tree of the designed quest structure, like the game's questing plan:
// the sub-quests of Main Quests 1-4 join into their main quests, MQ1+MQ2 lead into
// MQ5 SQ1 and MQ3+MQ4 into MQ5 SQ2, both lead into MQ6, and MQ6 into MQ7.
// ============================================================

// Main quest names, shown on the main quest boxes and in the details box
const MQ_NAMES = {
  1: 'The Mask of Simoun',
  2: 'Power and Education',
  3: 'The Fuse is Lit',
  4: 'Collapse and Consequences',
  5: 'The Lamp Conspiracy',
  6: 'The Fall of Simoun',
  7: 'Final Boss'
};

// Designed sub-quests per main quest (20 in total). The tree is laid out from this, so a
// sub-quest missing from the database still gets a dashed box instead of shifting the tree.
const QUEST_DESIGN = { 1: 4, 2: 4, 3: 4, 4: 4, 5: 2, 6: 1, 7: 1 };

let questStatsByKey = {};        // "mq-sq" -> { completed, game_overs }
let questStatsLoaded = false;
const questDialogueCounts = {};  // quest id -> dialogue line count, loaded when a box opens
let qhNodes = {};                // node id -> layout + element
let qhParents = {};              // node id -> parent node id
let qhEdges = {};                // node id -> path to its parent
let qhUps = {};                  // parent node id -> arrow segment into it
let qhSelected = null;           // node id shown in the details box
let qhReturnFocus = null;

const QH_SVG_NS = 'http://www.w3.org/2000/svg';
const qhKey = (mq, sq) => `${mq}-${sq}`;

function questFor(mq, sq) {
  return allQuests.find(q => q.main_quest === mq && q.sub_quest === sq) || null;
}

function isQuestActive(q) {
  return !!q && (q.status === 'active' || q.status === 'completed');
}

function chapterRangeText(start, end) {
  if (start == null) return '—';
  return (end == null || end === start) ? `${start}` : `${start}–${end}`;
}

function qhMainQuestRange(mq) {
  const rows = allQuests.filter(q => q.main_quest === mq && q.chapter_start != null);
  if (rows.length === 0) return '—';
  const start = Math.min(...rows.map(q => q.chapter_start));
  const end = Math.max(...rows.map(q => (q.chapter_end == null ? q.chapter_start : q.chapter_end)));
  return chapterRangeText(start, end);
}

function qhSvg(tag, attrs, parent) {
  const el = document.createElementNS(QH_SVG_NS, tag);
  Object.entries(attrs).forEach(([k, v]) => el.setAttribute(k, v));
  if (parent) parent.appendChild(el);
  return el;
}

function qhTruncate(text, max) {
  const s = String(text || '');
  return s.length > max ? `${s.slice(0, max - 1)}…` : s;
}

// Splits items into `parts` consecutive groups (4 main quests into 2 -> [2, 2]).
function qhChunk(items, parts) {
  const size = Math.ceil(items.length / parts);
  return Array.from({ length: parts }, (_, i) => items.slice(i * size, (i + 1) * size));
}

function renderQuestSummary() {
  const el = document.getElementById('qh-summary');
  const designedTotal = Object.values(QUEST_DESIGN).reduce((a, b) => a + b, 0);
  let active = 0, artifacts = 0;
  Object.entries(QUEST_DESIGN).forEach(([mq, count]) => {
    for (let sq = 1; sq <= count; sq++) {
      const q = questFor(Number(mq), sq);
      if (isQuestActive(q)) active++;
      if (q && q.artifact_name && Number(q.artifacts_total) > 0) artifacts++;
    }
  });
  const players = allQuests.reduce((s, q) => s + toStatNumber(q.player_count), 0);

  if (el) {
    el.innerHTML = `
      <span class="qh-sum-chip"><b>${active}/${designedTotal}</b> sub-quests active</span>
      <span class="qh-sum-chip"><b>${artifacts}/${designedTotal}</b> artifacts set</span>
      <span class="qh-sum-chip"><b>${players}</b> players inside quests</span>
      <span class="qh-sum-chip"><b>39</b> chapters</span>`;
  }
  const lbl = document.getElementById('stat-qt-chap');
  if (lbl) lbl.textContent = `${active}/${designedTotal} ACTIVE · CH. 1–39`;
}

function renderQuestHierarchy() {
  const edgesG = document.getElementById('qh-edges');
  const nodesG = document.getElementById('qh-nodes');
  if (!edgesG || !nodesG) return;
  edgesG.textContent = '';
  nodesG.textContent = '';
  qhNodes = {}; qhParents = {}; qhEdges = {}; qhUps = {};

  renderQuestSummary();

  const VIEW_W = 1100;
  const SIZE = { leaf: [52, 46], mq: [212, 66], upper: [290, 66], top: [290, 72] };
  const Y = { leaf: 530, mq: 408, upper: [292, 178], top: 62 };
  const all = [];
  const make = (id, kind, mq, sq, y, children = []) => {
    const n = { id, kind, mq, sq, x: 0, y, w: SIZE[kind][0], h: SIZE[kind][1], children };
    children.forEach(c => { qhParents[c.id] = id; });
    all.push(n);
    return n;
  };
  const avgX = nodes => nodes.reduce((s, n) => s + n.x, 0) / nodes.length;

  // Bottom two levels: the sub-quests of MQ1-4 and their main quest boxes.
  const leaves = [];
  let below = [1, 2, 3, 4].map((mq, g) => {
    const kids = [];
    for (let sq = 1; sq <= QUEST_DESIGN[mq]; sq++) {
      const leaf = make(`q-${mq}-${sq}`, 'leaf', mq, sq, Y.leaf);
      leaf.x = leaves.length * 61 + g * 28;
      leaves.push(leaf);
      kids.push(leaf);
    }
    return make(`mq-${mq}`, 'mq', mq, null, Y.mq, kids);
  });
  const shift = (VIEW_W - (leaves[leaves.length - 1].x - leaves[0].x)) / 2 - leaves[0].x;
  leaves.forEach(n => { n.x += shift; });
  below.forEach(n => { n.x = avgX(n.children); });

  // Upper levels: each sub-quest of MQ5, MQ6 and MQ7 joins an equal share of the level below.
  [5, 6, 7].forEach((mq, i, list) => {
    const kind = i === list.length - 1 ? 'top' : 'upper';
    const y = kind === 'top' ? Y.top : Y.upper[i];
    below = qhChunk(below, QUEST_DESIGN[mq]).map((kids, k) => {
      const n = make(`q-${mq}-${k + 1}`, kind, mq, k + 1, y, kids);
      n.x = avgX(kids);
      return n;
    });
  });

  // Connectors: child up to a shared middle line, across to the parent, then an arrow up.
  all.forEach(p => {
    if (!p.children.length) return;
    const pBottom = p.y + p.h / 2;
    const childTop = Math.min(...p.children.map(c => c.y - c.h / 2));
    const midY = Math.round((pBottom + childTop) / 2);
    p.children.forEach(c => {
      qhEdges[c.id] = qhSvg('path', { class: 'qh-edge', d: `M${c.x} ${c.y - c.h / 2}V${midY}H${p.x}` }, edgesG);
    });
    qhUps[p.id] = qhSvg('path', { class: 'qh-edge', d: `M${p.x} ${midY}V${pBottom + 3}`, 'marker-end': 'url(#qh-arrow)' }, edgesG);
  });

  all.forEach(n => qhDrawNode(n, nodesG));

  if (qhSelected && qhNodes[qhSelected]) qhLight(qhSelected);
  else qhLight(null);
  if (typeof applyTopbarSearch === 'function') applyTopbarSearch();
}

function qhDrawNode(n, layer) {
  const isMain = n.kind === 'mq';
  const q = isMain ? null : questFor(n.mq, n.sq);
  const mqRows = isMain ? allQuests.filter(r => r.main_quest === n.mq) : [];
  const missing = !isMain && !q;
  const inactive = !isMain && q && !isQuestActive(q);
  const players = isMain
    ? mqRows.reduce((s, r) => s + toStatNumber(r.player_count), 0)
    : (q ? toStatNumber(q.player_count) : 0);
  const chapters = isMain ? qhMainQuestRange(n.mq) : (q ? chapterRangeText(q.chapter_start, q.chapter_end) : '—');
  const title = isMain ? (MQ_NAMES[n.mq] || `Main Quest ${n.mq}`) : (q ? (q.title || 'Untitled sub-quest') : 'Not in database');
  const label = isMain ? `Main Quest ${n.mq}` : `Main Quest ${n.mq} sub-quest ${n.sq}`;

  const cls = ['qh-node', `qh-${n.kind}`];
  if (missing) cls.push('qh-missing');
  if (inactive) cls.push('qh-inactive');

  const g = qhSvg('g', {
    class: cls.join(' '),
    tabindex: 0,
    role: 'button',
    'aria-label': `${label}: ${title}, chapters ${chapters}${players ? `, ${players} players on it now` : ''}`,
    'data-search': [label, `MQ${n.mq}`, n.sq ? `SQ${n.sq}` : '', title, q ? q.artifact_name : '', `Ch. ${chapters}`, MQ_NAMES[n.mq]]
      .filter(Boolean).join(' ').toLowerCase()
  }, layer);
  qhSvg('title', {}, g).textContent = `${isMain ? `Main Quest ${n.mq}` : `MQ${n.mq} · SQ${n.sq}`} · ${title} · Ch. ${chapters}`;
  qhSvg('rect', { x: n.x - n.w / 2, y: n.y - n.h / 2, width: n.w, height: n.h, rx: n.kind === 'leaf' ? 4 : 6 }, g);

  const text = (className, y, value) => {
    qhSvg('text', { class: className, x: n.x, y, 'text-anchor': 'middle' }, g).textContent = value;
  };
  if (n.kind === 'leaf') {
    text('qh-t-code', n.y - 3, `SQ${n.sq}`);
    text('qh-t-sub', n.y + 13, chapters);
  } else {
    let eyebrow = `MAIN QUEST ${n.mq}`;
    if (!isMain && QUEST_DESIGN[n.mq] > 1) eyebrow += ` · SQ${n.sq}`;
    if (n.kind === 'top') eyebrow += ' · FINAL';
    text('qh-t-eyebrow', n.y - n.h / 2 + 17, eyebrow);
    text('qh-t-title', n.y + 5, qhTruncate(title, Math.floor(n.w / 7.6)));
    text('qh-t-sub', n.y + n.h / 2 - 10, `Ch. ${chapters}`);
  }

  if (players > 0) {
    const bx = n.x + n.w / 2 - 2, by = n.y - n.h / 2 + 2;
    qhSvg('circle', { class: 'qh-badge', cx: bx, cy: by, r: 9 }, g);
    qhSvg('text', { class: 'qh-badge-t', x: bx, y: by + 3.5, 'text-anchor': 'middle' }, g).textContent = players > 99 ? '99+' : String(players);
  }

  g.addEventListener('click', () => openQuestNode(n.id));
  g.addEventListener('keydown', e => {
    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openQuestNode(n.id); }
  });
  qhNodes[n.id] = { ...n, el: g };
}

// Lights the selected box and its path up to Main Quest 7; `null` clears it.
function qhLight(id) {
  const svg = document.getElementById('qh-svg');
  if (!svg) return;
  svg.querySelectorAll('.lit, .qh-selected').forEach(el => el.classList.remove('lit', 'qh-selected'));
  Object.values(qhUps).forEach(p => p.setAttribute('marker-end', 'url(#qh-arrow)'));
  const lamp = document.getElementById('qh-lamp');
  const node = id ? qhNodes[id] : null;
  if (!node) { if (lamp) lamp.classList.remove('on'); return; }

  node.el.classList.add('lit', 'qh-selected');
  if (lamp) {
    lamp.setAttribute('cx', node.x);
    lamp.setAttribute('cy', node.y);
    lamp.setAttribute('r', Math.max(node.w * 0.75, 90));
    lamp.classList.add('on');
  }
  let cur = id;
  while (qhParents[cur]) {
    const parent = qhParents[cur];
    if (qhEdges[cur]) qhEdges[cur].classList.add('lit');
    if (qhUps[parent]) {
      qhUps[parent].classList.add('lit');
      qhUps[parent].setAttribute('marker-end', 'url(#qh-arrow-lit)');
    }
    if (qhNodes[parent]) qhNodes[parent].el.classList.add('lit');
    cur = parent;
  }
}

// ---------------------------------------------------------------- details box

function qhBoxOpen() {
  const wrap = document.getElementById('qh-wrap');
  return !!wrap && wrap.classList.contains('qh-open');
}

// Centers the (fixed) box over the content area, not the whole window, so it sits over
// the hierarchy rather than half behind the sidebar.
function qhPlaceBox() {
  const box = document.getElementById('qh-box');
  const area = document.querySelector('.content') || document.body;
  if (!box) return;
  const r = area.getBoundingClientRect();
  box.style.setProperty('--qh-cx', `${Math.round(r.left + r.width / 2)}px`);
  box.style.setProperty('--qh-cy', `${Math.round(r.top + r.height / 2)}px`);
}

function qhFocusFirst() {
  const box = document.getElementById('qh-box');
  if (!box) return;
  const target = box.querySelector('input') || box.querySelector('.qh-actions button, .qh-sq-item') || box.querySelector('button');
  if (target) target.focus({ preventScroll: true });
}

// Shows `html` in the box: opens it with the scale-in animation, or cross-fades the face
// when it is already open. `after` runs once the new content is in place.
function qhShowFace(html, after) {
  const wrap = document.getElementById('qh-wrap');
  const box = document.getElementById('qh-box');
  const face = document.getElementById('qh-face');
  if (!wrap || !box || !face) return;

  const fill = () => {
    face.innerHTML = html;
    if (typeof after === 'function') after();
  };

  if (!qhBoxOpen()) {
    qhReturnFocus = document.activeElement;
    qhPlaceBox();
    fill();
    box.setAttribute('aria-hidden', 'false');
    requestAnimationFrame(() => {
      wrap.classList.add('qh-open');
      setTimeout(qhFocusFirst, 60);
    });
  } else {
    face.classList.add('qh-swap');
    setTimeout(() => {
      fill();
      face.classList.remove('qh-swap');
      qhFocusFirst();
    }, 170);
  }
}

function closeQuestDetails() {
  const wrap = document.getElementById('qh-wrap');
  const box = document.getElementById('qh-box');
  if (!wrap || !qhBoxOpen()) return;
  wrap.classList.remove('qh-open', 'qh-editing');
  if (box) box.setAttribute('aria-hidden', 'true');
  const returnTo = (qhSelected && qhNodes[qhSelected]) ? qhNodes[qhSelected].el : qhReturnFocus;
  qhSelected = null;
  qhLight(null);
  if (returnTo && typeof returnTo.focus === 'function') returnTo.focus({ preventScroll: true });
}

function openQuestNode(id) {
  const node = qhNodes[id];
  if (!node) return;
  const wrap = document.getElementById('qh-wrap');
  if (wrap) wrap.classList.remove('qh-editing');
  qhSelected = id;
  qhLight(id);
  if (node.kind === 'mq') openMainQuestDetails(node.mq);
  else openQuestDetails(node.mq, node.sq);
}

function qhHead(eyebrow, title, right) {
  return `
    <div class="qh-box-head">
      <div>
        <div class="qh-eyebrow">${esc(eyebrow)}</div>
        <h3 class="qh-box-title" id="qh-box-title">${esc(title)}</h3>
      </div>
      <div class="qh-box-tools">
        ${right}
        <button type="button" class="qh-x" aria-label="Close details" onclick="closeQuestDetails()">✕</button>
      </div>
    </div>`;
}

function qhStat(value, label, tone) {
  return `<div class="qh-stat"><div class="qh-stat-v ${tone || ''}">${esc(String(value))}</div><div class="qh-stat-l">${label}</div></div>`;
}

function qhDialogueChip(questId) {
  const count = questDialogueCounts[questId];
  if (count == null) return `<span class="qh-chip" id="qh-dlg-count" data-quest="${questId}">Counting dialogue lines…</span>`;
  return `<span class="qh-chip${count === 0 ? ' warn' : ''}" id="qh-dlg-count" data-quest="${questId}">${count} dialogue line${count === 1 ? '' : 's'}</span>`;
}

async function qhLoadDialogueCount(questId) {
  if (questDialogueCounts[questId] == null) {
    try {
      const data = await apiCall(`/quests/${questId}/dialogues`);
      questDialogueCounts[questId] = (data.dialogues || []).length;
    } catch (err) {
      const chip = document.getElementById('qh-dlg-count');
      if (chip && Number(chip.dataset.quest) === questId) chip.textContent = 'Dialogue lines unavailable';
      return;
    }
  }
  const chip = document.getElementById('qh-dlg-count');
  if (chip && Number(chip.dataset.quest) === questId) chip.outerHTML = qhDialogueChip(questId);
}

function openQuestDetails(mq, sq) {
  const q = questFor(mq, sq);
  const range = q ? chapterRangeText(q.chapter_start, q.chapter_end) : '—';
  const eyebrow = `MAIN QUEST ${mq} · SQ${sq} · CH. ${range}`;

  if (!q) {
    qhShowFace(`${qhHead(eyebrow, 'Not in database', '')}
      <p class="qh-desc">This designed sub-quest has no row in the quests table, so the game cannot load its dialogue or artifact.</p>`);
    return;
  }

  const stats = questStatsByKey[qhKey(mq, sq)] || { completed: 0, game_overs: 0 };
  const here = toStatNumber(q.player_count);
  const active = isQuestActive(q);

  qhShowFace(`
    ${qhHead(eyebrow, q.title || 'Untitled sub-quest', `<span class="pill ${active ? 'pa' : 'pp'}">${esc(String(q.status || 'inactive').toUpperCase())}</span>`)}
    <p class="qh-desc">${esc(q.description || 'No description yet.')}</p>
    <div class="qh-chips">
      <span class="qh-chip">◈ ${esc(q.artifact_name || 'No artifact')}</span>
      ${qhDialogueChip(q.id)}
      <span class="qh-chip">${esc(MQ_NAMES[mq] || `Main Quest ${mq}`)}</span>
    </div>
    <div class="qh-stats">
      ${qhStat(here, 'HERE NOW', here > 0 ? 'ok' : '')}
      ${qhStat(questStatsLoaded ? stats.completed : '—', 'COMPLETED', '')}
      ${qhStat(questStatsLoaded ? stats.game_overs : '—', 'GAME-OVERS', questStatsLoaded ? (stats.game_overs > 0 ? 'warn' : 'ok') : '')}
    </div>
    <div class="qh-actions">
      <button type="button" class="qh-btn" onclick="qhOpenDialogues(${q.id})">✎ DIALOGUES</button>
      <button type="button" class="qh-btn qh-btn-quiet" onclick="openChapterEditor(${q.id})">EDIT CHAPTERS</button>
    </div>`, () => qhLoadDialogueCount(q.id));
}

function openMainQuestDetails(mq) {
  const designed = QUEST_DESIGN[mq] || 0;
  const rows = [];
  for (let sq = 1; sq <= designed; sq++) rows.push({ sq, q: questFor(mq, sq) });
  const present = rows.filter(r => r.q).map(r => r.q);
  const activeN = present.filter(isQuestActive).length;
  const here = present.reduce((s, q) => s + toStatNumber(q.player_count), 0);
  const completions = present.reduce((s, q) => s + ((questStatsByKey[qhKey(mq, q.sub_quest)] || {}).completed || 0), 0);
  const artifacts = present.filter(q => q.artifact_name && Number(q.artifacts_total) > 0).length;

  const list = rows.map(({ sq, q }) => {
    const range = q ? chapterRangeText(q.chapter_start, q.chapter_end) : '—';
    const players = q ? toStatNumber(q.player_count) : 0;
    return `
      <button type="button" class="qh-sq-item${q ? '' : ' missing'}" onclick="openQuestNode('q-${mq}-${sq}')">
        <span><span class="qh-sq-code">SQ${sq}</span> <span class="qh-sq-ch">Ch. ${range}</span> ${esc(q ? (q.title || 'Untitled sub-quest') : 'Not in database')}</span>
        <span class="qh-sq-meta">${players ? `${players} here` : ''} ›</span>
      </button>`;
  }).join('');

  qhShowFace(`
    ${qhHead(`MAIN QUEST ${mq} · CH. ${qhMainQuestRange(mq)}`, MQ_NAMES[mq] || `Main Quest ${mq}`, `<span class="pill ${activeN === designed ? 'pa' : 'pp'}">${activeN}/${designed} ACTIVE</span>`)}
    <div class="qh-stats">
      ${qhStat(here, 'PLAYERS HERE', here > 0 ? 'ok' : '')}
      ${qhStat(questStatsLoaded ? completions : '—', 'COMPLETIONS', '')}
      ${qhStat(`${artifacts}/${designed}`, 'ARTIFACTS SET', '')}
    </div>
    <div class="qh-sq-list">${list}</div>`);
}

function qhOpenDialogues(questId) {
  const q = allQuests.find(r => r.id === questId);
  if (!q) return;
  closeQuestDetails();
  openDialogueEditor(q.id, q.title || '', q.chapter, q.main_quest, q.sub_quest);
}

function qhChapterRangeError(start, end) {
  const valid = v => v === null || (Number.isInteger(v) && v >= 1 && v <= 39);
  if (!valid(start) || !valid(end)) return 'Chapters must be whole numbers from 1 to 39.';
  if (start !== null && end !== null && start > end) return '"From" can\'t be after "To".';
  return '';
}

function openChapterEditor(questId) {
  const q = allQuests.find(r => r.id === questId);
  const wrap = document.getElementById('qh-wrap');
  if (!q || !wrap) return;
  wrap.classList.add('qh-editing');

  qhShowFace(`
    ${qhHead(`EDIT CHAPTERS · MQ${q.main_quest} · SQ${q.sub_quest}`, q.title || 'Untitled sub-quest', '')}
    <p class="qh-desc">The El Filibusterismo chapters this sub-quest covers, from 1 to 39. Player Management, the leaderboard and the player portal show this range.</p>
    <div class="qh-form">
      <label for="qh-chstart-${q.id}">FROM
        <input type="number" min="1" max="39" step="1" id="qh-chstart-${q.id}" value="${q.chapter_start == null ? '' : q.chapter_start}">
      </label>
      <span class="qh-form-dash" aria-hidden="true">–</span>
      <label for="qh-chend-${q.id}">TO
        <input type="number" min="1" max="39" step="1" id="qh-chend-${q.id}" value="${q.chapter_end == null ? '' : q.chapter_end}">
      </label>
    </div>
    <div class="qh-form-msg" id="qh-form-msg" role="alert"></div>
    <div class="qh-actions">
      <button type="button" class="qh-btn" id="qh-save-ch" onclick="qhSaveChapters(${q.id})">SAVE CHAPTERS</button>
      <button type="button" class="qh-btn qh-btn-quiet" onclick="qhCancelChapters(${q.id})">CANCEL</button>
    </div>`, () => {
    const msg = document.getElementById('qh-form-msg');
    [`qh-chstart-${q.id}`, `qh-chend-${q.id}`].forEach(id => {
      const input = document.getElementById(id);
      if (!input) return;
      input.addEventListener('input', () => { if (msg) msg.textContent = ''; });
      input.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); qhSaveChapters(q.id); } });
    });
  });
}

async function qhSaveChapters(questId) {
  const startEl = document.getElementById(`qh-chstart-${questId}`);
  const endEl = document.getElementById(`qh-chend-${questId}`);
  const msg = document.getElementById('qh-form-msg');
  const btn = document.getElementById('qh-save-ch');
  if (!startEl || !endEl) return;

  const start = startEl.value === '' ? null : Number(startEl.value);
  const end = endEl.value === '' ? null : Number(endEl.value);
  const error = qhChapterRangeError(start, end);
  if (error) { if (msg) msg.textContent = error; return; }

  if (btn) { btn.disabled = true; btn.textContent = 'SAVING…'; }
  const saved = await saveChapterRange(questId, 'qh');
  if (!saved) {
    if (btn) { btn.disabled = false; btn.textContent = 'SAVE CHAPTERS'; }
    if (msg) msg.textContent = 'Could not save the chapters. Check your connection and try again.';
    return;
  }
  qhCancelChapters(questId);
}

function qhCancelChapters(questId) {
  const q = allQuests.find(r => r.id === questId);
  const wrap = document.getElementById('qh-wrap');
  if (wrap) wrap.classList.remove('qh-editing');
  if (q) openQuestNode(`q-${q.main_quest}-${q.sub_quest}`);
}

// Esc closes the box; Tab stays inside it while it is open. The dialogue editor modal
// (opened from the box) handles its own keys.
document.addEventListener('keydown', e => {
  if (!qhBoxOpen() || document.querySelector('.mov.open')) return;
  if (e.key === 'Escape') {
    e.preventDefault();
    closeQuestDetails();
    return;
  }
  if (e.key === 'Tab') {
    const box = document.getElementById('qh-box');
    const focusables = box ? [...box.querySelectorAll('button:not([disabled]), input')] : [];
    if (focusables.length === 0) return;
    const first = focusables[0], last = focusables[focusables.length - 1];
    if (!box.contains(document.activeElement)) { e.preventDefault(); first.focus(); }
    else if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  }
});

window.addEventListener('resize', () => { if (qhBoxOpen()) qhPlaceBox(); });

// Main function to fetch and render quests
async function fetchAndRenderQuests() {
  const summary = document.getElementById('qh-summary');
  if (summary && allQuests.length === 0) summary.innerHTML = '<span class="qh-state">Loading quests...</span>';

  try {
    // Fetch all quests from the database
    let quests = await apiCall('/quests');
    if (quests.quests) quests = quests.quests;
    if (!Array.isArray(quests)) quests = [];

    allQuests = quests;
  } catch (err) {
    console.error('Failed to load quests:', err);
    if (summary) {
      summary.innerHTML = '<span class="qh-state qh-state-error">Could not load quests.</span> <button class="ab abv" onclick="fetchAndRenderQuests()">RETRY</button>';
    }
    return;
  }

  // Completions and game-overs per sub-quest. Optional: the hierarchy still renders
  // without them and shows "—" in their place.
  try {
    const data = await apiCall('/quests/quest-stats');
    questStatsByKey = {};
    (data.stats || []).forEach(s => {
      questStatsByKey[qhKey(Number(s.main_quest), Number(s.sub_quest))] = {
        completed: toStatNumber(s.completed),
        game_overs: toStatNumber(s.game_overs)
      };
    });
    questStatsLoaded = true;
  } catch (err) {
    console.warn('Quest stats unavailable:', err);
    questStatsLoaded = false;
  }

  renderQuestHierarchy();

  // Update dashboard stats with live quest counts
  updateQuestStats(allQuests);
}

// Update quest statistics on the dashboard
function updateQuestStats(quests) {
  const activeQuests = quests.filter(q => q.status === 'active' || q.status === 'completed').length;
  const totalQuests = quests.length;

  // Update sidebar badge (Quest Management)
  const sidebarBadge = document.getElementById('nb-qt');
  if (sidebarBadge) {
    sidebarBadge.textContent = totalQuests;
  }

  // Update chapters live stat card
  const chaptersLiveEl = document.getElementById('stat-chapters-live');
  if (chaptersLiveEl) {
    chaptersLiveEl.innerHTML = `${activeQuests}<span style="font-size:12px;color:var(--td)">/${totalQuests}</span>`;
  }
}

// ============================================================
// DASHBOARD: QUEST DIFFICULTY RANKING
// Quest progress (attempts by status, game-overs, attempts per main quest) and the
// hardest quests (top 5 by total game-overs, or game-overs per attempt).
// Plain HTML, no chart library.
// ============================================================

function toStatNumber(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

const QD_COLORS = { completed: '#3d8756', inProgress: '#b8893a' };  // validated pair (dark surface)
const QD_MIN_RATE_ATTEMPTS = 3;  // per-attempt ranking ignores quests tried fewer times

let qdStats = [];
let qdMode = 'total';

async function fetchAndRenderQuestStats() {
  const rows = document.getElementById('qd-rows');
  if (rows && qdStats.length === 0) rows.innerHTML = '<div class="qd-empty">Loading quest statistics...</div>';
  try {
    const data = await apiCall('/quests/quest-stats');
    qdStats = (data.stats || []).map(s => ({
      mq: toStatNumber(s.main_quest),
      sq: toStatNumber(s.sub_quest),
      chStart: s.chapter_start,
      chEnd: s.chapter_end,
      title: s.title || `MQ${s.main_quest} SQ${s.sub_quest}`,
      attempts: toStatNumber(s.attempts),
      completed: toStatNumber(s.completed),
      inProgress: toStatNumber(s.in_progress),
      gameOvers: toStatNumber(s.game_overs)
    }));
    renderQuestProgress(qdStats, data.totals || {});
    renderHardestQuests();
  } catch (err) {
    console.error('Failed to load quest stats:', err);
    if (rows) {
      rows.innerHTML = '<div class="qd-empty qd-error">Could not load quest statistics. <button type="button" class="qd-refresh" onclick="fetchAndRenderQuestStats()">RETRY</button></div>';
    }
    showT('Could not load quest statistics', 'error');
  }
}

function qdChapters(s) {
  if (s.chStart == null) return '';
  return (s.chEnd == null || s.chEnd === s.chStart) ? `Ch.${s.chStart}` : `Ch.${s.chStart}–${s.chEnd}`;
}

function renderQuestProgress(stats, totals) {
  const attempts = stats.reduce((n, s) => n + s.attempts, 0);
  const completed = stats.reduce((n, s) => n + s.completed, 0);
  const inProgress = stats.reduce((n, s) => n + s.inProgress, 0);
  const gameOvers = stats.reduce((n, s) => n + s.gameOvers, 0);
  const players = toStatNumber(totals.players);
  const pct = v => (attempts > 0 ? Math.round(v / attempts * 100) : 0);

  const set = (id, text) => { const el = document.getElementById(id); if (el) el.textContent = text; };
  set('qd-attempts', String(attempts));
  set('qd-attempts-sub', `attempts · ${players} player${players === 1 ? '' : 's'}`);
  set('qd-gameovers', String(gameOvers));
  set('qd-rate', attempts > 0 ? (gameOvers / attempts).toFixed(2) : '0.00');

  const stack = document.getElementById('qd-stack');
  if (stack) {
    stack.setAttribute('aria-label', `${completed} completed, ${inProgress} in progress`);
    stack.innerHTML = attempts === 0
      ? '<div class="qd-seg qd-seg-empty"></div>'
      : [
          completed ? `<div class="qd-seg" style="flex:${completed};background:${QD_COLORS.completed}" title="Completed · ${completed} (${pct(completed)}%)"></div>` : '',
          inProgress ? `<div class="qd-seg" style="flex:${inProgress};background:${QD_COLORS.inProgress}" title="In progress · ${inProgress} (${pct(inProgress)}%)"></div>` : ''
        ].join('');
  }

  const legend = document.getElementById('qd-legend');
  if (legend) {
    legend.innerHTML = `
      <span><i class="qd-sw" style="background:${QD_COLORS.completed}"></i>Completed ${completed} · ${pct(completed)}%</span>
      <span><i class="qd-sw" style="background:${QD_COLORS.inProgress}"></i>In progress ${inProgress} · ${pct(inProgress)}%</span>`;
  }

  const mqEl = document.getElementById('qd-mq');
  if (mqEl) {
    const byMq = [1, 2, 3, 4, 5, 6, 7].map(m => stats.filter(s => s.mq === m).reduce((n, s) => n + s.attempts, 0));
    const max = Math.max(1, ...byMq);
    mqEl.innerHTML = byMq.map((v, i) => `
      <div class="qd-mq">
        <span class="qd-mq-code">MQ${i + 1}</span>
        <div class="qd-mq-track"><div class="qd-mq-bar" style="width:${v ? Math.max(2, v / max * 100) : 0}%"></div></div>
        <span class="qd-mq-val${v ? '' : ' zero'}">${v}</span>
      </div>`).join('');
  }
}

function setHardestQuestsMode(mode) {
  qdMode = mode === 'rate' ? 'rate' : 'total';
  renderHardestQuests();
}

function renderHardestQuests() {
  const rows = document.getElementById('qd-rows');
  const sub = document.getElementById('qd-hard-sub');
  const tip = document.getElementById('qd-tip');
  if (!rows) return;
  const rate = qdMode === 'rate';

  const totalBtn = document.getElementById('qd-mode-total');
  const rateBtn = document.getElementById('qd-mode-rate');
  if (totalBtn) totalBtn.setAttribute('aria-pressed', String(!rate));
  if (rateBtn) rateBtn.setAttribute('aria-pressed', String(rate));
  if (sub) {
    sub.textContent = rate
      ? `Game-overs per attempt · quests with ${QD_MIN_RATE_ATTEMPTS}+ attempts`
      : 'Top 5 sub-quests by total game-overs';
  }

  const list = qdStats
    .filter(s => (rate ? s.attempts >= QD_MIN_RATE_ATTEMPTS && s.gameOvers > 0 : s.gameOvers > 0))
    .map(s => ({ s, v: rate ? s.gameOvers / s.attempts : s.gameOvers }))
    .sort((a, b) => b.v - a.v || b.s.attempts - a.s.attempts || a.s.mq - b.s.mq || a.s.sq - b.s.sq)
    .slice(0, 5);

  if (tip) tip.style.opacity = '0';
  if (list.length === 0) {
    rows.innerHTML = '<div class="qd-empty">No game-overs recorded yet.</div>';
    return;
  }

  const max = rate ? Math.max(1, ...list.map(x => x.v)) : Math.max(...list.map(x => x.v));
  rows.innerHTML = list.map((x, i) => `
    <div class="qd-row" tabindex="0" data-i="${i}">
      <div class="qd-row-label">
        <div class="qd-code">MQ${x.s.mq} SQ${x.s.sq}${qdChapters(x.s) ? ` · ${qdChapters(x.s)}` : ''}</div>
        <div class="qd-name">${esc(x.s.title)}</div>
      </div>
      <div class="qd-track"><div class="qd-bar" style="width:${Math.max(2, x.v / max * 100)}%"></div></div>
      <div class="qd-val">${rate ? x.v.toFixed(2) : x.v}</div>
    </div>`).join('');

  const card = rows.closest('.qd-card');
  rows.querySelectorAll('.qd-row').forEach(row => {
    const s = list[Number(row.dataset.i)].s;
    const show = e => {
      if (!tip || !card) return;
      tip.innerHTML = `<b>${esc(s.title)}</b><br>MQ${s.mq} · SQ${s.sq}${s.chStart != null ? ` · Ch. ${s.chEnd != null && s.chEnd !== s.chStart ? `${s.chStart}–${s.chEnd}` : s.chStart}` : ''}<br>${s.attempts} attempts · ${s.completed} completed<br>${s.gameOvers} game-overs · ${(s.attempts ? s.gameOvers / s.attempts : 0).toFixed(2)} per attempt`;
      tip.style.opacity = '1';
      const cr = card.getBoundingClientRect();
      const rr = row.getBoundingClientRect();
      const x = e && e.clientX ? e.clientX : rr.left + rr.width / 2;
      const left = Math.min(x - cr.left + 12, cr.width - tip.offsetWidth - 8);
      tip.style.left = `${Math.max(8, left)}px`;
      tip.style.top = `${rr.bottom - cr.top + 4}px`;
    };
    row.addEventListener('mousemove', show);
    row.addEventListener('focus', () => show());
    const hide = () => { if (tip) tip.style.opacity = '0'; };
    row.addEventListener('mouseleave', hide);
    row.addEventListener('blur', hide);
  });
}

async function openDialogueEditor(questId, questTitle, chapter, quest, subQuest) {
  currentEditQuest = { id: questId, title: questTitle, chapter, quest, subQuest };

  const qObj = allQuests.find(q => q.id === questId);
  const artifactPath = qObj ? (qObj.artifact_resource_path || '') : '';
  // Identify the quest by its place in the structure. The old "Quest N (Chapter 1)"
  // filtered on the legacy quests.chapter column, which is always 1.
  const chStart = qObj ? qObj.chapter_start : null;
  const chEnd = qObj ? qObj.chapter_end : null;
  const chapterText = chStart == null ? 'no chapters set'
    : ((chEnd == null || chEnd === chStart) ? `Ch. ${chStart}` : `Ch. ${chStart}–${chEnd}`);
  const questLabel = `MQ${quest} · SQ${subQuest}`;

  // Update title
  const titleEl = document.getElementById('dlg-mtit');
  if (titleEl) {
    titleEl.textContent = `DIALOGUE EDITOR — ${questLabel}`;
  }

  // Update quest info
  const infoEl = document.getElementById('dlg-quest-info');
  if (infoEl) {
    infoEl.innerHTML = `
      <div class="dlg-info-title">${esc(questTitle)}</div>
      <div class="dlg-info-sub" style="margin-bottom: 15px;">${questLabel} · ${chapterText}</div>
      <div class="sq-artifact-field">
        <label>El Filibusterismo Chapters</label>
        <div class="sq-artifact-picker">
          <input type="number" min="1" max="39" class="sq-artifact-input" id="dlg-chstart-${questId}" value="${chStart == null ? '' : chStart}" placeholder="From" style="width: 5em;">
          <input type="number" min="1" max="39" class="sq-artifact-input" id="dlg-chend-${questId}" value="${chEnd == null ? '' : chEnd}" placeholder="To" style="width: 5em;">
          <button class="sq-artifact-save" onclick="event.stopPropagation(); saveChapterRange(${questId})" title="Save chapters">
            <svg width="12" height="12" viewBox="0 0 20 20" fill="currentColor">
              <path d="M7.707 10.293a1 1 0 10-1.414 1.414l3 3a1 1 0 001.414 0l3-3a1 1 0 00-1.414-1.414L11 11.586V6h5a2 2 0 012 2v7a2 2 0 01-2 2H4a2 2 0 01-2-2V8a2 2 0 012-2h5v5.586l-1.293-1.293zM9 4a1 1 0 012 0v2H9V4z"/>
            </svg>
          </button>
        </div>
      </div>
      <div class="sq-artifact-field">
        <label>Artifact (set in the game)</label>
        <div style="padding: 8px 10px; border: 1px solid rgba(232, 184, 75, 0.25); border-radius: 4px; background: rgba(26, 22, 17, 0.6);">
          <div style="font-family: 'Cinzel', serif; font-size: 13px; color: var(--goldl);">${esc((qObj && qObj.artifact_name) || 'No artifact')}</div>
          <div style="font-family: 'JetBrains Mono', monospace; font-size: 10px; color: var(--td); margin-top: 3px; word-break: break-all;">${esc(artifactPath || 'No prefab path set')}</div>
        </div>
      </div>
    `;
  }

  // Fetch existing dialogues
  await refreshDialogueList(questId);

  // Open modal
  const modal = document.getElementById('mov-dialogue');
  if (modal) modal.classList.add('open');
}

async function refreshDialogueList(questId) {
  const listEl = document.getElementById('dlg-list');
  if (!listEl) return;

  try {
    const data = await apiCall(`/quests/${questId}/dialogues`);
    const dialogues = data.dialogues || [];
    questDialogueCounts[questId] = dialogues.length;  // keeps the hierarchy's count current

    if (dialogues.length === 0) {
      listEl.innerHTML = `
        <div class="dlg-empty">
          <div class="dlg-empty-icon">💬</div>
          <div class="dlg-empty-text">No dialogue lines yet</div>
          <div class="dlg-empty-hint">Click "Add Dialogue Line" to create the first dialogue for this sub-quest.</div>
        </div>
      `;
      return;
    }

    listEl.innerHTML = '';
    dialogues.forEach(dlg => {
      const optionADelta = getDialogueDelta(dlg, 'a');
      const optionBDelta = getDialogueDelta(dlg, 'b');
      const optionCDelta = getDialogueDelta(dlg, 'c');
      const hasChoices = dialogueHasChoices(dlg);
      const entry = document.createElement('div');
      entry.className = 'dlg-entry';
      entry.innerHTML = `
        <div class="dlg-entry-header">
          <span class="dlg-seq">#${dlg.sequence_order}</span>
          <span class="dlg-npc-name">${esc(dlg.npc_name)}</span>
          ${hasChoices
            ? `<span class="dlg-penalty-badge">A ${formatDelta(optionADelta)} | B ${formatDelta(optionBDelta)} | C ${formatDelta(optionCDelta)}</span>`
            : '<span class="dlg-penalty-badge">Narration</span>'}
          <div class="dlg-entry-actions">
            <button class="dlg-btn-edit" onclick="editDialogue(${dlg.id})" title="Edit">✎</button>
            <button class="dlg-btn-del" onclick="deleteDialogue(${dlg.id})" title="Delete">✕</button>
          </div>
        </div>
        <div class="dlg-entry-body">
          <div class="dlg-npc-text">"${esc(dlg.npc_text)}"</div>
          ${hasChoices ? `<div class="dlg-options">
            <div class="dlg-option ${dlg.option_a_correct ? 'dlg-correct' : 'dlg-wrong'}">
              <span class="dlg-opt-label">A${dlg.option_a_correct ? ' ✓' : ' ✗'} (${formatDelta(optionADelta)})</span>
              ${esc(dlg.option_a_text)}
            </div>
            <div class="dlg-option ${dlg.option_b_correct ? 'dlg-correct' : 'dlg-wrong'}">
              <span class="dlg-opt-label">B${dlg.option_b_correct ? ' ✓' : ' ✗'} (${formatDelta(optionBDelta)})</span>
              ${esc(dlg.option_b_text)}
            </div>
            ${dlg.option_c_text ? `<div class="dlg-option ${dlg.option_c_correct ? 'dlg-correct' : 'dlg-wrong'}">
              <span class="dlg-opt-label">C${dlg.option_c_correct ? ' ✓' : ' ✗'} (${formatDelta(optionCDelta)})</span>
              ${esc(dlg.option_c_text)}
            </div>` : ''}
          </div>` : ''}
          ${dlg.context_notes ? `<div class="dlg-notes">📝 ${esc(dlg.context_notes)}</div>` : ''}
        </div>
      `;

      listEl.appendChild(entry);
    });
  } catch (err) {
    console.error('Failed to load dialogues:', err);
    listEl.innerHTML = '<div style="text-align:center;color:#e06060;padding:20px;">Failed to load dialogues</div>';
  }
}

async function addNewDialogue() {
  if (!currentEditQuest) return;

  // Create inline form
  const listEl = document.getElementById('dlg-list');
  if (!listEl) return;

  // Remove existing form if any
  const existingForm = document.getElementById('dlg-new-form');
  if (existingForm) existingForm.remove();

  const form = document.createElement('div');
  form.id = 'dlg-new-form';
  form.className = 'dlg-form';
  form.innerHTML = `
    <div class="dlg-form-title">NEW DIALOGUE LINE</div>
    <div class="dlg-form-field">
      <label>Narration / Stage Direction (optional)</label>
      <textarea id="dlg-f-narration" rows="2" placeholder="Scene setup, movement, or descriptive text outside the spoken lines..."></textarea>
    </div>
    <div class="dlg-form-field">
      <div class="dlg-form-actions">
        <button class="dlg-form-save" type="button" id="dlg-f-speaker-add" onclick="addDialogueSpeakerBlock('dlg-f')">+ ADD NPC</button>
      </div>
      <div id="dlg-f-speaker-list"></div>
    </div>
    <div class="dlg-form-row">
      <div class="dlg-form-field dlg-f-half">
        <label>Option A (Player Choice)</label>
        <textarea id="dlg-f-opta" rows="2" placeholder="First choice text..."></textarea>
        <label class="dlg-radio-label"><input type="radio" name="dlg-f-correct" id="dlg-f-opta-correct" value="a" checked> Correct</label>
      </div>
      <div class="dlg-form-field dlg-f-half">
        <label>Option B (Player Choice)</label>
        <textarea id="dlg-f-optb" rows="2" placeholder="Second choice text..."></textarea>
        <label class="dlg-radio-label"><input type="radio" name="dlg-f-correct" id="dlg-f-optb-correct" value="b"> Correct</label>
      </div>
      <div class="dlg-form-field dlg-f-half">
        <label>Option C (Player Choice, optional)</label>
        <textarea id="dlg-f-optc" rows="2" placeholder="Third choice text (leave empty to disable)..."></textarea>
        <label class="dlg-radio-label"><input type="radio" name="dlg-f-correct" id="dlg-f-optc-correct" value="c"> Correct</label>
      </div>
    </div>
    <div class="dlg-form-row">
      <div class="dlg-form-field dlg-f-half">
        <label>Option A Delta</label>
        <input type="number" id="dlg-f-delta-a" value="-10" min="-100" max="100">
      </div>
      <div class="dlg-form-field dlg-f-half">
        <label>Option B Delta</label>
        <input type="number" id="dlg-f-delta-b" value="10" min="-100" max="100">
      </div>
      <div class="dlg-form-field dlg-f-half">
        <label>Option C Delta</label>
        <input type="number" id="dlg-f-delta-c" value="35" min="-100" max="100">
      </div>
    </div>
    <div class="dlg-form-row">
      <div class="dlg-form-field dlg-f-half">
        <label>Context Notes (admin only)</label>
        <input type="text" id="dlg-f-notes" placeholder="Optional reference notes...">
      </div>
    </div>
    <div class="dlg-form-actions">
      <button class="dlg-form-save" onclick="submitNewDialogue()">SAVE DIALOGUE</button>
      <button class="dlg-form-cancel" onclick="document.getElementById('dlg-new-form').remove()">CANCEL</button>
    </div>
  `;
  listEl.appendChild(form);
  renderDialogueSpeakerBlocks('dlg-f', [{ name: 'NPC', text: '' }]);
  form.scrollIntoView({ behavior: 'smooth' });
}

async function submitNewDialogue() {
  if (!currentEditQuest) return;

  const narrationText = document.getElementById('dlg-f-narration')?.value?.trim() || '';
  const speakerBlocks = getDialogueSpeakerBlocksFromForm('dlg-f');
  const choicePayload = getDialogueChoiceValues('dlg-f');
  const dialogueRows = buildDialogueRowsFromBlocks(narrationText, speakerBlocks, choicePayload);

  if (dialogueRows.length === 0 || !choicePayload.option_a_text || !choicePayload.option_b_text) {
    showT('Please fill in all required dialogue fields', 'error');
    return;
  }

  try {
    for (const row of dialogueRows) {
      await createDialogueRow(currentEditQuest.id, row);
    }

    showT('Dialogue line created successfully', 'success');
    document.getElementById('dlg-new-form')?.remove();

    await refreshDialogueList(currentEditQuest.id);
  } catch (err) {
    console.error('Failed to create dialogue:', err);
    showT('Failed to create dialogue line', 'error');
  }
}

async function editDialogue(dialogueId) {
  if (!currentEditQuest) return;

  // Fetch the dialogue data
  try {
    const data = await apiCall(`/quests/${currentEditQuest.id}/dialogues`);
    const dlg = (data.dialogues || []).find(d => d.id === dialogueId);
    if (!dlg) return showT('Dialogue not found', 'error');

    const listEl = document.getElementById('dlg-list');
    if (!listEl) return;

    // Remove existing edit form if any
    const existingForm = document.getElementById('dlg-edit-form');
    if (existingForm) existingForm.remove();

    const form = document.createElement('div');
    form.id = 'dlg-edit-form';
    form.className = 'dlg-form dlg-form-edit';
    const optionADelta = getDialogueDelta(dlg, 'a');
    const optionBDelta = getDialogueDelta(dlg, 'b');
    const optionCDelta = getDialogueDelta(dlg, 'c');
    const dialogueStructure = parseDialogueBlocks(dlg.npc_text, dlg.npc_name);
    form.innerHTML = `
      <div class="dlg-form-title">EDIT DIALOGUE #${dlg.sequence_order}</div>
      <div class="dlg-form-field">
        <label>Narration / Stage Direction (optional)</label>
        <textarea id="dlg-e-narration" rows="2" placeholder="Scene setup, movement, or descriptive text outside the spoken lines...">${esc(dialogueStructure.narrationText)}</textarea>
      </div>
      <div class="dlg-form-field">
        <div class="dlg-form-actions">
          <button class="dlg-form-save" type="button" id="dlg-e-speaker-add" onclick="addDialogueSpeakerBlock('dlg-e')">+ ADD NPC</button>
        </div>
        <div id="dlg-e-speaker-list"></div>
      </div>
      <div class="dlg-form-row">
        <div class="dlg-form-field dlg-f-half">
          <label>Option A</label>
          <textarea id="dlg-e-opta" rows="2">${esc(dlg.option_a_text)}</textarea>
          <label class="dlg-radio-label"><input type="radio" name="dlg-e-correct" id="dlg-e-opta-correct" value="a" ${dlg.option_a_correct ? 'checked' : ''}> Correct</label>
        </div>
        <div class="dlg-form-field dlg-f-half">
          <label>Option B</label>
          <textarea id="dlg-e-optb" rows="2">${esc(dlg.option_b_text)}</textarea>
          <label class="dlg-radio-label"><input type="radio" name="dlg-e-correct" id="dlg-e-optb-correct" value="b" ${dlg.option_b_correct ? 'checked' : ''}> Correct</label>
        </div>
        <div class="dlg-form-field dlg-f-half">
          <label>Option C (optional)</label>
          <textarea id="dlg-e-optc" rows="2">${dlg.option_c_text ? esc(dlg.option_c_text) : ''}</textarea>
          <label class="dlg-radio-label"><input type="radio" name="dlg-e-correct" id="dlg-e-optc-correct" value="c" ${dlg.option_c_correct ? 'checked' : ''}> Correct</label>
        </div>
      </div>
      <div class="dlg-form-row">
        <div class="dlg-form-field dlg-f-half">
          <label>Option A Delta</label>
          <input type="number" id="dlg-e-delta-a" value="${optionADelta}" min="-100" max="100">
        </div>
        <div class="dlg-form-field dlg-f-half">
          <label>Option B Delta</label>
          <input type="number" id="dlg-e-delta-b" value="${optionBDelta}" min="-100" max="100">
        </div>
        <div class="dlg-form-field dlg-f-half">
          <label>Option C Delta</label>
          <input type="number" id="dlg-e-delta-c" value="${optionCDelta}" min="-100" max="100">
        </div>
      </div>
      <div class="dlg-form-row">
        <div class="dlg-form-field dlg-f-half">
          <label>Context Notes</label>
          <input type="text" id="dlg-e-notes" value="${esc(dlg.context_notes || '')}">
        </div>
      </div>
      <div class="dlg-form-actions">
        <button class="dlg-form-save" onclick="submitEditDialogue(${dialogueId})">UPDATE</button>
        <button class="dlg-form-cancel" onclick="document.getElementById('dlg-edit-form').remove()">CANCEL</button>
      </div>
    `;
    listEl.prepend(form);
    renderDialogueSpeakerBlocks('dlg-e', dialogueStructure.speakerBlocks);
    form.scrollIntoView({ behavior: 'smooth' });
  } catch (err) {
    showT('Failed to load dialogue for editing', 'error');
  }
}

async function submitEditDialogue(dialogueId) {
  if (!currentEditQuest) return;

  const narrationText = document.getElementById('dlg-e-narration')?.value?.trim() || '';
  const speakerBlocks = getDialogueSpeakerBlocksFromForm('dlg-e');
  const choicePayload = getDialogueChoiceValues('dlg-e');
  const dialogueRows = buildDialogueRowsFromBlocks(narrationText, speakerBlocks, choicePayload);

  if (dialogueRows.length === 0) {
    showT('Please fill in the dialogue text', 'error');
    return;
  }

  const choicesWereEntered = Boolean(
    choicePayload.option_a_text ||
    choicePayload.option_b_text ||
    choicePayload.option_c_text
  );

  if (choicesWereEntered && (!choicePayload.option_a_text || !choicePayload.option_b_text)) {
    showT('Please fill in the dialogue text and required player choices', 'error');
    return;
  }

  try {
    const data = await apiCall(`/quests/${currentEditQuest.id}/dialogues`);
    const existingDialogue = (data.dialogues || []).find(dlg => dlg.id === dialogueId);
    if (!existingDialogue) {
      showT('Dialogue not found', 'error');
      return;
    }

    if (dialogueHasChoices(existingDialogue) && (!choicePayload.option_a_text || !choicePayload.option_b_text)) {
      showT('Please keep Option A and Option B filled for choice dialogue rows', 'error');
      return;
    }

    const additionalRows = dialogueRows.length - 1;
    if (additionalRows > 0) {
      await shiftDialogueSequenceOrders(currentEditQuest.id, existingDialogue.sequence_order, additionalRows);
    }

    await apiCall(`/quests/dialogues/${dialogueId}`, {
      method: 'PUT',
      body: JSON.stringify({
        ...dialogueRows[0],
        sequence_order: existingDialogue.sequence_order
      })
    });

    for (let index = 1; index < dialogueRows.length; index += 1) {
      await createDialogueRow(
        currentEditQuest.id,
        dialogueRows[index],
        existingDialogue.sequence_order + index
      );
    }

    showT('Dialogue updated successfully', 'success');
    document.getElementById('dlg-edit-form')?.remove();
    await refreshDialogueList(currentEditQuest.id);
  } catch (err) {
    showT('Failed to update dialogue', 'error');
  }
}

async function deleteDialogue(dialogueId) {
  if (!confirm('Delete this dialogue line? This cannot be undone.')) return;

  try {
    await apiCall(`/quests/dialogues/${dialogueId}`, { method: 'DELETE' });
    showT('Dialogue deleted', 'success');
    if (currentEditQuest) await refreshDialogueList(currentEditQuest.id);
  } catch (err) {
    showT('Failed to delete dialogue', 'error');
  }
}


// Save the El Filibusterismo chapter range a sub-quest covers (1-39, From <= To).
// The backend validates the same rules; checking here gives an immediate message.
// idPrefix picks the form: 'dlg' is the dialogue editor, 'qh' the hierarchy's details box.
// Returns true when saved.
async function saveChapterRange(questId, idPrefix = 'dlg') {
  const startEl = document.getElementById(`${idPrefix}-chstart-${questId}`);
  const endEl = document.getElementById(`${idPrefix}-chend-${questId}`);
  if (!startEl || !endEl) return false;

  const chapter_start = startEl.value === '' ? null : Number(startEl.value);
  const chapter_end = endEl.value === '' ? null : Number(endEl.value);
  const valid = v => v === null || (Number.isInteger(v) && v >= 1 && v <= 39);

  if (!valid(chapter_start) || !valid(chapter_end)) {
    showT('Chapters must be whole numbers from 1 to 39', 'error');
    return false;
  }
  if (chapter_start !== null && chapter_end !== null && chapter_start > chapter_end) {
    showT('"From" chapter cannot be after the "To" chapter', 'error');
    return false;
  }

  try {
    await apiCall(`/quests/${questId}`, {
      method: 'PUT',
      body: JSON.stringify({ chapter_start, chapter_end })
    });

    const qObj = allQuests.find(q => q.id === questId);
    if (qObj) {
      qObj.chapter_start = chapter_start;
      qObj.chapter_end = chapter_end;
    }
    renderQuestHierarchy();
    showT('Chapters saved', 'success');
    return true;
  } catch (err) {
    console.error('Failed to save chapters:', err);
    showT('Failed to save chapters', 'error');
    return false;
  }
}

// ============================================================
// IMPORT DIALOGUES FROM SEED
// ============================================================

async function importDialogues() {
  const toast = document.getElementById('import-toast');
  const msgEl = document.getElementById('import-toast-msg');

  try {
    
    if (toast) toast.style.display = 'block';
    if (msgEl) msgEl.textContent = ' Starting dialogue import...';

    const data = await apiCall('/quests/import-dialogues', {
      method: 'POST'
    });
    
    if (msgEl) msgEl.textContent = `✅ ${data.message || 'Import completed successfully'}`;
    if (toast) {
      setTimeout(() => { toast.style.display = 'none'; }, 5000);
    }

    // Refresh quest data
    await fetchAndRenderQuests();
    await fetchAndRenderQuestStats();
    
  } catch (err) {
    console.error('Import failed:', err);
    const msgEl = document.getElementById('import-toast-msg');
    if (msgEl) msgEl.textContent = `❌ Import failed: ${err.message}`;
  }
}
