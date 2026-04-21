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
  fetchAndRenderGameConfig();
}

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
  fetchAndRenderGameConfig();
}

// ============================================================
// MOBILE RESPONSIVE MENU
// ============================================================
let mobileMenuOpen = false;

function toggleMobileMenu() {
  mobileMenuOpen = !mobileMenuOpen;
  const sb = document.querySelector('.sb');
  const overlay = document.getElementById('mobile-overlay');
  const app = document.getElementById('app');
  const iconPath = document.getElementById('menu-icon-path');
  
  if (mobileMenuOpen) {
    sb?.classList.add('open');
    overlay?.classList.add('active');
    app?.classList.add('sidebar-open');
    // Change icon to X
    if (iconPath) {
      iconPath.setAttribute('d', 'M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z');
    }
  } else {
    sb?.classList.remove('open');
    overlay?.classList.remove('active');
    app?.classList.remove('sidebar-open');
    // Change icon to hamburger
    if (iconPath) {
      iconPath.setAttribute('d', 'M3 5a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zM3 10a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zM3 15a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z');
    }
  }
}

function closeMobileMenu() {
  if (mobileMenuOpen) {
    mobileMenuOpen = false;
    const sb = document.querySelector('.sb');
    const overlay = document.getElementById('mobile-overlay');
    const app = document.getElementById('app');
    const iconPath = document.getElementById('menu-icon-path');
    
    sb?.classList.remove('open');
    overlay?.classList.remove('active');
    app?.classList.remove('sidebar-open');
    if (iconPath) {
      iconPath.setAttribute('d', 'M3 5a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zM3 10a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zM3 15a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z');
    }
  }
}

// Close mobile menu when clicking on navigation items
document.addEventListener('click', function(e) {
  if (mobileMenuOpen && e.target.closest('.ni')) {
    setTimeout(closeMobileMenu, 100);
  }
});

// Close mobile menu on window resize to desktop
window.addEventListener('resize', function() {
  if (window.innerWidth > 768 && mobileMenuOpen) {
    mobileMenuOpen = false;
    const sb = document.querySelector('.sb');
    const overlay = document.getElementById('mobile-overlay');
    const app = document.getElementById('app');
    const iconPath = document.getElementById('menu-icon-path');
    
    sb?.classList.remove('open');
    overlay?.classList.remove('active');
    app?.classList.remove('sidebar-open');
    if (iconPath) {
      iconPath.setAttribute('d', 'M3 5a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zM3 10a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zM3 15a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z');
    }
  }
});

// Add toggle button inside search bar for mobile
function updateMobileSearchToggle() {
  const searchBox = document.querySelector('.tbsrch');
  if (!searchBox) return;
  
  const isMobile = window.innerWidth <= 640;
  if (isMobile) {
    // Add a small toggle button if it doesn't exist
    if (!document.getElementById('search-toggle')) {
      const toggleBtn = document.createElement('button');
      toggleBtn.id = 'search-toggle';
      toggleBtn.type = 'button';
      toggleBtn.style.cssText = `
        background: none;
        border: none;
        color: var(--td);
        cursor: pointer;
        padding: 4px 8px;
        display: flex;
        align-items: center;
      `;
      toggleBtn.innerHTML = `
        <svg width="14" height="14" viewBox="0 0 20 20" fill="currentColor">
          <path fill-rule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clip-rule="evenodd" />
        </svg>
      `;
      toggleBtn.addEventListener('click', function() {
        searchBox?.classList.toggle('mobile-show');
      });
      // Prepend to topbar
      const topbar = document.querySelector('.topbar');
      if (topbar) {
        topbar.insertBefore(toggleBtn, topbar.lastElementChild);
      }
    }
    if (searchBox.classList.contains('mobile-show')) {
      searchBox.classList.add('mobile-show');
    }
  }
}

document.addEventListener('DOMContentLoaded', async function () {
  // Initialize mobile responsive features
  updateMobileSearchToggle();
  window.addEventListener('resize', updateMobileSearchToggle);

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
