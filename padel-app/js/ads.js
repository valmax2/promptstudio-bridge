import { ADMOB_BANNER_UNIT_ID } from './monetization-config.js';

const Ads = window.Capacitor?.Plugins?.Ads;

export function adsSupported() {
  return !!Ads;
}

export async function initAds() {
  if (!Ads) return;
  try {
    await Ads.initialize();
    // Il banner è una view Android nativa sovrapposta alla WebView, non un
    // elemento della pagina: senza questo, coprirebbe la barra di
    // navigazione in basso (vedi styles.css .bottom-nav/.app).
    Ads.addListener('bannerSize', ({ heightDp }) => {
      document.documentElement.style.setProperty('--ad-banner-height', `${heightDp}px`);
    });
  } catch {}
}

export async function showBanner() {
  if (!Ads) return;
  try {
    await Ads.showBanner({ adUnitId: ADMOB_BANNER_UNIT_ID });
  } catch {}
}

export async function hideBanner() {
  if (!Ads) return;
  try {
    await Ads.hideBanner();
  } catch {}
}
