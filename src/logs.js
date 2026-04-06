// ============================================================
// LOGS - Activity Logs
// ============================================================

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

  const ts = formatTimestamp();
  const pillCls = LOG_PILLS[action] || 'pp';
  const role = actorRole || (currentUser ? currentUser.role : 'all');

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

async function fetchAndRenderLogs() {
  try {
    let logs = await apiCall('/logs');
    if (logs.logs) logs = logs.logs;
    if (!Array.isArray(logs)) logs = [];

    renderLogTable(logs);
  } catch (err) {
    console.error('Failed to load logs:', err);
  }
}

function renderLogTable(logs) {
  const tbody = document.getElementById('logtb');
  if (!tbody) return;
  tbody.innerHTML = '';

  logs.forEach(log => {
    const pillCls = LOG_PILLS[log.action] || 'pp';
    const row = document.createElement('tr');
    row.setAttribute('data-visibility', 'all');
    row.setAttribute('data-type', 'players');

    const ts = log.timestamp ? new Date(log.timestamp).toLocaleString() : formatTimestamp();

    row.innerHTML = `
      <td><span class="mono-sm dim-txt">${ts}</span></td>
      <td><span style="font-size:11px">${log.user_id || 'System'}</span></td>
      <td><span class="pill ${pillCls} log-pill">${log.action}</span></td>
      <td><span class="dim-txt" style="font-size:11px">${log.description || ''}</span></td>
      <td><span class="mono-sm dim-txt">127.0.0.1</span></td>
    `;
    tbody.appendChild(row);
  });
}
