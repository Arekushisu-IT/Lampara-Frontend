// ============================================================
// GAME CONFIG - Suspicion Meter Settings Management
// ============================================================

let gameConfigData = {};

const CONFIG_META = {
  suspicion_start:          { label: 'Starting Suspicion',       unit: '%',  icon: '🎯', desc: 'Initial suspicion level when a dialogue encounter begins' },
  suspicion_wrong_penalty:  { label: 'Wrong Answer Penalty',     unit: 'pts', icon: '⚠️', desc: 'Points added to suspicion for each incorrect dialogue choice' },
  suspicion_streak_bonus:   { label: 'Streak Bonus Reward',      unit: 'pts', icon: '🏆', desc: 'Points removed from suspicion when streak threshold is reached' },
  suspicion_streak_threshold:{ label: 'Streak Threshold',        unit: '×',  icon: '🔥', desc: 'Consecutive correct answers needed to earn the streak bonus' },
  suspicion_max:            { label: 'Maximum Suspicion',        unit: '%',  icon: '💀', desc: 'Suspicion level that triggers game over' },
  max_conversations:        { label: 'Conversations Per Round',  unit: '×',  icon: '💬', desc: 'Number of dialogue rounds per encounter' }
};

const CONFIG_DEFAULTS = {
  suspicion_start: '50',
  suspicion_wrong_penalty: '10',
  suspicion_streak_bonus: '10',
  suspicion_streak_threshold: '3',
  suspicion_max: '100',
  max_conversations: '10'
};

// Small gold arrows beside each value (the browser's own spinner is hidden in CSS).
const GS_ARROW_UP = '<svg viewBox="0 0 10 7" aria-hidden="true"><polygon points="5,0 10,7 0,7" /></svg>';
const GS_ARROW_DOWN = '<svg viewBox="0 0 10 7" aria-hidden="true"><polygon points="0,0 10,0 5,7" /></svg>';

async function fetchAndRenderGameConfig() {
  try {
    const data = await apiCall('/game-config');
    gameConfigData = data.configMap || {};
    renderGameConfigCards();
  } catch (err) {
    console.error('Failed to load game config:', err);
  }
}

function renderGameConfigCards() {
  const grid = document.getElementById('gs-grid');
  if (!grid) return;
  grid.innerHTML = '';

  for (const [key, meta] of Object.entries(CONFIG_META)) {
    const value = gameConfigData[key] || CONFIG_DEFAULTS[key] || '0';

    const card = document.createElement('div');
    card.className = 'gs-card';
    card.innerHTML = `
      <div class="gs-card-header">
        <span class="gs-card-icon">${meta.icon}</span>
        <span class="gs-card-label">${meta.label}</span>
      </div>
      <div class="gs-card-value">
        <div class="gs-num">
          <input type="number" class="gs-input" id="gs-val-${key}" value="${esc(value)}" min="0" max="999" step="1" data-key="${key}" aria-label="${meta.label}">
          <div class="gs-stepper">
            <button type="button" class="gs-step" data-key="${key}" data-step="1" aria-label="Increase ${meta.label}">${GS_ARROW_UP}</button>
            <button type="button" class="gs-step" data-key="${key}" data-step="-1" aria-label="Decrease ${meta.label}">${GS_ARROW_DOWN}</button>
          </div>
        </div>
        <span class="gs-unit">${meta.unit}</span>
      </div>
      <div class="gs-card-desc">${meta.desc}</div>
    `;
    grid.appendChild(card);
  }
}

async function saveGameConfig() {
  const configs = {};
  let hasChanges = false;

  for (const key of Object.keys(CONFIG_META)) {
    const input = document.getElementById(`gs-val-${key}`);
    if (input) {
      const newVal = input.value.trim();
      if (newVal !== gameConfigData[key]) {
        hasChanges = true;
      }
      configs[key] = newVal;
    }
  }

  if (!hasChanges) {
    showT('No changes to save', 'info');
    return;
  }

  try {
    const btn = document.getElementById('gs-save-btn');
    if (btn) btn.disabled = true;

    await apiCall('/game-config', {
      method: 'PUT',
      body: JSON.stringify({ configs })
    });

    showT('Game configuration saved successfully', 'success');
    gameConfigData = { ...gameConfigData, ...configs };

    if (btn) btn.disabled = false;
  } catch (err) {
    console.error('Failed to save game config:', err);
    showT('Failed to save configuration', 'error');
    const btn = document.getElementById('gs-save-btn');
    if (btn) btn.disabled = false;
  }
}

function resetGameConfig() {
  if (!confirm('Reset all suspicion meter settings to default values?')) return;

  for (const [key, defaultVal] of Object.entries(CONFIG_DEFAULTS)) {
    const input = document.getElementById(`gs-val-${key}`);
    if (input) input.value = defaultVal;
  }

  showT('Values reset to defaults — click SAVE to apply', 'info');
}

// ------------------------------------------------------------------
// Stepper arrows: +1 / -1 within the input's min and max
// ------------------------------------------------------------------
document.addEventListener('click', e => {
  const btn = e.target.closest('.gs-step');
  if (!btn) return;
  const input = document.getElementById(`gs-val-${btn.dataset.key}`);
  if (!input) return;
  const min = Number(input.min || 0);
  const max = Number(input.max || 999);
  const current = Number(input.value);
  const next = Math.min(max, Math.max(min, (Number.isFinite(current) ? Math.round(current) : min) + Number(btn.dataset.step)));
  input.value = String(next);
  input.dispatchEvent(new Event('input', { bubbles: true }));
});

// ------------------------------------------------------------------
// GAME SETTINGS DRAWER (Game Management page)
// The suspicion meter configuration slides in from the right over the quest hierarchy.
// ------------------------------------------------------------------
function isGameSettingsOpen() {
  const panel = document.getElementById('panel-qt');
  return !!panel && panel.classList.contains('gs-open');
}

// Starts the drawer just below the topbar, whatever the topbar's height on this screen.
function placeGameSettingsDrawer() {
  const drawer = document.getElementById('gs-drawer');
  const area = document.querySelector('.content');
  if (!drawer || !area) return;
  drawer.style.setProperty('--gs-top', `${Math.round(area.getBoundingClientRect().top)}px`);
}

function openGameSettings() {
  const panel = document.getElementById('panel-qt');
  const drawer = document.getElementById('gs-drawer');
  const btn = document.getElementById('gs-open-btn');
  if (!panel || !drawer) return;
  if (typeof qhBoxOpen === 'function' && qhBoxOpen() && typeof closeQuestDetails === 'function') closeQuestDetails();
  placeGameSettingsDrawer();
  panel.classList.add('gs-open');
  drawer.setAttribute('aria-hidden', 'false');
  if (btn) btn.setAttribute('aria-expanded', 'true');
  setTimeout(() => {
    const first = drawer.querySelector('.gs-input') || drawer.querySelector('button');
    if (first) first.focus({ preventScroll: true });
  }, 80);
}

function closeGameSettings(returnFocus = true) {
  const panel = document.getElementById('panel-qt');
  const drawer = document.getElementById('gs-drawer');
  const btn = document.getElementById('gs-open-btn');
  if (!panel || !isGameSettingsOpen()) return;
  panel.classList.remove('gs-open');
  if (drawer) drawer.setAttribute('aria-hidden', 'true');
  if (btn) {
    btn.setAttribute('aria-expanded', 'false');
    if (returnFocus) btn.focus({ preventScroll: true });
  }
}

const gsOpenBtn = document.getElementById('gs-open-btn');
if (gsOpenBtn) gsOpenBtn.addEventListener('click', openGameSettings);

// Esc closes the drawer; Tab stays inside it while it is open.
document.addEventListener('keydown', e => {
  if (!isGameSettingsOpen() || document.querySelector('.mov.open')) return;
  if (e.key === 'Escape') {
    e.preventDefault();
    closeGameSettings();
    return;
  }
  if (e.key === 'Tab') {
    const drawer = document.getElementById('gs-drawer');
    const focusables = drawer ? [...drawer.querySelectorAll('button:not([disabled]), input')] : [];
    if (focusables.length === 0) return;
    const first = focusables[0];
    const last = focusables[focusables.length - 1];
    if (!drawer.contains(document.activeElement)) { e.preventDefault(); first.focus(); }
    else if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  }
});

window.addEventListener('resize', () => { if (isGameSettingsOpen()) placeGameSettingsDrawer(); });
