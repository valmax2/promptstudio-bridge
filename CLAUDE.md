# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Repository overview

This is **not a single application** — it's a loose monorepo hosting three unrelated
projects that happen to share a GitHub repo (and, for one pair, a Pages deployment).
There is no shared build system, package manager workspace, test runner, or lint config
across them. Each project is self-contained in its own top-level directory and should be
treated independently. Most in-app text/comments in `padel-app` and `3d-reducer` are in
Italian; match that when editing those areas.

1. **`server-cloud.js`** (repo root) — a tiny dependency-free Node `http` server ("Prompt
   Studio AI — Cloud Bridge"). Phones POST a generated AI prompt to `/api/prompt/:roomCode`;
   a PC browser opens `/r/:roomCode` and gets back a self-refreshing HTML page (polls via
   `setTimeout(() => location.reload(), 3000)`) showing the prompt with copy buttons and
   per-platform paste instructions (Stable Diffusion, FLUX, ComfyUI, Midjourney, DALL-E,
   Leonardo). State is an in-memory `Map` (`rooms`), entries expire after 24h, swept hourly.
   No database, no external deps — deployed to Render/Railway/Glitch and restarts wipe state.

2. **`3d-reducer/`** — "Poly Reducer 3D", a standalone offline-capable PWA that loads
   OBJ/STL 3D meshes and reduces polygon count with `meshoptimizer` (quadric edge-collapse)
   using Three.js for rendering/export. All third-party libraries are vendored under
   `vendor/` (Three.js 0.160, meshoptimizer 0.20) — **no CDN, no npm deps, no bundler**.
   Also packageable as an Android APK via Capacitor (`build-apk.sh`). This is the app
   deployed to GitHub Pages (see below).

3. **`padel-app/`** — a mobile-first PWA for scoring padel matches (scoreboard, Americano
   rotation mode, Killer/elimination mode, community/friends, events with RSVP push
   notifications, stats, gamification, Bluetooth remote/BLE tag support), optionally backed
   by Firebase (Auth, Firestore, Storage, Cloud Messaging, Cloud Functions). Works fully
   offline/local without Firebase configured. Packaged as an Android app via Capacitor.

Both `3d-reducer` and `padel-app` are plain HTML/CSS/vanilla-ES-modules apps — **no
transpiler, no bundler, no framework**. `<script type="module">` loads `js/app.js` (or
`app.js`) directly in the browser exactly as written; what you edit is what ships.

## Commands

There is no root-level build/lint/test command — nothing to run before committing beyond
manually exercising the relevant sub-project in a browser.

### `server-cloud.js` (Cloud Bridge)
```bash
node server-cloud.js          # or: npm start   (PORT env var, defaults to 3000)
```

### `3d-reducer/` (Poly Reducer 3D)
```bash
node 3d-reducer/serve.js      # or: npm run serve3d
# prints a LAN URL (e.g. http://192.168.1.20:8080) — open it from a phone on the same Wi-Fi
```
Build a debug Android APK (requires Node 18+, JDK 17, Android SDK/`ANDROID_HOME` locally):
```bash
cd 3d-reducer && bash build-apk.sh
# → android/app/build/outputs/apk/debug/app-debug.apk
```

### `padel-app/` (Padel App)
No local server needed for the web app itself — open `padel-app/index.html` (a static
file server is enough if you want service-worker/module behavior to match production).

Build a debug APK locally (requires Node 18+, JDK 17/21, Android SDK):
```bash
cd padel-app && bash build-apk.sh          # full app
cd padel-app && bash build-apk-beta.sh     # "beta" variant, different app id, locked to scoreboard/Bluetooth screens only (see LITE_MODE below)
bash setup-android.sh                      # persistent android/ project for opening in Android Studio
```
Prefer **GitHub Actions** over a local build when just testing on a phone: workflow
`Build Padel App APK (debug, per test)` (`.github/workflows/build-padel-apk.yml`) runs
automatically on push to `claude/padel-app-development-**` branches touching `padel-app/**`,
or can be dispatched manually; download the `padel-app-debug-apk` artifact.

Signed release builds (`build-aab-ci.sh` / `build-padel-aab.yml`) are manual-only
(`workflow_dispatch`) and require repo secrets (`PADEL_KEYSTORE_BASE64`,
`PADEL_KEYSTORE_PASSWORD`, `PADEL_KEY_ALIAS`, `PADEL_KEY_PASSWORD`) — never trigger these
without the user explicitly asking, since they touch the real Play Store signing key.

Firebase deploy (rules + Cloud Functions), from a machine with the Firebase CLI logged in:
```bash
cd padel-app
firebase deploy --only firestore:rules,storage:rules,functions
```

## Architecture notes

### `padel-app/js/` structure
- `app.js` — bootstraps the app: wires the router, theme, TTS, notifications, BLE tag
  reconciliation, and auth-state listener together. Start here to see how modules connect.
- `store.js` — single global state object persisted to `localStorage` (`padel-app-state-v1`),
  with `getState()`/`subscribe()`. This is the only state layer — no Redux/framework.
- `router.js` — minimal hash-based router (`#/route-name`). `registerRoute(name, renderFn)`
  registers a screen; `renderFn` receives a mount element and can return a cleanup function
  (called on navigation away). `LITE_MODE` (see `lite-mode.js`) hard-restricts navigation to
  `['scoreboard', 'bluetooth-setup', 'remote-board']` for the "beta" build variant — this is
  the single choke point that keeps the trimmed build from leaking into full-app screens, so
  don't bypass the router for navigation in new screens.
- `js/screens/*.js` — one file per screen/route, each exporting a `render<Name>` function.
- Game logic lives in dedicated engine modules, kept separate from screen/UI code:
  `scoring.js` (core padel scoring: golden point, tie-break, super tie-break at 6-2/3rd set),
  `americano.js` (partner-rotation tournament pairing/leaderboard), `killer.js`
  (lives/elimination queue mode).
- `speech.js` wraps a **native Android TTS Capacitor plugin** (not the browser Web Speech
  API — that produces no audio inside Android's WebView), so voice announcements work over
  a connected Bluetooth speaker.
- `ble-remote.js` bridges two distinct hardware input paths into one `padel-hw-key` event
  consumed by scoreboard/settings: (a) Bluetooth "keyboard" remotes/smartwatches (HID key
  events, matched by device + single/double/slow-double click pattern), and (b) generic BLE
  "find-my-keys" tags (no standard protocol — the app subscribes to *all* GATT notifications
  from the device and treats any notification as a button press).
- `firebase.js` / `cloud.js` — Firebase integration (auth, Firestore, Storage, FCM). All
  Firebase-dependent features degrade gracefully to local-only mode when
  `padel-app/firebase-config.js` still has placeholder values (`firebaseAvailable()` gates this).
- `native-android/` — hand-written Java sources for the Bluetooth remote/BLE-tag plugin;
  copied into the generated Capacitor Android project by `build-apk.sh` at build time (not
  part of a normal Android Studio project layout).
- `functions/index.js` — Firebase Cloud Functions (push notifications for event invites/RSVPs).

### Build scripts are hand-rolled, not templated Capacitor
Both `3d-reducer/build-apk.sh` and `padel-app/build-apk.sh` write `capacitor.config.json`
directly instead of letting `cap init` generate a `.ts` config (broken on the Node versions
used by GitHub-hosted runners), assign a fresh timestamp-based `versionCode` every build (a
fixed versionCode + fixed debug signature makes some Android launchers silently skip
re-installing updated files), and copy `native-android/` Java sources into the generated
project after `cap add android`. If you touch these scripts, preserve those workarounds —
they're fixing real, previously-hit failures, not defensive boilerplate.

### GitHub Pages deployment (`.github/workflows/pages.yml`)
Manual-dispatch-only workflow that publishes `3d-reducer/` as the site root. It also
checks out a **separate branch** (`claude/sudoku-android-app-33i8qh`, a `sudoku/` project
that lives only there and was never merged to this branch) and copies it in under a
`/sudoku` sub-path — so that project's source will not show up if you only look at the
current branch's tree. Don't "fix" this cross-branch checkout by assuming it's a mistake.

### CI workflows in `.github/workflows/`
- `build-padel-apk.yml` / `build-sudoku-aab.yml` / `build-padel-aab.yml` follow the same
  shape: setup JDK 21 + Node 20 + Android SDK (`platforms;android-34`, `build-tools;34.0.0`),
  run the project's own `build-*.sh`, upload the resulting APK/AAB as an artifact.
- AAB (release) workflows are signing-key-gated and `workflow_dispatch`-only by design —
  treat them as more sensitive than the debug APK workflows.
