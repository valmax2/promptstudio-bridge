# Padel App

App mobile per organizzare partite di padel: segnapunti remoto con annuncio
vocale, community con cerchie di amici, eventi con conferma presenza,
statistiche, gamification e sincronizzazione cloud.

## Stato delle funzionalità

| Modulo | Stato |
|---|---|
| Segnapunti (punteggio padel completo, punto d'oro, super tie-break, annuncio vocale TTS) | ✅ Funzionante, offline |
| Tema scuro/chiaro, font e dimensione testo | ✅ Funzionante, offline |
| Login con numero di telefono | ✅ Funzionante *(richiede Firebase configurato)* |
| Community: amici e cerchie chiuse | ✅ Funzionante *(richiede Firebase; modalità locale limitata senza login)* |
| Eventi con notifica push e conferma/rifiuto | ✅ Funzionante *(richiede Firebase + Cloud Functions deployate)* |
| Statistiche partite e trend | ✅ Funzionante, offline |
| Gamification (XP, avatar e cornici sbloccabili) | ✅ Funzionante, offline |
| Sincronizzazione cloud di impostazioni/avatar/statistiche | ✅ Funzionante *(richiede Firebase)* |
| Audio su cassa Bluetooth | ✅ Funziona automaticamente: l'annuncio vocale (TTS di sistema) esce dall'uscita audio attiva del telefono, quindi anche da una cassa Bluetooth già collegata — nessuna configurazione nell'app |
| Telecomando BLE / tasti fotocamera smartwatch | 🚧 Non ancora incluso: richiede lo sviluppo di un plugin nativo Android dedicato, da testare con il tuo telecomando specifico. La voce è già presente (disattivata) nelle Impostazioni |

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
  js/speech.js                  annuncio vocale (Web Speech API)
  js/store.js                   stato locale + persistenza (localStorage)
  js/firebase.js, js/cloud.js   integrazione Firebase (auth, Firestore, Storage, FCM)
  js/screens/                   una schermata per modulo (home, scoreboard, community, events, stats, gamification, settings, profile, login)
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
