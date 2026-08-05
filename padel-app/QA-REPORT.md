# QA Report — Padel Score Master (padel-app/)

## 2026-08-05 — versionCode 26 / versionName 1.0.25

**Sintesi**: pronto per il rilascio con riserve — nessun bug bloccante trovato, ma la guida in-app ("Come si usa il tabellone") è rimasta indietro rispetto alle modifiche di oggi e va corretta prima di considerare la release definitiva.

### Metodologia
Audit di tutte le 18 route registrate (`js/app.js`), verificate via Playwright (Chromium headless, viewport 412×915, `deviceScaleFactor` 2-3) simulando stato locale con dati di prova: nessuna schermata ha prodotto errori console/runtime. Flussi end-to-end testati: partita completa Doppio (setup → punteggio → fine partita → "Inizia nuova partita" → ritorno al setup), apertura "Chi batte?" sia dal tabellone che dal Riepilogo rapido a metà partita, Americano/Killer (validazione minimo giocatori), Community/Eventi in modalità locale, Impostazioni, Bluetooth, Admin (con bypass temporaneo di `isAdmin()` solo per il test, mai committato). Controllate anche `firestore.rules`, `firebase-config.js`, `monetization-config.js` per esposizione di segreti, e l'assenza di test automatici nel repo.

### Problemi critici (bloccano il rilascio)
Nessuno.

### Problemi medi (da sistemare a breve)

1. **Guida in-app "Come si usa il tabellone" non aggiornata dopo le modifiche di oggi**
   File: `js/screens/scoreboard.js`, funzione `helpModal()`, righe 993-996.
   Descrizione: la riga `Tocca "Batte:" per scegliere o cambiare chi serve` cita un'etichetta di pulsante che non esiste più (oggi è stato tolto il prefisso "Batte:", resta solo il nome). Le tre righe successive (➕ ingrandisci numeri, 🔢 solo punteggio, 🔊 voce) dicono tutte `In alto:`, ma le tre iconcine sono state spostate oggi sulla barra nera in basso, accanto al triangolino.
   Impatto utente: chi apre la guida (prima partita, o dal cerchietto "i") legge istruzioni che non corrispondono più a quello che vede sullo schermo — cerca i pulsanti "in alto" e non li trova.
   Fix suggerito: cambiare "In alto" in "In basso" per le tre righe, e riformulare la riga del battitore senza citare un'etichetta di testo specifica (es. "Tocca il nome di chi serve (🎾) per cambiare battitore").

2. **Accessori telecomandi / Telecomandi compatibili invisibili senza spiegazione per utenti non loggati**
   File: `firestore.rules` (righe 73-88, `allow read: if isSignedIn()` su `prizes` e `compatibleRemotes`) + `js/firebase.js` (`fsListenCollection`, riga 143-150, `onSnapshot` senza callback di errore).
   Descrizione: le due vetrine sono pensate come contenuto pubblico/promozionale gestito dall'admin, ma la regola richiede un utente autenticato per leggerle. Se un utente con Firebase configurato ma non loggato le apre, la lettura viene rifiutata silenziosamente (nessun errore mostrato) e la schermata resta sullo stato vuoto di default ("Nessun accessorio in vetrina al momento"), indistinguibile da "vetrina davvero vuota".
   Impatto utente: chi non ha fatto login pensa che non ci sia nulla in vetrina, mentre in realtà non può vederla.
   Fix suggerito: se il contenuto è davvero pensato come pubblico, cambiare la regola in `allow read: if true;` per queste due collection; altrimenti aggiungere un `onError` a `fsListenCollection` e mostrare un messaggio tipo "Accedi per vedere le novità".

3. **`prompt()` nativo per il reset password, mentre il resto dell'app l'ha già abbandonato**
   File: `js/screens/login.js`, riga 102.
   Descrizione: la finestra di reimpostazione password usa ancora `window.prompt()`. Nella stessa sessione di sviluppo, la rinomina in diretta sul tabellone è stata volutamente spostata da `prompt()` a una finestra modale dedicata perché il prompt nativo del browser è inaffidabile dentro la WebView Android di Capacitor.
   Fix suggerito: sostituire con una piccola finestra modale coerente con lo stile del resto dell'app (campo email + pulsante Invia), riusando lo stesso pattern già presente per la rinomina.

4. **Indirizzo email di supporto scritto con maiuscole diverse in punti diversi**
   File: `js/screens/welcome.js` e `js/screens/bluetooth-setup.js` (`VStudioApps@gmail.com`) vs `privacy.html` (`vstudioapps@gmail.com`).
   Impatto: nessuno funzionalmente (Gmail non distingue maiuscole/minuscole), ma è un'incoerenza visibile se qualcuno confronta i due punti.
   Fix suggerito: uniformare a una sola grafia (es. tutto minuscolo) ovunque compare.

### Problemi minori / rifiniture

1. **Placeholder tagliato nel campo "Aggiungi amico"**
   File: `js/screens/community.js`, riga 74 (`placeholder="Nome amico (locale)"`).
   Descrizione: a 412px di larghezza, col microfono e il pulsante "Aggiungi" nella stessa riga, il placeholder viene tagliato a metà ("Nome amico (loca") senza puntini di sospensione, sembra un testo troncato per errore.
   Fix suggerito: accorciare il placeholder a "Nome amico" e spostare "(locale)" in una label sopra il campo, oppure aggiungere `text-overflow: ellipsis`.

2. **Fallback `'#'` morto in `remote-board.js`**
   File: `js/screens/remote-board.js`, riga 38 (`href="${escapeHtml(r.link || '#')}"`).
   Descrizione: il form admin per aggiungere un telecomando compatibile richiede sempre un link (`if (!label || !link) { toast(...); return; }` in `admin.js`), quindi il fallback `'#'` non dovrebbe mai scattare in pratica. Non è un bug visibile, solo codice morto/difensivo da poter rimuovere per pulizia.

### Suggerimenti per rendere l'app più professionale

- **Nome app incoerente tra store e telefono**: `capacitor.config.json`, `manifest.webmanifest` e il `<title>` di `index.html` impostano tutti "Padel App" come nome interno — è questo che finisce come etichetta sotto l'icona nella schermata home del telefono. Se sullo Store la scheda si chiama "Padel Score Master", chi installa l'app vede due nomi diversi tra l'annuncio nello Store e l'icona sul telefono. Allineare i due nomi rafforzerebbe il riconoscimento del brand.
- **Nessun test automatico nel repo**: oggi ho scritto una decina di script Playwright ad-hoc per verificare le modifiche (tabellone, cropper immagine, Accessori, ecc.) ma sono tutti nella cartella temporanea di lavoro, non nel repository. Vale la pena tenerne almeno un sottoinsieme come smoke test permanente (es. in `padel-app/tests/`) da rilanciare a ogni release, invece di reinventarli ogni volta.
- **Nessun CHANGELOG.md**: le note di rilascio esistono solo dentro Play Console. Un changelog nel repo (anche breve, per versione) aiuterebbe a tenere uno storico consultabile senza dover riaprire Play Console.
- **Contenuti admin (link Accessori/Telecomandi) senza controllo di scadenza**: sono link esterni inseriti a mano, nessun meccanismo li ricontrolla nel tempo — se un link smette di funzionare (prodotto rimosso, dominio scaduto) nessuno se ne accorge finché un utente non lo segnala. Un controllo manuale periodico (es. ogni release) è sufficiente, ma vale la pena segnarlo come promemoria ricorrente.

### Collegamenti verificati

| Link | Dove | Esito |
|---|---|---|
| `https://firebase.google.com/docs/cli` | README.md | Da controllare a mano — il proxy della sandbox blocca ogni richiesta automatica in uscita (403 su qualunque dominio esterno, confermato anche su domini Google noti e stabili) |
| `https://console.firebase.google.com` | README.md | Da controllare a mano (stesso motivo) |
| `https://www.gstatic.com/firebasejs/…` (CDN SDK Firebase) | `js/firebase.js` | Da controllare a mano, ma il caricamento è già protetto da try/catch con degrado automatico a "modalità locale" se non raggiungibile — nessun rischio di schermata rotta anche se il CDN fosse irraggiungibile |
| `https://capacitorjs.com/` | `js/vendor/capacitor-core.js` (commento nel codice, non un link cliccabile per l'utente) | Non applicabile |
| `https://wa.me/?text=…` (condividi su WhatsApp) | `js/screens/community.js` | Da controllare a mano |
| `https://www.google.com/maps/search/…` (indirizzo club) | `js/screens/settings.js` | Da controllare a mano |
| `mailto:VStudioApps@gmail.com` | `js/screens/welcome.js`, `js/screens/bluetooth-setup.js` | OK — formato valido, apre il client email; verificare solo che la casella sia ancora attiva |
| `mailto:vstudioapps@gmail.com` | `privacy.html` | OK (stessa nota; vedi anche il problema medio #4 sulla grafia incoerente) |
| Link "Vedi" in Accessori telecomandi / Telecomandi compatibili | Contenuto inserito dall'admin via `js/screens/admin.js`, dati a runtime | Non verificabile dal codice — dipende dai link che inserisci tu volta per volta |
| Tutte le 18 route interne (`navigate('…')` ↔ `registerRoute('…')`) | `js/app.js` + tutti gli screen | OK — corrispondenza 1:1 verificata, nessuna route morta o typo |
