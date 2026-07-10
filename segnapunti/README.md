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
- **Community** (account, amici, eventi — vedi sezione dedicata sotto): profilo con
  avatar colorato, ricerca amici per username, richieste di amicizia, proposta di
  partite con conferma di disponibilità sì/no per ogni invitato.

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

## Community (amici, eventi) — setup gratuito, 5 minuti

La sezione "👥 Community" richiede un account gratuito su **Supabase** (nessuna carta di
credito, nessun abbonamento). Finché non lo configuri, l'app mostra solo un avviso e non
prova a connettersi a niente.

**1. Crea il progetto (una volta sola)**
1. Vai su [supabase.com](https://supabase.com) → "Start your project" → registrati gratis
2. "New project" → dai un nome (es. "segnapunti"), scegli una password del database
   (salvala da qualche parte, non serve nell'app ma è utile tenerla) → crea
3. Aspetta 1-2 minuti che il progetto sia pronto

**2. Crea le tabelle (amici, eventi, ecc.)**
1. Nel progetto Supabase, apri **SQL Editor** (menu a sinistra) → "New query"
2. Apri il file `segnapunti/supabase/migrations/0001_community.sql` di questo progetto,
   copia tutto il contenuto e incollalo nell'editor
3. Premi **Run**. Se va tutto bene non vedi errori (questa migration è già stata
   testata a fondo, incluse le regole di sicurezza, prima di essere inclusa qui)

**3. Collega l'app**
1. Nel progetto Supabase: **Project Settings → API**
2. Copia il **Project URL** e la chiave **anon public**
3. Apri `segnapunti/community-config.js` e incollali al posto dei due segnaposto
4. Ricarica l'app: la sezione Community ora mostra login/registrazione invece
   dell'avviso

**Nota su email di conferma**: per default Supabase invia un'email di conferma alla
registrazione. Per i test con gli amici va benissimo così; se vuoi saltarla, in
**Authentication → Providers → Email** disattiva "Confirm email".

**Sicurezza**: ogni tabella ha regole (Row Level Security) testate che garantiscono che
un utente veda/modifichi solo i propri dati, le proprie amicizie e gli eventi a cui è
invitato — mai i dati di sconosciuti. La chiave "anon" che incolli nell'app è pensata per
stare nel codice pubblico: da sola non basta per leggere dati altrui, è proprio la
sicurezza a livello di database a proteggerli.

**Fase 2 (non ancora inclusa)**: la chat vera e propria tra amici. La struttura attuale
(eventi + inviti con conferma sì/no) è pensata apposta per essere estesa con una tabella
`messages` senza dover ridisegnare nulla, quando vorrai aggiungerla.

## File

| File | Ruolo |
|------|-------|
| `index.html` | struttura (schermata setup + schermata partita) |
| `styles.css` | design system e stile mobile |
| `app.js` | logica: setup, motore punteggio tennis/padel, punti liberi, undo, persistenza |
| `manifest.webmanifest`, `sw.js`, `icon.svg` | installazione PWA / offline |
| `serve.js` | server locale per provarla sul telefono |
| `setup-android.sh` | crea il progetto Android (Capacitor) per generare l'APK |
| `community.js`, `community-config.js` | logica e configurazione Community (amici, eventi) |
| `vendor/supabase.js` | libreria client Supabase, inclusa (nessun CDN esterno) |
| `supabase/migrations/0001_community.sql` | tabelle + regole di sicurezza da eseguire su Supabase |
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
