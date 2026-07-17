const Share = () => window.Capacitor?.Plugins?.Share;
const Filesystem = () => window.Capacitor?.Plugins?.Filesystem;

export function matchShareSupported() {
  return !!(Share() && Filesystem());
}

// Disegna una card riassuntiva della partita (stessa palette blu-verde
// neon dell'icona/tema app) e la converte in PNG - condivisa così com'è,
// funge anche da piccola promozione dell'app.
function drawMatchCard(record) {
  const canvas = document.createElement('canvas');
  const W = 1080, H = 1350;
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d');

  const bg = ctx.createLinearGradient(0, 0, W, H);
  bg.addColorStop(0, '#0F1E22');
  bg.addColorStop(1, '#05080A');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, H);

  const neon = ctx.createLinearGradient(0, 0, W, 0);
  neon.addColorStop(0, '#4DD9FF');
  neon.addColorStop(1, '#8CFF5C');

  ctx.strokeStyle = neon;
  ctx.lineWidth = 6;
  ctx.strokeRect(24, 24, W - 48, H - 48);

  ctx.textAlign = 'center';
  ctx.fillStyle = neon;
  ctx.font = 'bold 54px sans-serif';
  ctx.fillText('🎾 Padel Score Master', W / 2, 150);

  ctx.fillStyle = '#9AA7C2';
  ctx.font = '32px sans-serif';
  const dateLabel = new Date(record.date).toLocaleDateString('it-IT', { day: 'numeric', month: 'long', year: 'numeric' });
  ctx.fillText(dateLabel, W / 2, 200);

  const winnerA = record.winner === 'A';
  const winnerB = record.winner === 'B';

  ctx.font = 'bold 62px sans-serif';
  ctx.fillStyle = winnerA ? '#8CFF5C' : '#F2F5FA';
  ctx.fillText(`${winnerA ? '🏆 ' : ''}${record.teamAName}`, W / 2, 340);
  ctx.font = '38px sans-serif';
  ctx.fillStyle = '#9AA7C2';
  ctx.fillText('vs', W / 2, 400);
  ctx.font = 'bold 62px sans-serif';
  ctx.fillStyle = winnerB ? '#8CFF5C' : '#F2F5FA';
  ctx.fillText(`${winnerB ? '🏆 ' : ''}${record.teamBName}`, W / 2, 460);

  let y = 580;
  ctx.font = 'bold 90px sans-serif';
  if (record.sets && record.sets.length) {
    record.sets.forEach((s) => {
      ctx.fillStyle = s.a > s.b ? '#4DD9FF' : '#F2F5FA';
      ctx.textAlign = 'right';
      ctx.fillText(String(s.a), W / 2 - 40, y);
      ctx.fillStyle = s.b > s.a ? '#4DD9FF' : '#F2F5FA';
      ctx.textAlign = 'left';
      ctx.fillText(String(s.b), W / 2 + 40, y);
      y += 130;
    });
  }

  ctx.textAlign = 'center';
  ctx.fillStyle = '#9AA7C2';
  ctx.font = '28px sans-serif';
  ctx.fillText('Segnapunti padel con telecomandi Bluetooth', W / 2, H - 80);

  return canvas.toDataURL('image/png').split(',')[1];
}

export async function shareMatch(record) {
  if (!matchShareSupported()) return false;
  try {
    const base64 = drawMatchCard(record);
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
