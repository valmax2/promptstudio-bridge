import { getState, addMatch, addXp } from '../store.js';
import { pushMatch } from '../cloud.js';
import { say, stopSpeech } from '../speech.js';
import { escapeHtml, BACK_ICON } from '../utils.js';
import {
  createMatch, addPoint, matchPointDisplay, teamName, isGamePoint, resetCurrentGame, endTimeMatch,
} from '../scoring.js';
import { navigate } from '../router.js';
import { toast } from '../app.js';
import {
  enableRemote, disableRemote, listenBindings,
  connectBleTag, disconnectBleTag,
} from '../ble-remote.js';

let match = null;
let history = [];
let ttsEnabled = true;
let setupMode = 'doubles';
let setupServer = 'A';
let setupFormat = 'classic';
let setupTimeMinutes = 45;
let timeInterval = null;
let stopHwKeys = () => {};

export async function renderScoreboard(el) {
  const { settings } = getState();
  ttsEnabled = settings.ttsEnabled;

  document.getElementById('bottom-nav').classList.add('hidden');
  if (match) startLive(el);
  else paintSetup(el);

  return () => {
    stopSpeech();
    stopHwKeys();
    disableRemote();
    disconnectBleTag();
    clearInterval(timeInterval);
    document.getElementById('bottom-nav').classList.remove('hidden');
  };
}

// Active in both the setup and live screens, so a remote key can e.g. start
// the match while still on the setup form, not just score points once live.
// Connected BLE tags' presses are bridged into the same padel-hw-key event
// HID remotes use (see ble-remote.js), so listenBindings below handles both
// uniformly - including per-pattern actions (1 click / 2 clicks) on a tag.
function setupRemoteListening(el) {
  const { settings } = getState();
  stopHwKeys();
  if (settings.bleRemoteEnabled && settings.remoteBindings.length) {
    enableRemote();
    stopHwKeys = listenBindings(settings.remoteBindings, (action) => handleRemoteAction(action, el));
  } else {
    disableRemote();
  }

  // Physical connections are independent of the bindings toggle above - a
  // tag stays connected whenever enabled, regardless of whether an action
  // has been bound to it yet.
  settings.bleTags.filter((t) => t.enabled).forEach((t) => connectBleTag(t.address).catch(() => {}));
}

function handleRemoteAction(action, el) {
  if (action === 'pointA') { if (match) onPoint('A'); return; }
  if (action === 'pointB') { if (match) onPoint('B'); return; }
  if (action === 'undo') { onUndo(); return; }
  if (action === 'resetGame') {
    if (match && !match.matchOver) {
      match = resetCurrentGame(match);
      stopSpeech();
      paint(el);
    }
    return;
  }
  if (action === 'startMatch') {
    if (!match) el.querySelector('#start-match')?.click();
    return;
  }
  if (action === 'resetMatch') {
    if (match) onReset();
    return;
  }
}

function startLive(el) {
  paint(el);
  setupRemoteListening(el);

  clearInterval(timeInterval);
  if (match.format === 'time' && !match.matchOver) {
    timeInterval = setInterval(() => {
      if (!match || match.matchOver) { clearInterval(timeInterval); return; }
      if (Date.now() >= match.matchEndsAt) {
        clearInterval(timeInterval);
        match = endTimeMatch(match);
        const winner = match.matchWinner ? `Vince ${teamName(match, match.matchWinner)}!` : 'Pareggio!';
        if (ttsEnabled) say(`Tempo scaduto! ${winner}`);
        toast(winner);
      }
      paint(document.querySelector('.screen'));
    }, 1000);
  }
}

// ===== New match setup =====

function paintSetup(el) {
  const singles = setupMode === 'singles';
  el.innerHTML = `
    <div class="sb-root">
      <div class="sb-topbar">
        <button id="sb-back" class="icon-btn" aria-label="Torna alla home">${BACK_ICON}</button>
        <div class="sb-mode">Nuova partita</div>
        <span></span>
      </div>
      <div class="app" style="flex:1;min-height:0;overflow-y:auto;padding-top:16px;">
        <div class="card">
          <h2>Modalità</h2>
          <div class="segmented">
            <button data-mode="doubles" class="${!singles ? 'active' : ''}">👥 Doppio</button>
            <button data-mode="singles" class="${singles ? 'active' : ''}">🙋 Singolo</button>
          </div>
        </div>
        ${singles ? `
        <div class="card">
          <div class="field">
            <label>Giocatore 1</label>
            <input id="name-a" value="Giocatore 1" maxlength="24">
          </div>
          <div class="field mb0">
            <label>Giocatore 2</label>
            <input id="name-b" value="Giocatore 2" maxlength="24">
          </div>
        </div>
        ` : `
        <div class="card">
          <label>Squadra A</label>
          <div class="field">
            <label class="small">Nome squadra (facoltativo)</label>
            <input id="team-name-a" placeholder="es. Squadra Rosa, Napoli…" maxlength="24">
          </div>
          <div class="field">
            <input id="name-a1" placeholder="Giocatore 1" maxlength="24">
          </div>
          <div class="field mb0">
            <input id="name-a2" placeholder="Giocatore 2" maxlength="24">
          </div>
        </div>
        <div class="card">
          <label>Squadra B</label>
          <div class="field">
            <label class="small">Nome squadra (facoltativo)</label>
            <input id="team-name-b" placeholder="es. Squadra Nera, Inter…" maxlength="24">
          </div>
          <div class="field">
            <input id="name-b1" placeholder="Giocatore 3" maxlength="24">
          </div>
          <div class="field mb0">
            <input id="name-b2" placeholder="Giocatore 4" maxlength="24">
          </div>
        </div>
        `}
        <div class="card">
          <label>Chi comincia a battere</label>
          <div class="segmented">
            <button data-server="A" class="${setupServer === 'A' ? 'active' : ''}">${singles ? 'Giocatore 1' : 'Squadra A'}</button>
            <button data-server="B" class="${setupServer === 'B' ? 'active' : ''}">${singles ? 'Giocatore 2' : 'Squadra B'}</button>
          </div>
        </div>
        <div class="card">
          <label>Formato partita</label>
          <div class="segmented">
            <button data-format="classic" class="${setupFormat === 'classic' ? 'active' : ''}">🏆 Classico (set)</button>
            <button data-format="time" class="${setupFormat === 'time' ? 'active' : ''}">⏱️ A tempo continuo</button>
          </div>
          ${setupFormat === 'time' ? `
          <div class="field mt mb0">
            <label>Durata (minuti)</label>
            <input type="number" id="time-minutes" min="5" max="180" step="5" value="${setupTimeMinutes}">
          </div>
          <p class="small mt mb0">Si gioca senza set: vince chi ha fatto più giochi allo scadere del tempo.</p>
          ` : ''}
        </div>
        <button class="btn primary block" id="start-match">Inizia partita</button>
      </div>
    </div>
  `;

  el.querySelector('#sb-back').addEventListener('click', () => navigate('home'));
  el.querySelectorAll('[data-mode]').forEach((btn) => btn.addEventListener('click', () => {
    setupMode = btn.dataset.mode;
    paintSetup(el);
  }));
  el.querySelectorAll('[data-server]').forEach((btn) => btn.addEventListener('click', () => {
    setupServer = btn.dataset.server;
    paintSetup(el);
  }));
  el.querySelectorAll('[data-format]').forEach((btn) => btn.addEventListener('click', () => {
    setupFormat = btn.dataset.format;
    paintSetup(el);
  }));
  el.querySelector('#time-minutes')?.addEventListener('change', (e) => {
    setupTimeMinutes = parseInt(e.target.value, 10) || 45;
  });
  el.querySelector('#start-match').addEventListener('click', () => {
    const { settings } = getState();
    let teamAName, teamBName, teamAPlayers, teamBPlayers;
    if (singles) {
      teamAName = el.querySelector('#name-a').value.trim().slice(0, 24) || 'Giocatore 1';
      teamBName = el.querySelector('#name-b').value.trim().slice(0, 24) || 'Giocatore 2';
      teamAPlayers = [teamAName];
      teamBPlayers = [teamBName];
    } else {
      const a1 = el.querySelector('#name-a1').value.trim().slice(0, 24) || 'Giocatore 1';
      const a2 = el.querySelector('#name-a2').value.trim().slice(0, 24) || 'Giocatore 2';
      const b1 = el.querySelector('#name-b1').value.trim().slice(0, 24) || 'Giocatore 3';
      const b2 = el.querySelector('#name-b2').value.trim().slice(0, 24) || 'Giocatore 4';
      const customTeamA = el.querySelector('#team-name-a').value.trim().slice(0, 24);
      const customTeamB = el.querySelector('#team-name-b').value.trim().slice(0, 24);
      teamAPlayers = [a1, a2];
      teamBPlayers = [b1, b2];
      teamAName = customTeamA || `${a1} / ${a2}`;
      teamBName = customTeamB || `${b1} / ${b2}`;
    }
    match = createMatch({
      teamAName, teamBName, teamAPlayers, teamBPlayers,
      mode: setupMode,
      goldenPoint: settings.goldenPoint,
      superTiebreak3rdSet: settings.superTiebreak3rdSet,
      startingServer: setupServer,
      format: setupFormat,
      timeLimitMinutes: setupTimeMinutes,
    });
    history = [];
    startLive(el);
    if (settings.ttsEnabled) {
      const servingPlayers = setupServer === 'A' ? match.teamAPlayers : match.teamBPlayers;
      const receivingPlayers = setupServer === 'A' ? match.teamBPlayers : match.teamAPlayers;
      say(`Si comincia! Batte ${servingPlayers.join(' e ')}, riceve ${receivingPlayers.join(' e ')}`);
    }
  });

  setupRemoteListening(el);
}

// ===== Live scoreboard =====

function paint(el) {
  let modeLabel;
  if (match.format === 'time') {
    modeLabel = match.matchOver ? 'Partita conclusa' : `⏱️ ${formatRemaining(match.matchEndsAt)}`;
  } else {
    modeLabel = match.matchOver ? 'Partita conclusa' : match.inMatchTiebreak ? 'Super tie-break' : match.inTiebreak ? 'Tie-break' : `Set ${match.sets.length + 1}`;
  }
  const modeBadge = match.mode === 'singles' ? 'Singolo' : 'Doppio';

  el.innerHTML = `
    <div class="sb-root">
      <div class="sb-topbar">
        <button id="sb-back" class="icon-btn" aria-label="Torna alla home">${BACK_ICON}</button>
        <div class="sb-mode">${modeLabel} · ${modeBadge}</div>
        <button id="sb-mute">${ttsEnabled ? '🔊' : '🔇'}</button>
      </div>
      <div class="sb-halves">
        ${teamHalf('A')}
        ${teamHalf('B')}
        ${match.matchOver ? matchOverOverlay() : ''}
      </div>
      <div class="sb-controls">
        <button id="sb-undo" ${history.length ? '' : 'disabled'}>↩️ Annulla</button>
        <button id="sb-settings">⚙️ Impostazioni</button>
        <button id="sb-newmatch">🔄 Nuova partita</button>
      </div>
    </div>
  `;

  el.querySelector('#sb-back').addEventListener('click', () => navigate('home'));
  el.querySelector('#sb-settings').addEventListener('click', () => navigate('settings'));
  el.querySelector('#sb-mute').addEventListener('click', () => {
    ttsEnabled = !ttsEnabled;
    if (!ttsEnabled) stopSpeech();
    paint(el);
  });
  el.querySelector('#sb-undo').addEventListener('click', onUndo);
  el.querySelector('#sb-newmatch').addEventListener('click', onReset);

  if (!match.matchOver) {
    el.querySelector('#half-a').addEventListener('click', () => onPoint('A'));
    el.querySelector('#half-b').addEventListener('click', () => onPoint('B'));
  }
  el.querySelectorAll('[data-edit-name]').forEach((nameEl) => {
    nameEl.addEventListener('click', (e) => {
      e.stopPropagation();
      onEditName(nameEl.dataset.editName, el);
    });
  });
  el.querySelector('#save-match')?.addEventListener('click', (e) => {
    e.stopPropagation();
    onSaveMatch(el);
  });
}

function teamHalf(team) {
  const name = team === 'A' ? match.teamAName : match.teamBName;
  const disp = matchPointDisplay(match)[team.toLowerCase()];
  const gamesInSet = team === 'A' ? match.currentSet.gamesA : match.currentSet.gamesB;
  const setsWon = team === 'A' ? match.setsWonA : match.setsWonB;
  const serving = match.server === team && !match.inTiebreak && !match.inMatchTiebreak && !match.matchOver;
  const badge = badgeFor(team);
  const isTimeFormat = match.format === 'time';

  return `
    <div class="sb-half sb-${team.toLowerCase()}" id="half-${team.toLowerCase()}">
      <div class="sb-name-row" data-edit-name="${team}">${escapeHtml(name)}${serving ? '<span class="serve-ball">🎾</span>' : ''}</div>
      <div class="sb-stack">
        <div class="sb-point">${disp}</div>
        <div class="sb-cap">${isTimeFormat ? 'GIOCHI VINTI' : 'GAME'}</div>
        <div class="sb-mid">${isTimeFormat ? gamesInSet : (match.inMatchTiebreak ? '—' : gamesInSet)}</div>
        <div class="sb-cap">${isTimeFormat ? '' : 'SET'}</div>
        <div class="sb-mid">${isTimeFormat ? '' : setsWon}</div>
      </div>
      ${badge ? `<div class="sb-badge">${badge}</div>` : ''}
    </div>
  `;
}

function formatRemaining(endsAt) {
  const ms = Math.max(0, endsAt - Date.now());
  const totalSeconds = Math.ceil(ms / 1000);
  const mm = String(Math.floor(totalSeconds / 60)).padStart(2, '0');
  const ss = String(totalSeconds % 60).padStart(2, '0');
  return `${mm}:${ss}`;
}

function badgeFor(team) {
  if (match.matchOver || !isGamePoint(match, team)) return null;
  const preview = addPoint(match, team);
  if (preview.events.matchWon) return 'Palla partita';
  if (preview.events.setWon) return 'Palla set';
  if (preview.events.gameWon) return 'Palla gioco';
  return null;
}

function matchOverOverlay() {
  const title = match.matchWinner
    ? `🏆 ${escapeHtml(teamName(match, match.matchWinner))} vince!`
    : '🤝 Pareggio!';
  const detail = match.format === 'time'
    ? `${match.currentSet.gamesA}-${match.currentSet.gamesB} giochi`
    : match.sets.map((s) => `${s.a}-${s.b}`).join(' &nbsp;·&nbsp; ');
  return `
    <div class="sb-overlay">
      <h2>${title}</h2>
      <p>${detail}</p>
      <button class="btn primary" id="save-match">Salva partita nelle statistiche</button>
    </div>
  `;
}

function onPoint(team) {
  if (!match || match.matchOver) return;
  history.push(structuredClone(match));
  const { match: next, announcement, events } = addPoint(match, team);
  match = next;
  if (ttsEnabled) say(announcement);
  if (events.matchWon) toast(announcement);
  paint(document.querySelector('.screen'));
}

function onUndo() {
  if (!match || !history.length) return;
  match = history.pop();
  stopSpeech();
  paint(document.querySelector('.screen'));
}

function onReset() {
  if (!confirm('Iniziare una nuova partita? Il punteggio attuale andrà perso se non salvato.')) return;
  match = null;
  history = [];
  stopSpeech();
  stopHwKeys();
  disableRemote();
  paintSetup(document.querySelector('.screen'));
}

function onEditName(team, el) {
  const current = team === 'A' ? match.teamAName : match.teamBName;
  const next = prompt(`Nome ${match.mode === 'singles' ? 'giocatore' : 'squadra'} ${team === 'A' ? '1' : '2'}`, current);
  if (!next) return;
  if (team === 'A') match.teamAName = next.trim().slice(0, 24) || current;
  else match.teamBName = next.trim().slice(0, 24) || current;
  paint(el);
}

async function onSaveMatch(el) {
  const record = {
    date: new Date().toISOString(),
    teamAName: match.teamAName,
    teamBName: match.teamBName,
    mode: match.mode,
    sets: match.sets,
    winner: match.matchWinner,
    golden: match.goldenPoint,
    superTiebreak: match.superTiebreak3rdSet,
  };
  addMatch(record);
  addXp(match.matchWinner === 'A' ? 40 : 15);
  try { await pushMatch(record); } catch {}
  toast('Partita salvata! Hai guadagnato XP 🎉');
  match = null;
  history = [];
  await renderScoreboard(el);
}
