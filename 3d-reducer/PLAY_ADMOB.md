# Pubblicità (AdMob) + versione Pro

L'integrazione è **già nel codice** (`ads.js`) ma parte con gli **ID di TEST** di Google e
si attiva **solo nell'app nativa**. Sul web/PWA non succede nulla.

## Cosa fa già
- **Interstitial** (schermo intero) ogni **3 esportazioni** (`adAfterExport()`).
- **Rewarded** (video premiato) pronto tramite `showRewarded()` — da agganciare a una
  funzione premium quando vuoi (es. "esporta in altissima qualità").
- Rispetta un flag **Pro**: se `pr3d-pro` è attivo, niente pubblicità.

## Passi per attivarla davvero (sul PC)
1. Crea un account **AdMob** → registra l'app Android → ottieni:
   - **App ID** (tipo `ca-app-pub-XXXX~YYYY`)
   - **Ad unit** Interstitial e Rewarded (`ca-app-pub-XXXX/ZZZZ`)
2. Installa il plugin nel progetto Capacitor:
   ```bash
   cd 3d-reducer
   npm install @capacitor-community/admob
   npx cap sync android
   ```
3. Metti l'**App ID** nel `AndroidManifest.xml` (Capacitor: `android/app/src/main/AndroidManifest.xml`), dentro `<application>`:
   ```xml
   <meta-data
     android:name="com.google.android.gms.ads.APPLICATION_ID"
     android:value="ca-app-pub-XXXXXXXX~YYYYYYYY"/>
   ```
4. In **`ads.js`**: sostituisci i due `AD_IDS` con i tuoi ad unit reali e imposta `TESTING = false`.
5. Ricompila l'AAB (`bash build-aab.sh`).

> ⚠️ Non pubblicare con gli ID di test, e non cliccare i tuoi annunci reali (Google banna).
> In UE il **consenso (UMP)** è obbligatorio: `ads.js` prova già a mostrarlo se il plugin lo supporta;
> in Play Console dichiara l'uso di annunci e aggiorna la **privacy policy** (già predisposta).

## Versione "Pro" (rimuovi pubblicità) — passo successivo
Per vendere il "Pro" servono gli **acquisti in-app di Google Play** (non basta un flag locale,
altrimenti sarebbe aggirabile). Opzioni:
- **RevenueCat** (più semplice) — `@revenuecat/purchases-capacitor`
- oppure `@capacitor-community/in-app-purchases` (Play Billing diretto)

Flusso: crei il prodotto (es. `pro_no_ads`, non-consumabile) in Play Console → l'app avvia
l'acquisto → alla conferma chiami `setPro(true)` (in `ads.js`) → niente più pubblicità.
Quando vuoi lo integro io: dimmi se preferisci RevenueCat o Play Billing.

## Consiglio strategico (ripasso)
Per un'app-strumento rende di più il **Pro una tantum (~2–4 €)** + **rewarded** mirato,
che non i banner. Interstitial ogni 3 export è un buon equilibrio: presente ma non fastidioso.
