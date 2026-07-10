package com.padelapp.app;

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
}
