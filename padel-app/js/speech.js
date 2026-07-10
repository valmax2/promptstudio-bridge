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

export function configureSpeech({ enabled: en, lang: l } = {}) {
  if (typeof en === 'boolean') enabled = en;
  if (l) lang = l;
}

function nativeTts() {
  return window.Capacitor?.Plugins?.TextToSpeech || null;
}

async function speakNative(text) {
  const tts = nativeTts();
  await tts.speak({ text, lang, rate: 1.0, pitch: 1.0, volume: 1.0, category: 'ambient' });
}

function speakWeb(text) {
  return new Promise((resolve) => {
    if (!('speechSynthesis' in window)) { resolve(); return; }
    const utter = new SpeechSynthesisUtterance(text);
    utter.lang = lang;
    utter.rate = 1;
    utter.pitch = 1;
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
