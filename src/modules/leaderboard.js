/**
 * LAMPARA Admin Portal - Leaderboard Module
 * Unified Ranking: Quest Progress (DESC) → Fail Count / Suspicion (ASC) → Last Active (DESC)
 */

async function updateLeaderboard() {
  try {
    if (!API_CONFIG || !API_CONFIG.baseUrl) {
      console.error('[Leaderboard] API_CONFIG not initialized');
      if (typeof showT === 'function') showT('API configuration not loaded', 'error');
      return;
    }

    const token = localStorage.getItem('authToken') || localStorage.getItem('token');
    if (!token) {
      return;
    }

    const response = await fetch(`${API_CONFIG.baseUrl}/leaderboard/rankings?limit=100`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      }
    });

    if (!response.ok) {
      throw new Error(`Leaderboard fetch failed: ${response.status}`);
    }

    const data = await response.json();

    if (data.success && data.rankings) {
      displayLeaderboard(data.rankings);
      updateLeaderboardStats(data);
    } else {
      if (typeof showT === 'function') showT('Failed to load leaderboard', 'error');
    }
  } catch (err) {
    console.error('[Leaderboard] Error:', err);
    if (typeof showT === 'function') showT('Error loading leaderboard: ' + err.message, 'error');
  }
}

function displayLeaderboard(rankings) {
  const tbody = document.getElementById('lb-tbody');
  if (!tbody) {
    console.error('[Leaderboard] Table body not found');
    return;
  }

  tbody.innerHTML = '';

  if (!rankings || rankings.length === 0) {
    tbody.innerHTML = '<tr><td colspan="7" style="text-align:center;color:#6b5740;padding:20px;">No players ranked yet</td></tr>';
    return;
  }

  rankings.forEach((entry) => {
    if (!entry) return;

    const tr = document.createElement('tr');

    // ---- RANK ----
    const rankCell = document.createElement('td');
    rankCell.className = 'lb-rank';
    rankCell.textContent = entry.rank;
    if (entry.rank === 1) rankCell.classList.add('lb-rank-1');
    else if (entry.rank === 2) rankCell.classList.add('lb-rank-2');
    else if (entry.rank === 3) rankCell.classList.add('lb-rank-3');
    tr.appendChild(rankCell);

    // ---- NAME ----
    const nameCell = document.createElement('td');
    nameCell.className = 'lb-player-name';
    nameCell.textContent = entry.playerName || 'N/A';
    tr.appendChild(nameCell);

    // ---- PROGRESS ----
    const progressCell = document.createElement('td');
    // entry.chapter is the main-quest number; show the book chapters the player is on.
    const bs = entry.bookChapterStart;
    const be = entry.bookChapterEnd;
    const chapterLabel = bs == null ? 'not started' : ((be == null || be === bs) ? `Ch. ${bs}` : `Ch. ${bs}–${be}`);
    progressCell.textContent = Math.min(100, entry.questProgress || 0) + '% (' + chapterLabel + ')';
    tr.appendChild(progressCell);

    // ---- FAIL COUNT (game-overs, from player_quests.failure_count) ----
    const failCell = document.createElement('td');
    failCell.style.textAlign = 'center';
    const fc = entry.failCount || 0;
    failCell.textContent = fc;
    if (fc === 0) failCell.style.color = 'var(--success, #4caf50)';
    else if (fc <= 5) failCell.style.color = 'var(--warn, #ff9800)';
    else failCell.style.color = 'var(--danger, #e53e3e)';
    tr.appendChild(failCell);

    // ---- QUESTS DONE ----
    const questsCell = document.createElement('td');
    questsCell.style.textAlign = 'center';
    questsCell.textContent = entry.questsCompleted || 0;
    tr.appendChild(questsCell);

    // ---- ARTIFACTS (collected / available) ----
    const artifactsCell = document.createElement('td');
    artifactsCell.style.textAlign = 'center';
    artifactsCell.textContent = (entry.artifactsCollected || 0) + '/' + (entry.artifactsTotal || 0);
    tr.appendChild(artifactsCell);

    // ---- STATUS ----
    const statusCell = document.createElement('td');
    const badge = document.createElement('span');
    badge.className = entry.isActive ? 'lb-status-badge lb-status-active' : 'lb-status-badge lb-status-inactive';
    badge.textContent = entry.isActive ? 'ACTIVE' : 'INACTIVE';
    statusCell.appendChild(badge);
    tr.appendChild(statusCell);

    tbody.appendChild(tr);
  });

  console.log('[Leaderboard] Displayed ' + rankings.length + ' entries');
}

function updateLeaderboardStats(data) {
  const totalEl = document.getElementById('lb-stat-total');
  if (totalEl) totalEl.textContent = data.totalPlayers || 0;

  const avgEl = document.getElementById('lb-stat-avg');
  if (avgEl && data.rankings && data.rankings.length > 0) {
    const avg = Math.round(
      data.rankings.reduce((sum, r) => sum + Math.min(100, r.questProgress || 0), 0) / data.rankings.length
    );
    avgEl.textContent = avg + '%';
  }

  const topEl = document.getElementById('lb-stat-top');
  if (topEl && data.rankings && data.rankings.length > 0) {
    const p = data.rankings[0];
    topEl.textContent = p.playerName || '—';
  }
}

document.addEventListener('DOMContentLoaded', () => {
  let attempts = 0;
  const waitForConfig = setInterval(() => {
    if (typeof API_CONFIG !== 'undefined' && API_CONFIG.baseUrl) {
      clearInterval(waitForConfig);
      const token = localStorage.getItem('authToken') || localStorage.getItem('token');
      const panel = document.getElementById('panel-lb') || document.getElementById('panel-gs');
      if (panel && token) updateLeaderboard();
    } else if (++attempts > 50) {
      clearInterval(waitForConfig);
      console.warn('[Leaderboard] API_CONFIG not loaded within timeout');
    }
  }, 100);
});
