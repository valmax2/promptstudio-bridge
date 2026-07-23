#!/usr/bin/env bash
#
# Compila l'Android App Bundle FIRMATO per Google Play. Pensato per girare
# su GitHub Actions (vedi .github/workflows/build-polyreducer-aab.yml), non
# in locale - legge la firma da variabili d'ambiente invece che da un file
# keystore.properties.
#
# Variabili d'ambiente richieste:
#   KEYSTORE_PATH, KEYSTORE_PASSWORD, KEY_ALIAS, KEY_PASSWORD
#   VERSION_CODE (intero, deve aumentare ad ogni upload su Play)
#   VERSION_NAME (es. 1.0.0)
#
set -euo pipefail

APP_ID="com.polyreducer.app"
APP_NAME="Poly Reducer 3D"
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

cp "$HERE"/index.html "$HERE"/app.html "$HERE"/tutorial.html "$HERE"/privacy.html \
   "$HERE"/styles.css "$HERE"/app.js "$HERE"/ads.js "$HERE"/billing.js \
   "$HERE"/manifest.webmanifest "$HERE"/sw.js "$HERE"/icon.svg "$BUILD/www/"
cp -r "$HERE"/vendor "$BUILD/www/vendor"
cp -r "$HERE"/assets "$BUILD/www/assets"

cd "$BUILD"

cat > package.json <<'EOF'
{ "name": "polyreducer-capacitor-release", "version": "1.0.0", "private": true }
EOF
npm install @capacitor/core @capacitor/cli @capacitor/android >/dev/null
npm install @capacitor/filesystem @capacitor/share >/dev/null
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

echo "▶ Genero icona e splash dal logo (cartella assets/)"
npx capacitor-assets generate --android || echo "⚠ Generazione icona saltata."

npx cap sync android

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
