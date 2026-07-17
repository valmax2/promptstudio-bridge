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

echo "▶ Uso una keystore di debug fissa (stessa firma a ogni build, così puoi"
echo "  installare l'APK aggiornato sopra quello vecchio senza disinstallare)"
mkdir -p "$HOME/.android"
cp "$HERE/native-android/keystore/debug.keystore" "$HOME/.android/debug.keystore"

echo "▶ Installo Capacitor + strumenti"
[ -f package.json ] || npm init -y >/dev/null
npm install @capacitor/core @capacitor/cli @capacitor/android @capacitor-community/text-to-speech
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

echo "▶ Installo/aggiorno il plugin nativo del telecomando Bluetooth (tasti hardware + tag BLE)"
JAVA_PKG_DIR="android/app/src/main/java/com/padelapp/app"
mkdir -p "$JAVA_PKG_DIR"
cp native-android/com/padelapp/app/*.java "$JAVA_PKG_DIR/"

MANIFEST="android/app/src/main/AndroidManifest.xml"
if ! grep -q "BLUETOOTH_SCAN" "$MANIFEST" 2>/dev/null; then
  echo "▶ Aggiungo i permessi Bluetooth e Billing (acquisti in-app)"
  sed -i 's#</manifest>#    <uses-permission android:name="android.permission.BLUETOOTH" android:maxSdkVersion="30" />\n    <uses-permission android:name="android.permission.BLUETOOTH_ADMIN" android:maxSdkVersion="30" />\n    <uses-permission android:name="android.permission.ACCESS_FINE_LOCATION" android:maxSdkVersion="30" />\n    <uses-permission android:name="android.permission.BLUETOOTH_SCAN" android:usesPermissionFlags="neverForLocation" />\n    <uses-permission android:name="android.permission.BLUETOOTH_CONNECT" />\n    <uses-permission android:name="com.android.vending.BILLING" />\n</manifest>#' "$MANIFEST"
fi
if ! grep -q "APPLICATION_ID" "$MANIFEST" 2>/dev/null; then
  echo "▶ Aggiungo l'App ID AdMob al manifest"
  sed -i 's#</application>#    <meta-data android:name="com.google.android.gms.ads.APPLICATION_ID" android:value="ca-app-pub-2590590501208291~5366473322"/>\n</application>#' "$MANIFEST"
fi
if ! grep -q "play-services-ads" android/app/build.gradle 2>/dev/null; then
  echo "▶ Aggiungo le dipendenze Gradle per AdMob e Play Billing"
  cat >> android/app/build.gradle <<'EOF'

dependencies {
    implementation 'com.google.android.gms:play-services-ads:23.6.0'
    implementation 'com.android.billingclient:billing:7.1.1'
}
EOF
fi

echo "▶ Genero icona e splash dal logo (icon.svg)"
mkdir -p assets
cp icon.svg assets/icon-only.svg 2>/dev/null || true
npx capacitor-assets generate --android || echo "⚠ Generazione icone saltata (opzionale): aggiungi asset in assets/ e rilancia."

# Rimuovo l'icona adattiva di default di Capacitor (mipmap-anydpi-v26), che
# su Android 8+ avrebbe priorità sulle mipmap-*/ic_launcher.png appena
# rigenerate e mostrerebbe l'icona sbagliata/rotta.
rm -f android/app/src/main/res/mipmap-anydpi-v26/ic_launcher.xml \
      android/app/src/main/res/mipmap-anydpi-v26/ic_launcher_round.xml

echo "▶ Sincronizzo"
npx cap sync android

echo ""
echo "✅ Setup completo."
echo "   • APK di TEST:  cd android && ./gradlew assembleDebug"
echo "       → android/app/build/outputs/apk/debug/app-debug.apk"
