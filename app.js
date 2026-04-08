const APP_KEY = 'janu_spele_app_v2';
const ADMIN_PIN = '1234';

const ORIENTATION_TARGET = {
  1: 'K',
  2: 'Ā',
  3: 'U',
  4: 'R',
  5: 'G',
  6: 'Ņ',
  7: 'N',
  8: 'S',
  9: 'T',
  10: 'J',
  11: 'I'
};

const PHRASE = 'KUR UGUNS, TUR JĀŅI.';

const GAME_LIST = [
  { id: 1, icon: '🧭', title: 'Orientēšanās' },
  { id: 2, icon: '🥏', title: 'Disku golfs' },
  { id: 3, icon: '🎲', title: 'Spēle 3' },
  { id: 4, icon: '🔥', title: 'Spēle 4' },
  { id: 5, icon: '🌙', title: 'Spēle 5' },
];

const PARS = { blue: 3, orange: 3, grey: 2 };

const PHRASE_LETTERS = shuffleLetters(
  Array.from(new Set(Array.from(PHRASE).filter(isPhraseLetter))).sort((a, b) =>
    a.localeCompare(b, 'lv')
  )
);

let state = loadState();
let timerInterval = null;

function defaultState() {
  return {
    playerName: '',
    adminUnlocked: false,
    currentGame: 1,
    orientation: {
      introShown: false,
      startedAt: null,
      completedAt: null,
      letters: {},
      phraseLocks: Array.from(PHRASE).map(ch => (isPhraseLetter(ch) ? '' : ch)),
      phraseDraft: Array.from(PHRASE).map(ch => (isPhraseLetter(ch) ? '' : ch)),
      finished: false,
      finalTimeSec: null,
    },
    discGolf: {
      rounds: [],
      current: { blue: '', orange: '', grey: '' },
      view: 'leaderboard'
    }
  };
}

function normalizeState(rawState) {
  const base = defaultState();
  const merged = { ...base, ...rawState };

  merged.orientation = { ...base.orientation, ...(rawState.orientation || {}) };
  merged.discGolf = { ...base.discGolf, ...(rawState.discGolf || {}) };
  merged.discGolf.current = {
    ...base.discGolf.current,
    ...((rawState.discGolf || {}).current || {})
  };

  if (
    !Array.isArray(merged.orientation.phraseLocks) ||
    merged.orientation.phraseLocks.length !== PHRASE.length
  ) {
    merged.orientation.phraseLocks = base.orientation.phraseLocks;
  }

  if (
    !Array.isArray(merged.orientation.phraseDraft) ||
    merged.orientation.phraseDraft.length !== PHRASE.length
  ) {
    merged.orientation.phraseDraft = base.orientation.phraseDraft;
  }

  return merged;
}

function loadState() {
  try {
    const raw = localStorage.getItem(APP_KEY);
    if (!raw) return defaultState();
    return normalizeState(JSON.parse(raw));
  } catch {
    return defaultState();
  }
}

function saveState() {
  localStorage.setItem(APP_KEY, JSON.stringify(state));
}

function isPhraseLetter(char) {
  return /[A-ZĀČĒĢĪĶĻŅŠŪŽ]/.test(char);
}

function relativeScoreToText(score) {
  if (score === 0) return 'E';
  return score > 0 ? `+${score}` : `${score}`;
}

function renderPreserveScroll() {
  const scrollY = window.scrollY || window.pageYOffset || 0;
  const active = document.activeElement;

  if (
    active &&
    typeof active.blur === 'function' &&
    active !== document.body
  ) {
    active.blur();
  }

  render();

  requestAnimationFrame(() => {
    window.scrollTo({ top: scrollY, behavior: 'auto' });
  });
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
    <section class="stack welcome-stack">
      <div class="card stack welcome-card">
        <input id="nameInput" class="input" placeholder="Ievadi vārdu" maxlength="24" />
        <button id="startAppBtn" class="primary-btn">Start</button>
      </div>
    </section>
  `;
}

function renderGameTabs() {
  return `
    <div class="game-tabs">
      ${GAME_LIST.map(game => `
        <button class="game-tab ${state.currentGame === game.id ? 'active' : ''}" data-game-tab="${game.id}">
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
      <div class="card compact-card stack">
        <div class="player-row">
          <div>
            <p class="eyebrow">Spēlētājs</p>
            <h2 class="section-title">${escapeHtml(state.playerName)}</h2>
          </div>
          ${state.currentGame === 1 && state.orientation.introShown
            ? `<span class="timer-pill">⏱️ <span id="orientationTimer">${formatOrientationTime()}</span></span>`
            : ''}
        </div>
        ${renderGameTabs()}
      </div>

      <div class="card stack">
        <div class="meta-row">
          <span class="status-pill">${currentGame.icon} ${currentGame.title}</span>
        </div>
        ${renderCurrentGame()}
      </div>
    </section>
  `;
}

function renderCurrentGame() {
  switch (state.currentGame) {
    case 1:
      return renderOrientationGame();
    case 2:
      return renderDiscGolfGame();
    case 3:
    case 4:
    case 5:
      return `
        <div class="placeholder-box stack">
          <h3 class="section-title">Šī spēle vēl top</h3>
        </div>
      `;
    default:
      return '<p>Kļūda.</p>';
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

  if (!o.introShown) {
    return `
      <div class="stack">
        <h3 class="section-title">Orientēšanās</h3>
        <p class="muted">Atrodi visus punktus un pēc tam atmini teikumu.</p>
        <button id="startOrientationBtn" class="primary-btn">Sākam</button>
      </div>
    `;
  }

  const solvedLetters = allOrientationCorrect();

  return `
    <div class="stack">
      <div class="map-wrap clean-map-wrap">
        <img src="assets/orientesanas.png" alt="Orientēšanās karte" class="map-image" />
      </div>

      <div class="letter-grid input-grid">
        ${Array.from({ length: 11 }, (_, idx) => idx + 1).map(n => {
          const value = (o.letters[n] || '').toUpperCase();
          const status = !value ? '' : (value === ORIENTATION_TARGET[n] ? 'correct' : 'incorrect');

          return `
            <label class="letter-card ${status}">
              <div class="letter-card-top">${n}</div>
              <input
                class="letter-input"
                data-letter-index="${n}"
                maxlength="1"
                value="${escapeAttr(value)}"
                placeholder="—"
                autocomplete="off"
              />
            </label>
          `;
        }).join('')}
      </div>

      ${solvedLetters ? renderPhrasePuzzle() : ''}
    </div>
  `;
}

function renderPhrasePuzzle() {
  const o = state.orientation;
  const solved = o.finished;
  const activeIndex = nextPhraseIndex();

  return `
    <div class="card inset-card stack">
      <div>
        <h3 class="section-title">Atmini teikumu</h3>
      </div>

      <div class="wordle-wrap">
        <div class="phrase-row">
          ${Array.from(PHRASE).map((char, index) => {
            if (char === ' ') return '<div class="phrase-space"></div>';
            if (/[,.!?]/.test(char)) return `<div class="phrase-punct">${char}</div>`;

            const locked = o.phraseLocks[index];
            const draft = o.phraseDraft[index] || '';

            return `
              <button
                class="phrase-box ${locked ? 'locked' : ''} ${activeIndex === index ? 'active' : ''}"
                data-phrase-slot="${index}"
                ${locked ? 'disabled' : ''}
              >
                ${escapeHtml(locked || draft || '')}
              </button>
            `;
          }).join('')}
        </div>

        <div class="phrase-bank-row">
          <div class="letter-bank phrase-bank">
            ${PHRASE_LETTERS.map(letter => `
              <button
                class="bank-item ${phraseLetterDone(letter) ? 'done' : ''}"
                data-bank-letter="${letter}"
                ${solved || phraseLetterDone(letter) ? 'disabled' : ''}
              >
                ${letter}
              </button>
            `).join('')}
          </div>
          <button id="phraseBackspaceBtn" class="icon-btn" aria-label="Dzēst burtu" ${solved ? 'disabled' : ''}>⌫</button>
        </div>
      </div>

      ${solved ? `
        <div class="stack">
          <div class="status-pill">🎉 Gatavs! Laiks: ${formatSeconds(o.finalTimeSec || 0)}</div>
          <p class="muted"><strong>${PHRASE}</strong></p>
        </div>
      ` : ''}
    </div>
  `;
}

function renderDiscGolfGame() {
  const rounds = state.discGolf.rounds;
  const playerRounds = rounds.filter(r => r.player === state.playerName);
  const bestRows = buildLeaderboard(rounds);
  const currentRelative = currentDiscRelative();
  const currentRating = discRating(currentRelative);
  const hasLiveRound = hasAnyDiscValue();
  const activeView = state.discGolf.view || 'leaderboard';

  return `
    <div class="stack">
      <div class="map-wrap">
        <img src="assets/disku-golfs.png" alt="Disku golfa trase" class="map-image" />
      </div>

      <div class="basket-stack">
        ${renderBasketCard('ZILAIS', 'blue', PARS.blue)}
        ${renderBasketCard('ORANŽAIS', 'orange', PARS.orange)}
        ${renderBasketCard('PELĒKAIS', 'grey', PARS.grey)}
      </div>

      <div class="result-summary">
        <div class="result-box">
          <span class="summary-label">PAR</span>
          <strong>8</strong>
        </div>
        <div class="result-box">
          <span class="summary-label">Rezultāts</span>
          <strong>${hasLiveRound ? relativeScoreToText(currentRelative) : '-'}</strong>
        </div>
        <div class="result-box rating-box ${hasLiveRound ? ratingClass(currentRelative) : ''}">
          <span class="summary-label">Tavs Jāņu reitings</span>
          <strong>${hasLiveRound ? currentRating : '-'}</strong>
        </div>
      </div>

      <button id="submitDiscRoundBtn" class="primary-btn">Iesniegt apli</button>

      <div class="disc-tabs-shell">
        <button class="disc-tab ${activeView === 'leaderboard' ? 'active' : ''}" data-disc-view="leaderboard">Leaderboard</button>
        <button class="disc-tab ${activeView === 'myRounds' ? 'active' : ''}" data-disc-view="myRounds">Mani apļi</button>
      </div>

      ${activeView === 'leaderboard' ? `
        <div class="stack">
          <div class="table leaderboard-table">
            <div class="table-row head table-row-6">
              <div>Vārds</div><div>Z</div><div>O</div><div>P</div><div>Kopā</div><div>Reit.</div>
            </div>
            ${
              bestRows.length
                ? bestRows.map(r => `
                  <div class="table-row table-row-6">
                    <div>${escapeHtml(r.player)}</div>
                    <div>${r.blue}</div>
                    <div>${r.orange}</div>
                    <div>${r.grey}</div>
                    <div>${relativeScoreToText(r.relative)}</div>
                    <div>${r.rating}</div>
                  </div>
                `).join('')
                : `
                  <div class="table-row table-row-6">
                    <div>Vēl nav rezultātu</div><div>—</div><div>—</div><div>—</div><div>—</div><div>—</div>
                  </div>
                `
            }
          </div>
        </div>
      ` : `
        <div class="stack">
          <div class="table leaderboard-table">
            <div class="table-row head table-row-6">
              <div>Reize</div><div>Z</div><div>O</div><div>P</div><div>Kopā</div><div>Reit.</div>
            </div>
            ${
              playerRounds.length
                ? playerRounds.map((r, i) => `
                  <div class="table-row table-row-6">
                    <div>#${i + 1}</div>
                    <div>${r.blue}</div>
                    <div>${r.orange}</div>
                    <div>${r.grey}</div>
                    <div>${relativeScoreToText(r.relative)}</div>
                    <div>${r.rating}</div>
                  </div>
                `).join('')
                : `
                  <div class="table-row table-row-6">
                    <div>Vēl nav</div><div>—</div><div>—</div><div>—</div><div>—</div><div>—</div>
                  </div>
                `
            }
          </div>
        </div>
      `}
    </div>
  `;
}

function renderBasketCard(title, color, par) {
  const id = capitalize(color);

  return `
    <div class="basket-card ${color}">
      <div>
        <div class="basket-title">${title}</div>
        <div class="basket-par">PAR ${par}</div>
      </div>
      <input
        id="score${id}"
        class="score-input big-score-input"
        type="number"
        min="0"
        inputmode="numeric"
        value="${state.discGolf.current[color]}"
        placeholder="0"
      />
      <div class="score-tag ${scoreClass(scoreDiff(color))}">${relativeScoreToText(scoreDiff(color))}</div>
    </div>
  `;
}

function scoreDiff(color) {
  const raw = state.discGolf.current[color];
  if (raw === '' || raw == null) return 0;

  const val = Number(raw);
  if (!Number.isFinite(val)) return 0;

  return val - PARS[color];
}

function hasAnyDiscValue() {
  return ['blue', 'orange', 'grey'].some(color => state.discGolf.current[color] !== '');
}

function currentDiscRelative() {
  return scoreDiff('blue') + scoreDiff('orange') + scoreDiff('grey');
}

function discRating(relative) {
  return 1000 - (relative * 50);
}

function ratingClass(relative) {
  if (relative < 0) return 'up';
  if (relative > 0) return 'down';
  return 'even';
}

function buildLeaderboard(rounds) {
  const bestByPlayer = new Map();

  rounds.forEach(round => {
    const existing = bestByPlayer.get(round.player);

    if (
      !existing ||
      round.relative < existing.relative ||
      (round.relative === existing.relative && round.totalThrows < existing.totalThrows)
    ) {
      bestByPlayer.set(round.player, round);
    }
  });

  return [...bestByPlayer.values()]
    .sort((a, b) => a.relative - b.relative || a.totalThrows - b.totalThrows)
    .slice(0, 10);
}

function scoreClass(score) {
  if (score < 0) return 'good';
  if (score > 0) return 'bad';
  return 'neutral';
}

function bindStableToggle(selector, onClick) {
  document.querySelectorAll(selector).forEach(btn => {
    const handler = e => e.preventDefault();

    btn.addEventListener('mousedown', handler);
    btn.addEventListener('touchstart', handler, { passive: false });

    btn.addEventListener('click', e => {
      e.preventDefault();
      onClick(btn, e);
    });
  });
}

function bindWelcome() {
  const input = document.getElementById('nameInput');
  input?.focus();

  document.getElementById('startAppBtn').addEventListener('click', () => {
    const val = input.value.trim();

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

  bindStableToggle('[data-game-tab]', btn => {
    const gameId = Number(btn.dataset.gameTab);
    state.currentGame = gameId;
    saveState();
    renderPreserveScroll();
  });
}

function bindGameScreen() {
  if (state.currentGame === 1) bindOrientationGame();
  if (state.currentGame === 2) bindDiscGolfGame();
}

function bindOrientationGame() {
  const startBtn = document.getElementById('startOrientationBtn');

  if (startBtn) {
    startBtn.addEventListener('click', () => {
      state.orientation.introShown = true;

      if (!state.orientation.startedAt) {
        state.orientation.startedAt = Date.now();
      }

      saveState();
      startTimer();
      render();
    });
    return;
  }

  document.querySelectorAll('[data-letter-index]').forEach(input => {
    input.addEventListener('input', e => {
      const index = Number(e.target.dataset.letterIndex);
      const value = (e.target.value || '').trim().toUpperCase().slice(0, 1);

      state.orientation.letters[index] = value;

      const card = e.target.closest('.letter-card');
      card?.classList.remove('correct', 'incorrect');

      if (value) {
        card?.classList.add(value === ORIENTATION_TARGET[index] ? 'correct' : 'incorrect');
      }

      if (allOrientationCorrect() && !state.orientation.finished) {
        primePhraseDraft();
        saveState();
        renderPreserveScroll();
        return;
      }

      saveState();
    });
  });

  document.querySelectorAll('[data-bank-letter]').forEach(btn => {
    btn.addEventListener('click', () => {
      insertPhraseLetter(btn.dataset.bankLetter);
    });
  });

  document.querySelectorAll('[data-phrase-slot]').forEach(btn => {
    btn.addEventListener('click', () => {
      const index = Number(btn.dataset.phraseSlot);
      setPhraseCursor(index);
      saveState();
      renderPreserveScroll();
    });
  });

  document.getElementById('phraseBackspaceBtn')?.addEventListener('click', backspacePhrase);

  if (state.orientation.startedAt && !state.orientation.finished) {
    startTimer();
  }
}

function allOrientationCorrect() {
  return Object.keys(ORIENTATION_TARGET).every(
    n => (state.orientation.letters[n] || '').toUpperCase() === ORIENTATION_TARGET[n]
  );
}

function primePhraseDraft() {
  state.orientation.phraseDraft = Array.from(PHRASE).map((char, index) =>
    state.orientation.phraseLocks[index] || (isPhraseLetter(char) ? '' : char)
  );
}

function nextPhraseIndex() {
  const o = state.orientation;

  for (let i = 0; i < PHRASE.length; i++) {
    if (isPhraseLetter(PHRASE[i]) && !o.phraseLocks[i] && !o.phraseDraft[i]) return i;
  }

  for (let i = 0; i < PHRASE.length; i++) {
    if (isPhraseLetter(PHRASE[i]) && !o.phraseLocks[i]) return i;
  }

  return -1;
}

function setPhraseCursor(index) {
  if (state.orientation.phraseLocks[index]) return;
  const currentValue = state.orientation.phraseDraft[index];
  if (!currentValue) return;
  state.orientation.phraseDraft[index] = '';
}

function insertPhraseLetter(letter) {
  if (state.orientation.finished) return;
  if (phraseLetterDone(letter)) return;

  const index = nextPhraseIndex();
  if (index === -1) return;

  state.orientation.phraseDraft[index] = letter;
  saveState();

  if (phraseTryReady()) {
    evaluatePhraseAttempt();
  } else {
    renderPreserveScroll();
  }
}

function phraseTryReady() {
  return Array.from(PHRASE).every(
    (char, index) =>
      !isPhraseLetter(char) ||
      state.orientation.phraseLocks[index] ||
      state.orientation.phraseDraft[index]
  );
}

function evaluatePhraseAttempt() {
  let allSolved = true;

  Array.from(PHRASE).forEach((char, index) => {
    if (!isPhraseLetter(char)) {
      state.orientation.phraseLocks[index] = char;
      state.orientation.phraseDraft[index] = char;
      return;
    }

    const draft = (state.orientation.phraseDraft[index] || '').toUpperCase();

    if (draft === char) {
      state.orientation.phraseLocks[index] = char;
      state.orientation.phraseDraft[index] = char;
    } else if (!state.orientation.phraseLocks[index]) {
      state.orientation.phraseDraft[index] = '';
      allSolved = false;
    }
  });

  if (allSolved) {
    state.orientation.finished = true;
    state.orientation.completedAt = Date.now();
    state.orientation.finalTimeSec = Math.floor(
      (state.orientation.completedAt - state.orientation.startedAt) / 1000
    );
    saveState();
    stopTimer();
    render();
    launchConfetti();
    return;
  }

  saveState();
  render();
}

function phraseLetterDone(letter) {
  const total = Array.from(PHRASE).filter(char => char === letter).length;

  const used = state.orientation.phraseLocks.reduce((count, current, index) => {
    const draftCurrent = state.orientation.phraseDraft[index];
    return count + ((current === letter || draftCurrent === letter) ? 1 : 0);
  }, 0);

  return used >= total;
}

function shuffleLetters(list) {
  const seeded = [...list];

  for (let i = seeded.length - 1; i > 0; i--) {
    const j = (i * 7 + 3) % (i + 1);
    [seeded[i], seeded[j]] = [seeded[j], seeded[i]];
  }

  return seeded;
}

function backspacePhrase() {
  if (state.orientation.finished) return;

  for (let i = PHRASE.length - 1; i >= 0; i--) {
    if (
      isPhraseLetter(PHRASE[i]) &&
      !state.orientation.phraseLocks[i] &&
      state.orientation.phraseDraft[i]
    ) {
      state.orientation.phraseDraft[i] = '';
      saveState();
      renderPreserveScroll();
      return;
    }
  }
}

function bindDiscGolfGame() {
  ['blue', 'orange', 'grey'].forEach(color => {
    const input = document.getElementById(`score${capitalize(color)}`);

    input?.addEventListener('input', e => {
      const cleaned = Math.max(0, Number(e.target.value || 0));
      state.discGolf.current[color] = e.target.value === '' ? '' : String(cleaned);

      if (e.target.value !== '') {
        e.target.value = String(cleaned);
      }

      saveState();
      renderPreserveScroll();
    });
  });

  bindStableToggle('[data-disc-view]', btn => {
    state.discGolf.view = btn.dataset.discView;
    saveState();
    renderPreserveScroll();
  });

  document.getElementById('submitDiscRoundBtn')?.addEventListener('click', () => {
    const { blue, orange, grey } = state.discGolf.current;

    if (!blue || !orange || !grey) {
      alert('Aizpildi visus trīs grozus.');
      return;
    }

    const relative =
      Number(blue) - 3 +
      Number(orange) - 3 +
      Number(grey) - 2;

    const round = {
      player: state.playerName,
      blue: Number(blue),
      orange: Number(orange),
      grey: Number(grey),
      totalThrows: Number(blue) + Number(orange) + Number(grey),
      relative,
      rating: discRating(relative),
      createdAt: Date.now(),
    };

    state.discGolf.rounds.push(round);
    state.discGolf.current = { blue: '', orange: '', grey: '' };
    saveState();

    alert(`Aplis saglabāts. Rezultāts: ${relativeScoreToText(round.relative)} | Reitings: ${round.rating}`);
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
          <h3 class="section-title">PIN</h3>
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
      <div class="modal-card stack admin-panel-wide">
        <div>
          <p class="eyebrow">Admin panelis</p>
          <h3 class="section-title">Rezultāti pa spēlēm</h3>
        </div>

        <div class="game-tabs">
          ${GAME_LIST.map(game => `
            <button class="game-tab" data-admin-game="${game.id}">
              <span class="game-icon">${game.icon}</span>
              <span>${game.title}</span>
            </button>
          `).join('')}
        </div>

        <div id="adminContent" class="stack"></div>

        <button id="clearLocalDataBtn" class="danger-btn">Dzēst visus šīs ierīces datus</button>
        <button id="closeAdminPanelBtn" class="secondary-btn">Aizvērt</button>
      </div>
    </div>
  `;

  document.querySelectorAll('[data-admin-game]').forEach(btn => {
    btn.addEventListener('click', () => {
      const gameId = Number(btn.dataset.adminGame);
      renderAdminContent(gameId);
    });
  });

  document.getElementById('clearLocalDataBtn').onclick = () => {
    if (!confirm('Tiešām dzēst visus šīs ierīces datus?')) return;
    localStorage.removeItem(APP_KEY);
    state = defaultState();
    closeModal();
    stopTimer();
    render();
  };

  document.getElementById('closeAdminPanelBtn').onclick = closeModal;

  renderAdminContent(1);
}

function renderAdminContent(gameId) {
  const el = document.getElementById('adminContent');
  if (!el) return;

  if (gameId === 1) {
    const finalTime = state.orientation.finalTimeSec
      ? formatSeconds(state.orientation.finalTimeSec)
      : '-';

    el.innerHTML = `
      <div class="table leaderboard-table">
        <div class="table-row head"><div>Vārds</div><div>Laiks</div><div></div><div></div><div></div></div>
        <div class="table-row">
          <div>${escapeHtml(state.playerName || '-')}</div>
          <div>${finalTime}</div>
          <div>—</div>
          <div>—</div>
          <div>—</div>
        </div>
      </div>
    `;
    return;
  }

  if (gameId === 2) {
    const rows = buildLeaderboard(state.discGolf.rounds);

    el.innerHTML = `
      <div class="table leaderboard-table">
        <div class="table-row head table-row-6">
          <div>Vārds</div><div>Z</div><div>O</div><div>P</div><div>Kopā</div><div>Reit.</div>
        </div>
        ${
          rows.length
            ? rows.map(r => `
              <div class="table-row table-row-6">
                <div>${escapeHtml(r.player)}</div>
                <div>${r.blue}</div>
                <div>${r.orange}</div>
                <div>${r.grey}</div>
                <div>${relativeScoreToText(r.relative)}</div>
                <div>${r.rating}</div>
              </div>
            `).join('')
            : `
              <div class="table-row table-row-6">
                <div>Vēl nav rezultātu</div><div>—</div><div>—</div><div>—</div><div>—</div><div>—</div>
              </div>
            `
        }
      </div>
    `;
    return;
  }

  el.innerHTML = `
    <div class="placeholder-box stack">
      <h3 class="section-title">Nav rezultātu</h3>
      <p class="muted">Šai spēlei rezultāti vēl nav pievienoti.</p>
    </div>
  `;
}

function closeModal() {
  document.getElementById('modalRoot').innerHTML = '';
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
  return String(str).replace(/[&<>"]/g, s => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;'
  }[s]));
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