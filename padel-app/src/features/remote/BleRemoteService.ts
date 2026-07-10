import { BleManager, Device, Subscription } from 'react-native-ble-plx';
import { Platform, PermissionsAndroid } from 'react-native';
import { Buffer } from 'buffer';
import { RemoteInputSource } from './types';

/**
 * Wraps react-native-ble-plx to talk to generic BLE "clicker" remotes that expose
 * a custom GATT service (many cheap camera-shutter remotes do this instead of, or
 * in addition to, acting as a Bluetooth HID keyboard). This only works in a custom
 * dev client / release build (native module) — it is a no-op in Expo Go.
 *
 * Devices that instead emulate a Bluetooth HID keyboard (sending volume-up/down or
 * media-key events) are NOT reachable through GATT scanning at all — the OS
 * consumes those as system key events before any app-level BLE code sees them.
 * That path needs a small native Android module (Activity.dispatchKeyEvent
 * override) which is not implemented yet; see HardwareKeyListener.ts.
 */
export type BleRawEvent = { source: RemoteInputSource; raw: number[] };

let manager: BleManager | null = null;
let managerInitFailed = false;

/** Returns null (instead of throwing) when the native BLE module isn't present
 * — e.g. running in Expo Go or on web — so callers can show a graceful notice
 * instead of crashing the Settings screen. */
function getManager(): BleManager | null {
  if (managerInitFailed) return null;
  if (!manager) {
    try {
      manager = new BleManager();
    } catch {
      managerInitFailed = true;
      return null;
    }
  }
  return manager;
}

export function isBleAvailable(): boolean {
  return getManager() !== null;
}

export async function ensureBlePermissions(): Promise<boolean> {
  if (Platform.OS !== 'android') return true;
  if (Platform.Version >= 31) {
    const results = await PermissionsAndroid.requestMultiple([
      PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN,
      PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT,
    ]);
    return Object.values(results).every((r) => r === PermissionsAndroid.RESULTS.GRANTED);
  }
  const fineLocation = await PermissionsAndroid.request(
    PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION
  );
  return fineLocation === PermissionsAndroid.RESULTS.GRANTED;
}

export function scanForRemotes(
  onDeviceFound: (device: Device) => void,
  onError?: (error: Error) => void
): () => void {
  const mgr = getManager();
  if (!mgr) {
    onError?.(new Error('BLE non disponibile: serve una build nativa (dev client), non funziona in Expo Go/web.'));
    return () => {};
  }
  mgr.startDeviceScan(null, { allowDuplicates: false }, (error, device) => {
    if (error) {
      onError?.(error);
      return;
    }
    if (device && (device.name || device.localName)) onDeviceFound(device);
  });
  return () => mgr.stopDeviceScan();
}

export async function connectToRemote(deviceId: string): Promise<Device> {
  const mgr = getManager();
  if (!mgr) throw new Error('BLE non disponibile in questa build.');
  const device = await mgr.connectToDevice(deviceId);
  await device.discoverAllServicesAndCharacteristics();
  return device;
}

/**
 * Subscribes to every notifiable characteristic on the device and forwards raw
 * byte payloads. The app doesn't know a given remote's GATT profile ahead of
 * time, so binding happens in the UI: the user presses a physical button and we
 * surface whichever characteristic just fired as a candidate RemoteInputSource.
 */
export function subscribeToAllNotifications(
  device: Device,
  onEvent: (event: BleRawEvent) => void
): () => void {
  const subscriptions: Subscription[] = [];

  device.services().then(async (services) => {
    for (const service of services) {
      const characteristics = await service.characteristics();
      for (const characteristic of characteristics) {
        if (!characteristic.isNotifiable) continue;
        const sub = characteristic.monitor((error, updated) => {
          if (error || !updated?.value) return;
          const bytes = Array.from(Buffer.from(updated.value, 'base64'));
          onEvent({
            source: {
              id: `ble:${device.id}#${characteristic.uuid}`,
              label: `${device.name || device.id} · ${characteristic.uuid.slice(0, 8)}`,
              origin: 'ble-gatt',
            },
            raw: bytes,
          });
        });
        subscriptions.push(sub);
      }
    }
  });

  return () => subscriptions.forEach((s) => s.remove());
}

export async function disconnectRemote(deviceId: string): Promise<void> {
  const mgr = getManager();
  if (!mgr) return;
  await mgr.cancelDeviceConnection(deviceId);
}
