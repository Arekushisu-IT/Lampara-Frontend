// ============================================================
// PLAYERS - Player Management, Approvals & Rendering
// ============================================================

/* PLAYER ACTIONS */
async function updatePlayerStatus(playerId, playerName, newStatus, actionName) {
  try {
    await apiCall(`/players/${playerId}`, {
      method: 'PUT',
      body: JSON.stringify({ status: newStatus })
    });

    showT(`${playerName} ${String(actionName || '').toLowerCase()} successfully`, 'success');
    const logActionName = actionName.toUpperCase();
    addLog(logActionName, currentUser ? currentUser.name : 'Admin', playerName, currentUser ? currentUser.role : 'all');
    fetchAndRenderPlayers();
    return true;

  } catch (err) {
    console.error('Failed to update player status:', err);
    showT(`Error: Could not ${String(actionName || '').toLowerCase()} ${playerName}`, 'error');
    return false;
  }
}

// El Filibusterismo book chapters the player's current sub-quest covers. players.chapter
// holds the MAIN QUEST number, not a book chapter, so the range comes from
// book_chapter_start / book_chapter_end. Position 0 means no main quest started yet.
function bookChapterText(p) {
  const start = p.book_chapter_start;
  const end = p.book_chapter_end;
  // No range: either the player has not begun, or their saved position has no quest
  // row (e.g. a leftover slot) even though they have completed quests.
  if (start == null) return (p.current_quest_id || p.overall_progress > 0) ? '—' : 'Not started';
  return (end == null || end === start) ? `Ch. ${start}` : `Ch. ${start}–${end}`;
}

// Where the player is in the quest structure, e.g. "MQ2 · SQ4".
function questPositionText(p) {
  if (p.current_quest_id) return `MQ${p.current_quest_id} · SQ${p.current_sub_quest || 1}`;
  return p.overall_progress > 0 ? '—' : 'Not started';
}

function openPM(name, id, section, birthdate, status, chapter, suspicion, codex) {
  document.getElementById('pm-n').textContent = name;
  document.getElementById('pm-i').textContent = id;
  document.getElementById('pm-s').textContent = section;
  document.getElementById('pm-a').textContent = birthdate;
  document.getElementById('pm-c').textContent = chapter;
  document.getElementById('pm-su').textContent = suspicion + ' / 100 pts';
  document.getElementById('pm-cd').textContent = codex;

  const pillMap = { Active: 'pa', Pending: 'pp', Suspended: 'ps', Inactive: 'pp', Banned: 'ps' };
  document.getElementById('pm-st').innerHTML =
    `<span class="pill ${pillMap[status] || 'pp'}">${status.toUpperCase()}</span>`;

  document.getElementById('pmtit').textContent = name.toUpperCase() + ' — PROFILE';
  document.getElementById('mov-pl').classList.add('open');

  const playerId = String(id).replace(/^ID-/, '');
  currentProfile = { id: playerId, name };
  updateProfileActions(status);
  loadPlayerProfileLive(playerId);
  loadPlayerArtifacts(playerId);
}

// The player the profile modal is showing, for its REINSTATE / SUSPEND buttons.
let currentProfile = null;

// Show only the action that applies: SUSPEND for an active player, REINSTATE for a
// suspended one, neither for a pending account (those are approved in Verification).
function updateProfileActions(status) {
  const s = String(status || '').toLowerCase();
  const suspended = s === 'banned' || s === 'suspended';
  const pending = s === 'inactive' || s === 'pending';
  const reinstate = document.getElementById('pm-reinstate');
  const suspend = document.getElementById('pm-suspend');
  if (reinstate) reinstate.style.display = suspended ? '' : 'none';
  if (suspend) suspend.style.display = (!suspended && !pending) ? '' : 'none';
}

// REINSTATE / SUSPEND from the profile. These buttons previously only showed a toast
// and changed nothing.
async function setProfileStatus(newStatus, actionName) {
  if (!currentProfile) return;
  if (newStatus === 'banned' && !confirm(`Suspend ${currentProfile.name}? They will not be able to log in.`)) {
    return;
  }
  const ok = await updatePlayerStatus(currentProfile.id, currentProfile.name, newStatus, actionName);
  if (ok) closeM('mov-pl');
}

// The player whose live profile numbers are loading. A slow response for a
// previously opened player must not overwrite the profile currently shown.
let profileLiveFor = null;

// Re-fetches the numbers that change during play, so the profile reflects the
// database now rather than whatever the player list loaded earlier. The values
// passed to openPM stay on screen until this lands, or if it fails.
async function loadPlayerProfileLive(playerId) {
  const failEl = document.getElementById('pm-fl');
  const doneEl = document.getElementById('pm-qc');
  profileLiveFor = playerId;
  if (failEl) failEl.textContent = '…';
  if (doneEl) doneEl.textContent = '…';

  try {
    const data = await apiCall(`/players/${playerId}/progression`);
    if (profileLiveFor !== playerId || !data) return;

    // Same shape bookChapterText / questPositionText read from the player list.
    const p = {
      current_quest_id: data.current_quest,
      current_sub_quest: data.current_sub_quest,
      book_chapter_start: data.current_book_chapter_start,
      book_chapter_end: data.current_book_chapter_end,
      overall_progress: data.overall_progress
    };

    document.getElementById('pm-c').textContent = bookChapterText(p);
    document.getElementById('pm-cd').textContent = questPositionText(p);
    document.getElementById('pm-su').textContent = (data.suspicion || 0) + ' / 100 pts';

    const isBanned = data.status === 'banned' || data.status === 'suspended';
    const isPending = data.status === 'inactive' || data.status === 'pending';
    const label = isBanned ? 'SUSPENDED' : (isPending ? 'PENDING' : 'ACTIVE');
    const cls = isBanned ? 'ps' : (isPending ? 'pp' : 'pa');
    document.getElementById('pm-st').innerHTML = `<span class="pill ${cls}">${label}</span>`;
    updateProfileActions(data.status);

    if (failEl) failEl.textContent = data.total_failures || 0;
    if (doneEl) {
      doneEl.textContent = `${data.completed_sub_quests || 0} / ${data.total_sub_quests || 0} (${data.overall_progress || 0}%)`;
    }
  } catch (err) {
    if (profileLiveFor !== playerId) return;
    if (failEl) failEl.textContent = '—';
    if (doneEl) doneEl.textContent = '—';
  }
}

// Reloads the player list and re-applies the active filter (All / Active / ...),
// since re-rendering shows every row again.
async function refreshPlayerRegistry(btn) {
  if (btn) {
    btn.disabled = true;
    btn.textContent = 'REFRESHING…';
  }
  try {
    await fetchAndRenderPlayers();
    const activeFilter = document.querySelector('#panel-pl .tb .fb.active');
    if (activeFilter) activeFilter.click();
  } finally {
    if (btn) {
      btn.disabled = false;
      btn.textContent = 'REFRESH';
    }
  }
}

// The player whose artifacts the profile modal is showing. Guards against a slow
// response for a previously opened player overwriting the current one.
let profileArtifactsFor = null;

// Fills the profile modal with the player's artifact collection, in game order.
async function loadPlayerArtifacts(playerId) {
  const summary = document.getElementById('pm-art-sum');
  const list = document.getElementById('pm-art-list');
  if (!summary || !list) return;

  profileArtifactsFor = playerId;
  summary.textContent = 'loading…';
  list.innerHTML = '';

  try {
    const data = await apiCall(`/players/${playerId}/artifacts`);
    if (profileArtifactsFor !== playerId) return;

    const artifacts = (data && data.artifacts) || [];
    summary.textContent = `${data.collected || 0} / ${data.total || 0}`;

    if (artifacts.length === 0) {
      list.innerHTML = '<div style="color: var(--td); font-size: 11px;">No artifacts configured.</div>';
      return;
    }

    list.innerHTML = artifacts.map(a => {
      const label = esc(a.artifact_name || 'Unnamed artifact');
      const where = `MQ${a.main_quest} · SQ${a.sub_quest}`;
      return a.collected
        ? `<div style="font-size: 11px; color: var(--goldl);" title="${esc(a.quest_title || '')}">✓ ${label} <span style="color: var(--td);">${where}</span></div>`
        : `<div style="font-size: 11px; color: var(--td);" title="${esc(a.quest_title || '')}">○ ${label} <span>${where}</span></div>`;
    }).join('');
  } catch (err) {
    if (profileArtifactsFor !== playerId) return;
    summary.textContent = '—';
    list.innerHTML = '<div style="color: var(--td); font-size: 11px;">Could not load artifacts.</div>';
  }
}

/* PENDING APPROVALS */
async function fetchAndRenderPendingApprovals() {
  setTableLoading('pending-tbody');
  try {
    let players = await apiCall('/players');
    if (players.players) players = players.players;
    if (!Array.isArray(players)) players = [];

    const pending = players.filter(p => p.status === 'inactive' || p.status === 'pending');
    renderPendingTable(pending);

    const badge = document.getElementById('pending-count');
    if (badge) {
      badge.textContent = pending.length > 0 ? `${pending.length} PENDING` : '0 PENDING';
    }
  } catch (err) {
    console.error('Failed to load pending approvals:', err);
    setTableMessage('pending-tbody', 'Could not load pending approvals.', { retry: 'fetchAndRenderPendingApprovals', error: true });
    showT('Failed to load pending approvals', 'error');
  }
}

function renderPendingTable(pending) {
  const tbody = document.getElementById('pending-tbody');
  if (!tbody) return;
  tbody.innerHTML = '';

  if (pending.length === 0) {
    setTableMessage(tbody, 'No pending approvals');
    return;
  }

  pending.forEach(p => {
    const initials = p.name.substring(0, 2).toUpperCase();
    const section = p.email || 'Unassigned';
    const submitted = p.created_at ? new Date(p.created_at).toLocaleDateString() : 'N/A';
    const link = signupLinkText(p.token_expires_at);

    const row = document.createElement('tr');
    row.innerHTML = `
      <td>
        <div class="pcell">
          <div class="pav" style="background:linear-gradient(135deg,#4a3a10,#7a5820);color:#f0d090">${esc(initials)}</div>
          <div>
            <div class="pname">${esc(p.name)}</div>
            <div class="pid">Pending</div>
          </div>
        </div>
      </td>
      <td><span class="mono-sm">${p.id ? '2026-STI-' + String(p.id).padStart(4, '0') : '—'}</span></td>
      <td>${esc(section)}</td>
      <td>${esc(p.birthdate ? new Date(p.birthdate).toLocaleDateString() : '--')}</td>
      <td><span class="mono-sm gold-txt">${esc(p.username) || '—'}</span></td>
      <td>
        <span class="date-sm">${submitted}</span>
        <div class="pid" style="color:${link.expired ? 'var(--danger, #e06060)' : 'var(--td)'}"
             title="${link.expired ? 'Never verified. The email and username are freed for the next sign-up that uses them.' : 'Waiting for the player to click the emailed verification link.'}">${link.text}</div>
      </td>
      <td>
        <button class="ab aba" onclick="approvePending(${p.id}, '${p.name.replace(/'/g, "\\'")}')">APPROVE</button>
        <button class="ab abr" onclick="rejectPending(${p.id}, '${p.name.replace(/'/g, "\\'")}')">REJECT</button>
      </td>
    `;
    tbody.appendChild(row);
  });
}

async function approvePending(playerId, playerName) {
  try {
    await updatePlayerStatus(playerId, playerName, 'active', 'APPROVED');
    fetchAndRenderPendingApprovals();
  } catch (err) {
    console.error('Error approving player:', err);
    showT(`Failed to approve ${playerName}`, 'error');
  }
}

async function rejectPending(playerId, playerName) {
  try {
    await updatePlayerStatus(playerId, playerName, 'banned', 'REJECTED');
    fetchAndRenderPendingApprovals();
  } catch (err) {
    console.error('Error rejecting player:', err);
    showT(`Failed to reject ${playerName}`, 'error');
  }
}

/* RECENTLY PROCESSED */
async function fetchAndRenderRecentlyProcessed() {
  try {
    let logs = await apiCall('/logs');
    if (logs.logs) logs = logs.logs;
    if (!Array.isArray(logs)) logs = [];

    const processed = logs.filter(log =>
      log.action.includes('APPROVED') || log.action.includes('REJECTED') ||
      log.action.includes('SUSPENDED') || log.action.includes('REINSTATED')
    ).slice(0, 10);

    renderProcessedTable(processed);
  } catch (err) {
    console.error('Failed to load processed approvals:', err);
    setTableMessage('processed-tbody', 'Could not load recent decisions.', { retry: 'fetchAndRenderRecentlyProcessed', error: true });
  }
}

function renderProcessedTable(processed) {
  const tbody = document.getElementById('processed-tbody');
  if (!tbody) return;
  tbody.innerHTML = '';

  if (processed.length === 0) {
    setTableMessage(tbody, 'No activity yet');
    return;
  }

  processed.forEach(log => {
    let playerName = 'Unknown';
    let actionResult = 'PENDING';
    let resultPill = 'pp';

    if (log.description) {
      const parts = log.description.split(' - ');
      playerName = parts[1] || 'Unknown';
    }

    const actionUpper = log.action ? log.action.toUpperCase() : 'UNKNOWN';

    if (actionUpper.includes('APPROVED') || actionUpper.includes('REINSTAT')) {
      actionResult = 'APPROVED';
      resultPill = 'pa';
    } else if (actionUpper.includes('REJECTED') || actionUpper.includes('BANNED') || actionUpper.includes('SUSPENDED')) {
      actionResult = 'REJECTED';
      resultPill = 'ps';
    }

    const initials = playerName.substring(0, 2).toUpperCase();
    const processedDate = log.timestamp ? new Date(log.timestamp).toLocaleDateString() : 'N/A';

    const row = document.createElement('tr');
    row.innerHTML = `
      <td>
        <div class="pcell">
          <div class="pav" style="background:linear-gradient(135deg,#2d6a3f,#6dba85);color:#fff">${initials}</div>
          <div class="pname">${playerName}</div>
        </div>
      </td>
      <td><span class="pill ${resultPill}">${actionResult}</span></td>
      <td><span class="date-sm">${processedDate}</span></td>
      <td><span class="mono-sm">Administrator</span></td>
    `;
    tbody.appendChild(row);
  });
}

/* DASHBOARD & REGISTRY PLAYERS */
async function fetchAndRenderPlayers() {
  setTableLoading('db-ptbody');
  setTableLoading('ptbody');
  try {
    const response = await apiCall('/players');
    // Keep the response: stats.weeklyNew lives beside the list, and reassigning the
    // variable to the array used to lose it (the dashboard always showed "0 this week").
    let players = response && response.players ? response.players : response;
    if (!Array.isArray(players)) players = [];

    renderDashboardPlayers(players.slice(0, 5));
    renderPlayerRegistry(players);

    const pendingCount = players.filter(p => p.status === 'inactive' || p.status === 'pending').length;
    const activeCount = players.filter(p => p.status === 'active').length;
    const suspendedCount = players.filter(p => p.status === 'banned').length;
    const activeSessions = players.filter(p => p.is_online).length;

    // Dynamic DOM Updates
    const totalPlayersEl = document.getElementById('stat-total-players');
    if (totalPlayersEl) totalPlayersEl.textContent = players.length;

    const weeklyEl = document.getElementById('stat-weekly-players');
    if (weeklyEl) weeklyEl.textContent = `${response?.stats?.weeklyNew || 0} this week`;

    const pendingEl = document.getElementById('stat-pending-approvals');
    if (pendingEl) pendingEl.textContent = pendingCount;

    const activeSessEl = document.getElementById('stat-active-sessions');
    if (activeSessEl) activeSessEl.textContent = activeSessions;

    const plTotalEl = document.getElementById('stat-pl-total');
    if (plTotalEl) plTotalEl.textContent = players.length;

    const plActiveEl = document.getElementById('stat-pl-active');
    if (plActiveEl) plActiveEl.textContent = activeCount;

    const plSuspEl = document.getElementById('stat-pl-susp');
    if (plSuspEl) plSuspEl.textContent = suspendedCount;

    const badge = document.getElementById('notif-badge');
    if (badge) {
      if (pendingCount > 0) {
        badge.textContent = pendingCount;
        badge.style.display = 'block';
      } else {
        badge.style.display = 'none';
      }
    }
  } catch (err) {
    console.error('Failed to load players:', err);
    setTableMessage('db-ptbody', 'Could not load players.', { retry: 'fetchAndRenderPlayers', error: true });
    setTableMessage('ptbody', 'Could not load players.', { retry: 'fetchAndRenderPlayers', error: true });
    showT('Failed to load players data', 'error');
  }
}

function renderDashboardPlayers(players) {
  const tbody = document.getElementById('db-ptbody');
  if (!tbody) return;
  tbody.innerHTML = '';
  if (players.length === 0) { setTableMessage(tbody, 'No players registered yet'); return; }

  players.forEach(p => {
    const isBanned = p.status === 'banned' || p.status === 'suspended';
    const isPending = p.status === 'inactive' || p.status === 'pending';

    let displayStatus, pillCls;
    if (isBanned) {
      displayStatus = 'SUSPENDED'; pillCls = 'ps';
    } else if (isPending) {
      displayStatus = 'PENDING'; pillCls = 'pp';
    } else {
      displayStatus = p.is_online ? 'ONLINE' : 'OFFLINE';
      pillCls = p.is_online ? 'pa' : 'pst';
    }

    const initials = p.name.substring(0, 2).toUpperCase();
    const email = p.email || 'Unassigned';
    const chapterText = bookChapterText(p);
    const suspicion = p.suspicion || 0;
    const susColor = suspicion > 75 ? 'style="color:#e06060"' : 'class="gold-txt"';

    let actionHTML = '';
    if (isPending) {
      actionHTML = `
        <button class="ab aba" onclick="approvePending(${p.id}, '${p.name.replace(/'/g, "\\'")}')">APPROVE</button>
        <button class="ab abr" onclick="rejectPending(${p.id}, '${p.name.replace(/'/g, "\\'")}')">REJECT</button>
      `;
    } else {
      actionHTML = `<button class="ab abv" onclick="openPM('${p.name.replace(/'/g, "\\'")}','ID-${p.id}','${email}','${p.birthdate ? new Date(p.birthdate).toLocaleDateString() : '--'}','${displayStatus}','${chapterText}','${suspicion}','${questPositionText(p)}')">VIEW</button>`;
    }

    const row = document.createElement('tr');
    row.setAttribute('data-status', displayStatus.toLowerCase());
    row.innerHTML = `
      <td>
        <div class="pcell">
          <div class="pav" style="background:linear-gradient(135deg,#2d6a3f,#6dba85);color:#fff">${esc(initials)}</div>
          <div><div class="pname">${esc(p.name)}</div><div class="pid">@${esc(p.username)}</div></div>
        </div>
      </td>
      <td>${esc(email)}</td>
      <td><span class="pill ${pillCls}">${displayStatus}</span></td>
      <td>${chapterText}</td>
      <td><span class="mono-sm" ${susColor}>${suspicion} pts</span></td>
      <td>${actionHTML}</td>
    `;
    tbody.appendChild(row);
  });
  if (typeof applyTopbarSearch === 'function') applyTopbarSearch();
}

function renderPlayerRegistry(players) {
  const tbody = document.getElementById('ptbody');
  if (!tbody) return;
  tbody.innerHTML = '';
  if (players.length === 0) { setTableMessage(tbody, 'No players registered yet'); return; }

  players.forEach(p => {
    const isBanned = p.status === 'banned' || p.status === 'suspended';
    const isPending = p.status === 'inactive' || p.status === 'pending';
    const pillCls = p.status === 'active' ? 'pa' : (isBanned ? 'ps' : 'pp');
    const displayStatus = isBanned ? 'SUSPENDED' : (isPending ? 'PENDING' : 'ACTIVE');

    const initials = p.name.substring(0, 2).toUpperCase();
    const progressPct = Math.min(100, p.overall_progress || 0);
    const email = p.email || 'Unassigned';

    // Quest position and El Filibusterismo chapters (see bookChapterText above).
    const position = questPositionText(p);
    const chapterText = bookChapterText(p);

    let actionHTML = `<button class="ab abv" onclick="openPM('${p.name.replace(/'/g, "\\'")}','ID-${p.id}','${email}','${p.birthdate ? new Date(p.birthdate).toLocaleDateString() : '--'}','${displayStatus}','${chapterText}','${p.suspicion || 0}','${position}')" >VIEW</button>`;

    if (p.status === 'active') {
      actionHTML += `<button class="ab absu" onclick="updatePlayerStatus(${p.id}, '${p.name.replace(/'/g, "\\'")}', 'banned', 'Suspended')">SUSPEND</button>`;
    } else if (p.status === 'banned' || p.status === 'suspended') {
      actionHTML += `<button class="ab aba" onclick="updatePlayerStatus(${p.id}, '${p.name.replace(/'/g, "\\'")}', 'active', 'Reinstated')">REINSTATE</button>`;
    }

    const row = document.createElement('tr');
    // Tag the row with the label shown in the pill (active / suspended / pending), which
    // is what the toolbar filters compare against. The raw status never matched two of
    // them: suspended accounts are stored as 'banned' and pending ones as 'inactive'.
    row.setAttribute('data-status', displayStatus.toLowerCase());
    row.innerHTML = `
      <td>
        <div class="pcell">
          <div class="pav" style="background:linear-gradient(135deg,#2d6a3f,#6dba85);color:#fff">${esc(initials)}</div>
          <div><div class="pname">${esc(p.name)}</div><div class="pid">@${esc(p.username)}</div></div>
        </div>
      </td>
      <td>${esc(email)}</td>
      <td><span class="pill ${pillCls}">${displayStatus}</span></td>
      <td>
        <div style="font-size:10px;color:var(--ts)">${progressPct}%</div>
        <div class="pbar"><div class="pfill" style="width:${progressPct}%"></div></div>
      </td>
      <td><span class="mono-sm gold-txt" style="font-size:11px;font-weight:700" title="${chapterText}">${position}</span></td>
      <td><span class="mono-sm">${p.artifacts_collected || 0}/${p.artifacts_total || 0}</span></td>
      <td><span class="mono-sm dim-txt">${p.suspicion || 0}</span></td>
      <td><span class="mono-sm ${(p.total_failures || 0) > 0 ? 'gold-txt' : 'dim-txt'}">${p.total_failures || 0}</span></td>
      <td>${actionHTML}</td>
    `;
    tbody.appendChild(row);
  });
  if (typeof applyTopbarSearch === 'function') applyTopbarSearch();
}
