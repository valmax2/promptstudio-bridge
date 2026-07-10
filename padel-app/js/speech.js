// Text-to-speech helper. Uses the device's system speech synthesis, which
// (on Android) plays through whatever audio output is currently active —
// including a connected Bluetooth speaker — with no extra setup needed.
let queue = [];
let speaking = false;
let enabled = true;
let lang = 'it-IT';

export function configureSpeech({ enabled: en, lang: l } = {}) {
  if (typeof en === 'boolean') enabled = en;
  if (l) lang = l;
}

function pump() {
  if (speaking || !queue.length) return;
  if (!('speechSynthesis' in window)) { queue = []; return; }
  const text = queue.shift();
  const utter = new SpeechSynthesisUtterance(text);
  utter.lang = lang;
  utter.rate = 1;
  utter.pitch = 1;
  speaking = true;
  utter.onend = () => { speaking = false; pump(); };
  utter.onerror = () => { speaking = false; pump(); };
  window.speechSynthesis.speak(utter);
}

export function say(text) {
  if (!enabled || !text) return;
  if (!('speechSynthesis' in window)) return;
  queue.push(text);
  pump();
}

export function stopSpeech() {
  queue = [];
  if ('speechSynthesis' in window) window.speechSynthesis.cancel();
  speaking = false;
}

export function speechSupported() {
  return 'speechSynthesis' in window;
}
