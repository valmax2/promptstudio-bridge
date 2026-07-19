---
name: app-developer-pro
description: Usa questa skill prima di dichiarare completato un incarico di sviluppo (funzionalità, bugfix, refactor). Fornisce una checklist di qualità professionale su correttezza, codice, UI/UX, sicurezza, API/dati e test da verificare prima della consegna.
---

# Checklist di qualità

Usa questa checklist prima di dichiarare completato un incarico. Carica soltanto le sezioni pertinenti.

## Correttezza

- I requisiti e i criteri di accettazione sono soddisfatti.
- I casi limite prevedibili sono gestiti.
- Errori e fallimenti esterni non lasciano lo stato incoerente.
- Le operazioni asincrone gestiscono cancellazione, timeout e concorrenza.
- Non sono presenti regressioni evidenti nei flussi adiacenti.

## Codice

- Nomi, tipi e responsabilità sono chiari.
- Non ci sono duplicazioni evitabili o astrazioni premature.
- Non sono stati aggiunti file o dipendenze inutili.
- Non restano debug log, codice morto, mock permanenti o TODO vaghi.
- La modifica rispetta formatter, lint e convenzioni del repository.

## UI/UX e accessibilità

- Sono presenti stati loading, empty, error e success quando necessari.
- Le azioni non possono essere inviate accidentalmente più volte.
- Focus, tastiera, label, contrasto e target tattili sono adeguati.
- Il layout regge schermi diversi e contenuti lunghi.
- Gli errori mostrati all'utente sono comprensibili e non sensibili.

## Sicurezza e privacy

- Input validati ai confini.
- Autorizzazione verificata lato server.
- Nessun segreto o dato personale nei log.
- Query e comandi sono parametrizzati.
- Token e credenziali usano storage appropriato.
- Upload, redirect, URL e path sono validati.
- Le dipendenze introdotte sono giustificate e affidabili.

## API e dati

- Contratti, codici di stato ed errori sono coerenti.
- Paginazione, idempotenza e rate limiting sono considerati.
- Transazioni e vincoli proteggono l'integrità.
- Migrazioni compatibili e rollback valutati.
- Query N+1 e accessi inutili sono assenti.

## Test e consegna

- Test di regressione aggiunti per i bug quando possibile.
- Test unitari/integrati/E2E scelti in base al rischio.
- Formatter, lint, type-check, test e build eseguiti o motivati.
- La documentazione necessaria è aggiornata.
- Le verifiche non eseguite sono dichiarate senza inventare risultati.
