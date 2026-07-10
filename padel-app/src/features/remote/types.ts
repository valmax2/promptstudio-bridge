/** Logical actions the remote scoreboard understands, independent of the physical input. */
export type RemoteAction = 'pointA' | 'pointB' | 'undo';

/** A raw input the user can bind to a RemoteAction. */
export interface RemoteInputSource {
  /** Stable id, e.g. "ble:AA:BB:CC:11:22:33#char-uuid:0x01" or "sim:buttonA". */
  id: string;
  label: string;
  origin: 'ble-gatt' | 'hardware-key' | 'simulated';
}

export type RemoteBindingMap = Partial<Record<RemoteAction, string>>; // action -> RemoteInputSource.id

export const DEFAULT_BINDINGS: RemoteBindingMap = {
  pointA: 'sim:buttonA',
  pointB: 'sim:buttonB',
  undo: 'sim:buttonCancel',
};
