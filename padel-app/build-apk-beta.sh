#!/usr/bin/env bash
#
# Variante "beta test" di build-apk.sh: stesso codice, ma con
# LITE_MODE = true (l'app si apre direttamente sul tabellone, senza
# community/eventi/login) e un application ID diverso, così questo APK si
# installa a fianco di quello completo sullo stesso telefono senza
# sovrascriverlo. Pensato da dare agli amici per testare solo telecomandi e
# tag Bluetooth, senza mostrare il resto dell'app.
#
# Uso:
#   cd padel-app
#   bash build-apk-beta.sh
#
set -euo pipefail

APP_ID="com.padelapp.app.beta"
APP_NAME="Padel App Beta"
HERE="$(cd "$(dirname "$0")" && pwd)"
BUILD="$HERE/.capacitor-build-beta"

echo "▶ Uso una keystore di debug fissa (stessa firma a ogni build)"
mkdir -p "$HOME/.android"
cp "$HERE/native-android/keystore/debug.keystore" "$HOME/.android/debug.keystore"

echo "▶ Preparo l'ambiente Capacitor in $BUILD"
rm -rf "$BUILD"
mkdir -p "$BUILD/www"

cp "$HERE"/index.html "$HERE"/styles.css "$HERE"/manifest.webmanifest \
   "$HERE"/sw.js "$HERE"/icon.png "$HERE"/firebase-config.js "$BUILD/www/"
cp -r "$HERE"/js "$BUILD/www/js"

echo "▶ Attivo LITE_MODE (schermata minima, solo tabellone + Bluetooth)"
sed -i "s/export const LITE_MODE = false;/export const LITE_MODE = true;/" "$BUILD/www/js/lite-mode.js"
if ! grep -q "LITE_MODE = true" "$BUILD/www/js/lite-mode.js"; then
  echo "❌ Impossibile attivare LITE_MODE: il pattern atteso non è stato trovato in js/lite-mode.js" >&2
  exit 1
fi

cd "$BUILD"

echo "▶ Inizializzo il progetto npm e installo Capacitor"
cat > package.json <<'EOF'
{ "name": "padel-app-beta-capacitor-build", "version": "1.0.0", "private": true }
EOF
npm install @capacitor/core @capacitor/cli @capacitor/android @capacitor-community/text-to-speech @capacitor/share @capacitor/filesystem >/dev/null
npm install --save-dev @capacitor/assets >/dev/null

echo "▶ Inizializzo Capacitor ($APP_ID)"
cat > capacitor.config.json <<EOF
{"appId":"$APP_ID","appName":"$APP_NAME","webDir":"www","backgroundColor":"#0B1220FF","android":{"backgroundColor":"#0B1220FF"}}
EOF

echo "▶ Aggiungo la piattaforma Android"
npx cap add android

echo "▶ Imposto un versionCode univoco (timestamp) ad ogni build"
VERSION_CODE=$(date +%s)
sed -i "s/versionCode 1\$/versionCode $VERSION_CODE/" android/app/build.gradle
sed -i "s/versionName \"1.0\"/versionName \"1.0.$VERSION_CODE\"/" android/app/build.gradle
if ! grep -q "versionCode $VERSION_CODE" android/app/build.gradle; then
  echo "❌ Impossibile impostare il versionCode univoco" >&2
  exit 1
fi
echo "  → versionCode impostato a $VERSION_CODE"

echo "▶ Genero l'icona nativa dell'app Android da icon.png"
mkdir -p assets
cp "$HERE"/icon.png assets/icon-only.png
if npx capacitor-assets generate --android; then
  # Tengo l'icona adattiva generata (usa icon.png come sfondo a piena tela):
  # cancellarla farebbe ricadere il launcher sulla mipmap "legacy", che
  # Samsung/OneUI e simili riducono con una cornice bianca invece di
  # mostrarla a piena forma.
  echo "  → Icona adattiva generata: la mantengo."
else
  echo "⚠ Generazione icona saltata (l'APK userà l'icona precedente)."
  rm -f android/app/src/main/res/mipmap-anydpi-v26/ic_launcher.xml \
        android/app/src/main/res/mipmap-anydpi-v26/ic_launcher_round.xml
fi

npx cap sync android

echo "▶ Correggo un conflitto Gradle noto (classi Kotlin duplicate)"
cat >> android/build.gradle <<'EOF'

allprojects {
    configurations.all {
        exclude group: 'org.jetbrains.kotlin', module: 'kotlin-stdlib-jdk7'
        exclude group: 'org.jetbrains.kotlin', module: 'kotlin-stdlib-jdk8'
    }
}
EOF

echo "▶ Installo il plugin nativo del telecomando Bluetooth (tasti hardware + tag BLE)"
# I file nativi dichiarano "package com.padelapp.app;" a prescindere
# dall'application ID di questa build (mantenerli invariati evita di dover
# duplicare/reindirizzare tutto il codice nativo per ogni variante) - la
# riga sotto sull'AndroidManifest fa in modo che l'app trovi comunque questa
# MainActivity anche se l'application ID reale è diverso.
JAVA_PKG_DIR="android/app/src/main/java/com/padelapp/app"
mkdir -p "$JAVA_PKG_DIR"
cp "$HERE"/native-android/com/padelapp/app/*.java "$JAVA_PKG_DIR/"

echo "▶ Punto il manifest alla MainActivity nativa (nome completo, non relativo)"
MANIFEST="android/app/src/main/AndroidManifest.xml"
sed -i 's#android:name="\.MainActivity"#android:name="com.padelapp.app.MainActivity"#' "$MANIFEST"
if ! grep -q 'android:name="com.padelapp.app.MainActivity"' "$MANIFEST"; then
  echo "❌ Impossibile ripuntare la MainActivity nel manifest" >&2
  exit 1
fi

echo "▶ Aggiungo i permessi Bluetooth e Billing (acquisti in-app)"
sed -i 's#</manifest>#    <uses-permission android:name="android.permission.BLUETOOTH" android:maxSdkVersion="30" />\n    <uses-permission android:name="android.permission.BLUETOOTH_ADMIN" android:maxSdkVersion="30" />\n    <uses-permission android:name="android.permission.ACCESS_FINE_LOCATION" android:maxSdkVersion="30" />\n    <uses-permission android:name="android.permission.BLUETOOTH_SCAN" android:usesPermissionFlags="neverForLocation" />\n    <uses-permission android:name="android.permission.BLUETOOTH_CONNECT" />\n    <uses-permission android:name="com.android.vending.BILLING" />\n</manifest>#' "$MANIFEST"

echo "▶ Aggiungo l'App ID AdMob al manifest"
sed -i 's#</application>#    <meta-data android:name="com.google.android.gms.ads.APPLICATION_ID" android:value="ca-app-pub-2590590501208291~5366473322"/>\n</application>#' "$MANIFEST"

echo "▶ Aggiungo le dipendenze Gradle per AdMob e Play Billing"
cat >> android/app/build.gradle <<'EOF'

dependencies {
    implementation 'com.google.android.gms:play-services-ads:23.6.0'
    implementation 'com.android.billingclient:billing:7.1.1'
}
EOF

echo "▶ Compilo l'APK di debug (gradlew assembleDebug)"
cd android
chmod +x ./gradlew
./gradlew assembleDebug

APK="$BUILD/android/app/build/outputs/apk/debug/app-debug.apk"
echo ""
if [ -f "$APK" ]; then
  echo "✅ APK beta creato:"
  echo "   $APK"
else
  echo "⚠ Compilazione terminata ma non trovo l'APK. Controlla i log di Gradle qui sopra."
fi
