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
  banner:       'ca-app-pub-3940256099942544/6300978111', // banner fisso durante la partita
  // ⚠️ In produzione: crea un SECONDO ad unit "Banner" in AdMob (diverso da
  // quello sopra) e mettilo qui, per avere due slot pubblicitari distinti
  // invece di mostrare due volte lo stesso annuncio. In test va bene uguale.
  bannerQuiz:   'ca-app-pub-3940256099942544/6300978111', // banner sulla finestra del quiz
};
const TESTING = true;         // ⚠️ metti false con gli ID reali in produzione
const GAMES_PER_AD = 3;       // interstitial ogni N nuove partite iniziate

function admob() {
  const C = (typeof window !== 'undefined') ? window.Capacitor : null;
  if (!C || typeof C.isNativePlatform !== 'function' || !C.isNativePlatform()) return null;
  return (C.Plugins && C.Plugins.AdMob) ? C.Plugins.AdMob : null;
}

function isPro() { try { return localStorage.getItem('vsudoku-pro') === '1'; } catch (e) { return false; } }
function setPro(v) { try { localStorage.setItem('vsudoku-pro', v ? '1' : '0'); } catch (e) {} }

// Riserva, nell'interfaccia HTML, lo spazio occupato dal banner nativo AdMob
// (disegnato SOPRA la webview e non dentro): senza questo i pulsanti in fondo
// allo schermo restano coperti. Vedi --ad-banner-height in styles.css.
function setBannerHeight(px) {
  try { document.documentElement.style.setProperty('--ad-banner-height', `${px}px`); } catch (e) {}
}

let ready = false;
async function initAds() {
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
    // Altezza esatta del banner (varia in base alla larghezza dello schermo, essendo
    // "ADAPTIVE_BANNER"): la applichiamo non appena il plugin la comunica.
    try {
      await A.addListener('bannerAdSizeChanged', (size) => {
        if (size && typeof size.height === 'number') setBannerHeight(size.height);
      });
    } catch (e) {}
    ready = true;
  } catch (e) { /* se AdMob non parte, l'app funziona comunque senza ads */ }
}

// True se le ads sono davvero attive (nativo + inizializzate + non Pro), senza
// contare/consumare il ciclo di dueForPeriodicAd() — usato per il trigger "ogni
// vittoria", che non ha un contatore modulo.
function adsActive() {
  const A = admob();
  return !!(A && ready && !isPro());
}

// Ogni GAMES_PER_AD nuove partite è "il momento buono" per un interstitial —
// ma prima si propone il mini-gioco colori (vedi app.js): true = tocca provare
// il quiz ora (poi chi chiama decide se mostrare il video o solo il banner).
let gameCount = 0;
function dueForPeriodicAd() {
  if (!adsActive()) return false;
  gameCount++;
  return gameCount % GAMES_PER_AD === 0;
}

async function showInterstitial() {
  const A = admob();
  if (!A || isPro()) return;
  try {
    await A.prepareInterstitial({ adId: AD_IDS.interstitial, isTesting: TESTING });
    await A.showInterstitial();
  } catch (e) { /* ignora */ }
}

// Mostra un video premiato; risolve true se l'utente ha guadagnato la ricompensa
// (usato per sbloccare un suggerimento extra). Su web o versione Pro ritorna
// sempre true (nessun ostacolo).
async function showRewarded() {
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

// Banner: "main" è quello fisso durante la partita, "quiz" è quello agganciato
// alla finestra del mini-gioco colori (vedi app.js) — due slot pubblicitari
// distinti (AD_IDS.banner / AD_IDS.bannerQuiz), non lo stesso annuncio due volte.
async function showBanner(variant) {
  const A = admob();
  if (!A || isPro()) return;
  try {
    // Stima ragionevole finché non arriva l'evento "bannerAdSizeChanged" con
    // l'altezza esatta (un banner adattivo standard è alto circa 50-60px).
    setBannerHeight(56);
    const adId = variant === 'quiz' ? AD_IDS.bannerQuiz : AD_IDS.banner;
    await A.showBanner({ adId, adSize: 'ADAPTIVE_BANNER', position: 'BOTTOM_CENTER', isTesting: TESTING });
  } catch (e) { /* ignora */ }
}
async function hideBanner() {
  const A = admob();
  if (!A) return;
  setBannerHeight(0);
  try { await A.hideBanner(); } catch (e) { /* ignora */ }
}

window.SudokuAds = { initAds, adsActive, dueForPeriodicAd, showInterstitial, showRewarded, showBanner, hideBanner, isPro, setPro };
