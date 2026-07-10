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

// ===========================================================================
// BLE "tag" support: generic anti-lost keyrings / iTag clones. Unlike HID
// remotes above, these use a proprietary Bluetooth Low Energy protocol that
// differs by chipset/brand, so instead of pairing via Android's Bluetooth
// settings, the app itself scans for and connects to the device directly,
// then subscribes to every notification-capable GATT characteristic it
// exposes (see native-android/BleTagPlugin.java) - any notification is
// treated as "button pressed", since that's the one thing all these devices
// have in common regardless of brand.
function bleTag() {
  return window.Capacitor?.Plugins?.BleTag || null;
}

export function bleTagSupported() {
  return !!bleTag();
}

export async function scanBleTags() {
  const plugin = bleTag();
  if (!plugin) return { devices: [], error: null };
  try {
    const res = await plugin.scan();
    return { devices: res.devices || [], error: null };
  } catch (err) {
    return { devices: [], error: err?.message || String(err) };
  }
}

export async function connectBleTag(address) {
  const plugin = bleTag();
  if (!plugin) throw new Error('Tag BLE non disponibile su questo dispositivo');
  await plugin.connect({ address });
}

export async function disconnectBleTag() {
  try { await bleTag()?.disconnect(); } catch {}
}

export function onBleTagPressed(cb) {
  const plugin = bleTag();
  if (!plugin) return () => {};
  const handle = plugin.addListener('tagPressed', () => cb());
  return () => handle.remove();
}

export function onBleTagConnected(cb) {
  const plugin = bleTag();
  if (!plugin) return () => {};
  const handle = plugin.addListener('connected', (data) => cb(data));
  return () => handle.remove();
}
