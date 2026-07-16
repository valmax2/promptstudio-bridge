import { getState, replaceCollection } from '../store.js';
import { escapeHtml } from '../utils.js';
import { toast } from '../app.js';

export async function renderStats(el) {
  await paint(el);
}

async function paint(el) {
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

  el.querySelectorAll('[data-edit-match]').forEach((btn) => {
    btn.addEventListener('click', () => onEditMatch(btn.dataset.editMatch, el));
  });
  el.querySelectorAll('[data-delete-match]').forEach((btn) => {
    btn.addEventListener('click', () => onDeleteMatch(btn.dataset.deleteMatch, el));
  });
}

function matchRow(m) {
  const won = m.winner === 'A';
  return `<div class="list-item">
    <div class="avatar">${won ? '🏆' : '➖'}</div>
    <div class="meta">
      <strong>${escapeHtml(m.teamAName)} vs ${escapeHtml(m.teamBName)}</strong>
      <span>${m.mode === 'singles' ? 'Singolo' : 'Doppio'} · ${(m.sets || []).map((s) => `${s.a}-${s.b}`).join(', ')} · ${new Date(m.date).toLocaleDateString('it-IT')}</span>
    </div>
    <span class="badge ${won ? 'accent' : ''}">${won ? 'Vinta' : 'Persa'}</span>
    <button class="icon-btn" data-edit-match="${m.id}" aria-label="Modifica partita">✏️</button>
    <button class="icon-btn" data-delete-match="${m.id}" aria-label="Elimina partita">🗑️</button>
  </div>`;
}

async function onEditMatch(id, el) {
  const { matches } = getState();
  const m = matches.find((x) => x.id === id);
  if (!m) return;
  const nameA = prompt('Nome squadra/giocatore 1', m.teamAName);
  if (nameA === null) return;
  const nameB = prompt('Nome squadra/giocatore 2', m.teamBName);
  if (nameB === null) return;
  const winner = prompt('Chi ha vinto? Scrivi "1" o "2" (vuoto = pareggio)', m.winner === 'A' ? '1' : m.winner === 'B' ? '2' : '');
  if (winner === null) return;
  const updated = {
    ...m,
    teamAName: nameA.trim().slice(0, 24) || m.teamAName,
    teamBName: nameB.trim().slice(0, 24) || m.teamBName,
    winner: winner.trim() === '1' ? 'A' : winner.trim() === '2' ? 'B' : null,
  };
  const next = matches.map((x) => (x.id === id ? updated : x));
  replaceCollection('matches', next);
  toast('Partita aggiornata');
  await paint(el);
}

async function onDeleteMatch(id, el) {
  if (!confirm('Eliminare questa partita dallo storico?')) return;
  const { matches } = getState();
  replaceCollection('matches', matches.filter((x) => x.id !== id));
  toast('Partita eliminata');
  await paint(el);
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
