#!/usr/bin/env bash
#
# Impacchetta Poly Reducer 3D in un APK Android con Capacitor.
#
# PREREQUISITI (sul tuo PC, una volta sola):
#   - Node.js >= 18            (https://nodejs.org)
#   - Java JDK 17              (Temurin/OpenJDK)
#   - Android SDK              (basta "Command line tools" da developer.android.com,
#                               oppure Android Studio) con variabile ANDROID_HOME impostata
#
# Uso:
#   cd 3d-reducer
#   bash build-apk.sh
#
# Risultato:
#   android/app/build/outputs/apk/debug/app-debug.apk
#   → copialo sul telefono e installalo (abilita "origini sconosciute").
#
set -euo pipefail

APP_ID="com.polyreducer.app"
APP_NAME="Poly Reducer 3D"
HERE="$(cd "$(dirname "$0")" && pwd)"
BUILD="$HERE/.capacitor-build"

echo "▶ Preparo l'ambiente Capacitor in $BUILD"
rm -rf "$BUILD"
mkdir -p "$BUILD/www"

# Copia i file statici dell'app nella cartella 'www' che Capacitor userà come webdir
cp "$HERE"/index.html "$HERE"/app.html "$HERE"/tutorial.html "$HERE"/privacy.html \
   "$HERE"/styles.css "$HERE"/app.js "$HERE"/ads.js "$HERE"/billing.js \
   "$HERE"/manifest.webmanifest "$HERE"/sw.js "$HERE"/icon.svg "$BUILD/www/"
cp -r "$HERE"/vendor "$BUILD/www/vendor"
cp -r "$HERE"/assets "$BUILD/www/assets"

cd "$BUILD"

echo "▶ Inizializzo il progetto npm e installo Capacitor"
npm init -y >/dev/null
npm install @capacitor/core @capacitor/cli @capacitor/android >/dev/null

echo "▶ Inizializzo Capacitor ($APP_ID)"
npx cap init "$APP_NAME" "$APP_ID" --web-dir=www

echo "▶ Aggiungo la piattaforma Android"
npx cap add android
npx cap sync android

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
