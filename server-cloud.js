/**
 * Prompt Studio AI — Cloud Bridge per ComfyUI
 * Deploy gratuito su Render.com / Railway / Glitch
 *
 * Ogni utente ha un codice stanza univoco (6 caratteri).
 * Il telefono invia il prompt → il browser del PC lo mostra.
 * I prompt scadono dopo 24 ore dalla ricezione.
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

// ─── Pagina HTML per il browser PC ─────────────────────────────────────────
function buildPage(roomCode, data) {
  return `<!DOCTYPE html>
<html lang="it">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Prompt Studio AI → ComfyUI</title>
  <style>
    *{box-sizing:border-box;margin:0;padding:0}
    body{font-family:'Segoe UI',system-ui,sans-serif;background:#07070A;color:#F0F0F6;min-height:100vh;padding:24px}
    header{display:flex;align-items:center;gap:12px;margin-bottom:28px;padding-bottom:16px;border-bottom:1px solid #1C1C22}
    .logo{width:32px;height:32px;background:#E8D5A3;border-radius:8px;display:flex;align-items:center;justify-content:center}
    .logo-inner{width:12px;height:12px;background:#07070A;border-radius:3px}
    h1{font-size:14px;font-weight:800;letter-spacing:1px}
    .sub{font-size:10px;color:#72728E;font-family:monospace}
    .room{margin-left:auto;font-family:monospace;font-size:11px;color:#72728E}
    .room strong{color:#E8D5A3;letter-spacing:2px}
    .status{display:inline-block;padding:5px 14px;border-radius:999px;font-size:11px;font-family:monospace;font-weight:700;margin-left:12px}
    .waiting{background:#1C1C22;color:#72728E;border:1px solid #242430}
    .live{background:rgba(78,205,196,.12);color:#4ECDC4;border:1px solid rgba(78,205,196,.3)}
    .empty{text-align:center;padding:80px 20px;color:#72728E;font-family:monospace;font-size:13px;line-height:2.2}
    .empty .icon{font-size:48px;margin-bottom:16px}
    .card{background:#151518;border:1px solid #1C1C22;border-radius:12px;overflow:hidden;margin-bottom:16px}
    .card-head{display:flex;align-items:center;justify-content:space-between;padding:12px 16px;background:#0E0E12;border-bottom:1px solid #1C1C22}
    .pos-lbl{color:#4ECDC4;font-size:10px;font-weight:700;font-family:monospace;letter-spacing:1px}
    .neg-lbl{color:#FF6B6B;font-size:10px;font-weight:700;font-family:monospace;letter-spacing:1px}
    .copy-btn{background:transparent;border:1px solid #2E2E3A;color:#A8A8C4;padding:5px 14px;border-radius:999px;font-size:11px;font-family:monospace;cursor:pointer;transition:all .15s}
    .copy-btn:hover{border-color:#4ECDC4;color:#4ECDC4}
    .copy-btn.ok{border-color:#4ECDC4;color:#4ECDC4;background:rgba(78,205,196,.1)}
    .prompt-text{padding:16px;font-family:monospace;font-size:13px;line-height:1.8;color:#F0F0F6;white-space:pre-wrap;word-break:break-word}
    .neg-text{color:#A8A8C4}
    .meta{display:flex;flex-wrap:wrap;gap:16px;padding:10px 16px;border-top:1px solid #1C1C22;background:#0E0E12;font-family:monospace;font-size:10px;color:#72728E}
    .meta span{color:#A8A8C4}
    .hint{background:rgba(167,139,250,.07);border:1px solid rgba(167,139,250,.2);border-radius:8px;padding:14px 16px;margin-top:20px;font-size:12px;color:#A8A8C4;line-height:1.8}
    .hint strong{color:#A78BFA}
    .ts{text-align:center;font-family:monospace;font-size:10px;color:#424258;margin-top:20px}
    @media(max-width:600px){body{padding:12px}.prompt-text{font-size:12px}}
  </style>
</head>
<body>
<header>
  <div class="logo"><div class="logo-inner"></div></div>
  <div><h1>PROMPT STUDIO AI</h1><div class="sub">bridge → ComfyUI</div></div>
  <div class="room">stanza <strong>${roomCode}</strong><span class="status ${data ? 'live' : 'waiting'}">${data ? '◉ PRONTO' : '◎ IN ATTESA'}</span></div>
</header>

${!data ? `
<div class="empty">
  <div class="icon">📡</div>
  In attesa del prompt dal telefono…<br>
  Genera un prompt su <strong style="color:#E8D5A3">Prompt Studio AI</strong><br>
  e premi <strong style="color:#A78BFA">📡 Invia a ComfyUI PC</strong>
</div>
` : `
<div class="card">
  <div class="card-head">
    <span class="pos-lbl">◈ POSITIVE PROMPT</span>
    <button class="copy-btn" onclick="cp('pos')">Copia</button>
  </div>
  <div class="prompt-text" id="pos">${esc(data.positive)}</div>
  <div class="meta">
    <div>Piattaforma: <span>${(data.platform || '').toUpperCase()}</span></div>
    <div>Steps: <span>${data.steps || '—'}</span></div>
    <div>CFG: <span>${data.cfg || '—'}</span></div>
    <div>Dimensione: <span>${data.size || '—'}</span></div>
  </div>
</div>

${data.negative ? `
<div class="card">
  <div class="card-head">
    <span class="neg-lbl">✕ NEGATIVE PROMPT</span>
    <button class="copy-btn" onclick="cp('neg')">Copia</button>
  </div>
  <div class="prompt-text neg-text" id="neg">${esc(data.negative)}</div>
</div>` : ''}

<div class="hint">
  <strong>Come procedere:</strong><br>
  1. Copia il <strong>Positive Prompt</strong> → incollalo nel nodo <strong>CLIPTextEncode (positive)</strong> di ComfyUI<br>
  2. Copia il <strong>Negative Prompt</strong> → incollalo nel nodo <strong>CLIPTextEncode (negative)</strong><br>
  3. Avvia la generazione in ComfyUI<br>
  <br>
  Questa pagina si aggiorna automaticamente ad ogni nuovo invio dal telefono.
</div>
<div class="ts">Ricevuto alle ${new Date(data.receivedAt).toLocaleTimeString('it-IT')}</div>
`}

<script>
function esc(s){const d=document.createElement('div');d.textContent=s;return d.innerHTML}
function cp(id){
  const el=document.getElementById(id);
  if(!el)return;
  navigator.clipboard.writeText(el.textContent||'').then(()=>{
    const b=document.querySelector(\`[onclick="cp('\${id}')"]\`);
    if(b){b.textContent='✓ Copiato!';b.classList.add('ok');setTimeout(()=>{b.textContent='Copia';b.classList.remove('ok')},2500)}
  });
}
// Auto-refresh ogni 3 secondi per ricevere nuovi prompt
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

// ─── Router ─────────────────────────────────────────────────────────────────
const server = http.createServer((req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') { res.writeHead(204); res.end(); return; }

  const url = req.url || '/';

  // POST /api/prompt/:roomCode  — invia dal telefono
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

  // GET /r/:roomCode  — pagina browser PC
  if (req.method === 'GET' && url.startsWith('/r/')) {
    const roomCode = url.split('/')[2]?.toUpperCase();
    const entry = rooms.get(roomCode);
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end(buildPage(roomCode || '???', entry?.data ?? null));
    return;
  }

  // GET /  — home page con istruzioni
  if (req.method === 'GET' && (url === '/' || url === '')) {
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end(`<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Prompt Studio AI</title>
    <style>body{font-family:system-ui;background:#07070A;color:#F0F0F6;display:flex;align-items:center;justify-content:center;min-height:100vh;text-align:center}
    h1{font-size:20px;margin-bottom:8px}p{color:#72728E;font-size:13px}</style></head>
    <body><div><h1>🎨 Prompt Studio AI</h1><p>Server bridge ComfyUI attivo.</p><p style="margin-top:8px;color:#A78BFA">Apri l'app e genera un prompt.</p></div></body></html>`);
    return;
  }

  res.writeHead(404); res.end('Not found');
});

server.listen(PORT, () => {
  console.log(`\n  Prompt Studio AI — Cloud Bridge\n  Porta: ${PORT}\n`);
});
