# Padel App

App mobile (Expo / React Native) per la gestione delle partite di padel: segnapunti
remoto con annuncio vocale, community, statistiche e gamification.

## Stato del progetto

Scaffold completo + **Modulo 1: Segnapunti remoto e audio**, funzionante:

- Motore di punteggio padel puro (`src/features/scoring/padelScoring.ts`): punti,
  giochi, set, tie-break, punto d'oro opzionale, undo tramite replay deterministico
  del log dei punti.
- Schermata Punteggio (`src/screens/ScoreboardScreen.tsx`) con pulsanti grandi
  adatti al controllo remoto, "annulla ultimo punto" e nuova partita.
- Annunciatore vocale in italiano via `expo-speech` (`src/features/audio/announcer.ts`):
  legge il punteggio dopo ogni punto, instradato automaticamente sull'uscita audio
  attiva (incluse casse Bluetooth accoppiate a livello di sistema operativo).
- Input remoto (`src/features/remote/`): livello di astrazione che unifica tre
  sorgenti — pulsanti simulati a schermo, dispositivi BLE con servizio GATT
  personalizzato (`react-native-ble-plx`, richiede build nativa/dev client) e un
  punto di innesto per un futuro modulo nativo Android che intercetti i tasti
  hardware (volume/scatto fotocamera) usati dai telecomandi "cinesi" più economici,
  che si comportano come tastiere HID Bluetooth — vedi il commento in
  `HardwareKeyListener.ts` per il motivo per cui questo richiede codice nativo e
  non è ancora implementato.
- Tema scuro (default), chiaro e chiaro ad alto contrasto, dimensione/famiglia
  del font, tutto persistito localmente (`src/theme/`).

Le schermate **Community**, **Statistiche** e la sezione **Cloud sync** in
Impostazioni sono scaffolding/mock con dati di esempio, pronte per essere
collegate a un backend reale nelle prossime iterazioni.

## Sviluppo

```bash
npm install
npm run start      # Expo dev server (Expo Go per l'anteprima rapida)
npm run web        # anteprima browser
```

Il Bluetooth BLE reale e l'intercettazione dei tasti hardware richiedono una
build nativa (`expo prebuild` + dev client), non funzionano in Expo Go né sul web.
