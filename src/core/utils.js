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
 * Format date to YYYY-MM-DD HH:mm:ss
 */
function formatTimestamp(date) {
  const now = date || new Date();
  const pad = n => String(n).padStart(2, '0');
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())} ${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;
}
