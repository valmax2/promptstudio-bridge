import { getState, updateSettings } from '../store.js';
import { navigate } from '../router.js';
import { isCloudReady } from '../cloud.js';
import { pushProfile } from '../cloud.js';
import { toast } from '../app.js';
import {
  KEY_LABELS, ACTION_LABELS, PATTERN_LABELS, remoteSupported, captureNextPress,
  enableRemote, disableRemote, listenRawPresses, openBluetoothSettings,
  bleTagSupported, scanBleTags, connectBleTag,
} from '../ble-remote.js';
import { escapeHtml, uid as genId, BACK_ICON } from '../utils.js';
import { isLiteMode } from '../lite-mode.js';
import { canUseRemote } from '../gate-config.js';

let bleScanResults = [];
let bleScanning = false;
let bleConnecting = false;

// "Add binding" (advanced/manual) wizard state: null -> 'waiting' (press a
// key) -> 'pattern' (choose single/double/doubleSlow) -> 'action' (choose
// what it does) -> saved.
let addBindingStep = null;
let addBindingCapture = null;
let addBindingPattern = null;
let addBindingHint = null;

// Guided step-by-step wizard for pairing one device at a time - the whole
// point of task #67: someone with zero Bluetooth experience should never
// have to guess what to do next. null = not in the wizard (showing the
// overview instead). Steps: 'slot' -> 'type' -> 'pairRemote'/'pairTag' ->
// 'capture' -> 'done'.
let wizardStep = null;
let wizardSlot = 'A';
let wizardCapturing = false;

// Rolling log of raw presses seen while this screen is open, newest first -
// lets the user see with their own eyes whether a press is reaching the app
// at all, before worrying about which action it's bound to.
let liveLog = [];
let stopLiveFeed = null;

// Elenco servizi/caratteristiche GATT dell'ultimo tag collegato che risulta
// senza NESSUNA caratteristica NOTIFY/INDICATE (bottone quindi non
// rilevabile) - permette di vedere il dettaglio tecnico dentro l'app invece
// di dover usare un'app esterna come nRF Connect per capire cosa espone un
// tracker non compatibile.
let lastConnectDiagnostics = null;
let lastConnectSubscribed = 0;
let diagnosticsOpen = false;

export async function renderBluetoothSetup(el) {
  bleScanResults = [];
  bleScanning = false;
  bleConnecting = false;
  addBindingStep = null;
  addBindingCapture = null;
  addBindingPattern = null;
  addBindingHint = null;
  liveLog = [];
  lastConnectDiagnostics = null;
  lastConnectSubscribed = 0;
  diagnosticsOpen = false;

  const { settings } = getState();
  const nothingConfiguredYet = !settings.remoteBindings.length && !settings.bleTags.length;
  wizardStep = nothingConfiguredYet ? 'slot' : null;
  wizardSlot = 'A';
  wizardCapturing = false;

  if (remoteSupported()) await enableRemote();
  stopLiveFeed = listenRawPresses(({ keyCode, deviceDescriptor, deviceName }) => {
    liveLog = [
      { time: Date.now(), deviceName: deviceName || 'Dispositivo sconosciuto', label: KEY_LABELS[keyCode] || String(keyCode) },
      ...liveLog,
    ].slice(0, 8);
    renderLiveLog(el);
  });

  paint(el);

  return () => {
    stopLiveFeed?.();
    stopLiveFeed = null;
    if (remoteSupported()) disableRemote();
  };
}

function paint(el) {
  const { settings } = getState();

  el.innerHTML = `
    <div class="topbar"><div class="row"><button class="icon-btn" id="bt-back" aria-label="Indietro">${BACK_ICON}</button><h1>🔵 Bluetooth &amp; Telecomandi</h1></div>
      <button class="btn ghost small" id="bt-help">❓ Come funziona</button>
    </div>

    <div class="card" id="bt-live-card">
      <h2>📡 Test dal vivo</h2>
      ${isLiteMode() ? '' : `<p class="small">Premi un pulsante sul dispositivo appena collegato: se il telefono lo riceve, lo vedrai comparire qui sotto <strong>subito</strong>.</p>`}
      <div id="bt-live-log"></div>
      ${lastConnectDiagnostics ? '<button class="btn ghost small block mt" id="bt-diagnostics">🔍 Diagnostica ultimo tag collegato</button>' : ''}
    </div>
    ${diagnosticsOpen ? diagnosticsModal() : ''}

    <div class="card">
      <div class="toggle-row">
        <div><strong>Abilita telecomando</strong><p class="mb0 small">Deve essere attivo perché le associazioni funzionino durante la partita</p></div>
        <label class="switch"><input type="checkbox" id="ble-enabled" ${settings.bleRemoteEnabled ? 'checked' : ''}><span class="slider"></span></label>
      </div>
      ${!settings.bleRemoteEnabled ? '<p class="small mb0" style="color:var(--danger,#e5484d);">⚠️ Spento: anche se colleghi tutto qui sotto, in partita i pulsanti non faranno nulla finché non lo riattivi.</p>' : ''}
    </div>

    ${wizardStep ? wizardCard() : overviewCard(settings)}

    ${isLiteMode() ? '' : `
    <div class="card">
      <h2>🔵 Uscita audio</h2>
      <p class="small">L'annuncio vocale segue automaticamente l'uscita audio attiva del telefono: se una cassa o cuffia Bluetooth è già collegata (dalle Impostazioni Bluetooth di Android), l'audio esce da lì senza bisogno di scegliere nulla qui.</p>
    </div>
    `}

    <div class="modal-backdrop hidden" id="bt-help-modal">
      <div class="modal-card">
        <h2><span>❓ Come funziona il Bluetooth</span><button class="icon-btn" id="bt-help-close" aria-label="Chiudi">✕</button></h2>
        <p><strong>Ci sono due tipi di dispositivo</strong>, e la procedura guidata te lo chiede subito:</p>
        <p><strong>🎮 Telecomandi e tastiere</strong> (es. "selfie remote", scatto foto da smartwatch) si comportano come una tastiera Bluetooth. Per motivi di sicurezza, <strong>nessuna app può accoppiarli da sola</strong>: vanno accoppiati prima dalle Impostazioni Bluetooth di Android, poi si torna qui.</p>
        <p><strong>🔑 Tag/portachiavi "trova oggetto"</strong> (es. iTag) invece l'app li trova e collega da sola: basta premere "Cerca", senza toccare le Impostazioni di Android.</p>
        <p><strong>📡 Test dal vivo</strong>, in alto, mostra subito ogni pressione che arriva al telefono - usalo per capire se il problema è nell'accoppiamento (non arriva nulla) o nell'associazione (arriva ma non fa quello che vuoi).</p>
        <button class="btn primary block mt" id="bt-help-done">Ho capito</button>
      </div>
    </div>
  `;

  renderLiveLog(el);
  wireEvents(el);
}

// ---- Guided wizard (one device at a time) ----
// Dettaglio tecnico dei servizi/caratteristiche GATT dell'ultimo tag
// collegato senza nessuna caratteristica NOTIFY/INDICATE - stessa
// informazione che prima si poteva vedere solo con un'app esterna come nRF
// Connect (usata per diagnosticare tracker come iTag e Nutale Mate).
function diagnosticsModal() {
  const services = lastConnectDiagnostics || [];
  const anyNotifyCapable = services.some((s) => (s.characteristics || []).some((c) => c.notify));
  let explanation;
  if (!anyNotifyCapable) {
    explanation = 'Nessuna caratteristica <strong>NOTIFY</strong> trovata: è per questo che il bottone fisico non può arrivare come evento all\'app, qualunque azione tu ci abbia associato. Se conosci il produttore, questo elenco aiuta a capire se il dispositivo supporta un profilo diverso (es. serve un\'app dedicata del produttore).';
  } else if (lastConnectSubscribed === 0) {
    explanation = 'Ci sono caratteristiche <strong>NOTIFY</strong> (segnate qui sotto), ma il telefono non è riuscito ad attivarne nessuna durante il collegamento - prova a disconnetterti e ricollegarti dal dispositivo qui sotto.';
  } else {
    explanation = `Attivate <strong>${lastConnectSubscribed}</strong> caratteristiche notificabili su ${services.reduce((n, s) => n + (s.characteristics || []).filter((c) => c.notify).length, 0)} trovate. Se il bottone comunque non arriva in "Test dal vivo", probabile che nessuna di queste corrisponda davvero al bottone fisico (es. sono solo batteria/stato sistema) - il dispositivo potrebbe non essere compatibile.`;
  }
  return `
    <div class="modal-backdrop" id="bt-diagnostics-modal">
      <div class="modal-card">
        <h2><span>🔍 Servizi rilevati</span><button class="icon-btn" id="bt-diagnostics-close" aria-label="Chiudi">✕</button></h2>
        <p class="small">${explanation}</p>
        ${services.length ? services.map((s) => `
          <div class="mt">
            <strong class="small">Servizio ${escapeHtml(s.uuid)}</strong>
            ${(s.characteristics || []).map((c) => `<p class="small mb0">• ${escapeHtml(c.uuid)} ${c.notify ? '(notify)' : ''}</p>`).join('')}
          </div>
        `).join('') : '<p class="small">Nessun servizio trovato.</p>'}
        <button class="btn primary block mt" id="bt-diagnostics-done">Chiudi</button>
      </div>
    </div>
  `;
}

function wizardCard() {
  const slotLabel = wizardSlot === 'A' ? 'Squadra Noi' : 'Squadra Avversari';
  const stepNumber = { slot: 1, type: 2, pairRemote: 3, pairTag: 3, capture: 4, done: 5 }[wizardStep];
  return `
    <div class="card">
      <h2>Procedura guidata · Passo ${stepNumber} di 5</h2>

      ${wizardStep === 'slot' ? `
        <p class="small">Per quale squadra è questo dispositivo?</p>
        <button class="btn secondary block mt" data-wizard-slot="A">🟦 Squadra Noi</button>
        <button class="btn secondary block mt" data-wizard-slot="B">🟧 Squadra Avversari</button>
      ` : ''}

      ${wizardStep === 'type' ? `
        <p class="small">Dispositivo per: <strong>${slotLabel}</strong>. Che dispositivo hai?</p>
        ${remoteSupported() ? '<button class="btn secondary block mt" data-wizard-type="remote">🎮 Un telecomando o una tastiera</button>' : ''}
        ${bleTagSupported() ? '<button class="btn secondary block mt" data-wizard-type="tag">🔑 Un tag/portachiavi "trova oggetto"</button>' : ''}
        ${!remoteSupported() && !bleTagSupported() ? '<p class="small">Richiede l\'app installata come APK Android (non funziona nell\'anteprima da browser).</p>' : ''}
        <button class="btn ghost small mt" id="wizard-back">← Indietro</button>
      ` : ''}

      ${wizardStep === 'pairRemote' ? `
        <p class="small">Dispositivo per: <strong>${slotLabel}</strong>. Accoppialo prima dalle Impostazioni Bluetooth del telefono (come faresti con una cuffia).</p>
        <button class="btn secondary block mt" id="open-android-bt">📱 Apri Impostazioni Bluetooth Android</button>
        <button class="btn primary block mt" id="wizard-remote-done">✓ Fatto, l'ho accoppiato</button>
        <button class="btn ghost small mt" id="wizard-back">← Indietro</button>
      ` : ''}

      ${wizardStep === 'pairTag' ? `
        <p class="small">Dispositivo per: <strong>${slotLabel}</strong>. Cerca il tag qui sotto e collegalo.</p>
        <button class="btn secondary block mt" id="bletag-scan" ${bleScanning ? 'disabled' : ''}>${bleScanning ? 'Ricerca in corso… (6s)' : '🔍 Cerca tag Bluetooth'}</button>
        <div class="mt">
          ${bleScanResults.map((d) => `
            <div class="list-item">
              <div class="avatar">🔑</div>
              <div class="meta"><strong>${escapeHtml(d.name)}</strong><span>${d.address}</span></div>
              <button class="btn primary small" data-tag-connect="${d.address}" data-tag-name="${escapeHtml(d.name)}" ${bleConnecting ? 'disabled' : ''}>Connetti</button>
            </div>
          `).join('') || (bleScanning ? '' : '<p class="small mb0">Nessun dispositivo ancora cercato.</p>')}
        </div>
        <button class="btn ghost small mt" id="wizard-back">← Indietro</button>
      ` : ''}

      ${wizardStep === 'capture' ? `
        <p class="small">Dispositivo per: <strong>${slotLabel}</strong>. Ora premi il pulsante che userai per segnare il punto.</p>
        ${wizardCapturing ? '<p class="mb0">📡 Premi un pulsante entro 8 secondi…</p>' : `<button class="btn primary block mt" id="wizard-capture">🔴 Premi qui e poi il pulsante sul dispositivo</button>`}
      ` : ''}

      ${wizardStep === 'done' ? `
        <p>🎉 Fatto! ${slotLabel} può già segnare punti e annullare (doppio click).</p>
        <p class="small">Prova a premere il pulsante: dovresti vederlo comparire qui sopra in "Test dal vivo".</p>
        <button class="btn secondary block mt" id="wizard-add-another">➕ Aggiungi un altro dispositivo</button>
        <button class="btn primary block mt" id="wizard-finish">✓ Fine, torna alle impostazioni</button>
      ` : ''}
    </div>
  `;
}

// ---- Overview shown once at least one device is already configured ----
function overviewCard(settings) {
  return `
    <div class="card">
      <div class="row between"><h2>Dispositivi configurati</h2></div>
      ${settings.bleTags.map((t) => tagRow(t, settings.remoteBindings)).join('')}
      ${groupedRemoteRows(settings.remoteBindings)}
      <button class="btn primary block mt" id="wizard-start">➕ Aggiungi un altro dispositivo (guidata)</button>
    </div>

    <div class="card">
      <label style="display:block;">Gestione avanzata (associazioni singole)</label>
      ${renderBindingsUI(settings.remoteBindings)}
    </div>
  `;
}

// Collapses the flat remoteBindings list into one row per physical device,
// so the overview shows "un dispositivo" instead of two loose rows (single
// click, double click) for the same remote.
function groupedRemoteRows(bindings) {
  const byDevice = new Map();
  bindings.forEach((b) => {
    if (!byDevice.has(b.deviceDescriptor)) byDevice.set(b.deviceDescriptor, { deviceName: b.deviceName, bindings: [] });
    byDevice.get(b.deviceDescriptor).bindings.push(b);
  });
  return [...byDevice.values()].map((d) => `
    <div class="card" style="background:var(--surface-2);margin-top:10px;">
      <div class="toggle-row">
        <div><strong>🎮 ${escapeHtml(d.deviceName)}</strong><p class="mb0 small">${d.bindings.length} associazion${d.bindings.length === 1 ? 'e' : 'i'}</p></div>
      </div>
    </div>
  `).join('');
}

function renderLiveLog(el) {
  const box = el.querySelector('#bt-live-log');
  if (!box) return;
  box.innerHTML = liveLog.length
    ? `<div class="mt">${liveLog.map((e) => `<div class="row between" style="padding:3px 0;"><span class="small">${escapeHtml(e.deviceName)} · ${escapeHtml(e.label)}</span><span class="small" style="opacity:0.6;">${new Date(e.time).toLocaleTimeString('it-IT')}</span></div>`).join('')}</div>`
    : '<p class="small mb0" style="opacity:0.7;">(ancora nessuna pressione ricevuta in questa schermata)</p>';
}

function wireEvents(el) {
  el.querySelector('#bt-back').addEventListener('click', () => navigate('settings'));

  const helpModal = el.querySelector('#bt-help-modal');
  el.querySelector('#bt-help').addEventListener('click', () => helpModal.classList.remove('hidden'));
  el.querySelector('#bt-help-close').addEventListener('click', () => helpModal.classList.add('hidden'));
  el.querySelector('#bt-help-done').addEventListener('click', () => helpModal.classList.add('hidden'));
  helpModal.addEventListener('click', (e) => { if (e.target === helpModal) helpModal.classList.add('hidden'); });

  el.querySelector('#open-android-bt')?.addEventListener('click', async () => {
    const opened = await openBluetoothSettings();
    if (!opened) toast('Apri manualmente Impostazioni → Bluetooth sul telefono');
  });

  el.querySelector('#ble-enabled')?.addEventListener('change', (e) => {
    if (e.target.checked && !canUseRemote()) {
      e.target.checked = false;
      toast('Il telecomando è una funzione Pro');
      navigate('settings');
      return;
    }
    updateSettings({ bleRemoteEnabled: e.target.checked });
    paint(el);
    syncSettings();
  });

  // ---- Wizard navigation ----
  el.querySelector('#wizard-start')?.addEventListener('click', () => { wizardStep = 'slot'; paint(el); });
  el.querySelector('#wizard-back')?.addEventListener('click', () => {
    wizardStep = wizardStep === 'type' ? 'slot' : 'type';
    paint(el);
  });
  el.querySelectorAll('[data-wizard-slot]').forEach((btn) => btn.addEventListener('click', () => {
    wizardSlot = btn.dataset.wizardSlot;
    wizardStep = 'type';
    paint(el);
  }));
  el.querySelectorAll('[data-wizard-type]').forEach((btn) => btn.addEventListener('click', () => {
    wizardStep = btn.dataset.wizardType === 'remote' ? 'pairRemote' : 'pairTag';
    bleScanResults = [];
    paint(el);
  }));
  el.querySelector('#wizard-remote-done')?.addEventListener('click', () => { wizardStep = 'capture'; paint(el); });
  el.querySelector('#wizard-capture')?.addEventListener('click', () => wizardCapture(el));
  el.querySelector('#wizard-add-another')?.addEventListener('click', () => {
    wizardStep = 'slot';
    wizardSlot = 'A';
    paint(el);
  });
  el.querySelector('#wizard-finish')?.addEventListener('click', () => { wizardStep = null; paint(el); });

  // ---- Advanced manual binding editor ----
  el.querySelector('#add-binding')?.addEventListener('click', () => startAddBinding(el));
  el.querySelectorAll('[data-configure-tag]').forEach((btn) => btn.addEventListener('click', () => {
    startAddBinding(el, btn.dataset.configureTag);
  }));
  el.querySelectorAll('[data-pick-pattern]').forEach((btn) => btn.addEventListener('click', () => {
    addBindingPattern = btn.dataset.pickPattern;
    addBindingStep = 'action';
    paint(el);
  }));
  el.querySelectorAll('[data-pick-action]').forEach((btn) => btn.addEventListener('click', () => {
    const binding = {
      id: genId(),
      deviceDescriptor: addBindingCapture.deviceDescriptor,
      deviceName: addBindingCapture.deviceName || 'Telecomando',
      keyCode: addBindingCapture.keyCode,
      keyLabel: KEY_LABELS[addBindingCapture.keyCode] || String(addBindingCapture.keyCode),
      pattern: addBindingPattern,
      action: btn.dataset.pickAction,
    };
    updateSettings({ remoteBindings: [...getState().settings.remoteBindings, binding] });
    addBindingStep = null;
    addBindingCapture = null;
    addBindingPattern = null;
    addBindingHint = null;
    toast('Associazione aggiunta!');
    paint(el);
    syncSettings();
  }));
  el.querySelector('#cancel-binding')?.addEventListener('click', () => {
    addBindingStep = null;
    addBindingCapture = null;
    addBindingPattern = null;
    addBindingHint = null;
    paint(el);
  });
  el.querySelectorAll('[data-remove-binding]').forEach((btn) => btn.addEventListener('click', () => {
    updateSettings({ remoteBindings: getState().settings.remoteBindings.filter((b) => b.id !== btn.dataset.removeBinding) });
    paint(el);
    syncSettings();
  }));

  el.querySelector('#bt-diagnostics')?.addEventListener('click', () => { diagnosticsOpen = true; paint(el); });
  el.querySelector('#bt-diagnostics-close')?.addEventListener('click', () => { diagnosticsOpen = false; paint(el); });
  el.querySelector('#bt-diagnostics-done')?.addEventListener('click', () => { diagnosticsOpen = false; paint(el); });
  el.querySelector('#bt-diagnostics-modal')?.addEventListener('click', (e) => {
    if (e.target.id === 'bt-diagnostics-modal') { diagnosticsOpen = false; paint(el); }
  });

  el.querySelector('#bletag-scan')?.addEventListener('click', async () => {
    bleScanning = true;
    bleScanResults = [];
    paint(el);
    const { devices, error } = await scanBleTags();
    bleScanResults = devices.filter((d) => !getState().settings.bleTags.some((t) => t.address === d.address));
    bleScanning = false;
    if (error) toast('Errore: ' + error);
    else if (!bleScanResults.length) {
      toast('Nessun dispositivo trovato. Assicurati che sia acceso e vicino, e che la Localizzazione del telefono sia attiva.');
    }
    paint(el);
  });
  el.querySelectorAll('[data-tag-connect]').forEach((btn) => {
    btn.addEventListener('click', async () => {
      bleConnecting = true;
      paint(el);
      try {
        const { subscribed, services } = await connectBleTag(btn.dataset.tagConnect);
        const tag = { id: genId(), address: btn.dataset.tagConnect, deviceName: btn.dataset.tagName, enabled: true };
        updateSettings({ bleTags: [...getState().settings.bleTags, tag] });
        syncSettings();
        // Sempre salvato, anche con subscribed > 0: una caratteristica NOTIFY
        // può benissimo esistere (es. livello batteria) senza che sia quella
        // del bottone fisico, quindi "si connette ma il bottone non arriva
        // mai" può capitare comunque - il tasto Diagnostica deve restare
        // disponibile per controllare in ogni caso, non solo quando non si
        // trova NESSUNA caratteristica notificabile.
        lastConnectDiagnostics = services;
        lastConnectSubscribed = subscribed;
        if (subscribed === 0) {
          toast('Connesso, ma nessun pulsante rilevato su questo dispositivo: potrebbe non essere compatibile. Tocca "Diagnostica" qui sopra per i dettagli.', 6000);
        } else if (wizardStep === 'pairTag') {
          wizardStep = 'capture';
          toast('Connesso!');
        } else {
          toast('Connesso! Prova a premere il pulsante: dovresti vederlo comparire nel Test dal vivo qui sopra.');
        }
      } catch (err) {
        toast('Connessione fallita: ' + (err.message || err));
      }
      bleConnecting = false;
      paint(el);
    });
  });
  el.querySelectorAll('[data-tag-enabled]').forEach((input) => input.addEventListener('change', (e) => {
    const id = input.dataset.tagEnabled;
    const enabled = e.target.checked;
    const tags = getState().settings.bleTags;
    // La connessione/disconnessione effettiva è gestita globalmente in
    // app.js (reconcileBleTags), che reagisce a questo stesso cambio di
    // stato - così un tag resta connesso anche fuori da questa schermata.
    updateSettings({ bleTags: tags.map((t) => (t.id === id ? { ...t, enabled } : t)) });
    syncSettings();
  }));
  el.querySelectorAll('[data-tag-forget]').forEach((btn) => btn.addEventListener('click', () => {
    const id = btn.dataset.tagForget;
    updateSettings({ bleTags: getState().settings.bleTags.filter((t) => t.id !== id) });
    paint(el);
    syncSettings();
  }));
}

// Captures the next press for the device just paired/connected in the
// wizard and binds it straight to point-for-this-slot (single click) and
// undo (double click) - the simple default that covers the vast majority of
// use, with the manual editor below still available for anything fancier.
async function wizardCapture(el) {
  wizardCapturing = true;
  paint(el);
  const capture = await captureNextPress(8000);
  wizardCapturing = false;
  if (!capture) {
    toast('Nessun tasto rilevato, riprova');
    paint(el);
    return;
  }
  const pointAction = wizardSlot === 'A' ? 'pointA' : 'pointB';
  const newBindings = [
    { pattern: 'single', action: pointAction },
    { pattern: 'double', action: 'undo' },
  ].map(({ pattern, action }) => ({
    id: genId(),
    deviceDescriptor: capture.deviceDescriptor,
    deviceName: capture.deviceName || 'Telecomando',
    keyCode: capture.keyCode,
    keyLabel: KEY_LABELS[capture.keyCode] || String(capture.keyCode),
    pattern,
    action,
  }));
  updateSettings({ remoteBindings: [...getState().settings.remoteBindings, ...newBindings] });
  wizardStep = 'done';
  paint(el);
  syncSettings();
}

async function startAddBinding(el, hint) {
  addBindingStep = 'waiting';
  addBindingHint = hint || null;
  paint(el);
  const capture = await captureNextPress(8000);
  if (!capture) {
    toast('Nessun tasto rilevato, riprova');
    addBindingStep = null;
    addBindingHint = null;
  } else {
    addBindingCapture = capture;
    addBindingStep = 'pattern';
  }
  paint(el);
}

function renderBindingsUI(bindings) {
  if (addBindingStep === 'waiting') {
    return `<div class="card" style="background:var(--surface-2);margin-top:10px;">
      <p class="mb0">📡 Premi ${addBindingHint ? `il pulsante su <strong>${escapeHtml(addBindingHint)}</strong>` : 'un tasto sul telecomando'} entro 8 secondi…</p>
    </div>`;
  }
  if (addBindingStep === 'pattern') {
    return `<div class="card" style="background:var(--surface-2);margin-top:10px;">
      <p class="small">${escapeHtml(addBindingCapture.deviceName)} · ${KEY_LABELS[addBindingCapture.keyCode] || addBindingCapture.keyCode}</p>
      <label>Che tipo di pressione?</label>
      ${Object.entries(PATTERN_LABELS).map(([key, label]) => `<button class="btn secondary block mt" data-pick-pattern="${key}">${label}</button>`).join('')}
      <button class="btn ghost small mt" id="cancel-binding">Annulla</button>
    </div>`;
  }
  if (addBindingStep === 'action') {
    return `<div class="card" style="background:var(--surface-2);margin-top:10px;">
      <p class="small">${escapeHtml(addBindingCapture.deviceName)} · ${KEY_LABELS[addBindingCapture.keyCode] || addBindingCapture.keyCode} · ${PATTERN_LABELS[addBindingPattern]}</p>
      <label>Cosa deve fare?</label>
      ${Object.entries(ACTION_LABELS).map(([key, label]) => `<button class="btn secondary block mt" data-pick-action="${key}">${label}</button>`).join('')}
      <button class="btn ghost small mt" id="cancel-binding">Annulla</button>
    </div>`;
  }
  return `
    <div class="mt">
      ${bindings.length ? bindings.map(bindingRow).join('') : '<p class="small">Nessuna associazione ancora configurata.</p>'}
      <button class="btn secondary small mt" id="add-binding">+ Aggiungi associazione manuale</button>
    </div>
  `;
}

function bindingRow(b) {
  return `<div class="list-item">
    <div class="avatar">🎮</div>
    <div class="meta">
      <strong>${ACTION_LABELS[b.action] || b.action}</strong>
      <span>${escapeHtml(b.deviceName)} · ${b.keyLabel} · ${PATTERN_LABELS[b.pattern]}</span>
    </div>
    <button class="btn ghost small" data-remove-binding="${b.id}">✕</button>
  </div>`;
}

function tagRow(t, remoteBindings) {
  const hasBindings = remoteBindings.some((b) => b.deviceDescriptor === t.address);
  return `<div class="card" style="background:var(--surface-2);margin-top:10px;">
    <div class="toggle-row">
      <div><strong>🔑 ${escapeHtml(t.deviceName || 'Dispositivo')}</strong><p class="mb0 small">${t.address}</p></div>
      <label class="switch"><input type="checkbox" data-tag-enabled="${t.id}" ${t.enabled ? 'checked' : ''}><span class="slider"></span></label>
    </div>
    ${hasBindings
      ? `<p class="small mb0" style="color:var(--accent,#1FBE96);">✓ Pulsante configurato</p>`
      : `<p class="small mb0" style="color:var(--danger,#e5484d);">⚠️ Pulsante non ancora configurato: il tag è connesso ma non fa ancora nulla.</p>`}
    <div class="row mt" style="gap:6px;flex-wrap:wrap;">
      <button class="btn primary small" data-configure-tag="${escapeHtml(t.deviceName || 'questo tag')}">🎮 Configura pulsante</button>
      <button class="btn ghost small" data-tag-forget="${t.id}">Dimentica dispositivo</button>
    </div>
  </div>`;
}

async function syncSettings() {
  if (!isCloudReady() || !getState().settings.cloudSyncEnabled) return;
  try { await pushProfile({ ...getState().profile, settings: getState().settings }); } catch {}
}
