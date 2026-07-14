import { getState, addMatch, addXp, updateSettings } from '../store.js';
import { pushMatch } from '../cloud.js';
import { say, stopSpeech } from '../speech.js';
import { escapeHtml, BACK_ICON } from '../utils.js';
import {
  createMatch, addPoint, matchPointDisplay, teamName, isGamePoint, resetCurrentGame, endTimeMatch,
} from '../scoring.js';
import { navigate } from '../router.js';
import { toast } from '../app.js';
import { nearestColorName } from '../color-presets.js';
import { LITE_MODE } from '../lite-mode.js';
import {
  enableRemote, disableRemote, listenBindings,
  connectBleTag, disconnectBleTag,
} from '../ble-remote.js';

let match = null;
let history = [];
let ttsEnabled = true;
// Visual-only: hides the smaller game/set rows so just the point shows big
// and full-screen - game/set are still spoken aloud via TTS regardless.
let pointsOnlyMode = false;
let setupMode = 'doubles';
let setupServer = 'A';
// Which of the 2 players on setupServer's team serves first - picked by
// tapping the racket-and-ball button next to a specific player's name,
// instead of only choosing a team.
let setupServerPlayerIdx = 0;
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
  const { settings } = getState();
  const teamAColorName = nearestColorName(settings.teamAColor) || 'Squadra A';
  const teamBColorName = nearestColorName(settings.teamBColor) || 'Squadra B';
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
          <div class="field row" style="align-items:center;gap:8px;">
            <input id="name-a" value="Giocatore 1" maxlength="24" style="flex:1;">
            <button type="button" class="btn-server-pick ${setupServer === 'A' ? 'active' : ''}" data-pick-server="A:0" aria-label="Fa servire per primo">🎾</button>
          </div>
          <div class="field mb0 row" style="align-items:center;gap:8px;">
            <input id="name-b" value="Giocatore 2" maxlength="24" style="flex:1;">
            <button type="button" class="btn-server-pick ${setupServer === 'B' ? 'active' : ''}" data-pick-server="B:0" aria-label="Fa servire per primo">🎾</button>
          </div>
        </div>
        ` : `
        <div class="card">
          <label>Squadra A</label>
          <div class="field">
            <label class="small">Nome squadra (facoltativo, default "${teamAColorName}")</label>
            <input id="team-name-a" placeholder="${teamAColorName}" maxlength="24">
          </div>
          <div class="field row" style="align-items:center;gap:8px;">
            <input id="name-a1" placeholder="Giocatore 1" maxlength="24" style="flex:1;">
            <button type="button" class="btn-server-pick ${setupServer === 'A' && setupServerPlayerIdx === 0 ? 'active' : ''}" data-pick-server="A:0" aria-label="Fa servire per primo">🎾</button>
          </div>
          <div class="field mb0 row" style="align-items:center;gap:8px;">
            <input id="name-a2" placeholder="Giocatore 2" maxlength="24" style="flex:1;">
            <button type="button" class="btn-server-pick ${setupServer === 'A' && setupServerPlayerIdx === 1 ? 'active' : ''}" data-pick-server="A:1" aria-label="Fa servire per primo">🎾</button>
          </div>
        </div>
        <div class="card">
          <label>Squadra B</label>
          <div class="field">
            <label class="small">Nome squadra (facoltativo, default "${teamBColorName}")</label>
            <input id="team-name-b" placeholder="${teamBColorName}" maxlength="24">
          </div>
          <div class="field row" style="align-items:center;gap:8px;">
            <input id="name-b1" placeholder="Giocatore 3" maxlength="24" style="flex:1;">
            <button type="button" class="btn-server-pick ${setupServer === 'B' && setupServerPlayerIdx === 0 ? 'active' : ''}" data-pick-server="B:0" aria-label="Fa servire per primo">🎾</button>
          </div>
          <div class="field mb0 row" style="align-items:center;gap:8px;">
            <input id="name-b2" placeholder="Giocatore 4" maxlength="24" style="flex:1;">
            <button type="button" class="btn-server-pick ${setupServer === 'B' && setupServerPlayerIdx === 1 ? 'active' : ''}" data-pick-server="B:1" aria-label="Fa servire per primo">🎾</button>
          </div>
        </div>
        <p class="small" style="text-align:center;margin:-6px 0 14px;">🎾 Tocca la racchetta per scegliere chi serve per primo/a</p>
        `}
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
        <div class="card">
          <label>Opzioni partita</label>
          <div class="toggle-row">
            <div><strong>Punto d'oro</strong><p class="mb0 small">A 40 pari, il punto successivo decide il gioco</p></div>
            <label class="switch"><input type="checkbox" id="setup-golden" ${settings.goldenPoint ? 'checked' : ''}><span class="slider"></span></label>
          </div>
          <div class="toggle-row">
            <div><strong>Super tie-break al 3° set</strong><p class="mb0 small">Il set decisivo si gioca al tie-break fino a 10</p></div>
            <label class="switch"><input type="checkbox" id="setup-super-tb" ${settings.superTiebreak3rdSet ? 'checked' : ''}><span class="slider"></span></label>
          </div>
          <div class="field mt mb0">
            <label>🕐 Annuncia l'ora ogni tot partite</label>
            <div class="segmented">
              ${[0, 1, 2, 3, 5].map((n) => `<button data-setup-time-announce="${n}" class="${settings.announceTimeEveryMatches === n ? 'active' : ''}">${n === 0 ? 'Mai' : n === 1 ? 'Ogni partita' : `Ogni ${n}`}</button>`).join('')}
            </div>
          </div>
        </div>
        ${LITE_MODE ? '<button class="btn secondary block mt" id="setup-bluetooth">🔵 Configura Bluetooth</button>' : ''}
        <button class="btn primary block mt" id="start-match">Inizia partita</button>
      </div>
    </div>
  `;

  el.querySelector('#sb-back').addEventListener('click', () => navigate('home'));
  el.querySelectorAll('[data-mode]').forEach((btn) => btn.addEventListener('click', () => {
    setupMode = btn.dataset.mode;
    paintSetup(el);
  }));
  el.querySelectorAll('[data-pick-server]').forEach((btn) => btn.addEventListener('click', () => {
    const [team, idx] = btn.dataset.pickServer.split(':');
    setupServer = team;
    setupServerPlayerIdx = parseInt(idx, 10);
    // Toggle the active state directly instead of calling paintSetup(el):
    // a full re-render would wipe out player names already typed in, since
    // these fields aren't bound to any persisted state between renders.
    el.querySelectorAll('[data-pick-server]').forEach((b) => {
      b.classList.toggle('active', b.dataset.pickServer === btn.dataset.pickServer);
    });
  }));
  el.querySelector('#setup-golden')?.addEventListener('change', (e) => updateSettings({ goldenPoint: e.target.checked }));
  el.querySelector('#setup-super-tb')?.addEventListener('change', (e) => updateSettings({ superTiebreak3rdSet: e.target.checked }));
  el.querySelectorAll('[data-setup-time-announce]').forEach((btn) => btn.addEventListener('click', () => {
    updateSettings({ announceTimeEveryMatches: parseInt(btn.dataset.setupTimeAnnounce, 10) });
    paintSetup(el);
  }));
  el.querySelector('#setup-bluetooth')?.addEventListener('click', () => navigate('bluetooth-setup'));
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
      teamAName = customTeamA || nearestColorName(settings.teamAColor) || `${a1} / ${a2}`;
      teamBName = customTeamB || nearestColorName(settings.teamBColor) || `${b1} / ${b2}`;
    }
    match = createMatch({
      teamAName, teamBName, teamAPlayers, teamBPlayers,
      mode: setupMode,
      goldenPoint: settings.goldenPoint,
      superTiebreak3rdSet: settings.superTiebreak3rdSet,
      startingServer: setupServer,
      startingServerPlayerIdx: setupServerPlayerIdx,
      format: setupFormat,
      timeLimitMinutes: setupTimeMinutes,
    });
    history = [];
    startLive(el);
    if (settings.ttsEnabled) {
      const servingPlayers = setupServer === 'A' ? match.teamAPlayers : match.teamBPlayers;
      const receivingPlayers = setupServer === 'A' ? match.teamBPlayers : match.teamAPlayers;
      const servingPlayerName = servingPlayers[setupServerPlayerIdx] || servingPlayers[0];
      say(`Si comincia! Inizia a battere ${servingPlayerName}, riceve ${receivingPlayers.join(' e ')}`);
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
        <div class="row" style="gap:2px;">
          <button id="sb-display-mode" aria-label="Modalità visualizzazione" title="Solo punteggio">${pointsOnlyMode ? '🔢' : '📋'}</button>
          <button id="sb-mute">${ttsEnabled ? '🔊' : '🔇'}</button>
        </div>
      </div>
      <div class="sb-halves">
        ${teamHalf('A')}
        ${teamHalf('B')}
        ${match.matchOver ? matchOverOverlay() : ''}
      </div>
      <div class="sb-controls">
        <button id="sb-undo" ${history.length ? '' : 'disabled'}>↩️ Annulla</button>
        <button id="sb-settings">${LITE_MODE ? '🔵 Bluetooth' : '⚙️ Impostazioni'}</button>
        <button id="sb-newmatch">🔄 Nuova partita</button>
      </div>
    </div>
  `;

  el.querySelector('#sb-back').addEventListener('click', () => navigate('home'));
  el.querySelector('#sb-settings').addEventListener('click', () => navigate(LITE_MODE ? 'bluetooth-setup' : 'settings'));
  el.querySelector('#sb-mute').addEventListener('click', () => {
    ttsEnabled = !ttsEnabled;
    if (!ttsEnabled) stopSpeech();
    paint(el);
  });
  el.querySelector('#sb-display-mode').addEventListener('click', () => {
    pointsOnlyMode = !pointsOnlyMode;
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
  el.querySelectorAll('[data-toggle-server]').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const team = btn.dataset.toggleServer;
      const key = team === 'A' ? 'serverPlayerA' : 'serverPlayerB';
      match[key] = match[key] ? 0 : 1;
      const players = team === 'A' ? match.teamAPlayers : match.teamBPlayers;
      const name = players[match[key]];
      if (ttsEnabled && name) say(`Ora batte ${name}`);
      paint(el);
    });
  });
}

function teamHalf(team) {
  const name = team === 'A' ? match.teamAName : match.teamBName;
  const players = team === 'A' ? match.teamAPlayers : match.teamBPlayers;
  const disp = matchPointDisplay(match)[team.toLowerCase()];
  const gamesInSet = team === 'A' ? match.currentSet.gamesA : match.currentSet.gamesB;
  const setsWon = team === 'A' ? match.setsWonA : match.setsWonB;
  const serving = match.server === team && !match.inTiebreak && !match.inMatchTiebreak && !match.matchOver;
  const isDoubles = players.length > 1;
  const serverPlayerIdx = (team === 'A' ? match.serverPlayerA : match.serverPlayerB) || 0;
  const servingPlayerName = isDoubles ? players[serverPlayerIdx] : null;
  const badge = badgeFor(team);
  const isTimeFormat = match.format === 'time';

  const stackContent = pointsOnlyMode
    ? `<div class="sb-point">${disp}</div>`
    : `
      <div class="sb-point">${disp}</div>
      <div class="sb-cap">${isTimeFormat ? 'GIOCHI VINTI' : 'GAME'}</div>
      <div class="sb-mid">${isTimeFormat ? gamesInSet : (match.inMatchTiebreak ? '—' : gamesInSet)}</div>
      <div class="sb-cap">${isTimeFormat ? '' : 'SET'}</div>
      <div class="sb-mid">${isTimeFormat ? '' : setsWon}</div>
    `;

  return `
    <div class="sb-half sb-${team.toLowerCase()}" id="half-${team.toLowerCase()}">
      <div class="sb-name-row" data-edit-name="${team}">${escapeHtml(name)}${serving ? '<span class="serve-ball">🎾</span>' : ''}</div>
      ${serving && isDoubles ? `<button class="sb-server-player" data-toggle-server="${team}">Batte: ${escapeHtml(servingPlayerName)} ⇄</button>` : ''}
      <div class="sb-stack ${pointsOnlyMode ? 'points-only' : ''}">${stackContent}</div>
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
  await maybeAnnounceTime(el);
  match = null;
  history = [];
  await renderScoreboard(el);
}

// "Ogni tot partite" (Impostazioni > Partita): reads the total match count
// after saving rather than a separate session counter, so "ogni 2" always
// means "after the 2nd, 4th, 6th... match ever recorded" - no extra state
// to keep in sync. Shown as a full-screen black takeover (like the rest of
// the scoreboard) rather than just a toast, since a toast is easy to miss
// mid-changeover and the whole point is that everyone notices the time.
function maybeAnnounceTime(el) {
  const { settings, matches } = getState();
  const n = settings.announceTimeEveryMatches;
  if (!n || matches.length % n !== 0) return Promise.resolve();
  const now = new Date().toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' });
  if (settings.ttsEnabled) say(`Sono le ${now}. Avete tempo per un'altra partita?`);
  el.innerHTML = `
    <div class="sb-root">
      <div class="sb-time-announce">
        <div class="sb-time-announce-clock">${now}</div>
        <p>Avete tempo per un'altra partita?</p>
      </div>
    </div>
  `;
  return new Promise((resolve) => setTimeout(resolve, 3500));
}
