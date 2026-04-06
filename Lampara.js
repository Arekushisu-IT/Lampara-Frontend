// ============================================================
// LAMPARA - Entry Point
// Initializes modules and handles boot sequence
// ============================================================

function loadInitialData() {
  fetchAndRenderPlayers();
  fetchAndRenderQuests();
  fetchAndRenderLogs();
  fetchAndRenderPendingApprovals();
  fetchAndRenderRecentlyProcessed();
}

document.addEventListener('DOMContentLoaded', async function () {
  // Initialize filters
  initFilters();

  // Attempt to restore session
  const restored = await restoreSession();
  if (restored) return;

  // Setup default dashboard view
  const dashNav = document.getElementById('ni-db');
  if (dashNav) {
    document.querySelectorAll('.panel').forEach(p => p.classList.remove('active'));
    document.querySelectorAll('.ni').forEach(n => n.classList.remove('active'));
    document.getElementById('panel-db').classList.add('active');
    dashNav.classList.add('active');
    document.getElementById('tbtit').textContent = PANEL_TITLES.db;
  }

  // Focus email input on load
  const emailInput = document.getElementById('lemail');
  if (emailInput) emailInput.focus();

  // Notification bell click handler
  const notifBell = document.getElementById('notif-bell');
  if (notifBell) {
    notifBell.addEventListener('click', () => {
      const vrNavBtn = document.getElementById('ni-vr');
      if (vrNavBtn) sp('vr', vrNavBtn);
    });
  }

  // Keyboard shortcut for login
  const lpassEl = document.getElementById('lpass');
  if (lpassEl) {
    lpassEl.addEventListener('keydown', e => {
      if (e.key === 'Enter') doLogin();
    });
  }

  // Auto-refresh every 15 seconds
  setInterval(() => {
    if (authToken) {
      fetchAndRenderPlayers();
      fetchAndRenderPendingApprovals();
      fetchAndRenderRecentlyProcessed();
    }
  }, 15000);
});
