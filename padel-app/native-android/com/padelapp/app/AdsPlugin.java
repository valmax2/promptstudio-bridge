package com.padelapp.app;

import android.view.Gravity;
import android.view.ViewGroup;
import android.widget.FrameLayout;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.google.android.gms.ads.AdRequest;
import com.google.android.gms.ads.AdSize;
import com.google.android.gms.ads.AdView;
import com.google.android.gms.ads.MobileAds;

// Banner AdMob nativo, sovrapposto in basso alla WebView solo quando la web
// layer lo richiede esplicitamente (schermate non di gioco: home,
// impostazioni, fine partita - mai durante il punteggio dal vivo).
@CapacitorPlugin(name = "Ads")
public class AdsPlugin extends Plugin {

    private AdView adView;
    private boolean initialized = false;

    @PluginMethod
    public void initialize(PluginCall call) {
        if (!initialized) {
            initialized = true;
            MobileAds.initialize(getContext(), status -> {});
        }
        call.resolve();
    }

    @PluginMethod
    public void showBanner(PluginCall call) {
        String adUnitId = call.getString("adUnitId");
        if (adUnitId == null) {
            call.reject("adUnitId mancante");
            return;
        }
        getActivity().runOnUiThread(() -> {
            if (adView == null) {
                adView = new AdView(getContext());
                adView.setAdUnitId(adUnitId);
                adView.setAdSize(AdSize.BANNER);
                FrameLayout.LayoutParams params = new FrameLayout.LayoutParams(
                    ViewGroup.LayoutParams.WRAP_CONTENT,
                    ViewGroup.LayoutParams.WRAP_CONTENT
                );
                params.gravity = Gravity.BOTTOM | Gravity.CENTER_HORIZONTAL;
                ((ViewGroup) getActivity().findViewById(android.R.id.content)).addView(adView, params);
                adView.loadAd(new AdRequest.Builder().build());
            }
            adView.setVisibility(android.view.View.VISIBLE);
        });
        call.resolve();
    }

    @PluginMethod
    public void hideBanner(PluginCall call) {
        getActivity().runOnUiThread(() -> {
            if (adView != null) {
                adView.setVisibility(android.view.View.GONE);
            }
        });
        call.resolve();
    }
}
