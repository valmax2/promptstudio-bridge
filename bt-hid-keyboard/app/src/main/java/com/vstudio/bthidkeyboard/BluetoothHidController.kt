package com.vstudio.bthidkeyboard

import android.annotation.SuppressLint
import android.bluetooth.*
import android.content.Context
import android.os.Handler
import android.os.Looper
import android.util.Log
import java.util.concurrent.Executors

@SuppressLint("MissingPermission")
class BluetoothHidController(private val context: Context, private val onStatusChanged: (String) -> Unit) {

    private val TAG = "BT_HID_CONTROLLER"
    private var bluetoothAdapter: BluetoothAdapter? = BluetoothAdapter.getDefaultAdapter()
    private var hidDeviceProfile: BluetoothHidDevice? = null
    private var connectedDevice: BluetoothDevice? = null
    private var appRegistered = false
    private val mainHandler = Handler(Looper.getMainLooper())

    init {
        setup()
    }

    private fun setup() {
        try {
            bluetoothAdapter?.name = "VStudio HID Keyboard"
        } catch (e: SecurityException) {
            Log.w(TAG, "Impossibile rinominare il Bluetooth: permesso mancante", e)
        }

        val proxyRequested = bluetoothAdapter?.getProfileProxy(context, object : BluetoothProfile.ServiceListener {
            override fun onServiceConnected(profile: Int, proxy: BluetoothProfile?) {
                if (profile == BluetoothProfile.HID_DEVICE) {
                    hidDeviceProfile = proxy as BluetoothHidDevice
                    registerApp()
                }
            }
            override fun onServiceDisconnected(profile: Int) {
                if (profile == BluetoothProfile.HID_DEVICE) hidDeviceProfile = null
            }
        }, BluetoothProfile.HID_DEVICE) ?: false

        if (!proxyRequested) {
            onStatusChanged("Bluetooth non disponibile su questo dispositivo.")
            return
        }

        // Se dopo alcuni secondi il profilo HID Device non si è registrato,
        // il telefono probabilmente non supporta questa modalità (limite hardware/firmware).
        mainHandler.postDelayed({
            if (!appRegistered) {
                onStatusChanged("Il telefono non supporta la modalità tastiera Bluetooth (HID Device).")
            }
        }, 6000)
    }

    private fun registerApp() {
        val sdpSettings = BluetoothHidDeviceAppSdpSettings(
            "VStudio HID Keyboard",
            "Generatore Tastiera/Vocale",
            "VStudio",
            BluetoothHidDevice.SUBCLASS1_COMBO,
            HidUtils.KEYBOARD_REPORT_DESCRIPTOR
        )

        hidDeviceProfile?.registerApp(
            sdpSettings, null, null,
            Executors.newSingleThreadExecutor(),
            object : BluetoothHidDevice.Callback() {
                override fun onAppStatusChanged(pluggedDevice: BluetoothDevice?, registered: Boolean) {
                    super.onAppStatusChanged(pluggedDevice, registered)
                    appRegistered = registered
                    if (registered) {
                        onStatusChanged("Pronto. Cerca \"VStudio HID Keyboard\" sul PC.")
                    } else {
                        onStatusChanged("Registrazione HID fallita: il telefono potrebbe non supportarla.")
                    }
                }

                override fun onConnectionStateChanged(device: BluetoothDevice?, state: Int) {
                    super.onConnectionStateChanged(device, state)
                    if (state == BluetoothProfile.STATE_CONNECTED) {
                        connectedDevice = device
                        onStatusChanged("Connesso a: ${device?.name ?: "PC"}")
                    } else if (state == BluetoothProfile.STATE_DISCONNECTED) {
                        connectedDevice = null
                        onStatusChanged("Disconnesso. In attesa...")
                    }
                }
            }
        )
    }

    fun sendChar(char: Char) {
        val device = connectedDevice ?: return
        val hidCode = HidUtils.charToHidCode(char)
        if (hidCode == 0x00.toByte()) return

        val reportPress = ByteArray(8)
        reportPress[2] = hidCode

        val reportRelease = ByteArray(8)

        hidDeviceProfile?.sendReport(device, 1, reportPress)
        Thread.sleep(15)
        hidDeviceProfile?.sendReport(device, 1, reportRelease)
        Thread.sleep(15)
    }

    fun sendString(text: String) {
        Thread {
            for (char in text) {
                sendChar(char)
            }
        }.start()
    }
}
