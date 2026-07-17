import { ADMOB_BANNER_UNIT_ID } from './monetization-config.js';

const Ads = window.Capacitor?.Plugins?.Ads;

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
