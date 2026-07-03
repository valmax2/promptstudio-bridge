#!/usr/bin/env bash
#
# Crea l'Android App Bundle (.aab) FIRMATO per Google Play.
# Presuppone il progetto Capacitor già creato una volta (vedi PLAY_STORE.md → "Setup una tantum").
#
# Prima esecuzione: leggi PLAY_STORE.md e crea android/ + la chiave di firma.
# Uso normale:
#   cd 3d-reducer
#   bash build-aab.sh
#
# Legge la firma da 3d-reducer/keystore.properties (NON versionato):
#   storeFile=release.keystore
#   storePassword=...
#   keyAlias=upload
#   keyPassword=...
#
set -euo pipefail
HERE="$(cd "$(dirname "$0")" && pwd)"
cd "$HERE"

if [ ! -d android ]; then
  echo "✗ Cartella 'android/' assente. Esegui prima il setup una tantum descritto in PLAY_STORE.md."
  exit 1
fi
if [ ! -f keystore.properties ]; then
  echo "✗ keystore.properties assente. Crealo (vedi PLAY_STORE.md) con storeFile/storePassword/keyAlias/keyPassword."
  exit 1
fi

# carica le proprietà di firma
STORE_FILE=$(grep '^storeFile=' keystore.properties | cut -d= -f2-)
STORE_PASS=$(grep '^storePassword=' keystore.properties | cut -d= -f2-)
KEY_ALIAS=$(grep '^keyAlias=' keystore.properties | cut -d= -f2-)
KEY_PASS=$(grep '^keyPassword=' keystore.properties | cut -d= -f2-)
# percorso assoluto del keystore
case "$STORE_FILE" in /*) KS="$STORE_FILE";; *) KS="$HERE/$STORE_FILE";; esac
[ -f "$KS" ] || { echo "✗ Keystore non trovato: $KS"; exit 1; }

echo "▶ Aggiorno i file web in www/"
mkdir -p www
cp index.html styles.css app.js manifest.webmanifest sw.js icon.svg www/
rm -rf www/vendor && cp -r vendor www/vendor

echo "▶ Sincronizzo Capacitor"
npx cap copy android

echo "▶ Compilo l'AAB firmato (bundleRelease)"
cd android
chmod +x ./gradlew
./gradlew bundleRelease \
  -Pandroid.injected.signing.store.file="$KS" \
  -Pandroid.injected.signing.store.password="$STORE_PASS" \
  -Pandroid.injected.signing.key.alias="$KEY_ALIAS" \
  -Pandroid.injected.signing.key.password="$KEY_PASS"

AAB="$HERE/android/app/build/outputs/bundle/release/app-release.aab"
echo ""
if [ -f "$AAB" ]; then
  echo "✅ AAB firmato pronto per Google Play:"
  echo "   $AAB"
else
  echo "⚠ Build finita ma AAB non trovato. Controlla i log di Gradle."
fi
