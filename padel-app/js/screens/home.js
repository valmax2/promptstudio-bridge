import { getState } from '../store.js';
import { navigate } from '../router.js';
import { firebaseAvailable } from '../firebase.js';
import { escapeHtml } from '../utils.js';

export async function renderHome(el) {
  const { profile, matches, events } = getState();
  const authed = !!profile.uid;
  const upcoming = events
    .filter((e) => new Date(e.dateTime) >= new Date())
    .sort((a, b) => new Date(a.dateTime) - new Date(b.dateTime))
    .slice(0, 3);
  const recent = matches.slice(0, 3);
  const wins = matches.filter((m) => m.wonByMe).length;

  el.innerHTML = `
    <div class="topbar">
      <div>
        <h1>Ciao, ${escapeHtml(profile.name)} 👋</h1>
        <div class="subtitle">${authed ? 'Sincronizzato con il cloud' : firebaseAvailable() ? 'Non hai ancora effettuato l\'accesso' : 'Modalità locale'}</div>
      </div>
      <div class="row" style="gap:10px;">
        <button class="icon-btn" id="go-settings" aria-label="Impostazioni" title="Impostazioni">⚙️</button>
        <div class="avatar">${avatarContent(profile)}</div>
      </div>
    </div>

    ${!authed ? `
    <div class="card row between">
      <div>
        <strong>Accedi per sbloccare Community, Eventi e Sync cloud</strong>
        <p class="mb0">Il segnapunti funziona già offline.</p>
      </div>
      <button class="btn primary small" id="go-login">Accedi</button>
    </div>` : ''}

    <div class="card">
      <div class="row between">
        <h2>🎾 Nuova partita</h2>
      </div>
      <p>Avvia il segnapunti remoto con annuncio vocale del punteggio.</p>
      <button class="btn primary block" id="go-scoreboard">Doppio / Singolo</button>
      <div class="grid-2 mt">
        <button class="btn secondary" id="go-americano">🔄 Americano</button>
        <button class="btn secondary" id="go-killer">🔪 Killer</button>
      </div>
    </div>

    <div class="card">
      <div class="row between">
        <h2>Prossimi eventi</h2>
        <button class="btn ghost small" id="go-events">Vedi tutti</button>
      </div>
      ${upcoming.length ? upcoming.map(eventRow).join('') : emptyRow('Nessun evento in programma')}
    </div>

    <div class="card">
      <div class="row between">
        <h2>Ultime partite</h2>
        <button class="btn ghost small" id="go-stats">Statistiche</button>
      </div>
      ${recent.length ? recent.map(matchRow).join('') : emptyRow('Nessuna partita registrata')}
    </div>

    <div class="card row between">
      <div>
        <strong>Livello ${profile.level}</strong>
        <p class="mb0 small">${profile.xp} XP · ${wins} vittorie totali</p>
      </div>
      <button class="btn ghost small" id="go-gami">Premi</button>
    </div>
  `;

  el.querySelector('#go-login')?.addEventListener('click', () => navigate('login'));
  el.querySelector('#go-settings').addEventListener('click', () => navigate('settings'));
  el.querySelector('#go-scoreboard').addEventListener('click', () => navigate('scoreboard'));
  el.querySelector('#go-americano').addEventListener('click', () => navigate('americano'));
  el.querySelector('#go-killer').addEventListener('click', () => navigate('killer'));
  el.querySelector('#go-events').addEventListener('click', () => navigate('events'));
  el.querySelector('#go-stats').addEventListener('click', () => navigate('stats'));
  el.querySelector('#go-gami').addEventListener('click', () => navigate('gamification'));
}

function avatarContent(profile) {
  if (profile.avatarUrl) return `<img src="${profile.avatarUrl}" alt="avatar">`;
  return profile.avatarEmoji || '🎾';
}

function eventRow(e) {
  const d = new Date(e.dateTime);
  const count = Object.values(e.participants || {}).filter((v) => v === 'yes').length;
  return `<div class="list-item">
    <div class="avatar">📅</div>
    <div class="meta"><strong>${escapeHtml(e.title)}</strong><span>${d.toLocaleDateString('it-IT')} · ${d.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })} · ${count}/${e.maxPlayers || 4} giocatori</span></div>
  </div>`;
}

function matchRow(m) {
  return `<div class="list-item">
    <div class="avatar">${m.winner === m.myTeam ? '🏆' : '🎾'}</div>
    <div class="meta"><strong>${escapeHtml(m.teamAName)} vs ${escapeHtml(m.teamBName)}</strong><span>${(m.sets || []).map((s) => `${s.a}-${s.b}`).join(', ')}</span></div>
  </div>`;
}

function emptyRow(text) {
  return `<div class="empty-state"><span class="icon">🎾</span>${text}</div>`;
}
