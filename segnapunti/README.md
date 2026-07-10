# Segnapunti

App **mobile** per tenere il punteggio di partite di **padel, tennis** o giochi a **punti
liberi**. Funzionamento ispirato ai segnapunti sportivi professionali (setup squadre,
punteggio tennis con game/set/tiebreak, servizio, annulla punto), con grafica e UX
progettate da zero.

È una **PWA**: gira nel browser del telefono, si installa sulla home come un'app vera e
funziona **offline**. Si impacchetta in un vero **APK** con lo script incluso.

## Cosa fa

- **Setup partita**: nome squadra + giocatori (singolo o doppio), colore squadra a
  scelta tra 8 combinazioni curate (le due squadre non possono mai avere lo stesso colore)
- **Modalità Tennis/Padel**: punteggio 0‑15‑30‑40, vantaggio, game, set con **tiebreak
  automatico al 6‑6**, partita al meglio di 1, 3 o 5 set
- **Modalità Punti liberi**: contatore punti semplice, per giochi non tennistici
- **Servizio**: indica automaticamente chi serve (alterna tra i giocatori in doppio) e il
  lato (DX/SX)
- **Annulla punto**: undo completo dell'ultima azione (stack di cronologia)
- **Ricomincia / Rivincita / Nuova partita**: dal menu impostazioni o dalla schermata di
  vittoria
- **Ripresa automatica**: se chiudi l'app a metà partita, la ritrovi come l'hai lasciata
  (salvataggio locale)
- Vibrazione leggera ad ogni punto (se supportata dal dispositivo)
- **Arbitro vocale**: annuncia il punteggio a voce ("15 pari", "Vantaggio...", "Game, set e
  partita..."). Esce dall'altoparlante che il telefono/tablet sta usando in quel momento —
  se hai già accoppiato delle **casse Bluetooth dalle impostazioni di sistema**, la voce
  esce da lì in automatico, come qualsiasi altro audio. Si disattiva con l'icona 🔊 in alto.
- **Layout adattivo**: ottimizzata anche per **tablet** e per l'**orientamento orizzontale**
  (schermata di gioco e setup si riorganizzano automaticamente)
- **Tema Scuro / Chiaro / Sistema**: palette dedicata per ciascun tema (non un semplice
  invertitore di colori), selezionabile dal setup o dal menu impostazioni in partita;
  in modalità "Sistema" segue il tema del telefono e si aggiorna anche a runtime
- **Pulsanti fisici Bluetooth** (schermata dedicata, raggiungibile dal setup o dal menu
  impostazioni in partita):
  - **Telecomando** (selfie remote, pulsante smartwatch): accoppialo dalle impostazioni
    Bluetooth del telefono, poi in app premi "Registra tasto" e premi il pulsante fisico —
    da quel momento segna punti per la squadra scelta. Funziona con la quasi totalità di
    questi dispositivi economici.
  - **Portachiavi Bluetooth con GPS**: collegamento diretto per i modelli generici più
    comuni; per i modelli non riconosciuti automaticamente c'è un campo UUID manuale
    (vedi nota sotto).

## Provala subito sul telefono (modo più veloce)

Dal PC, nella cartella del progetto:

```bash
node segnapunti/serve.js
```

Il terminale stampa un indirizzo tipo `http://192.168.1.20:8081`.
Apri **quell'indirizzo** dal browser del telefono (stessa rete Wi‑Fi) →
menu di Chrome → **"Aggiungi a schermata Home"**. Ora è un'app installata.

## Crea un APK vero (opzionale)

Sul PC con **Node 18+**, **JDK 17** e **Android SDK** installati:

```bash
cd segnapunti
bash setup-android.sh
cd android && ./gradlew assembleDebug
```

Genera `android/app/build/outputs/apk/debug/app-debug.apk`. Copialo sul telefono e
installalo (abilita "installa da origini sconosciute").

## iOS (App Store) — richiede un Mac

Lo stesso codice funziona anche su iOS tramite Capacitor, **ma compilarlo richiede
obbligatoriamente un Mac con Xcode** — è una regola di Apple, non aggirabile da nessun
tool (Windows/Linux non bastano, nemmeno in questa app). Quando avrai accesso a un Mac
(fisico o in cloud, es. Codemagic/GitHub Actions con runner macOS):

```bash
cd segnapunti
bash setup-ios.sh
npx cap open ios   # apre Xcode: scegli simulatore o iPhone e premi ▶
```

Per pubblicarla su App Store serve anche un account Apple Developer (99$/anno).

**Differenze reali su iOS** (limiti della piattaforma, non di questa app):
- ❌ **Portachiavi Bluetooth GPS**: Apple non implementa il Web Bluetooth su
  Safari/iPhone. Il pulsante "Cerca e collega" mostrerà semplicemente "non disponibile" —
  nessun crash, ma quella funzione lì non c'è. Per averla serve un lavoro nativo aggiuntivo
  (plugin `@capacitor-community/bluetooth-le`, richiede anch'esso Xcode/Mac).
- ✅ **Telecomando Bluetooth (HID)**: funziona normalmente, perché usa la tastiera di
  sistema e non il Web Bluetooth.
- ❌ **Vibrazione**: iOS non supporta la Vibration API dei siti web; l'app se ne accorge
  da sola e semplicemente non vibra (nessun errore).
- ✅ **Arbitro vocale, tema, tutto il resto**: identico ad Android.

## File

| File | Ruolo |
|------|-------|
| `index.html` | struttura (schermata setup + schermata partita) |
| `styles.css` | design system e stile mobile |
| `app.js` | logica: setup, motore punteggio tennis/padel, punti liberi, undo, persistenza |
| `manifest.webmanifest`, `sw.js`, `icon.svg` | installazione PWA / offline |
| `serve.js` | server locale per provarla sul telefono |
| `setup-android.sh` | crea il progetto Android (Capacitor) per generare l'APK |
| `setup-ios.sh` | crea il progetto iOS (Capacitor) per Xcode — richiede un Mac |

## Monetizzazione (predisposizione, non ancora attiva)

Nessun network pubblicitario è collegato: nessun account creato, nessun SDK caricato,
nessun dato inviato a terzi. È stato riservato solo lo **spazio nel layout** per un
banner (`#bannerSlot` in fondo alla schermata di setup, sotto i pulsanti — mai sulla
schermata di gioco, per non rischiare tap sbagliati durante il punteggio), tenuto
nascosto finché non si decide il network da usare. Quando deciderai tra banner,
abbonamento o altro, si attiva riempiendo quello slot (es. con AdMob, seguendo lo
schema già usato in `3d-reducer/ads.js` in questo stesso repository) senza dover
ritoccare il resto del layout.

## Note

- **Login/account non incluso**: nessun accesso richiesto, per scelta (vedi decisione
  presa insieme). Si può aggiungere in un secondo momento se serve sincronizzare le
  partite online.
- Il tiebreak semplifica la rotazione del servizio (l'alternanza server/lato durante il
  tiebreak segue la logica standard di inizio/fine game, non il cambio ogni 2 punti).
- **Portachiavi Bluetooth GPS — limite tecnico reale**: i tracker dei grandi marchi
  (Apple **Find My**, Samsung **SmartTag**, tracker sulla rete **Find My Device** di
  Google) **bloccano di proposito** l'accesso al pulsante da parte di app esterne, per
  motivi di sicurezza anti-stalking. Non è un limite di questa app: nessuna app di terzi
  può leggerli. Funzionano invece i tracker **generici/economici** non legati a un
  ecosistema esclusivo (l'app prova prima il "Nordic UART Service", molto comune in
  questi dispositivi). Se il tuo modello non si collega automaticamente, scarica
  l'app gratuita **nRF Connect** (Google Play), apri il dispositivo, annota il "Service
  UUID" e il "Characteristic UUID" del canale che si aggiorna quando premi il pulsante,
  e incollali nei campi "Avanzate" della schermata Bluetooth dell'app.
- **Test reale col telefono**: la connessione Bluetooth va provata sul dispositivo vero
  (qui in sviluppo cloud non c'è un adattatore Bluetooth). Per l'APK compilato con
  Capacitor potrebbe servire aggiungere il plugin nativo `@capacitor-community/bluetooth-le`
  se il Web Bluetooth della WebView di sistema risultasse instabile — lo verifichiamo
  insieme quando fai il primo test reale sul tuo PC/telefono.
