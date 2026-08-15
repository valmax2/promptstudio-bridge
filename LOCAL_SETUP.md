# Setup locale (Claude Code CLI)

Nota per le prossime sessioni: questo progetto (contatore punti + altro) viene
sviluppato qui su Claude Code web, ma l'utente deve portarlo in locale sul
proprio PC con Claude Code CLI per poterlo compilare (es. build Android/APK)
da lì, come già fatto per l'app Sudoku in questo stesso repo.

Branch di lavoro: `claude/points-counter-app-824ujb`

## Script di setup locale

Copia e incolla questo blocco nel terminale del tuo PC (richiede git e Node.js
già installati):

```bash
# 1. Clona il repo (salta se lo hai già clonato)
git clone https://github.com/valmax2/promptstudio-bridge.git
cd promptstudio-bridge

# 2. Passa al branch di lavoro
git fetch origin claude/points-counter-app-824ujb
git checkout claude/points-counter-app-824ujb
git pull origin claude/points-counter-app-824ujb

# 3. Installa le dipendenze del progetto (se presenti)
npm install

# 4. Installa Claude Code CLI (se non già installato)
npm install -g @anthropic-ai/claude-code

# 5. Avvia Claude Code nella cartella del progetto
claude
```

Una volta dentro Claude Code CLI in locale, puoi continuare la conversazione
e la sessione riprenderà il contesto del repo (branch, commit, file) da dove
l'hai lasciata qui.
