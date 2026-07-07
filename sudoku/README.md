# Sudoku · VStudio Apps

App Sudoku 9x9 completa, sviluppata come web app (HTML/CSS/JS puro, nessuna
dipendenza esterna) e impacchettata per Android tramite **Capacitor**. Capacitor
usa lo stesso codice web anche per iOS (`npx cap add ios`), quindi il porting
futuro richiede solo l'aggiunta della piattaforma, senza riscrivere la logica.

## Perché questo stack

- **Nessuna build tool richiesta per sviluppare**: si apre `index.html` e si
  gioca. Ottimo per iterare velocemente e per debug su dispositivo via
  `chrome://inspect`.
- **Capacitor** è lo strato più sottile possibile per ottenere un APK/AAB
  reale (accesso nativo, icona, splash, store) mantenendo un'unica codebase
  HTML/CSS/JS condivisa Android/iOS.
- Nessuna libreria di terze parti: la logica del Sudoku, il rendering e i
  suoni sono scritti da zero, quindi zero problemi di licenze o dipendenze da
  aggiornare.

## Architettura dei file

```
sudoku/
├── index.html            Struttura dell'app: schermata iniziale, schermata
│                          di gioco, modali (impostazioni, conferma, vittoria)
├── styles.css             Tutto lo stile, tema chiaro/scuro via CSS variables
│                          (attributo data-theme sull'elemento <html>)
├── sudoku-engine.js        Motore di gioco puro (nessun DOM):
│                            - generateSolved()      genera una soluzione 9x9 valida
│                            - generatePuzzle(diff)   rimuove celle mantenendo
│                                                     soluzione unica, per livello
│                                                     di difficoltà (facile/medio/difficile)
│                            - getConflictCells(...)  validazione in tempo reale
│                                                     (riga / colonna / riquadro 3x3)
│                            - isBoardComplete(...)   rilevamento vittoria
├── app.js                  Controller UI: rendering griglia, tastierino,
│                          selezione/evidenziazione, timer, salvataggio
│                          automatico (localStorage), suoni (WebAudio),
│                          toggle tema scuro/suoni, pausa in background
├── manifest.webmanifest    Manifest PWA (nome, icona, colori)
├── sw.js                   Service worker: cache dell'app shell → funziona offline
├── icon.svg                Icona dell'app
├── capacitor.config.json   Configurazione Capacitor (appId, appName, colori)
├── serve.js                Server statico locale per testare su rete Wi-Fi
├── setup-android.sh        Setup una tantum del progetto Android (Capacitor)
└── build-apk.sh            Genera un APK di debug pronto da installare
```

## Logica di gioco

- **Griglia 9x9**: rappresentata come matrice `number[9][9]` (`0` = cella
  vuota). Ogni partita mantiene tre matrici parallele: `puzzle` (schema
  iniziale), `given` (quali celle sono bloccate perché parte dello schema) e
  `values` (stato corrente, modificabile dal giocatore).
- **Validazione in tempo reale**: ad ogni inserimento, `getConflictCells`
  controlla riga, colonna e riquadro 3x3; le celle in conflitto vengono
  evidenziate in rosso immediatamente, senza attendere il completamento dello
  schema.
- **Generatore per difficoltà**: si parte da una soluzione completa generata
  con backtracking randomizzato, poi si rimuovono celle una alla volta
  verificando ad ogni passo — tramite un secondo backtracking che conta le
  soluzioni fino a un massimo di 2 — che lo schema mantenga **soluzione
  unica**. Si continua finché non si raggiunge il numero di indizi target
  della difficoltà scelta (Facile ≈ 40 indizi, Medio ≈ 32, Difficile ≈ 26).

## Funzionalità

- Tastierino numerico con contatore delle cifre rimanenti (si disattiva
  quando una cifra è già stata usata 9 volte).
- Evidenziazione di riga/colonna/riquadro della cella selezionata e di tutte
  le celle con lo stesso valore, per una scannabilità visiva immediata.
- Timer di partita, con pausa automatica quando l'app va in background
  (`visibilitychange`) e overlay "Riprendi".
- Salvataggio automatico su `localStorage` ad ogni mossa, ad ogni pausa e
  alla chiusura dell'app: alla riapertura viene proposto "Continua partita".
- Interruttore Modalità Scura (persistito, con rilevamento del tema di
  sistema al primo avvio) e interruttore Suoni/effetti (toni generati via
  WebAudio, nessun file audio da scaricare).
- Schermata di vittoria con tempo impiegato e riavvio rapido.

## Come provare l'app senza compilare nulla

```bash
node sudoku/serve.js
```

Apri l'indirizzo mostrato nel terminale dal browser del telefono (stessa
rete Wi-Fi) oppure `http://localhost:8081` sul PC.

## Come generare l'APK Android

Prerequisiti sul PC: Node.js ≥ 18, JDK 17, Android SDK (`ANDROID_HOME`
impostata — bastano le "Command line tools").

```bash
cd sudoku
bash build-apk.sh
```

Al termine, l'APK di debug si trova in:

```
sudoku/.capacitor-build/android/app/build/outputs/apk/debug/app-debug.apk
```

Copialo sul telefono e installalo (abilita "Installa da origini sconosciute").

In alternativa, per un setup persistente (utile se vuoi poi aprire il
progetto in Android Studio, personalizzare icona/splash o preparare un AAB
per il Play Store), usa `bash setup-android.sh`: crea una cartella
`android/` versionabile dentro `sudoku/` invece che in una cartella
temporanea.

## Porting a iOS

Il codice web è identico per entrambe le piattaforme. Su un Mac con Xcode
installato, dentro il progetto Capacitor generato:

```bash
npx cap add ios
npx cap sync ios
npx cap open ios
```
