#!/usr/bin/env bash
#
# Setup una tantum del progetto Android (Capacitor) per Sudoku VStudio.
# Da eseguire dopo aver installato Node 18+, JDK 21 e Android SDK.
#
#   cd sudoku
#   bash setup-android.sh
#
set -euo pipefail
HERE="$(cd "$(dirname "$0")" && pwd)"
cd "$HERE"

echo "▶ Installo Capacitor + strumenti"
[ -f package.json ] || npm init -y >/dev/null
npm install @capacitor/core @capacitor/cli @capacitor/android
npm install --save-dev @capacitor/assets

echo "▶ Copio i file web in www/"
rm -rf www && mkdir -p www
cp index.html styles.css sudoku-engine.js app.js manifest.webmanifest sw.js icon.svg www/

echo "▶ Creo il progetto Android (usa capacitor.config.json)"
[ -d android ] || npx cap add android

echo "▶ Genero icona e splash dal logo (icon.svg)"
mkdir -p assets
cp icon.svg assets/icon-only.svg 2>/dev/null || true
npx capacitor-assets generate --android || echo "  (facoltativo: genera icone/splash automaticamente; puoi anche impostarle a mano più tardi)"

echo "▶ Sincronizzo"
npx cap sync android

echo ""
echo "✅ Setup completo."
echo "   • APK di TEST:   cd android && ./gradlew assembleDebug"
echo "       → android/app/build/outputs/apk/debug/app-debug.apk"
echo "   • In alternativa, usa direttamente:  bash build-apk.sh"
