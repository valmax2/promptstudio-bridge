// Bluetooth remote support: cheap "selfie remote" clickers, smartwatch
// camera-shutter modes, and most generic Bluetooth remotes pair with Android
// as a standard HID keyboard and simply send one of a handful of well-known
// keycodes (volume, camera, media, headset, dpad). Once the device is paired
// from Android's own Bluetooth settings (exactly like pairing a keyboard),
// this module lets the app listen for those keycodes and map them to
// scoreboard actions. See native-android/ for the native side that forwards
// key events into the WebView as a "padel-hw-key" custom event.
export const KEY_CODES = {
  VOLUME_UP: 24,
  VOLUME_DOWN: 25,
  CAMERA: 27,
  HEADSETHOOK: 79,
  MEDIA_PLAY_PAUSE: 85,
  MEDIA_NEXT: 87,
  MEDIA_PREVIOUS: 88,
  DPAD_LEFT: 21,
  DPAD_RIGHT: 22,
  DPAD_CENTER: 23,
  ENTER: 66,
};

export const KEY_LABELS = {
  24: 'Volume +',
  25: 'Volume -',
  27: 'Fotocamera',
  79: 'Tasto cuffie',
  85: 'Play / Pausa',
  87: 'Avanti ⏭',
  88: 'Indietro ⏮',
  21: 'Freccia sinistra',
  22: 'Freccia destra',
  23: 'Centro / OK',
  66: 'Invio',
};

function remoteControl() {
  return window.Capacitor?.Plugins?.RemoteControl || null;
}

export function remoteSupported() {
  return !!remoteControl();
}

export async function enableRemote() {
  try { await remoteControl()?.enable(); } catch {}
}

export async function disableRemote() {
  try { await remoteControl()?.disable(); } catch {}
}

export function listenHardwareKeys(cb) {
  const handler = (e) => cb(e.detail.keyCode);
  window.addEventListener('padel-hw-key', handler);
  return () => window.removeEventListener('padel-hw-key', handler);
}

// Resolves with the next keycode pressed (used by the "press a button to
// assign" flow in Settings), or null if nothing was pressed within timeoutMs.
export function captureNextKey(timeoutMs = 8000) {
  return new Promise((resolve) => {
    let done = false;
    const stop = listenHardwareKeys((keyCode) => {
      if (done) return;
      done = true;
      stop();
      resolve(keyCode);
    });
    setTimeout(() => {
      if (done) return;
      done = true;
      stop();
      resolve(null);
    }, timeoutMs);
  });
}
