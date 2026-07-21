#!/bin/bash
set -euo pipefail

# Solo per le sessioni remote (Claude Code sul web/app mobile): in locale
# l'ambiente resta quello che l'utente ha già configurato.
if [ "${CLAUDE_CODE_REMOTE:-}" != "true" ]; then
  exit 0
fi

# padel-app/functions/ è l'unico pacchetto del repo con dipendenze npm reali
# (firebase-admin, firebase-functions); server-cloud.js e 3d-reducer/ non ne hanno.
if [ -f "$CLAUDE_PROJECT_DIR/padel-app/functions/package.json" ]; then
  (cd "$CLAUDE_PROJECT_DIR/padel-app/functions" && npm install)
fi
