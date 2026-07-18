#!/usr/bin/env bash
#
# Compila l'Android App Bundle FIRMATO per Google Play. Pensato per girare
# su GitHub Actions (vedi .github/workflows/build-padel-aab.yml), non in
# locale - legge la firma da variabili d'ambiente invece che da un file
# keystore.properties.
#
# Variabili d'ambiente richieste:
#   KEYSTORE_PATH, KEYSTORE_PASSWORD, KEY_ALIAS, KEY_PASSWORD
#   VERSION_CODE (intero, deve aumentare ad ogni upload su Play)
#   VERSION_NAME (es. 1.0.0)
#
set -euo pipefail

APP_ID="com.padelapp.app"
HERE="$(cd "$(dirname "$0")" && pwd)"
BUILD="$HERE/.capacitor-build-release"

: "${KEYSTORE_PATH:?manca KEYSTORE_PATH}"
: "${KEYSTORE_PASSWORD:?manca KEYSTORE_PASSWORD}"
: "${KEY_ALIAS:?manca KEY_ALIAS}"
: "${KEY_PASSWORD:?manca KEY_PASSWORD}"
: "${VERSION_CODE:?manca VERSION_CODE}"
: "${VERSION_NAME:?manca VERSION_NAME}"

echo "▶ Preparo l'ambiente Capacitor in $BUILD"
rm -rf "$BUILD"
mkdir -p "$BUILD/www"

cp "$HERE"/index.html "$HERE"/styles.css "$HERE"/manifest.webmanifest \
   "$HERE"/sw.js "$HERE"/icon.png "$HERE"/firebase-config.js "$BUILD/www/"
cp -r "$HERE"/js "$BUILD/www/js"

cd "$BUILD"

cat > package.json <<'EOF'
{ "name": "padel-app-capacitor-release", "version": "1.0.0", "private": true }
EOF
npm install @capacitor/core @capacitor/cli @capacitor/android @capacitor-community/text-to-speech @capacitor/share @capacitor/filesystem >/dev/null
npm install --save-dev @capacitor/assets >/dev/null

cp "$HERE"/capacitor.config.json .

echo "▶ Aggiungo la piattaforma Android"
npx cap add android

echo "▶ Imposto versionCode=$VERSION_CODE versionName=$VERSION_NAME"
sed -i "s/versionCode 1\$/versionCode $VERSION_CODE/" android/app/build.gradle
sed -i "s/versionName \"1.0\"/versionName \"$VERSION_NAME\"/" android/app/build.gradle
if ! grep -q "versionCode $VERSION_CODE" android/app/build.gradle; then
  echo "❌ Impossibile impostare versionCode: pattern non trovato in android/app/build.gradle" >&2
  exit 1
fi

echo "▶ Genero l'icona nativa dell'app Android da icon.png"
mkdir -p assets
cp "$HERE"/icon.png assets/icon-only.png
npx capacitor-assets generate --android || echo "⚠ Generazione icona saltata."

# Rimuovo l'icona adattiva di default di Capacitor (mipmap-anydpi-v26), che
# su Android 8+ avrebbe priorità sulle mipmap-*/ic_launcher.png appena
# rigenerate e mostrerebbe l'icona sbagliata/rotta.
rm -f android/app/src/main/res/mipmap-anydpi-v26/ic_launcher.xml \
      android/app/src/main/res/mipmap-anydpi-v26/ic_launcher_round.xml

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

echo "▶ Installo i plugin nativi (telecomando Bluetooth, banner AdMob, acquisti Pro)"
JAVA_PKG_DIR="android/app/src/main/java/com/padelapp/app"
mkdir -p "$JAVA_PKG_DIR"
cp "$HERE"/native-android/com/padelapp/app/*.java "$JAVA_PKG_DIR/"

echo "▶ Aggiungo i permessi Bluetooth e Billing (acquisti in-app)"
MANIFEST="android/app/src/main/AndroidManifest.xml"
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

echo "▶ Compilo l'AAB firmato (bundleRelease)"
cd android
chmod +x ./gradlew
./gradlew bundleRelease \
  -Pandroid.injected.signing.store.file="$KEYSTORE_PATH" \
  -Pandroid.injected.signing.store.password="$KEYSTORE_PASSWORD" \
  -Pandroid.injected.signing.key.alias="$KEY_ALIAS" \
  -Pandroid.injected.signing.key.password="$KEY_PASSWORD"

AAB="$BUILD/android/app/build/outputs/bundle/release/app-release.aab"
echo ""
if [ -f "$AAB" ]; then
  echo "✅ AAB firmato pronto per Google Play:"
  echo "   $AAB"
else
  echo "⚠ Build finita ma AAB non trovato. Controlla i log di Gradle qui sopra."
  exit 1
fi
