import { getState, addMatch, updateSettings } from '../store.js';
import { pushMatch } from '../cloud.js';
import { say, stopSpeech } from '../speech.js';
import { escapeHtml, BACK_ICON, uid as genId } from '../utils.js';
import {
  createMatch, addPoint, matchPointDisplay, teamName, isGamePoint, resetCurrentGame, endTimeMatch,
} from '../scoring.js';
import { navigate } from '../router.js';
import { toast } from '../app.js';
import { nearestColorName } from '../color-presets.js';
import { isLiteMode, canExitLiteMode } from '../lite-mode.js';
import { canUseRemote } from '../gate-config.js';
import {
  enableRemote, disableRemote, listenBindings,
  setKeepScreenOn,
} from '../ble-remote.js';

let match = null;
let history = [];
let matchAutoSaved = false;
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
let victoryModalOpen = false;
let serverPickerOpen = false;
let quickSummaryOpen = false;

// In Modalità Light la barra di navigazione non deve MAI ricomparire (né a
// fine partita né tornando al setup): passare sempre da qui invece che da
// classList.remove diretto.
function showNav() {
  if (!isLiteMode()) document.getElementById('bottom-nav').classList.remove('hidden');
}

export async function renderScoreboard(el) {
  const { settings } = getState();
  ttsEnabled = settings.ttsEnabled;
  victoryModalOpen = false;
  serverPickerOpen = false;
  quickSummaryOpen = false;

  setKeepScreenOn(true);
  if (match) {
    startLive(el);
  } else {
    // La barra di navigazione resta visibile qui (configurazione partita) e
    // a fine partita - viene nascosta solo durante il punteggio attivo (in
    // startLive), per lasciare comunque raggiungibili Community/Bluetooth/
    // Impostazioni senza dover tornare indietro con la freccetta.
    showNav();
    paintSetup(el);
  }

  return () => {
    stopSpeech();
    stopHwKeys();
    disableRemote();
    setKeepScreenOn(false);
    clearInterval(timeInterval);
    showNav();
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

  // BLE tags themselves stay connected for as long as the app is open (see
  // js/app.js's reconcileBleTags) - not tied to this screen anymore, so a
  // tag never has to reconnect (and briefly beep/lag) just from navigating
  // away and back.
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
  if (match.matchOver) showNav();
  else document.getElementById('bottom-nav').classList.add('hidden');
  paint(el);
  setupRemoteListening(el);

  clearInterval(timeInterval);
  if (match.format === 'time' && !match.matchOver) {
    timeInterval = setInterval(() => {
      if (!match || match.matchOver) { clearInterval(timeInterval); return; }
      if (Date.now() >= match.matchEndsAt) {
        clearInterval(timeInterval);
        match = endTimeMatch(match);
        const winner = customVictoryAnnouncement(match) || (match.matchWinner ? `Vince ${teamName(match, match.matchWinner)}!` : 'Pareggio!');
        if (ttsEnabled) say(`Tempo scaduto! ${winner}`);
        toast(winner);
        if (match.matchOver && !matchAutoSaved) {
          matchAutoSaved = true;
          saveMatchRecord(match);
        }
      }
      paint(document.querySelector('.screen'));
    }, 1000);
  }
}

// ===== Frase di fine partita personalizzata =====
// Sostituisce l'annuncio predefinito ("Partita vinta da...") quando l'utente
// ne ha scelta una attiva. {vincitore}/{avversario} nel testo diventano i
// nomi reali delle squadre solo a fine partita (qui restano segnaposto).
function currentVictoryPhraseLabel(settings) {
  const active = settings.victoryPhrases.find((p) => p.id === settings.activeVictoryPhraseId);
  return active ? `Attiva: "${escapeHtml(active.text)}"` : 'Predefinita ("Partita vinta da...")';
}

function customVictoryAnnouncement(m) {
  const { settings } = getState();
  const phrase = settings.victoryPhrases.find((p) => p.id === settings.activeVictoryPhraseId);
  if (!phrase || !m.matchWinner) return null;
  const winner = teamName(m, m.matchWinner);
  const loser = teamName(m, m.matchWinner === 'A' ? 'B' : 'A');
  return phrase.text.replaceAll('{vincitore}', winner).replaceAll('{avversario}', loser);
}

function victoryPhraseModal(settings) {
  return `
    <div class="modal-backdrop" id="victory-modal">
      <div class="modal-card">
        <h2><span>🏆 Frase di fine partita</span><button class="icon-btn" id="victory-modal-close" aria-label="Chiudi">✕</button></h2>
        <p class="small">Usa <strong>{vincitore}</strong> e <strong>{avversario}</strong> nel testo: a fine partita vengono sostituiti con i nomi reali delle squadre.</p>
        <div class="mt">
          <label class="row" style="gap:8px;">
            <input type="radio" name="victory-phrase" value="" ${!settings.activeVictoryPhraseId ? 'checked' : ''}>
            <span class="small">Predefinita ("Partita vinta da...")</span>
          </label>
          ${settings.victoryPhrases.map((p) => `
            <div class="row between" style="gap:8px;">
              <label class="row" style="gap:8px;flex:1;">
                <input type="radio" name="victory-phrase" value="${p.id}" ${settings.activeVictoryPhraseId === p.id ? 'checked' : ''}>
                <span class="small">${escapeHtml(p.text)}</span>
              </label>
              <button class="btn ghost small" data-del-victory-phrase="${p.id}">✕</button>
            </div>
          `).join('')}
        </div>
        <div class="field mt">
          <label>Nuova frase</label>
          <input id="new-victory-phrase" placeholder="es. la squadra {vincitore} ha fatto il culo alla squadra {avversario}" maxlength="140">
        </div>
        <button class="btn secondary block" id="add-victory-phrase">+ Aggiungi e attiva</button>
        <button class="btn primary block mt" id="victory-modal-done">Fatto</button>
      </div>
    </div>
  `;
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
        <div class="card">
          <label>🏆 Frase di fine partita</label>
          <p class="small mb0">${currentVictoryPhraseLabel(settings)}</p>
          <button class="btn secondary block mt" id="setup-victory-phrase">Personalizza</button>
        </div>
        ${isLiteMode() ? '<button class="btn secondary block mt" id="setup-bluetooth">🔵 Configura Bluetooth</button>' : ''}
        ${canExitLiteMode() ? '<button class="btn ghost block mt" id="setup-exit-lite">↩️ Esci da Modalità Light</button>' : ''}
        <button class="btn primary block mt" id="start-match">Inizia partita</button>
      </div>
    </div>

    ${victoryModalOpen ? victoryPhraseModal(settings) : ''}
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
  el.querySelector('#setup-exit-lite')?.addEventListener('click', () => {
    updateSettings({ liteModeUser: false });
    navigate('home');
  });
  el.querySelector('#setup-victory-phrase')?.addEventListener('click', () => { victoryModalOpen = true; paintSetup(el); });
  el.querySelector('#victory-modal-close')?.addEventListener('click', () => { victoryModalOpen = false; paintSetup(el); });
  el.querySelector('#victory-modal-done')?.addEventListener('click', () => { victoryModalOpen = false; paintSetup(el); });
  el.querySelector('#victory-modal')?.addEventListener('click', (e) => {
    if (e.target.id === 'victory-modal') { victoryModalOpen = false; paintSetup(el); }
  });
  el.querySelectorAll('[name="victory-phrase"]').forEach((input) => input.addEventListener('change', (e) => {
    updateSettings({ activeVictoryPhraseId: e.target.value || null });
  }));
  el.querySelector('#add-victory-phrase')?.addEventListener('click', () => {
    const input = el.querySelector('#new-victory-phrase');
    const text = input.value.trim().slice(0, 140);
    if (!text) return;
    const phrase = { id: genId(), text };
    const { settings } = getState();
    updateSettings({ victoryPhrases: [...settings.victoryPhrases, phrase], activeVictoryPhraseId: phrase.id });
    input.value = '';
    paintSetup(el);
  });
  el.querySelectorAll('[data-del-victory-phrase]').forEach((btn) => btn.addEventListener('click', () => {
    const { settings } = getState();
    const id = btn.dataset.delVictoryPhrase;
    const nextActive = settings.activeVictoryPhraseId === id ? null : settings.activeVictoryPhraseId;
    updateSettings({ victoryPhrases: settings.victoryPhrases.filter((p) => p.id !== id), activeVictoryPhraseId: nextActive });
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
    matchAutoSaved = false;
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
  const { settings } = getState();
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
          <button id="sb-number-size" aria-label="Ingrandisci numero punteggio" title="Ingrandisci numero">➕</button>
          <button id="sb-remote-toggle" aria-label="Abilita/disabilita telecomando" title="${settings.bleRemoteEnabled ? 'Telecomando abilitato' : 'Telecomando disabilitato'}">${settings.bleRemoteEnabled ? '🎮' : '🚫'}</button>
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
        <button id="sb-settings">📋 Riepilogo</button>
        ${isLiteMode() ? '<button id="sb-bluetooth">🔵 Bluetooth</button>' : ''}
        <button id="sb-newmatch">🔄 Nuova partita</button>
      </div>
      ${serverPickerOpen ? serverPickerModal() : ''}
      ${quickSummaryOpen ? quickSummaryModal(settings) : ''}
    </div>
  `;

  el.querySelector('#sb-back').addEventListener('click', () => navigate('home'));
  el.querySelector('#sb-settings').addEventListener('click', () => {
    quickSummaryOpen = true;
    paint(el);
  });
  el.querySelector('#sb-bluetooth')?.addEventListener('click', () => navigate('bluetooth-setup'));
  el.querySelector('#sb-mute').addEventListener('click', () => {
    ttsEnabled = !ttsEnabled;
    if (!ttsEnabled) stopSpeech();
    paint(el);
  });
  el.querySelector('#sb-display-mode').addEventListener('click', () => {
    pointsOnlyMode = !pointsOnlyMode;
    paint(el);
  });
  el.querySelector('#sb-remote-toggle').addEventListener('click', () => {
    const turningOn = !getState().settings.bleRemoteEnabled;
    if (turningOn && !canUseRemote()) {
      toast('Il telecomando è una funzione Pro');
      return;
    }
    updateSettings({ bleRemoteEnabled: turningOn });
    setupRemoteListening(el);
    paint(el);
  });
  el.querySelector('#sb-number-size').addEventListener('click', () => {
    const current = getState().settings.numberSizeStep || 0;
    updateSettings({ numberSizeStep: (current + 1) % 4 });
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
  el.querySelectorAll('[data-open-server-picker]').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      serverPickerOpen = true;
      paint(el);
    });
  });
  el.querySelector('#pick-random-server')?.addEventListener('click', () => {
    const options = [
      { team: 'A', idx: 0 },
      ...(match.teamAPlayers.length > 1 ? [{ team: 'A', idx: 1 }] : []),
      { team: 'B', idx: 0 },
      ...(match.teamBPlayers.length > 1 ? [{ team: 'B', idx: 1 }] : []),
    ];
    const pick = options[Math.floor(Math.random() * options.length)];
    match.server = pick.team;
    match[pick.team === 'A' ? 'serverPlayerA' : 'serverPlayerB'] = pick.idx;
    const players = pick.team === 'A' ? match.teamAPlayers : match.teamBPlayers;
    const name = players[pick.idx];
    if (ttsEnabled && name) say(`Batte ${name}`);
    serverPickerOpen = false;
    paint(el);
  });
  el.querySelector('#server-picker-close')?.addEventListener('click', () => { serverPickerOpen = false; paint(el); });
  el.querySelector('#server-picker-modal')?.addEventListener('click', (e) => {
    if (e.target.id === 'server-picker-modal') { serverPickerOpen = false; paint(el); }
  });
  el.querySelectorAll('[data-pick-live-server]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const [team, idxStr] = btn.dataset.pickLiveServer.split(':');
      const idx = Number(idxStr);
      match.server = team;
      match[team === 'A' ? 'serverPlayerA' : 'serverPlayerB'] = idx;
      const players = team === 'A' ? match.teamAPlayers : match.teamBPlayers;
      const name = players[idx];
      if (ttsEnabled && name) say(`Ora batte ${name}`);
      serverPickerOpen = false;
      paint(el);
    });
  });
  el.querySelectorAll('[data-rename-player]').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const [team, idxStr] = btn.dataset.renamePlayer.split(':');
      const idx = Number(idxStr);
      const players = team === 'A' ? match.teamAPlayers : match.teamBPlayers;
      const current = players[idx] || '';
      const next = prompt('Nome giocatore', current);
      if (next === null) return;
      const trimmed = next.trim().slice(0, 24);
      if (!trimmed) return;
      players[idx] = trimmed;
      // In singolo il nome squadra coincide col nome giocatore (vedi setup);
      // in doppio il nome squadra resta un campo indipendente e personalizzabile.
      if (match.mode === 'singles') {
        if (team === 'A') match.teamAName = players[0];
        else match.teamBName = players[0];
      }
      paint(el);
    });
  });

  el.querySelector('#quick-open-server-picker')?.addEventListener('click', () => {
    quickSummaryOpen = false;
    serverPickerOpen = true;
    paint(el);
  });
  el.querySelector('#quick-mode-singles')?.addEventListener('click', () => {
    match.mode = 'singles';
    match.teamAPlayers = match.teamAPlayers.slice(0, 1);
    match.teamBPlayers = match.teamBPlayers.slice(0, 1);
    match.teamAName = match.teamAPlayers[0];
    match.teamBName = match.teamBPlayers[0];
    match.serverPlayerA = 0;
    match.serverPlayerB = 0;
    paint(el);
  });
  el.querySelector('#quick-mode-doubles')?.addEventListener('click', () => {
    match.mode = 'doubles';
    if (match.teamAPlayers.length < 2) match.teamAPlayers.push('Compagno A2');
    if (match.teamBPlayers.length < 2) match.teamBPlayers.push('Compagno B2');
    paint(el);
  });
  el.querySelector('#quick-summary-close')?.addEventListener('click', () => { quickSummaryOpen = false; paint(el); });
  el.querySelector('#quick-summary-done')?.addEventListener('click', () => { quickSummaryOpen = false; paint(el); });
  el.querySelector('#quick-summary-modal')?.addEventListener('click', (e) => {
    if (e.target.id === 'quick-summary-modal') { quickSummaryOpen = false; paint(el); }
  });
  el.querySelector('#quick-golden')?.addEventListener('change', (e) => { match.goldenPoint = e.target.checked; });
  el.querySelector('#quick-supertb')?.addEventListener('change', (e) => { match.superTiebreak3rdSet = e.target.checked; });
  el.querySelectorAll('[data-quick-time-announce]').forEach((btn) => {
    btn.addEventListener('click', () => {
      settings.announceTimeEveryMatches = parseInt(btn.dataset.quickTimeAnnounce, 10);
      updateSettings({ announceTimeEveryMatches: settings.announceTimeEveryMatches });
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
      <div class="sb-name-row" data-edit-name="${team}">${escapeHtml(name)}</div>
      ${serving ? `<button class="sb-server-player" data-open-server-picker="${team}">🎾 ${isDoubles ? `Batte: ${escapeHtml(servingPlayerName)}` : 'Al servizio'}</button>` : ''}
      <div class="sb-stack ${pointsOnlyMode ? 'points-only' : ''}">${stackContent}</div>
      ${badge ? `<div class="sb-badge">${badge}</div>` : ''}
    </div>
  `;
}

// Riepilogo compatto della partita in corso, apribile senza abbandonare lo
// schermo di gioco (a differenza della schermata Impostazioni completa) - le
// regole qui sotto agiscono live sulla partita in corso: scoring.js legge
// match.goldenPoint/match.superTiebreak3rdSet ad ogni punto, quindi
// cambiarle a metà partita è sicuro e ha effetto dal punto successivo.
function quickSummaryModal(settings) {
  const setsLine = match.sets.length
    ? match.sets.map((s) => `${s.a}-${s.b}`).join(' · ')
    : 'Nessun set concluso';
  return `
    <div class="modal-backdrop" id="quick-summary-modal">
      <div class="modal-card">
        <h2><span>📋 Riepilogo partita</span><button class="icon-btn" id="quick-summary-close" aria-label="Chiudi">✕</button></h2>
        <p class="small">${escapeHtml(match.teamAName)} vs ${escapeHtml(match.teamBName)} · ${match.mode === 'singles' ? 'Singolo' : 'Doppio'}</p>
        <p class="small">Set: ${setsLine}</p>
        <button class="btn secondary block mt" id="quick-open-server-picker">🎾 Chi batte? / Rinomina giocatori</button>
        <div class="field mt mb0">
          <label>Modalità partita</label>
          <div class="segmented">
            <button id="quick-mode-singles" class="${match.mode === 'singles' ? 'active' : ''}">Singolo</button>
            <button id="quick-mode-doubles" class="${match.mode === 'doubles' ? 'active' : ''}">Doppio</button>
          </div>
        </div>
        <div class="toggle-row mt">
          <div><strong>Punto d'oro</strong><p class="mb0 small">A 40 pari, il punto successivo decide il gioco</p></div>
          <label class="switch"><input type="checkbox" id="quick-golden" ${match.goldenPoint ? 'checked' : ''}><span class="slider"></span></label>
        </div>
        <div class="toggle-row mt">
          <div><strong>Super tie-break al 3° set</strong><p class="mb0 small">Set decisivo fino a 10 punti invece di un set intero</p></div>
          <label class="switch"><input type="checkbox" id="quick-supertb" ${match.superTiebreak3rdSet ? 'checked' : ''}><span class="slider"></span></label>
        </div>
        <div class="field mt mb0">
          <label>🕐 Annuncia l'ora ogni tot partite</label>
          <div class="segmented">
            ${[0, 1, 2, 3, 5].map((n) => `<button data-quick-time-announce="${n}" class="${settings.announceTimeEveryMatches === n ? 'active' : ''}">${n === 0 ? 'Mai' : n === 1 ? 'Ogni partita' : `Ogni ${n}`}</button>`).join('')}
          </div>
        </div>
        <button class="btn primary block mt" id="quick-summary-done">✅ Fatto, riprendi</button>
      </div>
    </div>
  `;
}

function serverPickerModal() {
  const options = [
    { team: 'A', idx: 0, name: match.teamAPlayers[0] },
    ...(match.teamAPlayers.length > 1 ? [{ team: 'A', idx: 1, name: match.teamAPlayers[1] }] : []),
    { team: 'B', idx: 0, name: match.teamBPlayers[0] },
    ...(match.teamBPlayers.length > 1 ? [{ team: 'B', idx: 1, name: match.teamBPlayers[1] }] : []),
  ];
  return `
    <div class="modal-backdrop" id="server-picker-modal">
      <div class="modal-card">
        <h2><span>🎾 Chi batte?</span><button class="icon-btn" id="server-picker-close" aria-label="Chiudi">✕</button></h2>
        <button class="btn primary block mt" id="pick-random-server" style="font-size:1.15em;padding:16px;">🎲 Battitore casuale</button>
        <div class="mt">
          ${options.map((o) => `
            <div class="row mt" style="gap:8px;">
              <button class="btn ${match.server === o.team && (o.idx === ((o.team === 'A' ? match.serverPlayerA : match.serverPlayerB) || 0)) ? 'primary' : 'secondary'} block" style="flex:1;" data-pick-live-server="${o.team}:${o.idx}">${escapeHtml(o.name)}</button>
              <button class="btn ghost small" data-rename-player="${o.team}:${o.idx}" aria-label="Rinomina giocatore">✏️</button>
            </div>
          `).join('')}
        </div>
      </div>
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
      <p class="small">✅ Salvata automaticamente nelle statistiche. Puoi condividerla in un secondo momento dallo storico partite.</p>
    </div>
  `;
}

async function onPoint(team) {
  if (!match || match.matchOver) return;
  history.push(structuredClone(match));
  const { match: next, announcement, events } = addPoint(match, team);
  match = next;
  const finalAnnouncement = events.matchWon ? (customVictoryAnnouncement(match) || announcement) : announcement;
  if (ttsEnabled) say(finalAnnouncement);
  if (events.matchWon) toast(finalAnnouncement);
  const el = document.querySelector('.screen');
  if (match.matchOver && !matchAutoSaved) {
    matchAutoSaved = true;
    saveMatchRecord(match);
    // Le icone di sistema (Home, Punteggio, Community...) restano nascoste
    // solo durante il punteggio attivo, per l'immersione a schermo intero -
    // una volta finita la partita tornano visibili, così si può navigare
    // subito altrove senza restare "intrappolati" nel riepilogo.
    showNav();
    // L'avviso dell'orario esce SUBITO alla fine della partita, prima della
    // schermata "partita salvata" - non più quando si preme "Nuova partita"
    // (troppo tardi, capitava a partita già dimenticata).
    await maybeAnnounceTime(el);
  }
  paint(el);
}

function onUndo() {
  if (!match || !history.length) return;
  if (match.matchOver) {
    matchAutoSaved = false;
    document.getElementById('bottom-nav').classList.add('hidden');
  }
  match = history.pop();
  stopSpeech();
  paint(document.querySelector('.screen'));
}

async function onReset() {
  const el = document.querySelector('.screen');
  if (match && !match.matchOver) {
    if (!confirm('Iniziare una nuova partita? Il punteggio attuale andrà perso.')) return;
  }
  match = null;
  history = [];
  matchAutoSaved = false;
  stopSpeech();
  stopHwKeys();
  disableRemote();
  showNav();
  paintSetup(el);
}

function onEditName(team, el) {
  const current = team === 'A' ? match.teamAName : match.teamBName;
  const next = prompt(`Nome ${match.mode === 'singles' ? 'giocatore' : 'squadra'} ${team === 'A' ? '1' : '2'}`, current);
  if (!next) return;
  if (team === 'A') match.teamAName = next.trim().slice(0, 24) || current;
  else match.teamBName = next.trim().slice(0, 24) || current;
  paint(el);
}

async function saveMatchRecord(m) {
  const record = {
    date: new Date().toISOString(),
    teamAName: m.teamAName,
    teamBName: m.teamBName,
    // Nomi dei singoli giocatori: servono all'immagine di condivisione
    // (match-share.js), che li mostra sotto i nomi squadra.
    teamAPlayers: m.teamAPlayers,
    teamBPlayers: m.teamBPlayers,
    mode: m.mode,
    // Nelle partite a tempo non si chiudono mai set veri: il punteggio
    // finale a giochi va salvato come "set" unico, altrimenti lo storico e
    // l'immagine condivisa risultano vuoti ("Nessun set concluso").
    sets: m.sets.length ? m.sets : (m.format === 'time' ? [{ a: m.currentSet.gamesA, b: m.currentSet.gamesB }] : m.sets),
    winner: m.matchWinner,
    golden: m.goldenPoint,
    superTiebreak: m.superTiebreak3rdSet,
  };
  addMatch(record);
  try { await pushMatch(record); } catch {}
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
  const template = settings.timeAnnouncePhrase || "Sono le {orario}. Avete tempo per un'altra partita?";
  const phrase = template.replaceAll('{orario}', now);
  if (settings.ttsEnabled) say(phrase);
  el.innerHTML = `
    <div class="sb-root">
      <div class="sb-time-announce">
        <div class="sb-time-announce-clock">${now}</div>
        <p>${escapeHtml(phrase)}</p>
      </div>
    </div>
  `;
  return new Promise((resolve) => setTimeout(resolve, 3500));
}
