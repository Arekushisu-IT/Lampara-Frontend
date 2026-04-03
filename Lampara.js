const ACCOUNTS = {};

let authToken = null;

/**
 * XSS Prevention: Escapes HTML special characters in user-provided strings.
 * Always use esc() when inserting user data (names, emails, etc.) into innerHTML.
 * This prevents malicious scripts from running in the admin's browser.
 */
function esc(str) {
  if (!str) return '';
  const div = document.createElement('div');
  div.textContent = String(str);
  return div.innerHTML;
}

const ROLE_META = {
  admin: { lbl: '⚜ ADMIN', cls: 'rp-admin' },
  staff: { lbl: '⚕ STAFF', cls: 'rp-staff' },
  user:  { lbl: '☺ USER',  cls: 'rp-user'  }
};

const API_CONFIG = {
  baseUrl: 'https://lampara-production.up.railway.app/api',
};

/**
 * Make authenticated API request with JWT token
 */
async function apiCall(endpoint, options = {}) {
  const url = `${API_CONFIG.baseUrl}${endpoint}`;
  
  const headers = {
    'Content-Type': 'application/json',
    ...options.headers
  };

  if (authToken) {
    headers['Authorization'] = `Bearer ${authToken}`;
  }

  try {
    const response = await fetch(url, {
      ...options,
      headers
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || `API Error: ${response.status}`);
    }

    return await response.json();
  } catch (err) {
    console.error('API Error:', err);
    throw err;
  }
}

const PANEL_TITLES = {
  db:  'DASHBOARD OVERVIEW',
  pl:  'PLAYER MANAGEMENT',
  vr:  'VERIFICATION & APPROVAL',
  qt:  'QUEST MANAGEMENT',
  lg:  'ACTIVITY LOGS'
};

let currentUser = null;
let editingId   = null;
let adminCount  = 0;

/** Show/hide password toggle */
function togglePw() {
  const input = document.getElementById('lpass');
  input.type  = input.type === 'password' ? 'text' : 'password';
}

/** Handle login form submit */
async function doLogin() {
  const emailEl  = document.getElementById('lemail');
  const passEl   = document.getElementById('lpass');
  const btn      = document.getElementById('lbtn');

  const email    = emailEl && emailEl.value ? String(emailEl.value).trim().toLowerCase() : '';
  const password = passEl && passEl.value ? String(passEl.value) : '';

  clearErrors();

  if (!email) {
    document.getElementById('eerr').classList.add('show');
    return;
  }

  btn.classList.add('loading');
  btn.disabled = true;

  try {
    const response = await apiCall('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password })
    });

    authToken = response.token;
    localStorage.setItem('authToken', authToken);

    currentUser = response.user;
    localStorage.setItem('currentUser', JSON.stringify(currentUser));

    resetBtn(btn);
    applyRoleToUI(currentUser);
    transitionToApp();
    loadInitialData(); 
    addLog('LOGIN', currentUser.name, 'Signed In', currentUser.role);
    showT(`Welcome back, ${currentUser.name.split(' ')[0]}`, 'success');

  } catch (err) {
    resetBtn(btn);
    showError('gerr', err.message || 'Login failed. Please try again.');
    console.error('Login error:', err);
  }
}

function clearErrors() {
  ['eerr', 'perr', 'gerr'].forEach(id =>
    document.getElementById(id).classList.remove('show')
  );
}

function showError(id, msg = null) {
  const el = document.getElementById(id);
  if (msg) el.textContent = msg;
  el.classList.add('show');
}

function resetBtn(btn) {
  btn.classList.remove('loading');
  btn.disabled = false;
}

function transitionToApp() {
  const loginScreen = document.getElementById('ls');
  loginScreen.classList.add('hidden');
  setTimeout(() => {
    loginScreen.style.display = 'none';
    document.getElementById('app').classList.add('visible');
  }, 500);
}

/** Sign out */
function doLogout() {
  addLog('LOGOUT', currentUser ? currentUser.name : 'Admin', 'Signed Out', currentUser ? currentUser.role : 'all');

  authToken = null;
  localStorage.removeItem('authToken');
  localStorage.removeItem('currentUser');

  document.getElementById('app').classList.remove('visible');
  const loginScreen = document.getElementById('ls');
  loginScreen.style.display = 'flex';
  setTimeout(() => loginScreen.classList.remove('hidden'), 10);

  document.getElementById('lemail').value = '';
  document.getElementById('lpass').value  = '';
  currentUser = null;

  showT('Signed out successfully', 'info');
}

/* ROLE-BASED UI */
function applyRoleToUI(user) {
  document.getElementById('sbname').textContent = user.name;

  const roleEl     = document.getElementById('sbrole');
  roleEl.textContent = ROLE_META[user.role].lbl;
  roleEl.className   = 'rp ' + ROLE_META[user.role].cls;

  const avatarEl         = document.getElementById('sbav');
  avatarEl.style.background = user.av;
  avatarEl.style.color      = user.ac;
  avatarEl.innerHTML        = user.ini + '<div class="odot"></div>';

  document.getElementById('nslogs').style.display = 'block';
}

/* NAVIGATION */
function sp(id, el) {
  if (el.classList.contains('locked')) {
    showT('Access restricted for your role', 'error');
    return;
  }

  document.querySelectorAll('.panel').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.ni').forEach(n  => n.classList.remove('active'));

  document.getElementById('panel-' + id).classList.add('active');
  el.classList.add('active');

  document.getElementById('tbtit').textContent = PANEL_TITLES[id] || id.toUpperCase();
}

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

function openPM(name, id, section, age, status, chapter, suspicion, codex) {
  document.getElementById('pm-n').textContent  = name;
  document.getElementById('pm-i').textContent  = id;
  document.getElementById('pm-s').textContent  = section;
  document.getElementById('pm-a').textContent  = age;
  document.getElementById('pm-c').textContent  = chapter;
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
    
    // ✨ FIX: Unwrap object to array
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
      <td>${esc(p.age || '--')}</td>
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

async function fetchAndRenderRecentlyProcessed() {
  try {
    let logs = await apiCall('/logs');
    if (logs.logs) logs = logs.logs;
    if (!Array.isArray(logs)) logs = [];
    
    const processed = logs.filter(log => 
      log.action.includes('APPROVED') || 
      log.action.includes('REJECTED') ||
      log.action.includes('SUSPENDED') ||
      log.action.includes('REINSTATED')
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

/* ACTIVITY LOG */
const LOG_PILLS = {
  'LOGIN':          'pa',
  'LOGOUT':         'pst',
  'APPROVED':       'pa',
  'REJECTED':       'ps',
  'SUSPENDED':      'ps',
  'REINSTATED':     'pa',
  'ADDED ADMIN':    'pp',
  'EDITED ADMIN':   'pp',
  'REMOVED ADMIN':  'ps'
};

function getLogVisibility(action, role) {
  if (!role || role === 'all') return 'all';
  return role;
}

function canSeeLog(visibility) {
  if (!currentUser) return visibility === 'all';
  if (visibility === 'all') return true;
  return currentUser.role === visibility;
}

function addLog(action, admin, target, actorRole) {
  if (authToken) {
    try {
      apiCall('/logs', {
        method: 'POST',
        body: JSON.stringify({ 
          action: action,
          description: `${admin} - ${target}`
        })
      }).catch(err => console.warn('Failed to save log to backend:', err));
    } catch (err) {
      console.warn('Could not send log to backend');
    }
  }

  const tbody = document.getElementById('logtb');
  if (!tbody) return;
  
  const now   = new Date();

  const pad = n => String(n).padStart(2, '0');
  const ts  = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())} ${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;

  const pillCls  = LOG_PILLS[action] || 'pp';
  const role     = actorRole || (currentUser ? currentUser.role : 'all');

  const row = document.createElement('tr');
  row.setAttribute('data-visibility', role);
  row.setAttribute('data-type', 'players');
  row.innerHTML = `
    <td><span class="mono-sm dim-txt">${ts}</span></td>
    <td><span style="font-size:11px">${admin}</span></td>
    <td><span class="pill ${pillCls} log-pill">${action}</span></td>
    <td><span class="dim-txt" style="font-size:11px">${target}</span></td>
    <td><span class="mono-sm dim-txt">127.0.0.1</span></td>`;

  tbody.insertBefore(row, tbody.firstChild);
}

/* MODALS */
function closeM(id) {
  document.getElementById(id).classList.remove('open');
}

document.querySelectorAll('.mov').forEach(overlay => {
  overlay.addEventListener('click', function (e) {
    if (e.target === this) this.classList.remove('open');
  });
});

/* ========================================================
   UPDATED TOAST NOTIFICATIONS (Top Center, Slide Down)
   ======================================================== */
const TOAST_ICONS = { success: '⚜', error: '✕', info: '◈' };

function showT(message, type = 'info') {
  const container = document.getElementById('tc');
  const toast     = document.createElement('div');

  toast.className = `toast ${type}`;
  toast.innerHTML = `<span>${TOAST_ICONS[type] || '◈'}</span><span>${message}</span>`;
  container.appendChild(toast);

  // Auto-dismiss after 3.5 seconds
  setTimeout(() => {
    toast.style.opacity   = '0';
    toast.style.transform = 'translateY(-30px)'; // Slide back up
    
    // Wait for the CSS transition to finish before removing from DOM
    setTimeout(() => toast.remove(), 400); 
  }, 3500);
}

/* FILTER BUTTONS */
document.querySelectorAll('.fb').forEach(btn => {
  btn.addEventListener('click', function () {
    this.closest('.tb').querySelectorAll('.fb').forEach(b => b.classList.remove('active'));
    this.classList.add('active');

    const filter = String(this.textContent || '').trim().toLowerCase();
    const panelId = this.closest('.panel').id;

    if (panelId === 'panel-lg') {
      const rows = document.querySelectorAll('#logtb tr[data-visibility]');
      rows.forEach(row => {
        const vis = row.getAttribute('data-visibility');
        if (!canSeeLog(vis)) { row.style.display = 'none'; return; }

        const type = row.getAttribute('data-type') || '';
        if (filter === 'all') {
          row.style.display = '';
        } else if (filter === 'login') {
          const action = row.querySelector('.log-pill') ? row.querySelector('.log-pill').textContent.trim() : '';
          row.style.display = (action === 'LOGIN' || action === 'LOGOUT') ? '' : 'none';
        } else if (filter === 'players') {
          row.style.display = type === 'players' ? '' : 'none';
        } else if (filter === 'admin') {
          row.style.display = type === 'admin' ? '' : 'none';
        } else if (filter === 'moderator') {
          row.style.display = type === 'moderator' ? '' : 'none';
        }
      });
    } else if (panelId === 'panel-db') {
      const rows = document.querySelectorAll('#db-ptbody tr');
      rows.forEach(row => {
        const status = row.getAttribute('data-status') || '';
        if (filter === 'all') {
          row.style.display = '';
        } else if (filter === 'active') {
          row.style.display = (status === 'active' || status === 'online' || status === 'offline') ? '' : 'none';
        } else if (filter === 'pending') {
          row.style.display = (status === 'pending') ? '' : 'none';
        } else {
          row.style.display = (status === filter) ? '' : 'none';
        }
      });
    } else if (panelId === 'panel-pl') {
      const rows = document.querySelectorAll('#ptbody tr');
      rows.forEach(row => {
        const status = row.getAttribute('data-status') || '';
        if (filter === 'all') {
          row.style.display = '';
        } else {
          row.style.display = (status === filter) ? '' : 'none';
        }
      });
    }
  });
});

/* KEYBOARD SHORTCUT */
const lpassEl = document.getElementById('lpass');
if (lpassEl) {
  lpassEl.addEventListener('keydown', e => {
    if (e.key === 'Enter') doLogin();
  });
}

/* ═══════════════════════════════════════════════════════════════════════════════════
   INITIALIZATION 
   ═══════════════════════════════════════════════════════════════════════════════════ */

document.addEventListener('DOMContentLoaded', async function () {
  const savedToken = localStorage.getItem('authToken');
  const savedUser = localStorage.getItem('currentUser');
  
  if (savedToken && savedUser) {
    try {
      authToken = savedToken;
      currentUser = JSON.parse(savedUser);
      
      const meResponse = await apiCall('/auth/me');
      currentUser = meResponse.user;
      
      applyRoleToUI(currentUser);
      transitionToApp();
      loadInitialData(); 
      showT(`Welcome back, ${currentUser.name.split(' ')[0]}`, 'success');
    } catch (err) {
      localStorage.removeItem('authToken');
      localStorage.removeItem('currentUser');
      authToken = null;
      console.log('Session expired or invalid');
    }
  }

  const dashNav = document.getElementById('ni-db');
  if (dashNav) {
    document.querySelectorAll('.panel').forEach(p => p.classList.remove('active'));
    document.querySelectorAll('.ni').forEach(n => n.classList.remove('active'));
    
    document.getElementById('panel-db').classList.add('active');
    dashNav.classList.add('active');
    document.getElementById('tbtit').textContent = PANEL_TITLES.db;
  }
  
  const emailInput = document.getElementById('lemail');
  if (emailInput) emailInput.focus();

  const notifBell = document.getElementById('notif-bell');
  if (notifBell) {
    notifBell.addEventListener('click', () => {
      const vrNavBtn = document.getElementById('ni-vr');
      if (vrNavBtn) sp('vr', vrNavBtn);
    });
  }
});

/* ════════════════════════════════════════════
   DATA FETCHING & RENDERING
   ════════════════════════════════════════════ */

function loadInitialData() {
  fetchAndRenderPlayers();
  fetchAndRenderQuests();
  fetchAndRenderLogs();
  fetchAndRenderPendingApprovals();
  fetchAndRenderRecentlyProcessed();
}

setInterval(() => {
  if (authToken) {
    fetchAndRenderPlayers();
    fetchAndRenderPendingApprovals();
    fetchAndRenderRecentlyProcessed();
  }
}, 15000);
    
async function fetchAndRenderPlayers() {
  try {
    let players = await apiCall('/players');
    
    // ✨ FIX: Unwrap object to array
    if (players.players) players = players.players;
    if (!Array.isArray(players)) players = [];

    renderDashboardPlayers(players.slice(0, 5)); 
    renderPlayerRegistry(players);

    const pendingCount = players.filter(p => p.status === 'inactive' || p.status === 'pending').length;
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
    
    // ✨ Smart Status Pill
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
    
    // ✨ Real Database Values
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
      actionHTML = `<button class="ab abv" onclick="openPM('${p.name.replace(/'/g, "\\'")}','ID-${p.id}','${email}','${p.age || '--'}','${displayStatus}','${chapterText}','${suspicion}','--')">VIEW</button>`;
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
    const progressPct = Math.min(100, Math.round((p.experience / ((p.level || 1) * 1000)) * 100)) || 0;
    
    const email = p.email || 'Unassigned';

    let actionHTML = `<button class="ab abv" onclick="openPM('${p.name.replace(/'/g, "\\'")}','ID-${p.id}','${email}','${p.age || '--'}','${displayStatus}','Lvl ${p.level || 1}','0','${progressPct}%')">VIEW</button>`;
    
    if (p.status === 'active') {
      actionHTML += `<button class="ab absu" onclick="updatePlayerStatus(${p.id}, '${p.name.replace(/'/g, "\\'")}', 'banned', 'Suspended')">SUSPEND</button>`;
    } else if (isBanned) {
      actionHTML += `<button class="ab aba" onclick="updatePlayerStatus(${p.id}, '${p.name.replace(/'/g, "\\'")}', 'active', 'Reinstated')">REINSTATE</button>`;
    } else {
      actionHTML += `
        <button class="ab aba" onclick="approvePending(${p.id}, '${p.name.replace(/'/g, "\\'")}')">APPROVE</button>
        <button class="ab abr" onclick="rejectPending(${p.id}, '${p.name.replace(/'/g, "\\'")}')">REJECT</button>
      `;
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
      <td>
        <div class="plbl">Lvl ${p.level || 1}</div>
        <div class="pbar"><div class="pfill" style="width:${progressPct}%"></div></div>
      </td>
      <td><span class="mono-sm gold-txt">${progressPct}%</span></td>
      <td><span class="mono-sm">${isBanned ? '1' : '0'}</span></td>
      <td>${actionHTML}</td>
    `;
    tbody.appendChild(row);
  });
}

async function fetchAndRenderQuests() {
  try {
    let questsData = await apiCall('/quests');
    
    // ✨ FIX: Unwrap object to array
    if (questsData.quests) questsData = questsData.quests;
    if (!Array.isArray(questsData)) questsData = [];

    const grid = document.querySelector('#panel-qt .cgrid');
    if (!grid) return;
    
    grid.innerHTML = '';

    const rom = ['I','II','III','IV','V','VI','VII','VIII','IX','X','XI','XII','XIII'];

    questsData.forEach(q => {
      const isSb = q.status !== 'active';
      const sbClass = isSb ? 'sb' : '';
      const roman = rom[q.chapter - 1] || q.chapter;
      
      const pillHTML = isSb 
        ? `<div class="sbov"><div class="sbtx">STANDBY</div></div><svg class="lkico" width="12" height="12" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clip-rule="evenodd"/></svg>`
        : `<span class="pill pa">ACTIVE</span>`;

      const btnHTML = isSb
        ? `<button class="ab aba" style="margin-top:12px; width:100%; border-radius:4px" onclick="event.stopPropagation(); setQuestStatus(${q.id}, 'active')">ACTIVATE QUEST</button>`
        : `<button class="ab abr" style="margin-top:12px; width:100%; border-radius:4px" onclick="event.stopPropagation(); setQuestStatus(${q.id}, 'standby')">SET TO STANDBY</button>`;

      const metaHTML = !isSb 
        ? `<div class="cmeta">
             <div class="cmi">Reached<span class="cmv" style="color:#6dba85">${q.player_count || 0}</span></div>
             <div class="cmi">Avg Fails<span class="cmv">--</span></div>
           </div>` 
        : '';

      const card = document.createElement('div');
      card.className = `cc ${sbClass}`;
      card.innerHTML = `
        <div class="cdec">${roman}</div>
        <div class="cnum">CHAPTER ${roman}</div>
        <div class="ctit">${q.title}</div>
        <div class="csub">${q.description || 'No description available'}</div>
        ${metaHTML}
        ${pillHTML}
        <div style="position:relative; z-index:10;">${btnHTML}</div>
      `;
      grid.appendChild(card);
    });
  } catch (err) {
    console.error('Failed to load quests:', err);
  }
}

window.setQuestStatus = async function(id, newStatus) {
  try {
    const res = await apiCall(`/quests/${id}`, 'PUT', { status: newStatus });
    if (res.error) throw new Error(res.error);
    showT(`Quest successfully set to ${newStatus.toUpperCase()}`, 'success');
    fetchAndRenderQuests();
  } catch(err) {
    showT(err.message || 'Failed to update quest status', 'error');
  }
}

async function fetchAndRenderLogs() {
  try {
    let logs = await apiCall('/logs');
    if (logs.logs) logs = logs.logs;
    if (!Array.isArray(logs)) logs = [];

    const tbody = document.getElementById('logtb');
    if (!tbody) return;
    
    tbody.innerHTML = '';

    logs.forEach(log => {
      const dateObj = new Date(log.timestamp);
      const pad = n => String(n).padStart(2, '0');
      const ts  = `${dateObj.getFullYear()}-${pad(dateObj.getMonth() + 1)}-${pad(dateObj.getDate())} ${pad(dateObj.getHours())}:${pad(dateObj.getMinutes())}:${pad(dateObj.getSeconds())}`;

      const actionUpper = log.action ? log.action.toUpperCase() : 'UNKNOWN';
      const pillCls  = LOG_PILLS[actionUpper] || 'pp'; 
      
      let adminName = 'Admin';
      let targetDesc = log.description || '';
      if (targetDesc.includes(' - ')) {
        const parts = targetDesc.split(' - ');
        adminName = parts[0]; 
        targetDesc = parts.slice(1).join(' - '); 
      }

      const type = actionUpper.includes('PLAYER') ? 'players' : 'admin';

      const row = document.createElement('tr');
      row.setAttribute('data-visibility', 'all'); 
      row.setAttribute('data-type', type);
      row.innerHTML = `
        <td><span class="mono-sm dim-txt">${ts}</span></td>
        <td><span style="font-size:11px">${adminName}</span></td>
        <td><span class="pill ${pillCls} log-pill">${actionUpper}</span></td>
        <td><span class="dim-txt" style="font-size:11px">${targetDesc}</span></td>
        <td><span class="mono-sm dim-txt">System</span></td>
      `;
      tbody.appendChild(row);
    });
  } catch (err) {
    console.error('Failed to load logs:', err);
  }
}