import { useCallback, useEffect, useRef, useState } from 'react';
import { DEFAULT_BINDINGS, RemoteAction, RemoteBindingMap, RemoteInputSource } from './types';
import { HARDWARE_KEY_SOURCES, subscribeToHardwareKeys } from './HardwareKeyListener';
import { loadJSON, saveJSON } from '../../storage/storage';

const BINDINGS_KEY = 'remote-bindings';

export const SIMULATED_SOURCES: RemoteInputSource[] = [
  { id: 'sim:buttonA', label: 'Pulsante A (schermo)', origin: 'simulated' },
  { id: 'sim:buttonB', label: 'Pulsante B (schermo)', origin: 'simulated' },
  { id: 'sim:buttonCancel', label: 'Annulla (schermo)', origin: 'simulated' },
];

export const KNOWN_SOURCES: RemoteInputSource[] = [...SIMULATED_SOURCES, ...HARDWARE_KEY_SOURCES];

/**
 * Central place the rest of the app talks to for "a remote fired an action".
 * It merges hardware-key events (when the native module exists), BLE-GATT
 * events discovered via BleRemoteService (fed in externally, since a scan/
 * connect flow is user-driven from the Settings screen), and on-screen
 * simulated buttons — then maps whichever raw source fired to the user's
 * configured RemoteAction via the persisted binding map.
 */
export function useRemoteInput(onAction: (action: RemoteAction) => void) {
  const [bindings, setBindings] = useState<RemoteBindingMap>(DEFAULT_BINDINGS);
  const [discoveredBleSources, setDiscoveredBleSources] = useState<RemoteInputSource[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);
  const onActionRef = useRef(onAction);
  onActionRef.current = onAction;

  useEffect(() => {
    loadJSON(BINDINGS_KEY, DEFAULT_BINDINGS).then((stored) => {
      setBindings(stored);
      setIsLoaded(true);
    });
  }, []);

  useEffect(() => {
    if (isLoaded) saveJSON(BINDINGS_KEY, bindings);
  }, [bindings, isLoaded]);

  const dispatchFromSource = useCallback(
    (sourceId: string) => {
      const entry = Object.entries(bindings).find(([, boundId]) => boundId === sourceId);
      if (!entry) return;
      onActionRef.current(entry[0] as RemoteAction);
    },
    [bindings]
  );

  useEffect(() => subscribeToHardwareKeys(dispatchFromSource), [dispatchFromSource]);

  const registerBleSource = useCallback((source: RemoteInputSource) => {
    setDiscoveredBleSources((prev) => (prev.some((s) => s.id === source.id) ? prev : [...prev, source]));
  }, []);

  const setBinding = useCallback((action: RemoteAction, sourceId: string | undefined) => {
    setBindings((prev) => ({ ...prev, [action]: sourceId }));
  }, []);

  const triggerSimulated = useCallback(
    (sourceId: string) => dispatchFromSource(sourceId),
    [dispatchFromSource]
  );

  const allSources = [...KNOWN_SOURCES, ...discoveredBleSources];

  return {
    bindings,
    setBinding,
    allSources,
    registerBleSource,
    dispatchFromSource,
    triggerSimulated,
    isLoaded,
  };
}
