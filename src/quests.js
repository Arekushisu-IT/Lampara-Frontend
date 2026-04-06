// ============================================================
// QUESTS - Dynamic Quest Management
// ============================================================

async function fetchAndRenderQuests() {
  try {
    // 1. Fetch all quests from the database
    let quests = await apiCall('/quests');
    if (quests.quests) quests = quests.quests;
    if (!Array.isArray(quests)) quests = [];

    // 2. Filter for Chapter 1 (Currently hardcoded to Ch.1)
    const chapter1Quests = quests.filter(q => q.chapter === 1);
    
    // 3. Group by Main Quest (1 to 7)
    const mainQuests = [];
    for (let mq = 1; mq <= 7; mq++) {
      const subs = chapter1Quests.filter(q => q.main_quest === mq);
      // A Main Quest is "Active" only if all 5 sub-quests are active
      const isActive = subs.length === 5 && subs.every(sq => sq.status === 'active');
      mainQuests.push({ id: mq, subs, isActive });
    }

    // 4. Render the cards
    const container = document.getElementById('quests-grid');
    if (container) {
      container.innerHTML = ''; // Clear existing content
      
      mainQuests.forEach(mq => {
        const activeCount = mq.subs.filter(sq => sq.status === 'active').length;
        const progressPct = Math.round((activeCount / 5) * 100);
        
        // Determine display details
        const roman = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII'][mq.id - 1];
        // If inactive, show "Awaiting Storyboard", otherwise show first sub-quest title
        const title = mq.isActive && mq.subs[0] ? mq.subs[0].title : 'Awaiting Storyboard';
        const statusClass = mq.isActive ? 'pa' : 'pp';
        const statusText = mq.isActive ? 'ACTIVE' : 'STANDBY';

        // Create Card Element
        const card = document.createElement('div');
        // Add 'sb' class for Standby styling (grayed out, locked)
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
        
        // Click event - open sub-quest modal
        card.onclick = () => {
          if (mq.isActive) {
            openSubQuestModal(mq);
          }
        };
        container.appendChild(card);
      });
    }
    
    // Update Header Stats
    const statLbl = document.getElementById('stat-qt-chap');
    if (statLbl) {
      const activeCount = quests.filter(q => q.status === 'active').length;
      statLbl.textContent = `${activeCount} ACTIVE · ${quests.length - activeCount} STANDBY`;
    }

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
