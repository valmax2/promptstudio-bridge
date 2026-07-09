#!/usr/bin/env bash
#
# Compila l'Android App Bundle (.aab) FIRMATO per Google Play, da zero.
# Pensato per l'uso in CI (vedi .github/workflows/build-sudoku-aab.yml):
# non presuppone una cartella android/ già esistente, la crea al volo come
# fa build-apk.sh, ma firma il risultato invece di produrre un debug APK.
#
# Richiede queste variabili d'ambiente (impostate dal workflow da GitHub Secrets):
#   KEYSTORE_PATH       percorso assoluto del file .keystore
#   KEYSTORE_PASSWORD   password del keystore
#   KEY_ALIAS           alias della chiave (es. "upload")
#   KEY_PASSWORD        password della chiave
#   VERSION_CODE        intero, deve aumentare ad ogni upload su Play
#   VERSION_NAME        stringa "umana", es. "1.0.0"
#
set -euo pipefail

: "${KEYSTORE_PATH:?Manca KEYSTORE_PATH}"
: "${KEYSTORE_PASSWORD:?Manca KEYSTORE_PASSWORD}"
: "${KEY_ALIAS:?Manca KEY_ALIAS}"
: "${KEY_PASSWORD:?Manca KEY_PASSWORD}"
: "${VERSION_CODE:?Manca VERSION_CODE}"
: "${VERSION_NAME:?Manca VERSION_NAME}"

APP_ID="com.vstudioapps.sudoku"
APP_NAME="Sudoku VStudio"
HERE="$(cd "$(dirname "$0")" && pwd)"
BUILD="$HERE/.capacitor-build-release"

echo "▶ Preparo l'ambiente Capacitor in $BUILD"
rm -rf "$BUILD"
mkdir -p "$BUILD/www"

cp "$HERE"/index.html "$HERE"/privacy.html "$HERE"/styles.css "$HERE"/sudoku-engine.js "$HERE"/ads.js "$HERE"/billing.js "$HERE"/app.js \
   "$HERE"/manifest.webmanifest "$HERE"/sw.js "$HERE"/icon.svg "$BUILD/www/"
cp -r "$HERE"/assets "$BUILD/assets"

cd "$BUILD"

echo "▶ Inizializzo il progetto npm e installo Capacitor"
echo '{"name":"sudoku-vstudio-release-build","version":"1.0.0","private":true}' > package.json
npm install @capacitor/core @capacitor/cli @capacitor/android >/dev/null

echo "▶ Inizializzo Capacitor ($APP_ID)"
# Fatto PRIMA di installare @capacitor/assets: quel pacchetto porta con sé
# "typescript", e se è già presente "cap init" genera capacitor.config.ts
# invece di .json, il cui parser TS va in errore in questo setup.
npx cap init "$APP_NAME" "$APP_ID" --web-dir=www

echo "▶ Aggiungo la piattaforma Android"
npx cap add android

echo "▶ Genero icona e splash dal logo (assets/)"
npm install --save-dev @capacitor/assets >/dev/null
npx capacitor-assets generate --android

echo "▶ Installo il plugin AdMob (banner/interstitial/rewarded)"
npm install @capacitor-community/admob >/dev/null

npx cap sync android

echo "▶ Forzo una versione coerente di kotlin-stdlib"
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

echo "▶ Aggiungo l'App ID AdMob (di TEST) al manifest"
# ⚠️ Sostituisci con l'App ID AdMob REALE prima di pubblicare (vedi PLAY_ADMOB.md).
sed -i 's|android:theme="@style/AppTheme">|android:theme="@style/AppTheme">\n\n        <meta-data\n            android:name="com.google.android.gms.ads.APPLICATION_ID"\n            android:value="ca-app-pub-3940256099942544~3347511713"/>|' \
  android/app/src/main/AndroidManifest.xml

echo "▶ Imposto versionCode=$VERSION_CODE versionName=$VERSION_NAME"
sed -i "s/versionCode 1/versionCode $VERSION_CODE/" android/app/build.gradle
sed -i "s/versionName \"1.0\"/versionName \"$VERSION_NAME\"/" android/app/build.gradle

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
  echo "✅ AAB firmato pronto:"
  echo "   $AAB"
else
  echo "⚠ Compilazione terminata ma non trovo l'AAB. Controlla i log di Gradle qui sopra."
  exit 1
fi
