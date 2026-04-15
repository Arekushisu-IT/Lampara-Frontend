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

  } catch (err) {
    console.error('Failed to update player status:', err);
    showT(`Error: Could not ${String(actionName || '').toLowerCase()} ${playerName}`, 'error');
  }
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
}

/* PENDING APPROVALS */
async function fetchAndRenderPendingApprovals() {
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
    showT('Failed to load pending approvals', 'error');
  }
}

function renderPendingTable(pending) {
  const tbody = document.getElementById('pending-tbody');
  if (!tbody) return;
  tbody.innerHTML = '';

  if (pending.length === 0) {
    tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;color:var(--td);padding:20px;">No pending approvals</td></tr>';
    return;
  }

  pending.forEach(p => {
    const initials = p.name.substring(0, 2).toUpperCase();
    const section = p.email || 'Unassigned';
    const submitted = p.created_at ? new Date(p.created_at).toLocaleDateString() : 'N/A';

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
      <td><span class="date-sm">${submitted}</span></td>
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
  }
}

function renderProcessedTable(processed) {
  const tbody = document.getElementById('processed-tbody');
  if (!tbody) return;
  tbody.innerHTML = '';

  if (processed.length === 0) {
    tbody.innerHTML = '<tr><td colspan="4" style="text-align:center;color:var(--td);padding:20px;">No activity yet</td></tr>';
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
  try {
    let players = await apiCall('/players');
    if (players.players) players = players.players;
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
    showT('Failed to load players data', 'error');
  }
}

function renderDashboardPlayers(players) {
  const tbody = document.getElementById('db-ptbody');
  if (!tbody) return;
  tbody.innerHTML = '';

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
    const chapterText = `Ch. ${p.chapter || 1}`;
    const suspicion = p.suspicion || 0;
    const susColor = suspicion > 75 ? 'style="color:#e06060"' : 'class="gold-txt"';

    let actionHTML = '';
    if (isPending) {
      actionHTML = `
        <button class="ab aba" onclick="approvePending(${p.id}, '${p.name.replace(/'/g, "\\'")}')">APPROVE</button>
        <button class="ab abr" onclick="rejectPending(${p.id}, '${p.name.replace(/'/g, "\\'")}')">REJECT</button>
      `;
    } else {
      actionHTML = `<button class="ab abv" onclick="openPM('${p.name.replace(/'/g, "\\'")}','ID-${p.id}','${email}','${p.birthdate ? new Date(p.birthdate).toLocaleDateString() : '--'}','${displayStatus}','${chapterText}','${suspicion}','--')">VIEW</button>`;
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
}

function renderPlayerRegistry(players) {
  const tbody = document.getElementById('ptbody');
  if (!tbody) return;
  tbody.innerHTML = '';

  players.forEach(p => {
    const isBanned = p.status === 'banned' || p.status === 'suspended';
    const isPending = p.status === 'inactive' || p.status === 'pending';
    const pillCls = p.status === 'active' ? 'pa' : (isBanned ? 'ps' : 'pp');
    const displayStatus = isBanned ? 'SUSPENDED' : (isPending ? 'PENDING' : 'ACTIVE');

    const initials = p.name.substring(0, 2).toUpperCase();
    const subQuestsDone = p.current_sub_quest || 0;
    const progressPct = Math.min(100, subQuestsDone * 20);
    const email = p.email || 'Unassigned';

    // Codex format: Chapter-Quest (e.g., "1-2")
    const codex = `${p.chapter || 1}-${p.current_quest_id || 1}`;
    const codexFull = `Ch.${p.chapter || 1} Q${p.current_quest_id || 1} SQ${p.current_sub_quest || 0}`;

    let actionHTML = `<button class="ab abv" onclick="openPM('${p.name.replace(/'/g, "\\'")}','ID-${p.id}','${email}','${p.birthdate ? new Date(p.birthdate).toLocaleDateString() : '--'}','${displayStatus}','${codexFull}','${p.suspicion || 0}','${codex}')" >VIEW</button>`;

    if (p.status === 'active') {
      actionHTML += `<button class="ab absu" onclick="updatePlayerStatus(${p.id}, '${p.name.replace(/'/g, "\\'")}', 'banned', 'Suspended')">SUSPEND</button>`;
    } else if (p.status === 'banned' || p.status === 'suspended') {
      actionHTML += `<button class="ab aba" onclick="updatePlayerStatus(${p.id}, '${p.name.replace(/'/g, "\\'")}', 'active', 'Reinstated')">REINSTATE</button>`;
    }

    const row = document.createElement('tr');
    row.setAttribute('data-status', p.status);
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
      <td><span class="mono-sm gold-txt" style="font-size:11px;font-weight:700">${codex}</span></td>
      <td><span class="mono-sm dim-txt">${p.suspicion || 0}</span></td>
      <td>${actionHTML}</td>
    `;
    tbody.appendChild(row);
  });
}
