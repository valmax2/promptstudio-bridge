// ─── AdMob ──────────────────────────────────────────────────────────────────
// Le pubblicità si attivano SOLO nell'app nativa (Android via Capacitor).
// Sul web / PWA tutte le funzioni non fanno nulla → nessun impatto.
//
// PRIMA DELLA PUBBLICAZIONE: sostituisci gli ID di TEST con i tuoi ID AdMob reali
// e metti TESTING = false. Vedi PLAY_ADMOB.md.

const AD_IDS = {
  // ID di TEST ufficiali di Google (mostrano annunci finti, sicuri in sviluppo)
  interstitial: 'ca-app-pub-3940256099942544/1033173712',
  rewarded:     'ca-app-pub-3940256099942544/5224354917',
};
const TESTING = true;               // ⚠️ metti false con gli ID reali in produzione
const EXPORTS_PER_AD = 3;           // interstitial ogni N esportazioni

function admob() {
  const C = (typeof window !== 'undefined') ? window.Capacitor : null;
  if (!C || typeof C.isNativePlatform !== 'function' || !C.isNativePlatform()) return null;
  return (C.Plugins && C.Plugins.AdMob) ? C.Plugins.AdMob : null;
}

export function isPro() { try { return localStorage.getItem('pr3d-pro') === '1'; } catch (e) { return false; } }
export function setPro(v) { try { localStorage.setItem('pr3d-pro', v ? '1' : '0'); } catch (e) {} }

let ready = false;
export async function initAds() {
  const A = admob();
  if (!A || isPro()) return;
  try {
    await A.initialize({ initializeForTesting: TESTING });
    // Consenso GDPR/UMP (se la versione del plugin lo espone)
    if (typeof A.requestConsentInfo === 'function') {
      try {
        const info = await A.requestConsentInfo();
        if (info && info.isConsentFormAvailable && typeof A.showConsentForm === 'function') {
          await A.showConsentForm();
        }
      } catch (e) { /* prosegui senza consenso esplicito */ }
    }
    ready = true;
  } catch (e) { /* se AdMob non parte, l'app funziona comunque senza ads */ }
}

let exportCount = 0;
export async function adAfterExport() {
  const A = admob();
  if (!A || !ready || isPro()) return;
  exportCount++;
  if (exportCount % EXPORTS_PER_AD !== 0) return;
  try {
    await A.prepareInterstitial({ adId: AD_IDS.interstitial, isTesting: TESTING });
    await A.showInterstitial();
  } catch (e) { /* ignora */ }
}

// Mostra un video premiato; risolve true se l'utente ha guadagnato la ricompensa.
// Su web o versione Pro ritorna true (nessun ostacolo).
export async function showRewarded() {
  const A = admob();
  if (!A || isPro()) return true;
  try {
    let earned = false;
    const handle = await A.addListener('onRewardedVideoAdReward', () => { earned = true; });
    await A.prepareRewardVideoAd({ adId: AD_IDS.rewarded, isTesting: TESTING });
    await A.showRewardVideoAd();
    if (handle && typeof handle.remove === 'function') handle.remove();
    return earned;
  } catch (e) { return false; }
}
