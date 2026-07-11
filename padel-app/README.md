# Padel App

App mobile per organizzare partite di padel: segnapunti remoto con annuncio
vocale, community con cerchie di amici, eventi con conferma presenza,
statistiche, gamification e sincronizzazione cloud.

## Stato delle funzionalità

| Modulo | Stato |
|---|---|
| Segnapunti (punteggio padel completo, punto d'oro, super tie-break, annuncio vocale TTS) | ✅ Funzionante, offline |
| Modalità Doppio / Singolo, con schermata di impostazione nuova partita | ✅ Funzionante, offline |
| Schermata segnapunti a schermo intero, cifre enormi, ottimizzata per tablet | ✅ Funzionante, offline — tocca l'intera metà colorata della squadra per assegnare il punto |
| Tema scuro/chiaro, font e dimensione testo | ✅ Funzionante, offline |
| Login con numero di telefono | ✅ Funzionante *(richiede Firebase configurato)* |
| Community: amici e cerchie chiuse | ✅ Funzionante *(richiede Firebase; modalità locale limitata senza login)* |
| Eventi con notifica push e conferma/rifiuto | ✅ Funzionante *(richiede Firebase + Cloud Functions deployate)* |
| Statistiche partite e trend | ✅ Funzionante, offline |
| Gamification (XP, avatar e cornici sbloccabili) | ✅ Funzionante, offline |
| Sincronizzazione cloud di impostazioni/avatar/statistiche | ✅ Funzionante *(richiede Firebase)* |
| Audio su cassa Bluetooth | ✅ L'annuncio vocale usa il motore di sintesi vocale **nativo** di Android (plugin Capacitor, non il Web Speech API del browser — che nella WebView di Android spesso non produce alcun suono). L'audio esce dall'uscita attiva del telefono, quindi anche da una cassa Bluetooth già collegata — nessuna configurazione nell'app |
| Telecomando Bluetooth / tasti fotocamera smartwatch | ✅ Funzionante per dispositivi che si accoppiano come tastiera Bluetooth (la maggior parte dei telecomandi economici e degli smartwatch in modalità scatto foto). Supporta **due o più telecomandi accoppiati contemporaneamente**, e per ogni tasto **click singolo / doppio / doppio lento** assegnabili ad azioni diverse (punto, annulla, azzera game, inizia partita, resetta partita). I portachiavi "trova oggetto" generici usano spesso un protocollo proprietario e potrebbero non essere supportati |
| Modalità Americano (rotazione compagni, classifica individuale) | ✅ Funzionante, offline |
| Modalità Killer / Eliminazione (a vite, in coda, "re del campo") | ✅ Funzionante, offline |

Senza configurare Firebase, l'app funziona comunque in **modalità locale**:
segnapunti, tema, statistiche e progressi restano salvati sul telefono.

## 1. Come ottenere subito un APK di test (senza installare nulla sul PC)

Il repository include un workflow GitHub Actions che compila l'APK nel
cloud:

1. Vai sulla pagina del repository su GitHub → tab **Actions**.
2. Seleziona il workflow **"Build Padel App APK (debug, per test)"**.
3. Clicca **"Run workflow"** (o aspetta: parte automaticamente ad ogni push
   su questo branch che tocca `padel-app/`).
4. A fine build (5-10 minuti), apri l'esecuzione completata e scarica
   l'allegato **`padel-app-debug-apk`**: contiene `app-debug.apk`.
5. Trasferisci l'APK sul telefono Android (es. link di download, Drive,
   email) e installalo: **Impostazioni → Sicurezza → consenti installazione
   da questa origine**, poi apri il file APK scaricato.

Questo APK di debug non è firmato per il Play Store: va bene solo per
testare sul tuo telefono.

## 2. Build locale (alternativa, se hai Android Studio)

Prerequisiti sul PC: Node.js ≥ 18, JDK 17/21, Android SDK (`ANDROID_HOME`
impostata).

```bash
cd padel-app
bash build-apk.sh
```

L'APK viene generato in
`padel-app/.capacitor-build/android/app/build/outputs/apk/debug/app-debug.apk`.

Per continuare a sviluppare l'app Android in Android Studio, usa invece
`bash setup-android.sh`: crea una cartella `android/` persistente che puoi
aprire direttamente in Android Studio.

## 3. Configurare Firebase (login, community, eventi, notifiche, cloud sync)

Tutte queste funzioni richiedono un progetto Firebase **gratuito** (piano
Spark, sufficiente per uso personale/gruppo di amici). Senza configurarlo
l'app resta comunque utilizzabile in modalità locale.

### 3.1 Crea il progetto

1. Vai su https://console.firebase.google.com → **Aggiungi progetto**.
2. Dai un nome (es. "Padel App") e completa la creazione.

### 3.2 Attiva i servizi necessari

Nel menu laterale della console Firebase:

- **Authentication** → Sign-in method → attiva **Telefono**.
- **Firestore Database** → Crea database (modalità produzione).
- **Storage** → Crea bucket (per gli avatar).
- **Cloud Messaging** → non serve un'azione esplicita, ma prendi nota della
  sezione "Web Push certificates" (ti serve la chiave VAPID, punto 3.4).

### 3.3 Registra un'app Web

1. Nella pagina principale del progetto, clicca l'icona **`</>`** ("Aggiungi
   app" → Web).
2. Dai un nickname (es. "Padel App Web") e registra l'app.
3. Copia l'oggetto `firebaseConfig` mostrato: ti servirà al punto 3.5.

### 3.4 Chiave VAPID per le notifiche push

Project Settings (icona ingranaggio) → **Cloud Messaging** → sezione
**Web Push certificates** → **Genera coppia di chiavi**. Copia la chiave
generata.

### 3.5 Incolla le chiavi nel progetto

Apri `padel-app/firebase-config.js` e sostituisci i valori segnaposto con
quelli copiati ai punti 3.3 e 3.4:

```js
export const firebaseConfig = {
  apiKey: "...",
  authDomain: "...",
  projectId: "...",
  storageBucket: "...",
  messagingSenderId: "...",
  appId: "...",
};
export const vapidKey = "...";
```

Ricompila/ricarica l'app (rilancia il workflow o `build-apk.sh`): il banner
"modalità locale" sparirà e potrai accedere con il numero di telefono.

### 3.6 Pubblica regole di sicurezza e Cloud Functions

Le regole Firestore/Storage (`firestore.rules`, `storage.rules`) e le
Cloud Functions per le notifiche push degli eventi (`functions/`) vanno
pubblicate una volta, dal tuo PC, con la [Firebase CLI](https://firebase.google.com/docs/cli):

```bash
npm install -g firebase-tools
cd padel-app
firebase login
firebase use --add        # scegli il progetto creato al punto 3.1
firebase deploy --only firestore:rules,storage:rules,functions
```

Senza questo passaggio l'app funziona ugualmente (login, dati locali), ma
gli inviti agli eventi non genereranno notifiche push e le regole di
sicurezza di default di Firestore potrebbero bloccare le letture/scritture:
assicurati di completare questo passaggio prima di usare Community/Eventi
con altre persone.

### Nota sul login via SMS in un APK Capacitor

Il login usa l'autenticazione telefonica web di Firebase (reCAPTCHA
invisibile + SMS). Funziona nella WebView Android, ma in alcuni telefoni /
versioni di Android System WebView il reCAPTCHA può richiedere una verifica
visibile la prima volta. Se riscontri problemi persistenti, la soluzione
più robusta è integrare il plugin nativo `@capacitor-firebase/authentication`
in una versione successiva: la struttura del codice (`js/firebase.js`,
`js/screens/login.js`) è già isolata per rendere questo passaggio semplice.

## Struttura del progetto

```
padel-app/
  index.html, styles.css        UI shell + tema dark/light
  js/app.js                     bootstrap, routing, tema
  js/scoring.js                 motore punteggio padel (regole di gioco)
  js/speech.js                  annuncio vocale (plugin TTS nativo)
  js/ble-remote.js              mappatura tasti hardware -> azioni segnapunti
  js/americano.js               motore rotazione compagni + classifica Americano
  js/killer.js                  motore coda/vite/eliminazione Killer
  js/store.js                   stato locale + persistenza (localStorage)
  js/firebase.js, js/cloud.js   integrazione Firebase (auth, Firestore, Storage, FCM)
  js/screens/                   una schermata per modulo (home, scoreboard, americano, killer, community, events, stats, gamification, settings, profile, login)
  native-android/               sorgenti Java del plugin telecomando (copiati nel progetto Android ad ogni build)
  functions/                    Cloud Functions (notifiche push inviti/RSVP)
  firestore.rules, storage.rules, firestore.indexes.json
  capacitor.config.json, build-apk.sh, setup-android.sh
```

## Regole del segnapunti

- Punteggio classico 0/15/30/40 per gioco.
- **Punto d'oro** (impostazione attivabile): a 40 pari, il punto successivo
  decide il gioco. Se disattivato, si gioca con vantaggio/parità classici.
- Set fino a 6 giochi, tie-break a 6 pari (primo a 7, scarto di 2).
- Partita al meglio dei 3 set. **Super tie-break al 3° set** (impostazione
  attivabile): invece di giocare l'intero terzo set, si gioca un tie-break
  decisivo fino a 10 punti.
- Modalità **Doppio** o **Singolo** selezionabile all'inizio di ogni partita
  (stesse regole di punteggio, cambia solo l'etichetta squadra/giocatore).

## Modalità Americano

Torneo a rotazione per gruppi di 4 o più giocatori (dalla Home → "🔄
Americano"): ogni turno l'app forma automaticamente le coppie cercando di
far giocare ciascun giocatore con compagni diversi il più possibile
(algoritmo che minimizza le coppie ripetute); se il numero di giocatori non
è multiplo di 4, chi ha giocato più turni riposa a rotazione. Inserisci il
punteggio di ogni campo a fine turno (i due punteggi si aggiornano a
specchio sul totale impostato, es. 21), l'app somma i punti individuali di
ogni giocatore turno dopo turno. Classifica live sempre visibile; puoi
terminare il torneo in qualsiasi momento.

## Modalità Killer (Eliminazione)

"Re del campo" con vite (dalla Home → "🔪 Killer"): due giocatori sono in
campo, gli altri sono in coda. Il perdente del round (un game intero, o un
singolo punto in modalità "punto secco" — scelta in fase di impostazione)
perde una vita e va in fondo alla coda; il vincitore resta in campo contro
il prossimo sfidante. Chi esaurisce le vite (2-3, configurabile) viene
eliminato; vince l'ultimo rimasto. Il game di ogni round usa le stesse
regole di punteggio del segnapunti principale (punto d'oro incluso).

## Telecomando Bluetooth

La maggior parte dei telecomandi Bluetooth economici ("selfie remote") e
degli smartwatch in modalità scatto foto si accoppiano con Android come una
normale **tastiera Bluetooth**, inviando un tasto standard (volume su/giù,
fotocamera, play/pausa, tasti multimediali...). L'app intercetta questi
tasti tramite un piccolo plugin Android nativo (`native-android/`) e li
espone a schermo in Impostazioni → Telecomando remoto come un elenco di
**associazioni** libere, invece di tre slot fissi.

Ogni associazione lega **un tasto di un dispositivo specifico** + **un tipo
di pressione** a **un'azione**:

- **Puoi accoppiare più di un telecomando contemporaneamente** — l'app
  distingue i dispositivi tramite un identificativo stabile fornito da
  Android, quindi lo stesso tasto (es. Volume +) può fare cose diverse su
  due telecomandi diversi.
- **Ogni tasto supporta tre tipi di pressione**, assegnabili
  indipendentemente sullo stesso tasto: click singolo, doppio click veloce
  e doppio click lento (~0.9s tra le due pressioni). Se su un tasto è
  assegnato solo il click singolo, l'azione scatta immediatamente senza
  attese; se sono assegnati anche doppio/doppio lento, l'app attende
  brevemente per distinguere i pattern.
- **Azioni disponibili:** Punto squadra/giocatore 1, Punto
  squadra/giocatore 2, Annulla ultimo punto, Azzera punteggio del game
  (in corso, senza toccare game/set già vinti), Inizia partita (utile per
  avviare la partita da bordo campo senza toccare lo schermo), Resetta
  partita (torna alla schermata di impostazione nuova partita).

**Uso:**
1. Accoppia il telecomando/smartwatch dalle Impostazioni Bluetooth di
   Android (come faresti con una tastiera). Ripeti per un secondo
   telecomando, se vuoi usarne due.
2. In Padel App, vai in Impostazioni → Telecomando remoto → attiva il
   toggle → "+ Aggiungi associazione" → premi il tasto sul telecomando
   entro 8 secondi → scegli il tipo di pressione → scegli l'azione.
3. Ripeti per tutte le associazioni che vuoi creare (anche più di una sullo
   stesso tasto, con pattern diversi). Ogni associazione è rimovibile
   singolarmente con ✕.
4. Il telecomando resta attivo sia nella schermata di impostazione nuova
   partita (per l'azione "Inizia partita") sia durante il Segnapunti
   (altrove i tasti volume/media funzionano normalmente).

## Portachiavi / tag Bluetooth (sperimentale)

I portachiavi "trova oggetto" generici (antifurto chiavi, tipo iTag) di
solito **non** si accoppiano come tastiera: usano il Bluetooth Low Energy
con un servizio proprietario diverso per produttore, quindi non compaiono
nel telecomando standard sopra. Impostazioni → "🔑 Portachiavi / tag
Bluetooth" offre un percorso alternativo pensato per questi dispositivi:

1. Tocca **"Cerca dispositivi"** (richiede il permesso Bluetooth/posizione
   la prima volta) — se il dispositivo ha già un'app dedicata, aprila prima
   e lasciala connettere una volta, poi chiudila (questi dispositivi
   accettano una sola connessione alla volta).
2. Tocca **"Connetti"** sul dispositivo trovato.
3. Scegli quale azione deve fare il pulsante (Punto 1 / Punto 2 / Annulla)
   — questi dispositivi hanno un solo tasto, quindi una sola azione
   assegnabile.

Tecnicamente: invece di puntare a un protocollo specifico (che varia da
marca a marca), l'app si collega al dispositivo e si iscrive a **tutte** le
notifiche GATT che espone, trattando qualunque notifica come "pulsante
premuto" — copre la maggior parte dei cloni economici indipendentemente
dal produttore, ma **non è garantito** per tutti i modelli: è stato
verificato solo teoricamente (nessun dispositivo BLE disponibile in fase di
sviluppo), va testato sul dispositivo reale.
