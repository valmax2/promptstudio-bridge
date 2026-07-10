import { DeviceEventEmitter, EmitterSubscription, NativeModules } from 'react-native';
import { RemoteInputSource } from './types';

/**
 * Most cheap "camera shutter" BLE remotes and smartwatch camera buttons do NOT
 * expose a custom GATT service — they pair as a standard Bluetooth HID keyboard
 * and send volume-up/volume-down (or media play/pause) key codes. Android/iOS
 * consume those as hardware key events at the OS level before any JS/BLE code
 * can see them, so BleRemoteService (GATT scanning) can never intercept them.
 *
 * Capturing them requires a small native module:
 *  - Android: override `dispatchKeyEvent` in the main Activity, emit a
 *    `DeviceEventEmitter` event (e.g. "padel-hardware-key") for KEYCODE_VOLUME_UP /
 *    KEYCODE_VOLUME_DOWN / KEYCODE_CAMERA / KEYCODE_MEDIA_PLAY_PAUSE, and consume
 *    the event so the system volume UI doesn't also pop up.
 *  - iOS: only MPRemoteCommandCenter (media play/pause/next/previous) is
 *    interceptable this way; iOS does not allow apps to intercept the physical
 *    volume buttons at all, which rules out volume-key remotes on iPhone/iPad.
 *
 * That native module is not implemented yet (tracked in Module 6 follow-up).
 * This file defines the JS-side contract so the rest of the app (binding UI,
 * RemoteInputService) can be built and tested now with the "simulated" source,
 * and wired to the real thing by adding the native listener below with no
 * changes needed elsewhere.
 */

const NATIVE_EVENT_NAME = 'padel-hardware-key';

export const HARDWARE_KEY_SOURCES: RemoteInputSource[] = [
  { id: 'hw:volume-up', label: 'Volume + (telecomando/orologio)', origin: 'hardware-key' },
  { id: 'hw:volume-down', label: 'Volume - (telecomando/orologio)', origin: 'hardware-key' },
  { id: 'hw:media-play-pause', label: 'Play/Pausa media', origin: 'hardware-key' },
  { id: 'hw:camera-shutter', label: 'Scatto fotocamera', origin: 'hardware-key' },
];

export function isHardwareKeyCaptureAvailable(): boolean {
  return Boolean(NativeModules.PadelHardwareKeys);
}

export function subscribeToHardwareKeys(
  onKey: (sourceId: string) => void
): () => void {
  if (!isHardwareKeyCaptureAvailable()) return () => {};
  const sub: EmitterSubscription = DeviceEventEmitter.addListener(
    NATIVE_EVENT_NAME,
    (event: { key: string }) => onKey(`hw:${event.key}`)
  );
  return () => sub.remove();
}
