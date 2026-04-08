const APP_KEY = 'janu_spele_app_v1';
const ADMIN_PIN = '9731';
const ORIENTATION_TARGET = {
  1: 'K', 2: 'Ā', 3: 'U', 4: 'R', 5: 'G', 6: 'Ņ', 7: 'N', 8: 'S', 9: 'T', 10: 'J', 11: 'I'
};
const PHRASE = 'KUR UGUNS, TUR JĀŅI.';
const GAME_LIST = [
  { id: 1, icon: '🧭', title: 'Orientēšanās' },
  { id: 2, icon: '🥏', title: 'Disku golfs' },
  { id: 3, icon: '🎲', title: 'Spēle 3' },
  { id: 4, icon: '🔥', title: 'Spēle 4' },
  { id: 5, icon: '🌙', title: 'Spēle 5' },
];
const MARKERS = [
  { n: 1, x: 22.2, y: 50.5 },
  { n: 2, x: 23.7, y: 38.9 },
  { n: 3, x: 49.4, y: 49.7 },
  { n: 4, x: 39.2, y: 46.4 },
  { n: 5, x: 61.8, y: 86.6 },
  { n: 6, x: 8.0, y: 62.2 },
  { n: 7, x: 62.2, y: 7.0 },
  { n: 8, x: 79.5, y: 48.3 },
  { n: 9, x: 9.4, y: 96.6 },
  { n: 10, x: 41.0, y: 89.4 },
  { n: 11, x: 56.3, y: 69.0 },
];
const PARS = { blue: 3, orange: 3, grey: 2 };

let state = loadState();
let timerInterval = null;

function defaultState() {
  return {
    playerName: '',
    adminUnlocked: false,
    currentGame: 1,
    unlockedGames: [1, 2, 3, 4, 5],
    orientation: {
      startedAt: null,
      completedAt: null,
      letters: {},
      checked: false,
      phraseLocks: Array.from(PHRASE).map(ch => (/[A-ZĀČĒĢĪĶĻŅŠŪŽ]/.test(ch) ? '' : ch)),
      phraseDraft: Array.from(PHRASE).map(ch => (/[A-ZĀČĒĢĪĶĻŅŠŪŽ]/.test(ch) ? '' : ch)),
      finished: false,
      finalTimeSec: null,
    },
    discGolf: {
      rounds: [],
      current: { blue: '', orange: '', grey: '' }
    }
  };
}

function loadState() {
  try {
    const raw = localStorage.getItem(APP_KEY);
    if (!raw) return defaultState();
    return { ...defaultState(), ...JSON.parse(raw) };
  } catch {
    return defaultState();
  }
}

function saveState() {
  localStorage.setItem(APP_KEY, JSON.stringify(state));
}

function relativeScoreToText(score) {
  if (score === 0) return 'E';
  return score > 0 ? `+${score}` : `${score}`;
}

function render() {
  const root = document.getElementById('screen-root');
  if (!state.playerName) {
    root.innerHTML = renderWelcome();
    bindWelcome();
    return;
  }
  root.innerHTML = renderGameScreen();
  bindCommon();
  bindGameScreen();
}

function renderWelcome() {
  return `
    <section class="stack">
      <div class="card stack">
        <div>
          <p class="eyebrow">Sveicināta!</p>
          <h2 class="hero-title">Ievadi savu vārdu</h2>
          <p class="muted">Pēc starta atvērsies pirmā spēle. Šī versija ir gatava lokālai lietošanai vienā telefonā vai testiem.</p>
        </div>
        <input id="nameInput" class="input" placeholder="Ievadi vārdu" maxlength="24" />
        <button id="startAppBtn" class="primary-btn">Starts</button>
      </div>
      <p class="footer-note">Admin poga ir augšējā labajā stūrī.</p>
    </section>
  `;
}

function renderGameTabs() {
  return `
    <div class="game-tabs">
      ${GAME_LIST.map(game => `
        <button class="game-tab ${state.currentGame === game.id ? 'active' : ''} ${!state.unlockedGames.includes(game.id) ? 'locked' : ''}" data-game-tab="${game.id}">
          <span class="game-icon">${game.icon}</span>
          <span>${game.title}</span>
        </button>
      `).join('')}
    </div>
  `;
}

function renderGameScreen() {
  const currentGame = GAME_LIST.find(g => g.id === state.currentGame);
  return `
    <section class="stack">
      <div class="card stack">
        <div>
          <p class="eyebrow">Spēlētājs</p>
          <h2 class="section-title">${escapeHtml(state.playerName)}</h2>
        </div>
        ${renderGameTabs()}
      </div>

      <div class="card stack">
        <div class="meta-row">
          <span class="status-pill">${currentGame.icon} ${currentGame.title}</span>
          ${state.currentGame === 1 ? `<span class="timer-pill">⏱️ <span id="orientationTimer">${formatOrientationTime()}</span></span>` : ''}
        </div>
        ${renderCurrentGame()}
      </div>
    </section>
  `;
}

function renderCurrentGame() {
  switch (state.currentGame) {
    case 1: return renderOrientationGame();
    case 2: return renderDiscGolfGame();
    case 3:
    case 4:
    case 5:
      return `
        <div class="placeholder-box stack">
          <h3 class="section-title">Šī spēle vēl top</h3>
          <p class="muted">Lapa ir gatava. Saturu varam pielikt nākamajā solī.</p>
        </div>
      `;
    default: return '<p>Kļūda.</p>';
  }
}

function formatOrientationTime() {
  const o = state.orientation;
  if (!o.startedAt) return '00:00';
  const end = o.finished && o.completedAt ? o.completedAt : Date.now();
  const diffSec = Math.floor((end - o.startedAt) / 1000);
  return formatSeconds(diffSec);
}

function renderOrientationGame() {
  const o = state.orientation;
  const allEntered = Object.keys(o.letters).length === 11 && Object.values(o.letters).every(Boolean);
  const showPhrase = allOrientationCorrect();

  return `
    <div class="stack">
      <div class="stack">
        <div>
          <h3 class="section-title">Orientēšanās</h3>
          <p class="muted small">Atrodi burtus pie visiem 11 punktiem. Pārbaude notiek tikai tad, kad visi lauki ir aizpildīti.</p>
        </div>
        ${!o.startedAt ? `<button id="startOrientationBtn" class="primary-btn">Sākt</button>` : ''}
      </div>

      <div class="map-wrap">
        <img src="assets/orientesanas.png" alt="Orientēšanās karte" class="map-image" />
        ${MARKERS.map(m => {
          const val = o.letters[m.n] || '';
          const status = o.checked ? ((val || '').toUpperCase() === ORIENTATION_TARGET[m.n] ? 'correct' : 'incorrect') : (val ? 'filled' : '');
          return `<button class="marker-btn ${status}" data-marker="${m.n}" style="left:${m.x}%; top:${m.y}%">${m.n}</button>`;
        }).join('')}
      </div>

      <div class="letter-grid">
        ${MARKERS.map(m => {
          const val = (o.letters[m.n] || '').toUpperCase();
          const correct = val && val === ORIENTATION_TARGET[m.n];
          const incorrect = o.checked && val && !correct;
          return `
            <div class="letter-card ${correct ? 'correct' : ''} ${incorrect ? 'incorrect' : ''}">
              <div class="letter-card-top">${m.n}</div>
              <div class="letter-card-bottom">${val || '—'}</div>
            </div>
          `;
        }).join('')}
      </div>

      ${o.startedAt ? `
        <div class="grid-2">
          <button id="checkOrientationBtn" class="secondary-btn" ${!allEntered ? 'disabled' : ''}>Pārbaudīt</button>
          <button id="resetOrientationBtn" class="danger-btn">Sākt no jauna</button>
        </div>
      ` : ''}

      ${o.checked && !showPhrase ? `<p class="muted small">Zaļie ir pareizi. Sarkanajiem izlabo burtu un pārbaudi vēlreiz.</p>` : ''}

      ${showPhrase ? renderPhrasePuzzle() : ''}
    </div>
  `;
}

function renderPhrasePuzzle() {
  const o = state.orientation;
  const solved = o.finished;
  return `
    <div class="card stack" style="padding:16px; background: rgba(255,255,255,0.04);">
      <div>
        <h3 class="section-title">Atmini teikumu</h3>
        <p class="muted small">Kad visi burti ievadīti, pareizie ie-lockojas vietā, nepareizie tiek iztīrīti.</p>
      </div>

      <div class="wordle-wrap">
        <div class="phrase-row">
          ${Array.from(PHRASE).map((char, index) => {
            if (char === ' ') return '<div class="phrase-space"></div>';
            if (/[,.!?]/.test(char)) return `<div class="phrase-punct">${char}</div>`;
            const locked = o.phraseLocks[index];
            const draft = o.phraseDraft[index] || '';
            return `<input maxlength="1" data-phrase-index="${index}" class="phrase-box ${locked ? 'locked' : ''}" value="${escapeAttr(locked || draft)}" ${locked ? 'disabled' : ''} />`;
          }).join('')}
        </div>

        <div>
          <p class="small muted">Dotie burti secībā 1-11:</p>
          <div class="letter-bank">
            ${Object.entries(ORIENTATION_TARGET).map(([n, letter]) => `<div class="bank-item"><strong>${n}</strong><br>${letter}</div>`).join('')}
          </div>
        </div>

        ${!solved ? `<button id="submitPhraseBtn" class="primary-btn">Pārbaudīt teikumu</button>` : ''}
      </div>

      ${solved ? `
        <div class="stack">
          <div class="status-pill">🎉 Gatavs! Laiks: ${formatSeconds(o.finalTimeSec || 0)}</div>
          <p class="muted">Teikums atminēts: <strong>${PHRASE}</strong></p>
        </div>
      ` : ''}
    </div>
  `;
}

function renderDiscGolfGame() {
  const rounds = state.discGolf.rounds;
  const bestRows = [...rounds].sort((a,b) => a.relative - b.relative || a.totalThrows - b.totalThrows).slice(0, 10);

  return `
    <div class="stack">
      <div>
        <h3 class="section-title">Disku golfs</h3>
        <p class="muted small">Zilais PAR 3, Oranžais PAR 3, Pelēkais PAR 2. Rezultāts pārrēķinās uzreiz.</p>
      </div>

      <div class="map-wrap">
        <img src="assets/disku-golfs.png" alt="Disku golfa trase" class="map-image" />
      </div>

      <div class="stack">
        <div class="score-row">
          <input id="scoreBlue" class="score-input" type="number" min="1" placeholder="Zilais grozs (PAR 3)" value="${state.discGolf.current.blue}" />
          <div class="score-tag ${scoreClass(scoreDiff('blue'))}">Z ${relativeScoreToText(scoreDiff('blue'))}</div>
        </div>
        <div class="score-row">
          <input id="scoreOrange" class="score-input" type="number" min="1" placeholder="Oranžais grozs (PAR 3)" value="${state.discGolf.current.orange}" />
          <div class="score-tag ${scoreClass(scoreDiff('orange'))}">O ${relativeScoreToText(scoreDiff('orange'))}</div>
        </div>
        <div class="score-row">
          <input id="scoreGrey" class="score-input" type="number" min="1" placeholder="Pelēkais grozs (PAR 2)" value="${state.discGolf.current.grey}" />
          <div class="score-tag ${scoreClass(scoreDiff('grey'))}">P ${relativeScoreToText(scoreDiff('grey'))}</div>
        </div>
      </div>

      <div class="status-pill">Kopējais rezultāts: ${relativeScoreToText(currentDiscRelative())}</div>

      <div class="grid-2">
        <button id="submitDiscRoundBtn" class="primary-btn">Iesniegt apli</button>
        <button id="resetDiscCurrentBtn" class="secondary-btn">Notīrīt ievadi</button>
      </div>

      <div class="stack">
        <h4 class="section-title">Līderu tops</h4>
        <p class="muted small">Šajā bezmaksas lokālajā versijā tops strādā tikai uz šīs ierīces. Visiem kopīgs tops prasīs mazu bezmaksas datubāzi nākamajā solī.</p>
        <div class="table">
          <div class="table-row head"><div>Vārds</div><div>Z</div><div>O</div><div>P</div><div>Kopā</div></div>
          ${bestRows.length ? bestRows.map(r => `
            <div class="table-row"><div>${escapeHtml(r.player)}</div><div>${r.blue}</div><div>${r.orange}</div><div>${r.grey}</div><div>${relativeScoreToText(r.relative)}</div></div>
          `).join('') : '<div class="table-row"><div>Vēl nav rezultātu</div><div>—</div><div>—</div><div>—</div><div>—</div></div>'}
        </div>
      </div>

      <div class="stack">
        <h4 class="section-title">Mani apļi</h4>
        <div class="table">
          <div class="table-row head"><div>Reize</div><div>Z</div><div>O</div><div>P</div><div>Kopā</div></div>
          ${rounds.filter(r => r.player === state.playerName).length ? rounds.filter(r => r.player === state.playerName).map((r, i) => `
            <div class="table-row"><div>#${i + 1}</div><div>${r.blue}</div><div>${r.orange}</div><div>${r.grey}</div><div>${relativeScoreToText(r.relative)}</div></div>
          `).join('') : '<div class="table-row"><div>Vēl nav</div><div>—</div><div>—</div><div>—</div><div>—</div></div>'}
        </div>
      </div>
    </div>
  `;
}

function scoreDiff(color) {
  const val = Number(state.discGolf.current[color]);
  if (!val) return 0;
  return val - PARS[color];
}

function currentDiscRelative() {
  return scoreDiff('blue') + scoreDiff('orange') + scoreDiff('grey');
}

function scoreClass(score) {
  if (score < 0) return 'good';
  if (score > 0) return 'bad';
  return 'neutral';
}

function bindWelcome() {
  document.getElementById('startAppBtn').addEventListener('click', () => {
    const val = document.getElementById('nameInput').value.trim();
    if (!val) {
      alert('Ievadi vārdu.');
      return;
    }
    state.playerName = val;
    saveState();
    render();
  });
}

function bindCommon() {
  document.getElementById('adminOpenBtn').onclick = openAdminModal;
  document.querySelectorAll('[data-game-tab]').forEach(btn => {
    btn.addEventListener('click', () => {
      const gameId = Number(btn.dataset.gameTab);
      if (!state.unlockedGames.includes(gameId)) return;
      state.currentGame = gameId;
      saveState();
      render();
    });
  });
}

function bindGameScreen() {
  if (state.currentGame === 1) bindOrientationGame();
  if (state.currentGame === 2) bindDiscGolfGame();
}

function bindOrientationGame() {
  const startBtn = document.getElementById('startOrientationBtn');
  if (startBtn) {
    startBtn.onclick = () => {
      state.orientation.startedAt = Date.now();
      saveState();
      startTimer();
      render();
    };
  }

  document.querySelectorAll('[data-marker]').forEach(btn => {
    btn.addEventListener('click', () => {
      if (!state.orientation.startedAt) return;
      openLetterModal(Number(btn.dataset.marker));
    });
  });

  const checkBtn = document.getElementById('checkOrientationBtn');
  if (checkBtn) {
    checkBtn.onclick = () => {
      state.orientation.checked = true;
      saveState();
      render();
    };
  }

  const resetBtn = document.getElementById('resetOrientationBtn');
  if (resetBtn) {
    resetBtn.onclick = () => {
      if (!confirm('Tiešām notīrīt orientēšanos?')) return;
      state.orientation = defaultState().orientation;
      saveState();
      stopTimer();
      render();
    };
  }

  document.querySelectorAll('[data-phrase-index]').forEach(input => {
    input.addEventListener('input', (e) => {
      const index = Number(e.target.dataset.phraseIndex);
      state.orientation.phraseDraft[index] = e.target.value.toUpperCase();
      saveState();
    });
  });

  const submitPhraseBtn = document.getElementById('submitPhraseBtn');
  if (submitPhraseBtn) {
    submitPhraseBtn.onclick = submitPhrase;
  }

  if (state.orientation.startedAt && !state.orientation.finished) startTimer();
}

function allOrientationCorrect() {
  return Object.keys(ORIENTATION_TARGET).every(n => (state.orientation.letters[n] || '').toUpperCase() === ORIENTATION_TARGET[n]);
}

function openLetterModal(markerNumber) {
  const root = document.getElementById('modalRoot');
  const current = state.orientation.letters[markerNumber] || '';
  root.innerHTML = `
    <div class="modal-backdrop">
      <div class="modal-card stack">
        <div>
          <p class="eyebrow">Punkts ${markerNumber}</p>
          <h3 class="section-title">Ievadi atrasto burtu</h3>
        </div>
        <input id="markerLetterInput" class="input" maxlength="1" value="${escapeAttr(current)}" placeholder="Burts" />
        <div class="grid-2">
          <button id="saveMarkerLetterBtn" class="primary-btn">Saglabāt</button>
          <button id="closeModalBtn" class="secondary-btn">Aizvērt</button>
        </div>
      </div>
    </div>
  `;
  document.getElementById('markerLetterInput').focus();
  document.getElementById('saveMarkerLetterBtn').onclick = () => {
    const val = document.getElementById('markerLetterInput').value.trim().toUpperCase();
    if (!val) {
      alert('Ievadi burtu.');
      return;
    }
    state.orientation.letters[markerNumber] = val;
    state.orientation.checked = false;
    saveState();
    closeModal();
    render();
  };
  document.getElementById('closeModalBtn').onclick = closeModal;
}

function closeModal() {
  document.getElementById('modalRoot').innerHTML = '';
}

function submitPhrase() {
  const lettersOk = allOrientationCorrect();
  if (!lettersOk) return;

  let allSolved = true;
  Array.from(PHRASE).forEach((char, index) => {
    if (char === ' ' || /[,.!?]/.test(char)) {
      state.orientation.phraseLocks[index] = char;
      state.orientation.phraseDraft[index] = char;
      return;
    }
    const draft = (state.orientation.phraseDraft[index] || '').toUpperCase();
    if (draft === char) {
      state.orientation.phraseLocks[index] = char;
      state.orientation.phraseDraft[index] = char;
    } else {
      if (!state.orientation.phraseLocks[index]) state.orientation.phraseDraft[index] = '';
      allSolved = false;
    }
  });

  if (allSolved) {
    state.orientation.finished = true;
    state.orientation.completedAt = Date.now();
    state.orientation.finalTimeSec = Math.floor((state.orientation.completedAt - state.orientation.startedAt) / 1000);
    saveState();
    stopTimer();
    render();
    launchConfetti();
    return;
  }

  saveState();
  render();
}

function bindDiscGolfGame() {
  ['blue', 'orange', 'grey'].forEach(color => {
    const input = document.getElementById(`score${capitalize(color)}`);
    input?.addEventListener('input', (e) => {
      state.discGolf.current[color] = e.target.value;
      saveState();
      render();
    });
  });

  document.getElementById('submitDiscRoundBtn')?.addEventListener('click', () => {
    const { blue, orange, grey } = state.discGolf.current;
    if (!blue || !orange || !grey) {
      alert('Aizpildi visus trīs grozus.');
      return;
    }
    const round = {
      player: state.playerName,
      blue: Number(blue),
      orange: Number(orange),
      grey: Number(grey),
      totalThrows: Number(blue) + Number(orange) + Number(grey),
      relative: Number(blue) - 3 + Number(orange) - 3 + Number(grey) - 2,
      createdAt: Date.now(),
    };
    state.discGolf.rounds.push(round);
    state.discGolf.current = { blue: '', orange: '', grey: '' };
    saveState();
    alert(`Aplis saglabāts. Rezultāts: ${relativeScoreToText(round.relative)}`);
    render();
  });

  document.getElementById('resetDiscCurrentBtn')?.addEventListener('click', () => {
    state.discGolf.current = { blue: '', orange: '', grey: '' };
    saveState();
    render();
  });
}

function openAdminModal() {
  const root = document.getElementById('modalRoot');
  root.innerHTML = `
    <div class="modal-backdrop">
      <div class="modal-card stack">
        <div>
          <p class="eyebrow">Admin</p>
          <h3 class="section-title">Ievadi 4 ciparu PIN</h3>
        </div>
        <input id="adminPinInput" class="input" maxlength="4" inputmode="numeric" placeholder="1234" />
        <div class="grid-2">
          <button id="adminLoginBtn" class="primary-btn">Ieiet</button>
          <button id="adminCloseBtn" class="secondary-btn">Aizvērt</button>
        </div>
      </div>
    </div>
  `;
  document.getElementById('adminLoginBtn').onclick = () => {
    const pin = document.getElementById('adminPinInput').value.trim();
    if (pin !== ADMIN_PIN) {
      alert('Nepareizs PIN.');
      return;
    }
    state.adminUnlocked = true;
    saveState();
    openAdminPanel();
  };
  document.getElementById('adminCloseBtn').onclick = closeModal;
}

function openAdminPanel() {
  const root = document.getElementById('modalRoot');
  root.innerHTML = `
    <div class="modal-backdrop">
      <div class="modal-card stack">
        <div>
          <p class="eyebrow">Admin panelis</p>
          <h3 class="section-title">Vadība</h3>
        </div>
        <label class="small muted">Aktīvā spēle</label>
        <select id="adminCurrentGame" class="input">
          ${GAME_LIST.map(game => `<option value="${game.id}" ${state.currentGame === game.id ? 'selected' : ''}>${game.id}. ${game.title}</option>`).join('')}
        </select>
        <button id="saveAdminGameBtn" class="primary-btn">Saglabāt aktīvo spēli</button>
        <button id="clearLocalDataBtn" class="danger-btn">Dzēst visus šīs ierīces datus</button>
        <button id="closeAdminPanelBtn" class="secondary-btn">Aizvērt</button>
        <p class="muted small">PIN maini failā app.js: const ADMIN_PIN = '1234';</p>
      </div>
    </div>
  `;
  document.getElementById('saveAdminGameBtn').onclick = () => {
    state.currentGame = Number(document.getElementById('adminCurrentGame').value);
    saveState();
    closeModal();
    render();
  };
  document.getElementById('clearLocalDataBtn').onclick = () => {
    if (!confirm('Tiešām dzēst visus šīs ierīces datus?')) return;
    localStorage.removeItem(APP_KEY);
    state = defaultState();
    closeModal();
    stopTimer();
    render();
  };
  document.getElementById('closeAdminPanelBtn').onclick = closeModal;
}

function startTimer() {
  stopTimer();
  timerInterval = setInterval(() => {
    const el = document.getElementById('orientationTimer');
    if (el) el.textContent = formatOrientationTime();
  }, 1000);
}

function stopTimer() {
  if (timerInterval) clearInterval(timerInterval);
  timerInterval = null;
}

function formatSeconds(sec) {
  const m = Math.floor(sec / 60).toString().padStart(2, '0');
  const s = (sec % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
}

function capitalize(str) {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

function escapeHtml(str) {
  return String(str).replace(/[&<>"]/g, s => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[s]));
}

function escapeAttr(str) {
  return escapeHtml(str).replace(/'/g, '&#39;');
}

function launchConfetti() {
  const layer = document.createElement('div');
  layer.className = 'confetti-layer';
  const colors = ['#f59e0b', '#22c55e', '#60a5fa', '#f472b6', '#facc15', '#fb7185'];
  for (let i = 0; i < 80; i++) {
    const piece = document.createElement('div');
    piece.className = 'confetti';
    piece.style.left = `${Math.random() * 100}%`;
    piece.style.background = colors[i % colors.length];
    piece.style.animationDuration = `${2.3 + Math.random() * 2.2}s`;
    piece.style.opacity = `${0.7 + Math.random() * 0.3}`;
    layer.appendChild(piece);
  }
  document.body.appendChild(layer);
  setTimeout(() => layer.remove(), 4500);
}

render();
