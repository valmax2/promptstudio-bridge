package com.padelapp.app;

import android.os.Bundle;
import android.view.InputDevice;
import android.view.KeyEvent;
import com.getcapacitor.BridgeActivity;
import org.json.JSONObject;

// Custom MainActivity: forwards a fixed set of hardware keycodes (volume,
// camera, media, headset, dpad) to the web layer as a "padel-hw-key" custom
// event, instead of letting Android handle them as normal (volume change,
// camera shutter, etc). This is how cheap Bluetooth "selfie remotes" and
// smartwatch camera-shutter modes are made usable as a padel scoreboard
// remote: they pair as a standard Bluetooth HID keyboard and simply send one
// of these keycodes, no custom BLE protocol involved.
//
// Each event also carries the source InputDevice's descriptor - a stable
// identifier tied to the physical device (unlike getDeviceId(), which is a
// session-scoped int that can change across reconnects) - so the web layer
// can tell two different paired remotes apart and bind each one separately.
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

    // Deliberately excludes BACK/HOME/VOLUME_MUTE-as-power and anything else
    // that could trap the user if a remote (or a stray system key event)
    // sent it while this is active - every key here is safe to fully
    // swallow without breaking normal phone use.
    private boolean isRemoteKey(int keyCode) {
        switch (keyCode) {
            case KeyEvent.KEYCODE_VOLUME_UP:
            case KeyEvent.KEYCODE_VOLUME_DOWN:
            case KeyEvent.KEYCODE_VOLUME_MUTE:
            case KeyEvent.KEYCODE_CAMERA:
            case KeyEvent.KEYCODE_FOCUS:
            case KeyEvent.KEYCODE_MEDIA_PLAY_PAUSE:
            case KeyEvent.KEYCODE_MEDIA_PLAY:
            case KeyEvent.KEYCODE_MEDIA_PAUSE:
            case KeyEvent.KEYCODE_MEDIA_STOP:
            case KeyEvent.KEYCODE_MEDIA_RECORD:
            case KeyEvent.KEYCODE_MEDIA_NEXT:
            case KeyEvent.KEYCODE_MEDIA_PREVIOUS:
            case KeyEvent.KEYCODE_HEADSETHOOK:
            case KeyEvent.KEYCODE_DPAD_LEFT:
            case KeyEvent.KEYCODE_DPAD_RIGHT:
            case KeyEvent.KEYCODE_DPAD_UP:
            case KeyEvent.KEYCODE_DPAD_DOWN:
            case KeyEvent.KEYCODE_DPAD_CENTER:
            case KeyEvent.KEYCODE_ENTER:
            case KeyEvent.KEYCODE_SPACE:
            case KeyEvent.KEYCODE_PAGE_UP:
            case KeyEvent.KEYCODE_PAGE_DOWN:
            case KeyEvent.KEYCODE_ZOOM_IN:
            case KeyEvent.KEYCODE_ZOOM_OUT:
            case KeyEvent.KEYCODE_BUTTON_A:
            case KeyEvent.KEYCODE_BUTTON_B:
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
                final int deviceId = event.getDeviceId();
                InputDevice device = event.getDevice();
                final String descriptor = device != null ? device.getDescriptor() : ("id-" + deviceId);
                final String name = device != null ? device.getName() : "Telecomando";
                runOnUiThread(() -> {
                    if (getBridge() != null && getBridge().getWebView() != null) {
                        JSONObject detail = new JSONObject();
                        try {
                            detail.put("keyCode", keyCode);
                            detail.put("deviceDescriptor", descriptor);
                            detail.put("deviceName", name);
                        } catch (Exception ignored) {}
                        String js = "window.dispatchEvent(new CustomEvent('padel-hw-key', { detail: " + detail.toString() + " }));";
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
