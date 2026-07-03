# Poly Reducer 3D

App **Android / mobile** per leggere file 3D **OBJ** e **STL** e **ridurre i poligoni
preservando la geometria**, direttamente dal telefono. Anteprima 3D in tempo reale con
uno slider percentuale, poi riesporti il modello alleggerito.

È una **PWA** (Progressive Web App): gira nel browser del telefono, si installa sulla
home come un'app vera e funziona anche **offline**. Volendo, si impacchetta in un vero
**APK** con lo script incluso.

## Cosa fa

- 📂 Apre file **.obj** e **.stl** (ASCII e binari)
- 🔻 Riduce i triangoli con **meshoptimizer** (quadric edge-collapse, lo stesso algoritmo
  usato da glTF/Blender) — mantiene la forma e blocca i bordi aperti (`LockBorder`)
- 🎚️ **Slider "dettaglio mantenuto"** dal 2% al 100% con anteprima 3D immediata
- 📊 Contatore triangoli: originale · attuale · % di riduzione
- 🕸️ Vista **wireframe** per vedere la mesh
- ⤓ **Esporta** in **STL** (binario) o **OBJ**
- 🤏 Controlli touch: un dito ruota, due dita zoom/spostamento

## Provala subito sul telefono (modo più veloce)

Dal PC, nella cartella del progetto:

```bash
node 3d-reducer/serve.js
```

Il terminale stampa un indirizzo tipo `http://192.168.1.20:8080`.
Apri **quell'indirizzo** dal browser del telefono (stessa rete Wi‑Fi) →
menu di Chrome → **"Aggiungi a schermata Home"**. Ora è un'app installata.

> L'app è **completamente autonoma**: le librerie 3D sono incluse nella cartella
> `vendor/`, quindi non serve nessuna connessione a internet né CDN esterni.

In alternativa carica la cartella `3d-reducer/` su un qualsiasi hosting HTTPS statico
(GitHub Pages, Netlify, Vercel…) e apri il link dal telefono.

## Crea un APK vero (opzionale)

Sul PC con **Node 18+**, **JDK 17** e **Android SDK** installati:

```bash
cd 3d-reducer
bash build-apk.sh
```

Genera `…/android/app/build/outputs/apk/debug/app-debug.apk`.
Copialo sul telefono e installalo (abilita "installa da origini sconosciute").

## File

| File | Ruolo |
|------|-------|
| `index.html` | interfaccia |
| `styles.css` | stile mobile |
| `app.js` | logica: caricamento, riduzione, export (Three.js + meshoptimizer) |
| `manifest.webmanifest`, `sw.js`, `icon.svg` | installazione PWA / offline |
| `vendor/` | librerie incluse (Three.js 0.160 + meshoptimizer 0.20) — nessun CDN |
| `serve.js` | server locale per provarla sul telefono |
| `build-apk.sh` | crea l'APK Android con Capacitor |

## Note tecniche

- **Solo geometria**: al caricamento le mesh vengono unificate e i vertici saldati
  (`mergeVertices`), poi si lavora sulle posizioni. UV/materiali non vengono conservati:
  l'obiettivo è alleggerire la geometria.
- La riduzione parte **sempre dall'originale**, quindi spostare lo slider avanti e
  indietro non degrada progressivamente la mesh.
- I vertici inutilizzati vengono rimossi prima dell'export → file puliti.
- **STEP non è supportato** (richiederebbe un kernel CAD tipo OpenCASCADE). Se ti serve,
  converti prima lo STEP in STL/OBJ con uno strumento desktop (es. FreeCAD).
