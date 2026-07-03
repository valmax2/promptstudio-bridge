# Pubblicare Poly Reducer 3D su Google Play

Guida per creare la **build firmata (.aab)**, fare il **test chiuso** e arrivare allo **store**.

---

## 0) Cosa richiede Google Play (in breve)
- Formato: **Android App Bundle (.aab)** firmato (non l'APK).
- **Target API** aggiornata (attualmente Android 14 / API 34; Capacitor recente è già a posto).
- **Privacy policy** (URL pubblico) — obbligatoria, soprattutto con pubblicità.
- **Data safety form**, **content rating**, icona, screenshot, descrizione.
- ⚠️ **Regola account personali nuovi:** prima della produzione devi fare un **test chiuso con almeno 12 tester che restano iscritti 14 giorni** consecutivi. È il punto che sorprende tutti — mettilo in conto.

---

## 1) Setup una tantum (progetto Capacitor persistente)
Fatto **una sola volta** in `3d-reducer/`:

```bash
cd 3d-reducer
npm init -y
npm install @capacitor/core @capacitor/cli @capacitor/android

# prepara i file web in www/
mkdir -p www
cp index.html styles.css app.js manifest.webmanifest sw.js icon.svg www/
cp -r vendor www/vendor

# inizializza Capacitor e crea il progetto Android PERSISTENTE
npx cap init "Poly Reducer 3D" com.polyreducer.app --web-dir=www
npx cap add android
```

Ora esiste `3d-reducer/android/` (progetto Android Studio vero e proprio). **Non** cancellarlo tra una build e l'altra (serve per versioni e firma).

### Icona dell'app col tuo logo (consigliato)
```bash
npm install @capacitor/assets --save-dev
# metti un'immagine 1024x1024 del logo in: resources/icon.png
npx capacitor-assets generate --android
```

---

## 2) Chiave di firma (una tantom, da custodire gelosamente)
```bash
cd 3d-reducer
keytool -genkey -v -keystore release.keystore -alias upload \
  -keyalg RSA -keysize 2048 -validity 10000
```
Poi crea `3d-reducer/keystore.properties` (già ignorato da git):
```properties
storeFile=release.keystore
storePassword=LA_TUA_PASSWORD
keyAlias=upload
keyPassword=LA_TUA_PASSWORD
```
> ⚠️ **Backup di `release.keystore` + password in un posto sicuro.** Se la perdi non potrai più aggiornare l'app sullo store. (Con "Play App Signing" Google gestisce la chiave finale, ma questa "upload key" ti serve comunque.)

---

## 3) Versione (da incrementare a ogni upload)
In `3d-reducer/android/app/build.gradle`, dentro `defaultConfig`:
```gradle
versionCode 1        // INCREMENTA di 1 ad ogni caricamento su Play (1, 2, 3, …)
versionName "1.0.0"  // versione "umana" mostrata agli utenti
```

---

## 4) Costruisci l'AAB firmato
Dopo aver aggiornato il codice web e (se serve) il `versionCode`:
```bash
cd 3d-reducer
bash build-aab.sh
```
Risultato:
```
3d-reducer/android/app/build/outputs/bundle/release/app-release.aab
```
Questo file lo carichi su Play Console.

> Per provarlo su un telefono prima di caricarlo puoi generare anche un APK di test:
> `cd android && ./gradlew assembleRelease` → `app/build/outputs/apk/release/`.

---

## 5) Google Play Console — percorso
1. **Crea l'app** (nome, lingua, gratuita/a pagamento).
2. Compila: **Privacy policy** (URL), **Data safety**, **Content rating**, **Target audience**, store listing (titolo, descrizione, icona, **min. 2 screenshot telefono**, feature graphic).
3. **Play App Signing**: accetta (Google custodisce la chiave di distribuzione).
4. **Test chiuso** (Closed testing): crea una traccia, carica l'`.aab`, aggiungi la lista email dei tester (mira a **≥12**), condividi il link di opt-in. Tienili iscritti **14 giorni**.
5. Al termine chiedi l'accesso alla **Produzione**, carica (eventualmente lo stesso) AAB, invia in revisione.
6. Revisione Google: da poche ore a qualche giorno.

---

## 6) Monetizzazione con pubblicità (AdMob) — piano consigliato
Per un'**app-strumento** come questa, il mix migliore di solito è **freemium**, non solo banner:

| Elemento | Uso consigliato |
|---|---|
| **Banner** (AdMob) | discreto, in basso — poche entrate ma costanti |
| **Interstitial** | a intervalli (es. ogni N esportazioni) — non troppo aggressivo |
| **Rewarded** (video premiato) | "guarda un video per esportare in **alta qualità** / sbloccare **dettaglio massimo**" — ottimo per i tool |
| **IAP "Pro"** (~2–4 €, una tantum) | rimuove le pubblicità + sblocca tutto → di solito è **la voce che rende di più** |

**Come integrarla** (quando vuoi, mi servono i tuoi ID AdMob):
1. Crea un account **AdMob**, registra l'app, ottieni **App ID** e gli **ad unit ID**.
2. Plugin: `npm install @capacitor-community/admob` + configurazione nativa.
3. Aggiungo io i punti di inserimento (banner, interstitial dopo l'export, rewarded per l'alta qualità).
4. **Consenso GDPR/UMP** obbligatorio in UE + **privacy policy** che dichiara l'uso di AdMob.

> Nota realistica: con un tool usato "quando serve" (poche sessioni al mese) le **entrate da soli banner sono basse**. Il **rewarded** e soprattutto **l'acquisto Pro una tantum** rendono molto meglio.

---

## 7) Ho possibilità di avere utenti? (onesto)
- È una **nicchia reale**: stampa 3D / maker che vogliono **alleggerire STL/OBJ dal telefono**. Sul mobile la concorrenza è **scarsa** (quasi tutti i riduttori sono desktop) → c'è uno spazio.
- Aspettative oneste: **senza marketing**, un'utility di nicchia fa installi **modesti** all'inizio (decine → centinaia al mese) e cresce con il passaparola e l'ASO.
- Cosa aumenta davvero gli installi:
  - **ASO**: titolo + parole chiave come *STL reducer, reduce polygons, OBJ optimizer, 3D print file size, decimate mesh*.
  - **Screenshot/video** che mostrano il "prima/dopo" e il caso d'uso **stampa 3D**.
  - **Supporto STEP** (grande elemento distintivo, oggi manca): amplierebbe molto il pubblico CAD.
  - Un breve **video demo** e presenza nei forum/gruppi di stampa 3D.

---

## Checklist rapida prima dell'invio
- [ ] `versionCode` incrementato
- [ ] AAB firmato generato (`build-aab.sh`)
- [ ] Icona col logo + screenshot + descrizione
- [ ] Privacy policy pubblica (URL)
- [ ] Data safety + content rating compilati
- [ ] (se ads) AdMob + consenso UMP + policy aggiornata
- [ ] Backup di `release.keystore` + password
