const Share = () => window.Capacitor?.Plugins?.Share;
const Filesystem = () => window.Capacitor?.Plugins?.Filesystem;

export function matchShareSupported() {
  return !!(Share() && Filesystem());
}

// Firebase Storage non ha (e non c'è motivo di configurare) intestazioni
// CORS per l'origine dell'app: un <img crossOrigin="anonymous"> caricato
// direttamente dal browser fallisce quindi in silenzio (onerror, catturato
// più sotto) ogni volta che si prova a disegnare uno sfondo/cornice
// personalizzati sul canvas, ricadendo sempre sul default senza nessun
// errore visibile - da qui "carico l'immagine ma non la mette mai".
// CapacitorHttp gira lato nativo Android, non passa dal motore CORS del
// browser: quando disponibile, scarica i byte così ed espone l'immagine
// come data: URL (già "stessa origine", nessun crossOrigin necessario).
async function resolveImageSrc(url) {
  const httpPlugin = window.Capacitor?.Plugins?.CapacitorHttp;
  if (!httpPlugin) return url;
  try {
    const res = await httpPlugin.get({ url, responseType: 'blob' });
    const contentType = res.headers?.['Content-Type'] || res.headers?.['content-type'] || 'image/png';
    return `data:${contentType};base64,${res.data}`;
  } catch {
    return url;
  }
}

async function loadImage(url) {
  const src = await resolveImageSrc(url);
  return new Promise((resolve, reject) => {
    const img = new Image();
    // Serve solo se siamo ricaduti sull'URL remoto originale (plugin nativo
    // non disponibile, es. anteprima da browser in sviluppo) - un data: URL
    // è già locale e non ne ha bisogno.
    if (src === url) img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

// Disegna il fondo: sfondo scelto dal giocatore nell'editor pre-condivisione
// (tra quelli caricati dall'admin) se presente e caricabile, altrimenti la
// sfumatura blu-verde di default. Un velo scuro sopra l'immagine mantiene il
// testo leggibile qualunque sia la foto scelta.
async function drawBackground(ctx, W, H, backgroundUrl) {
  if (backgroundUrl) {
    try {
      const img = await loadImage(backgroundUrl);
      const scale = Math.max(W / img.width, H / img.height);
      const w = img.width * scale;
      const h = img.height * scale;
      ctx.drawImage(img, (W - w) / 2, (H - h) / 2, w, h);
      ctx.fillStyle = 'rgba(5,8,10,0.6)';
      ctx.fillRect(0, 0, W, H);
      return;
    } catch {
      // Caduta silenziosa sulla sfumatura di default se l'immagine non
      // carica (link scaduto, offline, ecc.)
    }
  }
  const bg = ctx.createLinearGradient(0, 0, W, H);
  bg.addColorStop(0, '#0F1E22');
  bg.addColorStop(1, '#05080A');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, H);
}

// Cornice di default: doppio bordo (neon esterno + sottile interno) più
// piccoli accenti agli angoli. Usata quando il giocatore non sceglie una
// delle cornici-immagine caricate dall'admin.
function drawDefaultFrame(ctx, W, H, neon) {
  ctx.strokeStyle = neon;
  ctx.lineWidth = 8;
  ctx.strokeRect(20, 20, W - 40, H - 40);
  ctx.strokeStyle = 'rgba(255,255,255,0.35)';
  ctx.lineWidth = 2;
  ctx.strokeRect(38, 38, W - 76, H - 76);

  const corner = 46;
  ctx.strokeStyle = neon;
  ctx.lineWidth = 5;
  [[20, 20, 1, 1], [W - 20, 20, -1, 1], [20, H - 20, 1, -1], [W - 20, H - 20, -1, -1]].forEach(([x, y, dx, dy]) => {
    ctx.beginPath();
    ctx.moveTo(x, y + corner * dy);
    ctx.lineTo(x, y);
    ctx.lineTo(x + corner * dx, y);
    ctx.stroke();
  });
}

// Riga con i nomi dei giocatori sotto il nome squadra - solo se i nomi sono
// stati salvati nel record (partite giocate dopo questo aggiornamento) e se
// aggiungono informazione rispetto al nome squadra stesso.
function playersLine(players, teamName) {
  if (!Array.isArray(players) || !players.length) return null;
  const joined = players.join(' e ');
  if (!joined || joined === teamName) return null;
  return joined;
}

async function drawMatchCard(record, { backgroundUrl = null, frameUrl = null } = {}) {
  const canvas = document.createElement('canvas');
  const W = 1080, H = 1350;
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d');

  await drawBackground(ctx, W, H, backgroundUrl);

  const neon = ctx.createLinearGradient(0, 0, W, 0);
  neon.addColorStop(0, '#4DD9FF');
  neon.addColorStop(1, '#8CFF5C');

  if (!frameUrl) drawDefaultFrame(ctx, W, H, neon);

  ctx.textAlign = 'center';
  ctx.fillStyle = neon;
  ctx.font = 'bold 54px sans-serif';
  ctx.fillText('🎾 Padel Score Master', W / 2, 140);

  ctx.fillStyle = '#E5EAF2';
  ctx.font = '30px sans-serif';
  const dateLabel = new Date(record.date).toLocaleDateString('it-IT', { day: 'numeric', month: 'long', year: 'numeric' });
  ctx.fillText(dateLabel, W / 2, 188);

  const winnerA = record.winner === 'A';
  const winnerB = record.winner === 'B';
  const playersA = playersLine(record.teamAPlayers, record.teamAName);
  const playersB = playersLine(record.teamBPlayers, record.teamBName);

  let y = 285;
  ctx.font = 'bold 58px sans-serif';
  ctx.fillStyle = winnerA ? '#8CFF5C' : '#E5EAF2';
  ctx.fillText(record.teamAName, W / 2, y);
  if (playersA) {
    y += 42;
    ctx.font = '30px sans-serif';
    ctx.fillStyle = '#B9C2D6';
    ctx.fillText(playersA, W / 2, y);
  }
  y += 52;
  ctx.font = '34px sans-serif';
  ctx.fillStyle = '#B9C2D6';
  ctx.fillText('vs', W / 2, y);
  y += 62;
  ctx.font = 'bold 58px sans-serif';
  ctx.fillStyle = winnerB ? '#8CFF5C' : '#E5EAF2';
  ctx.fillText(record.teamBName, W / 2, y);
  if (playersB) {
    y += 42;
    ctx.font = '30px sans-serif';
    ctx.fillStyle = '#B9C2D6';
    ctx.fillText(playersB, W / 2, y);
  }

  // Banner esplicito del vincitore a testo pieno: il solo colore/trofeo sul
  // nome sopra non bastava a farlo capire a colpo d'occhio nell'immagine
  // condivisa.
  const winnerName = winnerA ? record.teamAName : winnerB ? record.teamBName : null;
  y += 90;
  if (winnerName) {
    ctx.font = 'bold 46px sans-serif';
    const label = `🏆 ${winnerName} VINCE!`;
    const textWidth = ctx.measureText(label).width;
    const padX = 36, padY = 22;
    const boxW = textWidth + padX * 2;
    const boxH = 46 + padY;
    ctx.fillStyle = 'rgba(140,255,92,0.16)';
    ctx.strokeStyle = '#8CFF5C';
    ctx.lineWidth = 3;
    const bx = (W - boxW) / 2, by = y - boxH / 2 - 6;
    ctx.beginPath();
    ctx.roundRect ? ctx.roundRect(bx, by, boxW, boxH, 16) : ctx.rect(bx, by, boxW, boxH);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#8CFF5C';
    ctx.fillText(label, W / 2, y + 10);
  } else {
    ctx.font = 'bold 40px sans-serif';
    ctx.fillStyle = '#E5EAF2';
    ctx.fillText('🤝 Pareggio', W / 2, y);
  }

  y += 100;
  ctx.font = '30px sans-serif';
  ctx.fillStyle = '#B9C2D6';
  ctx.fillText('Risultato', W / 2, y);

  y += 95;
  if (record.sets && record.sets.length) {
    record.sets.forEach((s, i) => {
      ctx.font = '30px sans-serif';
      ctx.fillStyle = '#8B95AC';
      ctx.textAlign = 'center';
      ctx.fillText(`SET ${i + 1}`, W / 2, y - 58);
      ctx.font = 'bold 84px sans-serif';
      ctx.fillStyle = s.a > s.b ? '#4DD9FF' : '#E5EAF2';
      ctx.textAlign = 'right';
      ctx.fillText(String(s.a), W / 2 - 40, y);
      ctx.fillStyle = s.b > s.a ? '#4DD9FF' : '#E5EAF2';
      ctx.textAlign = 'left';
      ctx.fillText(String(s.b), W / 2 + 40, y);
      y += 140;
    });
  } else {
    ctx.font = '32px sans-serif';
    ctx.fillStyle = '#B9C2D6';
    ctx.textAlign = 'center';
    ctx.fillText('Nessun set concluso', W / 2, y);
  }

  ctx.textAlign = 'center';
  ctx.fillStyle = '#9AA7C2';
  ctx.font = '28px sans-serif';
  ctx.fillText('Segnapunti padel con telecomandi Bluetooth', W / 2, H - 60);

  // Cornice-immagine dell'admin: disegnata per ultima, sopra tutto il
  // contenuto, stirata sull'intera card (i PNG cornice hanno il centro
  // trasparente).
  if (frameUrl) {
    try {
      const frame = await loadImage(frameUrl);
      ctx.drawImage(frame, 0, 0, W, H);
    } catch {
      drawDefaultFrame(ctx, W, H, neon);
    }
  }

  return canvas.toDataURL('image/png');
}

// Data-URL per l'anteprima nell'editor pre-condivisione (matita nello
// storico partite) - stessa identica resa dell'immagine condivisa.
export async function renderMatchCardPreview(record, opts) {
  return drawMatchCard(record, opts);
}

export async function shareMatch(record, opts = {}) {
  if (!matchShareSupported()) return false;
  try {
    const dataUrl = await drawMatchCard(record, opts);
    const base64 = dataUrl.split(',')[1];
    const fileName = `padel-match-${Date.now()}.png`;
    const { uri } = await Filesystem().writeFile({ path: fileName, data: base64, directory: 'CACHE' });
    await Share().share({
      title: 'Risultato partita',
      text: `${record.teamAName} vs ${record.teamBName} — Padel Score Master`,
      files: [uri],
      dialogTitle: 'Condividi il risultato',
    });
    return true;
  } catch {
    return false;
  }
}
