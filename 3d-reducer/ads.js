// ─── AdMob ──────────────────────────────────────────────────────────────────
// Le pubblicità si attivano SOLO nell'app nativa (Android via Capacitor).
// Sul web / PWA tutte le funzioni non fanno nulla → nessun impatto.
//
// App AdMob: com.polyreducer.app → ca-app-pub-2590590501208291~8345014556
// PRIMA DELLA PUBBLICAZIONE REALE: metti TESTING = false (dopo aver verificato
// che tutto funzioni sul telefono con gli ID reali sotto). Vedi PLAY_ADMOB.md.

const AD_IDS = {
  // ID reali di Poly Reducer 3D (Google AdMob)
  interstitial: 'ca-app-pub-2590590501208291/1643874838',
  rewarded:     'ca-app-pub-2590590501208291/6525646366',
};
const TESTING = true;               // ⚠️ metti false SOLO dopo aver verificato che funziona sul telefono
// Strategia scelta: interstitial al massimo 1 volta per sessione (non ad ogni export)
// per non infastidire chi elabora più file di fila — l'app è uno strumento veloce,
// non un gioco. Il rewarded (volontario) e il Pro restano le leve principali.

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

let interstitialShownThisSession = false;
export async function adAfterExport() {
  const A = admob();
  if (!A || !ready || isPro() || interstitialShownThisSession) return;
  try {
    await A.prepareInterstitial({ adId: AD_IDS.interstitial, isTesting: TESTING });
    await A.showInterstitial();
    interstitialShownThisSession = true; // al massimo una volta finché l'app resta aperta
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
