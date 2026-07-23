#!/usr/bin/env bash
#
# Setup una tantum del progetto Android (Capacitor) + icone dal logo.
# Da eseguire in 3d-reducer/ dopo aver installato Node 18+, JDK 17 e Android SDK.
#
#   cd 3d-reducer
#   bash setup-android.sh
#
set -euo pipefail
HERE="$(cd "$(dirname "$0")" && pwd)"
cd "$HERE"

echo "▶ Installo Capacitor + strumenti"
[ -f package.json ] || npm init -y >/dev/null
npm install @capacitor/core @capacitor/cli @capacitor/android
npm install @capacitor/filesystem @capacitor/share
npm install --save-dev @capacitor/assets

echo "▶ Copio i file web in www/"
rm -rf www && mkdir -p www
cp index.html app.html tutorial.html privacy.html styles.css app.js ads.js billing.js \
   manifest.webmanifest sw.js icon.svg www/
cp -r vendor www/vendor
cp -r assets www/assets

echo "▶ Creo il progetto Android (usa capacitor.config.json)"
[ -d android ] || npx cap add android

echo "▶ Genero icona e splash dal logo (cartella assets/)"
npx capacitor-assets generate --android

echo "▶ Sincronizzo"
npx cap sync android

echo ""
echo "✅ Setup completo."
echo "   • APK di TEST:   cd android && ./gradlew assembleDebug"
echo "       → android/app/build/outputs/apk/debug/app-debug.apk"
echo "   • AAB per PLAY:  crea la chiave (vedi PLAY_STORE.md § chiave di firma),"
echo "                    poi:  bash build-aab.sh"
