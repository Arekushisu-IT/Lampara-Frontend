// ============================================================
// SERVER STATUS - the light in the sidebar footer
// Every 15 seconds asks the backend's GET /api/health (no login, no database) whether
// it is up and how fast it answered:
//   green  "Server online · 42 ms"      answered in under a second
//   yellow "Server slow · 1.8 s"        answered, but took a second or more
//   red    "Server unreachable · retrying"  no answer within 5 seconds, or an error
// Runs on its own timer, separate from login, so it works on every page load.
// ============================================================

const SERVER_CHECK_INTERVAL_MS = 15000;
const SERVER_SLOW_MS = 1000;
const SERVER_TIMEOUT_MS = 5000;

let serverStatusState = null;

async function checkServerStatus() {
  const box = document.getElementById('srv-status');
  const text = document.getElementById('srv-text');
  const live = document.getElementById('srv-live');
  if (!box || !text || typeof API_CONFIG === 'undefined' || document.hidden) return;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), SERVER_TIMEOUT_MS);
  const started = performance.now();
  let state;
  let label;

  try {
    const res = await fetch(`${API_CONFIG.baseUrl}/health`, { cache: 'no-store', signal: controller.signal });
    if (!res.ok) throw new Error(`health ${res.status}`);
    const ms = Math.round(performance.now() - started);
    if (ms >= SERVER_SLOW_MS) {
      state = 'slow';
      label = `Server slow · ${(ms / 1000).toFixed(1)} s`;
    } else {
      state = 'ok';
      label = `Server online · ${ms} ms`;
    }
  } catch (err) {
    state = 'down';
    label = 'Server unreachable · retrying';
  } finally {
    clearTimeout(timer);
  }

  box.dataset.state = state;
  text.textContent = label;
  box.title = label;

  // Screen readers hear only a change of state, not the new response time every tick.
  if (state !== serverStatusState) {
    if (live && serverStatusState !== null) {
      live.textContent = state === 'ok' ? 'Server online' : (state === 'slow' ? 'Server slow' : 'Server unreachable');
    }
    serverStatusState = state;
  }
}

checkServerStatus();
setInterval(checkServerStatus, SERVER_CHECK_INTERVAL_MS);
document.addEventListener('visibilitychange', () => {
  if (!document.hidden) checkServerStatus();
});
