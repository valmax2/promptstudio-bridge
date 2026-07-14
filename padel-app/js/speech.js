// Text-to-speech helper. Android's WebView (unlike desktop Chrome) generally
// has no working Web Speech Synthesis voices, so score announcements route
// through the native Capacitor Text-to-Speech plugin (window.Capacitor),
// which uses the device's real TTS engine and plays on whatever audio
// output is active — including a connected Bluetooth speaker. Falls back to
// the browser's speechSynthesis only when running outside the packaged app
// (e.g. testing index.html directly in a desktop browser).
let queue = [];
let speaking = false;
let enabled = true;
let lang = 'it-IT';
let voiceGender = 'female';
let voiceMode = 'natural';
let cachedVoices = null;
let cachedVoiceKey = null; // `${lang}:${voiceGender}` the cached index below was resolved for
let cachedVoiceIndex = -1;

// Rate/pitch presets ("tre modalità di voce") layered on top of whichever
// voice gets picked, so speech sounds less flat/robotic than a fixed 1.0/1.0.
const VOICE_MODES = {
  natural: { rate: 1.0, pitch: 1.0 },
  energetic: { rate: 1.15, pitch: 1.08 },
  calm: { rate: 0.85, pitch: 0.92 },
};

// Most TTS engines don't expose gender directly, only a voice name - so we
// match common naming hints first, and only fall back to nudging pitch
// (still audibly distinguishes "maschile"/"femminile") if the device has no
// separately-named voices for the language at all.
const FEMALE_HINTS = ['female', 'donna', 'femmin', 'woman', 'alice', 'elsa', 'silvia', 'monica', 'paola', 'sara', 'elisa'];
const MALE_HINTS = ['male', 'uomo', 'masch', 'man', 'diego', 'luca', 'marco', 'carlo', 'roberto', 'paolo'];

export function configureSpeech({ enabled: en, lang: l, voiceGender: vg, voiceMode: vm } = {}) {
  if (typeof en === 'boolean') enabled = en;
  if (l && l !== lang) { lang = l; cachedVoices = null; }
  if (vg) voiceGender = vg;
  if (vm) voiceMode = vm;
}

function nativeTts() {
  return window.Capacitor?.Plugins?.TextToSpeech || null;
}

async function resolveVoiceIndex(tts) {
  const key = `${lang}:${voiceGender}`;
  if (cachedVoiceKey === key) return cachedVoiceIndex;
  try {
    if (!cachedVoices) {
      const res = await tts.getSupportedVoices();
      cachedVoices = res?.voices || [];
    }
    const langPrefix = lang.split('-')[0].toLowerCase();
    const hints = voiceGender === 'male' ? MALE_HINTS : FEMALE_HINTS;
    const sameLang = cachedVoices
      .map((v, i) => ({ v, i }))
      .filter(({ v }) => (v.lang || '').toLowerCase().startsWith(langPrefix));
    let match = sameLang.find(({ v }) => hints.some((h) => (v.name || '').toLowerCase().includes(h)));
    if (!match && sameLang.length > 1) {
      // No gendered name available: at least pick two different voices
      // (first/last of the ones installed for this language) so the toggle
      // still does something on devices with multiple unnamed voices.
      match = voiceGender === 'male' ? sameLang[sameLang.length - 1] : sameLang[0];
    }
    cachedVoiceIndex = match ? match.i : -1;
  } catch {
    cachedVoiceIndex = -1;
  }
  cachedVoiceKey = key;
  return cachedVoiceIndex;
}

// Most Android TTS engines report voices with opaque names (e.g.
// "it-it-x-itd-network") that don't reveal gender, so picking a different
// voice index alone doesn't reliably sound different. To guarantee an
// audible difference regardless of what voices the device has installed,
// the pitch nudge below is always applied on top of whichever voice gets
// used, instead of only as a fallback when no named match is found.
const GENDER_PITCH = { male: 0.6, female: 1.2 };

async function speakNative(text) {
  const tts = nativeTts();
  const mode = VOICE_MODES[voiceMode] || VOICE_MODES.natural;
  const opts = { text, lang, rate: mode.rate, volume: 1.0, category: 'ambient' };
  if (typeof tts.getSupportedVoices === 'function') {
    const voiceIdx = await resolveVoiceIndex(tts);
    if (voiceIdx >= 0) opts.voice = voiceIdx;
  }
  opts.pitch = Math.max(0, Math.min(2, mode.pitch * GENDER_PITCH[voiceGender]));
  await tts.speak(opts);
}

function speakWeb(text) {
  return new Promise((resolve) => {
    if (!('speechSynthesis' in window)) { resolve(); return; }
    const mode = VOICE_MODES[voiceMode] || VOICE_MODES.natural;
    const utter = new SpeechSynthesisUtterance(text);
    utter.lang = lang;
    utter.rate = mode.rate;
    const langPrefix = lang.split('-')[0].toLowerCase();
    const hints = voiceGender === 'male' ? MALE_HINTS : FEMALE_HINTS;
    const voices = window.speechSynthesis.getVoices();
    const match = voices.find((v) => (v.lang || '').toLowerCase().startsWith(langPrefix) && hints.some((h) => (v.name || '').toLowerCase().includes(h)));
    if (match) utter.voice = match;
    utter.pitch = Math.max(0, Math.min(2, mode.pitch * GENDER_PITCH[voiceGender]));
    utter.onend = resolve;
    utter.onerror = resolve;
    window.speechSynthesis.speak(utter);
  });
}

async function pump() {
  if (speaking || !queue.length) return;
  const text = queue.shift();
  speaking = true;
  try {
    if (nativeTts()) await speakNative(text);
    else await speakWeb(text);
  } catch (err) {
    console.warn('[speech] TTS error', err);
  }
  speaking = false;
  pump();
}

export function say(text) {
  if (!enabled || !text) return;
  queue.push(text);
  pump();
}

export function stopSpeech() {
  queue = [];
  speaking = false;
  const tts = nativeTts();
  if (tts) tts.stop().catch(() => {});
  else if ('speechSynthesis' in window) window.speechSynthesis.cancel();
}

export function speechSupported() {
  return !!nativeTts() || 'speechSynthesis' in window;
}
