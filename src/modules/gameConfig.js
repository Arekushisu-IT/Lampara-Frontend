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
        <input type="number" class="gs-input" id="gs-val-${key}" value="${esc(value)}" min="0" max="999" data-key="${key}">
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
