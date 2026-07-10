/* Segnapunti — logica app (setup, motore punteggio tennis/padel, punti liberi, undo, persistenza) */
(() => {
  'use strict';

  const STORAGE_KEY = 'segnapunti.v1';

  const TEAM_COLORS = [
    { id: 'indigo', name: 'Blu',     top: '#5B76FF', bot: '#3B5BDB' },
    { id: 'orange', name: 'Arancio', top: '#FF8A3D', bot: '#E8590C' },
    { id: 'green',  name: 'Verde',   top: '#4FC26B', bot: '#2F9E44' },
    { id: 'red',    name: 'Rosso',   top: '#F0524B', bot: '#E03131' },
    { id: 'violet', name: 'Viola',   top: '#B657CE', bot: '#9C36B5' },
    { id: 'teal',   name: 'Ciano',   top: '#17A9BF', bot: '#0C8599' },
    { id: 'pink',   name: 'Rosa',    top: '#F16D97', bot: '#E64980' },
    { id: 'slate',  name: 'Grigio',  top: '#68727D', bot: '#495057' },
  ];

  const TENNIS_POINTS = ['0', '15', '30', '40'];

  // ---------- Stato configurazione (setup) ----------
  let config = {
    mode: 'tennis',       // 'tennis' | 'free'
    format: 'singles',    // 'singles' | 'doubles'
    setsToWin: 2,
    firstServer: 'A',
    voiceAnnouncer: true, // "arbitro" vocale che annuncia punteggio/game/set
    teamA: { name: '', players: ['', ''], colorId: 'indigo' },
    teamB: { name: '', players: ['', ''], colorId: 'orange' },
  };

  // ---------- Stato partita in corso ----------
  let match = null;

  function colorOf(id) { return TEAM_COLORS.find(c => c.id === id) || TEAM_COLORS[0]; }

  function teamLabel(team) {
    const t = config[team === 'A' ? 'teamA' : 'teamB'];
    if (t.name.trim()) return t.name.trim();
    const names = t.players.filter(Boolean);
    if (config.format === 'doubles' && names.length >= 2) return names.join(' / ');
    if (names[0]) return names[0];
    return team === 'A' ? 'Squadra A' : 'Squadra B';
  }

  // ============================================================
  // Persistenza
  // ============================================================
  function persist() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ config, match }));
    } catch (e) { /* storage non disponibile: ignora */ }
  }

  function loadPersisted() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const data = JSON.parse(raw);
      if (data.config) config = data.config;
      if (data.match) match = data.match;
    } catch (e) { /* dati corrotti: riparti da zero */ }
  }

  // ============================================================
  // Motore punteggio
  // ============================================================
  function createMatch() {
    return {
      mode: config.mode,
      points: { A: 0, B: 0 },       // indice in TENNIS_POINTS oppure 'Adv'
      games: { A: 0, B: 0 },
      sets: { A: 0, B: 0 },
      free: { A: 0, B: 0 },
      server: config.firstServer,
      serviceCount: { A: config.firstServer === 'A' ? 1 : 0, B: config.firstServer === 'B' ? 1 : 0 },
      side: 'DX',
      tiebreak: false,
      tiePoints: { A: 0, B: 0 },
      history: [],
      finished: false,
      winner: null,
    };
  }

  function other(team) { return team === 'A' ? 'B' : 'A'; }

  function snapshot() {
    // clona lo stato corrente (esclusa la history) per lo stack di undo
    const { history, ...rest } = match;
    return JSON.parse(JSON.stringify(rest));
  }

  function pushHistory() {
    match.history.push(snapshot());
    if (match.history.length > 60) match.history.shift();
  }

  function addPoint(team) {
    if (match.finished) return;
    pushHistory();
    let eventType = 'point';
    if (match.mode === 'free') {
      match.free[team]++;
    } else {
      eventType = match.tiebreak ? tiebreakPoint(team) : tennisPoint(team);
    }
    match.side = match.side === 'DX' ? 'SX' : 'DX';
    announce(eventType, team);
    persist();
    haptic();
  }

  function tennisPoint(team) {
    const opp = other(team);
    const p = match.points;
    if (p[team] === 'Adv') return winGame(team);
    if (p[opp] === 'Adv') { p[opp] = 3; return 'point'; }
    if (p[team] === 3 && p[opp] === 3) { p[team] = 'Adv'; return 'point'; }
    if (p[team] === 3 && p[opp] < 3) return winGame(team);
    p[team]++;
    return 'point';
  }

  function winGame(team) {
    match.points = { A: 0, B: 0 };
    match.games[team]++;
    const opp = other(team);
    if (match.games[team] >= 6 && match.games[team] - match.games[opp] >= 2) {
      return finalizeSet(team);
    } else if (match.games[team] === 6 && match.games[opp] === 6) {
      match.tiebreak = true;
      match.tiePoints = { A: 0, B: 0 };
      return 'game';
    } else {
      switchServer();
      return 'game';
    }
  }

  function tiebreakPoint(team) {
    match.tiePoints[team]++;
    const t = match.tiePoints, opp = other(team);
    if (t[team] >= 7 && t[team] - t[opp] >= 2) {
      match.games[team]++;
      match.tiebreak = false;
      match.tiePoints = { A: 0, B: 0 };
      return finalizeSet(team);
    }
    return 'point';
  }

  function finalizeSet(team) {
    match.sets[team]++;
    match.games = { A: 0, B: 0 };
    match.points = { A: 0, B: 0 };
    if (match.sets[team] >= config.setsToWin) {
      match.finished = true;
      match.winner = team;
      return 'match';
    } else {
      switchServer();
      return 'set';
    }
  }

  function switchServer() {
    const next = other(match.server);
    match.server = next;
    match.serviceCount[next]++;
  }

  function undo() {
    if (!match || match.history.length === 0) return;
    const prev = match.history.pop();
    const history = match.history;
    match = { ...prev, history };
    persist();
    haptic();
  }

  function haptic() {
    try { if (navigator.vibrate) navigator.vibrate(14); } catch (e) { /* no-op */ }
  }

  // ============================================================
  // Arbitro vocale (Text-to-Speech)
  // ============================================================
  function speak(text) {
    if (!config.voiceAnnouncer) return;
    if (!('speechSynthesis' in window)) return;
    try {
      window.speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(text);
      u.lang = 'it-IT';
      u.rate = 1.0;
      window.speechSynthesis.speak(u);
    } catch (e) { /* sintesi vocale non disponibile: ignora */ }
  }

  function announce(eventType, team) {
    if (!config.voiceAnnouncer) return;
    let text;
    if (match.mode === 'free') {
      text = `${match.free.A} a ${match.free.B}`;
    } else if (eventType === 'match') {
      text = `Game, set e partita, ${teamLabel(team)}`;
    } else if (eventType === 'set') {
      text = `Game e set, ${teamLabel(team)}`;
    } else if (eventType === 'game') {
      text = `Game, ${teamLabel(team)}`;
    } else if (match.tiebreak) {
      text = `${match.tiePoints.A} a ${match.tiePoints.B}`;
    } else {
      const p = match.points;
      if (p.A === 'Adv') text = `Vantaggio ${teamLabel('A')}`;
      else if (p.B === 'Adv') text = `Vantaggio ${teamLabel('B')}`;
      else if (p.A === p.B) text = `${TENNIS_POINTS[p.A]} pari`;
      else text = `${TENNIS_POINTS[p.A]} a ${TENNIS_POINTS[p.B]}`;
    }
    speak(text);
  }

  // ============================================================
  // DOM references
  // ============================================================
  const $ = (id) => document.getElementById(id);

  const viewSetup = $('view-setup');
  const viewGame = $('view-game');

  const modeGroup = $('modeGroup');
  const formatGroup = $('formatGroup');
  const setsGroup = $('setsGroup');
  const serverGroup = $('serverGroup');
  const tennisOptions = $('tennisOptions');

  const teamNameA = $('teamNameA'), teamNameB = $('teamNameB');
  const player1A = $('player1A'), player2A = $('player2A');
  const player1B = $('player1B'), player2B = $('player2B');
  const colorPickerA = $('colorPickerA'), colorPickerB = $('colorPickerB');
  const colorPreviewA = $('colorPreviewA'), colorPreviewB = $('colorPreviewB');
  const teamCardA = $('teamCardA'), teamCardB = $('teamCardB');

  const startBtn = $('startBtn');
  const homeBtn = $('homeBtn');
  const settingsBtn = $('settingsBtn');
  const voiceBtn = $('voiceBtn');
  const undoBtn = $('undoBtn');
  const panelA = $('panelA'), panelB = $('panelB');

  const winOverlay = $('winOverlay');
  const settingsBackdrop = $('settingsBackdrop');

  // ============================================================
  // Setup screen: interazioni
  // ============================================================
  function bindSegmented(el, onChange) {
    el.addEventListener('click', (e) => {
      const btn = e.target.closest('.seg-btn');
      if (!btn) return;
      [...el.children].forEach(c => c.classList.remove('active'));
      btn.classList.add('active');
      onChange(btn.dataset.value);
    });
  }

  bindSegmented(modeGroup, (v) => {
    config.mode = v;
    tennisOptions.style.display = v === 'tennis' ? '' : 'none';
  });

  bindSegmented(formatGroup, (v) => {
    config.format = v;
    const show = v === 'doubles';
    player2A.classList.toggle('hidden', !show);
    player2B.classList.toggle('hidden', !show);
  });

  bindSegmented(setsGroup, (v) => { config.setsToWin = Number(v); });
  bindSegmented(serverGroup, (v) => { config.firstServer = v; });

  function renderColorPicker(container, team) {
    container.innerHTML = '';
    TEAM_COLORS.forEach(c => {
      const dot = document.createElement('button');
      dot.type = 'button';
      dot.className = 'swatch' + (config[team].colorId === c.id ? ' selected' : '');
      dot.style.background = `linear-gradient(160deg, ${c.top}, ${c.bot})`;
      dot.style.color = c.bot;
      dot.setAttribute('aria-label', c.name);
      dot.addEventListener('click', () => selectColor(team, c.id));
      container.appendChild(dot);
    });
  }

  function selectColor(team, colorId) {
    const otherTeam = team === 'teamA' ? 'teamB' : 'teamA';
    if (config[otherTeam].colorId === colorId) {
      // evita due squadre con lo stesso colore: scambia
      config[otherTeam].colorId = config[team].colorId;
    }
    config[team].colorId = colorId;
    refreshColorUI();
  }

  function refreshColorUI() {
    renderColorPicker(colorPickerA, 'teamA');
    renderColorPicker(colorPickerB, 'teamB');
    const ca = colorOf(config.teamA.colorId), cb = colorOf(config.teamB.colorId);
    colorPreviewA.style.background = `linear-gradient(160deg, ${ca.top}, ${ca.bot})`;
    colorPreviewB.style.background = `linear-gradient(160deg, ${cb.top}, ${cb.bot})`;
    teamCardA.style.setProperty('--team-color', ca.bot);
    teamCardB.style.setProperty('--team-color', cb.bot);
  }

  function syncInputsFromConfig() {
    teamNameA.value = config.teamA.name;
    teamNameB.value = config.teamB.name;
    player1A.value = config.teamA.players[0];
    player2A.value = config.teamA.players[1];
    player1B.value = config.teamB.players[0];
    player2B.value = config.teamB.players[1];
    modeGroup.querySelectorAll('.seg-btn').forEach(b => b.classList.toggle('active', b.dataset.value === config.mode));
    formatGroup.querySelectorAll('.seg-btn').forEach(b => b.classList.toggle('active', b.dataset.value === config.format));
    setsGroup.querySelectorAll('.seg-btn').forEach(b => b.classList.toggle('active', Number(b.dataset.value) === config.setsToWin));
    serverGroup.querySelectorAll('.seg-btn').forEach(b => b.classList.toggle('active', b.dataset.value === config.firstServer));
    tennisOptions.style.display = config.mode === 'tennis' ? '' : 'none';
    player2A.classList.toggle('hidden', config.format !== 'doubles');
    player2B.classList.toggle('hidden', config.format !== 'doubles');
    refreshColorUI();
  }

  [teamNameA, player1A, player2A].forEach(inp => inp.addEventListener('input', () => {
    config.teamA.name = teamNameA.value;
    config.teamA.players = [player1A.value, player2A.value];
  }));
  [teamNameB, player1B, player2B].forEach(inp => inp.addEventListener('input', () => {
    config.teamB.name = teamNameB.value;
    config.teamB.players = [player1B.value, player2B.value];
  }));

  startBtn.addEventListener('click', () => {
    match = createMatch();
    persist();
    showGame();
  });

  // ============================================================
  // Game screen: rendering
  // ============================================================
  function applyTeamColors() {
    const ca = colorOf(config.teamA.colorId), cb = colorOf(config.teamB.colorId);
    const board = document.querySelector('.scoreboard');
    board.style.setProperty('--team-a-top', ca.top);
    board.style.setProperty('--team-a-bot', ca.bot);
    board.style.setProperty('--team-b-top', cb.top);
    board.style.setProperty('--team-b-bot', cb.bot);
  }

  function pointLabel(team) {
    if (match.mode === 'free') return String(match.free[team]);
    if (match.tiebreak) return String(match.tiePoints[team]);
    const p = match.points[team];
    return p === 'Adv' ? 'Adv' : TENNIS_POINTS[p];
  }

  function serverPlayerName(team) {
    const t = config[team === 'A' ? 'teamA' : 'teamB'];
    if (config.format === 'singles') return t.players[0] || teamLabel(team);
    const idx = (match.serviceCount[team] - 1) % 2;
    return t.players[idx] || t.players[0] || teamLabel(team);
  }

  function render() {
    $('gameNameA').textContent = teamLabel('A');
    $('gameNameB').textContent = teamLabel('B');
    $('scoreA').textContent = pointLabel('A');
    $('scoreB').textContent = pointLabel('B');

    const tennis = match.mode === 'tennis';
    $('subA').style.display = tennis ? '' : 'none';
    $('subB').style.display = tennis ? '' : 'none';
    if (tennis) {
      $('gamesA').textContent = match.games.A;
      $('gamesB').textContent = match.games.B;
      $('setsA').textContent = match.sets.A;
      $('setsB').textContent = match.sets.B;
    }
    $('tieFlagA').classList.toggle('hidden', !match.tiebreak);
    $('tieFlagB').classList.toggle('hidden', !match.tiebreak);

    if (tennis && !match.finished) {
      const serverName = serverPlayerName(match.server);
      $('serveText').innerHTML = `Al servizio: <b>${escapeHtml(serverName)}</b> · ${match.side}`;
      $('serveDot').style.setProperty('--team-color', colorOf(config[match.server === 'A' ? 'teamA' : 'teamB'].colorId).bot);
    } else if (!tennis) {
      $('serveText').textContent = 'Punti liberi';
    }

    undoBtn.disabled = match.history.length === 0;
    voiceBtn.textContent = config.voiceAnnouncer ? '🔊' : '🔇';
    applyTeamColors();

    if (match.finished && !winOverlay.dataset.shownFor) {
      showWinOverlay();
    }
  }

  function escapeHtml(s) {
    const d = document.createElement('div');
    d.textContent = s;
    return d.innerHTML;
  }

  function showWinOverlay() {
    const winner = match.winner;
    winOverlay.dataset.shownFor = String(match.finished);
    $('winTitle').textContent = `${teamLabel(winner)} vince! 🎉`;
    $('winSub').textContent = match.mode === 'tennis'
      ? `Set: ${match.sets.A} - ${match.sets.B}`
      : `Punti: ${match.free.A} - ${match.free.B}`;
    winOverlay.classList.remove('hidden');
  }

  voiceBtn.addEventListener('click', () => {
    config.voiceAnnouncer = !config.voiceAnnouncer;
    if (config.voiceAnnouncer) speak('Arbitro vocale attivo');
    else if ('speechSynthesis' in window) window.speechSynthesis.cancel();
    persist();
    render();
  });

  panelA.addEventListener('click', () => { addPoint('A'); render(); });
  panelB.addEventListener('click', () => { addPoint('B'); render(); });
  undoBtn.addEventListener('click', () => { undo(); render(); winOverlay.dataset.shownFor = ''; winOverlay.classList.add('hidden'); });

  homeBtn.addEventListener('click', () => {
    if (match && !match.finished && (match.history.length > 0)) {
      if (!confirm('Uscire dalla partita in corso? Il punteggio resterà salvato, potrai riprenderlo.')) return;
    }
    showSetup();
  });

  // ---------- Overlay vittoria ----------
  $('rematchBtn').addEventListener('click', () => {
    winOverlay.classList.add('hidden');
    winOverlay.dataset.shownFor = '';
    match = createMatch();
    persist();
    render();
  });
  $('toSetupBtn').addEventListener('click', () => {
    winOverlay.classList.add('hidden');
    winOverlay.dataset.shownFor = '';
    match = null;
    persist();
    showSetup();
  });

  // ---------- Sheet impostazioni ----------
  settingsBtn.addEventListener('click', () => settingsBackdrop.classList.remove('hidden'));
  $('closeSheetBtn').addEventListener('click', () => settingsBackdrop.classList.add('hidden'));
  settingsBackdrop.addEventListener('click', (e) => { if (e.target === settingsBackdrop) settingsBackdrop.classList.add('hidden'); });
  $('restartMatchBtn').addEventListener('click', () => {
    settingsBackdrop.classList.add('hidden');
    match = createMatch();
    persist();
    render();
  });
  $('backToSetupBtn').addEventListener('click', () => {
    settingsBackdrop.classList.add('hidden');
    match = null;
    persist();
    showSetup();
  });

  // ============================================================
  // Navigazione viste
  // ============================================================
  function showSetup() {
    viewGame.classList.remove('active');
    viewSetup.classList.add('active');
    syncInputsFromConfig();
  }

  function showGame() {
    viewSetup.classList.remove('active');
    viewGame.classList.add('active');
    winOverlay.dataset.shownFor = '';
    winOverlay.classList.add('hidden');
    render();
  }

  // ============================================================
  // Avvio
  // ============================================================
  loadPersisted();
  syncInputsFromConfig();
  if (match && !match.finished) {
    showGame();
  } else {
    match = null;
    showSetup();
  }

  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('./sw.js').catch(() => {});
    });
  }
})();
