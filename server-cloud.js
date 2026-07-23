/**
 * Prompt Studio AI — Cloud Bridge universale (tutte le AI)
 * Deploy gratuito su Render.com / Railway / Glitch
 */

const http = require('http');
const PORT = process.env.PORT || 3000;

const rooms = new Map();

setInterval(() => {
  const now = Date.now();
  for (const [key, val] of rooms) {
    if (val.expiresAt < now) rooms.delete(key);
  }
}, 60 * 60 * 1000);

// ─── Helpers statistiche ─────────────────────────────────────────────────────
function wordCount(s) {
  return (s || '').trim().split(/\s+/).filter(Boolean).length;
}

function byteSize(s) {
  const bytes = Buffer.byteLength(s || '', 'utf8');
  if (bytes < 1024) return `${bytes} B`;
  return `${(bytes / 1024).toFixed(1)} KB`;
}

function estTokens(s) {
  const n = Math.ceil((s || '').length / 4);
  return n >= 1000 ? `~${(n / 1000).toFixed(1)}K` : `~${n}`;
}

function fmtNum(n) {
  return n.toLocaleString('it-IT');
}

// ─── Istruzioni per ogni piattaforma ────────────────────────────────────────
function platformHint(platform) {
  const hints = {
    sd:         '1. Copia il <strong>Positive Prompt</strong> → incollalo nel campo <strong>Positive</strong> di Stable Diffusion WebUI / Forge<br>2. Copia il <strong>Negative Prompt</strong> → incollalo nel campo <strong>Negative</strong><br>3. Premi <strong>Generate</strong>',
    flux:       '1. Copia il <strong>Prompt</strong> → incollalo nel campo testo di <strong>FLUX</strong> (ComfyUI, Fooocus, ecc.)<br>2. I parametri consigliati sono già mostrati sotto<br>3. Premi <strong>Generate</strong>',
    comfyui:    '1. Copia il <strong>Positive Prompt</strong> → incollalo nel nodo <strong>CLIPTextEncode (positive)</strong><br>2. Copia il <strong>Negative Prompt</strong> → incollalo nel nodo <strong>CLIPTextEncode (negative)</strong><br>3. Avvia la coda in ComfyUI',
    midjourney: '1. Copia il <strong>Comando /imagine</strong> completo<br>2. Vai su <strong>Discord → Midjourney Bot</strong><br>3. Incolla il comando e premi Invio',
    dalle:      '1. Copia il <strong>Prompt</strong><br>2. Vai su <strong>chat.openai.com</strong> o <strong>labs.openai.com</strong><br>3. Incolla nel campo immagine e genera',
    leonardo:   '1. Copia il <strong>Positive Prompt</strong><br>2. Vai su <strong>app.leonardo.ai</strong> → Image Generation<br>3. Incolla nel campo Prompt e premi Generate',
  };
  return hints[platform] || '1. Copia il prompt<br>2. Incollalo nella tua AI preferita<br>3. Genera!';
}

// ─── Prompt di sistema per Claude Vision ────────────────────────────────────
function buildVisionPrompt(platform) {
  const ctx = {
    sd:         'Stable Diffusion WebUI / Forge (positive prompt + negative prompt separati)',
    flux:       'FLUX (solo prompt positivo, molto dettagliato e descrittivo)',
    comfyui:    'ComfyUI con Stable Diffusion (positive prompt + negative prompt separati)',
    midjourney: 'Midjourney (formato comando /imagine prompt: ...)',
    dalle:      'DALL-E 3 (descrizione in linguaggio naturale, dettagliata e fluida)',
    leonardo:   'Leonardo.ai (positive prompt + negative prompt separati)',
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

// ─── Parsing risposta Claude ─────────────────────────────────────────────────
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
  const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
  return { positive: lines[0] || text.trim(), negative: '' };
}

function esc(s) {
  return (s || '')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;')
    .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

// ─── Pagina HTML — design iOS ────────────────────────────────────────────────
function buildPage(roomCode, data) {
  const plat      = data?.platform || '';
  const platLabel = data?.platformLabel || plat.toUpperCase();
  const fromPhoto = data?.fromPhoto === true;
  const pos       = data?.positive || '';
  const neg       = data?.negative || '';
  const isMJ      = plat === 'midjourney';
  const isDalle   = plat === 'dalle';
  const isFlux    = plat === 'flux';
  const showMeta  = data && !isMJ && !isDalle;

  // Statistiche positive prompt
  const posStats = pos ? {
    chars:  fmtNum(pos.length),
    words:  fmtNum(wordCount(pos)),
    size:   byteSize(pos),
    tokens: estTokens(pos),
  } : null;

  // Statistiche negative prompt
  const negStats = neg ? {
    chars:  fmtNum(neg.length),
    words:  fmtNum(wordCount(neg)),
    size:   byteSize(neg),
    tokens: estTokens(neg),
  } : null;

  return `<!DOCTYPE html>
<html lang="it">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover">
<title>Prompt Studio · ${roomCode}</title>
<script>
(function(){
  var s=localStorage.getItem('ps-theme');
  if(!s)s=window.matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light';
  document.documentElement.setAttribute('data-theme',s);
})();
</script>
<style>
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}

:root{
  --bg:#F2F2F7;
  --nav-bg:rgba(242,242,247,0.85);
  --surface:#FFFFFF;
  --surface2:#F2F2F7;
  --sep:rgba(60,60,67,0.13);
  --t1:#000000;
  --t2:rgba(60,60,67,0.60);
  --t3:rgba(60,60,67,0.30);
  --accent:#007AFF;
  --green:#34C759;
  --red:#FF3B30;
  --orange:#FF9F0A;
  --shadow:0 1px 3px rgba(0,0,0,0.06),0 4px 16px rgba(0,0,0,0.06);
  --font:-apple-system,BlinkMacSystemFont,'SF Pro Display','Helvetica Neue',sans-serif;
  --mono:'SF Mono',SFMono-Regular,ui-monospace,Menlo,monospace;
}
[data-theme="dark"]{
  --bg:#000000;
  --nav-bg:rgba(28,28,30,0.88);
  --surface:#1C1C1E;
  --surface2:#2C2C2E;
  --sep:rgba(84,84,88,0.55);
  --t1:#FFFFFF;
  --t2:rgba(235,235,245,0.60);
  --t3:rgba(235,235,245,0.25);
  --shadow:0 1px 3px rgba(0,0,0,0.3),0 4px 16px rgba(0,0,0,0.4);
}

html,body{height:100%}
body{font-family:var(--font);background:var(--bg);color:var(--t1);-webkit-font-smoothing:antialiased;transition:background .2s,color .2s}

/* ── Nav bar ── */
.nav{
  position:sticky;top:0;z-index:100;
  height:52px;
  background:var(--nav-bg);
  backdrop-filter:blur(24px) saturate(200%);
  -webkit-backdrop-filter:blur(24px) saturate(200%);
  border-bottom:.5px solid var(--sep);
  display:flex;align-items:center;padding:0 16px;gap:10px;
}
.nav-room{
  font-size:13px;font-family:var(--mono);font-weight:700;
  color:var(--accent);background:rgba(0,122,255,0.10);
  padding:4px 9px;border-radius:7px;letter-spacing:.8px;flex-shrink:0;
}
.nav-title{
  font-size:17px;font-weight:600;letter-spacing:-.4px;
  position:absolute;left:50%;transform:translateX(-50%);
  white-space:nowrap;pointer-events:none;
}
.nav-right{margin-left:auto;display:flex;align-items:center;gap:8px}
.status-pill{
  display:flex;align-items:center;gap:5px;
  font-size:11px;font-weight:600;font-family:var(--mono);
  color:var(--t2);
}
.dot{width:7px;height:7px;border-radius:50%;background:var(--t3)}
.dot.live{background:var(--green);animation:blink 2s infinite}
.dot.photo{background:var(--orange);animation:blink 2s infinite}
@keyframes blink{0%,100%{opacity:1}50%{opacity:.4}}
.theme-btn{
  background:var(--surface2);border:none;border-radius:9px;
  width:32px;height:32px;display:flex;align-items:center;justify-content:center;
  cursor:pointer;font-size:15px;line-height:1;
  transition:opacity .15s,transform .15s;
}
.theme-btn:hover{opacity:.75}
.theme-btn:active{transform:scale(.9)}

/* ── Refresh bar ── */
.rbar{height:2px;background:var(--accent);width:0;position:relative;z-index:101}
.rbar.go{width:100%;transition:width 3s linear}

/* ── Layout ── */
.wrap{max-width:640px;margin:0 auto;padding:20px 16px 48px}

/* ── Empty state ── */
.empty{text-align:center;padding:72px 20px;display:flex;flex-direction:column;align-items:center;gap:14px}
.empty-ico{font-size:60px;filter:drop-shadow(0 4px 14px rgba(0,0,0,.15));line-height:1}
.empty-title{font-size:22px;font-weight:700;letter-spacing:-.5px}
.empty-sub{font-size:15px;color:var(--t2);line-height:1.6;max-width:300px}
.empty-tags{display:flex;flex-wrap:wrap;gap:6px;justify-content:center;margin-top:4px}
.empty-tag{
  font-size:11px;font-weight:600;padding:4px 11px;border-radius:100px;
  background:var(--surface);color:var(--t2);border:.5px solid var(--sep);
}

/* ── Section header ── */
.sh{
  font-size:11px;font-weight:700;letter-spacing:.7px;text-transform:uppercase;
  color:var(--t2);padding:0 4px;margin:20px 0 8px;
}
.sh:first-child{margin-top:4px}

/* ── Card ── */
.card{background:var(--surface);border-radius:16px;overflow:hidden;box-shadow:var(--shadow);margin-bottom:10px}

/* ── Card label ── */
.clabel{
  font-size:10px;font-weight:700;letter-spacing:.9px;text-transform:uppercase;
  padding:12px 16px 0;
}
.clabel.pos{color:var(--green)}
.clabel.neg{color:var(--red)}
.clabel.cmd{color:var(--orange)}

/* ── Prompt text ── */
.ptext{
  font-family:var(--mono);font-size:13px;line-height:1.8;
  color:var(--t1);padding:10px 16px 14px;
  white-space:pre-wrap;word-break:break-word;
}
.ptext.dim{color:var(--t2)}

/* ── Stats row ── */
.stats{
  display:flex;border-top:.5px solid var(--sep);
}
.stat{
  flex:1;display:flex;flex-direction:column;align-items:center;
  padding:10px 4px;gap:3px;
}
.stat+.stat{border-left:.5px solid var(--sep)}
.sv{font-size:14px;font-weight:700;letter-spacing:-.3px;color:var(--t1);line-height:1}
.sk{font-size:9px;font-weight:600;letter-spacing:.4px;text-transform:uppercase;color:var(--t3)}

/* ── Copy button ── */
.crow{border-top:.5px solid var(--sep)}
.cbtn{
  width:100%;background:none;border:none;
  padding:13px 16px;
  font-size:15px;font-weight:600;color:var(--accent);
  font-family:var(--font);cursor:pointer;
  display:flex;align-items:center;justify-content:center;gap:6px;
  transition:background .1s;
}
.cbtn:hover{background:rgba(0,122,255,.06)}
.cbtn:active{background:rgba(0,122,255,.12)}
.cbtn.ok{color:var(--green)}

/* ── Badges ── */
.badges{display:flex;flex-wrap:wrap;gap:7px;margin-bottom:14px}
.badge{
  font-size:12px;font-weight:600;
  padding:5px 12px;border-radius:100px;
  display:inline-flex;align-items:center;gap:5px;line-height:1;
}
.badge-plat{background:rgba(0,122,255,.10);color:var(--accent)}
.badge-photo{background:rgba(255,159,10,.12);color:var(--orange)}

/* ── Photo banner ── */
.pbanner{
  background:var(--surface);border-radius:14px;
  padding:14px 16px;margin-bottom:14px;
  display:flex;align-items:flex-start;gap:12px;
  box-shadow:var(--shadow);
}
.pbanner-ico{font-size:26px;line-height:1;flex-shrink:0;margin-top:2px}
.pbanner-txt{font-size:13px;color:var(--t2);line-height:1.6}
.pbanner-txt strong{color:var(--t1);font-weight:600}

/* ── Meta params ── */
.meta-card{background:var(--surface);border-radius:16px;overflow:hidden;box-shadow:var(--shadow);margin-bottom:10px}
.mrow{
  display:flex;align-items:center;
  padding:12px 16px;border-bottom:.5px solid var(--sep);
  font-size:15px;
}
.mrow:last-child{border-bottom:none}
.mk{color:var(--t1);flex:1}
.mv{color:var(--t2);font-variant-numeric:tabular-nums;font-family:var(--mono);font-size:13px}

/* ── Hint card ── */
.hint-card{
  background:var(--surface);border-radius:16px;
  padding:16px;box-shadow:var(--shadow);margin-bottom:10px;
}
.ht{font-size:10px;font-weight:700;letter-spacing:.9px;text-transform:uppercase;color:var(--accent);margin-bottom:10px}
.hb{font-size:14px;color:var(--t2);line-height:1.85}
.hb strong{color:var(--t1);font-weight:600}

/* ── Timestamp ── */
.ts{text-align:center;font-size:11px;color:var(--t3);margin-top:22px}

@media(max-width:600px){
  .wrap{padding:16px 12px 36px}
  .ptext{font-size:12px}
  .nav-title{font-size:16px}
  .sv{font-size:13px}
}
</style>
</head>
<body>

<nav class="nav">
  <div class="nav-room">${roomCode}</div>
  <div class="nav-title">Prompt Studio AI</div>
  <div class="nav-right">
    <div class="status-pill">
      <div class="dot ${data ? (fromPhoto ? 'photo' : 'live') : ''}"></div>
      <span>${data ? (fromPhoto ? 'Da foto' : 'Pronto') : 'In attesa'}</span>
    </div>
    <button class="theme-btn" onclick="toggleTheme()" title="Cambia tema" aria-label="Cambia tema">
      <span id="theme-ico"></span>
    </button>
  </div>
</nav>

<div class="rbar" id="rbar"></div>

<div class="wrap">

${!data ? `
<div class="empty">
  <div class="empty-ico">📡</div>
  <div class="empty-title">In attesa…</div>
  <div class="empty-sub">Genera un prompt sull'app oppure invia una <strong>📸 foto</strong> per creare il prompt automaticamente.</div>
  <div class="empty-tags">
    <span class="empty-tag">Stable Diffusion</span>
    <span class="empty-tag">FLUX</span>
    <span class="empty-tag">Midjourney</span>
    <span class="empty-tag">DALL·E</span>
    <span class="empty-tag">Leonardo</span>
    <span class="empty-tag">ComfyUI</span>
  </div>
</div>
` : `

<div class="badges">
  ${platLabel ? `<span class="badge badge-plat">◈ ${esc(platLabel)}</span>` : ''}
  ${fromPhoto  ? `<span class="badge badge-photo">📸 Generato da foto</span>` : ''}
</div>

${fromPhoto ? `
<div class="pbanner">
  <div class="pbanner-ico">✨</div>
  <div class="pbanner-txt">Prompt generato automaticamente analizzando la tua foto con <strong>Claude Vision</strong>. Puoi modificarlo prima di copiarlo nella tua AI.</div>
</div>` : ''}

<div class="sh">${isMJ ? 'Comando' : 'Positive Prompt'}</div>
<div class="card">
  <div class="clabel ${isMJ ? 'cmd' : 'pos'}">${isMJ ? '⚡ /imagine' : '◈ Positive'}</div>
  <div class="ptext">${esc(pos)}</div>
  ${posStats ? `
  <div class="stats">
    <div class="stat"><div class="sv">${posStats.chars}</div><div class="sk">Caratteri</div></div>
    <div class="stat"><div class="sv">${posStats.words}</div><div class="sk">Parole</div></div>
    <div class="stat"><div class="sv">${posStats.size}</div><div class="sk">Dimensione</div></div>
    <div class="stat"><div class="sv">${posStats.tokens}</div><div class="sk">Token</div></div>
  </div>` : ''}
  <div class="crow"><button class="cbtn" onclick="cp('pos','cb0')"><span>📋</span><span id="cb0">Copia</span></button></div>
</div>

${neg ? `
<div class="sh">Negative Prompt</div>
<div class="card">
  <div class="clabel neg">✕ Negative</div>
  <div class="ptext dim">${esc(neg)}</div>
  ${negStats ? `
  <div class="stats">
    <div class="stat"><div class="sv">${negStats.chars}</div><div class="sk">Caratteri</div></div>
    <div class="stat"><div class="sv">${negStats.words}</div><div class="sk">Parole</div></div>
    <div class="stat"><div class="sv">${negStats.size}</div><div class="sk">Dimensione</div></div>
    <div class="stat"><div class="sv">${negStats.tokens}</div><div class="sk">Token</div></div>
  </div>` : ''}
  <div class="crow"><button class="cbtn" onclick="cp('neg','cb1')"><span>📋</span><span id="cb1">Copia</span></button></div>
</div>` : ''}

${showMeta && (data.steps || data.cfg || data.size) ? `
<div class="sh">Parametri</div>
<div class="meta-card">
  ${data.steps ? `<div class="mrow"><span class="mk">Steps</span><span class="mv">${esc(String(data.steps))}</span></div>` : ''}
  ${data.cfg   ? `<div class="mrow"><span class="mk">CFG Scale</span><span class="mv">${esc(String(data.cfg))}</span></div>` : ''}
  ${data.size  ? `<div class="mrow"><span class="mk">Dimensione</span><span class="mv">${esc(String(data.size))}</span></div>` : ''}
</div>` : ''}

<div class="sh">Come usarlo</div>
<div class="hint-card">
  <div class="ht">Istruzioni →</div>
  <div class="hb">${platformHint(plat)}</div>
</div>

<div class="ts">Ricevuto alle ${new Date(data.receivedAt).toLocaleTimeString('it-IT')} · Pagina aggiornata automaticamente</div>
`}

</div>

<script>
// Tema
function getTheme(){return localStorage.getItem('ps-theme')||(window.matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light')}
function applyTheme(t){
  document.documentElement.setAttribute('data-theme',t);
  document.getElementById('theme-ico').textContent=t==='dark'?'☀️':'🌙';
}
function toggleTheme(){
  var t=getTheme()==='dark'?'light':'dark';
  localStorage.setItem('ps-theme',t);applyTheme(t);
}
applyTheme(getTheme());

// Copia
function cp(id,btnId){
  var el=document.getElementById(id);
  if(!el)return;
  var txt=(el.innerText||el.textContent||'').trim();
  navigator.clipboard.writeText(txt).then(function(){
    var b=document.getElementById(btnId);
    if(b){b.textContent='✓ Copiato!';var p=b.closest('button');if(p)p.classList.add('ok');
      setTimeout(function(){b.textContent='Copia';if(p)p.classList.remove('ok');},2500);}
  });
}

// Barra refresh
(function(){
  var bar=document.getElementById('rbar');
  requestAnimationFrame(function(){
    requestAnimationFrame(function(){bar.classList.add('go');});
  });
  setTimeout(function(){location.reload();},3000);
})();
</script>
</body>
</html>`;
}

// ─── Router ──────────────────────────────────────────────────────────────────
const server = http.createServer((req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-Api-Key');

  if (req.method === 'OPTIONS') { res.writeHead(204); res.end(); return; }

  const url = req.url || '/';

  // ── POST /api/analyze-photo/:roomCode ────────────────────────────────────
  if (req.method === 'POST' && url.startsWith('/api/analyze-photo/')) {
    const roomCode = url.split('/')[3]?.toUpperCase();
    if (!roomCode || roomCode.length < 4 || roomCode.length > 10) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ ok: false, error: 'Codice stanza non valido' }));
      return;
    }

    let body = '';
    let bodySize = 0;
    const MAX_BODY = 20 * 1024 * 1024;

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
        mimeType      = 'image/jpeg',
        platform      = 'sd',
        platformLabel,
        steps         = '20',
        cfg           = '7',
        size          = '512x512',
      } = payload;

      if (!image) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ ok: false, error: 'Campo "image" (base64) mancante' }));
        return;
      }

      const apiKey = req.headers['x-api-key'] || payload.apiKey || process.env.ANTHROPIC_API_KEY;
      if (!apiKey) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ ok: false, error: 'API key Anthropic mancante (header X-Api-Key o env ANTHROPIC_API_KEY)' }));
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
                { type: 'image', source: { type: 'base64', media_type: mimeType, data: image } },
                { type: 'text', text: buildVisionPrompt(platform) },
              ],
            }],
          }),
        });

        if (!aiResponse.ok) {
          const errText = await aiResponse.text();
          console.error(`[Claude API] ${aiResponse.status}:`, errText);
          res.writeHead(502, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ ok: false, error: `Errore Claude API: ${aiResponse.status}` }));
          return;
        }

        const aiData = await aiResponse.json();
        const rawText = aiData.content?.[0]?.text || '';
        const { positive, negative } = parseGeneratedPrompt(rawText);

        if (!positive) {
          res.writeHead(502, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ ok: false, error: 'Risposta AI non valida' }));
          return;
        }

        rooms.set(roomCode, {
          data: { positive, negative, platform, platformLabel: platformLabel || platform.toUpperCase(), steps, cfg, size, receivedAt: Date.now(), fromPhoto: true },
          expiresAt: Date.now() + 24 * 60 * 60 * 1000,
        });

        console.log(`[${new Date().toLocaleTimeString()}] 📸 Foto → prompt — stanza ${roomCode}`);
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

  // ── POST /api/prompt/:roomCode ───────────────────────────────────────────
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

  // ── GET /r/:roomCode ─────────────────────────────────────────────────────
  if (req.method === 'GET' && url.startsWith('/r/')) {
    const roomCode = url.split('/')[2]?.toUpperCase();
    const entry = rooms.get(roomCode);
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end(buildPage(roomCode || '???', entry?.data ?? null));
    return;
  }

  // ── GET / ────────────────────────────────────────────────────────────────
  if (req.method === 'GET' && (url === '/' || url === '')) {
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end(`<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Prompt Studio AI</title>
    <style>body{font-family:-apple-system,system-ui,sans-serif;background:#000;color:#fff;display:flex;align-items:center;justify-content:center;min-height:100vh;text-align:center}
    h1{font-size:22px;font-weight:700;margin-bottom:8px;letter-spacing:-.4px}
    p{color:rgba(235,235,245,.6);font-size:14px;line-height:1.6}
    code{color:#007AFF;font-family:monospace}</style></head>
    <body><div>
      <h1>🎨 Prompt Studio AI</h1>
      <p>Server bridge attivo.</p>
      <p style="margin-top:12px">
        POST <code>/api/prompt/:roomCode</code><br>
        POST <code>/api/analyze-photo/:roomCode</code><br>
        GET &nbsp;<code>/r/:roomCode</code>
      </p>
    </div></body></html>`);
    return;
  }

  res.writeHead(404); res.end('Not found');
});

server.listen(PORT, () => {
  console.log(`\n  Prompt Studio AI — Cloud Bridge\n  Porta: ${PORT}\n`);
});
