// ============================================================
// ADMIN NOTIFICATIONS - the topbar bell and its box
// Two sections, both built from the player list the panel already loads:
//   - Needs action: sign-ups still waiting for email verification
//   - New players: accounts created in the last 7 days
// There is a single admin account, so "read" state is kept in this browser's
// localStorage instead of the database.
// ============================================================

const NOTIF_SEEN_KEY = 'lampara_admin_notif_seen';
const NEW_PLAYER_DAYS = 7;

let adminNotifPlayers = [];
let adminNotifItems = { pending: [], recent: [] };
let adminNotifSignature = '';

function loadNotifSeen() {
  try {
    return new Set(JSON.parse(localStorage.getItem(NOTIF_SEEN_KEY) || '[]'));
  } catch (err) {
    return new Set();
  }
}

function saveNotifSeen(seen) {
  try {
    // Keep the list bounded; old ids fall out of the 7-day window anyway.
    localStorage.setItem(NOTIF_SEEN_KEY, JSON.stringify([...seen].slice(-300)));
  } catch (err) { /* private mode or storage blocked: dots simply reappear */ }
}

function notifKey(kind, player) {
  return `${kind}:${player.id}`;
}

function notifTimeAgo(date) {
  if (!date) return '';
  const minutes = Math.max(0, Math.round((Date.now() - new Date(date).getTime()) / 60000));
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.round(hours / 24)}d ago`;
}

function isNotifBoxOpen() {
  const box = document.getElementById('notif-box');
  return !!box && box.classList.contains('open');
}

// Called by fetchAndRenderPlayers() on every load and 15-second refresh.
function updateAdminNotifications(players) {
  adminNotifPlayers = Array.isArray(players) ? players : [];
  const cutoff = Date.now() - NEW_PLAYER_DAYS * 24 * 60 * 60 * 1000;
  const newestFirst = (a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0);

  const pending = adminNotifPlayers.filter(p => p.status === 'inactive' || p.status === 'pending').sort(newestFirst);
  const recent = adminNotifPlayers
    .filter(p => p.status !== 'inactive' && p.status !== 'pending')
    .filter(p => p.created_at && new Date(p.created_at).getTime() >= cutoff)
    .sort(newestFirst);
  adminNotifItems = { pending, recent };

  renderAdminNotifBadge();

  // Re-render an open box only when its contents changed, so a background refresh
  // doesn't move keyboard focus.
  const signature = JSON.stringify([pending.map(p => [p.id, p.token_expires_at]), recent.map(p => [p.id, p.status])]);
  if (isNotifBoxOpen() && signature !== adminNotifSignature) renderAdminNotifications();
  adminNotifSignature = signature;
}

function unreadNotifCount() {
  const seen = loadNotifSeen();
  return adminNotifItems.pending.filter(p => !seen.has(notifKey('pending', p))).length
    + adminNotifItems.recent.filter(p => !seen.has(notifKey('new', p))).length;
}

function renderAdminNotifBadge() {
  const badge = document.getElementById('notif-badge');
  const bell = document.getElementById('notif-bell');
  const count = unreadNotifCount();
  if (badge) {
    badge.textContent = count > 99 ? '99+' : String(count);
    badge.style.display = count > 0 ? 'flex' : 'none';
  }
  if (bell) bell.setAttribute('aria-label', count > 0 ? `Notifications, ${count} unread` : 'Notifications');
}

function notifItemHTML(kind, p, seen) {
  const unread = !seen.has(notifKey(kind, p));
  const username = p.username ? ` · @${esc(p.username)}` : '';
  let detail;
  if (kind === 'pending') {
    const link = signupLinkText(p.token_expires_at);
    detail = `Waiting for email verification · ${link.text}`;
  } else {
    detail = p.status === 'banned' || p.status === 'suspended' ? 'Joined, now suspended' : 'Verified and active';
  }
  return `
    <button type="button" class="nf-item${unread ? ' unread' : ''}${kind === 'pending' ? ' nf-pending' : ''}"
      onclick="openAdminNotification('${kind}', ${Number(p.id)})">
      <span class="nf-dot" aria-hidden="true"></span>
      <span class="nf-body">
        <span class="nf-name">${esc(p.name || 'Unnamed player')}<span class="nf-user">${username}</span></span>
        <span class="nf-detail">${esc(detail)}</span>
      </span>
      <span class="nf-time">${esc(notifTimeAgo(p.created_at))}</span>
      ${unread ? '<span class="sr-only">Unread</span>' : ''}
    </button>`;
}

function renderAdminNotifications() {
  const box = document.getElementById('notif-box');
  if (!box) return;
  const seen = loadNotifSeen();
  const { pending, recent } = adminNotifItems;

  box.innerHTML = `
    <div class="nf-head">
      <span class="nf-title">NOTIFICATIONS</span>
      <button type="button" class="nf-link" onclick="markAllAdminNotificationsRead()">Mark all as read</button>
    </div>
    <section class="nf-sec" aria-label="Needs action">
      <div class="nf-sh"><span>NEEDS ACTION</span><span>${pending.length}</span></div>
      ${pending.length
        ? pending.map(p => notifItemHTML('pending', p, seen)).join('')
        : '<div class="nf-empty">No sign-ups waiting. New players verify by email.</div>'}
    </section>
    <section class="nf-sec" aria-label="New players">
      <div class="nf-sh"><span>NEW PLAYERS · LAST ${NEW_PLAYER_DAYS} DAYS</span><span>${recent.length}</span></div>
      ${recent.length
        ? recent.map(p => notifItemHTML('new', p, seen)).join('')
        : '<div class="nf-empty">No new players this week.</div>'}
    </section>
    <div class="nf-foot">
      <button type="button" class="nf-link" onclick="openNotifPanel('vr')">Verification &amp; Approval ›</button>
      <button type="button" class="nf-link" onclick="openNotifPanel('pl')">Player Management ›</button>
    </div>`;
}

function openAdminNotifications() {
  const box = document.getElementById('notif-box');
  const bell = document.getElementById('notif-bell');
  if (!box || !bell) return;
  renderAdminNotifications();
  box.setAttribute('aria-hidden', 'false');
  box.classList.add('open');
  bell.setAttribute('aria-expanded', 'true');
  const first = box.querySelector('.nf-item') || box.querySelector('button');
  if (first) setTimeout(() => first.focus({ preventScroll: true }), 50);
}

function closeAdminNotifications(returnFocus = true) {
  const box = document.getElementById('notif-box');
  const bell = document.getElementById('notif-bell');
  if (!box || !box.classList.contains('open')) return;
  box.classList.remove('open');
  box.setAttribute('aria-hidden', 'true');
  if (bell) {
    bell.setAttribute('aria-expanded', 'false');
    if (returnFocus) bell.focus({ preventScroll: true });
  }
}

function toggleAdminNotifications() {
  if (isNotifBoxOpen()) closeAdminNotifications();
  else openAdminNotifications();
}

function markAllAdminNotificationsRead() {
  const seen = loadNotifSeen();
  adminNotifItems.pending.forEach(p => seen.add(notifKey('pending', p)));
  adminNotifItems.recent.forEach(p => seen.add(notifKey('new', p)));
  saveNotifSeen(seen);
  renderAdminNotifBadge();
  renderAdminNotifications();
  const bell = document.getElementById('notif-bell');
  const box = document.getElementById('notif-box');
  const target = box && box.querySelector('.nf-item, .nf-link');
  if (target) target.focus({ preventScroll: true });
  else if (bell) bell.focus({ preventScroll: true });
}

function openNotifPanel(panelId) {
  closeAdminNotifications(false);
  const nav = document.getElementById(`ni-${panelId}`);
  if (nav && typeof sp === 'function') sp(panelId, nav);
}

function openAdminNotification(kind, playerId) {
  const player = adminNotifPlayers.find(p => Number(p.id) === Number(playerId));
  const seen = loadNotifSeen();
  if (player) {
    seen.add(notifKey(kind === 'pending' ? 'pending' : 'new', player));
    saveNotifSeen(seen);
  }
  renderAdminNotifBadge();

  if (kind === 'pending' || !player) {
    openNotifPanel('vr');
    return;
  }

  // Same profile the registry's VIEW button opens.
  closeAdminNotifications(false);
  const isBanned = player.status === 'banned' || player.status === 'suspended';
  openPM(
    player.name,
    `ID-${player.id}`,
    player.email || 'Unassigned',
    player.birthdate ? new Date(player.birthdate).toLocaleDateString() : '--',
    isBanned ? 'SUSPENDED' : 'ACTIVE',
    bookChapterText(player),
    String(player.suspicion || 0),
    questPositionText(player)
  );
}

// Close on a click outside the bell and box, and on Escape.
document.addEventListener('click', e => {
  if (!isNotifBoxOpen()) return;
  const wrap = document.getElementById('notif-wrap');
  if (wrap && !wrap.contains(e.target)) closeAdminNotifications(false);
});

document.addEventListener('keydown', e => {
  if (e.key === 'Escape' && isNotifBoxOpen()) {
    e.preventDefault();
    closeAdminNotifications();
  }
});
