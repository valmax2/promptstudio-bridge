#!/usr/bin/env bash
#
# Impacchetta Padel App in un APK Android (di TEST, non firmato per il Play
# Store) usando Capacitor.
#
# PREREQUISITI (sul tuo PC, una volta sola):
#   - Node.js >= 18            (https://nodejs.org)
#   - Java JDK 17 o 21         (Temurin/OpenJDK)
#   - Android SDK              ("Command line tools" da developer.android.com,
#                               oppure Android Studio) con ANDROID_HOME impostata
#
# Uso:
#   cd padel-app
#   bash build-apk.sh
#
# Risultato:
#   android/app/build/outputs/apk/debug/app-debug.apk
#   → copialo sul telefono e installalo (abilita "installa da origini sconosciute").
#
# In alternativa, se non vuoi installare nulla sul PC, usa il workflow
# GitHub Actions incluso in .github/workflows/build-padel-apk.yml: apri la
# tab "Actions" del repository su GitHub, lancialo manualmente e scarica
# l'APK generato come allegato (artifact), direttamente dal telefono.
#
set -euo pipefail

APP_ID="com.padelapp.app"
APP_NAME="Padel App"
HERE="$(cd "$(dirname "$0")" && pwd)"
BUILD="$HERE/.capacitor-build"

echo "▶ Preparo l'ambiente Capacitor in $BUILD"
rm -rf "$BUILD"
mkdir -p "$BUILD/www"

cp "$HERE"/index.html "$HERE"/styles.css "$HERE"/manifest.webmanifest \
   "$HERE"/sw.js "$HERE"/icon.svg "$HERE"/firebase-config.js "$BUILD/www/"
cp -r "$HERE"/js "$BUILD/www/js"

cd "$BUILD"

echo "▶ Inizializzo il progetto npm e installo Capacitor"
# Scriviamo il package.json a mano: "npm init -y" deriva il nome pacchetto
# dal nome della cartella, e ".capacitor-build" (che inizia con un punto)
# viene rifiutato da npm come nome non valido.
cat > package.json <<'EOF'
{ "name": "padel-app-capacitor-build", "version": "1.0.0", "private": true }
EOF
npm install @capacitor/core @capacitor/cli @capacitor/android >/dev/null

echo "▶ Inizializzo Capacitor ($APP_ID)"
npx cap init "$APP_NAME" "$APP_ID" --web-dir=www

echo "▶ Aggiungo la piattaforma Android"
npx cap add android
npx cap sync android

echo "▶ Correggo un conflitto Gradle noto (classi Kotlin duplicate: kotlin-stdlib"
echo "  1.8+ include già le estensioni jdk7/jdk8, incluse anche separatamente"
echo "  dalle dipendenze legacy di Capacitor/Cordova)"
cat >> android/build.gradle <<'EOF'

allprojects {
    configurations.all {
        exclude group: 'org.jetbrains.kotlin', module: 'kotlin-stdlib-jdk7'
        exclude group: 'org.jetbrains.kotlin', module: 'kotlin-stdlib-jdk8'
    }
}
EOF

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
