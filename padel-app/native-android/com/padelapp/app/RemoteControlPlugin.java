package com.padelapp.app;

import android.content.Intent;
import android.provider.Settings;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

// Local (app-only) Capacitor plugin: lets the web layer turn hardware-key
// remote listening on/off (see MainActivity.dispatchKeyEvent). Kept enabled
// only while the scoreboard screen is open, so a Bluetooth remote's keys
// don't hijack volume/media control elsewhere in the app.
@CapacitorPlugin(name = "RemoteControl")
public class RemoteControlPlugin extends Plugin {

    public static volatile boolean remoteEnabled = false;

    @PluginMethod
    public void enable(PluginCall call) {
        remoteEnabled = true;
        call.resolve();
    }

    @PluginMethod
    public void disable(PluginCall call) {
        remoteEnabled = false;
        call.resolve();
    }

    @PluginMethod
    public void isEnabled(PluginCall call) {
        JSObject ret = new JSObject();
        ret.put("enabled", remoteEnabled);
        call.resolve(ret);
    }

    // Jumps straight to Android's own Bluetooth settings screen - regular
    // remotes/keyboards must be paired there (no app, including this one, is
    // allowed to pair a Bluetooth HID device on the user's behalf), so this
    // saves them hunting through the phone's system settings menu.
    @PluginMethod
    public void openBluetoothSettings(PluginCall call) {
        Intent intent = new Intent(Settings.ACTION_BLUETOOTH_SETTINGS);
        intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
        getActivity().startActivity(intent);
        call.resolve();
    }
}
