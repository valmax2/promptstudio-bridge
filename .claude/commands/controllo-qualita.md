---
description: Audit professionale completo dell'app dopo un rilascio (schermate, link, guide, grafica, tutto)
---

Agisci come QA Lead / Senior Product Engineer che deve certificare questa release come pronta per utenti reali. Non è una review superficiale: vai a fondo, come se il tuo nome fosse legato alla qualità del prodotto.

Contesto release (se fornito dall'utente): $ARGUMENTS

## Metodologia

Prima di iniziare, crea una checklist con il tool di task tracking interno e avanza sistematicamente punto per punto — non saltare nulla, non riassumere a metà.

### 1. Mappa tutto ciò che esiste
- Elenca tutte le schermate/pagine/route dell'app (grep su router, file di navigazione, sitemap, cartelle pages/views/screens).
- Elenca tutti i documenti di supporto: guide, tutorial, FAQ, onboarding, help center, README, changelog.
- Elenca tutti i collegamenti esterni presenti nel codice e nei contenuti (link a social, documentazione, terze parti, store, privacy policy, termini di servizio).

### 2. Verifica funzionale, schermata per schermata
Per ogni schermata individuata al punto 1:
- La schermata si apre senza errori (controlla log/console)?
- I flussi principali (bottoni, form, azioni) funzionano end-to-end, inclusi i casi limite (campo vuoto, dato errato, connessione assente)?
- Stati di caricamento, stati vuoti (empty state) e messaggi di errore sono presenti e comprensibili, non solo "undefined" o schermate bianche?
- La navigazione da e verso questa schermata è coerente (breadcrumb, back button, deep link)?

### 3. Collegamenti interni ed esterni
- Verifica ogni link interno: porta davvero alla destinazione corretta, nessun 404/route morta.
- Verifica ogni link esterno: effettua una richiesta reale (fetch/HEAD) e conferma che risponda (200/3xx accettabile), segnala quelli rotti, scaduti, o che puntano a domini sbagliati.
- Controlla che i link esterni sensibili (pagamenti, login terze parti, privacy, supporto) usino HTTPS.

### 4. Guide, tutorial, documentazione
- Confronta ogni guida/tutorial con il comportamento reale dell'app: screenshot, passaggi o nomi di pulsanti descritti sono ancora corretti dopo le modifiche di questa release?
- Segnala istruzioni obsolete, funzionalità documentate ma rimosse, o funzionalità nuove non ancora documentate.
- Controlla che il changelog/release notes rifletta davvero cosa è cambiato nel codice.

### 5. Grafica, UI/UX, coerenza
- Coerenza visiva: colori, font, spaziature, iconografia uniformi tra le schermate.
- Responsive: comportamento su almeno mobile/tablet/desktop (o le dimensioni rilevanti per la piattaforma target).
- Accessibilità di base: contrasto testo/sfondo, elementi cliccabili abbastanza grandi, testo alternativo su immagini, navigabilità da tastiera.
- Microcopy: testi dei pulsanti, messaggi di errore e placeholder sono chiari, senza refusi, con tono coerente.

### 6. Qualità tecnica
- Warning/errori in console o nei log durante l'uso normale.
- Performance percepita: tempi di caricamento anomali, blocchi dell'interfaccia.
- Sicurezza di base: nessuna chiave/segreto esposto nel codice client, nessun endpoint sensibile senza autenticazione.
- Se esistono test automatici, eseguili e riporta l'esito; se non esistono, segnalalo come miglioramento.

## Output richiesto

Produci un report strutturato così, in italiano:

1. Sintesi: pronto per il rilascio / pronto con riserve / non pronto, in una frase.
2. Problemi critici (bloccano il rilascio): elenco con file/schermata coinvolta, descrizione, impatto sull'utente, fix suggerito.
3. Problemi medi (da sistemare a breve): stesso formato.
4. Problemi minori / rifiniture: stesso formato.
5. Suggerimenti per rendere l'app più professionale: cose che non sono "bug" ma che alzerebbero il livello percepito (onboarding migliore, stati vuoti più curati, coerenza grafica, micro-animazioni, messaggi d'errore più umani, ecc.).
6. Collegamenti verificati: tabella con link controllati ed esito (OK / rotto / da controllare a mano).

Alla fine, salva o aggiorna un file QA-REPORT.md nella root del progetto con la data e questo report, così si accumula uno storico tra una release e l'altra: se il file esiste già, aggiungi una nuova sezione datata invece di sovrascrivere.
