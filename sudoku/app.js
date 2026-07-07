/**
 * Sudoku · VStudio Apps — controller dell'interfaccia.
 * Gestisce rendering, input, timer, salvataggio automatico, tema e suoni.
 * Dipende da `window.SudokuEngine` (sudoku-engine.js), caricato prima di questo file.
 */
(function () {
  const Engine = window.SudokuEngine;
  const SIZE = Engine.SIZE;

  const STORAGE_KEY = 'vsudoku-state-v2';
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
  const timerSubEl = $('#timerSub');
  const difficultyLabelEl = $('#difficultyLabel');
  const pauseOverlay = $('#pauseOverlay');
  const settingsModal = $('#settingsModal');
  const confirmModal = $('#confirmModal');
  const winModal = $('#winModal');
  const darkModeToggle = $('#darkModeToggle');
  const soundToggle = $('#soundToggle');
  const notesBtn = $('#notesBtn');

  const DIFFICULTY_NAMES = { easy: 'Facile', medium: 'Medio', hard: 'Difficile' };

  let state = null;      // { puzzle, given, values, notes, solution, difficulty, elapsedSeconds, completed, history }
  let selected = null;   // { r, c }
  let timerHandle = null;
  let paused = false;
  let soundEnabled = true;
  let notesMode = false;
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
  function renderTimer() {
    const t = formatTime(state.elapsedSeconds);
    timerEl.textContent = t;
    timerSubEl.textContent = t;
  }
  function startTimer() {
    stopTimer();
    timerHandle = setInterval(() => {
      if (paused || !state || state.completed) return;
      state.elapsedSeconds++;
      renderTimer();
      if (state.elapsedSeconds % 5 === 0) saveState();
    }, 1000);
  }
  function stopTimer() {
    if (timerHandle) clearInterval(timerHandle);
    timerHandle = null;
  }

  /* ── Note (matite): array 9x9 di array di 9 booleani ──────────────────── */
  function emptyNotesGrid() {
    return Array.from({ length: SIZE }, () => Array.from({ length: SIZE }, () => Array(9).fill(false)));
  }
  function cloneNotesCell(cell) { return cell.slice(); }

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

        const value = document.createElement('span');
        value.className = 'cell-value';
        cell.appendChild(value);

        const notes = document.createElement('div');
        notes.className = 'cell-notes';
        for (let n = 1; n <= 9; n++) {
          const noteDigit = document.createElement('span');
          noteDigit.dataset.n = n;
          notes.appendChild(noteDigit);
        }
        cell.appendChild(notes);

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
    notesBtn.classList.toggle('active', notesMode);
  }

  function renderCell(r, c) {
    const el = cellEl(r, c);
    const v = state.values[r][c];
    const isGiven = state.given[r][c];
    el.querySelector('.cell-value').textContent = v ? String(v) : '';
    el.classList.toggle('given', isGiven);
    el.classList.toggle('has-notes', v === 0);

    if (v === 0) {
      const cellNotes = state.notes[r][c];
      el.querySelectorAll('.cell-notes span').forEach((span) => {
        const n = Number(span.dataset.n);
        span.textContent = cellNotes[n - 1] ? n : '';
      });
    }

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

  function pushHistory(r, c) {
    state.history.push({
      r, c,
      prevValue: state.values[r][c],
      prevNotes: cloneNotesCell(state.notes[r][c]),
    });
    if (state.history.length > 200) state.history.shift();
  }

  function onKeyTap(num) {
    if (paused || !state || !selected) return;
    const { r, c } = selected;
    if (state.given[r][c]) return; // le celle date all'inizio non si modificano

    // Modalità Note: le matite si segnano solo su celle ancora vuote.
    if (notesMode && num !== 0 && state.values[r][c] === 0) {
      pushHistory(r, c);
      state.notes[r][c][num - 1] = !state.notes[r][c][num - 1];
      renderAll();
      saveState();
      sfxTap();
      return;
    }

    pushHistory(r, c);
    state.values[r][c] = num;
    state.notes[r][c] = Array(9).fill(false); // un valore reale sostituisce le matite
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

  function onUndo() {
    if (paused || !state || !state.history.length) return;
    const move = state.history.pop();
    state.values[move.r][move.c] = move.prevValue;
    state.notes[move.r][move.c] = move.prevNotes;
    selected = { r: move.r, c: move.c };
    renderAll();
    saveState();
    sfxTap();
  }

  function onHint() {
    if (paused || !state) return;
    let target = selected;
    if (!target || state.given[target.r][target.c] || state.values[target.r][target.c] !== 0) {
      target = null;
      outer:
      for (let r = 0; r < SIZE; r++) {
        for (let c = 0; c < SIZE; c++) {
          if (!state.given[r][c] && state.values[r][c] === 0) { target = { r, c }; break outer; }
        }
      }
    }
    if (!target) return; // schema già completo

    const { r, c } = target;
    pushHistory(r, c);
    state.values[r][c] = state.solution[r][c];
    state.notes[r][c] = Array(9).fill(false);
    selected = { r, c };
    renderAll();
    saveState();
    sfxTap();

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
    const { puzzle, solution } = Engine.generatePuzzle(difficulty);
    const given = puzzle.map((row) => row.map((v) => v !== 0));
    state = {
      puzzle,
      given,
      values: Engine.cloneBoard(puzzle),
      notes: emptyNotesGrid(),
      solution,
      difficulty,
      elapsedSeconds: 0,
      completed: false,
      history: [],
    };
    selected = null;
    notesMode = false;
    saveState();
    enterGameScreen();
  }

  function resumeGame(saved) {
    state = saved;
    if (!state.notes) state.notes = emptyNotesGrid();
    if (!state.history) state.history = [];
    selected = null;
    notesMode = false;
    enterGameScreen();
  }

  function enterGameScreen() {
    startScreen.classList.add('hidden');
    gameScreen.classList.remove('hidden');
    difficultyLabelEl.textContent = DIFFICULTY_NAMES[state.difficulty] || '';
    renderTimer();
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

  /* ── Pausa (manuale tramite icona orologio, o automatica in background) ─ */
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

  $('#pauseBtn').addEventListener('click', () => setPaused(true));
  $('#undoBtn').addEventListener('click', onUndo);
  $('#undoBtn2').addEventListener('click', onUndo);
  $('#hintBtn').addEventListener('click', onHint);
  $('#eraseBtn2').addEventListener('click', () => onKeyTap(0));
  notesBtn.addEventListener('click', () => {
    notesMode = !notesMode;
    notesBtn.classList.toggle('active', notesMode);
  });

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
  $('#menuBtn').addEventListener('click', () => {
    hideModal(settingsModal);
    backToMenu();
  });

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
    if (e.key === 'z' && (e.ctrlKey || e.metaKey)) { onUndo(); return; }
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
