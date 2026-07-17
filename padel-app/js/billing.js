import { PRO_PRODUCT_ID } from './monetization-config.js';
import { setState, getState } from './store.js';

const Billing = window.Capacitor?.Plugins?.Billing;

export function billingSupported() {
  return !!Billing;
}

// Fonte di verità: interroga sempre Play (mai un valore locale non
// riverificato) - va chiamata ad ogni avvio dell'app, prima di mostrare
// qualunque contenuto sbloccato da Pro.
export async function verifyProOnLaunch() {
  if (!Billing) return;
  try {
    const { pro } = await Billing.isProPurchased({ productId: PRO_PRODUCT_ID });
    setState({ pro: !!pro });
  } catch {
    // Nessuna connessione al Play Store: non tocca lo stato Pro esistente,
    // ma non lo forza mai a true senza una verifica riuscita.
  }
}

export async function queryProProduct() {
  if (!Billing) return null;
  try {
    return await Billing.queryProduct({ productId: PRO_PRODUCT_ID });
  } catch {
    return null;
  }
}

export async function purchasePro() {
  if (!Billing) return false;
  try {
    await Billing.purchase({ productId: PRO_PRODUCT_ID });
    Billing.addListener('purchaseUpdate', () => verifyProOnLaunch());
    return true;
  } catch {
    return false;
  }
}

export function isPro() {
  const state = getState();
  return !!(state.pro || state.profile.proGranted);
}
