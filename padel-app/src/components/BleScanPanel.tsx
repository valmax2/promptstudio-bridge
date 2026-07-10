import React, { useEffect, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Device } from 'react-native-ble-plx';
import { ThemedText } from './ThemedText';
import { Button } from './Button';
import { useAppTheme } from '../theme/ThemeContext';
import {
  connectToRemote,
  ensureBlePermissions,
  isBleAvailable,
  scanForRemotes,
  subscribeToAllNotifications,
} from '../features/remote/BleRemoteService';
import { RemoteInputSource } from '../features/remote/types';

interface BleScanPanelProps {
  onSourceFired: (source: RemoteInputSource) => void;
}

export function BleScanPanel({ onSourceFired }: BleScanPanelProps) {
  const { palette } = useAppTheme();
  const [scanning, setScanning] = useState(false);
  const [found, setFound] = useState<Device[]>([]);
  const [connectedId, setConnectedId] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const stopScanRef = useRef<() => void>(() => {});
  const stopNotifyRef = useRef<() => void>(() => {});

  useEffect(() => () => {
    stopScanRef.current();
    stopNotifyRef.current();
  }, []);

  if (!isBleAvailable()) {
    return (
      <View style={styles.wrap}>
        <ThemedText variant="caption" color="secondary">
          Il Bluetooth BLE richiede una build nativa dell'app (dev client) — non è
          disponibile in anteprima Expo Go o sul web.
        </ThemedText>
      </View>
    );
  }

  const startScan = async () => {
    setNotice(null);
    setFound([]);
    const granted = await ensureBlePermissions();
    if (!granted) {
      setNotice('Permesso Bluetooth negato.');
      return;
    }
    setScanning(true);
    stopScanRef.current = scanForRemotes(
      (device) => setFound((prev) => (prev.some((d) => d.id === device.id) ? prev : [...prev, device])),
      (error) => setNotice(error.message)
    );
  };

  const stopScan = () => {
    stopScanRef.current();
    setScanning(false);
  };

  const connect = async (device: Device) => {
    try {
      stopScan();
      const connected = await connectToRemote(device.id);
      setConnectedId(connected.id);
      stopNotifyRef.current = subscribeToAllNotifications(connected, (event) => onSourceFired(event.source));
    } catch (e) {
      setNotice((e as Error).message);
    }
  };

  return (
    <View style={styles.wrap}>
      <View style={styles.row}>
        <Button label={scanning ? 'Ferma ricerca' : 'Cerca dispositivi'} onPress={scanning ? stopScan : startScan} />
      </View>
      {notice && (
        <ThemedText variant="caption" color="danger" style={{ marginTop: 8 }}>
          {notice}
        </ThemedText>
      )}
      {found.map((device) => (
        <View key={device.id} style={[styles.deviceRow, { borderTopColor: palette.border }]}>
          <ThemedText variant="body" style={{ flex: 1 }}>
            {device.name || device.localName || device.id}
          </ThemedText>
          <Button
            label={connectedId === device.id ? 'Connesso' : 'Connetti'}
            variant={connectedId === device.id ? 'primary' : 'secondary'}
            onPress={() => connect(device)}
          />
        </View>
      ))}
      {connectedId && (
        <ThemedText variant="caption" color="secondary" style={{ marginTop: 8 }}>
          Premi un tasto sul telecomando: comparirà come nuova opzione nelle
          associazioni qui sotto.
        </ThemedText>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { padding: 14 },
  row: { flexDirection: 'row' },
  deviceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingTop: 10,
    marginTop: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
});
