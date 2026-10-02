package com.padelapp.app;

import android.Manifest;
import android.bluetooth.BluetoothAdapter;
import android.bluetooth.BluetoothDevice;
import android.bluetooth.BluetoothGatt;
import android.bluetooth.BluetoothGattCallback;
import android.bluetooth.BluetoothGattCharacteristic;
import android.bluetooth.BluetoothGattDescriptor;
import android.bluetooth.BluetoothGattService;
import android.bluetooth.BluetoothManager;
import android.bluetooth.BluetoothProfile;
import android.bluetooth.le.BluetoothLeScanner;
import android.bluetooth.le.ScanCallback;
import android.bluetooth.le.ScanResult;
import android.bluetooth.le.ScanSettings;
import android.content.Context;
import android.os.Build;
import com.getcapacitor.JSArray;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.PermissionState;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.getcapacitor.annotation.Permission;
import com.getcapacitor.annotation.PermissionCallback;
import java.util.HashMap;
import java.util.LinkedList;
import java.util.Map;
import java.util.Queue;
import java.util.UUID;

// Generic Bluetooth Low Energy "tag" support: cheap anti-lost keyrings /
// itag clones each use their own proprietary GATT service (there is no
// standard for this, unlike HID keyboards), but they all follow the same
// pattern of exposing a characteristic with the NOTIFY property that fires
// when the button is pressed. Rather than hard-coding one vendor's UUID
// (which would only work for one specific chip), this subscribes to EVERY
// notifiable characteristic the connected device exposes and treats any
// notification as a "button pressed" event - this covers most of these
// devices regardless of brand/chipset.
// Two separate permission aliases rather than one combined list: on Android
// 12+ (API 31) ACCESS_FINE_LOCATION is capped out of the manifest via
// maxSdkVersion (BLUETOOTH_SCAN/CONNECT replace it), so on those devices
// that permission can never be granted and would permanently fail a combined
// check. Request only the alias that's actually relevant for the running OS
// version.
@CapacitorPlugin(
    name = "BleTag",
    permissions = {
        @Permission(strings = { Manifest.permission.ACCESS_FINE_LOCATION }, alias = "location"),
        @Permission(strings = { Manifest.permission.BLUETOOTH_SCAN, Manifest.permission.BLUETOOTH_CONNECT }, alias = "ble"),
    }
)
public class BleTagPlugin extends Plugin {

    private static final UUID CCCD_UUID = UUID.fromString("00002902-0000-1000-8000-00805f9b34fb");
    // Caratteristica BLE standard "Battery Level" (servizio "Battery Service"
    // 0x180F): molti tag/telecomandi economici la espongono già - già vista
    // notificabile su device come il Nutale Mate (vedi commento più sotto su
    // subscribedCountByAddress). Non tutti i dispositivi la hanno: quando
    // manca, semplicemente non arriva mai nessun evento "batteryLevel", senza
    // errori - stesso comportamento permissivo del resto di questo plugin.
    private static final UUID BATTERY_LEVEL_UUID = UUID.fromString("00002a19-0000-1000-8000-00805f9b34fb");
    // 9s invece di 6, e SCAN_MODE_LOW_LATENCY invece del default LOW_POWER:
    // alcuni tracker (es. Nutale Mate) pubblicizzano la propria presenza a
    // intervalli più radi per risparmiare batteria, e col duty-cycle ridotto
    // di LOW_POWER capitava di non intercettare nessun pacchetto entro la
    // finestra di scansione, facendo sembrare il dispositivo "introvabile"
    // anche se acceso e vicino - LOW_LATENCY scansiona quasi di continuo.
    private static final long SCAN_DURATION_MS = 9000;
    // Intervallo di polling della potenza del segnale (RSSI) per un tag
    // connesso - usato per l'indicatore "vicino/lontano" sia nella schermata
    // Bluetooth (per capire dove posizionarlo) sia sul tabellone durante la
    // partita. 2s è un compromesso: abbastanza reattivo da vedere l'effetto
    // di uno spostamento, senza intasare la connessione BLE con letture
    // continue (che a differenza delle notifiche vanno richieste a comando,
    // non arrivano da sole).
    private static final long RSSI_POLL_INTERVAL_MS = 2000;

    // Keyed by MAC address rather than a single field, so more than one tag
    // (e.g. one per team) can stay connected at the same time.
    private final Map<String, BluetoothGatt> gattByAddress = new HashMap<>();
    private final Map<String, BluetoothDevice> foundDevices = new HashMap<>();

    // Android BLE requires GATT operations to be strictly serialized: issuing
    // a second writeDescriptor() before the previous one's onDescriptorWrite
    // callback has fired silently drops it (no error, it just never happens).
    // A device with more than one NOTIFY/INDICATE characteristic - like the
    // Nutale Mate (Service Changed + a vendor-specific one + Battery Level,
    // all three notifiable) - was hitting exactly this: only the first
    // subscription in the loop actually took effect, so whichever
    // characteristic is the physical button silently never got subscribed
    // if it wasn't first. These per-address queues make the writes happen
    // one at a time, waiting for each real completion before the next.
    private final Map<String, Queue<BluetoothGattDescriptor>> pendingDescriptorQueue = new HashMap<>();
    private final Map<BluetoothGattDescriptor, byte[]> descriptorEnableValue = new HashMap<>();
    private final Map<String, Integer> subscribedCountByAddress = new HashMap<>();
    // Caratteristica Battery Level trovata per questo device (assente se il
    // device non la espone) - usata per leggerne subito il valore appena le
    // sottoscrizioni NOTIFY sono tutte sistemate (vedi writeNextDescriptor),
    // invece di aspettare passivamente che il device la notifichi da solo.
    private final Map<String, BluetoothGattCharacteristic> batteryCharByAddress = new HashMap<>();
    private final Map<String, JSArray> servicesInfoByAddress = new HashMap<>();

    // Diverse tracker economici (confermato su iTag e Nutale Mate: 4 notifiche
    // per una singola pressione fisica, invece di una) mandano più notifiche
    // BLE ravvicinate per un solo evento reale, probabilmente per affidabilità
    // su un collegamento non garantito. Senza filtro, il rilevamento
    // singolo/doppio click lato JS le legge come 2 doppi-click veloci di
    // fila, facendo scattare "Annulla" al posto del punto per ogni pressione
    // vera. Scartare notifiche troppo ravvicinate le riduce a un evento solo,
    // senza toccare il doppio click intenzionale dell'utente (mai così rapido).
    private static final long PRESS_DEBOUNCE_MS = 120;
    private final Map<String, Long> lastPressAtByAddress = new HashMap<>();

    private String scanPermissionAlias() {
        return Build.VERSION.SDK_INT >= 31 ? "ble" : "location";
    }

    @PluginMethod
    public void scan(PluginCall call) {
        String alias = scanPermissionAlias();
        if (getPermissionState(alias) != PermissionState.GRANTED) {
            requestPermissionForAlias(alias, call, "scanPermCallback");
            return;
        }
        doScan(call);
    }

    @PermissionCallback
    private void scanPermCallback(PluginCall call) {
        if (getPermissionState(scanPermissionAlias()) == PermissionState.GRANTED) {
            doScan(call);
        } else {
            call.reject("Permesso Bluetooth/posizione negato. Vai in Impostazioni > App > Padel App > Autorizzazioni e concedi \"Dispositivi vicini\" (o \"Posizione\" su Android più vecchi).");
        }
    }

    private void doScan(PluginCall call) {
        BluetoothManager btManager = (BluetoothManager) getContext().getSystemService(Context.BLUETOOTH_SERVICE);
        BluetoothAdapter adapter = btManager != null ? btManager.getAdapter() : null;
        if (adapter == null || !adapter.isEnabled()) {
            call.reject("Bluetooth non attivo sul telefono");
            return;
        }
        BluetoothLeScanner scanner = adapter.getBluetoothLeScanner();
        if (scanner == null) {
            call.reject("Scanner BLE non disponibile");
            return;
        }
        foundDevices.clear();
        ScanCallback scanCallback = new ScanCallback() {
            @Override
            public void onScanResult(int callbackType, ScanResult result) {
                BluetoothDevice device = result.getDevice();
                if (device != null && device.getAddress() != null) {
                    foundDevices.put(device.getAddress(), device);
                }
            }
        };
        ScanSettings settings = new ScanSettings.Builder()
            .setScanMode(ScanSettings.SCAN_MODE_LOW_LATENCY)
            .build();
        try {
            scanner.startScan(null, settings, scanCallback);
        } catch (SecurityException e) {
            call.reject("Permesso Bluetooth mancante");
            return;
        }
        getBridge()
            .getWebView()
            .postDelayed(
                () -> {
                    try {
                        scanner.stopScan(scanCallback);
                    } catch (SecurityException ignored) {}
                    JSArray devices = new JSArray();
                    for (BluetoothDevice d : foundDevices.values()) {
                        JSObject o = new JSObject();
                        String name = null;
                        try {
                            name = d.getName();
                        } catch (SecurityException ignored) {}
                        o.put("name", name != null ? name : "Dispositivo sconosciuto");
                        o.put("address", d.getAddress());
                        devices.put(o);
                    }
                    JSObject ret = new JSObject();
                    ret.put("devices", devices);
                    call.resolve(ret);
                },
                SCAN_DURATION_MS
            );
    }

    @PluginMethod
    public void connect(PluginCall call) {
        String address = call.getString("address");
        if (address == null) {
            call.reject("address mancante");
            return;
        }
        BluetoothManager btManager = (BluetoothManager) getContext().getSystemService(Context.BLUETOOTH_SERVICE);
        BluetoothAdapter adapter = btManager != null ? btManager.getAdapter() : null;
        if (adapter == null) {
            call.reject("Bluetooth non disponibile");
            return;
        }
        BluetoothGatt existing = gattByAddress.remove(address);
        if (existing != null) {
            try {
                existing.disconnect();
                existing.close();
            } catch (SecurityException ignored) {}
        }
        BluetoothDevice device = adapter.getRemoteDevice(address);
        try {
            BluetoothGatt g = device.connectGatt(getContext(), false, gattCallback);
            gattByAddress.put(address, g);
        } catch (SecurityException e) {
            call.reject("Permesso Bluetooth mancante");
            return;
        }
        call.resolve();
    }

    // Pass "address" to disconnect just that tag; omit it to disconnect all
    // (e.g. when the remote-control toggle is switched off entirely).
    @PluginMethod
    public void disconnect(PluginCall call) {
        String address = call.getString("address");
        if (address != null) {
            BluetoothGatt g = gattByAddress.remove(address);
            if (g != null) {
                try {
                    g.disconnect();
                    g.close();
                } catch (SecurityException ignored) {}
            }
        } else {
            for (BluetoothGatt g : gattByAddress.values()) {
                try {
                    g.disconnect();
                    g.close();
                } catch (SecurityException ignored) {}
            }
            gattByAddress.clear();
        }
        call.resolve();
    }

    private String addressOf(BluetoothGatt g) {
        try {
            BluetoothDevice d = g.getDevice();
            return d != null ? d.getAddress() : null;
        } catch (SecurityException e) {
            return null;
        }
    }

    private final BluetoothGattCallback gattCallback = new BluetoothGattCallback() {
        @Override
        public void onConnectionStateChange(BluetoothGatt g, int status, int newState) {
            if (newState == BluetoothProfile.STATE_CONNECTED) {
                try {
                    g.discoverServices();
                } catch (SecurityException ignored) {}
            } else if (newState == BluetoothProfile.STATE_DISCONNECTED) {
                String address = addressOf(g);
                gattByAddress.remove(address);
                pendingDescriptorQueue.remove(address);
                subscribedCountByAddress.remove(address);
                servicesInfoByAddress.remove(address);
                lastPressAtByAddress.remove(address);
                batteryCharByAddress.remove(address);
                JSObject data = new JSObject();
                data.put("address", address);
                notifyListeners("disconnected", data);
            }
        }

        @Override
        public void onServicesDiscovered(BluetoothGatt g, int status) {
            String address = addressOf(g);
            // Elenco dei servizi/caratteristiche scoperti, incluso su OGNI
            // connessione (non solo per debug): questo elenco è ciò che
            // serve per capire perché un bottone non arriva, senza dover
            // ricorrere a un'app esterna come nRF Connect.
            JSArray services = new JSArray();
            Queue<BluetoothGattDescriptor> toWrite = new LinkedList<>();
            for (BluetoothGattService service : g.getServices()) {
                JSObject svcInfo = new JSObject();
                svcInfo.put("uuid", service.getUuid().toString());
                JSArray chars = new JSArray();
                for (BluetoothGattCharacteristic ch : service.getCharacteristics()) {
                    int props = ch.getProperties();
                    boolean notify = (props & BluetoothGattCharacteristic.PROPERTY_NOTIFY) != 0;
                    boolean indicate = (props & BluetoothGattCharacteristic.PROPERTY_INDICATE) != 0;
                    JSObject chInfo = new JSObject();
                    chInfo.put("uuid", ch.getUuid().toString());
                    chInfo.put("notify", notify || indicate);
                    chars.put(chInfo);
                    if (ch.getUuid().equals(BATTERY_LEVEL_UUID)) batteryCharByAddress.put(address, ch);
                    if (!notify && !indicate) continue;
                    try {
                        g.setCharacteristicNotification(ch, true);
                        BluetoothGattDescriptor descriptor = ch.getDescriptor(CCCD_UUID);
                        if (descriptor != null) {
                            byte[] value = notify
                                ? BluetoothGattDescriptor.ENABLE_NOTIFICATION_VALUE
                                : BluetoothGattDescriptor.ENABLE_INDICATION_VALUE;
                            descriptorEnableValue.put(descriptor, value);
                            toWrite.add(descriptor);
                        }
                    } catch (SecurityException ignored) {}
                }
                svcInfo.put("characteristics", chars);
                services.put(svcInfo);
            }
            pendingDescriptorQueue.put(address, toWrite);
            servicesInfoByAddress.put(address, services);
            subscribedCountByAddress.put(address, 0);
            writeNextDescriptor(g, address);
        }

        // Scrive un descrittore CCCD alla volta e aspetta onDescriptorWrite
        // prima del successivo - vedi il commento sulle mappe pendingDescriptorQueue
        // qui sopra per il perché è necessario. Quando la coda si svuota,
        // "connected" parte con il conteggio reale delle sottoscrizioni
        // andate davvero a buon fine, non solo di quelle tentate.
        private void writeNextDescriptor(BluetoothGatt g, String address) {
            Queue<BluetoothGattDescriptor> queue = pendingDescriptorQueue.get(address);
            if (queue == null || queue.isEmpty()) {
                JSObject data = new JSObject();
                data.put("address", address);
                data.put("subscribed", subscribedCountByAddress.getOrDefault(address, 0));
                data.put("services", servicesInfoByAddress.get(address));
                notifyListeners("connected", data);
                // Letta solo ora che la coda dei descrittori NOTIFY è vuota:
                // le operazioni GATT vanno rigorosamente serializzate (vedi
                // commento sulle mappe più sopra), quindi avviarla prima
                // avrebbe rischiato di farla silenziosamente cadere.
                BluetoothGattCharacteristic battery = batteryCharByAddress.get(address);
                if (battery != null) {
                    try { g.readCharacteristic(battery); } catch (SecurityException ignored) {}
                }
                // DISATTIVATO (temporaneo): il polling continuo del segnale per
                // tutta la durata della connessione è sospettato di disturbare
                // la ricezione delle notifiche (il bottone) su hardware reale -
                // segnalato dall'utente subito dopo questa modifica ("non
                // riesco più a configurarli"). Tolto finché non si capisce
                // meglio la causa - vedi scheduleRssiRead/onReadRemoteRssi più
                // sotto, lasciati pronti per quando si riattiva in sicurezza.
                // scheduleRssiRead(g, address);
                return;
            }
            BluetoothGattDescriptor descriptor = queue.poll();
            byte[] value = descriptorEnableValue.get(descriptor);
            try {
                boolean started;
                if (Build.VERSION.SDK_INT >= 33) {
                    started = g.writeDescriptor(descriptor, value) == 0; // BluetoothStatusCodes.SUCCESS
                } else {
                    descriptor.setValue(value);
                    started = g.writeDescriptor(descriptor);
                }
                if (!started) writeNextDescriptor(g, address);
            } catch (SecurityException e) {
                writeNextDescriptor(g, address);
            }
        }

        @Override
        public void onDescriptorWrite(BluetoothGatt g, BluetoothGattDescriptor descriptor, int status) {
            String address = addressOf(g);
            if (status == BluetoothGatt.GATT_SUCCESS) {
                subscribedCountByAddress.merge(address, 1, Integer::sum);
            }
            writeNextDescriptor(g, address);
        }

        // Letta sia dalla notifica spontanea del device sia dalla lettura
        // esplicita avviata appena connessi (vedi writeNextDescriptor) -
        // unico punto che traduce il valore grezzo in percentuale.
        private void emitBatteryLevel(String address, BluetoothGattCharacteristic characteristic) {
            byte[] value = characteristic.getValue();
            if (value == null || value.length == 0) return;
            int level = value[0] & 0xFF; // percentuale 0-100, 1 byte senza segno
            JSObject data = new JSObject();
            data.put("address", address);
            data.put("level", level);
            notifyListeners("batteryLevel", data);
        }

        // Richiede una lettura RSSI una volta sola; il giro successivo lo
        // pianifica onReadRemoteRssi stesso (loop auto-concatenato finché il
        // device resta in gattByAddress) - mai due letture in sospeso insieme,
        // stesso principio di serializzazione delle altre operazioni GATT qui.
        private void scheduleRssiRead(BluetoothGatt g, String address) {
            getBridge().getWebView().postDelayed(() -> {
                if (!gattByAddress.containsKey(address)) return; // disconnesso nel frattempo
                try {
                    g.readRemoteRssi();
                } catch (SecurityException e) {
                    scheduleRssiRead(g, address); // riprova al giro dopo invece di fermarsi per sempre
                }
            }, RSSI_POLL_INTERVAL_MS);
        }

        // RSSI (dBm, tipicamente tra circa -100 "al limite" e -40 "vicinissimo")
        // convertito in una percentuale indicativa per l'utente - non è una
        // misura scientifica, è la stessa logica delle "barrette" del segnale
        // wifi/cellulare: sotto -100 è 0%, sopra -50 è 100%, in mezzo lineare.
        private int rssiToPercent(int rssi) {
            int pct = (rssi + 100) * 2;
            return Math.max(0, Math.min(100, pct));
        }

        @Override
        public void onReadRemoteRssi(BluetoothGatt g, int rssi, int status) {
            String address = addressOf(g);
            if (status == BluetoothGatt.GATT_SUCCESS) {
                JSObject data = new JSObject();
                data.put("address", address);
                data.put("rssi", rssi);
                data.put("percent", rssiToPercent(rssi));
                notifyListeners("rssi", data);
            }
            scheduleRssiRead(g, address);
        }

        @Override
        public void onCharacteristicRead(BluetoothGatt g, BluetoothGattCharacteristic characteristic, int status) {
            if (status != BluetoothGatt.GATT_SUCCESS) return;
            if (!characteristic.getUuid().equals(BATTERY_LEVEL_UUID)) return;
            emitBatteryLevel(addressOf(g), characteristic);
        }

        @Override
        public void onCharacteristicChanged(BluetoothGatt g, BluetoothGattCharacteristic characteristic) {
            String address = addressOf(g);
            // La Battery Level può essere tra le caratteristiche notificabili
            // (vedi commento su subscribedCountByAddress) - una sua notifica
            // non è una pressione del pulsante, quindi va smistata a parte
            // invece di passare per "tagPressed" (altrimenti un aggiornamento
            // batteria spontaneo segnerebbe un punto a caso in partita).
            if (characteristic.getUuid().equals(BATTERY_LEVEL_UUID)) {
                emitBatteryLevel(address, characteristic);
                return;
            }
            long now = System.currentTimeMillis();
            Long last = lastPressAtByAddress.get(address);
            if (last != null && (now - last) < PRESS_DEBOUNCE_MS) return;
            lastPressAtByAddress.put(address, now);
            JSObject data = new JSObject();
            data.put("address", address);
            data.put("uuid", characteristic.getUuid().toString());
            notifyListeners("tagPressed", data);
        }
    };
}
