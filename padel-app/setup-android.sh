#!/usr/bin/env bash
#
# Setup una tantum del progetto Android (Capacitor) + icone dal logo, per
# chi vuole continuare a sviluppare l'app in locale con Android Studio.
#
#   cd padel-app
#   bash setup-android.sh
#
set -euo pipefail
HERE="$(cd "$(dirname "$0")" && pwd)"
cd "$HERE"

echo "▶ Uso una keystore di debug fissa (per SHA-1 stabile: serve all'accesso"
echo "  con Google, che altrimenti smetterebbe di funzionare a ogni build)"
mkdir -p "$HOME/.android"
cp "$HERE/native-android/keystore/debug.keystore" "$HOME/.android/debug.keystore"

echo "▶ Installo Capacitor + strumenti"
[ -f package.json ] || npm init -y >/dev/null
npm install @capacitor/core @capacitor/cli @capacitor/android @capacitor-community/text-to-speech @codetrix-studio/capacitor-google-auth
npm install --save-dev @capacitor/assets

echo "▶ Configuro l'accesso con Google (client ID da firebase-config.js)"
GOOGLE_WEB_CLIENT_ID=$(sed -n 's/.*googleWebClientId = "\(.*\)".*/\1/p' "$HERE/firebase-config.js")
node -e "
const fs = require('fs');
const cfg = JSON.parse(fs.readFileSync('capacitor.config.json', 'utf8'));
cfg.plugins = cfg.plugins || {};
cfg.plugins.GoogleAuth = {
  scopes: ['profile', 'email'],
  androidClientId: '$GOOGLE_WEB_CLIENT_ID',
  forceCodeForRefreshToken: false,
};
fs.writeFileSync('capacitor.config.json', JSON.stringify(cfg, null, 2));
"

echo "▶ Copio i file web in www/"
rm -rf www && mkdir -p www
cp index.html styles.css manifest.webmanifest sw.js icon.svg firebase-config.js www/
cp -r js www/js

echo "▶ Creo il progetto Android (usa capacitor.config.json)"
[ -d android ] || npx cap add android

if ! grep -q "kotlin-stdlib-jdk7" android/build.gradle 2>/dev/null; then
  echo "▶ Correggo un conflitto Gradle noto (classi Kotlin duplicate)"
  cat >> android/build.gradle <<'EOF'

allprojects {
    configurations.all {
        exclude group: 'org.jetbrains.kotlin', module: 'kotlin-stdlib-jdk7'
        exclude group: 'org.jetbrains.kotlin', module: 'kotlin-stdlib-jdk8'
    }
}
EOF
fi

echo "▶ Installo/aggiorno il plugin nativo del telecomando Bluetooth (tasti hardware + tag BLE)"
JAVA_PKG_DIR="android/app/src/main/java/com/padelapp/app"
mkdir -p "$JAVA_PKG_DIR"
cp native-android/com/padelapp/app/*.java "$JAVA_PKG_DIR/"

MANIFEST="android/app/src/main/AndroidManifest.xml"
if ! grep -q "BLUETOOTH_SCAN" "$MANIFEST" 2>/dev/null; then
  echo "▶ Aggiungo i permessi Bluetooth per la scansione dei portachiavi BLE"
  sed -i 's#</manifest>#    <uses-permission android:name="android.permission.BLUETOOTH" android:maxSdkVersion="30" />\n    <uses-permission android:name="android.permission.BLUETOOTH_ADMIN" android:maxSdkVersion="30" />\n    <uses-permission android:name="android.permission.ACCESS_FINE_LOCATION" android:maxSdkVersion="30" />\n    <uses-permission android:name="android.permission.BLUETOOTH_SCAN" android:usesPermissionFlags="neverForLocation" />\n    <uses-permission android:name="android.permission.BLUETOOTH_CONNECT" />\n</manifest>#' "$MANIFEST"
fi

echo "▶ Genero icona e splash dal logo (icon.svg)"
mkdir -p assets
cp icon.svg assets/icon-only.svg 2>/dev/null || true
npx capacitor-assets generate --android || echo "⚠ Generazione icone saltata (opzionale): aggiungi asset in assets/ e rilancia."

echo "▶ Sincronizzo"
npx cap sync android

echo ""
echo "✅ Setup completo."
echo "   • APK di TEST:  cd android && ./gradlew assembleDebug"
echo "       → android/app/build/outputs/apk/debug/app-debug.apk"
