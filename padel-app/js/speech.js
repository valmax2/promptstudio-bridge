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
let voiceMode = 'natural';
let cachedVoices = null;
let cachedVoiceKey = null; // lang the cached index below was resolved for
let cachedVoiceIndex = -1;

// Rate/pitch presets ("tre modalità di voce") layered on top of whichever
// voice gets picked, so speech sounds less flat/robotic than a fixed 1.0/1.0.
const VOICE_MODES = {
  natural: { rate: 1.0, pitch: 1.0 },
  energetic: { rate: 1.15, pitch: 1.08 },
  calm: { rate: 0.85, pitch: 0.92 },
};

// A pitch nudge upward reads as a clearer, more natural-sounding female
// voice on most Android TTS engines/voices, which is the only voice option
// now (a synthetic "male" voice was tried via pitch/rate shifting a female
// base voice, but it never sounded like a genuine distinct male voice - a
// real one would need a different underlying voice model, which isn't
// something this plugin's API exposes).
const PITCH_MULTIPLIER = 1.15;

export function configureSpeech({ enabled: en, lang: l, voiceMode: vm } = {}) {
  if (typeof en === 'boolean') enabled = en;
  if (l && l !== lang) { lang = l; cachedVoices = null; }
  if (vm) voiceMode = vm;
}

function nativeTts() {
  return window.Capacitor?.Plugins?.TextToSpeech || null;
}

async function resolveVoiceIndex(tts) {
  if (cachedVoiceKey === lang) return cachedVoiceIndex;
  try {
    if (!cachedVoices) {
      const res = await tts.getSupportedVoices();
      cachedVoices = res?.voices || [];
    }
    const langPrefix = lang.split('-')[0].toLowerCase();
    const match = cachedVoices.findIndex((v) => (v.lang || '').toLowerCase().startsWith(langPrefix));
    cachedVoiceIndex = match;
  } catch {
    cachedVoiceIndex = -1;
  }
  cachedVoiceKey = lang;
  return cachedVoiceIndex;
}

async function speakNative(text) {
  const tts = nativeTts();
  const mode = VOICE_MODES[voiceMode] || VOICE_MODES.natural;
  const opts = { text, lang, rate: mode.rate, volume: 1.0, category: 'ambient' };
  if (typeof tts.getSupportedVoices === 'function') {
    const voiceIdx = await resolveVoiceIndex(tts);
    if (voiceIdx >= 0) opts.voice = voiceIdx;
  }
  opts.pitch = Math.max(0, Math.min(2, mode.pitch * PITCH_MULTIPLIER));
  await tts.speak(opts);
}

function speakWeb(text) {
  return new Promise((resolve) => {
    if (!('speechSynthesis' in window)) { resolve(); return; }
    const mode = VOICE_MODES[voiceMode] || VOICE_MODES.natural;
    const utter = new SpeechSynthesisUtterance(text);
    utter.lang = lang;
    utter.rate = mode.rate;
    utter.pitch = Math.max(0, Math.min(2, mode.pitch * PITCH_MULTIPLIER));
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
