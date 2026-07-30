// Speech-to-text dictation for text fields across the app (nome squadra,
// giocatori, frasi, messaggi...). Android's WebView has no working
// SpeechRecognition Web API (unlike desktop Chrome), so dictation routes
// through the native Capacitor Speech Recognition plugin, falling back to
// the browser's webkitSpeechRecognition only when running outside the
// packaged app (e.g. testing index.html directly in a desktop browser).
let lang = 'it-IT';

export function configureSpeechInput({ lang: l } = {}) {
  if (l) lang = l;
}

function nativeSpeech() {
  return window.Capacitor?.Plugins?.SpeechRecognition || null;
}

function webSpeechCtor() {
  return window.SpeechRecognition || window.webkitSpeechRecognition || null;
}

export function speechInputSupported() {
  return !!nativeSpeech() || !!webSpeechCtor();
}

async function dictateNative() {
  const plugin = nativeSpeech();
  try {
    const perm = await plugin.checkPermissions();
    if (perm?.speechRecognition !== 'granted') {
      const req = await plugin.requestPermissions();
      if (req?.speechRecognition !== 'granted') return null;
    }
    const res = await plugin.start({ language: lang, maxResults: 1, partialResults: false, popup: false });
    return res?.matches?.[0]?.trim() || null;
  } catch {
    return null;
  }
}

function dictateWeb() {
  return new Promise((resolve) => {
    const Ctor = webSpeechCtor();
    if (!Ctor) { resolve(null); return; }
    const rec = new Ctor();
    rec.lang = lang;
    rec.maxAlternatives = 1;
    rec.interimResults = false;
    let done = false;
    const finish = (text) => { if (!done) { done = true; resolve(text); } };
    rec.onresult = (e) => finish(e.results?.[0]?.[0]?.transcript?.trim() || null);
    rec.onerror = () => finish(null);
    rec.onend = () => finish(null);
    try { rec.start(); } catch { finish(null); }
  });
}

// Resolves with the dictated text (trimmed), or null if unsupported,
// denied, or nothing was recognized.
export function dictate() {
  if (nativeSpeech()) return dictateNative();
  if (webSpeechCtor()) return dictateWeb();
  return Promise.resolve(null);
}

// Wires a mic button (already rendered next to a text input/textarea) so
// tapping it dictates straight into that field: fills the value up to its
// own maxlength (if any), fires input/change so any existing listener reacts
// exactly as if the user had typed, and shows a brief "in ascolto" state on
// the button itself while listening.
export function wireMicButton(btnEl, inputEl) {
  if (!btnEl || !inputEl) return;
  btnEl.addEventListener('click', async (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (btnEl.disabled) return;
    btnEl.disabled = true;
    btnEl.classList.add('listening');
    const text = await dictate();
    btnEl.classList.remove('listening');
    btnEl.disabled = false;
    if (!text) return;
    const maxLen = Number(inputEl.getAttribute('maxlength')) || 200;
    inputEl.value = text.slice(0, maxLen);
    inputEl.dispatchEvent(new Event('input', { bubbles: true }));
    inputEl.dispatchEvent(new Event('change', { bubbles: true }));
    inputEl.focus();
  });
}

// Wires every mic button rendered inside `el` to its paired input, matching
// purely by id convention (`mic-<inputId>` -> `#<inputId>`) - see
// micButtonHtml() below. Call once per screen after setting el.innerHTML,
// same as any other event-wiring pass; safe to call even when a screen has
// no mic buttons at all (querySelectorAll then just finds nothing).
export function wireAllMicButtons(el) {
  el.querySelectorAll('.mic-btn').forEach((btn) => {
    const inputId = btn.id.replace(/^mic-/, '');
    const input = el.querySelector(`#${inputId}`);
    wireMicButton(btn, input);
  });
}

// Markup for a mic button next to a text field - `id` must be unique in the
// screen, `extraClass` lets callers size it differently (e.g. the narrower
// one next to the rename pencil in the live scoreboard).
export function micButtonHtml(id, extraClass = '') {
  return `<button type="button" class="mic-btn ${extraClass}" id="${id}" aria-label="Detta con il microfono" title="Detta con il microfono">🎤</button>`;
}
