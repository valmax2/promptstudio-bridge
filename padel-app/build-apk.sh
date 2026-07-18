#!/usr/bin/env bash
#
# Impacchetta Padel App in un APK Android (di TEST, non firmato per il Play
# Store) usando Capacitor.
#
# PREREQUISITI (sul tuo PC, una volta sola):
#   - Node.js >= 18            (https://nodejs.org)
#   - Java JDK 17 o 21         (Temurin/OpenJDK)
#   - Android SDK              ("Command line tools" da developer.android.com,
#                               oppure Android Studio) con ANDROID_HOME impostata
#
# Uso:
#   cd padel-app
#   bash build-apk.sh
#
# Risultato:
#   android/app/build/outputs/apk/debug/app-debug.apk
#   → copialo sul telefono e installalo (abilita "installa da origini sconosciute").
#
# In alternativa, se non vuoi installare nulla sul PC, usa il workflow
# GitHub Actions incluso in .github/workflows/build-padel-apk.yml: apri la
# tab "Actions" del repository su GitHub, lancialo manualmente e scarica
# l'APK generato come allegato (artifact), direttamente dal telefono.
#
set -euo pipefail

APP_ID="com.padelapp.app"
APP_NAME="Padel App"
HERE="$(cd "$(dirname "$0")" && pwd)"
BUILD="$HERE/.capacitor-build"

echo "▶ Uso una keystore di debug fissa (stessa firma a ogni build, così puoi"
echo "  installare l'APK aggiornato sopra quello vecchio senza disinstallare)"
mkdir -p "$HOME/.android"
cp "$HERE/native-android/keystore/debug.keystore" "$HOME/.android/debug.keystore"

echo "▶ Preparo l'ambiente Capacitor in $BUILD"
rm -rf "$BUILD"
mkdir -p "$BUILD/www"

cp "$HERE"/index.html "$HERE"/styles.css "$HERE"/manifest.webmanifest \
   "$HERE"/sw.js "$HERE"/icon.png "$HERE"/firebase-config.js "$BUILD/www/"
cp -r "$HERE"/js "$BUILD/www/js"

cd "$BUILD"

echo "▶ Inizializzo il progetto npm e installo Capacitor"
# Scriviamo il package.json a mano: "npm init -y" deriva il nome pacchetto
# dal nome della cartella, e ".capacitor-build" (che inizia con un punto)
# viene rifiutato da npm come nome non valido.
cat > package.json <<'EOF'
{ "name": "padel-app-capacitor-build", "version": "1.0.0", "private": true }
EOF
npm install @capacitor/core @capacitor/cli @capacitor/android @capacitor-community/text-to-speech @capacitor/share @capacitor/filesystem >/dev/null
npm install --save-dev @capacitor/assets >/dev/null

echo "▶ Inizializzo Capacitor ($APP_ID)"
# "npx cap init" genera un capacitor.config.ts, il cui caricamento
# (require.extensions['.ts'] fatto a mano dalla CLI di Capacitor) è rotto
# sulle versioni recenti di Node.js usate dai runner di GitHub Actions
# ("Cannot read properties of undefined (reading 'CommonJS')"). Scriviamo
# invece direttamente un capacitor.config.json equivalente, che Capacitor
# legge nativamente senza bisogno di caricare/eseguire codice TypeScript.
cp "$HERE"/capacitor.config.json .

echo "▶ Aggiungo la piattaforma Android"
npx cap add android

echo "▶ Imposto un versionCode univoco (timestamp) ad ogni build"
# Senza questo, ogni build genera lo stesso versionCode/versionName di
# default di Capacitor ("1" / "1.0"): con la stessa firma E la stessa
# versione, alcuni telefoni/launcher Android considerano l'APK "già
# installato" e non ne aggiornano davvero i file - da qui la necessità di
# disinstallare sempre per vedere le novità. Un versionCode sempre crescente
# fa sì che ogni build sia riconosciuta come un aggiornamento vero.
VERSION_CODE=$(date +%s)
sed -i "s/versionCode 1\$/versionCode $VERSION_CODE/" android/app/build.gradle
sed -i "s/versionName \"1.0\"/versionName \"1.0.$VERSION_CODE\"/" android/app/build.gradle
# sed non fallisce se il pattern non trova corrispondenze: verifichiamo qui
# esplicitamente che la sostituzione sia avvenuta, altrimenti l'APK finirebbe
# silenziosamente con lo stesso versionCode di sempre (da cui il sintomo
# "devo sempre disinstallare per vedere gli aggiornamenti").
if ! grep -q "versionCode $VERSION_CODE" android/app/build.gradle; then
  echo "❌ Impossibile impostare il versionCode univoco: il pattern atteso non è stato trovato in android/app/build.gradle" >&2
  exit 1
fi
echo "  → versionCode impostato a $VERSION_CODE"

echo "▶ Genero l'icona nativa dell'app Android da icon.png"
# Senza questo passaggio l'APK usa l'icona segnaposto generica di Capacitor
# creata da "cap add android": icon.png viene sì copiata in www/ (usata
# solo come favicon dentro la WebView), ma l'icona vera del launcher va
# rigenerata esplicitamente nelle risorse native (android/app/src/main/res).
mkdir -p assets
cp "$HERE"/icon.png assets/icon-only.png
if npx capacitor-assets generate --android; then
  # capacitor-assets rigenera anche l'icona ADATTIVA (mipmap-anydpi-v26) usando
  # icon.png come sfondo a piena tela: VA TENUTA. Cancellarla (come si faceva
  # prima) fa ricadere il launcher sulla sola mipmap/ic_launcher.png "legacy",
  # che launcher come Samsung/OneUI riducono e inseriscono in una cornice
  # bianca per adattarla al proprio stile - da lì l'icona che sembra "piccola
  # dentro un quadrato bianco" invece di riempire tutta la forma.
  echo "  → Icona adattiva generata: la mantengo per evitare il bordo bianco su Samsung/OneUI e simili."
else
  echo "⚠ Generazione icona saltata (l'APK userà l'icona precedente)."
  # Solo se la generazione fallisce davvero rimuoviamo l'icona adattiva di
  # default di Capacitor (punta ai suoi drawable segnaposto blu, non alla
  # nostra): meglio far ripiegare il launcher sulle mipmap-*/ic_launcher.png
  # piatte del progetto base piuttosto che mostrare il blu di Capacitor.
  rm -f android/app/src/main/res/mipmap-anydpi-v26/ic_launcher.xml \
        android/app/src/main/res/mipmap-anydpi-v26/ic_launcher_round.xml
fi

npx cap sync android

echo "▶ Correggo un conflitto Gradle noto (classi Kotlin duplicate: kotlin-stdlib"
echo "  1.8+ include già le estensioni jdk7/jdk8, incluse anche separatamente"
echo "  dalle dipendenze legacy di Capacitor/Cordova)"
cat >> android/build.gradle <<'EOF'

allprojects {
    configurations.all {
        exclude group: 'org.jetbrains.kotlin', module: 'kotlin-stdlib-jdk7'
        exclude group: 'org.jetbrains.kotlin', module: 'kotlin-stdlib-jdk8'
    }
}
EOF

echo "▶ Installo il plugin nativo del telecomando Bluetooth (tasti hardware + tag BLE)"
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

echo "▶ Compilo l'APK di debug (gradlew assembleDebug)"
cd android
chmod +x ./gradlew
./gradlew assembleDebug

APK="$BUILD/android/app/build/outputs/apk/debug/app-debug.apk"
echo ""
if [ -f "$APK" ]; then
  echo "✅ APK creato:"
  echo "   $APK"
  echo "   Copialo sul telefono e installalo (abilita 'installa da origini sconosciute')."
else
  echo "⚠ Compilazione terminata ma non trovo l'APK. Controlla i log di Gradle qui sopra."
fi
