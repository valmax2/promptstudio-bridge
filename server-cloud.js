/**
 * Prompt Studio AI — Cloud Bridge universale (tutte le AI)
 * Deploy gratuito su Render.com / Railway / Glitch
 *
 * Ogni utente ha un codice stanza univoco (6 caratteri).
 * Il telefono invia il prompt → il browser del PC lo mostra.
 * I prompt scadono dopo 24 ore dalla ricezione.
 *
 * ENDPOINT:
 *   POST /api/prompt/:roomCode        — invia prompt testuale dal telefono
 *   POST /api/analyze-photo/:roomCode — invia foto → Claude Vision genera il prompt
 *   GET  /r/:roomCode                 — pagina browser PC
 *
 * VARIABILI D'AMBIENTE:
 *   PORT              (default 3000)
 *   ANTHROPIC_API_KEY — chiave API Claude per l'analisi foto (obbligatoria per /analyze-photo)
 */

const http = require('http');
const PORT = process.env.PORT || 3000;

// Mappa in memoria: roomCode → { data, expiresAt }
const rooms = new Map();

// Pulizia automatica ogni ora
setInterval(() => {
  const now = Date.now();
  for (const [key, val] of rooms) {
    if (val.expiresAt < now) rooms.delete(key);
  }
}, 60 * 60 * 1000);

// ─── Istruzioni per ogni piattaforma ────────────────────────────────────────
function platformHint(platform) {
  const hints = {
    sd:        '1. Copia il <strong>Positive Prompt</strong> → incollalo nel campo <strong>Positive</strong> di Stable Diffusion WebUI / Forge<br>2. Copia il <strong>Negative Prompt</strong> → incollalo nel campo <strong>Negative</strong><br>3. Premi <strong>Generate</strong>',
    flux:      '1. Copia il <strong>Prompt</strong> → incollalo nel campo testo di <strong>FLUX</strong> (ComfyUI, Fooocus, ecc.)<br>2. I parametri consigliati sono già mostrati sotto<br>3. Premi <strong>Generate</strong>',
    comfyui:   '1. Copia il <strong>Positive Prompt</strong> → incollalo nel nodo <strong>CLIPTextEncode (positive)</strong><br>2. Copia il <strong>Negative Prompt</strong> → incollalo nel nodo <strong>CLIPTextEncode (negative)</strong><br>3. Avvia la coda in ComfyUI',
    midjourney:'1. Copia il <strong>Comando /imagine</strong> completo<br>2. Vai su <strong>Discord → Midjourney Bot</strong><br>3. Incolla il comando e premi Invio',
    dalle:     '1. Copia il <strong>Prompt</strong><br>2. Vai su <strong>chat.openai.com</strong> o <strong>labs.openai.com</strong><br>3. Incolla nel campo immagine e genera',
    leonardo:  '1. Copia il <strong>Positive Prompt</strong><br>2. Vai su <strong>app.leonardo.ai</strong> → Image Generation<br>3. Incolla nel campo Prompt e premi Generate',
  };
  return hints[platform] || '1. Copia il prompt<br>2. Incollalo nella tua AI preferita<br>3. Genera!';
}

// ─── Prompt di sistema per Claude Vision ────────────────────────────────────
function buildVisionPrompt(platform) {
  const ctx = {
    sd:        'Stable Diffusion WebUI / Forge (positive prompt + negative prompt separati)',
    flux:      'FLUX (solo prompt positivo, molto dettagliato e descrittivo)',
    comfyui:   'ComfyUI con Stable Diffusion (positive prompt + negative prompt separati)',
    midjourney:'Midjourney (formato comando /imagine prompt: ...)',
    dalle:     'DALL-E 3 (descrizione in linguaggio naturale, dettagliata e fluida)',
    leonardo:  'Leonardo.ai (positive prompt + negative prompt separati)',
  }[platform] || 'Stable Diffusion';

  return `Analizza questa immagine con attenzione e genera un prompt AI professionale ottimizzato per ${ctx}.

Osserva e descrivi accuratamente:
- Soggetto principale, pose e composizione visiva
- Stile artistico (fotorealistico, illustrazione, pittura ad olio, render 3D, anime, ecc.)
- Illuminazione e atmosfera (golden hour, neon lights, studio lighting, cinematic, ecc.)
- Palette colori dominante e mood cromatico
- Sfondo, ambiente e contesto
- Qualità tecnica (4K, ultra detailed, sharp focus, bokeh, HDR, ecc.)
- Mood, emozione e atmosfera complessiva
- Se presenti persone: caratteristiche fisiche, espressione, abbigliamento, acconciatura, posa

Rispondi ESCLUSIVAMENTE con questo JSON (nessun altro testo prima o dopo):
{
  "positive": "prompt positivo dettagliato in inglese, con tag separati da virgola",
  "negative": "elementi da evitare in inglese, tag separati da virgola (lascia vuoto per FLUX e DALL-E)"
}`;
}

// ─── Parsing risposta Claude → { positive, negative } ───────────────────────
function parseGeneratedPrompt(text) {
  try {
    const match = text.match(/\{[\s\S]*\}/);
    if (match) {
      const parsed = JSON.parse(match[0]);
      return {
        positive: (parsed.positive || '').trim(),
        negative: (parsed.negative || '').trim(),
      };
    }
  } catch {}
  // Fallback: prende la prima riga come positive
  const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
  return { positive: lines[0] || text.trim(), negative: '' };
}

// ─── Pagina HTML per il browser PC ──────────────────────────────────────────
function buildPage(roomCode, data) {
  const plat = data?.platform || '';
  const platLabel = data?.platformLabel || plat.toUpperCase();
  const fromPhoto = data?.fromPhoto === true;

  return `<!DOCTYPE html>
<html lang="it">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Prompt Studio AI → ${platLabel || 'PC Bridge'}</title>
  <style>
    *{box-sizing:border-box;margin:0;padding:0}
    body{font-family:'Segoe UI',system-ui,sans-serif;background:#07070A;color:#F0F0F6;min-height:100vh;padding:24px}
    header{display:flex;align-items:center;gap:12px;margin-bottom:28px;padding-bottom:16px;border-bottom:1px solid #1C1C22}
    .logo{width:32px;height:32px;background:#E8D5A3;border-radius:8px;display:flex;align-items:center;justify-content:center}
    .logo-inner{width:12px;height:12px;background:#07070A;border-radius:3px}
    h1{font-size:14px;font-weight:800;letter-spacing:1px}
    .sub{font-size:10px;color:#72728E;font-family:monospace}
    .room{margin-left:auto;font-family:monospace;font-size:11px;color:#72728E;text-align:right}
    .room strong{color:#E8D5A3;letter-spacing:2px}
    .status{display:inline-block;padding:5px 14px;border-radius:999px;font-size:11px;font-family:monospace;font-weight:700;margin-top:4px}
    .waiting{background:#1C1C22;color:#72728E;border:1px solid #242430}
    .live{background:rgba(78,205,196,.12);color:#4ECDC4;border:1px solid rgba(78,205,196,.3)}
    .photo-live{background:rgba(232,213,163,.10);color:#E8D5A3;border:1px solid rgba(232,213,163,.3)}
    .plat-pill{display:inline-block;padding:3px 10px;border-radius:999px;font-size:10px;font-family:monospace;font-weight:700;background:#1C1C22;color:#A78BFA;border:1px solid rgba(167,139,250,.3);margin-bottom:12px;margin-right:8px}
    .photo-pill{display:inline-block;padding:3px 10px;border-radius:999px;font-size:10px;font-family:monospace;font-weight:700;background:rgba(232,213,163,.08);color:#E8D5A3;border:1px solid rgba(232,213,163,.3);margin-bottom:12px}
    .empty{text-align:center;padding:80px 20px;color:#72728E;font-family:monospace;font-size:13px;line-height:2.2}
    .empty .icon{font-size:48px;margin-bottom:16px}
    .card{background:#151518;border:1px solid #1C1C22;border-radius:12px;overflow:hidden;margin-bottom:16px}
    .card-head{display:flex;align-items:center;justify-content:space-between;padding:12px 16px;background:#0E0E12;border-bottom:1px solid #1C1C22}
    .pos-lbl{color:#4ECDC4;font-size:10px;font-weight:700;font-family:monospace;letter-spacing:1px}
    .neg-lbl{color:#FF6B6B;font-size:10px;font-weight:700;font-family:monospace;letter-spacing:1px}
    .photo-lbl{color:#E8D5A3;font-size:10px;font-weight:700;font-family:monospace;letter-spacing:1px}
    .copy-btn{background:transparent;border:1px solid #2E2E3A;color:#A8A8C4;padding:5px 14px;border-radius:999px;font-size:11px;font-family:monospace;cursor:pointer;transition:all .15s}
    .copy-btn:hover{border-color:#4ECDC4;color:#4ECDC4}
    .copy-btn.ok{border-color:#4ECDC4;color:#4ECDC4;background:rgba(78,205,196,.1)}
    .prompt-text{padding:16px;font-family:monospace;font-size:13px;line-height:1.8;color:#F0F0F6;white-space:pre-wrap;word-break:break-word}
    .neg-text{color:#A8A8C4}
    .meta{display:flex;flex-wrap:wrap;gap:16px;padding:10px 16px;border-top:1px solid #1C1C22;background:#0E0E12;font-family:monospace;font-size:10px;color:#72728E}
    .meta span{color:#A8A8C4}
    .hint{background:rgba(167,139,250,.07);border:1px solid rgba(167,139,250,.2);border-radius:8px;padding:14px 16px;margin-top:20px;font-size:12px;color:#A8A8C4;line-height:1.9}
    .hint strong{color:#A78BFA}
    .hint-title{color:#E8D5A3;font-size:11px;font-weight:700;font-family:monospace;letter-spacing:1px;margin-bottom:10px}
    .ts{text-align:center;font-family:monospace;font-size:10px;color:#424258;margin-top:20px}
    .photo-banner{background:rgba(232,213,163,.05);border:1px solid rgba(232,213,163,.15);border-radius:8px;padding:12px 16px;margin-bottom:16px;font-size:12px;color:#E8D5A3;display:flex;align-items:center;gap:10px}
    .photo-banner .icon{font-size:20px;flex-shrink:0}
    @media(max-width:600px){body{padding:12px}.prompt-text{font-size:12px}}
  </style>
</head>
<body>
<header>
  <div class="logo"><div class="logo-inner"></div></div>
  <div><h1>PROMPT STUDIO AI</h1><div class="sub">phone → PC bridge</div></div>
  <div class="room">stanza <strong>${roomCode}</strong><br>
    <span class="status ${data ? (fromPhoto ? 'photo-live' : 'live') : 'waiting'}">
      ${data ? (fromPhoto ? '📸 DA FOTO' : '◉ PRONTO') : '◎ IN ATTESA'}
    </span>
  </div>
</header>

${!data ? `
<div class="empty">
  <div class="icon">📡</div>
  In attesa del prompt dal telefono…<br>
  Genera un prompt su <strong style="color:#E8D5A3">Prompt Studio AI</strong><br>
  oppure invia una <strong style="color:#E8D5A3">📸 foto</strong> per generare il prompt automaticamente<br>
  <br>
  Funziona con <strong style="color:#F0F0F6">tutte le AI</strong>: SD · FLUX · Midjourney · DALL-E · Leonardo · ComfyUI
</div>
` : `
${platLabel ? `<div class="plat-pill">◈ ${platLabel}</div>` : ''}
${fromPhoto ? `<span class="photo-pill">📸 Generato da foto</span>` : ''}

${fromPhoto ? `
<div class="photo-banner">
  <span class="icon">✨</span>
  <div>Prompt generato automaticamente analizzando la tua foto con <strong>Claude Vision</strong>.<br>
  Puoi modificarlo prima di copiarlo nella tua AI.</div>
</div>` : ''}

<div class="card">
  <div class="card-head">
    <span class="pos-lbl">${plat === 'midjourney' ? '⚡ COMANDO /IMAGINE' : '◈ POSITIVE PROMPT'}</span>
    <button class="copy-btn" onclick="cp('pos')">📋 Copia</button>
  </div>
  <div class="prompt-text" id="pos">${esc(data.positive)}</div>
  ${plat !== 'midjourney' && plat !== 'dalle' && plat !== 'flux' ? `<div class="meta">
    <div>Steps: <span>${data.steps || '—'}</span></div>
    <div>CFG: <span>${data.cfg || '—'}</span></div>
    <div>Dimensione: <span>${data.size || '—'}</span></div>
  </div>` : ''}
</div>

${data.negative ? `
<div class="card">
  <div class="card-head">
    <span class="neg-lbl">✕ NEGATIVE PROMPT</span>
    <button class="copy-btn" onclick="cp('neg')">📋 Copia</button>
  </div>
  <div class="prompt-text neg-text" id="neg">${esc(data.negative)}</div>
</div>` : ''}

<div class="hint">
  <div class="hint-title">COME USARLO →</div>
  ${platformHint(plat)}
  <br><br>
  <span style="color:#424258">Questa pagina si aggiorna automaticamente ad ogni nuovo prompt o foto ricevuta dal telefono.</span>
</div>
<div class="ts">Ricevuto alle ${new Date(data.receivedAt).toLocaleTimeString('it-IT')}</div>
`}

<script>
function cp(id){
  const el=document.getElementById(id);
  if(!el)return;
  navigator.clipboard.writeText(el.textContent||'').then(()=>{
    const b=document.querySelector(\`[onclick="cp('\${id}')"]\`);
    if(b){b.textContent='✓ Copiato!';b.classList.add('ok');setTimeout(()=>{b.textContent='📋 Copia';b.classList.remove('ok')},2500)}
  });
}
setTimeout(()=>location.reload(), 3000);
</script>
</body>
</html>`;
}

function esc(s) {
  return (s || '')
    .replace(/&/g,'&amp;').replace(/</g,'&lt;')
    .replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

// ─── Router ──────────────────────────────────────────────────────────────────
const server = http.createServer((req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-Api-Key');

  if (req.method === 'OPTIONS') { res.writeHead(204); res.end(); return; }

  const url = req.url || '/';

  // ── POST /api/analyze-photo/:roomCode ── analizza foto con Claude Vision ──
  if (req.method === 'POST' && url.startsWith('/api/analyze-photo/')) {
    const roomCode = url.split('/')[3]?.toUpperCase();
    if (!roomCode || roomCode.length < 4 || roomCode.length > 10) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ ok: false, error: 'Codice stanza non valido' }));
      return;
    }

    let body = '';
    let bodySize = 0;
    const MAX_BODY = 20 * 1024 * 1024; // 20 MB (base64 ≈ 15 MB immagine originale)

    req.on('data', chunk => {
      bodySize += chunk.length;
      if (bodySize <= MAX_BODY) body += chunk;
    });

    req.on('end', async () => {
      if (bodySize > MAX_BODY) {
        res.writeHead(413, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ ok: false, error: 'Immagine troppo grande (max ~15 MB)' }));
        return;
      }

      let payload;
      try { payload = JSON.parse(body); }
      catch {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ ok: false, error: 'JSON non valido' }));
        return;
      }

      const {
        image,
        mimeType    = 'image/jpeg',
        platform    = 'sd',
        platformLabel,
        steps       = '20',
        cfg         = '7',
        size        = '512x512',
      } = payload;

      if (!image) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ ok: false, error: 'Campo "image" (base64) mancante' }));
        return;
      }

      // API key: header X-Api-Key → body.apiKey → variabile d'ambiente
      const apiKey = req.headers['x-api-key'] || payload.apiKey || process.env.ANTHROPIC_API_KEY;
      if (!apiKey) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ ok: false, error: 'API key Anthropic mancante (imposta ANTHROPIC_API_KEY sul server o inviala nell\'header X-Api-Key)' }));
        return;
      }

      try {
        const aiResponse = await fetch('https://api.anthropic.com/v1/messages', {
          method: 'POST',
          headers: {
            'x-api-key': apiKey,
            'anthropic-version': '2023-06-01',
            'content-type': 'application/json',
          },
          body: JSON.stringify({
            model: 'claude-opus-4-8',
            max_tokens: 1500,
            messages: [{
              role: 'user',
              content: [
                {
                  type: 'image',
                  source: { type: 'base64', media_type: mimeType, data: image },
                },
                {
                  type: 'text',
                  text: buildVisionPrompt(platform),
                },
              ],
            }],
          }),
        });

        if (!aiResponse.ok) {
          const errText = await aiResponse.text();
          console.error(`[Claude API] Errore ${aiResponse.status}:`, errText);
          res.writeHead(502, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ ok: false, error: `Errore Claude API: ${aiResponse.status}` }));
          return;
        }

        const aiData = await aiResponse.json();
        const rawText = aiData.content?.[0]?.text || '';
        const { positive, negative } = parseGeneratedPrompt(rawText);

        if (!positive) {
          res.writeHead(502, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ ok: false, error: 'Claude non ha restituito un prompt valido' }));
          return;
        }

        const data = {
          positive,
          negative,
          platform,
          platformLabel: platformLabel || platform.toUpperCase(),
          steps,
          cfg,
          size,
          receivedAt: Date.now(),
          fromPhoto: true,
        };

        rooms.set(roomCode, {
          data,
          expiresAt: Date.now() + 24 * 60 * 60 * 1000,
        });

        console.log(`[${new Date().toLocaleTimeString()}] 📸 Foto analizzata → prompt generato — stanza ${roomCode}`);

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ ok: true, positive, negative }));

      } catch (err) {
        console.error('Errore analyze-photo:', err);
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ ok: false, error: 'Errore interno del server' }));
      }
    });

    return;
  }

  // ── POST /api/prompt/:roomCode ── invia prompt testuale dal telefono ───────
  if (req.method === 'POST' && url.startsWith('/api/prompt/')) {
    const roomCode = url.split('/')[3]?.toUpperCase();
    if (!roomCode || roomCode.length < 4 || roomCode.length > 10) {
      res.writeHead(400); res.end('Codice stanza non valido'); return;
    }
    let body = '';
    req.on('data', c => { body += c; });
    req.on('end', () => {
      try {
        const data = JSON.parse(body);
        rooms.set(roomCode, {
          data: { ...data, receivedAt: Date.now() },
          expiresAt: Date.now() + 24 * 60 * 60 * 1000,
        });
        console.log(`[${new Date().toLocaleTimeString()}] Prompt ricevuto — stanza ${roomCode}`);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ ok: true }));
      } catch {
        res.writeHead(400); res.end('JSON non valido');
      }
    });
    return;
  }

  // ── GET /r/:roomCode ── pagina browser PC ──────────────────────────────────
  if (req.method === 'GET' && url.startsWith('/r/')) {
    const roomCode = url.split('/')[2]?.toUpperCase();
    const entry = rooms.get(roomCode);
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end(buildPage(roomCode || '???', entry?.data ?? null));
    return;
  }

  // ── GET / ── home page ────────────────────────────────────────────────────
  if (req.method === 'GET' && (url === '/' || url === '')) {
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end(`<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Prompt Studio AI</title>
    <style>body{font-family:system-ui;background:#07070A;color:#F0F0F6;display:flex;align-items:center;justify-content:center;min-height:100vh;text-align:center}
    h1{font-size:20px;margin-bottom:8px}p{color:#72728E;font-size:13px}code{color:#A78BFA;font-family:monospace}</style></head>
    <body><div>
      <h1>🎨 Prompt Studio AI</h1>
      <p>Server bridge attivo.</p>
      <p style="margin-top:8px;color:#A78BFA">Apri l'app e genera un prompt oppure invia una foto.</p>
      <p style="margin-top:16px;font-size:11px;color:#424258">
        POST <code>/api/prompt/:roomCode</code> — prompt testuale<br>
        POST <code>/api/analyze-photo/:roomCode</code> — foto → prompt AI<br>
        GET &nbsp;<code>/r/:roomCode</code> — visualizza sul PC
      </p>
    </div></body></html>`);
    return;
  }

  res.writeHead(404); res.end('Not found');
});

server.listen(PORT, () => {
  console.log(`\n  Prompt Studio AI — Cloud Bridge\n  Porta: ${PORT}\n`);
});
