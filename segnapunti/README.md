# Segnapunti

App **mobile** per tenere il punteggio di partite di **padel, tennis** o giochi a **punti
liberi**. Funzionamento ispirato ai segnapunti sportivi professionali (setup squadre,
punteggio tennis con game/set/tiebreak, servizio, annulla punto), con grafica e UX
progettate da zero.

È una **PWA**: gira nel browser del telefono, si installa sulla home come un'app vera e
funziona **offline**. Si impacchetta in un vero **APK** con lo script incluso.

## Cosa fa

- **Setup partita**: nome squadra + giocatori (singolo o doppio), colore squadra a
  scelta tra 8 combinazioni curate (le due squadre non possono mai avere lo stesso colore)
- **Modalità Tennis/Padel**: punteggio 0‑15‑30‑40, vantaggio, game, set con **tiebreak
  automatico al 6‑6**, partita al meglio di 1, 3 o 5 set
- **Modalità Punti liberi**: contatore punti semplice, per giochi non tennistici
- **Servizio**: indica automaticamente chi serve (alterna tra i giocatori in doppio) e il
  lato (DX/SX)
- **Annulla punto**: undo completo dell'ultima azione (stack di cronologia)
- **Ricomincia / Rivincita / Nuova partita**: dal menu impostazioni o dalla schermata di
  vittoria
- **Ripresa automatica**: se chiudi l'app a metà partita, la ritrovi come l'hai lasciata
  (salvataggio locale)
- Vibrazione leggera ad ogni punto (se supportata dal dispositivo)

## Provala subito sul telefono (modo più veloce)

Dal PC, nella cartella del progetto:

```bash
node segnapunti/serve.js
```

Il terminale stampa un indirizzo tipo `http://192.168.1.20:8081`.
Apri **quell'indirizzo** dal browser del telefono (stessa rete Wi‑Fi) →
menu di Chrome → **"Aggiungi a schermata Home"**. Ora è un'app installata.

## Crea un APK vero (opzionale)

Sul PC con **Node 18+**, **JDK 17** e **Android SDK** installati:

```bash
cd segnapunti
bash setup-android.sh
cd android && ./gradlew assembleDebug
```

Genera `android/app/build/outputs/apk/debug/app-debug.apk`. Copialo sul telefono e
installalo (abilita "installa da origini sconosciute").

## File

| File | Ruolo |
|------|-------|
| `index.html` | struttura (schermata setup + schermata partita) |
| `styles.css` | design system e stile mobile |
| `app.js` | logica: setup, motore punteggio tennis/padel, punti liberi, undo, persistenza |
| `manifest.webmanifest`, `sw.js`, `icon.svg` | installazione PWA / offline |
| `serve.js` | server locale per provarla sul telefono |
| `setup-android.sh` | crea il progetto Android (Capacitor) per generare l'APK |

## Note

- Bluetooth (pulsanti fisici esterni) e login/account **non sono ancora inclusi**: è la
  prima versione, scoring-only. Si possono aggiungere in un secondo momento.
- Il tiebreak semplifica la rotazione del servizio (l'alternanza server/lato durante il
  tiebreak segue la logica standard di inizio/fine game, non il cambio ogni 2 punti).
