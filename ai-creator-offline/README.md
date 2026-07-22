# AI Creator Offline

App Android per generare immagini con intelligenza artificiale **interamente
sul dispositivo**: nessun server, nessun cloud, nessuna telemetria. Uso
personale, solo contenuti leciti.

Fa parte del mono-repo `promptstudio-bridge` (vedi `../CLAUDE.md` per il
flusso di lavoro cellulare/PC del repository). Questo progetto Android è
completamente indipendente dagli altri progetti del mono-repo
(`server-cloud.js`, `3d-reducer/`, `padel-app/`): non condivide codice né
dipendenze con essi.

## Prima di iniziare

Leggi, in ordine:

1. [`docs/FEASIBILITY.md`](docs/FEASIBILITY.md) — analisi di fattibilità, confronto motori di inferenza, limiti realistici degli smartphone.
2. [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) — architettura MVVM, albero completo del progetto.
3. [`docs/MODEL_CONVERSION.md`](docs/MODEL_CONVERSION.md) — come procurarsi, convertire e importare un modello (nessun modello è incluso).
4. [`docs/TODO.md`](docs/TODO.md) — elenco onesto di cosa manca o non è ancora collegato.
5. [`docs/SIGNING.md`](docs/SIGNING.md) — build debug/release e firma APK/AAB.

## Stato del progetto

Questo è un progetto **reale e compilabile**, non una demo grafica: architettura
completa, tutte le schermate richieste, database cifrato, biometria,
diagnostica hardware reale, Model Manager funzionante, motore di inferenza
collegato a un'API Android reale (MediaPipe Image Generation). **Non include
alcun modello AI** (per licenza e dimensione) e la build di verifica non è
stata eseguita in questo ambiente di generazione del codice per assenza di
Android SDK e di accesso di rete a `dl.google.com`/`services.gradle.org` (vedi
`docs/TODO.md` punto 9). Va aperta in Android Studio per la prima build reale.

## Apertura in Android Studio

1. Apri Android Studio (Iguana o successivo) → "Open" → seleziona la cartella `ai-creator-offline/`.
2. Se richiesto, lascia che Android Studio scarichi/completi il wrapper Gradle (vedi `gradle/wrapper/WRAPPER_JAR_MANCANTE.md`).
3. Lascia sincronizzare Gradle: scaricherà AGP, Kotlin, Compose, Room, SQLCipher, MediaPipe Tasks e le altre dipendenze dichiarate in `gradle/libs.versions.toml`.
4. Seleziona la build variant `offlineDebug` (Build Variants) per il normale sviluppo/test.
5. Esegui su un dispositivo o emulatore con **API 26+** (minSdk 26).

## Build da riga di comando

```
cd ai-creator-offline
./gradlew assembleOfflineDebug      # APK debug
./gradlew assembleOfflineRelease    # APK release (richiede firma, vedi docs/SIGNING.md)
./gradlew bundleOfflineRelease      # AAB per pubblicazione
./gradlew testOfflineDebugUnitTest  # test unitari
```

Il flavor `devTools` esiste solo per lo sviluppo (aggiunge `INTERNET` per
scaricare pesi di test manualmente) e non va mai pubblicato.

## Importare un modello

L'app non contiene modelli AI. Vedi `docs/MODEL_CONVERSION.md` per la
struttura di pacchetto richiesta e come importarne uno dalla schermata
"Modelli" tramite Storage Access Framework.

## Privacy

- Nessun permesso `INTERNET` nella build offline (quella da usare/pubblicare).
- Database locale cifrato con SQLCipher, chiave in Android Keystore.
- Blocco app con biometria/PIN del dispositivo (`BiometricPrompt`).
- Nessun log contiene prompt o percorsi di foto (`util/PrivacyLogger.kt`).
- Pulsante "Cancella tutti i dati" nelle Impostazioni.

Dettagli completi nella schermata in-app "Impostazioni e privacy" e in
`docs/FEASIBILITY.md`.

## Tecnologie

Kotlin, Jetpack Compose, Material 3, MVVM, Repository Pattern, Coroutines/Flow,
Room + SQLCipher, DataStore, Android Keystore, BiometricPrompt, WorkManager,
Storage Access Framework, MediaPipe Tasks (Image Generation). Nessun
framework di dependency injection: grafo costruito a mano in
`AppContainer.kt` (vedi `docs/ARCHITECTURE.md` per il perché).
