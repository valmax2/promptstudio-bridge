// ─── Acquisti in-app (Pro) via RevenueCat ─────────────────────────────────
// Attivo SOLO nell'app nativa. Sul web le funzioni ritornano stati "non
// disponibile" senza bloccare nulla. Vedi PLAY_IAP.md per l'attivazione.

const REVENUECAT_API_KEY = ''; // ⚠️ da compilare (Public SDK Key Android, vedi PLAY_IAP.md)
const ENTITLEMENT = 'pro';

function purchases() {
  const C = (typeof window !== 'undefined') ? window.Capacitor : null;
  if (!C || typeof C.isNativePlatform !== 'function' || !C.isNativePlatform()) return null;
  return (C.Plugins && C.Plugins.Purchases) ? C.Plugins.Purchases : null;
}

async function initBilling() {
  const P = purchases();
  if (!P || !REVENUECAT_API_KEY) return;
  try {
    await P.configure({ apiKey: REVENUECAT_API_KEY });
    const info = await P.getCustomerInfo();
    if (info && info.customerInfo && info.customerInfo.entitlements &&
        info.customerInfo.entitlements.active && info.customerInfo.entitlements.active[ENTITLEMENT]) {
      window.SudokuAds && window.SudokuAds.setPro(true);
    }
  } catch (e) { /* nessun blocco se il billing non è configurato */ }
}

// Avvia l'acquisto "Pro". Risolve true se l'acquisto va a buon fine.
async function buyPro() {
  const P = purchases();
  if (!P) return false;
  try {
    const offerings = await P.getOfferings();
    const pkg = offerings && offerings.current && offerings.current.availablePackages
      && offerings.current.availablePackages[0];
    if (!pkg) return false;
    const result = await P.purchasePackage({ aPackage: pkg });
    const active = result && result.customerInfo && result.customerInfo.entitlements
      && result.customerInfo.entitlements.active;
    if (active && active[ENTITLEMENT]) {
      window.SudokuAds && window.SudokuAds.setPro(true);
      return true;
    }
    return false;
  } catch (e) { return false; }
}

async function restorePurchases() {
  const P = purchases();
  if (!P) return false;
  try {
    const result = await P.restorePurchases();
    const active = result && result.customerInfo && result.customerInfo.entitlements
      && result.customerInfo.entitlements.active;
    const restored = !!(active && active[ENTITLEMENT]);
    if (restored) window.SudokuAds && window.SudokuAds.setPro(true);
    return restored;
  } catch (e) { return false; }
}

function billingAvailable() { return !!purchases() && !!REVENUECAT_API_KEY; }

window.SudokuBilling = { initBilling, buyPro, restorePurchases, billingAvailable };
