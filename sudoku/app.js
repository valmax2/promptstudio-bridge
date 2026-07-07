/**
 * Sudoku · VStudio Apps — controller dell'interfaccia.
 * Gestisce rendering, input, timer, salvataggio automatico, tema e suoni.
 * Dipende da `window.SudokuEngine` (sudoku-engine.js), caricato prima di questo file.
 */
(function () {
  const Engine = window.SudokuEngine;
  const SIZE = Engine.SIZE;

  const STORAGE_KEY = 'vsudoku-state-v1';
  const THEME_KEY = 'vsudoku-theme';
  const SOUND_KEY = 'vsudoku-sound';

  const $ = (sel) => document.querySelector(sel);

  const startScreen = $('#startScreen');
  const gameScreen = $('#gameScreen');
  const resumeBtn = $('#resumeBtn');
  const resumeInfo = $('#resumeInfo');
  const boardEl = $('#board');
  const keypadEl = $('#keypad');
  const timerEl = $('#timer');
  const difficultyLabelEl = $('#difficultyLabel');
  const pauseOverlay = $('#pauseOverlay');
  const settingsModal = $('#settingsModal');
  const confirmModal = $('#confirmModal');
  const winModal = $('#winModal');
  const darkModeToggle = $('#darkModeToggle');
  const soundToggle = $('#soundToggle');

  const DIFFICULTY_NAMES = { easy: 'Facile', medium: 'Medio', hard: 'Difficile' };

  let state = null;      // { puzzle, given, values, difficulty, elapsedSeconds, completed }
  let selected = null;   // { r, c }
  let timerHandle = null;
  let paused = false;
  let soundEnabled = true;
  let audioCtx = null;

  /* ── Persistenza (salvataggio automatico) ─────────────────────────────── */
  function saveState() {
    if (!state) return;
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); } catch (e) {}
  }
  function loadState() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch (e) { return null; }
  }
  function clearState() {
    try { localStorage.removeItem(STORAGE_KEY); } catch (e) {}
  }

  /* ── Suoni: toni generati via WebAudio, nessun asset audio da scaricare ─ */
  function ensureAudio() {
    if (!audioCtx) {
      const Ctx = window.AudioContext || window.webkitAudioContext;
      if (Ctx) audioCtx = new Ctx();
    }
    if (audioCtx && audioCtx.state === 'suspended') audioCtx.resume();
    return audioCtx;
  }
  function beep(freq, duration, type) {
    if (!soundEnabled) return;
    const ctx = ensureAudio();
    if (!ctx) return;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type || 'sine';
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(0.0001, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.18, ctx.currentTime + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + duration);
    osc.connect(gain).connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + duration + 0.02);
  }
  const sfxTap = () => beep(520, 0.07, 'sine');
  const sfxError = () => beep(160, 0.18, 'square');
  const sfxWin = () => [523, 659, 784, 1047].forEach((f, i) => setTimeout(() => beep(f, 0.22, 'triangle'), i * 110));

  /* ── Tema chiaro/scuro ─────────────────────────────────────────────────── */
  function applyTheme(theme) {
    document.documentElement.dataset.theme = theme;
    try { localStorage.setItem(THEME_KEY, theme); } catch (e) {}
    const meta = document.getElementById('themeColor');
    if (meta) meta.setAttribute('content', theme === 'dark' ? '#17140F' : '#EAE3D5');
    darkModeToggle.checked = theme === 'dark';
  }

  /* ── Timer ─────────────────────────────────────────────────────────────── */
  function formatTime(totalSeconds) {
    const m = Math.floor(totalSeconds / 60).toString().padStart(2, '0');
    const s = Math.floor(totalSeconds % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  }
  function startTimer() {
    stopTimer();
    timerHandle = setInterval(() => {
      if (paused || !state || state.completed) return;
      state.elapsedSeconds++;
      timerEl.textContent = formatTime(state.elapsedSeconds);
      if (state.elapsedSeconds % 5 === 0) saveState();
    }, 1000);
  }
  function stopTimer() {
    if (timerHandle) clearInterval(timerHandle);
    timerHandle = null;
  }

  /* ── Costruzione DOM della griglia (una volta per partita) ────────────── */
  function buildBoardDom() {
    boardEl.innerHTML = '';
    const frag = document.createDocumentFragment();
    for (let r = 0; r < SIZE; r++) {
      for (let c = 0; c < SIZE; c++) {
        const cell = document.createElement('div');
        cell.className = 'cell';
        cell.dataset.row = r;
        cell.dataset.col = c;
        cell.setAttribute('role', 'gridcell');
        cell.addEventListener('click', () => onCellTap(r, c));
        frag.appendChild(cell);
      }
    }
    boardEl.appendChild(frag);
  }
  function cellEl(r, c) {
    return boardEl.children[r * SIZE + c];
  }

  /* ── Rendering ─────────────────────────────────────────────────────────── */
  function renderAll() {
    for (let r = 0; r < SIZE; r++) {
      for (let c = 0; c < SIZE; c++) renderCell(r, c);
    }
    renderKeypadCounts();
  }

  function renderCell(r, c) {
    const el = cellEl(r, c);
    const v = state.values[r][c];
    const isGiven = state.given[r][c];
    el.textContent = v ? String(v) : '';
    el.classList.toggle('given', isGiven);

    const hasConflict = v !== 0 && Engine.getConflictCells(state.values, r, c, v).length > 0;
    el.classList.toggle('error', hasConflict);

    let isPeer = false, isSame = false, isSelected = false;
    if (selected) {
      const sr = selected.r, sc = selected.c;
      isSelected = sr === r && sc === c;
      isPeer = !isSelected && (
        sr === r || sc === c ||
        (Math.floor(sr / 3) === Math.floor(r / 3) && Math.floor(sc / 3) === Math.floor(c / 3))
      );
      const sv = state.values[sr][sc];
      isSame = !isSelected && sv !== 0 && sv === v;
    }
    el.classList.toggle('selected', isSelected);
    el.classList.toggle('peer', isPeer);
    el.classList.toggle('same-value', isSame);
  }

  function renderKeypadCounts() {
    for (let n = 1; n <= 9; n++) {
      let count = 0;
      for (let r = 0; r < SIZE; r++) {
        for (let c = 0; c < SIZE; c++) if (state.values[r][c] === n) count++;
      }
      const key = keypadEl.querySelector(`.key[data-num="${n}"]`);
      const badge = key.querySelector('.key-count');
      const remaining = 9 - count;
      if (badge) badge.textContent = remaining > 0 ? remaining : '';
      key.classList.toggle('depleted', remaining <= 0);
    }
  }

  /* ── Interazioni ───────────────────────────────────────────────────────── */
  function onCellTap(r, c) {
    if (paused || !state) return;
    selected = { r, c };
    sfxTap();
    renderAll();
  }

  function onKeyTap(num) {
    if (paused || !state || !selected) return;
    const { r, c } = selected;
    if (state.given[r][c]) return; // le celle date all'inizio non si modificano

    state.values[r][c] = num;
    renderAll();
    saveState();

    if (num !== 0) {
      const hasConflict = Engine.getConflictCells(state.values, r, c, num).length > 0;
      hasConflict ? sfxError() : sfxTap();
    } else {
      sfxTap();
    }

    if (Engine.isBoardComplete(state.values)) onWin();
  }

  function onWin() {
    state.completed = true;
    stopTimer();
    saveState();
    sfxWin();
    $('#winDifficulty').textContent = DIFFICULTY_NAMES[state.difficulty] || '';
    $('#winTime').textContent = formatTime(state.elapsedSeconds);
    showModal(winModal);
  }

  /* ── Ciclo partita ─────────────────────────────────────────────────────── */
  function newGame(difficulty) {
    const { puzzle } = Engine.generatePuzzle(difficulty);
    const given = puzzle.map((row) => row.map((v) => v !== 0));
    state = {
      puzzle,
      given,
      values: Engine.cloneBoard(puzzle),
      difficulty,
      elapsedSeconds: 0,
      completed: false,
    };
    selected = null;
    saveState();
    enterGameScreen();
  }

  function resumeGame(saved) {
    state = saved;
    selected = null;
    enterGameScreen();
  }

  function enterGameScreen() {
    startScreen.classList.add('hidden');
    gameScreen.classList.remove('hidden');
    difficultyLabelEl.textContent = DIFFICULTY_NAMES[state.difficulty] || '';
    timerEl.textContent = formatTime(state.elapsedSeconds);
    buildBoardDom();
    renderAll();
    paused = false;
    pauseOverlay.classList.add('hidden');
    if (!state.completed) startTimer();
  }

  function backToMenu() {
    stopTimer();
    saveState();
    state = null;
    selected = null;
    gameScreen.classList.add('hidden');
    startScreen.classList.remove('hidden');
    refreshResumeButton();
  }

  function refreshResumeButton() {
    const saved = loadState();
    if (saved && !saved.completed) {
      resumeBtn.classList.remove('hidden');
      resumeInfo.textContent = `${DIFFICULTY_NAMES[saved.difficulty] || ''} · ${formatTime(saved.elapsedSeconds)}`;
    } else {
      resumeBtn.classList.add('hidden');
    }
  }

  /* ── Pausa automatica quando l'app va in background ───────────────────── */
  function setPaused(p) {
    if (!state || state.completed) return;
    paused = p;
    pauseOverlay.classList.toggle('hidden', !p);
    if (p) saveState();
  }

  document.addEventListener('visibilitychange', () => {
    if (document.hidden) setPaused(true);
  });
  window.addEventListener('pagehide', saveState);
  window.addEventListener('beforeunload', saveState);

  /* ── Modali ────────────────────────────────────────────────────────────── */
  function showModal(modal) { modal.classList.remove('hidden'); }
  function hideModal(modal) { modal.classList.add('hidden'); }

  /* ── Collegamento eventi UI ────────────────────────────────────────────── */
  document.querySelectorAll('.difficulty-grid .diff').forEach((btn) => {
    btn.addEventListener('click', () => newGame(btn.dataset.difficulty));
  });

  resumeBtn.addEventListener('click', () => {
    const saved = loadState();
    if (saved) resumeGame(saved);
  });

  keypadEl.addEventListener('click', (e) => {
    const btn = e.target.closest('.key');
    if (btn) onKeyTap(Number(btn.dataset.num));
  });

  $('#backBtn').addEventListener('click', backToMenu);

  $('#newGameBtn').addEventListener('click', () => showModal(confirmModal));
  $('#confirmCancelBtn').addEventListener('click', () => hideModal(confirmModal));
  $('#confirmOkBtn').addEventListener('click', () => {
    hideModal(confirmModal);
    newGame(state.difficulty);
  });

  $('#winNewGameBtn').addEventListener('click', () => {
    hideModal(winModal);
    clearState();
    newGame(state.difficulty);
  });

  $('#resumePauseBtn').addEventListener('click', () => setPaused(false));

  $('#settingsBtn').addEventListener('click', () => showModal(settingsModal));
  $('#startSettingsBtn').addEventListener('click', () => showModal(settingsModal));
  $('#closeSettingsBtn').addEventListener('click', () => hideModal(settingsModal));

  darkModeToggle.addEventListener('change', () => {
    applyTheme(darkModeToggle.checked ? 'dark' : 'light');
  });
  soundToggle.addEventListener('change', () => {
    soundEnabled = soundToggle.checked;
    try { localStorage.setItem(SOUND_KEY, soundEnabled ? '1' : '0'); } catch (e) {}
  });

  // Input da tastiera fisica (comodo per test su desktop e per l'accessibilità)
  document.addEventListener('keydown', (e) => {
    if (gameScreen.classList.contains('hidden') || paused) return;
    if (e.key >= '1' && e.key <= '9') { onKeyTap(Number(e.key)); return; }
    if (e.key === 'Backspace' || e.key === 'Delete' || e.key === '0') { onKeyTap(0); return; }
    if (!selected) return;
    const { r, c } = selected;
    if (e.key === 'ArrowUp') selected = { r: Math.max(0, r - 1), c };
    else if (e.key === 'ArrowDown') selected = { r: Math.min(8, r + 1), c };
    else if (e.key === 'ArrowLeft') selected = { r, c: Math.max(0, c - 1) };
    else if (e.key === 'ArrowRight') selected = { r, c: Math.min(8, c + 1) };
    else return;
    renderAll();
  });

  /* ── Avvio ─────────────────────────────────────────────────────────────── */
  function init() {
    applyTheme(document.documentElement.dataset.theme || 'dark');
    try { soundEnabled = localStorage.getItem(SOUND_KEY) !== '0'; } catch (e) { soundEnabled = true; }
    soundToggle.checked = soundEnabled;

    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('./sw.js', { updateViaCache: 'none' }).catch(() => {});
    }

    refreshResumeButton();
  }

  init();
})();
