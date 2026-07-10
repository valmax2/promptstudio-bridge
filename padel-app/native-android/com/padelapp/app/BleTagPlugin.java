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
import java.util.Map;
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
@CapacitorPlugin(
    name = "BleTag",
    permissions = {
        @Permission(
            strings = { Manifest.permission.BLUETOOTH_SCAN, Manifest.permission.BLUETOOTH_CONNECT, Manifest.permission.ACCESS_FINE_LOCATION },
            alias = "ble"
        )
    }
)
public class BleTagPlugin extends Plugin {

    private static final UUID CCCD_UUID = UUID.fromString("00002902-0000-1000-8000-00805f9b34fb");
    private static final long SCAN_DURATION_MS = 6000;

    private BluetoothGatt gatt;
    private final Map<String, BluetoothDevice> foundDevices = new HashMap<>();

    @PluginMethod
    public void scan(PluginCall call) {
        if (getPermissionState("ble") != PermissionState.GRANTED) {
            requestPermissionForAlias("ble", call, "scanPermCallback");
            return;
        }
        doScan(call);
    }

    @PermissionCallback
    private void scanPermCallback(PluginCall call) {
        if (getPermissionState("ble") == PermissionState.GRANTED) {
            doScan(call);
        } else {
            call.reject("Permesso Bluetooth negato");
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
        try {
            scanner.startScan(scanCallback);
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
        if (gatt != null) {
            try {
                gatt.disconnect();
                gatt.close();
            } catch (SecurityException ignored) {}
            gatt = null;
        }
        BluetoothDevice device = adapter.getRemoteDevice(address);
        try {
            gatt = device.connectGatt(getContext(), false, gattCallback);
        } catch (SecurityException e) {
            call.reject("Permesso Bluetooth mancante");
            return;
        }
        call.resolve();
    }

    @PluginMethod
    public void disconnect(PluginCall call) {
        if (gatt != null) {
            try {
                gatt.disconnect();
                gatt.close();
            } catch (SecurityException ignored) {}
            gatt = null;
        }
        call.resolve();
    }

    private final BluetoothGattCallback gattCallback = new BluetoothGattCallback() {
        @Override
        public void onConnectionStateChange(BluetoothGatt g, int status, int newState) {
            if (newState == BluetoothProfile.STATE_CONNECTED) {
                try {
                    g.discoverServices();
                } catch (SecurityException ignored) {}
            } else if (newState == BluetoothProfile.STATE_DISCONNECTED) {
                notifyListeners("disconnected", new JSObject());
            }
        }

        @Override
        public void onServicesDiscovered(BluetoothGatt g, int status) {
            int subscribed = 0;
            for (BluetoothGattService service : g.getServices()) {
                for (BluetoothGattCharacteristic ch : service.getCharacteristics()) {
                    int props = ch.getProperties();
                    boolean notify = (props & BluetoothGattCharacteristic.PROPERTY_NOTIFY) != 0;
                    boolean indicate = (props & BluetoothGattCharacteristic.PROPERTY_INDICATE) != 0;
                    if (!notify && !indicate) continue;
                    try {
                        g.setCharacteristicNotification(ch, true);
                        BluetoothGattDescriptor descriptor = ch.getDescriptor(CCCD_UUID);
                        if (descriptor != null) {
                            byte[] value = notify
                                ? BluetoothGattDescriptor.ENABLE_NOTIFICATION_VALUE
                                : BluetoothGattDescriptor.ENABLE_INDICATION_VALUE;
                            if (Build.VERSION.SDK_INT >= 33) {
                                g.writeDescriptor(descriptor, value);
                            } else {
                                descriptor.setValue(value);
                                g.writeDescriptor(descriptor);
                            }
                        }
                        subscribed++;
                    } catch (SecurityException ignored) {}
                }
            }
            JSObject data = new JSObject();
            data.put("subscribed", subscribed);
            notifyListeners("connected", data);
        }

        @Override
        public void onCharacteristicChanged(BluetoothGatt g, BluetoothGattCharacteristic characteristic) {
            JSObject data = new JSObject();
            data.put("uuid", characteristic.getUuid().toString());
            notifyListeners("tagPressed", data);
        }
    };
}
