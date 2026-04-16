// ============================================================
// QUESTS - Dynamic Quest Management
// ============================================================

let currentChapter = 1;
let allQuests = [];
let currentEditQuest = null; // Track which sub-quest's dialogues are being edited

// Initialize chapter tab listeners
function initChapterTabs() {
  const tabs = document.querySelectorAll('.chapter-tab');
  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      const chapter = parseInt(tab.dataset.chapter);
      switchChapter(chapter);
    });
  });
}

// Switch to a different chapter
function switchChapter(chapterNum) {
  currentChapter = chapterNum;

  // Update tab active states
  const tabs = document.querySelectorAll('.chapter-tab');
  tabs.forEach(tab => {
    const tabChapter = parseInt(tab.dataset.chapter);
    if (tabChapter === chapterNum) {
      tab.classList.add('active');
      tab.classList.remove('standby');
    } else {
      tab.classList.remove('active');
      // Mark chapters 3-5 as standby
      if (tabChapter > 2) {
        tab.classList.add('standby');
      }
    }
  });

  // Render quests for the selected chapter
  renderChapterQuests(chapterNum);
}

// Render quests for a specific chapter
function renderChapterQuests(chapterNum) {
  const container = document.getElementById('quests-grid');
  if (!container) return;

  container.innerHTML = '';

  const startIndex = (chapterNum - 1) * 5;
  const chapterQuests = allQuests.slice(startIndex, startIndex + 5);

  let activeCount = 0;

  for (let index = 0; index < 5; index++) {
    const sub = chapterQuests[index];
    
    const isActive = sub && (sub.status === 'active' || sub.status === 'completed');
    if (isActive) activeCount++;

    const roman = ['I', 'II', 'III', 'IV', 'V'][index];
    const title = sub ? (sub.title || 'Awaiting Storyboard') : 'Awaiting Storyboard';
    const description = sub ? (sub.description || 'No description available.') : 'No description available.';
    const statusClass = isActive ? 'pa' : 'pp';
    const statusText = isActive ? 'ACTIVE' : 'STANDBY';

    const card = document.createElement('div');
    card.className = `cc ${!isActive ? 'sb' : ''}`;

    let safeTitle = esc(title).replace(/'/g, "\\'");

    card.innerHTML = `
      <div class="cdec">${roman}</div>
      <div class="cnum">QUEST ${index + 1}</div>
      <div class="ctit">${esc(title)}</div>
      <div class="csub">${esc(description)}</div>
      <span class="pill ${statusClass}">${statusText}</span>

      ${!isActive ? `
        <div class="sbov">
          <div class="sbtx">STANDBY</div>
        </div>
        <svg class="lkico" width="12" height="12" viewBox="0 0 20 20" fill="currentColor">
          <path fill-rule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clip-rule="evenodd"/>
        </svg>
      ` : ''}

      ${isActive ? `
        <button class="cq-edit-btn" onclick="event.stopPropagation(); openDialogueEditor(${sub.id}, '${safeTitle}', ${sub.chapter}, ${sub.main_quest}, ${sub.sub_quest})" style="margin-top: 15px; width: 100%; border-radius: 4px; padding: 6px; font-family: 'JetBrains Mono', monospace; font-size: 11px; font-weight: 500; display: flex; align-items: center; justify-content: center; gap: 5px; cursor: pointer; border: 1px solid rgba(232, 184, 75, 0.4); background: rgba(26, 22, 17, 0.8); color: var(--goldl); transition: all 0.2s;">
          <svg width="11" height="11" viewBox="0 0 20 20" fill="currentColor">
            <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z"/>
          </svg>
          DIALOGUES
        </button>
      ` : ''}
    `;

    container.appendChild(card);
  }

  // Update header stats
  const statLbl = document.getElementById('stat-qt-chap');
  if (statLbl) {
    statLbl.textContent = `${activeCount} ACTIVE · ${5 - activeCount} STANDBY`;
  }
}

// Main function to fetch and render quests
async function fetchAndRenderQuests() {
  try {
    // Fetch all quests from the database
    let quests = await apiCall('/quests');
    if (quests.quests) quests = quests.quests;
    if (!Array.isArray(quests)) quests = [];

    allQuests = quests;

    // Initialize chapter tabs
    initChapterTabs();

    // Render current chapter (default: Chapter 1)
    renderChapterQuests(currentChapter);

  } catch (err) {
    console.error('Failed to load quests:', err);
  }
}



// ============================================================
// DIALOGUE EDITOR
// ============================================================
async function openDialogueEditor(questId, questTitle, chapter, quest, subQuest) {
  // Try to find the index to pass as the Quest Number
  const indexOrQuest = allQuests.filter(q => q.chapter === chapter).findIndex(q => q.id === questId) + 1;
  currentEditQuest = { id: questId, title: questTitle, chapter, quest, subQuest };

  const qObj = allQuests.find(q => q.id === questId);
  const artifactPath = qObj ? (qObj.artifact_resource_path || '') : '';

  // Update title
  const titleEl = document.getElementById('dlg-mtit');
  if (titleEl) {
    titleEl.textContent = `DIALOGUE EDITOR — Quest ${indexOrQuest || quest}`;
  }

  // Update quest info
  const infoEl = document.getElementById('dlg-quest-info');
  if (infoEl) {
    infoEl.innerHTML = `
      <div class="dlg-info-title">${esc(questTitle)}</div>
      <div class="dlg-info-sub" style="margin-bottom: 15px;">Quest ${indexOrQuest || quest} (Chapter ${chapter})</div>
      <div class="sq-artifact-field">
        <label>AR Artifact Path</label>
        <div class="sq-artifact-picker">
          <input type="text" class="sq-artifact-input" id="dlg-artifact-${questId}" value="${esc(artifactPath)}" placeholder="e.g., Artifacts/SCP012_Data/SCP-012">
          <button class="sq-artifact-save" onclick="event.stopPropagation(); saveArtifactPath(${questId}, 'dlg-artifact-${questId}')" title="Save">
            <svg width="12" height="12" viewBox="0 0 20 20" fill="currentColor">
              <path d="M7.707 10.293a1 1 0 10-1.414 1.414l3 3a1 1 0 001.414 0l3-3a1 1 0 00-1.414-1.414L11 11.586V6h5a2 2 0 012 2v7a2 2 0 01-2 2H4a2 2 0 01-2-2V8a2 2 0 012-2h5v5.586l-1.293-1.293zM9 4a1 1 0 012 0v2H9V4z"/>
            </svg>
          </button>
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
    dialogues.forEach((dlg, idx) => {
      const entry = document.createElement('div');
      entry.className = 'dlg-entry';
      entry.innerHTML = `
        <div class="dlg-entry-header">
          <span class="dlg-seq">#${dlg.sequence_order}</span>
          <span class="dlg-npc-name">${esc(dlg.npc_name)}</span>
          <span class="dlg-penalty-badge">⚠ ${dlg.suspicion_penalty}pts penalty</span>
          <div class="dlg-entry-actions">
            <button class="dlg-btn-edit" onclick="editDialogue(${dlg.id})" title="Edit">✎</button>
            <button class="dlg-btn-del" onclick="deleteDialogue(${dlg.id})" title="Delete">✕</button>
          </div>
        </div>
        <div class="dlg-entry-body">
          <div class="dlg-npc-text">"${esc(dlg.npc_text)}"</div>
          <div class="dlg-options">
            <div class="dlg-option ${dlg.option_a_correct ? 'dlg-correct' : 'dlg-wrong'}">
              <span class="dlg-opt-label">A${dlg.option_a_correct ? ' ✓' : ' ✗'}</span>
              ${esc(dlg.option_a_text)}
            </div>
            <div class="dlg-option ${dlg.option_b_correct ? 'dlg-correct' : 'dlg-wrong'}">
              <span class="dlg-opt-label">B${dlg.option_b_correct ? ' ✓' : ' ✗'}</span>
              ${esc(dlg.option_b_text)}
            </div>
            ${dlg.option_c_text ? `<div class="dlg-option ${dlg.option_c_correct ? 'dlg-correct' : 'dlg-wrong'}">
              <span class="dlg-opt-label">C${dlg.option_c_correct ? ' ✓' : ' ✗'}</span>
              ${esc(dlg.option_c_text)}
            </div>` : ''}
          </div>
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
      <label>NPC Name</label>
      <input type="text" id="dlg-f-npc" value="NPC" placeholder="e.g., Servant, Basilio, Official">
    </div>
    <div class="dlg-form-field">
      <label>NPC Dialogue Text</label>
      <textarea id="dlg-f-text" rows="3" placeholder='The NPC dialogue line shown to the player...'></textarea>
    </div>
    <div class="dlg-form-row">
      <div class="dlg-form-field dlg-f-half">
        <label>Option A (Player Choice)</label>
        <textarea id="dlg-f-opta" rows="2" placeholder="First choice text..."></textarea>
        <label class="dlg-radio-label"><input type="radio" name="dlg-f-correct" id="dlg-f-opta-correct" value="a"> Correct</label>
      </div>
      <div class="dlg-form-field dlg-f-half">
        <label>Option B (Player Choice)</label>
        <textarea id="dlg-f-optb" rows="2" placeholder="Second choice text..."></textarea>
        <label class="dlg-radio-label"><input type="radio" name="dlg-f-correct" id="dlg-f-optb-correct" value="b" checked> Correct</label>
      </div>
      <div class="dlg-form-field dlg-f-half">
        <label>Option C (Player Choice, optional)</label>
        <textarea id="dlg-f-optc" rows="2" placeholder="Third choice text (leave empty to disable)..."></textarea>
        <label class="dlg-radio-label"><input type="radio" name="dlg-f-correct" id="dlg-f-optc-correct" value="c"> Correct</label>
      </div>
    </div>
    <div class="dlg-form-row">
      <div class="dlg-form-field dlg-f-half">
        <label>Suspicion Penalty (wrong answer)</label>
        <input type="number" id="dlg-f-penalty" value="10" min="1" max="100">
      </div>
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
  form.scrollIntoView({ behavior: 'smooth' });
}

async function submitNewDialogue() {
  if (!currentEditQuest) return;

  const npc_name = document.getElementById('dlg-f-npc')?.value?.trim() || 'NPC';
  const npc_text = document.getElementById('dlg-f-text')?.value?.trim();
  const option_a_text = document.getElementById('dlg-f-opta')?.value?.trim();
  const option_b_text = document.getElementById('dlg-f-optb')?.value?.trim();
  const option_c_text = document.getElementById('dlg-f-optc')?.value?.trim() || null;

  // Radio button logic: only one correct answer
  const correctOption = document.querySelector('input[name="dlg-f-correct"]:checked')?.value;
  const option_a_correct = correctOption === 'a' ? 1 : 0;
  const option_b_correct = correctOption === 'b' ? 1 : 0;
  const option_c_correct = correctOption === 'c' ? 1 : 0;

  const suspicion_penalty = parseInt(document.getElementById('dlg-f-penalty')?.value) || 10;
  const context_notes = document.getElementById('dlg-f-notes')?.value?.trim() || '';

  if (!npc_text || !option_a_text || !option_b_text) {
    showT('Please fill in all required dialogue fields', 'error');
    return;
  }

  try {
    await apiCall(`/quests/${currentEditQuest.id}/dialogues`, {
      method: 'POST',
      body: JSON.stringify({
        npc_name, npc_text, option_a_text, option_b_text, option_c_text,
        option_a_correct, option_b_correct, option_c_correct, suspicion_penalty, context_notes
      })
    });

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
    form.innerHTML = `
      <div class="dlg-form-title">EDIT DIALOGUE #${dlg.sequence_order}</div>
      <div class="dlg-form-field">
        <label>NPC Name</label>
        <input type="text" id="dlg-e-npc" value="${esc(dlg.npc_name)}">
      </div>
      <div class="dlg-form-field">
        <label>NPC Dialogue Text</label>
        <textarea id="dlg-e-text" rows="3">${esc(dlg.npc_text)}</textarea>
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
          <label>Suspicion Penalty</label>
          <input type="number" id="dlg-e-penalty" value="${dlg.suspicion_penalty}" min="1" max="100">
        </div>
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
    form.scrollIntoView({ behavior: 'smooth' });
  } catch (err) {
    showT('Failed to load dialogue for editing', 'error');
  }
}

async function submitEditDialogue(dialogueId) {
  const npc_name = document.getElementById('dlg-e-npc')?.value?.trim();
  const npc_text = document.getElementById('dlg-e-text')?.value?.trim();
  const option_a_text = document.getElementById('dlg-e-opta')?.value?.trim();
  const option_b_text = document.getElementById('dlg-e-optb')?.value?.trim();
  const option_c_text = document.getElementById('dlg-e-optc')?.value?.trim() || null;

  // Radio button logic: only one correct answer
  const correctOption = document.querySelector('input[name="dlg-e-correct"]:checked')?.value;
  const option_a_correct = correctOption === 'a' ? 1 : 0;
  const option_b_correct = correctOption === 'b' ? 1 : 0;
  const option_c_correct = correctOption === 'c' ? 1 : 0;

  const suspicion_penalty = parseInt(document.getElementById('dlg-e-penalty')?.value) || 10;
  const context_notes = document.getElementById('dlg-e-notes')?.value?.trim() || '';

  try {
    await apiCall(`/quests/dialogues/${dialogueId}`, {
      method: 'PUT',
      body: JSON.stringify({
        npc_name, npc_text, option_a_text, option_b_text, option_c_text,

option_a_correct, option_b_correct, option_c_correct, suspicion_penalty, context_notes
      })
    });

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

async function saveArtifactPath(questId, inputId) {
  const input = document.getElementById(inputId);
  if (!input) return;

  const artifact_resource_path = input.value.trim();

  try {
    await apiCall(`/quests/${questId}`, {
      method: 'PUT',
      body: JSON.stringify({ artifact_resource_path })
    });

    // Update local state
    const qObj = allQuests.find(q => q.id === questId);
    if(qObj) qObj.artifact_resource_path = artifact_resource_path;

    showT('AR artifact path saved', 'success');
  } catch (err) {
    console.error('Failed to save artifact path:', err);
    showT('Failed to save artifact path', 'error');
  }
}
