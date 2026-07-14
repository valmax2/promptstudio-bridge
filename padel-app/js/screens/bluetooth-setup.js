import { getState, updateSettings } from '../store.js';
import { navigate } from '../router.js';
import { isCloudReady } from '../cloud.js';
import { pushProfile } from '../cloud.js';
import { toast } from '../app.js';
import {
  KEY_LABELS, ACTION_LABELS, PATTERN_LABELS, remoteSupported, captureNextPress,
  enableRemote, disableRemote, listenRawPresses,
  bleTagSupported, scanBleTags, connectBleTag, disconnectBleTag,
} from '../ble-remote.js';
import { escapeHtml, uid as genId, BACK_ICON } from '../utils.js';

let bleScanResults = [];
let bleScanning = false;
let bleConnecting = false;

// "Add binding" wizard state: null -> 'waiting' (press a key) -> 'pattern'
// (choose single/double/doubleSlow) -> 'action' (choose what it does) -> saved.
let addBindingStep = null;
let addBindingCapture = null;
let addBindingPattern = null;
// Optional label shown during the "waiting" step (e.g. a tag's name), so
// pressing a specific device's button doesn't feel like a blind guess even
// though the capture itself still accepts any device.
let addBindingHint = null;

// "Configurazione rapida": null | 'A' | 'B' | 'single' - which quick slot is
// currently waiting for a key press.
let quickCapturing = null;
// 'two' = un telecomando per squadra, 'one' = un solo telecomando per entrambe.
let quickSetupMode = 'two';

// Rolling log of raw presses seen while this screen is open, newest first -
// lets the user see with their own eyes whether a press is reaching the app
// at all, before worrying about which action it's bound to.
let liveLog = [];
let stopLiveFeed = null;

export async function renderBluetoothSetup(el) {
  bleScanResults = [];
  bleScanning = false;
  bleConnecting = false;
  addBindingStep = null;
  addBindingCapture = null;
  addBindingPattern = null;
  addBindingHint = null;
  quickCapturing = null;
  liveLog = [];

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
    <div class="topbar"><div class="row"><button class="icon-btn" id="bt-back" aria-label="Torna alle impostazioni">${BACK_ICON}</button><h1>🔵 Bluetooth &amp; Telecomandi</h1></div></div>

    <div class="card">
      <p class="small">Qui puoi collegare telecomandi Bluetooth e portachiavi "trova oggetto", e decidere cosa deve fare ogni pulsante (punto, annulla, ecc). Tutto in un unico posto.</p>
    </div>

    <div class="card" id="bt-live-card">
      <h2>📡 Test dal vivo</h2>
      <p class="small">Premi un pulsante su un telecomando accoppiato o su un tag collegato: se il telefono lo riceve, lo vedrai comparire qui sotto <strong>subito</strong>. Se non compare nulla, il dispositivo non è ancora accoppiato/collegato correttamente - prova prima dalle Impostazioni Bluetooth di Android (per i telecomandi) o dalla sezione "Portachiavi" qui sotto.</p>
      <div id="bt-live-log"></div>
    </div>

    <div class="card">
      <div class="toggle-row">
        <div><strong>Abilita telecomando</strong><p class="mb0 small">Deve essere attivo perché le associazioni funzionino durante la partita</p></div>
        <label class="switch"><input type="checkbox" id="ble-enabled" ${settings.bleRemoteEnabled ? 'checked' : ''}><span class="slider"></span></label>
      </div>
      ${!settings.bleRemoteEnabled ? '<p class="small mb0" style="color:var(--danger,#e5484d);">⚠️ Spento: anche se colleghi tutto qui sotto, in partita i pulsanti non faranno nulla finché non lo riattivi.</p>' : ''}
    </div>

    ${remoteSupported() ? `
    <div class="card">
      <h2>🎮 Telecomandi Bluetooth</h2>
      <p class="small">Per telecomandi tipo "selfie remote", scatto foto da smartwatch, o tastiere Bluetooth generiche. <strong>Prima accoppia il dispositivo dalle Impostazioni Bluetooth di Android</strong> (come una tastiera), poi torna qui.</p>

      <div class="card" style="background:var(--surface-2);margin-top:10px;">
        <label>Configurazione rapida</label>
        <div class="segmented">
          <button data-quick-mode="two" class="${quickSetupMode === 'two' ? 'active' : ''}">🔀 Due telecomandi</button>
          <button data-quick-mode="one" class="${quickSetupMode === 'one' ? 'active' : ''}">🎯 Uno solo</button>
        </div>
        ${quickSetupMode === 'two' ? `
        <p class="small mt">Un telecomando diverso per ogni squadra. Su ciascuno: click singolo = punto, doppio click = annulla ultimo punto.</p>
        ${quickCapturing === 'A' ? '<p class="mb0">📡 Premi un tasto sul telecomando Slot 1 (Noi)…</p>' : `<button class="btn secondary block mt" id="quick-pair-a">🔵 Associa Slot 1 (Noi)</button>`}
        ${quickCapturing === 'B' ? '<p class="mb0 mt">📡 Premi un tasto sul telecomando Slot 2 (Avversari)…</p>' : `<button class="btn secondary block mt" id="quick-pair-b">🔵 Associa Slot 2 (Avversari)</button>`}
        ` : `
        <p class="small mt">Un solo telecomando per entrambe le squadre: click singolo = punto Noi, doppio click = punto Avversari, doppio click lento = annulla.</p>
        ${quickCapturing === 'single' ? '<p class="mb0">📡 Premi un tasto sul telecomando…</p>' : `<button class="btn secondary block mt" id="quick-pair-single">🔵 Associa telecomando unico</button>`}
        `}
      </div>

      <label class="mt" style="display:block;">Tutte le associazioni</label>
      ${renderBindingsUI(settings.remoteBindings)}
    </div>
    ` : `<div class="card"><h2>🎮 Telecomandi Bluetooth</h2><p class="small">Richiede l'app installata come APK Android (non funziona nell'anteprima da browser).</p></div>`}

    <div class="card">
      <h2>🔑 Portachiavi / Tag BLE <span class="small" style="opacity:0.7;">(sperimentale)</span></h2>
      ${bleTagSupported() ? `
        <p class="small">Per portachiavi "trova oggetto" e simili, che non si accoppiano come tastiera. Puoi collegare <strong>più di un tag</strong> (es. uno per squadra) - funziona con molti modelli economici, ma non è garantito su tutti.</p>
        ${settings.bleTags.map((t) => tagRow(t, settings.remoteBindings)).join('')}
        <button class="btn secondary block mt" id="bletag-scan" ${bleScanning ? 'disabled' : ''}>${bleScanning ? 'Ricerca in corso… (6s)' : (settings.bleTags.length ? '🔍 Cerca un altro tag' : '🔍 Cerca dispositivi')}</button>
        <div class="mt">
          ${bleScanResults.filter((d) => !settings.bleTags.some((t) => t.address === d.address)).map((d) => `
            <div class="list-item">
              <div class="avatar">🔑</div>
              <div class="meta"><strong>${escapeHtml(d.name)}</strong><span>${d.address}</span></div>
              <button class="btn primary small" data-tag-connect="${d.address}" data-tag-name="${escapeHtml(d.name)}" ${bleConnecting ? 'disabled' : ''}>Connetti</button>
            </div>
          `).join('') || (bleScanning || settings.bleTags.length ? '' : '<p class="small">Nessun dispositivo ancora cercato.</p>')}
        </div>
      ` : '<p class="small">Richiede l\'app installata come APK Android.</p>'}
    </div>

    <div class="card">
      <h2>🔵 Uscita audio</h2>
      <p class="small">L'annuncio vocale segue automaticamente l'uscita audio attiva del telefono: se una cassa o cuffia Bluetooth è già collegata (dalle Impostazioni Bluetooth di Android), l'audio esce da lì senza bisogno di scegliere nulla qui.</p>
    </div>
  `;

  renderLiveLog(el);
  wireEvents(el);
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

  el.querySelector('#ble-enabled')?.addEventListener('change', (e) => {
    updateSettings({ bleRemoteEnabled: e.target.checked });
    paint(el);
    syncSettings();
  });

  el.querySelectorAll('[data-quick-mode]').forEach((btn) => btn.addEventListener('click', () => {
    quickSetupMode = btn.dataset.quickMode;
    paint(el);
  }));
  el.querySelector('#quick-pair-a')?.addEventListener('click', () => quickPair(el, 'A', [
    { pattern: 'single', action: 'pointA' },
    { pattern: 'double', action: 'undo' },
  ]));
  el.querySelector('#quick-pair-b')?.addEventListener('click', () => quickPair(el, 'B', [
    { pattern: 'single', action: 'pointB' },
    { pattern: 'double', action: 'undo' },
  ]));
  el.querySelector('#quick-pair-single')?.addEventListener('click', () => quickPair(el, 'single', [
    { pattern: 'single', action: 'pointA' },
    { pattern: 'double', action: 'pointB' },
    { pattern: 'doubleSlow', action: 'undo' },
  ]));

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

  el.querySelector('#bletag-scan')?.addEventListener('click', async () => {
    bleScanning = true;
    bleScanResults = [];
    paint(el);
    const { devices, error } = await scanBleTags();
    bleScanResults = devices;
    bleScanning = false;
    if (error) toast('Errore: ' + error);
    else if (!bleScanResults.filter((d) => !getState().settings.bleTags.some((t) => t.address === d.address)).length) {
      toast('Nessun dispositivo trovato. Assicurati che sia acceso e vicino, e che la Localizzazione del telefono sia attiva.');
    }
    paint(el);
  });
  el.querySelectorAll('[data-tag-connect]').forEach((btn) => {
    btn.addEventListener('click', async () => {
      bleConnecting = true;
      paint(el);
      try {
        await connectBleTag(btn.dataset.tagConnect);
        const tag = { id: genId(), address: btn.dataset.tagConnect, deviceName: btn.dataset.tagName, enabled: true };
        updateSettings({ bleTags: [...getState().settings.bleTags, tag] });
        toast('Connesso! Prova a premere il pulsante: dovresti vederlo comparire nel Test dal vivo qui sopra.');
        syncSettings();
      } catch (err) {
        toast('Connessione fallita: ' + (err.message || err));
      }
      bleConnecting = false;
      paint(el);
    });
  });
  el.querySelectorAll('[data-tag-enabled]').forEach((input) => input.addEventListener('change', async (e) => {
    const id = input.dataset.tagEnabled;
    const enabled = e.target.checked;
    const tags = getState().settings.bleTags;
    const tag = tags.find((t) => t.id === id);
    updateSettings({ bleTags: tags.map((t) => (t.id === id ? { ...t, enabled } : t)) });
    if (!enabled && tag) await disconnectBleTag(tag.address);
    else if (enabled && tag) await connectBleTag(tag.address).catch(() => {});
    syncSettings();
  }));
  el.querySelectorAll('[data-tag-forget]').forEach((btn) => btn.addEventListener('click', async () => {
    const id = btn.dataset.tagForget;
    const tag = getState().settings.bleTags.find((t) => t.id === id);
    if (tag) await disconnectBleTag(tag.address);
    updateSettings({ bleTags: getState().settings.bleTags.filter((t) => t.id !== id) });
    paint(el);
    syncSettings();
  }));
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

async function quickPair(el, slot, patternActions) {
  quickCapturing = slot;
  paint(el);
  const capture = await captureNextPress(8000);
  quickCapturing = null;
  if (!capture) {
    toast('Nessun tasto rilevato, riprova');
    paint(el);
    return;
  }
  const newBindings = patternActions.map(({ pattern, action }) => ({
    id: genId(),
    deviceDescriptor: capture.deviceDescriptor,
    deviceName: capture.deviceName || 'Telecomando',
    keyCode: capture.keyCode,
    keyLabel: KEY_LABELS[capture.keyCode] || String(capture.keyCode),
    pattern,
    action,
  }));
  updateSettings({ remoteBindings: [...getState().settings.remoteBindings, ...newBindings] });
  const slotLabel = slot === 'A' ? 'Slot 1 (Noi)' : slot === 'B' ? 'Slot 2 (Avversari)' : 'telecomando unico';
  toast(`Associato: ${slotLabel}!`);
  paint(el);
  syncSettings();
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
      <div><strong>${escapeHtml(t.deviceName || 'Dispositivo')}</strong><p class="mb0 small">${t.address}</p></div>
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
