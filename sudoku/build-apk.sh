#!/usr/bin/env bash
#
# Impacchetta Sudoku VStudio in un APK Android con Capacitor.
#
# PREREQUISITI (sul tuo PC, una volta sola):
#   - Node.js >= 18            (https://nodejs.org)
#   - Java JDK 21              (Temurin/OpenJDK; richiesto da Capacitor 7+)
#   - Android SDK              (bastano le "Command line tools" da developer.android.com,
#                               oppure Android Studio) con variabile ANDROID_HOME impostata
#
# Uso:
#   cd sudoku
#   bash build-apk.sh
#
# Risultato:
#   android/app/build/outputs/apk/debug/app-debug.apk
#   → copialo sul telefono e installalo (abilita "installa da origini sconosciute").
#
set -euo pipefail

APP_ID="com.vstudioapps.sudoku"
APP_NAME="Sudoku VStudio"
HERE="$(cd "$(dirname "$0")" && pwd)"
BUILD="$HERE/.capacitor-build"

echo "▶ Preparo l'ambiente Capacitor in $BUILD"
rm -rf "$BUILD"
mkdir -p "$BUILD/www"

# Copia i file statici dell'app nella cartella 'www' che Capacitor userà come webdir
cp "$HERE"/index.html "$HERE"/styles.css "$HERE"/sudoku-engine.js "$HERE"/app.js \
   "$HERE"/manifest.webmanifest "$HERE"/sw.js "$HERE"/icon.svg "$BUILD/www/"

cd "$BUILD"

echo "▶ Inizializzo il progetto npm e installo Capacitor"
# Non uso "npm init -y": deriverebbe il nome pacchetto dal nome della cartella
# (.capacitor-build), che npm rifiuta perché inizia con un punto.
echo '{"name":"sudoku-vstudio-capacitor-build","version":"1.0.0","private":true}' > package.json
npm install @capacitor/core @capacitor/cli @capacitor/android >/dev/null

echo "▶ Inizializzo Capacitor ($APP_ID)"
npx cap init "$APP_NAME" "$APP_ID" --web-dir=www

echo "▶ Aggiungo la piattaforma Android"
npx cap add android
npx cap sync android

echo "▶ Forzo una versione coerente di kotlin-stdlib"
# Il template cordova-android incluso da Capacitor porta kotlin-stdlib-jdk7/jdk8
# in una versione vecchia (1.6.21) che duplica classi già presenti nel
# kotlin-stdlib più recente tirato in da AndroidX/AGP, causando un errore
# "Duplicate class" in fase di compilazione. Forziamo tutte sulla stessa versione.
cat >> android/build.gradle <<'GRADLE_EOF'

allprojects {
    configurations.all {
        resolutionStrategy {
            force 'org.jetbrains.kotlin:kotlin-stdlib:1.9.24'
            force 'org.jetbrains.kotlin:kotlin-stdlib-jdk7:1.9.24'
            force 'org.jetbrains.kotlin:kotlin-stdlib-jdk8:1.9.24'
        }
    }
}
GRADLE_EOF

echo "▶ Blocco l'orientamento su verticale (portrait)"
sed -i 's/android:name="\.MainActivity"/android:name=".MainActivity"\n            android:screenOrientation="portrait"/' \
  android/app/src/main/AndroidManifest.xml

echo "▶ Compilo l'APK di debug (gradlew assembleDebug)"
cd android
chmod +x ./gradlew
./gradlew assembleDebug

APK="$BUILD/android/app/build/outputs/apk/debug/app-debug.apk"
echo ""
if [ -f "$APK" ]; then
  echo "✅ APK creato:"
  echo "   $APK"
  echo "   Copialo sul telefono e installalo (abilita 'installa da origini sconosciute')."
else
  echo "⚠ Compilazione terminata ma non trovo l'APK. Controlla i log di Gradle qui sopra."
fi
