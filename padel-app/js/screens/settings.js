import { getState, updateSettings } from '../store.js';
import { navigate } from '../router.js';
import { pushProfile } from '../cloud.js';
import { isCloudReady } from '../cloud.js';
import { redeemProCode } from '../cloud.js';
import { firebaseAvailable, currentUser } from '../firebase.js';
import { say, speechSupported } from '../speech.js';
import { toast } from '../app.js';
import { COLOR_PRESETS } from '../color-presets.js';
import { UI_ACCENT_PRESETS, applyUiAccent } from '../ui-accents.js';
import { remoteSupported, bleTagSupported, disconnectBleTag } from '../ble-remote.js';
import { BACK_ICON, BLUETOOTH_ICON, escapeHtml, uid as genId } from '../utils.js';
import { APP_VERSION } from '../version.js';
import { billingSupported, purchasePro, verifyProOnLaunch, isPro } from '../billing.js';

let activeCategory = 'bluetooth';

// Form "Aggiungi/modifica club": null quando chiuso, altrimenti l'oggetto
// club in modifica (id null per un club nuovo).
let clubForm = null;

// Blocco anti-tentativi per il riscatto codice amico: 3 tentativi sbagliati
// mettono in pausa il modulo per 10 minuti. Salvato in localStorage (non
// nello store sincronizzato) perché è una protezione locale al dispositivo,
// non un dato utente da portarsi dietro tra account/dispositivi.
const PROMO_LOCK_KEY = 'padel-promo-code-lock';
const PROMO_LOCK_MS = 10 * 60 * 1000;

function promoCodeLockRemaining() {
  try {
    const raw = JSON.parse(localStorage.getItem(PROMO_LOCK_KEY) || 'null');
    if (!raw?.lockedUntil) return 0;
    return Math.max(0, raw.lockedUntil - Date.now());
  } catch { return 0; }
}

function registerPromoCodeFailure() {
  let data;
  try { data = JSON.parse(localStorage.getItem(PROMO_LOCK_KEY) || 'null') || {}; } catch { data = {}; }
  const count = (data.count || 0) + 1;
  if (count >= 3) {
    localStorage.setItem(PROMO_LOCK_KEY, JSON.stringify({ count: 0, lockedUntil: Date.now() + PROMO_LOCK_MS }));
  } else {
    localStorage.setItem(PROMO_LOCK_KEY, JSON.stringify({ count, lockedUntil: null }));
  }
  return count;
}

function resetPromoCodeAttempts() {
  localStorage.removeItem(PROMO_LOCK_KEY);
}

const CATEGORIES = [
  { id: 'aspetto', icon: '🎨', label: 'Aspetto' },
  { id: 'audio', icon: '🔊', label: 'Audio' },
  { id: 'partita', icon: '🎾', label: 'Partita' },
  { id: 'colori', icon: '🖌️', label: 'Colori' },
  { id: 'bluetooth', icon: BLUETOOTH_ICON, label: 'Bluetooth' },
  { id: 'club', icon: '🏟️', label: 'Club' },
  { id: 'cloud', icon: '☁️', label: 'Cloud' },
  { id: 'pro', icon: '⭐', label: 'Pro' },
];

const FONTS = [
  { id: "'Segoe UI', Roboto, system-ui, -apple-system, sans-serif", label: 'Predefinito' },
  { id: "Georgia, 'Times New Roman', serif", label: 'Serif' },
  { id: "'Courier New', monospace", label: 'Monospace' },
  { id: "Verdana, Geneva, sans-serif", label: 'Verdana' },
];

export async function renderSettings(el, params = {}) {
  activeCategory = params.category || 'bluetooth';
  clubForm = null;
  paint(el);
}

// Separate from renderSettings() on purpose: renderSettings only runs once
// per navigation into this screen (and resets the category tab to
// Bluetooth then), while every internal re-render after a click/toggle
// calls paint() directly - otherwise every single interaction would also
// reset the category back to Bluetooth, making the other tabs unclickable.
function paint(el) {
  const { settings } = getState();

  el.innerHTML = `
    <div class="topbar"><div class="row"><button class="icon-btn" id="settings-back" aria-label="Torna alla home">${BACK_ICON}</button><h1>Impostazioni</h1></div></div>

    <div class="settings-lang-flags">
      <button data-app-lang="it" class="settings-flag-btn ${(settings.appLanguage || 'it') === 'it' ? 'active' : ''}" aria-label="Italiano" title="Italiano">🇮🇹</button>
      <button data-app-lang="en" class="settings-flag-btn ${settings.appLanguage === 'en' ? 'active' : ''}" aria-label="English" title="English">🇬🇧</button>
      <button data-app-lang="fr" class="settings-flag-btn ${settings.appLanguage === 'fr' ? 'active' : ''}" aria-label="Français" title="Français">🇫🇷</button>
    </div>

    <div class="settings-categories">
      ${CATEGORIES.map((c) => `
        <button class="settings-cat-btn ${activeCategory === c.id ? 'active' : ''}" data-category="${c.id}">
          <span class="settings-cat-icon">${c.icon}</span><span>${c.label}</span>
        </button>
      `).join('')}
    </div>

    ${activeCategory === 'aspetto' ? `
    <div class="card">
      <h2>🌐 Lingua app</h2>
      <p class="small">Traduce i testi dell'app (per ora la schermata iniziale; le altre schermate seguiranno).</p>
      <div class="segmented">
        <button data-app-lang="it" class="${(settings.appLanguage || 'it') === 'it' ? 'active' : ''}">🇮🇹 Italiano</button>
        <button data-app-lang="en" class="${settings.appLanguage === 'en' ? 'active' : ''}">🇬🇧 English</button>
        <button data-app-lang="fr" class="${settings.appLanguage === 'fr' ? 'active' : ''}">🇫🇷 Français</button>
      </div>
    </div>
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
          <button data-voice-lang="fr-FR" class="${settings.ttsVoiceLang === 'fr-FR' ? 'active' : ''}">🇫🇷 Francese</button>
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
      <div class="field mt mb0">
        <label>🗣️ Frase dell'annuncio orario</label>
        <p class="small">Usa <strong>{orario}</strong> nel testo: viene sostituito con l'ora reale. Lascia vuoto per usare la frase predefinita.</p>
        <input id="time-announce-phrase" placeholder="Sono le {orario}. Avete tempo per un'altra partita?" maxlength="140" value="${escapeHtml(settings.timeAnnouncePhrase || '')}">
        <div class="row mt" style="gap:8px;">
          <button class="btn secondary small block" id="save-time-announce-phrase">💾 Salva frase</button>
          <button class="btn ghost small block" id="reset-time-announce-phrase">↺ Predefinita</button>
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
      <div class="field">
        <label>Spessore bordo numeri</label>
        <input type="range" min="0" max="6" step="1" id="border-width" value="${settings.numberBorderWidth}">
      </div>
      <div class="field mb0">
        <label>Dimensione numero punteggio</label>
        <div class="segmented">
          ${['Normale', 'Grande', 'Più grande', 'Massima'].map((label, i) => `<button data-number-size="${i}" class="${(settings.numberSizeStep || 0) === i ? 'active' : ''}">${label}</button>`).join('')}
        </div>
        <p class="small mt mb0">Utile soprattutto in modalità "solo punteggio" e con il telefono in verticale.</p>
      </div>
    </div>
    ` : ''}

    ${activeCategory === 'bluetooth' ? `
    <div class="card">
      <h2>🔵 Bluetooth · Telecomandi e portachiavi</h2>
      <p class="small">${settings.bleRemoteEnabled ? '✅ Telecomando abilitato.' : '⚠️ Telecomando disabilitato: i pulsanti non faranno nulla in partita.'} ${settings.remoteBindings.length} associazion${settings.remoteBindings.length === 1 ? 'e' : 'i'} configurat${settings.remoteBindings.length === 1 ? 'a' : 'e'}, ${settings.bleTags.length} tag collegat${settings.bleTags.length === 1 ? 'o' : 'i'}.</p>
      ${remoteSupported() || bleTagSupported() ? `
      <button class="btn primary block mt" id="open-bt-setup">🔵 Apri configurazione Bluetooth</button>
      <button class="btn secondary block mt" id="open-remote-board">📡 Telecomandi compatibili</button>
      ` : `<p class="small">Richiede l'app installata come APK Android (non funziona nell'anteprima da browser).</p>`}
      ${settings.remoteBindings.length || settings.bleTags.length ? `
      <button class="btn danger block mt" id="reset-bluetooth">🗑️ Reset Bluetooth (cancella tutto)</button>
      ` : ''}
    </div>
    ` : ''}

    ${activeCategory === 'club' ? `
    <div class="card">
      <h2>🏟️ I miei club</h2>
      <p class="small">Salva fino a 3 club preferiti dove giochi di solito, con orari e telefono - inseriti a mano, nessuna ricerca automatica.</p>
      ${(settings.favoriteClubs || []).map((c) => `
        <div class="list-item">
          <div>
            <strong>${escapeHtml(c.name)}</strong>
            ${c.hours ? `<p class="small mb0">🕒 ${escapeHtml(c.hours)}</p>` : ''}
            ${c.phone ? `<p class="small mb0">📞 ${escapeHtml(c.phone)}</p>` : ''}
          </div>
          <div class="row">
            ${c.phone ? `<a class="btn ghost small" href="tel:${escapeHtml(c.phone)}">📞</a>` : ''}
            <a class="btn ghost small" href="https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(c.name)}" target="_blank" rel="noopener">🗺️</a>
            <button class="btn ghost small" data-club-edit="${c.id}">✏️</button>
            <button class="btn ghost small" data-club-delete="${c.id}">🗑️</button>
          </div>
        </div>
      `).join('') || '<p class="small">Nessun club salvato ancora.</p>'}

      ${clubForm ? `
      <div class="field mt">
        <label>Nome del club</label>
        <input type="text" id="club-name" value="${escapeHtml(clubForm.name || '')}" placeholder="Es. Padel Club Milano" maxlength="60">
        <label class="mt">Orari</label>
        <input type="text" id="club-hours" value="${escapeHtml(clubForm.hours || '')}" placeholder="Es. Lun-Dom 8:00-23:00" maxlength="60">
        <label class="mt">Telefono</label>
        <input type="tel" id="club-phone" value="${escapeHtml(clubForm.phone || '')}" placeholder="Es. 02 1234567" maxlength="30">
        <div class="row mt">
          <button class="btn primary" id="club-save">💾 Salva</button>
          <button class="btn ghost" id="club-cancel">Annulla</button>
        </div>
      </div>
      ` : (settings.favoriteClubs || []).length < 3 ? `
      <button class="btn secondary block mt" id="club-add">➕ Aggiungi club</button>
      ` : `<p class="small mt mb0">Hai già 3 club salvati (massimo). Cancellane uno per aggiungerne un altro.</p>`}
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

    ${activeCategory === 'pro' ? `
    <div class="card">
      <h2>⭐ Padel Score Master Pro</h2>
      ${isPro() ? `
      <p class="small">✅ ${getState().profile.proGranted ? 'Sbloccato con codice amico.' : 'Hai già sbloccato Pro su questo account.'} Grazie per il supporto!</p>
      ` : `
      <p class="small">Acquisto unico, per sempre. Sostieni lo sviluppo dell'app: i contenuti esclusivi Pro arriveranno nei prossimi aggiornamenti.</p>
      <button class="btn primary block mt" id="buy-pro" ${billingSupported() ? '' : 'disabled'}>⭐ Sblocca Pro</button>
      ${billingSupported() ? '' : '<p class="small">Richiede l\'app installata da Google Play (non funziona nell\'anteprima da browser).</p>'}
      <div class="field mt">
        <label>Hai un codice amico?</label>
        ${promoCodeLockRemaining() > 0 ? `
        <p class="small">🔒 Troppi tentativi sbagliati: riprova tra ${Math.ceil(promoCodeLockRemaining() / 60000)} minuti.</p>
        ` : `
        <div class="row">
          <input type="text" id="pro-code-input" placeholder="CODICE" style="text-transform:uppercase;" ${firebaseAvailable() ? '' : 'disabled'}>
          <button class="btn secondary" id="redeem-pro-code" ${firebaseAvailable() ? '' : 'disabled'}>Riscatta</button>
        </div>
        ${firebaseAvailable() ? '' : '<p class="small">Richiede di aver effettuato l\'accesso.</p>'}
        `}
      </div>
      `}
    </div>
    ` : ''}

    <button class="btn ghost block mt" id="open-welcome">ⓘ Guida e informazioni sull'app</button>
    <p class="small center mt mb0" style="opacity:0.6;">Padel App ${APP_VERSION}</p>
  `;

  el.querySelectorAll('[data-category]').forEach((btn) => btn.addEventListener('click', () => {
    activeCategory = btn.dataset.category;
    paint(el);
  }));

  el.querySelectorAll('[data-app-lang]').forEach((btn) => btn.addEventListener('click', () => {
    updateSettings({ appLanguage: btn.dataset.appLang });
    paint(el);
    syncSettings();
  }));

  el.querySelectorAll('[data-theme]').forEach((btn) => btn.addEventListener('click', () => {
    updateSettings({ theme: btn.dataset.theme });
    paint(el);
    syncSettings();
  }));

  el.querySelectorAll('[data-ui-accent]').forEach((btn) => btn.addEventListener('click', () => {
    updateSettings({ uiAccent: btn.dataset.uiAccent });
    applyUiAccent(btn.dataset.uiAccent);
    paint(el);
    syncSettings();
  }));

  el.querySelector('#settings-back').addEventListener('click', () => navigate('home'));

  el.querySelector('#font-family')?.addEventListener('change', (e) => {
    updateSettings({ fontFamily: e.target.value });
    paint(el);
    syncSettings();
  });

  el.querySelector('#font-scale')?.addEventListener('input', (e) => {
    updateSettings({ fontScale: parseFloat(e.target.value) });
  });
  el.querySelector('#font-scale')?.addEventListener('change', syncSettings);

  el.querySelector('#tts')?.addEventListener('change', (e) => { updateSettings({ ttsEnabled: e.target.checked }); paint(el); syncSettings(); });
  el.querySelector('#golden')?.addEventListener('change', (e) => { updateSettings({ goldenPoint: e.target.checked }); syncSettings(); });
  el.querySelector('#super-tb')?.addEventListener('change', (e) => { updateSettings({ superTiebreak3rdSet: e.target.checked }); syncSettings(); });
  el.querySelectorAll('[data-time-announce]').forEach((btn) => btn.addEventListener('click', () => {
    updateSettings({ announceTimeEveryMatches: parseInt(btn.dataset.timeAnnounce, 10) });
    paint(el);
    syncSettings();
  }));
  el.querySelector('#save-time-announce-phrase')?.addEventListener('click', () => {
    const text = el.querySelector('#time-announce-phrase').value.trim().slice(0, 140);
    updateSettings({ timeAnnouncePhrase: text || null });
    toast('Frase salvata');
    syncSettings();
  });
  el.querySelector('#reset-time-announce-phrase')?.addEventListener('click', () => {
    updateSettings({ timeAnnouncePhrase: null });
    paint(el);
    syncSettings();
  });
  el.querySelector('#test-voice')?.addEventListener('click', () => say('40 pari, punto d\'oro'));
  el.querySelector('#go-gamemodes')?.addEventListener('click', () => navigate('gamemodes'));

  el.querySelectorAll('[data-voice-mode]').forEach((btn) => btn.addEventListener('click', () => {
    updateSettings({ ttsVoiceMode: btn.dataset.voiceMode });
    paint(el);
    syncSettings();
  }));
  el.querySelectorAll('[data-voice-lang]').forEach((btn) => btn.addEventListener('click', () => {
    updateSettings({ ttsVoiceLang: btn.dataset.voiceLang });
    paint(el);
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
    paint(el);
    syncSettings();
  }));
  el.querySelector('#color-a')?.addEventListener('input', (e) => updateSettings({ teamAColor: e.target.value, colorPreset: 'custom' }));
  el.querySelector('#color-b')?.addEventListener('input', (e) => updateSettings({ teamBColor: e.target.value, colorPreset: 'custom' }));
  el.querySelector('#color-number')?.addEventListener('input', (e) => updateSettings({ numberColor: e.target.value, colorPreset: 'custom' }));
  el.querySelector('#color-border')?.addEventListener('input', (e) => updateSettings({ numberBorderColor: e.target.value, colorPreset: 'custom' }));
  el.querySelector('#border-width')?.addEventListener('input', (e) => updateSettings({ numberBorderWidth: parseInt(e.target.value, 10), colorPreset: 'custom' }));
  ['#color-a', '#color-b', '#color-number', '#color-border', '#border-width'].forEach((sel) => {
    el.querySelector(sel)?.addEventListener('change', () => { paint(el); syncSettings(); });
  });

  el.querySelectorAll('[data-number-size]').forEach((btn) => btn.addEventListener('click', () => {
    updateSettings({ numberSizeStep: parseInt(btn.dataset.numberSize, 10) });
    paint(el);
    syncSettings();
  }));

  el.querySelector('#open-bt-setup')?.addEventListener('click', () => navigate('bluetooth-setup'));
  el.querySelector('#open-remote-board')?.addEventListener('click', () => navigate('remote-board'));
  el.querySelector('#reset-bluetooth')?.addEventListener('click', () => {
    if (!confirm('Cancellare tutte le associazioni di telecomandi e tag Bluetooth?')) return;
    if (!confirm('Sei sicuro? Dovrai riconfigurare da zero ogni telecomando e tag.')) return;
    disconnectBleTag();
    updateSettings({ remoteBindings: [], bleTags: [] });
    syncSettings();
    toast('Bluetooth resettato');
    paint(el);
  });
  el.querySelector('#open-welcome')?.addEventListener('click', () => navigate('welcome'));

  el.querySelector('#club-add')?.addEventListener('click', () => {
    clubForm = { id: null, name: '', hours: '', phone: '' };
    paint(el);
  });
  el.querySelectorAll('[data-club-edit]').forEach((btn) => btn.addEventListener('click', () => {
    const club = (settings.favoriteClubs || []).find((c) => c.id === btn.dataset.clubEdit);
    if (club) { clubForm = { ...club }; paint(el); }
  }));
  el.querySelectorAll('[data-club-delete]').forEach((btn) => btn.addEventListener('click', () => {
    if (!confirm('Eliminare questo club?')) return;
    updateSettings({ favoriteClubs: (settings.favoriteClubs || []).filter((c) => c.id !== btn.dataset.clubDelete) });
    syncSettings();
    paint(el);
  }));
  el.querySelector('#club-cancel')?.addEventListener('click', () => { clubForm = null; paint(el); });
  el.querySelector('#club-save')?.addEventListener('click', () => {
    const name = el.querySelector('#club-name').value.trim().slice(0, 60);
    if (!name) { toast('Inserisci il nome del club'); return; }
    const hours = el.querySelector('#club-hours').value.trim().slice(0, 60);
    const phone = el.querySelector('#club-phone').value.trim().slice(0, 30);
    const existing = settings.favoriteClubs || [];
    const club = { id: clubForm.id || genId(), name, hours, phone };
    const next = clubForm.id ? existing.map((c) => (c.id === club.id ? club : c)) : [...existing, club];
    updateSettings({ favoriteClubs: next });
    syncSettings();
    clubForm = null;
    paint(el);
  });

  el.querySelector('#cloud-sync')?.addEventListener('change', (e) => { updateSettings({ cloudSyncEnabled: e.target.checked }); syncSettings(); });
  el.querySelector('#sync-now')?.addEventListener('click', async () => {
    await syncSettings();
    toast('Sincronizzato con il cloud');
  });

  el.querySelector('#buy-pro')?.addEventListener('click', async () => {
    const started = await purchasePro();
    if (!started) { toast('Acquisto non disponibile ora'); return; }
    setTimeout(async () => { await verifyProOnLaunch(); paint(el); }, 1500);
  });

  el.querySelector('#redeem-pro-code')?.addEventListener('click', async () => {
    const lockedFor = promoCodeLockRemaining();
    if (lockedFor > 0) {
      toast(`Troppi tentativi sbagliati: riprova tra ${Math.ceil(lockedFor / 60000)} min`);
      return;
    }
    const input = el.querySelector('#pro-code-input');
    const code = input?.value || '';
    if (!code.trim()) { toast('Inserisci un codice'); return; }
    const result = await redeemProCode(code);
    if (result.ok) {
      resetPromoCodeAttempts();
      toast('Pro sbloccato!');
      paint(el);
    } else if (result.reason === 'offline') {
      toast('Devi aver effettuato l\'accesso');
    } else if (result.reason === 'error') {
      toast('Errore di connessione, riprova');
    } else {
      const strikes = registerPromoCodeFailure();
      if (strikes >= 3) {
        toast('3 codici sbagliati: riprova tra 10 minuti');
      } else {
        toast(`Codice non valido o già esaurito (${strikes}/3)`);
      }
    }
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
