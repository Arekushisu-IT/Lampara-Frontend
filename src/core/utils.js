// ============================================================
// UTILS - Helper Functions
// ============================================================

/**
 * XSS Prevention: Escapes HTML special characters in user-provided strings.
 */
function esc(str) {
  if (!str) return '';
  const div = document.createElement('div');
  div.textContent = String(str);
  return div.innerHTML;
}

/**
 * Replaces a table body with a single full-width message row (loading, empty, or error).
 * `retry` is the name of a global function; when given, a RETRY button calls it.
 * The colspan is taken from the table header so it always spans every column.
 */
function setTableMessage(tbody, message, { retry, error = false } = {}) {
  if (typeof tbody === 'string') tbody = document.getElementById(tbody);
  if (!tbody) return;
  const cols = tbody.closest('table')?.querySelectorAll('thead th').length || 1;
  const color = error ? 'var(--danger, #e06060)' : 'var(--td)';
  const button = retry ? ` <button class="ab abv" style="margin-left:8px" onclick="${retry}()">RETRY</button>` : '';
  tbody.innerHTML = `<tr class="table-msg"><td colspan="${cols}" style="text-align:center;color:${color};padding:20px;">${esc(message)}${button}</td></tr>`;
}

/** Shows a loading row only when the table has no real rows yet, so refreshes don't flash. */
function setTableLoading(tbody, message = 'Loading...') {
  if (typeof tbody === 'string') tbody = document.getElementById(tbody);
  if (!tbody || tbody.querySelector('tr:not(.table-msg)')) return;
  setTableMessage(tbody, message);
}

/**
 * Verification link state for a pending (unverified) sign-up.
 * Expired sign-ups no longer hold their email/username and are replaced on the next
 * registration that uses either (see backend src/utils/accountEmail.js).
 */
function signupLinkText(expiresAt) {
  if (!expiresAt) return { text: 'No link', expired: true };
  const ms = new Date(expiresAt).getTime() - Date.now();
  if (ms <= 0) return { text: 'Link expired', expired: true };
  const hours = Math.floor(ms / 3600000);
  const mins = Math.max(1, Math.floor((ms % 3600000) / 60000));
  return { text: hours > 0 ? `Link expires in ${hours}h ${mins}m` : `Link expires in ${mins}m`, expired: false };
}

/**
 * Format date to YYYY-MM-DD HH:mm:ss
 */
function formatTimestamp(date) {
  const now = date || new Date();
  const pad = n => String(n).padStart(2, '0');
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())} ${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;
}
