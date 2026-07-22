# gradle-wrapper.jar non incluso

Questo sandbox di generazione del codice non ha accesso alla rete verso
`services.gradle.org` / `github.com` (i download binari sono bloccati dalla
policy di rete dell'ambiente), quindi non è stato possibile scaricare e
includere il vero `gradle/wrapper/gradle-wrapper.jar`.

Tutto il resto del wrapper è presente e corretto:
`gradlew`, `gradlew.bat`, `gradle-wrapper.properties` (punta a
Gradle 8.13, coerente con AGP 8.13 dichiarato in `gradle/libs.versions.toml`).

Per completare il wrapper, la prima volta che apri il progetto:

- **Da Android Studio**: apri semplicemente la cartella `ai-creator-offline/`.
  Android Studio rileva il wrapper incompleto e offre di rigenerarlo/scaricarlo
  automaticamente.
- **Da riga di comando**, se hai Gradle installato in locale:
  ```
  cd ai-creator-offline
  gradle wrapper --gradle-version 8.13
  ```
  Questo scarica il jar corretto e completa `gradle/wrapper/`.

Dopo questo passaggio, cancella questo file: non serve più.
