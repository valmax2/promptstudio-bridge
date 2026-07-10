package com.padelapp.app;

import android.os.Bundle;
import android.view.KeyEvent;
import com.getcapacitor.BridgeActivity;

// Custom MainActivity: forwards a fixed set of hardware keycodes (volume,
// camera, media, headset, dpad) to the web layer as a "padel-hw-key" custom
// event, instead of letting Android handle them as normal (volume change,
// camera shutter, etc). This is how cheap Bluetooth "selfie remotes" and
// smartwatch camera-shutter modes are made usable as a padel scoreboard
// remote: they pair as a standard Bluetooth HID keyboard and simply send one
// of these keycodes, no custom BLE protocol involved.
//
// Interception only happens while RemoteControlPlugin.remoteEnabled is true
// (toggled from JS), so normal volume/media control still works everywhere
// else in the app.
public class MainActivity extends BridgeActivity {

    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(RemoteControlPlugin.class);
        registerPlugin(BleTagPlugin.class);
        super.onCreate(savedInstanceState);
    }

    private boolean isRemoteKey(int keyCode) {
        switch (keyCode) {
            case KeyEvent.KEYCODE_VOLUME_UP:
            case KeyEvent.KEYCODE_VOLUME_DOWN:
            case KeyEvent.KEYCODE_CAMERA:
            case KeyEvent.KEYCODE_MEDIA_PLAY_PAUSE:
            case KeyEvent.KEYCODE_MEDIA_NEXT:
            case KeyEvent.KEYCODE_MEDIA_PREVIOUS:
            case KeyEvent.KEYCODE_HEADSETHOOK:
            case KeyEvent.KEYCODE_DPAD_LEFT:
            case KeyEvent.KEYCODE_DPAD_RIGHT:
            case KeyEvent.KEYCODE_DPAD_CENTER:
            case KeyEvent.KEYCODE_ENTER:
                return true;
            default:
                return false;
        }
    }

    @Override
    public boolean dispatchKeyEvent(KeyEvent event) {
        if (RemoteControlPlugin.remoteEnabled && isRemoteKey(event.getKeyCode())) {
            if (event.getAction() == KeyEvent.ACTION_DOWN && event.getRepeatCount() == 0) {
                final int keyCode = event.getKeyCode();
                runOnUiThread(() -> {
                    if (getBridge() != null && getBridge().getWebView() != null) {
                        String js = "window.dispatchEvent(new CustomEvent('padel-hw-key', { detail: { keyCode: " + keyCode + " } }));";
                        getBridge().getWebView().evaluateJavascript(js, null);
                    }
                });
            }
            // Consume the event either way (down and up) so the system
            // doesn't also show the volume UI / open the camera / etc.
            return true;
        }
        return super.dispatchKeyEvent(event);
    }
}
