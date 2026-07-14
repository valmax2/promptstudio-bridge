import { getState, updateSettings } from '../store.js';
import { navigate } from '../router.js';
import { pushProfile } from '../cloud.js';
import { isCloudReady } from '../cloud.js';
import { firebaseAvailable, currentUser } from '../firebase.js';
import { say, speechSupported } from '../speech.js';
import { toast } from '../app.js';
import { COLOR_PRESETS } from '../color-presets.js';
import { UI_ACCENT_PRESETS, applyUiAccent } from '../ui-accents.js';
import { remoteSupported, bleTagSupported } from '../ble-remote.js';
import { BACK_ICON, BLUETOOTH_ICON } from '../utils.js';

let activeCategory = 'aspetto';

const CATEGORIES = [
  { id: 'aspetto', icon: '🎨', label: 'Aspetto' },
  { id: 'audio', icon: '🔊', label: 'Audio' },
  { id: 'partita', icon: '🎾', label: 'Partita' },
  { id: 'colori', icon: '🖌️', label: 'Colori' },
  { id: 'bluetooth', icon: BLUETOOTH_ICON, label: 'Bluetooth' },
  { id: 'cloud', icon: '☁️', label: 'Cloud' },
];

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

    <div class="settings-categories">
      ${CATEGORIES.map((c) => `
        <button class="settings-cat-btn ${activeCategory === c.id ? 'active' : ''}" data-category="${c.id}">
          <span class="settings-cat-icon">${c.icon}</span><span>${c.label}</span>
        </button>
      `).join('')}
    </div>

    ${activeCategory === 'aspetto' ? `
    <div class="card">
      <h2>🎨 Aspetto</h2>
      <div class="segmented">
        <button data-theme="dark" class="${settings.theme === 'dark' ? 'active' : ''}">🌙 Scuro</button>
        <button data-theme="light" class="${settings.theme === 'light' ? 'active' : ''}">☀️ Chiaro</button>
      </div>

      <div class="field mt mb0">
        <label>Colore interfaccia</label>
        <div class="row" style="flex-wrap:wrap;gap:8px;">
          ${Object.entries(UI_ACCENT_PRESETS).map(([key, p]) => `
            <button class="color-preset-btn ${settings.uiAccent === key ? 'selected' : ''}" data-ui-accent="${key}" title="${p.label}">
              <span style="background:${p.accent || 'var(--accent)'}"></span>
            </button>
          `).join('')}
        </div>
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
    ` : ''}

    ${activeCategory === 'audio' ? `
    <div class="card">
      <h2>🔊 Audio e voce</h2>
      <div class="toggle-row">
        <div><strong>Annuncio vocale (TTS)</strong><p class="mb0 small">${speechSupported() ? 'Riproduce l\'audio su altoparlante o cassa Bluetooth' : 'Non supportato su questo dispositivo'}</p></div>
        <label class="switch"><input type="checkbox" id="tts" ${settings.ttsEnabled ? 'checked' : ''}><span class="slider"></span></label>
      </div>
      ${settings.ttsEnabled ? `
      <div class="field mt mb0">
        <label>Modalità voce</label>
        <div class="segmented">
          <button data-voice-mode="calm" class="${settings.ttsVoiceMode === 'calm' ? 'active' : ''}">😌 Calma</button>
          <button data-voice-mode="natural" class="${settings.ttsVoiceMode === 'natural' ? 'active' : ''}">🎙️ Naturale</button>
          <button data-voice-mode="energetic" class="${settings.ttsVoiceMode === 'energetic' ? 'active' : ''}">⚡ Energica</button>
        </div>
      </div>
      <div class="field mt mb0">
        <label>Lingua sintesi vocale</label>
        <div class="segmented">
          <button data-voice-lang="it-IT" class="${settings.ttsVoiceLang === 'it-IT' ? 'active' : ''}">🇮🇹 Italiano</button>
          <button data-voice-lang="en-US" class="${settings.ttsVoiceLang === 'en-US' ? 'active' : ''}">🇬🇧 Inglese</button>
        </div>
      </div>
      <button class="btn secondary small mt" id="test-voice">🔊 Prova voce</button>
      ` : ''}
    </div>
    ` : ''}

    ${activeCategory === 'partita' ? `
    <div class="card">
      <h2>🎾 Partita</h2>
      <div class="toggle-row">
        <div><strong>Punto d'oro</strong><p class="mb0 small">A 40 pari, il punto successivo decide il gioco</p></div>
        <label class="switch"><input type="checkbox" id="golden" ${settings.goldenPoint ? 'checked' : ''}><span class="slider"></span></label>
      </div>
      <div class="toggle-row">
        <div><strong>Super tie-break al 3° set</strong><p class="mb0 small">Il set decisivo si gioca al tie-break fino a 10</p></div>
        <label class="switch"><input type="checkbox" id="super-tb" ${settings.superTiebreak3rdSet ? 'checked' : ''}><span class="slider"></span></label>
      </div>
      <div class="field mt mb0">
        <label>🕐 Annuncia l'ora ogni tot partite</label>
        <p class="small">Utile per sapere se c'è ancora tempo per un'altra partita prima di lasciare il campo.</p>
        <div class="segmented">
          ${[0, 1, 2, 3, 5].map((n) => `<button data-time-announce="${n}" class="${settings.announceTimeEveryMatches === n ? 'active' : ''}">${n === 0 ? 'Mai' : n === 1 ? 'Ogni partita' : `Ogni ${n}`}</button>`).join('')}
        </div>
      </div>
      <button class="btn ghost small block mt" id="go-gamemodes">📖 Tutte le modalità di gioco</button>
    </div>
    ` : ''}

    ${activeCategory === 'colori' ? `
    <div class="card">
      <h2>🖌️ Colori tabellone</h2>
      <p class="small">Colori standard (sRGB): restano fedeli su tutti i telefoni e tablet, senza toni sfasati dovuti a schermi "wide gamut".</p>
      <div class="row" style="flex-wrap:wrap;gap:8px;">
        ${Object.entries(COLOR_PRESETS).map(([key, p]) => `
          <button class="color-preset-btn ${settings.colorPreset === key ? 'selected' : ''}" data-preset="${key}" title="${p.label}">
            <span style="background:${p.teamAColor}"></span><span style="background:${p.teamBColor}"></span>
          </button>
        `).join('')}
        <button class="color-preset-btn ${settings.colorPreset === 'custom' ? 'selected' : ''}" data-preset="custom" title="Personalizzato">🎛️</button>
      </div>

      <div class="sb-color-preview mt">
        <div class="sb-color-preview-half sb-a"><span>40</span></div>
        <div class="sb-color-preview-half sb-b"><span>30</span></div>
      </div>

      <div class="field mt">
        <label>Colore Squadra A</label>
        <input type="color" id="color-a" value="${settings.teamAColor}">
      </div>
      <div class="field">
        <label>Colore Squadra B</label>
        <input type="color" id="color-b" value="${settings.teamBColor}">
      </div>
      <div class="field">
        <label>Colore numeri</label>
        <input type="color" id="color-number" value="${settings.numberColor}">
      </div>
      <div class="field">
        <label>Colore bordo numeri</label>
        <input type="color" id="color-border" value="${normalizeHex(settings.numberBorderColor)}">
      </div>
      <div class="field mb0">
        <label>Spessore bordo numeri</label>
        <input type="range" min="0" max="6" step="1" id="border-width" value="${settings.numberBorderWidth}">
      </div>
    </div>
    ` : ''}

    ${activeCategory === 'bluetooth' ? `
    <div class="card">
      <h2>🔵 Bluetooth · Telecomandi e portachiavi</h2>
      <p class="small">${settings.bleRemoteEnabled ? '✅ Telecomando abilitato.' : '⚠️ Telecomando disabilitato: i pulsanti non faranno nulla in partita.'} ${settings.remoteBindings.length} associazion${settings.remoteBindings.length === 1 ? 'e' : 'i'} configurat${settings.remoteBindings.length === 1 ? 'a' : 'e'}, ${settings.bleTags.length} tag collegat${settings.bleTags.length === 1 ? 'o' : 'i'}.</p>
      ${remoteSupported() || bleTagSupported() ? `
      <button class="btn primary block mt" id="open-bt-setup">🔵 Apri configurazione Bluetooth</button>
      ` : `<p class="small">Richiede l'app installata come APK Android (non funziona nell'anteprima da browser).</p>`}
    </div>
    ` : ''}

    ${activeCategory === 'cloud' ? `
    <div class="card">
      <h2>☁️ Cloud</h2>
      ${!firebaseAvailable() ? '<p class="small">Firebase non configurato: le impostazioni restano solo su questo telefono. Vedi README.md.</p>' : ''}
      <div class="toggle-row">
        <div><strong>Sincronizzazione automatica</strong><p class="mb0 small">Impostazioni, avatar e statistiche salvati nel cloud</p></div>
        <label class="switch"><input type="checkbox" id="cloud-sync" ${settings.cloudSyncEnabled ? 'checked' : ''} ${firebaseAvailable() ? '' : 'disabled'}><span class="slider"></span></label>
      </div>
      ${isCloudReady() ? '<button class="btn primary block mt" id="sync-now">Sincronizza ora</button>' : ''}
      ${isCloudReady() ? `<p class="small mt mb0">🔔 Le notifiche push da server non sono ancora attive: richiedono il piano Firebase a pagamento "Blaze", che per ora resta disattivato. Le notifiche dentro l'app (amici, eventi, chat) funzionano già mentre l'app è aperta.</p>` : ''}
    </div>
    ` : ''}
  `;

  el.querySelectorAll('[data-category]').forEach((btn) => btn.addEventListener('click', () => {
    activeCategory = btn.dataset.category;
    renderSettings(el);
  }));

  el.querySelectorAll('[data-theme]').forEach((btn) => btn.addEventListener('click', () => {
    updateSettings({ theme: btn.dataset.theme });
    renderSettings(el);
    syncSettings();
  }));

  el.querySelectorAll('[data-ui-accent]').forEach((btn) => btn.addEventListener('click', () => {
    updateSettings({ uiAccent: btn.dataset.uiAccent });
    applyUiAccent(btn.dataset.uiAccent);
    renderSettings(el);
    syncSettings();
  }));

  el.querySelector('#settings-back').addEventListener('click', () => navigate('home'));

  el.querySelector('#font-family')?.addEventListener('change', (e) => {
    updateSettings({ fontFamily: e.target.value });
    renderSettings(el);
    syncSettings();
  });

  el.querySelector('#font-scale')?.addEventListener('input', (e) => {
    updateSettings({ fontScale: parseFloat(e.target.value) });
  });
  el.querySelector('#font-scale')?.addEventListener('change', syncSettings);

  el.querySelector('#tts')?.addEventListener('change', (e) => { updateSettings({ ttsEnabled: e.target.checked }); renderSettings(el); syncSettings(); });
  el.querySelector('#golden')?.addEventListener('change', (e) => { updateSettings({ goldenPoint: e.target.checked }); syncSettings(); });
  el.querySelector('#super-tb')?.addEventListener('change', (e) => { updateSettings({ superTiebreak3rdSet: e.target.checked }); syncSettings(); });
  el.querySelectorAll('[data-time-announce]').forEach((btn) => btn.addEventListener('click', () => {
    updateSettings({ announceTimeEveryMatches: parseInt(btn.dataset.timeAnnounce, 10) });
    renderSettings(el);
    syncSettings();
  }));
  el.querySelector('#test-voice')?.addEventListener('click', () => say('40 pari, punto d\'oro'));
  el.querySelector('#go-gamemodes')?.addEventListener('click', () => navigate('gamemodes'));

  el.querySelectorAll('[data-voice-mode]').forEach((btn) => btn.addEventListener('click', () => {
    updateSettings({ ttsVoiceMode: btn.dataset.voiceMode });
    renderSettings(el);
    syncSettings();
  }));
  el.querySelectorAll('[data-voice-lang]').forEach((btn) => btn.addEventListener('click', () => {
    updateSettings({ ttsVoiceLang: btn.dataset.voiceLang });
    renderSettings(el);
    syncSettings();
  }));

  el.querySelectorAll('[data-preset]').forEach((btn) => btn.addEventListener('click', () => {
    const key = btn.dataset.preset;
    if (key === 'custom') {
      updateSettings({ colorPreset: 'custom' });
    } else {
      const { label, ...colors } = COLOR_PRESETS[key];
      updateSettings({ colorPreset: key, ...colors });
    }
    renderSettings(el);
    syncSettings();
  }));
  el.querySelector('#color-a')?.addEventListener('input', (e) => updateSettings({ teamAColor: e.target.value, colorPreset: 'custom' }));
  el.querySelector('#color-b')?.addEventListener('input', (e) => updateSettings({ teamBColor: e.target.value, colorPreset: 'custom' }));
  el.querySelector('#color-number')?.addEventListener('input', (e) => updateSettings({ numberColor: e.target.value, colorPreset: 'custom' }));
  el.querySelector('#color-border')?.addEventListener('input', (e) => updateSettings({ numberBorderColor: e.target.value, colorPreset: 'custom' }));
  el.querySelector('#border-width')?.addEventListener('input', (e) => updateSettings({ numberBorderWidth: parseInt(e.target.value, 10), colorPreset: 'custom' }));
  ['#color-a', '#color-b', '#color-number', '#color-border', '#border-width'].forEach((sel) => {
    el.querySelector(sel)?.addEventListener('change', () => { renderSettings(el); syncSettings(); });
  });

  el.querySelector('#open-bt-setup')?.addEventListener('click', () => navigate('bluetooth-setup'));

  el.querySelector('#cloud-sync')?.addEventListener('change', (e) => { updateSettings({ cloudSyncEnabled: e.target.checked }); syncSettings(); });
  el.querySelector('#sync-now')?.addEventListener('click', async () => {
    await syncSettings();
    toast('Sincronizzato con il cloud');
  });
}

// <input type="color"> only accepts 6-digit hex, but a couple of presets
// use an 8-digit hex (alpha) for a softer border - strip alpha for display.
function normalizeHex(hex) {
  const m = /^#([0-9a-f]{6})/i.exec(hex || '');
  return m ? `#${m[1]}` : '#000000';
}

async function syncSettings() {
  if (!isCloudReady() || !getState().settings.cloudSyncEnabled) return;
  try { await pushProfile({ ...getState().profile, settings: getState().settings }); } catch {}
}
