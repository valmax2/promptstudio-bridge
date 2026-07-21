# promptstudio-bridge

Mono-repo con più progetti indipendenti:

- **`server-cloud.js`** — Bridge cloud "Prompt Studio AI → ComfyUI/SD/FLUX/ecc.".
  Node puro (`http`), zero dipendenze npm. Avvio: `npm start` (o `node server-cloud.js`).
- **`3d-reducer/`** — "Poly Reducer 3D", PWA + app Android (Capacitor) per ridurre
  poligoni di file OBJ/STL. Avvio dev: `npm run serve3d` (serve in LAN per test da telefono).
  Build APK/AAB: `3d-reducer/build-apk.sh`, `3d-reducer/build-aab.sh`.
- **`padel-app/`** — App Android (Capacitor) per gestire partite di padel, con backend
  Firebase opzionale. Vedi `padel-app/README.md` per build APK via GitHub Actions.

Nessun progetto ha una suite di test o un linter configurato al momento.

## Flusso di lavoro: cellulare fuori casa + PC locale la sera

Questo repo viene lavorato sia da **Claude Code sul web/app mobile** (fuori casa)
sia da **Claude Code CLI in locale** (la sera, a casa). Il ponte tra i due è **git**:

- Una sessione da cellulare lavora su un branch `claude/...` dedicato e fa commit/push
  automaticamente su GitHub man mano che procede — non serve fare nulla di manuale sul telefono.
- Quando ti siedi al PC la sera:
  1. `git fetch origin`
  2. `git checkout <branch-della-sessione-mobile>` (o `git pull` se sei già su quel branch)
  3. Continua a lavorare con Claude Code CLI in locale, come al solito.
  4. Fai push (`git push`) quando hai finito, così la prossima sessione — da cellulare o da PC — riparte da lì.
- Se il branch mobile è già stato mergiato in `main`, riparti da lì: `git checkout main && git pull`.
- Per continuare la sera un lavoro iniziato la mattina da cellulare, riapri la stessa
  sessione/branch invece di farne partire una nuova da `main` — così Claude (mobile o locale)
  mantiene il contesto della conversazione oltre che il codice.

Questo file (`CLAUDE.md`) viene letto automaticamente da ogni sessione, mobile o locale:
tienilo aggiornato quando cambia la struttura del progetto, così non serve rispiegare
il contesto ogni volta che riprendi da un dispositivo diverso.
