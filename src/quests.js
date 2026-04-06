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
        
        // Click event (only works for Active quests due to CSS 'sb' class)
        card.onclick = () => showT(`Editing Main Quest ${mq.id} configuration...`, 'info');
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
