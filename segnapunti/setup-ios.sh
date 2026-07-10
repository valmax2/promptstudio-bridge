#!/usr/bin/env bash
#
# Setup una tantum del progetto iOS (Capacitor) per Segnapunti.
#
# IMPORTANTE: richiede un Mac con Xcode installato — è un obbligo di Apple,
# iOS non si può compilare da Windows o Linux (nemmeno con questo script).
# Se stasera lavori da Windows/Linux, salta questo script: usa
# setup-android.sh, e torna a questo quando avrai accesso a un Mac
# (anche in cloud, es. Codemagic o GitHub Actions con runner macOS).
#
# Prerequisiti sul Mac: Node 18+, Xcode (con i Command Line Tools) e
# CocoaPods (`sudo gem install cocoapods`).
#
#   cd segnapunti
#   bash setup-ios.sh
#
set -euo pipefail
HERE="$(cd "$(dirname "$0")" && pwd)"
cd "$HERE"

echo "▶ Installo Capacitor + strumenti"
[ -f package.json ] || npm init -y >/dev/null
npm install @capacitor/core @capacitor/cli @capacitor/ios

echo "▶ Copio i file web in www/"
rm -rf www && mkdir -p www
cp index.html styles.css app.js manifest.webmanifest sw.js icon.svg www/

echo "▶ Creo il progetto iOS (usa capacitor.config.json)"
[ -d ios ] || npx cap add ios

echo "▶ Sincronizzo"
npx cap sync ios

echo ""
echo "✅ Setup completo."
echo "   • Apri il progetto in Xcode:   npx cap open ios"
echo "   • Da Xcode: scegli un simulatore o il tuo iPhone collegato e premi ▶."
echo "   • Per pubblicarla su App Store serve un account Apple Developer (99\$/anno)"
echo "     e la firma del certificato, sempre da Xcode."
echo ""
echo "   Nota: su iOS il portachiavi Bluetooth (Web Bluetooth) non è disponibile"
echo "   per scelta di Apple — vedi README.md § iOS per i dettagli."
