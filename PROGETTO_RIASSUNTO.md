# Prompt Studio AI — Riassunto Completo del Progetto

## Cos'è

**Prompt Studio AI** è un'app mobile (iOS/Android) che aiuta l'utente a costruire prompt ottimizzati per le AI generative di immagini. Il cuore del sistema è un **bridge cloud** (server Node.js leggero) che fa da ponte tra il telefono e il browser del PC: l'utente genera il prompt sull'app, preme un pulsante, e il prompt appare automaticamente nel browser del PC pronto per essere copiato e incollato nella AI grafica.

---

## Architettura attuale

```
[App mobile]  →  POST /api/prompt/:roomCode  →  [Server cloud Node.js]
                                                         ↓
[Browser PC]  ←  GET /r/:roomCode  ←─────────────────────┘
                  (polling ogni 3s)
```

### Server: `server-cloud.js` (Node.js puro, zero dipendenze)

- **Storage**: `Map` in memoria — ogni stanza è identificata da un codice di 6 caratteri (es. `A3K9QZ`)
- **Scadenza**: i prompt scadono automaticamente dopo 24 ore
- **Pulizia**: garbage collection ogni ora con `setInterval`
- **Cors**: aperto a tutti gli origin (`*`)
- **Porte**: `process.env.PORT` o 3000

**Endpoint:**
| Metodo | Path | Descrizione |
|--------|------|-------------|
| `POST` | `/api/prompt/:roomCode` | Il telefono invia il prompt (JSON) |
| `GET`  | `/r/:roomCode`          | Il browser PC carica la pagina con il prompt |
| `GET`  | `/`                     | Home page con istruzioni |

### Payload JSON inviato dal telefono

```json
{
  "platform": "sd",
  "platformLabel": "Stable Diffusion",
  "positive": "a beautiful landscape, photorealistic, 8k...",
  "negative": "blurry, low quality, deformed...",
  "steps": 30,
  "cfg": 7.5,
  "size": "512x768"
}
```

**Piattaforme supportate**: `sd`, `flux`, `comfyui`, `midjourney`, `dalle`, `leonardo`

---

## UI della pagina PC (già implementata)

La pagina HTML è generata server-side (nessun framework, template string JS). Design attuale:

- **Sfondo**: `#07070A` (quasi nero)
- **Testo principale**: `#F0F0F6`
- **Accent oro**: `#E8D5A3` (logo + codice stanza)
- **Accent teal**: `#4ECDC4` (positive prompt, pulsante copia)
- **Accent rosso**: `#FF6B6B` (negative prompt)
- **Accent viola**: `#A78BFA` (pills piattaforma, hint)
- **Font**: `Segoe UI` / `system-ui` per testo, `monospace` per prompt e label

**Stati della pagina:**
1. **In attesa** — mostra icona 📡 e messaggio "In attesa del prompt dal telefono…"
2. **Prompt ricevuto** — mostra le card positive/negative, metadati (steps/cfg/size), istruzioni specifiche per piattaforma

**Aggiornamento automatico**: `setTimeout(() => location.reload(), 3000)` — polling ogni 3 secondi.

---

## Deployment

Il server è progettato per deploy gratuiti su:
- **Render.com** (consigliato)
- **Railway**
- **Glitch**

Basta un `npm start` (o `node server-cloud.js`). Non richiede database né variabili d'ambiente obbligatorie.

---

## Cosa si vuole costruire / migliorare

> Da passare a Opus per generare codice e mockup grafici.

### 1. Migliorare la UI della pagina PC

Obiettivi:
- Aggiornamento **senza reload della pagina** (SSE o WebSocket invece del polling ogni 3s)
- Animazione di transizione quando arriva un nuovo prompt
- Visualizzazione della **cronologia ultimi N prompt** nella stessa sessione
- Pulsante "Cancella / Pulisci schermata"
- Indicatore visivo del tempo rimanente prima della scadenza (24h)

### 2. Aggiungere una pagina di setup guidato

Quando l'utente apre `/r/:roomCode` per la prima volta, mostrare una mini-guida:
1. Scansiona il QR code (o inserisci il codice stanza nell'app)
2. Genera un prompt nell'app
3. Premi "Invia al PC"

### 3. Persistenza opzionale

Aggiungere supporto opzionale per **Redis** (variabile env `REDIS_URL`) per sopravvivere ai restart del server, mantenendo la `Map` in memoria come fallback.

### 4. Rate limiting

Limitare le POST a N richieste/minuto per stanza per evitare abusi.

### 5. Modalità "auto-copia"

JavaScript che, al primo arrivo del prompt, esegue automaticamente `navigator.clipboard.writeText()` per il prompt positivo (con consenso utente iniziale).

---

## Stack tecnico

| Componente | Tecnologia |
|------------|------------|
| Server | Node.js 18+, http nativo (zero dipendenze) |
| Storage | Map in memoria (opz. Redis) |
| Frontend | HTML/CSS/JS vanilla generato server-side |
| Deploy | Render / Railway / Glitch |
| App mobile | (non inclusa in questo repo) |

---

## File del repo

```
promptstudio-bridge/
├── server-cloud.js   # tutto il server + UI HTML
└── package.json      # { "start": "node server-cloud.js", engines: node>=18 }
```

---

## Prompt per Opus

Incolla questo testo su Opus e aggiungi una delle richieste seguenti:

- **"Riscrivi la pagina PC con aggiornamento SSE in tempo reale invece del polling."**
- **"Crea un mockup grafico della pagina PC con animazione di arrivo del prompt."**
- **"Aggiungi la cronologia degli ultimi 5 prompt con accordion espandibile."**
- **"Implementa il rate limiting per stanza (10 req/min) senza dipendenze esterne."**
- **"Aggiungi supporto Redis opzionale con fallback alla Map."**
