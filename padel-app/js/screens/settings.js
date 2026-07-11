import { getState, updateSettings } from '../store.js';
import { navigate } from '../router.js';
import { pushProfile } from '../cloud.js';
import { isCloudReady } from '../cloud.js';
import { firebaseAvailable, currentUser, registerPushToken } from '../firebase.js';
import { say, speechSupported } from '../speech.js';
import { toast } from '../app.js';
import {
  KEY_LABELS, ACTION_LABELS, PATTERN_LABELS, remoteSupported, captureNextPress,
  enableRemote, disableRemote,
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

const FONTS = [
  { id: "'Segoe UI', Roboto, system-ui, -apple-system, sans-serif", label: 'Predefinito' },
  { id: "Georgia, 'Times New Roman', serif", label: 'Serif' },
  { id: "'Courier New', monospace", label: 'Monospace' },
  { id: "Verdana, Geneva, sans-serif", label: 'Verdana' },
];

export async function renderSettings(el) {
  const { settings } = getState();

  el.innerHTML = `
    <div class="topbar"><div class="row"><button class="icon-btn" id="settings-back" aria-label="Torna alla home">${BACK_ICON}</button><h1>Impostazioni</h1></div></div>

    <div class="card">
      <h2>Aspetto</h2>
      <div class="segmented">
        <button data-theme="dark" class="${settings.theme === 'dark' ? 'active' : ''}">🌙 Scuro</button>
        <button data-theme="light" class="${settings.theme === 'light' ? 'active' : ''}">☀️ Chiaro</button>
      </div>

      <div class="field mt">
        <label>Font</label>
        <select id="font-family">
          ${FONTS.map((f) => `<option value="${f.id}" ${settings.fontFamily === f.id ? 'selected' : ''}>${f.label}</option>`).join('')}
        </select>
      </div>

      <div class="field">
        <label>Dimensione testo</label>
        <input type="range" min="0.85" max="1.4" step="0.05" id="font-scale" value="${settings.fontScale}">
      </div>
      <div class="font-preview">Aa · Anteprima testo</div>
    </div>

    <div class="card">
      <h2>Segnapunti</h2>
      <div class="toggle-row">
        <div><strong>Annuncio vocale (TTS)</strong><p class="mb0 small">${speechSupported() ? 'Riproduce l\'audio su altoparlante o cassa Bluetooth' : 'Non supportato su questo dispositivo'}</p></div>
        <label class="switch"><input type="checkbox" id="tts" ${settings.ttsEnabled ? 'checked' : ''}><span class="slider"></span></label>
      </div>
      <div class="toggle-row">
        <div><strong>Punto d'oro</strong><p class="mb0 small">A 40 pari, il punto successivo decide il gioco</p></div>
        <label class="switch"><input type="checkbox" id="golden" ${settings.goldenPoint ? 'checked' : ''}><span class="slider"></span></label>
      </div>
      <div class="toggle-row">
        <div><strong>Super tie-break al 3° set</strong><p class="mb0 small">Il set decisivo si gioca al tie-break fino a 10</p></div>
        <label class="switch"><input type="checkbox" id="super-tb" ${settings.superTiebreak3rdSet ? 'checked' : ''}><span class="slider"></span></label>
      </div>
      ${settings.ttsEnabled ? '<button class="btn secondary small mt" id="test-voice">🔊 Prova voce</button>' : ''}
    </div>

    <div class="card">
      <h2>📡 Telecomando remoto</h2>
      ${remoteSupported() ? `
        <p class="small">Funziona con telecomandi Bluetooth economici ("selfie remote"), smartwatch in modalità scatto foto, e la maggior parte dei tasti fisici che si accoppiano come tastiera Bluetooth. <strong>Prima accoppia il dispositivo dalle Impostazioni Bluetooth di Android</strong> (come una tastiera), poi torna qui. Puoi accoppiare <strong>più di un telecomando</strong> e usare click singolo/doppio/doppio lento sullo stesso tasto per azioni diverse.</p>
        <p class="small">I portachiavi "trova oggetto" generici spesso usano un protocollo proprietario e non funzionano qui — vedi la sezione dedicata più sotto.</p>
        <div class="toggle-row">
          <div><strong>Abilita telecomando</strong><p class="mb0 small">Attivo solo nella schermata Segnapunti</p></div>
          <label class="switch"><input type="checkbox" id="ble-enabled" ${settings.bleRemoteEnabled ? 'checked' : ''}><span class="slider"></span></label>
        </div>
        ${settings.bleRemoteEnabled ? renderBindingsUI(settings.remoteBindings) : ''}
      ` : `<p class="small">Il telecomando Bluetooth richiede l'app installata come APK Android (non funziona nell'anteprima da browser).</p>`}
    </div>

    <div class="card">
      <h2>🔑 Portachiavi / tag Bluetooth (sperimentale)</h2>
      ${bleTagSupported() ? `
        <p class="small">Per portachiavi "trova oggetto" e dispositivi simili che non si accoppiano come tastiera. Puoi collegare <strong>più di un tag insieme</strong> (es. uno per squadra) — la app si collega direttamente a ciascuno e prova ad ascoltare il pulsante: funziona con molti modelli economici, ma non è garantito su tutti.</p>
        ${settings.bleTags.map(tagRow).join('')}
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
      ` : `<p class="small">Richiede l'app installata come APK Android.</p>`}
    </div>

    <div class="card">
      <h2>☁️ Cloud</h2>
      ${!firebaseAvailable() ? '<p class="small">Firebase non configurato: le impostazioni restano solo su questo telefono. Vedi README.md.</p>' : ''}
      <div class="toggle-row">
        <div><strong>Sincronizzazione automatica</strong><p class="mb0 small">Impostazioni, avatar e statistiche salvati nel cloud</p></div>
        <label class="switch"><input type="checkbox" id="cloud-sync" ${settings.cloudSyncEnabled ? 'checked' : ''} ${firebaseAvailable() ? '' : 'disabled'}><span class="slider"></span></label>
      </div>
      ${isCloudReady() ? '<button class="btn primary block mt" id="sync-now">Sincronizza ora</button>' : ''}
      ${isCloudReady() ? '<button class="btn secondary block mt" id="enable-push">Attiva notifiche push</button>' : ''}
    </div>
  `;

  el.querySelectorAll('[data-theme]').forEach((btn) => btn.addEventListener('click', () => {
    updateSettings({ theme: btn.dataset.theme });
    renderSettings(el);
    syncSettings();
  }));

  el.querySelector('#settings-back').addEventListener('click', () => navigate('home'));

  el.querySelector('#font-family').addEventListener('change', (e) => {
    updateSettings({ fontFamily: e.target.value });
    renderSettings(el);
    syncSettings();
  });

  el.querySelector('#font-scale').addEventListener('input', (e) => {
    updateSettings({ fontScale: parseFloat(e.target.value) });
  });
  el.querySelector('#font-scale').addEventListener('change', syncSettings);

  el.querySelector('#tts').addEventListener('change', (e) => { updateSettings({ ttsEnabled: e.target.checked }); renderSettings(el); syncSettings(); });
  el.querySelector('#golden').addEventListener('change', (e) => { updateSettings({ goldenPoint: e.target.checked }); syncSettings(); });
  el.querySelector('#super-tb').addEventListener('change', (e) => { updateSettings({ superTiebreak3rdSet: e.target.checked }); syncSettings(); });
  el.querySelector('#test-voice')?.addEventListener('click', () => say('40 pari, punto d\'oro'));

  el.querySelector('#ble-enabled')?.addEventListener('change', (e) => {
    updateSettings({ bleRemoteEnabled: e.target.checked });
    renderSettings(el);
    syncSettings();
  });
  el.querySelector('#add-binding')?.addEventListener('click', async () => {
    addBindingStep = 'waiting';
    renderSettings(el);
    // The native side only forwards key events while the RemoteControl
    // plugin is enabled - outside of an active match (i.e. right here,
    // capturing a new binding) it's off by default, so without this the
    // "press a button" step would never see anything.
    await enableRemote();
    const capture = await captureNextPress(8000);
    await disableRemote();
    if (!capture) {
      toast('Nessun tasto rilevato, riprova');
      addBindingStep = null;
    } else {
      addBindingCapture = capture;
      addBindingStep = 'pattern';
    }
    renderSettings(el);
  });
  el.querySelectorAll('[data-pick-pattern]').forEach((btn) => btn.addEventListener('click', () => {
    addBindingPattern = btn.dataset.pickPattern;
    addBindingStep = 'action';
    renderSettings(el);
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
    toast('Associazione aggiunta!');
    renderSettings(el);
    syncSettings();
  }));
  el.querySelector('#cancel-binding')?.addEventListener('click', () => {
    addBindingStep = null;
    addBindingCapture = null;
    addBindingPattern = null;
    renderSettings(el);
  });
  el.querySelectorAll('[data-remove-binding]').forEach((btn) => btn.addEventListener('click', () => {
    updateSettings({ remoteBindings: getState().settings.remoteBindings.filter((b) => b.id !== btn.dataset.removeBinding) });
    renderSettings(el);
    syncSettings();
  }));
  el.querySelector('#bletag-scan')?.addEventListener('click', async () => {
    bleScanning = true;
    bleScanResults = [];
    renderSettings(el);
    const { devices, error } = await scanBleTags();
    bleScanResults = devices;
    bleScanning = false;
    if (error) toast('Errore: ' + error);
    else if (!bleScanResults.filter((d) => !getState().settings.bleTags.some((t) => t.address === d.address)).length) {
      toast('Nessun dispositivo trovato. Assicurati che sia acceso e vicino, e che la Localizzazione del telefono sia attiva.');
    }
    renderSettings(el);
  });
  el.querySelectorAll('[data-tag-connect]').forEach((btn) => {
    btn.addEventListener('click', async () => {
      bleConnecting = true;
      renderSettings(el);
      try {
        await connectBleTag(btn.dataset.tagConnect);
        const tag = {
          id: genId(),
          address: btn.dataset.tagConnect,
          deviceName: btn.dataset.tagName,
          enabled: true,
          action: 'pointA',
        };
        updateSettings({ bleTags: [...getState().settings.bleTags, tag] });
        toast('Connesso! Prova a premere il pulsante sul dispositivo.');
        syncSettings();
      } catch (err) {
        toast('Connessione fallita: ' + (err.message || err));
      }
      bleConnecting = false;
      renderSettings(el);
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
  el.querySelectorAll('[data-tag-action]').forEach((select) => select.addEventListener('change', () => {
    const id = select.dataset.tagAction;
    updateSettings({ bleTags: getState().settings.bleTags.map((t) => (t.id === id ? { ...t, action: select.value } : t)) });
    syncSettings();
  }));
  el.querySelectorAll('[data-tag-forget]').forEach((btn) => btn.addEventListener('click', async () => {
    const id = btn.dataset.tagForget;
    const tag = getState().settings.bleTags.find((t) => t.id === id);
    if (tag) await disconnectBleTag(tag.address);
    updateSettings({ bleTags: getState().settings.bleTags.filter((t) => t.id !== id) });
    renderSettings(el);
    syncSettings();
  }));

  el.querySelector('#cloud-sync')?.addEventListener('change', (e) => { updateSettings({ cloudSyncEnabled: e.target.checked }); syncSettings(); });
  el.querySelector('#sync-now')?.addEventListener('click', async () => {
    await syncSettings();
    toast('Sincronizzato con il cloud');
  });
  el.querySelector('#enable-push')?.addEventListener('click', async () => {
    const token = await registerPushToken();
    if (token) {
      await pushProfile({ ...getState().profile, pushToken: token });
      toast('Notifiche push attivate');
    } else {
      toast('Impossibile attivare le notifiche (permesso negato?)');
    }
  });
}

function renderBindingsUI(bindings) {
  if (addBindingStep === 'waiting') {
    return `<div class="card" style="background:var(--surface-2);margin-top:10px;">
      <p class="mb0">📡 Premi un tasto sul telecomando entro 8 secondi…</p>
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
      <button class="btn secondary small mt" id="add-binding">+ Aggiungi associazione</button>
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

function tagRow(t) {
  return `<div class="card" style="background:var(--surface-2);margin-top:10px;">
    <div class="toggle-row">
      <div><strong>${escapeHtml(t.deviceName || 'Dispositivo')}</strong><p class="mb0 small">${t.address}</p></div>
      <label class="switch"><input type="checkbox" data-tag-enabled="${t.id}" ${t.enabled ? 'checked' : ''}><span class="slider"></span></label>
    </div>
    <div class="field mt mb0">
      <label>Cosa fa il pulsante</label>
      <select data-tag-action="${t.id}">
        ${Object.entries(ACTION_LABELS).map(([key, label]) => `<option value="${key}" ${t.action === key ? 'selected' : ''}>${label}</option>`).join('')}
      </select>
    </div>
    <button class="btn ghost small mt" data-tag-forget="${t.id}">Dimentica dispositivo</button>
  </div>`;
}

async function syncSettings() {
  if (!isCloudReady() || !getState().settings.cloudSyncEnabled) return;
  try { await pushProfile({ ...getState().profile, settings: getState().settings }); } catch {}
}
