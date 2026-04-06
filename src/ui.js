// ============================================================
// UI - Interface Logic (Toasts, Modals, Navigation, Filters)
// ============================================================

/* MODALS */
function closeM(id) {
  document.getElementById(id).classList.remove('open');
}

document.querySelectorAll('.mov').forEach(overlay => {
  overlay.addEventListener('click', function (e) {
    if (e.target === this) this.classList.remove('open');
  });
});

/* TOAST NOTIFICATIONS */
function showT(message, type = 'info') {
  const container = document.getElementById('tc');
  if (!container) return;

  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.innerHTML = `<span>${TOAST_ICONS[type] || '◈'}</span><span>${message}</span>`;
  container.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(-30px)';
    setTimeout(() => toast.remove(), 400);
  }, 3500);
}

/* NAVIGATION */
function sp(id, el) {
  if (el.classList.contains('locked')) {
    showT('Access restricted for your role', 'error');
    return;
  }

  document.querySelectorAll('.panel').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.ni').forEach(n => n.classList.remove('active'));

  document.getElementById('panel-' + id).classList.add('active');
  el.classList.add('active');

  document.getElementById('tbtit').textContent = PANEL_TITLES[id] || id.toUpperCase();
}

/* FILTER BUTTONS */
function initFilters() {
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
}
