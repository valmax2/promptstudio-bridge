// ─── Acquisti in-app (versione Pro) ─────────────────────────────────────────
// Funziona SOLO nell'app nativa con RevenueCat (@revenuecat/purchases-capacitor).
// Sul web / PWA tutte le funzioni non fanno nulla. Vedi PLAY_IAP.md.
import { setPro } from './ads.js';

const REVENUECAT_API_KEY = '';   // ⚠️ inserisci la tua Public SDK Key (Android) di RevenueCat
const ENTITLEMENT = 'pro';       // nome dell'entitlement configurato su RevenueCat

function nativeCap() {
  const C = (typeof window !== 'undefined') ? window.Capacitor : null;
  return (C && typeof C.isNativePlatform === 'function' && C.isNativePlatform()) ? C : null;
}
function purchases() {
  const C = nativeCap();
  return (C && C.Plugins && C.Plugins.Purchases) ? C.Plugins.Purchases : null;
}
export function billingAvailable() { return !!purchases() && !!REVENUECAT_API_KEY; }

export async function initBilling() {
  const P = purchases();
  if (!P || !REVENUECAT_API_KEY) return;
  try {
    if (typeof P.configure === 'function') await P.configure({ apiKey: REVENUECAT_API_KEY });
    await refreshEntitlement();
  } catch (e) { /* ignora: l'app funziona comunque */ }
}

async function hasProEntitlement(info) {
  const active = info && (info.entitlements?.active || info.customerInfo?.entitlements?.active);
  return !!(active && active[ENTITLEMENT]);
}
async function refreshEntitlement() {
  const P = purchases(); if (!P) return;
  try { const info = await P.getCustomerInfo(); if (await hasProEntitlement(info.customerInfo || info)) setPro(true); }
  catch (e) {}
}

// Avvia l'acquisto della versione Pro. Ritorna { ok, reason }.
export async function buyPro() {
  const P = purchases();
  if (!P || !REVENUECAT_API_KEY) return { ok: false, reason: 'unavailable' };
  try {
    const offerings = await P.getOfferings();
    const pkg = offerings?.current?.availablePackages?.[0] || offerings?.offerings?.current?.availablePackages?.[0];
    if (!pkg) return { ok: false, reason: 'no-product' };
    const res = await P.purchasePackage({ aPackage: pkg });
    if (await hasProEntitlement(res.customerInfo || res)) { setPro(true); return { ok: true }; }
    return { ok: false, reason: 'not-entitled' };
  } catch (e) {
    return { ok: false, reason: (e && e.code === '1') ? 'cancelled' : 'error' };
  }
}

// Ripristina un acquisto già effettuato (cambio telefono, reinstallazione).
export async function restorePro() {
  const P = purchases();
  if (!P || !REVENUECAT_API_KEY) return { ok: false, reason: 'unavailable' };
  try {
    const res = await P.restorePurchases();
    if (await hasProEntitlement(res.customerInfo || res)) { setPro(true); return { ok: true }; }
    return { ok: false, reason: 'nothing' };
  } catch (e) { return { ok: false, reason: 'error' }; }
}
