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
// "Modalità riservata": 'voice' (predefinito) parla come sempre, 'sound'
// riproduce un breve segnale acustico al posto della voce - vedi say()
// sotto e announceMode in configureSpeech.
let announceMode = 'voice';
let customSoundUri = null;

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

export function configureSpeech({ enabled: en, lang: l, voiceMode: vm, announceMode: am, customSoundUri: csu } = {}) {
  if (typeof en === 'boolean') enabled = en;
  if (l && l !== lang) { lang = l; cachedVoices = null; }
  if (vm) voiceMode = vm;
  if (am) announceMode = am;
  if (csu !== undefined) customSoundUri = csu;
}

// Riproduce il beep predefinito (incluso nell'app) o, se presente, il suono
// personalizzato caricato dall'utente - quest'ultimo è un URI nativo (salvato
// via Capacitor Filesystem, vedi js/screens/settings.js) e va convertito in
// un URL utilizzabile dalla WebView; il beep predefinito è invece già un
// asset web servito direttamente, non serve nessuna conversione.
function playAnnounceSound() {
  try {
    const convert = window.Capacitor?.convertFileSrc;
    const src = customSoundUri && convert ? convert(customSoundUri) : './point-beep.wav';
    const audio = new Audio(src);
    audio.play().catch(() => {});
  } catch {}
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

// La sintesi vocale italiana legge "Tie-break" (prestito inglese) come se
// fosse scritto in italiano, risultando quasi incomprensibile - solo per
// quello che viene detto ad alta voce lo riscriviamo con una grafia
// fonetica; il testo mostrato a schermo resta "Tie-break"/"Super tie-break"
// invariato (vedi scoring.js), qui tocchiamo solo l'audio.
const IT_PHONETIC_REPLACEMENTS = [
  [/Super tie-break/gi, 'Super tai-brek'],
  [/Tie-break/gi, 'tai-brek'],
];

function toSpeakable(text) {
  if (lang !== 'it-IT') return text;
  return IT_PHONETIC_REPLACEMENTS.reduce((out, [pattern, replacement]) => out.replace(pattern, replacement), text);
}

export function say(text) {
  if (!enabled || !text) return;
  if (announceMode === 'sound') { playAnnounceSound(); return; }
  queue.push(toSpeakable(text));
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
