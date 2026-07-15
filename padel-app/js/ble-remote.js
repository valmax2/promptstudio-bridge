// Bluetooth remote support: cheap "selfie remote" clickers, smartwatch
// camera-shutter modes, and most generic Bluetooth remotes pair with Android
// as a standard HID keyboard and simply send one of a handful of well-known
// keycodes (volume, camera, media, headset, dpad). Once the device is paired
// from Android's own Bluetooth settings (exactly like pairing a keyboard),
// this module lets the app listen for those keycodes and map them to
// scoreboard actions - including telling two different paired remotes apart,
// and distinguishing single/double/slow-double presses of the same key. See
// native-android/MainActivity.java for the native side that forwards key
// events into the WebView as a "padel-hw-key" custom event, tagged with the
// source device's stable descriptor.
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
  9001: 'Pulsante tag',
};

export const ACTION_LABELS = {
  pointA: 'Punto Squadra / Giocatore 1',
  pointB: 'Punto Squadra / Giocatore 2',
  undo: 'Annulla ultimo punto',
  resetGame: 'Azzera punteggio del game',
  startMatch: 'Inizia partita',
  resetMatch: 'Resetta partita',
};

export const PATTERN_LABELS = {
  single: 'Click singolo',
  double: 'Doppio click veloce',
  doubleSlow: 'Doppio click lento',
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

// Jumps to Android's own Bluetooth settings screen - regular remotes/
// keyboards must be paired there, no app can do it on their behalf. Returns
// false when unsupported (browser preview) so callers can fall back to
// just telling the user where to look.
export async function openBluetoothSettings() {
  const rc = remoteControl();
  if (!rc?.openBluetoothSettings) return false;
  try { await rc.openBluetoothSettings(); return true; } catch { return false; }
}

export function listenRawPresses(cb) {
  const handler = (e) => cb(e.detail);
  window.addEventListener('padel-hw-key', handler);
  return () => window.removeEventListener('padel-hw-key', handler);
}

// Resolves with the next { keyCode, deviceDescriptor, deviceName } pressed
// (used by the "press a button to add" flow in Settings), or null if
// nothing was pressed within timeoutMs.
export function captureNextPress(timeoutMs = 8000) {
  return new Promise((resolve) => {
    let done = false;
    const stop = listenRawPresses((detail) => {
      if (done) return;
      done = true;
      stop();
      resolve(detail);
    });
    setTimeout(() => {
      if (done) return;
      done = true;
      stop();
      resolve(null);
    }, timeoutMs);
  });
}

const DOUBLE_FAST_MS = 350; // max gap between presses to count as a fast double-click
const DOUBLE_SLOW_MS = 900; // max gap between presses to count as a slow double-click

// Listens for hardware key presses and calls onAction(action) whenever a
// press pattern (single / double / doubleSlow) matches one of `bindings`
// (each { deviceDescriptor, keyCode, pattern, action }). Keys with only a
// 'single' binding fire immediately (no wait); keys that also have a
// double/doubleSlow binding wait up to DOUBLE_SLOW_MS to disambiguate.
export function listenBindings(bindings, onAction) {
  const pending = new Map(); // "descriptor::keyCode" -> { timer, firstPressAt }

  const comboKey = (deviceDescriptor, keyCode) => `${deviceDescriptor}::${keyCode}`;
  const bindingsFor = (deviceDescriptor, keyCode) =>
    bindings.filter((b) => b.deviceDescriptor === deviceDescriptor && b.keyCode === keyCode);
  const fire = (deviceDescriptor, keyCode, pattern) => {
    const match = bindingsFor(deviceDescriptor, keyCode).find((b) => b.pattern === pattern);
    if (match) onAction(match.action);
  };
  const startWaiting = (deviceDescriptor, keyCode, firstPressAt) => {
    const key = comboKey(deviceDescriptor, keyCode);
    const timer = setTimeout(() => {
      pending.delete(key);
      fire(deviceDescriptor, keyCode, 'single');
    }, DOUBLE_SLOW_MS);
    pending.set(key, { timer, firstPressAt });
  };

  const stop = listenRawPresses(({ keyCode, deviceDescriptor }) => {
    const matches = bindingsFor(deviceDescriptor, keyCode);
    if (!matches.length) return;
    const hasDouble = matches.some((b) => b.pattern === 'double' || b.pattern === 'doubleSlow');

    if (!hasDouble) {
      fire(deviceDescriptor, keyCode, 'single');
      return;
    }

    const key = comboKey(deviceDescriptor, keyCode);
    const state = pending.get(key);
    const now = Date.now();

    if (state) {
      clearTimeout(state.timer);
      pending.delete(key);
      const delta = now - state.firstPressAt;
      if (delta <= DOUBLE_FAST_MS) fire(deviceDescriptor, keyCode, 'double');
      else if (delta <= DOUBLE_SLOW_MS) fire(deviceDescriptor, keyCode, 'doubleSlow');
      else startWaiting(deviceDescriptor, keyCode, now);
    } else {
      startWaiting(deviceDescriptor, keyCode, now);
    }
  });

  return () => {
    stop();
    pending.forEach((s) => clearTimeout(s.timer));
    pending.clear();
  };
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

// Multiple tags can be connected at once (e.g. one per team) - each
// connection is independent on the native side, keyed by MAC address.
export async function connectBleTag(address) {
  const plugin = bleTag();
  if (!plugin) throw new Error('Tag BLE non disponibile su questo dispositivo');
  await plugin.connect({ address });
}

// Pass an address to disconnect just that tag, or omit to disconnect all.
export async function disconnectBleTag(address) {
  try { await bleTag()?.disconnect(address ? { address } : undefined); } catch {}
}

// A physical tag only has one button, so unlike HID remotes there's no
// keyCode to distinguish - this fixed placeholder plays that role, with the
// tag's MAC address (as deviceDescriptor) telling multiple tags apart.
export const BLE_TAG_KEYCODE = 9001;

// Bridges every tag press into the same "padel-hw-key" event HID remotes
// use, tagged with the pressing tag's address - so a connected tag can be
// bound via the exact same wizard and gets the same single/double/slow-
// double pattern support (e.g. "1 click = punto, 2 click = annulla") as a
// physical remote, with zero separate UI. Set up once at module load
// rather than gated by any enable/disable toggle, since a tag is only ever
// receiving events once the user has explicitly scanned and connected it.
(function bridgeBleTagPresses() {
  const plugin = bleTag();
  if (!plugin) return;
  plugin.addListener('tagPressed', ({ address }) => {
    window.dispatchEvent(new CustomEvent('padel-hw-key', {
      detail: { keyCode: BLE_TAG_KEYCODE, deviceDescriptor: address, deviceName: 'Tag Bluetooth' },
    }));
  });
})();

// cb receives { address, uuid } so the caller can tell which physical tag
// was pressed when more than one is connected.
export function onBleTagPressed(cb) {
  const plugin = bleTag();
  if (!plugin) return () => {};
  const handle = plugin.addListener('tagPressed', (data) => cb(data));
  return () => handle.remove();
}

export function onBleTagConnected(cb) {
  const plugin = bleTag();
  if (!plugin) return () => {};
  const handle = plugin.addListener('connected', (data) => cb(data));
  return () => handle.remove();
}

export function onBleTagDisconnected(cb) {
  const plugin = bleTag();
  if (!plugin) return () => {};
  const handle = plugin.addListener('disconnected', (data) => cb(data));
  return () => handle.remove();
}
