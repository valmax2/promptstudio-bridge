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

echo "▶ Installo Capacitor + strumenti"
[ -f package.json ] || npm init -y >/dev/null
npm install @capacitor/core @capacitor/cli @capacitor/android
npm install --save-dev @capacitor/assets

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
