# Build e firma APK/AAB

## Build debug

```
cd ai-creator-offline
./gradlew assembleOfflineDebug
```

APK in `app/build/outputs/apk/offline/debug/`.

## Build release (firmata)

1. Genera un keystore (una sola volta, conservalo fuori dal repository):
   ```
   keytool -genkeypair -v -keystore aicreator-release.jks \
     -alias aicreator -keyalg RSA -keysize 2048 -validity 10000
   ```
2. Non committare mai il file `.jks` né le password (già esclusi da
   `.gitignore`).
3. Passa le credenziali in fase di build come Gradle properties, ad esempio
   via `~/.gradle/gradle.properties` (fuori dal repo) o variabili `-P`:
   ```
   ./gradlew assembleOfflineRelease \
     -PAICREATOR_STORE_FILE=/percorso/assoluto/aicreator-release.jks \
     -PAICREATOR_STORE_PASSWORD=*** \
     -PAICREATOR_KEY_ALIAS=aicreator \
     -PAICREATOR_KEY_PASSWORD=***
   ```
   Configurazione corrispondente in `app/build.gradle.kts` → `signingConfigs`.
4. Output: `app/build/outputs/apk/offline/release/app-offline-release.apk`.

## Build AAB (per pubblicazione, es. Play Store)

```
./gradlew bundleOfflineRelease
```

Output in `app/build/outputs/bundle/offlineRelease/`.

## Flavor "devTools"

Esiste solo per lo sviluppo (aggiunge `INTERNET` per scaricare pesi di prova
manualmente). **Non pubblicare mai** una build `devTools*`: per la release
usa sempre `offlineRelease`/`offlineDebug`.

## Nota sul wrapper Gradle

`gradle/wrapper/gradle-wrapper.jar` non è incluso in questo export (ambiente
di generazione senza accesso di rete a `services.gradle.org`/`github.com`).
Vedi `gradle/wrapper/WRAPPER_JAR_MANCANTE.md` per completarlo al primo
utilizzo (basta aprire il progetto in Android Studio, oppure eseguire una
volta `gradle wrapper --gradle-version 8.13` con un Gradle locale).
