# Consegna sessione — Padel Score Master (aggiornato 8 nov 2026)

## Branch
`claude/padel-app-development-4lb2mu` — continua da qui.

**Attenzione**: `main` è un'altra linea di lavoro, ferma a metà agosto 2026
(landing page + AdMob, fatta separatamente). Questo branch ha ~95 commit
successivi non ancora mergeati in `main` (tag Bluetooth, fix di oggi, ecc.).
Non fare merge/rebase da `main` senza prima controllare con l'utente — si
rischia di creare conflitti o perdere la storia di uno dei due rami.

## Cosa è stato fatto in questa sessione (cloud, da cellulare)

L'utente ha segnalato 3 bug, tutti risolti e già testati OK su dispositivo
reale (tablet):

1. **Lentezza percepita nel segnare un punto (tocco schermo)** — aggiunto un
   bip immediato di conferma (`playTapFeedback()` in `js/speech.js`),
   indipendente dal tempo di attesa reale. L'attesa di 280ms in `onHalfTap`
   (`js/screens/scoreboard.js`) serve a riconoscere il doppio tap/annulla —
   **non va tolta**, è voluta (vedi commento nel codice: un design precedente
   "commit ottimistico + annulla retroattivo" si auto-annullava).

2. **Annuncio vocale "15 a 40" invece di "15 40"** — corretto in
   `js/scoring.js`, funzioni `describeGamePoint` e `addTiebreakPoint`
   (tolta la congiunzione "a"/"e" tra i due numeri; il caso di parità
   "15 pari" resta invariato).

3. **Bip assente/in ritardo (~900ms) sul telecomando/tag Bluetooth** — bip
   aggiunto nel punto giusto: dentro `listenBindings()` in `js/ble-remote.js`,
   sulla prima pressione fisica (ramo `if (!state)`), NON in
   `handleRemoteAction()` (quel punto scatta fino a 900ms dopo, il tempo di
   distinguere singolo/doppio click — troppo tardi per sentirsi "immediato").
   Vedi commit `14b6345` per i dettagli e il perché del primo tentativo
   sbagliato (commit `225fe80`).

Tutto verificato con test end-to-end (Playwright, con `BleTag` e `Audio`
simulati) prima di essere confermato dall'utente sul dispositivo reale.

Build debug finale testata e approvata: **V164**
(https://github.com/valmax2/promptstudio-bridge/actions/runs/41218904165,
artifact `padel-app-debug-apk` — NON quello `-beta-`, che salta il login).

## ✅ Release inviata in revisione (8 nov 2026)

La release **38 (1.0.37)** è stata caricata su Play Console (Produzione,
implementazione completa) e inviata per la revisione Google l'8/11/2026 sera.
Fatto da una sessione locale PC tramite Claude in Chrome; click finale
dell'utente. Note di rilascio inserite solo in **it-IT** (l'unica lingua
proposta dal modulo). Unico avviso: nessun file di deoffuscamento (innocuo).

Prossimo passo: controllare in Play Console → Panoramica della pubblicazione
che la revisione sia approvata e la versione pubblicata. Niente altro da fare
su questa release.

## (Storico) Task: pubblicare la nuova release sullo Store

L'AAB firmato era già compilato e pronto:

- Run: https://github.com/valmax2/promptstudio-bridge/actions/runs/41228480275
- Artifact: `padel-app-release-aab-38`
  (gli artifact GitHub durano 30 giorni dal 31/10/2026 — dopo quella data,
  se serve, va ricompilato rilanciando `build-padel-aab.yml` con
  `version_code=38` e `version_name=1.0.37`, risultato identico perché
  dipende solo dal commit `14b6345`)
- versionCode: **38**, versionName: **1.0.37**
- Soddisfa già il requisito Play "targetSdkVersion 36 / Android 16"
  (verificato nel log di build: lo script `build-aab-ci.sh` lo forza sempre
  a 36, non serve toccare nulla)

**Era bloccato su** (risolto l'8/11): l'utente doveva caricarlo a mano su Google Play Console
(https://play.google.com/console/u/0/developers/6947419478155730686/app/4974558405539275409/app-dashboard).
Nessuna sessione cloud ha accesso a browser/account Google per farlo in sua
vece. Se la sessione locale ha Chrome extension o Computer Use configurati
e lei è disposta a usarli, può provare a farlo direttamente; altrimenti
guidarla passo passo mentre lo fa lei.

Percorso in Play Console (interfaccia recente, può essere cambiata ancora):
menu laterale **"Release"** → **Produzione** (o il canale di test attivo) →
tab **Release** → **"Crea nuova release"** → carica l'AAB → incolla le note
di rilascio sotto → Avanti → Revisiona release → Avvia il rollout.

Note di rilascio pronte da incollare:

- **IT**: "Migliorato il segnale acustico quando si segna un punto, anche
  usando il telecomando/tag Bluetooth: ora è immediato, non più in ritardo.
  Corretto l'annuncio vocale del punteggio (es. '15 40' invece di
  '15 a 40')."
- **EN**: "Improved the sound feedback when scoring a point, including via
  the Bluetooth remote/tag: now instant instead of delayed. Fixed the voice
  score announcement (e.g. '15 40' instead of '15 to 40')."

## Promemoria dal CLAUDE.md di repo

Questo repo si lavora a ponte git tra sessioni da cellulare e sessioni PC:
`git fetch` + continua su questo stesso branch, fai `git push` quando finisci
così la prossima sessione (mobile o PC) riparte da lì. Non ripartire da
`main` per questo progetto (vedi nota sulla divergenza dei branch sopra).

Questo file può essere cancellato/aggiornato liberamente una volta che la
release è stata pubblicata sullo Store.
