// ============================================================
// QUESTS - Dynamic Quest Management
// ============================================================

let currentChapter = 1;
let allQuests = [];

// Initialize chapter tab listeners
function initChapterTabs() {
  const tabs = document.querySelectorAll('.chapter-tab');
  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      const chapter = parseInt(tab.dataset.chapter);
      switchChapter(chapter);
    });
  });
}

// Switch to a different chapter
function switchChapter(chapterNum) {
  currentChapter = chapterNum;
  
  // Update tab active states
  const tabs = document.querySelectorAll('.chapter-tab');
  tabs.forEach(tab => {
    const tabChapter = parseInt(tab.dataset.chapter);
    if (tabChapter === chapterNum) {
      tab.classList.add('active');
      tab.classList.remove('standby');
    } else {
      tab.classList.remove('active');
      // Mark chapters 3-5 as standby
      if (tabChapter > 2) {
        tab.classList.add('standby');
      }
    }
  });

  // Render quests for the selected chapter
  renderChapterQuests(chapterNum);
}

// Render quests for a specific chapter
function renderChapterQuests(chapterNum) {
  const container = document.getElementById('quests-grid');
  if (!container) return;

  container.innerHTML = '';

  // Chapter 1 & 2: Show quests from database if available
  if (chapterNum === 1 || chapterNum === 2) {
    renderChapterQuestsFromDB(container, chapterNum);
  } else {
    // Chapters 3-5: Show "Awaiting Storyboard" for all 7 main quests
    renderStandbyChapter(container, chapterNum);
  }
}

// Render chapter quests from database
function renderChapterQuestsFromDB(container, chapterNum) {
  // Filter for the selected chapter
  const chapterQuests = allQuests.filter(q => q.chapter === chapterNum);

  // Group by Main Quest (1 to 7)
  const mainQuests = [];
  for (let mq = 1; mq <= 7; mq++) {
    const subs = chapterQuests.filter(q => q.main_quest === mq);
    const isActive = subs.length === 5 && subs.every(sq => sq.status === 'active');
    mainQuests.push({ id: mq, subs, isActive });
  }

  // Render the cards
  mainQuests.forEach(mq => {
    const activeCount = mq.subs.filter(sq => sq.status === 'active').length;
    const progressPct = Math.round((activeCount / 5) * 100);

    const roman = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII'][mq.id - 1];
    const title = mq.isActive && mq.subs[0] ? mq.subs[0].title : 'Awaiting Storyboard';
    const statusClass = mq.isActive ? 'pa' : 'pp';
    const statusText = mq.isActive ? 'ACTIVE' : 'STANDBY';

    const card = document.createElement('div');
    card.className = `cc ${!mq.isActive ? 'sb' : ''}`;

    card.innerHTML = `
      <div class="cdec">${roman}</div>
      <div class="cnum">MAIN QUEST ${mq.id}</div>
      <div class="ctit">${esc(title)}</div>
      <div class="csub">${activeCount}/5 Sub-Quests</div>
      <div class="cmeta">
        <div class="cmi">Progress<span class="cmv">${progressPct}%</span></div>
      </div>
      <span class="pill ${statusClass}">${statusText}</span>

      ${!mq.isActive ? `
        <div class="sbov">
          <div class="sbtx">STANDBY</div>
        </div>
        <svg class="lkico" width="12" height="12" viewBox="0 0 20 20" fill="currentColor">
          <path fill-rule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clip-rule="evenodd"/>
        </svg>
      ` : ''}
    `;

    card.onclick = () => {
      if (mq.isActive) {
        openSubQuestModal(mq);
      }
    };
    container.appendChild(card);
  });

  // Update header stats
  updateChapterStats(chapterQuests);
}

// Render standby chapters (3-5)
function renderStandbyChapter(container, chapterNum) {
  const roman = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII'];
  
  for (let mq = 1; mq <= 7; mq++) {
    const card = document.createElement('div');
    card.className = 'cc sb';

    card.innerHTML = `
      <div class="cdec">${roman[mq - 1]}</div>
      <div class="cnum">MAIN QUEST ${mq}</div>
      <div class="ctit">Awaiting Storyboard</div>
      <div class="csub">0/5 Sub-Quests</div>
      <div class="cmeta">
        <div class="cmi">Progress<span class="cmv">0%</span></div>
      </div>
      <span class="pill pp">STANDBY</span>
      
      <div class="sbov">
        <div class="sbtx">STANDBY</div>
      </div>
      <svg class="lkico" width="12" height="12" viewBox="0 0 20 20" fill="currentColor">
        <path fill-rule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clip-rule="evenodd"/>
      </svg>
    `;

    container.appendChild(card);
  }

  // Update header stats for standby chapters
  updateChapterStats([]);
}

// Update chapter statistics
function updateChapterStats(quests) {
  const statLbl = document.getElementById('stat-qt-chap');
  if (statLbl) {
    const activeCount = quests.filter(q => q.status === 'active').length;
    statLbl.textContent = `${activeCount} ACTIVE · ${quests.length - activeCount} STANDBY`;
  }
}

// Main function to fetch and render quests
async function fetchAndRenderQuests() {
  try {
    // Fetch all quests from the database
    let quests = await apiCall('/quests');
    if (quests.quests) quests = quests.quests;
    if (!Array.isArray(quests)) quests = [];
    
    allQuests = quests;

    // Initialize chapter tabs
    initChapterTabs();

    // Render current chapter (default: Chapter 1)
    renderChapterQuests(currentChapter);

  } catch (err) {
    console.error('Failed to load quests:', err);
  }
}

// Sub-Quest Modal
async function openSubQuestModal(mainQuest) {
  try {
    // Update modal title
    const roman = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII'][mainQuest.id - 1];
    const modalTitle = document.getElementById('sq-mtit');
    if (modalTitle) {
      modalTitle.textContent = `MAIN QUEST ${mainQuest.id} — ${roman}`;
    }

    // Update info section
    const infoSection = document.getElementById('sq-info');
    if (infoSection) {
      const firstSubTitle = mainQuest.subs[0]?.title || 'Awaiting Storyboard';
      const activeCount = mainQuest.subs.filter(sq => sq.status === 'active').length;
      infoSection.innerHTML = `
        <div class="sq-title">${esc(firstSubTitle)}</div>
        <div class="sq-subtitle">${activeCount}/5 Sub-Quests Active</div>
      `;
    }

    // Render sub-quest cards
    const grid = document.getElementById('sq-grid');
    if (grid) {
      grid.innerHTML = '';
      
      if (mainQuest.subs.length === 0) {
        grid.innerHTML = '<div style="grid-column: 1/-1; text-align: center; color: var(--td); font-size: 11px; padding: 20px;">No sub-quests available yet.</div>';
      } else {
        mainQuest.subs.forEach((sub, index) => {
          const card = document.createElement('div');
          
          // Determine status
          let statusClass = 'sq-inactive';
          let statusText = 'INACTIVE';
          let cardExtraClass = 'sq-locked';
          
          if (sub.status === 'active') {
            statusClass = 'sq-active';
            statusText = 'ACTIVE';
            cardExtraClass = '';
          } else if (sub.status === 'completed') {
            statusClass = 'sq-active';
            statusText = 'COMPLETED';
            cardExtraClass = 'sq-completed';
          }

          card.className = `sq-card ${cardExtraClass}`;
          card.innerHTML = `
            <div class="sq-num">SUB-QUEST ${index + 1}</div>
            <div class="sq-card-title">${esc(sub.title || 'Awaiting Storyboard')}</div>
            <div class="sq-card-desc">${esc(sub.description || 'No description available.')}</div>
            <span class="sq-status ${statusClass}">${statusText}</span>
          `;

          // Click handler for sub-quest
          card.onclick = () => {
            if (sub.status === 'active') {
              showT(`Opening Sub-Quest ${index + 1}: ${sub.title}`, 'info');
              // TODO: Open detailed sub-quest view
            }
          };

          grid.appendChild(card);
        });
      }
    }

    // Open the modal
    const modal = document.getElementById('mov-subquest');
    if (modal) {
      modal.classList.add('open');
    }

  } catch (err) {
    console.error('Failed to open sub-quest modal:', err);
    showT('Error loading sub-quests', 'error');
  }
}
