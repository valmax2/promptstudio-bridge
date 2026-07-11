import { getState, addMatch, addXp } from '../store.js';
import { pushMatch } from '../cloud.js';
import { say, stopSpeech } from '../speech.js';
import { escapeHtml } from '../utils.js';
import {
  createMatch, addPoint, matchPointDisplay, teamName, isGamePoint, resetCurrentGame,
} from '../scoring.js';
import { navigate } from '../router.js';
import { toast } from '../app.js';
import {
  enableRemote, disableRemote, listenBindings,
  connectBleTag, disconnectBleTag, onBleTagPressed,
} from '../ble-remote.js';

let match = null;
let history = [];
let ttsEnabled = true;
let setupMode = 'doubles';
let stopHwKeys = () => {};
let stopBleTag = () => {};

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
    stopBleTag();
    disconnectBleTag();
    document.getElementById('bottom-nav').classList.remove('hidden');
  };
}

// Active in both the setup and live screens, so a remote key can e.g. start
// the match while still on the setup form, not just score points once live.
function setupRemoteListening(el) {
  const { settings } = getState();
  stopHwKeys();
  if (settings.bleRemoteEnabled && settings.remoteBindings.length) {
    enableRemote();
    stopHwKeys = listenBindings(settings.remoteBindings, (action) => handleRemoteAction(action, el));
  } else {
    disableRemote();
  }

  stopBleTag();
  const tag = settings.bleTag;
  if (tag.enabled && tag.address) {
    connectBleTag(tag.address).catch(() => {});
    stopBleTag = onBleTagPressed(() => handleRemoteAction(getState().settings.bleTag.action, el));
  }
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
}

// ===== New match setup =====

function paintSetup(el) {
  const singles = setupMode === 'singles';
  el.innerHTML = `
    <div class="sb-root">
      <div class="sb-topbar">
        <button id="sb-back">←</button>
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
        <div class="card">
          <div class="field">
            <label>${singles ? 'Giocatore 1' : 'Squadra 1'}</label>
            <input id="name-a" value="${singles ? 'Giocatore 1' : 'Squadra A'}" maxlength="24">
          </div>
          <div class="field mb0">
            <label>${singles ? 'Giocatore 2' : 'Squadra 2'}</label>
            <input id="name-b" value="${singles ? 'Giocatore 2' : 'Squadra B'}" maxlength="24">
          </div>
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
  el.querySelector('#start-match').addEventListener('click', () => {
    const { settings } = getState();
    const teamAName = el.querySelector('#name-a').value.trim().slice(0, 24) || (singles ? 'Giocatore 1' : 'Squadra A');
    const teamBName = el.querySelector('#name-b').value.trim().slice(0, 24) || (singles ? 'Giocatore 2' : 'Squadra B');
    match = createMatch({
      teamAName, teamBName,
      mode: setupMode,
      goldenPoint: settings.goldenPoint,
      superTiebreak3rdSet: settings.superTiebreak3rdSet,
    });
    history = [];
    startLive(el);
  });

  setupRemoteListening(el);
}

// ===== Live scoreboard =====

function paint(el) {
  const modeLabel = match.matchOver ? 'Partita conclusa' : match.inMatchTiebreak ? 'Super tie-break' : match.inTiebreak ? 'Tie-break' : `Set ${match.sets.length + 1}`;
  const modeBadge = match.mode === 'singles' ? 'Singolo' : 'Doppio';

  el.innerHTML = `
    <div class="sb-root">
      <div class="sb-topbar">
        <button id="sb-back">←</button>
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

  return `
    <div class="sb-half sb-${team.toLowerCase()}" id="half-${team.toLowerCase()}">
      <div class="sb-name-row" data-edit-name="${team}">${escapeHtml(name)}${serving ? '<span class="serve-ball">🎾</span>' : ''}</div>
      <div class="sb-stack">
        <div class="sb-point">${disp}</div>
        <div class="sb-cap">GAME</div>
        <div class="sb-mid">${match.inMatchTiebreak ? '—' : gamesInSet}</div>
        <div class="sb-cap">SET</div>
        <div class="sb-mid">${setsWon}</div>
      </div>
      ${badge ? `<div class="sb-badge">${badge}</div>` : ''}
    </div>
  `;
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
  return `
    <div class="sb-overlay">
      <h2>🏆 ${escapeHtml(teamName(match, match.matchWinner))} vince!</h2>
      <p>${match.sets.map((s) => `${s.a}-${s.b}`).join(' &nbsp;·&nbsp; ')}</p>
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
