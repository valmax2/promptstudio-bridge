import { getState, setState, addMatch, updateSettings } from '../store.js';
import { pushMatch } from '../cloud.js';
import { say, stopSpeech } from '../speech.js';
import { escapeHtml, BACK_ICON, uid as genId } from '../utils.js';
import { NAV_ICONS } from '../nav-icons.js';
import {
  createMatch, addPoint, matchPointDisplay, teamName, isGamePoint, resetCurrentGame, endTimeMatch,
} from '../scoring.js';
import { navigate } from '../router.js';
import { toast } from '../app.js';
import { nearestColorName, NAMED_COLORS } from '../color-presets.js';
import { isLiteMode, canExitLiteMode } from '../lite-mode.js';
import { micButtonHtml, wireAllMicButtons } from '../speech-input.js';
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
// Nomi da cui precompilare i campi al prossimo paintSetup() - impostato solo
// quando si carica un preset (per passare da un mode all'altro e riempire i
// campi nuovi in un colpo solo), poi azzerato subito dopo il primo paint.
let pendingNameFill = null;
let timeInterval = null;
let stopHwKeys = () => {};
let victoryModalOpen = false;
let serverPickerOpen = false;
let quickSummaryOpen = false;
// Finestra di rinomina (nome squadra o singolo giocatore) aperta dal tocco
// sul nome in cima al tabellone o dalla matita nel picker "Chi batte?" -
// sostituisce il vecchio prompt() nativo per poterci mettere anche il
// microfono. { kind: 'team'|'player', team: 'A'|'B', idx? } oppure null.
let renameTarget = null;
// Selettore colore rapido nella schermata di impostazione partita ('A'|'B'
// mentre è aperto, altrimenti null) - vedi colorPickerModal più sotto.
let colorPickerOpen = null;
// Barra comandi (Annulla/Riepilogo/.../Nuova partita) a scomparsa durante il
// punteggio: nascosta di default per lasciare tutto lo spazio ai numeri, si
// riapre col triangolino in basso. A partita finita si forza aperta (serve
// "Nuova partita").
let controlsOpen = false;
// Finestra guida "dove toccare": esce da sola la prima volta in assoluto che
// si entra nel punteggio dal vivo, poi resta richiamabile dal cerchietto ⓘ.
let helpOpen = false;
// Annuncio vocale d'inizio partita rimandato a quando si chiude la guida,
// se è appena uscita da sola: altrimenti la voce parte sopra la lettura
// della finestra e nessuno la sente per davvero.
let pendingStartAnnouncement = null;

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
  controlsOpen = false;
  helpOpen = false;
  renameTarget = null;
  colorPickerOpen = null;
  pendingStartAnnouncement = null;

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
  if (action === 'toggleFullScreen') {
    if (match) {
      pointsOnlyMode = !pointsOnlyMode;
      paint(el);
    }
    return;
  }
}

function startLive(el) {
  if (match.matchOver) showNav();
  else document.getElementById('bottom-nav').classList.add('hidden');
  if (!getState().hasSeenScoreboardHelp && !match.matchOver) helpOpen = true;
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

// Selettore colore rapido, aperto dal pallino colorato accanto al nome
// squadra/giocatore in "Nuova partita" - stessa lista di colori con nome
// usata per dedurre il nome squadra di default (vedi color-presets.js),
// così scegliere qui un colore "sfasato" tra i due lo cambia subito nel
// tabellone, senza dover andare fino a Impostazioni → Colori.
function colorPickerModal(target, settings) {
  const titleMap = {
    A: 'Colore Squadra 1',
    B: 'Colore Squadra 2',
    newMatchBg: 'Sfondo pulsante "Inizia nuova partita"',
    newMatchText: 'Testo pulsante "Inizia nuova partita"',
  };
  const currentMap = {
    A: settings.teamAColor,
    B: settings.teamBColor,
    newMatchBg: settings.newMatchButtonBg || '#4DD9FF',
    newMatchText: settings.newMatchButtonTextColor || '#041A14',
  };
  const current = (currentMap[target] || '').toLowerCase();
  return `
    <div class="modal-backdrop" id="color-picker-modal">
      <div class="modal-card">
        <h2><span>🎨 ${titleMap[target]}</span><button class="icon-btn" id="color-picker-close" aria-label="Chiudi">✕</button></h2>
        <div class="color-swatch-grid">
          ${NAMED_COLORS.map((c) => `
            <button type="button" class="color-swatch-option ${current === c.hex.toLowerCase() ? 'selected' : ''}" data-color="${c.hex}" style="background:${c.hex}" aria-label="${c.name}" title="${c.name}"></button>
          `).join('')}
        </div>
      </div>
    </div>
  `;
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
        <div class="field mt row" style="align-items:flex-end;gap:6px;">
          <div style="flex:1;">
            <label>Nuova frase</label>
            <input id="new-victory-phrase" placeholder="es. la squadra {vincitore} ha fatto il culo alla squadra {avversario}" maxlength="140">
          </div>
          ${micButtonHtml('mic-new-victory-phrase')}
        </div>
        <button class="btn secondary block" id="add-victory-phrase">+ Aggiungi e attiva</button>
        <button class="btn primary block mt" id="victory-modal-done">Fatto</button>
      </div>
    </div>
  `;
}

// ===== New match setup =====

// Trascina un giocatore (👆) da una riga all'altra per scambiare i due nomi
// tra squadre al volo, senza doverli riscrivere - usa Pointer Events (non il
// Drag and Drop HTML5 nativo, che su Android/WebView è quasi tutto pensato
// per il mouse e non risponde bene al tocco) così funziona anche su schermo
// touch. Manipola direttamente i due <input> coinvolti, stesso approccio di
// data-pick-server sopra: niente paintSetup(el), altrimenti si perderebbero
// i nomi già scritti negli altri campi non ancora salvati da nessuna parte.
function wirePlayerDragSwap(el) {
  let dragRow = null;

  const clearHighlight = () => {
    el.querySelectorAll('.player-row.drag-over').forEach((r) => r.classList.remove('drag-over'));
  };
  const rowAt = (x, y) => document.elementFromPoint(x, y)?.closest('.player-row');

  const onMove = (e) => {
    clearHighlight();
    const target = rowAt(e.clientX, e.clientY);
    if (target && target !== dragRow) target.classList.add('drag-over');
  };
  const onUp = (e) => {
    document.removeEventListener('pointermove', onMove);
    document.removeEventListener('pointerup', onUp);
    clearHighlight();
    dragRow?.classList.remove('dragging');
    const target = rowAt(e.clientX, e.clientY);
    if (target && dragRow && target !== dragRow) {
      const fromInput = dragRow.querySelector('input');
      const toInput = target.querySelector('input');
      if (fromInput && toInput) {
        const tmp = fromInput.value;
        fromInput.value = toInput.value;
        toInput.value = tmp;
      }
    }
    dragRow = null;
  };

  el.querySelectorAll('.player-row').forEach((row) => {
    row.querySelector('.drag-handle')?.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      dragRow = row;
      row.classList.add('dragging');
      document.addEventListener('pointermove', onMove);
      document.addEventListener('pointerup', onUp);
    });
  });
}

// Legge i campi nome attualmente visibili nel form (dipende da setupMode) -
// stessa forma di una voce namePresets/lastMatchNames, usata sia per
// salvare un preset sia per ricordare gli ultimi nomi usati.
function readNameFields(el) {
  if (setupMode === 'singles') {
    return {
      a: el.querySelector('#name-a')?.value.trim().slice(0, 24) || '',
      b: el.querySelector('#name-b')?.value.trim().slice(0, 24) || '',
    };
  }
  return {
    teamA: el.querySelector('#team-name-a')?.value.trim().slice(0, 24) || '',
    a1: el.querySelector('#name-a1')?.value.trim().slice(0, 24) || '',
    a2: el.querySelector('#name-a2')?.value.trim().slice(0, 24) || '',
    teamB: el.querySelector('#team-name-b')?.value.trim().slice(0, 24) || '',
    b1: el.querySelector('#name-b1')?.value.trim().slice(0, 24) || '',
    b2: el.querySelector('#name-b2')?.value.trim().slice(0, 24) || '',
  };
}

function paintSetup(el) {
  const singles = setupMode === 'singles';
  const { settings } = getState();
  const teamAColorName = nearestColorName(settings.teamAColor) || 'Squadra A';
  const teamBColorName = nearestColorName(settings.teamBColor) || 'Squadra B';
  // Da dove precompilare i nomi: un preset appena caricato ha la precedenza
  // (un tap deve riempire i campi anche se cambia mode), altrimenti gli
  // ultimi nomi usati - solo se combaciano col mode attualmente selezionato.
  const fill = (pendingNameFill && pendingNameFill.mode === setupMode) ? pendingNameFill
    : (settings.lastMatchNames && settings.lastMatchNames.mode === setupMode) ? settings.lastMatchNames
    : null;
  const presets = settings.namePresets || [];
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
        ${presets.length ? `
        <div class="card">
          <label>⭐ Preset salvati</label>
          <div class="row wrap">
            ${presets.map((p) => `
              <span class="row" style="gap:2px;">
                <button class="btn secondary small" data-load-preset="${p.id}">${escapeHtml(p.label)}</button>
                <button class="btn ghost small" data-delete-preset="${p.id}" aria-label="Elimina preset">🗑️</button>
              </span>
            `).join('')}
          </div>
        </div>
        ` : ''}
        ${singles ? `
        <div class="card" style="border-color:${settings.teamAColor};border-width:2px;">
          <div class="field mb0 row player-row" data-player-slot="A:0" style="align-items:center;gap:6px;">
            <span class="drag-handle" aria-label="Trascina per scambiare">👆</span>
            <input id="name-a" value="${escapeHtml(fill?.a || 'Giocatore 1')}" maxlength="24" style="flex:1;">
            <button type="button" class="palette-trigger palette-trigger-narrow" data-color-team="A" aria-label="Cambia colore Squadra 1">🎨</button>
            <button type="button" class="btn-server-pick ${setupServer === 'A' ? 'active' : ''}" data-pick-server="A:0" aria-label="Fa servire per primo">🎾</button>
            ${micButtonHtml('mic-name-a')}
          </div>
        </div>
        <div class="card" style="border-color:${settings.teamBColor};border-width:2px;">
          <div class="field mb0 row player-row" data-player-slot="B:0" style="align-items:center;gap:6px;">
            <span class="drag-handle" aria-label="Trascina per scambiare">👆</span>
            <input id="name-b" value="${escapeHtml(fill?.b || 'Giocatore 2')}" maxlength="24" style="flex:1;">
            <button type="button" class="palette-trigger palette-trigger-narrow" data-color-team="B" aria-label="Cambia colore Squadra 2">🎨</button>
            <button type="button" class="btn-server-pick ${setupServer === 'B' ? 'active' : ''}" data-pick-server="B:0" aria-label="Fa servire per primo">🎾</button>
            ${micButtonHtml('mic-name-b')}
          </div>
        </div>
        <p class="small" style="text-align:center;margin:-6px 0 14px;">🎾 Tocca la racchetta per scegliere chi serve per primo/a · 👆 trascina per scambiare un giocatore tra le squadre · 🎨 cambia il colore squadra · 🎤 detta il nome a voce</p>
        ` : `
        <div class="card" style="border-color:${settings.teamAColor};border-width:2px;">
          <label>Squadra A</label>
          <div class="field row" style="align-items:flex-end;gap:6px;">
            <button type="button" class="drag-handle palette-trigger" data-color-team="A" aria-label="Cambia colore Squadra A">🎨</button>
            <div style="flex:1;">
              <label class="small">Nome squadra (facoltativo, default "${teamAColorName}")</label>
              <input id="team-name-a" placeholder="${teamAColorName}" value="${escapeHtml(fill?.teamA || '')}" maxlength="24" style="border-color:${settings.teamAColor};border-width:2px;">
            </div>
            ${micButtonHtml('mic-team-name-a')}
          </div>
          <div class="field row player-row" data-player-slot="A:0" style="align-items:center;gap:6px;">
            <span class="drag-handle" aria-label="Trascina per scambiare squadra">👆</span>
            <input id="name-a1" placeholder="Giocatore 1" value="${escapeHtml(fill?.a1 || '')}" maxlength="24" style="flex:1;">
            <button type="button" class="btn-server-pick ${setupServer === 'A' && setupServerPlayerIdx === 0 ? 'active' : ''}" data-pick-server="A:0" aria-label="Fa servire per primo">🎾</button>
            ${micButtonHtml('mic-name-a1')}
          </div>
          <div class="field mb0 row player-row" data-player-slot="A:1" style="align-items:center;gap:6px;">
            <span class="drag-handle" aria-label="Trascina per scambiare squadra">👆</span>
            <input id="name-a2" placeholder="Giocatore 2" value="${escapeHtml(fill?.a2 || '')}" maxlength="24" style="flex:1;">
            <button type="button" class="btn-server-pick ${setupServer === 'A' && setupServerPlayerIdx === 1 ? 'active' : ''}" data-pick-server="A:1" aria-label="Fa servire per primo">🎾</button>
            ${micButtonHtml('mic-name-a2')}
          </div>
        </div>
        <div class="card" style="border-color:${settings.teamBColor};border-width:2px;">
          <label>Squadra B</label>
          <div class="field row" style="align-items:flex-end;gap:6px;">
            <button type="button" class="drag-handle palette-trigger" data-color-team="B" aria-label="Cambia colore Squadra B">🎨</button>
            <div style="flex:1;">
              <label class="small">Nome squadra (facoltativo, default "${teamBColorName}")</label>
              <input id="team-name-b" placeholder="${teamBColorName}" value="${escapeHtml(fill?.teamB || '')}" maxlength="24" style="border-color:${settings.teamBColor};border-width:2px;">
            </div>
            ${micButtonHtml('mic-team-name-b')}
          </div>
          <div class="field row player-row" data-player-slot="B:0" style="align-items:center;gap:6px;">
            <span class="drag-handle" aria-label="Trascina per scambiare squadra">👆</span>
            <input id="name-b1" placeholder="Giocatore 3" value="${escapeHtml(fill?.b1 || '')}" maxlength="24" style="flex:1;">
            <button type="button" class="btn-server-pick ${setupServer === 'B' && setupServerPlayerIdx === 0 ? 'active' : ''}" data-pick-server="B:0" aria-label="Fa servire per primo">🎾</button>
            ${micButtonHtml('mic-name-b1')}
          </div>
          <div class="field mb0 row player-row" data-player-slot="B:1" style="align-items:center;gap:6px;">
            <span class="drag-handle" aria-label="Trascina per scambiare squadra">👆</span>
            <input id="name-b2" placeholder="Giocatore 4" value="${escapeHtml(fill?.b2 || '')}" maxlength="24" style="flex:1;">
            <button type="button" class="btn-server-pick ${setupServer === 'B' && setupServerPlayerIdx === 1 ? 'active' : ''}" data-pick-server="B:1" aria-label="Fa servire per primo">🎾</button>
            ${micButtonHtml('mic-name-b2')}
          </div>
        </div>
        <p class="small" style="text-align:center;margin:-6px 0 14px;">🎾 Tocca la racchetta per scegliere chi serve per primo/a · 👆 trascina per scambiare un giocatore tra le squadre · 🎨 cambia il colore squadra · 🎤 detta il nome a voce</p>
        `}
        <button class="btn ghost small block" id="save-name-preset" ${presets.length >= 3 ? 'disabled' : ''}>💾 Salva questi nomi come preset${presets.length >= 3 ? ' (massimo 3 raggiunto)' : ''}</button>

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
            <div><strong>Punto Killer</strong><p class="mb0 small">Vantaggio classico, ma su vantaggio pari il punto dopo decide - ignorato se attivo il Punto d'oro</p></div>
            <label class="switch"><input type="checkbox" id="setup-killer-point" ${settings.killerPoint ? 'checked' : ''} ${settings.goldenPoint ? 'disabled' : ''}><span class="slider"></span></label>
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
          ${settings.announceTimeEveryMatches ? `
          <div class="field mt mb0">
            <label>🗣️ Frase dell'annuncio orario</label>
            <div class="row" style="align-items:center;gap:6px;">
              <input id="setup-time-announce-phrase" placeholder="Sono le {orario}. Avete tempo per un'altra partita?" maxlength="140" value="${escapeHtml(settings.timeAnnouncePhrase || '')}" style="flex:1;">
              ${micButtonHtml('mic-setup-time-announce-phrase')}
            </div>
            <div class="row mt" style="gap:8px;">
              <button class="btn secondary small block" id="setup-save-time-announce-phrase">💾 Salva frase</button>
              <button class="btn ghost small block" id="setup-reset-time-announce-phrase">↺ Predefinita</button>
            </div>
          </div>
          ` : ''}
        </div>
        <div class="card">
          <label>🏆 Frase di fine partita</label>
          <p class="small mb0">${currentVictoryPhraseLabel(settings)}</p>
          <button class="btn secondary block mt" id="setup-victory-phrase">Personalizza</button>
        </div>
        <div class="card">
          <label>🎾 Pulsante "Inizia nuova partita"</label>
          <p class="small">Testo, sfondo e colore del testo del pulsante che appare a fine partita.</p>
          <div class="field row" style="align-items:flex-end;gap:6px;">
            <div style="flex:1;">
              <input id="new-match-btn-text" placeholder="Inizia nuova partita" value="${escapeHtml(settings.newMatchButtonText || '')}" maxlength="30">
            </div>
            ${micButtonHtml('mic-new-match-btn-text')}
          </div>
          <div class="row mt" style="gap:8px;">
            <button type="button" class="btn secondary" style="flex:1;" data-color-team="newMatchBg">🎨 Sfondo</button>
            <button type="button" class="btn secondary" style="flex:1;" data-color-team="newMatchText">🎨 Testo</button>
          </div>
          ${(settings.newMatchButtonText || settings.newMatchButtonBg || settings.newMatchButtonTextColor) ? '<button class="btn ghost block mt" id="new-match-btn-reset">↺ Predefinito</button>' : ''}
        </div>
        ${isLiteMode() ? '<button class="btn secondary block mt" id="setup-bluetooth">🔵 Configura Bluetooth</button>' : ''}
        ${canExitLiteMode() ? '<button class="btn lite-highlight block mt" id="setup-exit-lite">↩️ Esci da Modalità Light</button>' : ''}
        <button class="btn primary block mt" id="start-match">Inizia partita</button>
      </div>
    </div>

    ${victoryModalOpen ? victoryPhraseModal(settings) : ''}
    ${colorPickerOpen ? colorPickerModal(colorPickerOpen, settings) : ''}
  `;
  pendingNameFill = null;

  el.querySelector('#sb-back').addEventListener('click', () => navigate('home'));
  el.querySelectorAll('[data-mode]').forEach((btn) => btn.addEventListener('click', () => {
    setupMode = btn.dataset.mode;
    paintSetup(el);
  }));
  el.querySelectorAll('[data-color-team]').forEach((btn) => btn.addEventListener('click', () => {
    colorPickerOpen = btn.dataset.colorTeam;
    paintSetup(el);
  }));
  el.querySelector('#color-picker-close')?.addEventListener('click', () => { colorPickerOpen = null; paintSetup(el); });
  el.querySelector('#color-picker-modal')?.addEventListener('click', (e) => {
    if (e.target.id === 'color-picker-modal') { colorPickerOpen = null; paintSetup(el); }
  });
  el.querySelectorAll('[data-color]').forEach((btn) => btn.addEventListener('click', () => {
    const hex = btn.dataset.color;
    const patch = {
      A: { teamAColor: hex, colorPreset: 'custom' },
      B: { teamBColor: hex, colorPreset: 'custom' },
      newMatchBg: { newMatchButtonBg: hex },
      newMatchText: { newMatchButtonTextColor: hex },
    }[colorPickerOpen];
    if (patch) updateSettings(patch);
    colorPickerOpen = null;
    paintSetup(el);
  }));
  el.querySelector('#new-match-btn-text')?.addEventListener('change', (e) => {
    updateSettings({ newMatchButtonText: e.target.value.trim().slice(0, 30) || null });
  });
  el.querySelector('#new-match-btn-reset')?.addEventListener('click', () => {
    updateSettings({ newMatchButtonText: null, newMatchButtonBg: null, newMatchButtonTextColor: null });
    paintSetup(el);
  });
  el.querySelectorAll('[data-load-preset]').forEach((btn) => btn.addEventListener('click', () => {
    const preset = (getState().settings.namePresets || []).find((p) => p.id === btn.dataset.loadPreset);
    if (!preset) return;
    pendingNameFill = preset;
    setupMode = preset.mode;
    paintSetup(el);
    toast(`Caricato: ${preset.label}`);
  }));
  el.querySelectorAll('[data-delete-preset]').forEach((btn) => btn.addEventListener('click', () => {
    if (!confirm('Eliminare questo preset?')) return;
    const { settings } = getState();
    updateSettings({ namePresets: (settings.namePresets || []).filter((p) => p.id !== btn.dataset.deletePreset) });
    paintSetup(el);
  }));
  el.querySelector('#save-name-preset')?.addEventListener('click', () => {
    const { settings } = getState();
    const current = settings.namePresets || [];
    if (current.length >= 3) return;
    const label = (prompt('Nome del preset (es. "Io e Marco vs i soliti")') || '').trim().slice(0, 30);
    if (!label) return;
    const names = readNameFields(el);
    updateSettings({ namePresets: [...current, { id: genId(), label, mode: setupMode, ...names }] });
    toast('Preset salvato');
    // Il salvataggio ridisegna il form (per aggiornare l'elenco preset): senza
    // questo, i nomi appena scritti sparirebbero perché non ancora presenti
    // in lastMatchNames, l'unica fonte da cui il form si precompila di norma.
    pendingNameFill = { mode: setupMode, ...names };
    paintSetup(el);
  });
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
  wireAllMicButtons(el);
  wirePlayerDragSwap(el);
  el.querySelector('#setup-golden')?.addEventListener('change', (e) => { updateSettings({ goldenPoint: e.target.checked }); paintSetup(el); });
  el.querySelector('#setup-killer-point')?.addEventListener('change', (e) => updateSettings({ killerPoint: e.target.checked }));
  el.querySelector('#setup-super-tb')?.addEventListener('change', (e) => updateSettings({ superTiebreak3rdSet: e.target.checked }));
  el.querySelectorAll('[data-setup-time-announce]').forEach((btn) => btn.addEventListener('click', () => {
    updateSettings({ announceTimeEveryMatches: parseInt(btn.dataset.setupTimeAnnounce, 10) });
    paintSetup(el);
  }));
  el.querySelector('#setup-save-time-announce-phrase')?.addEventListener('click', () => {
    const text = el.querySelector('#setup-time-announce-phrase').value.trim().slice(0, 140);
    updateSettings({ timeAnnouncePhrase: text || null });
    toast('Frase salvata');
  });
  el.querySelector('#setup-reset-time-announce-phrase')?.addEventListener('click', () => {
    updateSettings({ timeAnnouncePhrase: null });
    paintSetup(el);
  });
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
    updateSettings({ lastMatchNames: { mode: setupMode, ...readNameFields(el) } });
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
      killerPointRule: !settings.goldenPoint && settings.killerPoint,
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
      const announcement = `Si comincia! Inizia a battere ${servingPlayerName}, riceve ${receivingPlayers.join(' e ')}`;
      // startLive() apre la guida ai comandi da sola alla primissima partita
      // (helpOpen): se la voce parte insieme, viene coperta dalla lettura
      // della finestra e non si sente - la rimandiamo a quando si chiude.
      if (helpOpen) pendingStartAnnouncement = announcement;
      else say(announcement);
    }
  });

  setupRemoteListening(el);
}

// ===== Live scoreboard =====

function paint(el) {
  const { settings } = getState();
  // Calcolati ma non mostrati per ora: la barra nera in alto che li ospitava
  // è stata tolta per lasciare tutto lo spazio a nomi/numeri - da vedere con
  // l'utente se e dove reintrodurli (es. per il conto alla rovescia del
  // formato a tempo, l'unico caso in cui modeLabel serviva davvero a leggersi
  // un'informazione live e non solo "Set 1").
  let modeLabel;
  if (match.format === 'time') {
    modeLabel = match.matchOver ? 'Partita conclusa' : `⏱️ ${formatRemaining(match.matchEndsAt)}`;
  } else {
    modeLabel = match.matchOver ? 'Partita conclusa' : match.inMatchTiebreak ? 'Super tie-break' : match.inTiebreak ? 'Tie-break' : `Set ${match.sets.length + 1}`;
  }
  const modeBadge = match.mode === 'singles' ? 'Singolo' : 'Doppio';
  const controlsExpanded = controlsOpen || match.matchOver;

  el.innerHTML = `
    <div class="sb-root">
      <div class="sb-halves">
        ${teamHalf('A')}
        ${teamHalf('B')}
        ${match.matchOver ? matchOverOverlay(settings) : ''}
        ${isLiteMode() ? '' : `<button class="sb-back-btn" id="sb-back" aria-label="Torna alla home">${BACK_ICON}</button>`}
        <button class="sb-help-btn" id="sb-help" aria-label="Guida ai comandi">i</button>
        ${isLiteMode() ? '' : `<button class="sb-home-btn" id="sb-home-center" aria-label="Torna alla home">${NAV_ICONS.home}</button>`}
      </div>
      <div class="sb-bottom-bar">
        <button class="sb-controls-toggle" id="sb-controls-toggle" aria-label="${controlsExpanded ? 'Nascondi barra comandi' : 'Mostra barra comandi'}">${controlsExpanded ? '▼' : '▲'}</button>
        <div class="sb-icons-pill">
          <button id="sb-display-mode" aria-label="Modalità visualizzazione" title="Solo punteggio">${pointsOnlyMode ? '🔢' : '📋'}</button>
          <button id="sb-number-size" aria-label="Ingrandisci numero punteggio" title="Ingrandisci numero">➕</button>
          <button id="sb-mute">${ttsEnabled ? '🔊' : '🔇'}</button>
        </div>
      </div>
      ${controlsExpanded ? `
      <div class="sb-controls">
        <button id="sb-undo" ${history.length ? '' : 'disabled'}>↩️ Annulla</button>
        <button id="sb-settings">📋 Riepilogo</button>
        ${isLiteMode() ? '<button id="sb-bluetooth">🔵 Bluetooth</button>' : '<button id="sb-open-options">⚙️ Opzioni</button>'}
        <button id="sb-newmatch">🔄 Nuova partita</button>
      </div>` : ''}
      ${serverPickerOpen ? serverPickerModal(settings) : ''}
      ${quickSummaryOpen ? quickSummaryModal(settings) : ''}
      ${helpOpen ? helpModal() : ''}
      ${renameModal()}
    </div>
  `;

  wireAllMicButtons(el);
  el.querySelector('#sb-back')?.addEventListener('click', (e) => { e.stopPropagation(); navigate('home'); });
  el.querySelector('#sb-home-center')?.addEventListener('click', (e) => { e.stopPropagation(); navigate('home'); });
  el.querySelector('#sb-controls-toggle').addEventListener('click', () => {
    controlsOpen = !controlsOpen;
    paint(el);
  });
  el.querySelector('#sb-help').addEventListener('click', (e) => {
    e.stopPropagation();
    helpOpen = true;
    paint(el);
  });
  const closeHelp = () => {
    helpOpen = false;
    if (!getState().hasSeenScoreboardHelp) setState({ hasSeenScoreboardHelp: true });
    if (pendingStartAnnouncement) {
      if (ttsEnabled) say(pendingStartAnnouncement);
      pendingStartAnnouncement = null;
    }
    paint(el);
  };
  el.querySelector('#sb-help-close')?.addEventListener('click', closeHelp);
  el.querySelector('#sb-help-modal')?.addEventListener('click', (e) => {
    if (e.target.id === 'sb-help-modal') closeHelp();
  });
  el.querySelector('#sb-settings')?.addEventListener('click', () => {
    quickSummaryOpen = true;
    paint(el);
  });
  el.querySelector('#sb-bluetooth')?.addEventListener('click', () => navigate('bluetooth-setup'));
  el.querySelector('#sb-open-options')?.addEventListener('click', () => navigate('settings'));
  el.querySelector('#sb-mute').addEventListener('click', (e) => {
    e.stopPropagation();
    ttsEnabled = !ttsEnabled;
    if (!ttsEnabled) stopSpeech();
    paint(el);
  });
  el.querySelector('#sb-display-mode').addEventListener('click', (e) => {
    e.stopPropagation();
    pointsOnlyMode = !pointsOnlyMode;
    paint(el);
  });
  el.querySelector('#sb-number-size').addEventListener('click', (e) => {
    e.stopPropagation();
    const current = getState().settings.numberSizeStep || 0;
    updateSettings({ numberSizeStep: (current + 1) % 4 });
  });
  el.querySelector('#sb-undo')?.addEventListener('click', onUndo);
  el.querySelector('#sb-newmatch')?.addEventListener('click', onReset);
  el.querySelector('#sb-overlay-newmatch')?.addEventListener('click', onReset);

  if (!match.matchOver) {
    el.querySelector('#half-a').addEventListener('click', () => onPoint('A'));
    el.querySelector('#half-b').addEventListener('click', () => onPoint('B'));
  }
  el.querySelectorAll('[data-edit-name]').forEach((nameEl) => {
    nameEl.addEventListener('click', (e) => {
      e.stopPropagation();
      renameTarget = { kind: 'team', team: nameEl.dataset.editName };
      paint(el);
    });
  });
  el.querySelector('#rename-modal-close')?.addEventListener('click', () => { renameTarget = null; paint(el); });
  el.querySelector('#rename-modal')?.addEventListener('click', (e) => {
    if (e.target.id === 'rename-modal') { renameTarget = null; paint(el); }
  });
  el.querySelector('#rename-save')?.addEventListener('click', () => {
    const trimmed = el.querySelector('#rename-input').value.trim().slice(0, 24);
    if (trimmed && renameTarget) {
      const { kind, team, idx } = renameTarget;
      if (kind === 'team') {
        if (team === 'A') match.teamAName = trimmed; else match.teamBName = trimmed;
      } else {
        const players = team === 'A' ? match.teamAPlayers : match.teamBPlayers;
        players[idx] = trimmed;
        // In singolo il nome squadra coincide col nome giocatore (vedi setup);
        // in doppio il nome squadra resta un campo indipendente e personalizzabile.
        if (match.mode === 'singles') {
          if (team === 'A') match.teamAName = players[0];
          else match.teamBName = players[0];
        }
      }
    }
    renameTarget = null;
    paint(el);
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
  // Nome modificabile direttamente nella riga (stessa UX di "Nuova partita"),
  // salvato al cambio focus - niente più matita che apre un'altra finestra.
  el.querySelectorAll('[data-server-name]').forEach((input) => {
    input.addEventListener('change', () => {
      const [team, idxStr] = input.dataset.serverName.split(':');
      const idx = Number(idxStr);
      const trimmed = input.value.trim().slice(0, 24);
      if (!trimmed) return;
      const players = team === 'A' ? match.teamAPlayers : match.teamBPlayers;
      players[idx] = trimmed;
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
  el.querySelector('#quick-golden')?.addEventListener('change', (e) => { match.goldenPoint = e.target.checked; paint(el); });
  el.querySelector('#quick-killer-point')?.addEventListener('change', (e) => { match.killerPointRule = e.target.checked; });
  el.querySelector('#quick-supertb')?.addEventListener('change', (e) => { match.superTiebreak3rdSet = e.target.checked; });
  el.querySelectorAll('[data-quick-time-announce]').forEach((btn) => {
    btn.addEventListener('click', () => {
      settings.announceTimeEveryMatches = parseInt(btn.dataset.quickTimeAnnounce, 10);
      updateSettings({ announceTimeEveryMatches: settings.announceTimeEveryMatches });
      paint(el);
    });
  });
  el.querySelector('#quick-save-time-announce-phrase')?.addEventListener('click', () => {
    const text = el.querySelector('#quick-time-announce-phrase').value.trim().slice(0, 140);
    updateSettings({ timeAnnouncePhrase: text || null });
    toast('Frase salvata');
  });
  el.querySelector('#quick-reset-time-announce-phrase')?.addEventListener('click', () => {
    updateSettings({ timeAnnouncePhrase: null });
    paint(el);
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
      ${serving ? `<button class="sb-server-player" data-open-server-picker="${team}">🎾 ${isDoubles ? escapeHtml(servingPlayerName) : 'Al servizio'}</button>` : ''}
      <div class="sb-stack ${pointsOnlyMode ? 'points-only' : ''}">${stackContent}</div>
      ${badge ? `<div class="sb-badge">${badge}</div>` : ''}
    </div>
  `;
}

// Guida rapida ai tocchi sul tabellone: esce da sola la prima volta in
// assoluto che si entra nel punteggio dal vivo (poi mai più), e resta sempre
// richiamabile dal cerchietto "i" nell'angolo in basso a sinistra.
function helpModal() {
  const row = (icon, txt) => `<div class="sb-help-row"><span class="sb-help-icon">${icon}</span><span>${txt}</span></div>`;
  return `
    <div class="modal-backdrop" id="sb-help-modal">
      <div class="modal-card">
        <h2><span>👆 Come si usa il tabellone</span></h2>
        ${row('🟦🟨', 'Tocca la <strong>metà di una squadra</strong> per assegnarle un punto')}
        ${row('✏️', 'Tocca il <strong>nome</strong> per cambiare nome a squadra/giocatore')}
        ${row('🎾', 'Tocca il <strong>nome di chi serve</strong> per scegliere o cambiare battitore (anche a caso)')}
        ${row('➕', 'In basso: <strong>ingrandisci i numeri</strong> (tocca più volte per i 4 livelli)')}
        ${row('🔢', 'In basso: passa a <strong>solo punteggio</strong> o vista completa con game e set')}
        ${row('🔊', 'In basso: accendi/spegni la <strong>voce</strong>')}
        ${row('▲', `Il <strong>triangolino in basso</strong> apre la barra con Annulla, Riepilogo${isLiteMode() ? ', Bluetooth' : ''}, Opzioni e Nuova partita`)}
        ${row('📋', '<strong>Riepilogo</strong>: cambia regole, modalità, battitore e nomi senza uscire dalla partita')}
        ${row('i', 'Rivedi questa guida quando vuoi dal <strong>cerchietto in basso a sinistra</strong>')}
        <button class="btn primary block mt" id="sb-help-close">Ho capito, si gioca!</button>
      </div>
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
          <div><strong>Punto Killer</strong><p class="mb0 small">Vantaggio classico, ma su vantaggio pari il punto dopo decide - ignorato se attivo il Punto d'oro</p></div>
          <label class="switch"><input type="checkbox" id="quick-killer-point" ${match.killerPointRule ? 'checked' : ''} ${match.goldenPoint ? 'disabled' : ''}><span class="slider"></span></label>
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
        ${settings.announceTimeEveryMatches ? `
        <div class="field mt mb0">
          <label>🗣️ Frase dell'annuncio orario</label>
          <div class="row" style="align-items:center;gap:6px;">
            <input id="quick-time-announce-phrase" placeholder="Sono le {orario}. Avete tempo per un'altra partita?" maxlength="140" value="${escapeHtml(settings.timeAnnouncePhrase || '')}" style="flex:1;">
            ${micButtonHtml('mic-quick-time-announce-phrase')}
          </div>
          <div class="row mt" style="gap:8px;">
            <button class="btn secondary small block" id="quick-save-time-announce-phrase">💾 Salva frase</button>
            <button class="btn ghost small block" id="quick-reset-time-announce-phrase">↺ Predefinita</button>
          </div>
        </div>
        ` : ''}
        <button class="btn primary block mt" id="quick-summary-done">✅ Fatto, riprendi</button>
      </div>
    </div>
  `;
}

// Stessa grafica della riga giocatore in "Nuova partita" (vedi teamHalf più
// sotto e paintSetup): maniglia 👆, campo nome modificabile sul posto,
// racchetta per scegliere chi batte, microfono - così chi già conosce quei
// controlli li ritrova identici anche qui, invece del vecchio elenco di
// pulsanti + matita separata che apriva un'altra finestra.
function serverPickerModal(settings) {
  const teamRow = (team, idx, name) => {
    const active = match.server === team && idx === ((team === 'A' ? match.serverPlayerA : match.serverPlayerB) || 0);
    const inputId = `srv-name-${team}-${idx}`;
    return `
      <div class="field mb0 row player-row" style="align-items:center;gap:6px;">
        <span class="drag-handle" aria-label="Giocatore" style="cursor:default;touch-action:auto;">👆</span>
        <input id="${inputId}" data-server-name="${team}:${idx}" value="${escapeHtml(name)}" maxlength="24" style="flex:1;">
        <button type="button" class="btn-server-pick ${active ? 'active' : ''}" data-pick-live-server="${team}:${idx}" aria-label="Fa battere">🎾</button>
        ${micButtonHtml(`mic-${inputId}`)}
      </div>
    `;
  };
  const teamCard = (team, color, players) => `
    <div class="card" style="border-color:${color};border-width:2px;">
      ${players.map((name, idx) => teamRow(team, idx, name)).join('')}
    </div>
  `;
  return `
    <div class="modal-backdrop" id="server-picker-modal">
      <div class="modal-card">
        <h2><span>🎾 Chi batte?</span><button class="icon-btn" id="server-picker-close" aria-label="Chiudi">✕</button></h2>
        <button class="btn primary block mt" id="pick-random-server" style="font-size:1.15em;padding:16px;">🎲 Battitore casuale</button>
        <div class="mt">
          ${teamCard('A', settings.teamAColor, match.teamAPlayers)}
          ${teamCard('B', settings.teamBColor, match.teamBPlayers)}
        </div>
      </div>
    </div>
  `;
}

// Finestra di rinomina (nome squadra o singolo giocatore), aperta dal tocco
// sul nome in cima al tabellone o dalla matita nel picker "Chi batte?" -
// microfono (stretto) a sinistra della matita per dettare il nome a voce
// invece di scriverlo, come richiesto dall'utente.
function renameModal() {
  if (!renameTarget) return '';
  const { kind, team, idx } = renameTarget;
  const current = kind === 'team'
    ? (team === 'A' ? match.teamAName : match.teamBName)
    : ((team === 'A' ? match.teamAPlayers : match.teamBPlayers)[idx] || '');
  const title = kind === 'team'
    ? `Nome ${match.mode === 'singles' ? 'giocatore' : 'squadra'} ${team === 'A' ? '1' : '2'}`
    : 'Nome giocatore';
  return `
    <div class="modal-backdrop" id="rename-modal">
      <div class="modal-card">
        <h2><span>✏️ ${title}</span><button class="icon-btn" id="rename-modal-close" aria-label="Chiudi">✕</button></h2>
        <div class="field row" style="align-items:center;gap:6px;">
          ${micButtonHtml('mic-rename-input', 'narrow')}
          <span aria-hidden="true">✏️</span>
          <input id="rename-input" value="${escapeHtml(current)}" maxlength="24" style="flex:1;">
        </div>
        <button class="btn primary block mt" id="rename-save">Salva</button>
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

function matchOverOverlay(settings) {
  const title = match.matchWinner
    ? `🏆 ${escapeHtml(teamName(match, match.matchWinner))} vince!`
    : '🤝 Pareggio!';
  const detail = match.format === 'time'
    ? `${match.currentSet.gamesA}-${match.currentSet.gamesB} giochi`
    : match.sets.map((s) => `${s.a}-${s.b}`).join(' &nbsp;·&nbsp; ');
  const btnText = escapeHtml(settings.newMatchButtonText || 'Inizia nuova partita');
  // null = usa lo sfondo/testo predefiniti del .btn.primary (gradiente
  // accent) - lo stile inline qui sotto li sovrascrive solo se personalizzati.
  const btnStyle = (settings.newMatchButtonBg ? `background:${settings.newMatchButtonBg};` : '')
    + (settings.newMatchButtonTextColor ? `color:${settings.newMatchButtonTextColor};` : '');
  return `
    <div class="sb-overlay">
      <h2>${title}</h2>
      <p>${detail}</p>
      <p class="small">✅ Salvata automaticamente nelle statistiche. Puoi condividerla in un secondo momento dallo storico partite.</p>
      <button class="btn primary block sb-overlay-cta" id="sb-overlay-newmatch" style="${btnStyle}"><span class="sb-overlay-cta-icon">🎾</span> ${btnText}</button>
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
