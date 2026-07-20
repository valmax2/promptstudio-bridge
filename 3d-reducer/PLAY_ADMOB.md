# Pubblicità (AdMob) + versione Pro

L'integrazione è **già nel codice** (`ads.js`) con gli **ID reali** di Poly Reducer 3D,
ma per ora `TESTING = true` (mostra annunci finti sicuri finché non verifichiamo che
tutto funzioni sul telefono). Si attiva **solo nell'app nativa**: sul web/PWA non succede nulla.

## I tuoi ID AdMob (già inseriti in `ads.js`)
- **App ID:** `ca-app-pub-2590590501208291~8345014556`
- **Interstitial:** `ca-app-pub-2590590501208291/1643874838`
- **Rewarded:** `ca-app-pub-2590590501208291/6525646366`

## Cosa fa già
- **Interstitial** (schermo intero): al massimo **1 volta per sessione** (`adAfterExport()`).
- **Rewarded** (video premiato): sblocca il **"dettaglio massimo"** (riduzione oltre l'88%) tramite `showRewarded()`.
- Rispetta un flag **Pro**: se `pr3d-pro` è attivo, niente pubblicità.

## Passi per attivarla davvero (sul PC)
1. Installa il plugin nel progetto Capacitor:
   ```bash
   cd 3d-reducer
   npm install @capacitor-community/admob
   npx cap sync android
   ```
2. Metti l'**App ID** nel `AndroidManifest.xml` (`android/app/src/main/AndroidManifest.xml`), dentro `<application>`:
   ```xml
   <meta-data
     android:name="com.google.android.gms.ads.APPLICATION_ID"
     android:value="ca-app-pub-2590590501208291~8345014556"/>
   ```
3. Ricompila l'APK di debug e provalo sul telefono (`cd android && ./gradlew assembleDebug`) — con `TESTING = true` vedrai annunci di prova, sicuri da guardare/toccare.
4. Quando confermi che funziona: in **`ads.js`** metti `TESTING = false`.
5. Aumenta `versionCode` in `android/app/build.gradle` e ricompila l'AAB (`bash build-aab.sh`) per l'aggiornamento su Play Console.

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
