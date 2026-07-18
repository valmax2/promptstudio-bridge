import { ADMOB_BANNER_UNIT_ID } from './monetization-config.js';

const Ads = window.Capacitor?.Plugins?.Ads;

// AdSize.BANNER (usata dal plugin nativo) è sempre alta 50dp: invece di
// affidarmi a un evento nativo asincrono per saperlo (arrivava troppo
// tardi, il banner copriva la barra di navigazione per un attimo o del
// tutto), riservo lo spazio in modo sincrono con showBanner/hideBanner -
// vedi styles.css ":root.ad-banner-visible".
const BANNER_HEIGHT_CLASS = 'ad-banner-visible';

export function adsSupported() {
  return !!Ads;
}

export async function initAds() {
  if (!Ads) return;
  try {
    await Ads.initialize();
  } catch {}
}

export async function showBanner() {
  if (!Ads) return;
  document.documentElement.classList.add(BANNER_HEIGHT_CLASS);
  try {
    await Ads.showBanner({ adUnitId: ADMOB_BANNER_UNIT_ID });
  } catch {}
}

export async function hideBanner() {
  if (!Ads) return;
  document.documentElement.classList.remove(BANNER_HEIGHT_CLASS);
  try {
    await Ads.hideBanner();
  } catch {}
}
