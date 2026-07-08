# Pubblicità (AdMob)

L'integrazione è **già nel codice** (`ads.js`) ma parte con gli **ID di TEST** di Google e
si attiva **solo nell'app nativa**. Sul web/PWA non succede nulla.

## Cosa fa già
- **Rewarded** (video premiato): oltre i **3 hint gratuiti al giorno**, guardando un video
  se ne sblocca uno in più (`showRewarded()`, agganciato al pulsante Hint in `app.js`).
- **Interstitial** (schermo intero) ogni **3 nuove partite** iniziate (`adAfterNewGame()`).
- Rispetta un flag **Pro**: se `vsudoku-pro` è attivo, niente pubblicità.

## Passi per attivarla davvero (sul PC)
1. Crea un account **AdMob** → registra l'app Android → ottieni:
   - **App ID** (tipo `ca-app-pub-XXXX~YYYY`)
   - **Ad unit** Interstitial e Rewarded (`ca-app-pub-XXXX/ZZZZ`)
2. Installa il plugin nel progetto Capacitor:
   ```bash
   cd sudoku
   npm install @capacitor-community/admob
   npx cap sync android
   ```
3. Metti l'**App ID** nel `AndroidManifest.xml` (`android/app/src/main/AndroidManifest.xml`),
   dentro `<application>`:
   ```xml
   <meta-data
     android:name="com.google.android.gms.ads.APPLICATION_ID"
     android:value="ca-app-pub-XXXXXXXX~YYYYYYYY"/>
   ```
4. In **`ads.js`**: sostituisci i due `AD_IDS` con i tuoi ad unit reali e imposta `TESTING = false`.
5. Ricompila l'AAB (`bash build-aab.sh`).

> ⚠️ Non pubblicare con gli ID di test, e non cliccare i tuoi annunci reali (Google banna).
> In UE il **consenso (UMP)** è obbligatorio: `ads.js` prova già a mostrarlo se il plugin lo
> supporta; in Play Console dichiara l'uso di annunci e aggiorna la **privacy policy**
> (già predisposta in `privacy.html`).

## Perché rewarded + interstitial leggero (e non i banner)
Per un gioco a sessioni brevi come il Sudoku, un banner fisso è quello che rende meno e
disturba di più la griglia. Il mix scelto:
- il **rewarded sull'hint** è percepito come un vantaggio ("guardo un video e continuo"),
  non un ostacolo — e converte bene perché l'utente lo sceglie attivamente;
- l'**interstitial ogni 3 partite** cade in una pausa naturale (tra una partita e l'altra),
  senza interrompere mentre si gioca;
- l'**acquisto Pro** (vedi `PLAY_IAP.md`) è di solito la voce che rende di più su un pubblico
  fedele — chi gioca spesso preferisce pagare una volta piuttosto che vedere pubblicità.
