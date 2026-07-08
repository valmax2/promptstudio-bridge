# Pubblicare Sudoku VStudio su Google Play

Guida per creare la **build firmata (.aab)**, fare il **test chiuso** e arrivare allo **store**.

---

## 0) Cosa richiede Google Play (in breve)
- Formato: **Android App Bundle (.aab)** firmato (non l'APK).
- **Target API** aggiornata (Capacitor recente è già a posto).
- **Privacy policy** (URL pubblico) — obbligatoria, soprattutto con pubblicità. Già pronta
  in `privacy.html` (vedi sotto per pubblicarla).
- **Data safety form**, **content rating**, icona, screenshot, descrizione.
- ⚠️ **Regola account personali nuovi:** prima della produzione devi fare un **test chiuso con
  almeno 12 tester che restano iscritti 14 giorni** consecutivi. È il punto che sorprende tutti
  — mettilo in conto.

---

## 1) Setup una tantum (progetto Capacitor persistente)
```bash
cd sudoku
bash setup-android.sh
```
Crea `sudoku/android/` (progetto Android Studio vero e proprio) e genera icona/splash dal
tuo `icon.svg`. **Non** cancellare `android/` tra una build e l'altra (serve per versioni e firma).

---

## 2) Chiave di firma (una tantum, da custodire gelosamente)
```bash
cd sudoku
keytool -genkey -v -keystore release.keystore -alias upload \
  -keyalg RSA -keysize 2048 -validity 10000
```
Poi crea `sudoku/keystore.properties` (già ignorato da git, vedi `.gitignore`):
```properties
storeFile=release.keystore
storePassword=LA_TUA_PASSWORD
keyAlias=upload
keyPassword=LA_TUA_PASSWORD
```
> ⚠️ **Backup di `release.keystore` + password in un posto sicuro.** Se la perdi non potrai
> più aggiornare l'app sullo store. (Con "Play App Signing" Google gestisce la chiave finale,
> ma questa "upload key" ti serve comunque.)

---

## 3) Versione (da incrementare a ogni upload)
In `sudoku/android/app/build.gradle`, dentro `defaultConfig`:
```gradle
versionCode 1        // INCREMENTA di 1 ad ogni caricamento su Play (1, 2, 3, …)
versionName "1.0.0"  // versione "umana" mostrata agli utenti
```

---

## 4) Costruisci l'AAB firmato
```bash
cd sudoku
bash build-aab.sh
```
Risultato:
```
sudoku/android/app/build/outputs/bundle/release/app-release.aab
```
Questo file lo carichi su Play Console.

> Per provarlo su un telefono prima di caricarlo puoi generare anche un APK di test:
> `cd android && ./gradlew assembleRelease` → `app/build/outputs/apk/release/`.

---

## 5) Pubblicare la privacy policy
`privacy.html` è già pronta e inclusa nell'app. Serve però anche un **URL pubblico**
raggiungibile da chiunque (Play Console lo richiede). Opzioni semplici:
- **GitHub Pages**: pubblica la cartella `sudoku/` (o solo `privacy.html`) come sito statico
  dal repository — stesso meccanismo già usato per `3d-reducer` (vedi
  `.github/workflows/pages.yml` nel repo, adattabile).
- In alternativa, qualunque hosting statico gratuito (Netlify, Vercel, ecc.).

---

## 6) Google Play Console — percorso
1. **Crea l'app** (nome, lingua, gratuita/a pagamento).
2. Compila: **Privacy policy** (URL), **Data safety**, **Content rating**, **Target audience**,
   store listing (titolo, descrizione, icona, **min. 2 screenshot telefono**, feature graphic).
   Testi pronti in `STORE_LISTING.md`.
3. **Play App Signing**: accetta (Google custodisce la chiave di distribuzione).
4. **Test chiuso** (Closed testing): crea una traccia, carica l'`.aab`, aggiungi la lista email
   dei tester (mira a **≥12**), condividi il link di opt-in. Tienili iscritti **14 giorni**.
5. Al termine chiedi l'accesso alla **Produzione**, carica (eventualmente lo stesso) AAB,
   invia in revisione.
6. Revisione Google: da poche ore a qualche giorno.

---

## 7) Monetizzazione — cosa è già pronto nel codice
Vedi `PLAY_ADMOB.md` (pubblicità) e `PLAY_IAP.md` (acquisto "Pro") per i dettagli e i passi
di attivazione. In breve, la strategia già scaffoldata nel codice (`ads.js`, `billing.js`):

| Elemento | Uso nell'app |
|---|---|
| **Rewarded** (video premiato) | oltre i 3 hint gratuiti al giorno, un video sblocca il successivo |
| **Interstitial** | ogni 3 nuove partite iniziate |
| **IAP "Pro"** (una tantum) | rimuove le pubblicità + hint illimitati |

Finché non inserisci i tuoi ID AdMob/RevenueCat reali, questi punti restano **no-op**
(nessuna pubblicità, hint sempre illimitati): l'app funziona normalmente anche senza
completare questa parte.

---

## Checklist rapida prima dell'invio
- [ ] `versionCode` incrementato
- [ ] AAB firmato generato (`build-aab.sh`)
- [ ] Icona + screenshot + descrizione (`STORE_LISTING.md`)
- [ ] Privacy policy pubblica (URL) — `privacy.html` pubblicata online
- [ ] Data safety + content rating compilati
- [ ] (se ads) AdMob + consenso UMP + policy aggiornata (`PLAY_ADMOB.md`)
- [ ] (se Pro) RevenueCat configurato (`PLAY_IAP.md`)
- [ ] Backup di `release.keystore` + password
