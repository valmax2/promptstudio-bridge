# PromptForge Pro

App Android nativa (Kotlin + Jetpack Compose) per costruire prompt professionali
per generatori di immagini (Stable Diffusion, ComfyUI, FLUX, Midjourney, DALL-E,
Leonardo AI) partendo da descrizioni in italiano. Nasce dal master prompt in
`PromptForge_Pro_Android_Master_Prompt.md` (fornito dall'utente), qui riportato
in fasi verificabili come richiesto dal documento stesso (§14).

## Un punto importante prima di tutto

Il master prompt include, alla sezione §6 ("Modalità adulti 18+"), una richiesta
di generare lessico per contenuti sessuali espliciti (nudità, intimità esplicita,
dinamiche dominanti, pose provocanti, fetish) da inviare ai generatori di
immagini. **Questa parte non è stata implementata.** `AdultModeConfig` esiste
solo come toggle minimale (`enabled: Boolean`), senza tassonomia di intensità o
concetti. Tutto il resto del master prompt è stato seguito.

## Stato attuale (fasi completate)

Riferimento alle fasi di §14 del master prompt:

| Fase | Contenuto | Stato |
|---|---|---|
| 1 | Albero del progetto e decisioni architetturali | ✅ (questo file) |
| 2 | File Gradle e catalogo versioni | ✅ |
| 3 | Modelli (`core-model`) e motore prompt (`prompt-engine`) con test | ✅ — 19 test, vedi sotto |
| — | Skeleton app compilabile (walking skeleton): navigazione a 4 sezioni, tema dark | ✅ |
| — | Workflow CI per build APK | ✅ (`.github/workflows/build-promptforge-apk.yml`) |
| 4 | Database e repository (Room): Libreria + Preset, export/import JSON | 🟡 scritta, non compilabile qui (modulo Android) |
| 5 | Traduzione e dettatura (interfacce sostituibili) | 🟡 solo dizionario di fallback (traduzione on-device/LibreTranslate/Ollama mancano); dettatura non iniziata |
| 6 | Director Map: geometria e gesture | ✅ geometria (51 test locali) — 🟡 Compose UI scritta, non compilabile qui |
| 7 | Tutte le schermate (Builder, Libreria, Preset, Impostazioni) | ⬜ solo placeholder — Director Map è pronta ma non ancora agganciata al Builder |
| 8 | Esportazione e client ComfyUI | ⬜ non iniziata |
| 9-10 | Test/lint/build completi, APK funzionante | 🟡 solo lo skeleton è verificato in CI |
| 11 | Istruzioni build/firma/installazione | ⬜ da scrivere quando l'APK avrà contenuto reale |
| — | Pubblicazione su Play Store | ⬜ non iniziata (vedi sotto) |

Le fasi rimanenti si affrontano una alla volta, in sessioni successive (anche a
distanza di giorni, da cellulare o da PC — vedi `CLAUDE.md` alla radice del
repo per il flusso di lavoro).

### Pubblicazione su Play Store (obiettivo futuro)

L'app, così com'è (senza la parte omessa di §6), non contiene nulla che ne
impedisca la pubblicazione. Quando si arriva a quel punto serviranno, sul
modello di `3d-reducer/` e `padel-app/` (vedi i loro `PLAY_STORE.md` e le
pipeline `build-aab.sh`):

- icone reali dell'app (ora c'è solo un'icona di sistema segnaposto);
- una build **AAB firmata** (ora la CI genera solo un APK debug non firmato);
- una privacy policy;
- il `targetSdk` aggiornato a quanto richiesto da Google Play al momento della
  submission (oggi impostato a 34; Google alza il minimo periodicamente, va
  verificato quando ci si avvicina alla pubblicazione, non prima).

## Decisioni architetturali

**Multi-modulo Gradle**, seguendo esattamente la struttura suggerita dal master
prompt (§1):

```
promptforge-pro/
  app/                          — entry point Android, navigazione, DI (Hilt)
  core-ui/                      — tema Compose (dark premium), design system
  core-model/                   — data class di dominio, Kotlin puro
  core-database/                — Room: libreria, preset, cronologia
  core-network/                 — client HTTP verso servizi locali, Kotlin puro
  feature-builder/               — schermata Builder
  feature-director-map/          — mappa camera-soggetto interattiva
  feature-character-consistency/ — consistenza personaggio
  feature-library/                — libreria prompt salvati
  feature-presets/                — preset
  feature-settings/               — impostazioni
  feature-comfyui/                — integrazione ComfyUI
  prompt-engine/                 — motore prompt, Kotlin puro
  translation/                   — traduzione IT→EN, interfacce sostituibili
  speech/                        — dettatura vocale
```

**Moduli Kotlin puri vs moduli Android**: `core-model`, `core-network` e
`prompt-engine` non hanno alcuna dipendenza da Android — usano il plugin
`org.jetbrains.kotlin.jvm`, non `com.android.library`. Questo non è solo una
preferenza stilistica: sono anche gli **unici moduli compilabili e testabili
in un ambiente senza Android SDK** (vedi sotto "Perché non ho potuto verificare
tutto in locale"). Tutti gli altri moduli richiedono il framework Android
(Compose, Room, SpeechRecognizer, ecc.) e sono `com.android.library`.

**Clean Architecture / MVVM**: ogni feature-module segue
`presentation` (Compose + ViewModel/StateFlow) → `domain` (use case, se
servono) → `data` (repository); i livelli condivisi (`core-model`,
`core-database`, `core-network`) restano sotto i moduli feature, mai il
contrario.

**Versionamento dei modelli persistiti**: ogni data class pensata per essere
salvata (Room, DataStore, export JSON) ha un campo `schemaVersion: Int`, come
richiesto da §10, per permettere migrazioni future.

**Hilt** per la dependency injection (scelta esplicitamente permessa da §1
come alternativa "ben motivata": è lo standard de facto per Compose+Android
oggi, con supporto ufficiale Google per `hiltViewModel()` in Navigation
Compose).

## Perché non ho potuto verificare tutto in locale

L'ambiente di sviluppo in cui è stata scritta questa prima fase non ha
l'Android SDK installato, e il proxy di rete blocca l'accesso a
`dl.google.com` (dove vive l'Android Gradle Plugin) e ai release binari di
GitHub (da cui `services.gradle.org` reindirizza per scaricare Gradle
stesso). Concretamente questo significa:

- `core-model` e `prompt-engine` (moduli Kotlin puri, dipendenze solo da Maven
  Central) **sono stati compilati e testati davvero**, con 19 test verdi.
- Tutti i moduli `com.android.library`/`com.android.application` (compreso
  `app` e, dalla Fase 4, `core-database`) **non sono mai stati compilati in
  questo ambiente** — sintassi e struttura sono corrette per quanto ho potuto
  verificare a mano, ma la prima vera prova sarà il workflow GitHub Actions
  (`build-promptforge-apk.yml`) o una build locale sul tuo PC di casa, dove
  l'Android SDK è disponibile normalmente. In particolare le entità Room di
  `core-database` (`LibraryItemEntity`, `PromptPresetEntity`) e i relativi
  mapper verso/da `core-model` non hanno test propri: la logica di
  serializzazione JSON che usano è la stessa già coperta dai test di
  `core-model` (stesso `PromptForgeJson`), ma il collegamento con Room
  (annotazioni, DAO, query SQL) resta da verificare in CI.

Quando lavori da PC la sera, aprire questo progetto in Android Studio e
lasciargli fare il primo sync è il modo più veloce per scoprire eventuali
errori di questa fase 1 (versioni di dipendenze incompatibili, ecc.) — cosa
che qui non ho potuto fare.

## Come compilare

**Da PC (Android Studio o riga di comando), quando l'Android SDK è disponibile:**

```bash
cd promptforge-pro
./gradlew :app:assembleDebug
```

L'APK debug esce in `app/build/outputs/apk/debug/`.

**Dal cloud (GitHub Actions), senza bisogno di nulla in locale:** tab
**Actions** del repository → workflow **"Build PromptForge Pro APK (debug, per
test)"** → **"Run workflow"** (parte anche in automatico ad ogni push su un
branch `claude/mobile-local-work-*` che tocca `promptforge-pro/`). L'APK è
scaricabile come artifact a fine build.

## Test

```bash
cd promptforge-pro
./gradlew test          # tutti i moduli
./gradlew :prompt-engine:test :core-model:test   # solo i moduli Kotlin puri
```
