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
  const BOLD_NUMBERS_KEY = 'vsudoku-bold-numbers';
  const MUSIC_ENABLED_KEY = 'vsudoku-music-enabled';
  const MUSIC_TRACK_KEY = 'vsudoku-music-track';
  const PALETTE_KEY = 'vsudoku-palette';
  const CUSTOM_TRACK_DB = 'vsudoku-db';
  const CUSTOM_TRACK_STORE = 'tracks';
  const CUSTOM_TRACK_ID = 'custom';
  const HINT_USAGE_KEY = 'vsudoku-hint-usage';
  const STATS_KEY = 'vsudoku-stats';
  const FREE_HINTS_PER_DAY = 3;

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
  const statsModal = $('#statsModal');
  const darkModeToggle = $('#darkModeToggle');
  const soundToggle = $('#soundToggle');
  const boldNumbersToggle = $('#boldNumbersToggle');
  const musicToggle = $('#musicToggle');
  const trackPicker = $('#trackPicker');
  const importAudioBtn = $('#importAudioBtn');
  const audioFileInput = $('#audioFileInput');
  const customTrackNameEl = $('#customTrackName');
  const palettePicker = $('#palettePicker');
  const notesBtn = $('#notesBtn');
  const resolveConflictBtn = $('#resolveConflictBtn');
  const quizModal = $('#adQuizModal');
  const quizStatus = $('#quizStatus');
  const quizRules = $('#quizRules');
  const quizGrid = $('#quizGrid');
  const quizBanner = $('#quizBanner');
  const quizStartBtn = $('#quizStartBtn');

  const DIFFICULTY_NAMES = { easy: 'Facile', medium: 'Medio', hard: 'Difficile' };

  let state = null;      // { puzzle, given, values, notes, solution, difficulty, elapsedSeconds, completed, history }
  let selected = null;   // { r, c }
  let timerHandle = null;
  let paused = false;
  let soundEnabled = true;
  let musicEnabled = false;
  let currentTrackId = 'ocean';
  let musicStopFn = null;
  let musicGain = null;
  let notesMode = false;
  // 'win' | 'abandon' | null — tiene traccia del motivo per cui sta per partire
  // una nuova partita, per decidere se mostrare il quiz+ad (vedi newGame()).
  // Serve perché backToMenu() azzera `state` prima che newGame() possa
  // controllare se la partita precedente era stata vinta o abbandonata.
  let pendingAdContext = null;
  let audioCtx = null;
  let customTrackName = '';
  let customAudioEl = null;

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
    return audioCtx;
  }
  function playTone(ctx, freq, duration, type) {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type || 'sine';
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(0.0001, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.35, ctx.currentTime + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + duration);
    osc.connect(gain).connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + duration + 0.02);
  }
  function beep(freq, duration, type) {
    if (!soundEnabled) return;
    const ctx = ensureAudio();
    if (!ctx) return;
    // Il contesto audio va "risvegliato" con resume() dopo un gesto utente;
    // se lo si schedula subito, sui primi tocchi (o al ritorno in foreground)
    // resta ancora sospeso e il suono non parte. Si attende che sia attivo.
    if (ctx.state === 'running') {
      playTone(ctx, freq, duration, type);
    } else {
      ctx.resume().then(() => playTone(ctx, freq, duration, type)).catch(() => {});
    }
  }
  const sfxTap = () => beep(520, 0.09, 'sine');
  const sfxError = () => beep(160, 0.2, 'square');
  const sfxWin = () => [523, 659, 784, 1047].forEach((f, i) => setTimeout(() => beep(f, 0.24, 'triangle'), i * 110));

  /* ── Musica ambient: tracce zen generate al volo, nessun file da scaricare ─
   * Ogni traccia è un piccolo grafo WebAudio (rumore filtrato + LFO + note
   * sparse) che suona in loop senza soluzione di continuità e senza asset
   * audio esterni (quindi nessun problema di licenza).
   */
  function makeNoiseBuffer(ctx, seconds) {
    const buffer = ctx.createBuffer(1, Math.floor(ctx.sampleRate * seconds), ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
    return buffer;
  }
  function makeBrownBuffer(ctx, seconds) {
    const buffer = ctx.createBuffer(1, Math.floor(ctx.sampleRate * seconds), ctx.sampleRate);
    const data = buffer.getChannelData(0);
    let last = 0;
    for (let i = 0; i < data.length; i++) {
      const white = Math.random() * 2 - 1;
      last = (last + 0.02 * white) / 1.02;
      data[i] = last * 3.5; // compensa il volume naturalmente basso del brown noise
    }
    return buffer;
  }
  function disconnectAll(nodes) {
    nodes.forEach((n) => { try { n.disconnect(); } catch (e) {} });
  }
  function stopAll(nodes) {
    nodes.forEach((n) => { try { n.stop(); } catch (e) {} });
  }

  function buildOceanTrack(ctx, dest) {
    const noise = ctx.createBufferSource();
    noise.buffer = makeBrownBuffer(ctx, 4);
    noise.loop = true;

    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 500;
    filter.Q.value = 0.6;

    const gain = ctx.createGain();
    gain.gain.value = 0.5;

    const filterLfo = ctx.createOscillator();
    filterLfo.frequency.value = 0.07;
    const filterLfoGain = ctx.createGain();
    filterLfoGain.gain.value = 300;
    filterLfo.connect(filterLfoGain).connect(filter.frequency);

    const swell = ctx.createOscillator();
    swell.frequency.value = 0.05;
    const swellGain = ctx.createGain();
    swellGain.gain.value = 0.25;
    swell.connect(swellGain).connect(gain.gain);

    noise.connect(filter).connect(gain).connect(dest);
    noise.start(); filterLfo.start(); swell.start();

    return () => {
      stopAll([noise, filterLfo, swell]);
      disconnectAll([noise, filter, gain, filterLfo, filterLfoGain, swell, swellGain]);
    };
  }

  function buildRainTrack(ctx, dest) {
    const noise = ctx.createBufferSource();
    noise.buffer = makeNoiseBuffer(ctx, 3);
    noise.loop = true;

    const highpass = ctx.createBiquadFilter();
    highpass.type = 'highpass';
    highpass.frequency.value = 1200;
    const lowpass = ctx.createBiquadFilter();
    lowpass.type = 'lowpass';
    lowpass.frequency.value = 6000;

    const gain = ctx.createGain();
    gain.gain.value = 0.16;

    const lfo = ctx.createOscillator();
    lfo.frequency.value = 0.15;
    const lfoGain = ctx.createGain();
    lfoGain.gain.value = 0.04;
    lfo.connect(lfoGain).connect(gain.gain);

    noise.connect(highpass).connect(lowpass).connect(gain).connect(dest);
    noise.start(); lfo.start();

    const dropNotes = [523.25, 587.33, 659.25, 783.99, 880.0];
    let dropTimer = null;
    (function scheduleDrop() {
      dropTimer = setTimeout(() => {
        const osc = ctx.createOscillator();
        const dGain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.value = dropNotes[Math.floor(Math.random() * dropNotes.length)];
        dGain.gain.setValueAtTime(0.0001, ctx.currentTime);
        dGain.gain.exponentialRampToValueAtTime(0.05, ctx.currentTime + 0.02);
        dGain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.6);
        osc.connect(dGain).connect(dest);
        osc.start();
        osc.stop(ctx.currentTime + 0.7);
        scheduleDrop();
      }, 700 + Math.random() * 2200);
    })();

    return () => {
      clearTimeout(dropTimer);
      stopAll([noise, lfo]);
      disconnectAll([noise, highpass, lowpass, gain, lfo, lfoGain]);
    };
  }

  function buildChimesTrack(ctx, dest) {
    const noise = ctx.createBufferSource();
    noise.buffer = makeNoiseBuffer(ctx, 3);
    noise.loop = true;
    const bandpass = ctx.createBiquadFilter();
    bandpass.type = 'bandpass';
    bandpass.frequency.value = 800;
    bandpass.Q.value = 0.5;
    const windGain = ctx.createGain();
    windGain.gain.value = 0.025;
    noise.connect(bandpass).connect(windGain).connect(dest);
    noise.start();

    const scale = [293.66, 349.23, 392.0, 440.0, 523.25, 587.33]; // pentatonica calma
    let chimeTimer = null;
    (function scheduleChime() {
      chimeTimer = setTimeout(() => {
        const octave = Math.random() < 0.3 ? 2 : 1;
        const freq = scale[Math.floor(Math.random() * scale.length)] * octave;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.value = freq;
        gain.gain.setValueAtTime(0.0001, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.09, ctx.currentTime + 0.6);
        gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 3.5);
        osc.connect(gain).connect(dest);
        osc.start();
        osc.stop(ctx.currentTime + 3.6);
        scheduleChime();
      }, 2500 + Math.random() * 4500);
    })();

    return () => {
      clearTimeout(chimeTimer);
      stopAll([noise]);
      disconnectAll([noise, bandpass, windGain]);
    };
  }

  function buildMeditationTrack(ctx, dest) {
    const freqs = [130.81, 196.0, 261.63]; // C3, G3, C4: quinta + ottava, drone caldo
    const oscs = [];
    const gains = [];
    const masterGain = ctx.createGain();
    masterGain.gain.value = 0.16;

    const breathe = ctx.createOscillator();
    breathe.frequency.value = 0.06;
    const breatheGain = ctx.createGain();
    breatheGain.gain.value = 0.06;
    breathe.connect(breatheGain).connect(masterGain.gain);

    freqs.forEach((f, i) => {
      const osc = ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.value = f;
      const g = ctx.createGain();
      g.gain.value = i === 0 ? 0.5 : 0.3;
      osc.connect(g).connect(masterGain);
      osc.start();
      oscs.push(osc);
      gains.push(g);
    });
    masterGain.connect(dest);
    breathe.start();

    return () => {
      stopAll([...oscs, breathe]);
      disconnectAll([...oscs, ...gains, masterGain, breathe, breatheGain]);
    };
  }

  const MUSIC_TRACKS = [
    { id: 'ocean', build: buildOceanTrack },
    { id: 'rain', build: buildRainTrack },
    { id: 'chimes', build: buildChimesTrack },
    { id: 'meditation', build: buildMeditationTrack },
  ];

  /* ── Traccia personalizzata: importata dal telefono, salvata in IndexedDB
   * (localStorage non è adatto a file binari/di dimensioni non banali). ──── */
  function openTrackDB() {
    return new Promise((resolve, reject) => {
      const req = indexedDB.open(CUSTOM_TRACK_DB, 1);
      req.onupgradeneeded = () => { req.result.createObjectStore(CUSTOM_TRACK_STORE); };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  }
  function saveCustomTrack(blob, name) {
    return openTrackDB().then((db) => new Promise((resolve, reject) => {
      const tx = db.transaction(CUSTOM_TRACK_STORE, 'readwrite');
      tx.objectStore(CUSTOM_TRACK_STORE).put({ blob, name }, CUSTOM_TRACK_ID);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    }));
  }
  function loadCustomTrack() {
    return openTrackDB().then((db) => new Promise((resolve, reject) => {
      const tx = db.transaction(CUSTOM_TRACK_STORE, 'readonly');
      const req = tx.objectStore(CUSTOM_TRACK_STORE).get(CUSTOM_TRACK_ID);
      req.onsuccess = () => resolve(req.result || null);
      req.onerror = () => reject(req.error);
    }));
  }
  function stopCustomAudio() {
    if (customAudioEl) {
      customAudioEl.pause();
      if (customAudioEl.src) { URL.revokeObjectURL(customAudioEl.src); customAudioEl.src = ''; }
    }
  }
  function startCustomAudio() {
    loadCustomTrack().then((record) => {
      if (!record) return;
      if (!customAudioEl) {
        customAudioEl = document.createElement('audio');
        customAudioEl.loop = true;
        customAudioEl.volume = 0.5;
        document.body.appendChild(customAudioEl);
      }
      customAudioEl.src = URL.createObjectURL(record.blob);
      customAudioEl.play().catch(() => {});
    }).catch(() => {});
  }

  function stopMusic() {
    if (musicStopFn) { musicStopFn(); musicStopFn = null; }
    if (musicGain) { try { musicGain.disconnect(); } catch (e) {} musicGain = null; }
    stopCustomAudio();
  }
  function startMusic() {
    stopMusic();
    if (currentTrackId === CUSTOM_TRACK_ID) { startCustomAudio(); return; }
    const ctx = ensureAudio();
    if (!ctx) return;
    musicGain = ctx.createGain();
    musicGain.gain.value = 0.7;
    musicGain.connect(ctx.destination);
    const track = MUSIC_TRACKS.find((t) => t.id === currentTrackId) || MUSIC_TRACKS[0];
    const play = () => { musicStopFn = track.build(ctx, musicGain); };
    if (ctx.state === 'running') play();
    else ctx.resume().then(play).catch(() => {});
  }
  function refreshMusic() {
    const inGame = !gameScreen.classList.contains('hidden');
    if (musicEnabled && inGame && !paused) startMusic();
    else stopMusic();
  }

  /* ── Tema chiaro/scuro ─────────────────────────────────────────────────── */
  function applyTheme(theme) {
    document.documentElement.dataset.theme = theme;
    try { localStorage.setItem(THEME_KEY, theme); } catch (e) {}
    const meta = document.getElementById('themeColor');
    if (meta) meta.setAttribute('content', theme === 'dark' ? '#17140F' : '#EAE3D5');
    darkModeToggle.checked = theme === 'dark';
  }

  function applyBoldNumbers(enabled) {
    document.documentElement.dataset.boldNumbers = enabled ? '1' : '0';
    try { localStorage.setItem(BOLD_NUMBERS_KEY, enabled ? '1' : '0'); } catch (e) {}
    boldNumbersToggle.checked = enabled;
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
    refreshResolveConflictButton();
  }

  // Il tasto "Risolvi" si attiva solo quando la casella selezionata contiene
  // un numero sbagliato (diverso dalla soluzione).
  function refreshResolveConflictButton() {
    let isWrong = false;
    if (selected) {
      const { r, c } = selected;
      const v = state.values[r][c];
      isWrong = v !== 0 && v !== state.solution[r][c];
    }
    resolveConflictBtn.disabled = !isWrong;
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

    // Sbagliato = non combacia con la soluzione, non solo "confligge con un'altra
    // casella già scritta": così un numero errato viene segnalato subito, anche
    // se al momento non crea ancora un doppione visibile su riga/colonna/riquadro.
    const hasConflict = v !== 0 && v !== state.solution[r][c];
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

  /* ── Animazione "a spirale" quando si completa riga/colonna/riquadro ───── */
  const BOX_SPIRAL_ORDER = [0, 1, 2, 5, 8, 7, 6, 3, 4]; // indici locali 0-8 (lettura per righe) in ordine a spirale

  function isGroupComplete(cells) {
    const seen = new Set();
    for (const [rr, cc] of cells) {
      const v = state.values[rr][cc];
      if (v === 0 || seen.has(v)) return false;
      seen.add(v);
    }
    return true;
  }

  function getCompletedGroups(r, c) {
    const groups = [];
    const rowCells = Array.from({ length: SIZE }, (_, i) => [r, i]);
    if (isGroupComplete(rowCells)) groups.push(rowCells);
    const colCells = Array.from({ length: SIZE }, (_, i) => [i, c]);
    if (isGroupComplete(colCells)) groups.push(colCells);
    const br = r - (r % 3), bc = c - (c % 3);
    const boxCells = [];
    for (let rr = 0; rr < 3; rr++) for (let cc = 0; cc < 3; cc++) boxCells.push([br + rr, bc + cc]);
    if (isGroupComplete(boxCells)) groups.push(boxCells);
    return groups;
  }

  function celebrateCompletedGroups(r, c) {
    const groups = getCompletedGroups(r, c);
    if (!groups.length) return;

    const orderByKey = new Map(); // "r,c" → indice di ritardo (il più basso vince)
    groups.forEach((cells) => {
      const isRow = cells.every(([rr]) => rr === cells[0][0]);
      const isCol = cells.every(([, cc]) => cc === cells[0][1]);
      cells.forEach(([rr, cc], i) => {
        // Riga/colonna: onda in ordine di lettura. Riquadro 3x3: ordine a spirale.
        const order = (isRow || isCol) ? i : BOX_SPIRAL_ORDER.indexOf((rr % 3) * 3 + (cc % 3));
        const key = `${rr},${cc}`;
        if (!orderByKey.has(key) || orderByKey.get(key) > order) orderByKey.set(key, order);
      });
    });

    const STEP_MS = 55;
    const DURATION_MS = 900;
    let maxDelay = 0;
    orderByKey.forEach((order, key) => {
      const [rr, cc] = key.split(',').map(Number);
      const delay = order * STEP_MS;
      maxDelay = Math.max(maxDelay, delay);
      const valueEl = cellEl(rr, cc).querySelector('.cell-value');
      valueEl.style.setProperty('--cd', `${delay}ms`);
      valueEl.classList.add('celebrate');
    });

    setTimeout(() => {
      orderByKey.forEach((order, key) => {
        const [rr, cc] = key.split(',').map(Number);
        const valueEl = cellEl(rr, cc).querySelector('.cell-value');
        valueEl.classList.remove('celebrate');
        valueEl.style.removeProperty('--cd');
      });
    }, maxDelay + DURATION_MS + 50);
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
      const isWrong = num !== state.solution[r][c];
      if (isWrong) sfxError();
      else { sfxTap(); celebrateCompletedGroups(r, c); }
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

  // Cancella la casella selezionata se contiene un numero sbagliato (diverso
  // dalla soluzione), lasciando intatto il resto della griglia.
  function onResolveConflict() {
    if (paused || !state || !selected) return;
    const { r, c } = selected;
    if (state.given[r][c]) return;
    const v = state.values[r][c];
    if (v === 0 || v === state.solution[r][c]) return;

    pushHistory(r, c);
    state.values[r][c] = 0;
    renderAll();
    saveState();
    sfxTap();
  }

  /* ── Mini-gioco "indovina i colori" prima del video pubblicitario ────────
   * Si mostra una griglia 3x3 con 3 celle blu, 3 rosse, 3 gialle per un po';
   * poi i colori si nascondono e si chiede di ritrovarli, uno alla volta
   * (blu → rosso → giallo). Se l'utente indovina tutti e tre, il video
   * pubblicitario NON parte — ma per garantire comunque un minimo di
   * guadagno si mostra un breve banner al posto del video. Se sbaglia anche
   * una sola casella, parte il video pubblicitario normale.
   */
  const QUIZ_COLORS = ['blue', 'red', 'yellow'];
  const QUIZ_COLOR_NAMES = { blue: 'BLU', red: 'ROSSO', yellow: 'GIALLO' };
  const QUIZ_MEMORIZE_MS = 2500;
  const QUIZ_BANNER_MS = 3000;

  function buildQuizGrid() {
    quizGrid.innerHTML = '';
    const colors = [];
    QUIZ_COLORS.forEach((c) => colors.push(c, c, c));
    for (let i = colors.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [colors[i], colors[j]] = [colors[j], colors[i]];
    }
    const numbers = [1, 2, 3, 4, 5, 6, 7, 8, 9].sort(() => Math.random() - 0.5);
    colors.forEach((color, i) => {
      const cell = document.createElement('div');
      // Niente colore per ora: si vedono solo i numeri finché l'utente non
      // preme "Inizia" (vedi runColorQuiz), per dargli tempo di leggere le
      // regole prima che parta il conto alla rovescia della memorizzazione.
      cell.className = 'quiz-cell';
      cell.textContent = numbers[i];
      cell.dataset.color = color;
      quizGrid.appendChild(cell);
    });
  }

  // Ritorna una Promise<boolean>: true se l'utente indovina tutti e 3 i colori
  // (in quel caso viene mostrato un breve banner al posto del video).
  function runColorQuiz() {
    return new Promise((resolve) => {
      buildQuizGrid(); // solo numeri, niente colori: si vedono premendo "Inizia"
      quizGrid.classList.remove('hidden');
      quizBanner.classList.add('hidden');
      quizRules.classList.remove('hidden');
      quizStatus.textContent = 'Leggi con calma, poi premi "Inizia".';
      quizStartBtn.classList.remove('hidden');
      showModal(quizModal);
      sfxTap();
      // Il banner resta agganciato alla finestra del quiz per tutta la sua durata,
      // sia che l'utente indovini (niente video) sia che sbagli (parte il video):
      // il guadagno minimo dal banner è comunque garantito. Slot pubblicitario
      // separato da quello fisso di gioco (vedi ads.js AD_IDS.bannerQuiz).
      if (window.SudokuAds) window.SudokuAds.showBanner('quiz');

      let finished = false;
      const remaining = QUIZ_COLORS.slice();

      function askNext() {
        quizStatus.textContent = `Tocca la casella che era ${QUIZ_COLOR_NAMES[remaining[0]]}`;
      }

      function finish(result) {
        if (finished) return;
        finished = true;
        quizGrid.removeEventListener('click', onCellClick);
        if (result) {
          quizStatus.textContent = 'Hai indovinato tutti i colori! 🎉';
          quizGrid.classList.add('hidden');
          quizBanner.classList.remove('hidden');
          setTimeout(() => {
            hideModal(quizModal);
            resolve(true);
          }, QUIZ_BANNER_MS);
        } else {
          quizStatus.textContent = 'Sbagliato! Parte la pubblicità…';
          sfxError();
          setTimeout(() => { hideModal(quizModal); resolve(false); }, 900);
        }
      }

      function onCellClick(e) {
        if (finished) return;
        const cell = e.target.closest('.quiz-cell');
        if (!cell) return;
        const target = remaining[0];
        if (cell.dataset.color === target) {
          cell.classList.add(target);
          remaining.shift();
          sfxTap();
          if (remaining.length === 0) finish(true);
          else askNext();
        } else {
          cell.classList.add('error');
          finish(false);
        }
      }

      // Il conto alla rovescia per memorizzare parte SOLO da quando l'utente
      // preme "Inizia" (dopo aver letto le regole con calma), non prima.
      quizStartBtn.addEventListener('click', () => {
        if (finished) return;
        quizStartBtn.classList.add('hidden');
        quizRules.classList.add('hidden');
        quizStatus.textContent = 'Memorizza i colori…';
        quizGrid.querySelectorAll('.quiz-cell').forEach((cell) => {
          cell.classList.add(cell.dataset.color);
        });
        sfxTap();

        setTimeout(() => {
          if (finished) return;
          quizGrid.querySelectorAll('.quiz-cell').forEach((cell) => {
            cell.classList.remove('blue', 'red', 'yellow');
          });
          quizGrid.addEventListener('click', onCellClick);
          askNext();
        }, QUIZ_MEMORIZE_MS);
      }, { once: true });
    });
  }

  // Un numero limitato di hint gratuiti al giorno; oltre quello, prima si
  // propone il mini-gioco colori (vedi sopra) e solo se fallisce si passa al
  // video premiato (AdMob). Su web/senza plugin configurato, ads.js non
  // blocca nulla (vedi ads.js).
  async function canUseHint() {
    if (window.SudokuAds && window.SudokuAds.isPro()) return true;
    const today = new Date().toISOString().slice(0, 10);
    let usage = { date: today, used: 0 };
    try {
      const raw = localStorage.getItem(HINT_USAGE_KEY);
      if (raw) usage = JSON.parse(raw);
      if (usage.date !== today) usage = { date: today, used: 0 };
    } catch (e) {}
    if (usage.used < FREE_HINTS_PER_DAY) {
      usage.used++;
      try { localStorage.setItem(HINT_USAGE_KEY, JSON.stringify(usage)); } catch (e) {}
      return true;
    }
    const wonQuiz = await runColorQuiz();
    if (wonQuiz) return true;
    if (window.SudokuAds && typeof window.SudokuAds.showRewarded === 'function') {
      return await window.SudokuAds.showRewarded();
    }
    return true;
  }

  async function onHint() {
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
    if (!(await canUseHint())) return; // rewarded rifiutato/non guadagnato

    const { r, c } = target;
    pushHistory(r, c);
    state.values[r][c] = state.solution[r][c];
    state.notes[r][c] = Array(9).fill(false);
    selected = { r, c };
    renderAll();
    saveState();
    sfxTap();
    celebrateCompletedGroups(r, c);

    if (Engine.isBoardComplete(state.values)) onWin();
  }

  function onWin() {
    state.completed = true;
    stopTimer();
    saveState();
    sfxWin();
    recordWin(state.difficulty, state.elapsedSeconds);
    $('#winDifficulty').textContent = DIFFICULTY_NAMES[state.difficulty] || '';
    $('#winTime').textContent = formatTime(state.elapsedSeconds);
    showModal(winModal);
  }

  /* ── Statistiche (partite vinte e miglior tempo per difficoltà) ─────────── */
  function loadStats() {
    const empty = { easy: { wins: 0, best: null }, medium: { wins: 0, best: null }, hard: { wins: 0, best: null } };
    try {
      const raw = localStorage.getItem(STATS_KEY);
      if (!raw) return empty;
      const parsed = JSON.parse(raw);
      return { ...empty, ...parsed };
    } catch (e) { return empty; }
  }

  function recordWin(difficulty, seconds) {
    const stats = loadStats();
    const entry = stats[difficulty] || { wins: 0, best: null };
    entry.wins++;
    if (entry.best == null || seconds < entry.best) entry.best = seconds;
    stats[difficulty] = entry;
    try { localStorage.setItem(STATS_KEY, JSON.stringify(stats)); } catch (e) {}
  }

  function renderStats() {
    const stats = loadStats();
    const totalWins = (stats.easy.wins || 0) + (stats.medium.wins || 0) + (stats.hard.wins || 0);
    $('#statsTotalWins').textContent = `${totalWins} partit${totalWins === 1 ? 'a vinta' : 'e vinte'} in totale`;

    const rows = { easy: 'Easy', medium: 'Medium', hard: 'Hard' };
    Object.keys(rows).forEach((key) => {
      const entry = stats[key] || { wins: 0, best: null };
      $(`#stats${rows[key]}Wins`).textContent = `${entry.wins} vint${entry.wins === 1 ? 'a' : 'e'}`;
      $(`#stats${rows[key]}Best`).textContent = entry.best != null ? formatTime(entry.best) : '—';
    });
  }

  /* ── Ciclo partita ─────────────────────────────────────────────────────── */
  function newGame(difficulty) {
    // Determiniamo PRIMA di sovrascrivere `state` se la partita che sta per
    // finire era stata vinta (ogni vittoria → quiz+ad sempre) o abbandonata/
    // ricominciata (ogni GAMES_PER_AD → quiz+ad). Se si arriva dal menu dopo
    // un backToMenu(), `state` è già null: usiamo pendingAdContext salvato lì.
    let adContext = null;
    if (state) adContext = state.completed ? 'win' : 'abandon';
    else if (pendingAdContext) adContext = pendingAdContext;
    pendingAdContext = null;

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
    if (adContext === 'win') maybeShowAdAlways();
    else if (adContext === 'abandon') maybeShowPeriodicAd();
  }

  // Quiz colori + eventuale interstitial (se il quiz viene perso). Condiviso
  // dai due punti di innesco sotto.
  async function runQuizGatedAd() {
    const won = await runColorQuiz();
    if (!won && window.SudokuAds.showInterstitial) await window.SudokuAds.showInterstitial();
  }

  // Dopo OGNI vittoria: momento naturale in cui l'utente è più tollerante.
  async function maybeShowAdAlways() {
    if (window.SudokuAds && window.SudokuAds.adsActive && window.SudokuAds.adsActive()) {
      await runQuizGatedAd();
    }
  }

  // Ogni GAMES_PER_AD partite abbandonate/ricominciate senza finirle (vedi
  // ads.js): diradato rispetto alle vittorie per non penalizzare chi riprova.
  async function maybeShowPeriodicAd() {
    if (window.SudokuAds && window.SudokuAds.dueForPeriodicAd()) {
      await runQuizGatedAd();
    }
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
    refreshMusic();
    if (window.SudokuAds) window.SudokuAds.showBanner();
  }

  function backToMenu() {
    stopTimer();
    saveState();
    // Partita abbandonata (non vinta): ricordiamolo per newGame(), che altrimenti
    // non saprebbe più distinguere "vittoria" da "abbandono" una volta che qui
    // sotto azzeriamo `state`.
    if (state && !state.completed) pendingAdContext = 'abandon';
    state = null;
    selected = null;
    gameScreen.classList.add('hidden');
    startScreen.classList.remove('hidden');
    refreshResumeButton();
    refreshMusic();
    if (window.SudokuAds) window.SudokuAds.hideBanner();
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
    refreshMusic();
  }

  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      setPaused(true);
    } else if (window.SudokuAds && !gameScreen.classList.contains('hidden')) {
      // Il banner nativo AdMob è legato al ciclo di vita dell'Activity: quando
      // l'app torna in primo piano (es. dopo blocco schermo, notifica, cambio
      // app) può sparire e non ricomparire da solo se non lo richiediamo di nuovo.
      window.SudokuAds.showBanner();
    }
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
  $('#hintBtn').addEventListener('click', onHint);
  resolveConflictBtn.addEventListener('click', onResolveConflict);
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
  $('#statsBtn').addEventListener('click', () => { renderStats(); showModal(statsModal); });
  $('#statsCloseBtn').addEventListener('click', () => hideModal(statsModal));
  $('#menuBtn').addEventListener('click', () => {
    hideModal(settingsModal);
    backToMenu();
  });

  darkModeToggle.addEventListener('change', () => {
    applyTheme(darkModeToggle.checked ? 'dark' : 'light');
  });
  boldNumbersToggle.addEventListener('change', () => {
    applyBoldNumbers(boldNumbersToggle.checked);
  });
  soundToggle.addEventListener('change', () => {
    soundEnabled = soundToggle.checked;
    try { localStorage.setItem(SOUND_KEY, soundEnabled ? '1' : '0'); } catch (e) {}
  });

  function updateTrackPickerUI() {
    trackPicker.querySelectorAll('.track-btn').forEach((btn) => {
      btn.classList.toggle('active', btn.dataset.track === currentTrackId);
    });
    trackPicker.classList.toggle('disabled', !musicEnabled);
  }
  musicToggle.addEventListener('change', () => {
    musicEnabled = musicToggle.checked;
    try { localStorage.setItem(MUSIC_ENABLED_KEY, musicEnabled ? '1' : '0'); } catch (e) {}
    updateTrackPickerUI();
    refreshMusic();
  });
  trackPicker.querySelectorAll('.track-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      if (btn.dataset.track === CUSTOM_TRACK_ID && !customTrackName) {
        audioFileInput.click(); // nessun file ancora importato: apri subito il selettore
        return;
      }
      currentTrackId = btn.dataset.track;
      try { localStorage.setItem(MUSIC_TRACK_KEY, currentTrackId); } catch (e) {}
      updateTrackPickerUI();
      if (musicEnabled) refreshMusic();
    });
  });

  importAudioBtn.addEventListener('click', () => audioFileInput.click());
  audioFileInput.addEventListener('change', () => {
    const file = audioFileInput.files && audioFileInput.files[0];
    if (!file) return;
    saveCustomTrack(file, file.name).then(() => {
      customTrackName = file.name;
      customTrackNameEl.textContent = `Traccia caricata: ${file.name}`;
      currentTrackId = CUSTOM_TRACK_ID;
      try { localStorage.setItem(MUSIC_TRACK_KEY, currentTrackId); } catch (e) {}
      updateTrackPickerUI();
      if (musicEnabled) refreshMusic();
    }).catch(() => {});
  });

  function applyPalette(id) {
    document.documentElement.dataset.palette = id;
    try { localStorage.setItem(PALETTE_KEY, id); } catch (e) {}
    palettePicker.querySelectorAll('.palette-btn').forEach((btn) => {
      btn.classList.toggle('active', btn.dataset.palette === id);
    });
  }
  palettePicker.querySelectorAll('.palette-btn').forEach((btn) => {
    btn.addEventListener('click', () => applyPalette(btn.dataset.palette));
  });

  const proStatusEl = $('#proStatus');
  function updateProStatus() {
    if (window.SudokuAds && window.SudokuAds.isPro()) {
      proStatusEl.textContent = 'Sei Pro — grazie del supporto! 💛';
    } else {
      proStatusEl.textContent = 'Rimuove la pubblicità e sblocca hint illimitati.';
    }
  }
  $('#buyProBtn').addEventListener('click', async () => {
    if (!window.SudokuBilling) return;
    const ok = await window.SudokuBilling.buyPro();
    proStatusEl.textContent = ok ? 'Sei Pro — grazie del supporto! 💛' : 'Acquisti non disponibili al momento.';
  });
  $('#restoreProBtn').addEventListener('click', async () => {
    if (!window.SudokuBilling) return;
    const ok = await window.SudokuBilling.restorePurchases();
    proStatusEl.textContent = ok ? 'Acquisto ripristinato.' : 'Nessun acquisto da ripristinare.';
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
    let theme = 'light';
    try { theme = localStorage.getItem(THEME_KEY) || 'light'; } catch (e) {}
    applyTheme(theme);
    let boldNumbers = false;
    try { boldNumbers = localStorage.getItem(BOLD_NUMBERS_KEY) === '1'; } catch (e) {}
    applyBoldNumbers(boldNumbers);

    try { soundEnabled = localStorage.getItem(SOUND_KEY) !== '0'; } catch (e) { soundEnabled = true; }
    soundToggle.checked = soundEnabled;

    try { musicEnabled = localStorage.getItem(MUSIC_ENABLED_KEY) === '1'; } catch (e) { musicEnabled = false; }
    try { currentTrackId = localStorage.getItem(MUSIC_TRACK_KEY) || 'ocean'; } catch (e) { currentTrackId = 'ocean'; }
    musicToggle.checked = musicEnabled;
    updateTrackPickerUI();

    let palette = 'terracotta';
    try { palette = localStorage.getItem(PALETTE_KEY) || 'terracotta'; } catch (e) {}
    applyPalette(palette);

    loadCustomTrack().then((record) => {
      if (record) {
        customTrackName = record.name;
        customTrackNameEl.textContent = `Traccia caricata: ${record.name}`;
      }
    }).catch(() => {});

    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('./sw.js', { updateViaCache: 'none' }).catch(() => {});
    }

    if (window.SudokuAds) window.SudokuAds.initAds();
    if (window.SudokuBilling) window.SudokuBilling.initBilling();
    updateProStatus();

    refreshResumeButton();
  }

  init();
})();
