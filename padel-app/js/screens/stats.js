import { getState } from '../store.js';
import { escapeHtml } from '../utils.js';

export async function renderStats(el) {
  const { matches } = getState();

  const total = matches.length;
  const wins = matches.filter((m) => m.winner === 'A').length; // scoreboard operator plays as Team A by convention
  const winRate = total ? Math.round((wins / total) * 100) : 0;
  const streak = computeStreak(matches);
  const last10 = matches.slice(0, 10).reverse();

  el.innerHTML = `
    <div class="topbar"><h1>Statistiche</h1></div>

    <div class="grid-2">
      <div class="card center"><div class="badge accent">Partite</div><h2>${total}</h2></div>
      <div class="card center"><div class="badge accent">% Vittorie</div><h2>${winRate}%</h2></div>
      <div class="card center"><div class="badge accent">Vittorie</div><h2>${wins}</h2></div>
      <div class="card center"><div class="badge accent">Striscia</div><h2>${streak.count}${streak.type === 'W' ? '🔥' : streak.count ? '❄️' : ''}</h2></div>
    </div>

    ${total ? `
    <div class="card">
      <h2>Andamento (ultime ${last10.length})</h2>
      <div class="row" style="align-items:flex-end;height:90px;gap:6px;">
        ${last10.map((m) => `<div style="flex:1;height:${m.winner === 'A' ? 100 : 40}%;border-radius:6px 6px 0 0;background:${m.winner === 'A' ? 'var(--accent)' : 'var(--danger)'}"></div>`).join('')}
      </div>
    </div>` : ''}

    <div class="card">
      <h2>Storico partite</h2>
      ${matches.length ? matches.map(matchRow).join('') : `<div class="empty-state"><span class="icon">📊</span>Gioca la tua prima partita dal segnapunti!</div>`}
    </div>
  `;
}

function matchRow(m) {
  const won = m.winner === 'A';
  return `<div class="list-item">
    <div class="avatar">${won ? '🏆' : '➖'}</div>
    <div class="meta">
      <strong>${escapeHtml(m.teamAName)} vs ${escapeHtml(m.teamBName)}</strong>
      <span>${(m.sets || []).map((s) => `${s.a}-${s.b}`).join(', ')} · ${new Date(m.date).toLocaleDateString('it-IT')}</span>
    </div>
    <span class="badge ${won ? 'accent' : ''}">${won ? 'Vinta' : 'Persa'}</span>
  </div>`;
}

function computeStreak(matches) {
  if (!matches.length) return { count: 0, type: null };
  const type = matches[0].winner === 'A' ? 'W' : 'L';
  let count = 0;
  for (const m of matches) {
    const t = m.winner === 'A' ? 'W' : 'L';
    if (t !== type) break;
    count++;
  }
  return { count, type };
}
