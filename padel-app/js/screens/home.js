import { getState, updateSettings } from '../store.js';
import { navigate } from '../router.js';
import { firebaseAvailable } from '../firebase.js';
import { escapeHtml } from '../utils.js';
import { avatarSvg } from '../avatars.js';
import { t } from '../i18n.js';

const DATE_LOCALES = { it: 'it-IT', en: 'en-US', fr: 'fr-FR' };
function dateLocale() {
  return DATE_LOCALES[getState().settings.appLanguage] || 'it-IT';
}

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
      <h1 class="mb0">${t('homeGreeting')}, ${escapeHtml(profile.name)} 👋</h1>
      <div class="subtitle">${authed ? t('homeSyncedCloud') : firebaseAvailable() ? t('homeNotLoggedIn') : t('homeLocalMode')}</div>
    </div>

    ${!authed ? `
    <div class="card row between">
      <div>
        <strong>${t('homeLoginTitle')}</strong>
        <p class="mb0">${t('homeLoginDesc')}</p>
      </div>
      <button class="btn primary small" id="go-login">${t('homeLoginBtn')}</button>
    </div>` : ''}

    <div class="card">
      <div class="row between">
        <h2>${t('homeNewMatch')}</h2>
        <button class="btn ghost small" id="go-gamemodes">${t('homeModesBtn')}</button>
      </div>
      <p>${t('homeNewMatchDesc')}</p>
      <button class="btn primary block" id="go-scoreboard">${t('homeDoublesSingles')}</button>
      <div class="grid-2 mt">
        <button class="btn secondary" id="go-americano">${t('homeAmericano')}</button>
        <button class="btn secondary" id="go-killer">${t('homeKiller')}</button>
      </div>
    </div>

    <button class="lite-mode-btn" id="go-lite-mode">
      <span class="lite-mode-btn-icon">⚡</span>
      <span>
        <strong>${t('homeLiteTitle')}</strong>
        <small>${t('homeLiteDesc')}</small>
      </span>
    </button>

    <div class="card">
      <div class="row between">
        <h2>${t('homeUpcomingEvents')}</h2>
        <button class="btn ghost small" id="go-events">${t('homeSeeAll')}</button>
      </div>
      ${upcoming.length ? upcoming.map(eventRow).join('') : emptyRow(t('homeNoEvents'))}
    </div>

    <div class="card">
      <div class="row between">
        <h2>${t('homeRecentMatches')}</h2>
        <button class="btn ghost small" id="go-stats">${t('homeStats')}</button>
      </div>
      ${recent.length ? recent.map(matchRow).join('') : emptyRow(t('homeNoMatches'))}
    </div>

    <div class="card row between">
      <div>
        <strong>${t('homeRewards')}</strong>
        <p class="mb0 small">${wins} ${t('homeTotalWins')}</p>
      </div>
      <button class="btn ghost small" id="go-gami">${t('homeSee')}</button>
    </div>
  `;

  el.querySelector('#go-login')?.addEventListener('click', () => navigate('login'));
  el.querySelector('#go-gamemodes').addEventListener('click', () => navigate('gamemodes'));
  el.querySelector('#go-scoreboard').addEventListener('click', () => navigate('scoreboard'));
  el.querySelector('#go-lite-mode').addEventListener('click', () => {
    const ok = confirm(t('homeLiteConfirm'));
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
  const locale = dateLocale();
  return `<div class="list-item">
    <div class="avatar">📅</div>
    <div class="meta"><strong>${escapeHtml(e.title)}</strong><span>${d.toLocaleDateString(locale)} · ${d.toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' })} · ${count}/${e.maxPlayers || 4} ${t('homePlayers')}</span></div>
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
