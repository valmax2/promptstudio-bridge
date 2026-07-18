import { getState, updateSettings } from '../store.js';
import { navigate } from '../router.js';
import { firebaseAvailable } from '../firebase.js';
import { escapeHtml } from '../utils.js';
import { avatarSvg } from '../avatars.js';

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
    <div class="center" style="margin-bottom:18px;">
      <div class="avatar xxl" style="margin:0 auto 10px;">${avatarContent(profile)}</div>
      <h1 class="mb0">Ciao, ${escapeHtml(profile.name)} 👋</h1>
      <div class="subtitle">${authed ? 'Sincronizzato con il cloud' : firebaseAvailable() ? 'Non hai ancora effettuato l\'accesso' : 'Modalità locale'}</div>
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
        <button class="btn ghost small" id="go-gamemodes">📖 Modalità</button>
      </div>
      <p>Avvia il segnapunti remoto con annuncio vocale del punteggio.</p>
      <button class="btn primary block" id="go-scoreboard">Doppio / Singolo</button>
      <div class="grid-2 mt">
        <button class="btn secondary" id="go-americano">🔄 Americano</button>
        <button class="btn secondary" id="go-killer">🔪 Killer</button>
      </div>
    </div>

    <button class="lite-mode-btn" id="go-lite-mode">
      <span class="lite-mode-btn-icon">⚡</span>
      <span>
        <strong>Modalità Interfaccia Light</strong>
        <small>Solo partita e Bluetooth, senza Community ed Eventi</small>
      </span>
    </button>

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
        <strong>🎁 Premi</strong>
        <p class="mb0 small">${wins} vittorie totali</p>
      </div>
      <button class="btn ghost small" id="go-gami">Vedi</button>
    </div>
  `;

  el.querySelector('#go-login')?.addEventListener('click', () => navigate('login'));
  el.querySelector('#go-gamemodes').addEventListener('click', () => navigate('gamemodes'));
  el.querySelector('#go-scoreboard').addEventListener('click', () => navigate('scoreboard'));
  el.querySelector('#go-lite-mode').addEventListener('click', () => {
    const ok = confirm(
      "Attivare la Modalità Interfaccia Light?\n\n"
      + "L'app si riduce al minimo indispensabile: solo Nuova partita e configurazione Bluetooth "
      + "(telecomandi e casse). Community, Eventi, Statistiche e le altre sezioni vengono nascoste.\n\n"
      + "Potrai tornare all'interfaccia completa in qualsiasi momento con il pulsante "
      + "\"Esci da Modalità Light\".",
    );
    if (!ok) return;
    updateSettings({ liteModeUser: true });
    navigate('scoreboard');
  });
  el.querySelector('#go-americano').addEventListener('click', () => navigate('americano'));
  el.querySelector('#go-killer').addEventListener('click', () => navigate('killer'));
  el.querySelector('#go-events').addEventListener('click', () => navigate('events'));
  el.querySelector('#go-stats').addEventListener('click', () => navigate('stats'));
  el.querySelector('#go-gami').addEventListener('click', () => navigate('gamification'));
}

function avatarContent(profile) {
  if (profile.avatarUrl) return `<img src="${profile.avatarUrl}" alt="avatar">`;
  return avatarSvg(profile.avatarEmoji);
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
