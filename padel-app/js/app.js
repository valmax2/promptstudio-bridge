import { getState, subscribe } from './store.js';
import { initRouter, registerRoute, startRouter, navigate } from './router.js';
import { initFirebase, firebaseAvailable, onAuthChanged } from './firebase.js';
import { configureSpeech } from './speech.js';
import { applyColorsToDom } from './color-presets.js';
import { initNotifications, stopNotifications } from './notifications.js';

import { renderLogin } from './screens/login.js';
import { renderHome } from './screens/home.js';
import { renderScoreboard } from './screens/scoreboard.js';
import { renderCommunity } from './screens/community.js';
import { renderEvents } from './screens/events.js';
import { renderStats } from './screens/stats.js';
import { renderGamification } from './screens/gamification.js';
import { renderSettings } from './screens/settings.js';
import { renderProfile } from './screens/profile.js';
import { renderAmericano } from './screens/americano.js';
import { renderKiller } from './screens/killer.js';
import { renderGameModes } from './screens/gamemodes.js';
import { NAV_ICONS } from './nav-icons.js';

const appEl = document.getElementById('app');
const navEl = document.getElementById('bottom-nav');
const bannerEl = document.getElementById('offline-banner');

navEl.querySelectorAll('[data-icon]').forEach((el) => {
  el.innerHTML = NAV_ICONS[el.dataset.icon] || '';
});

function applyTheme() {
  const { settings } = getState();
  document.documentElement.setAttribute('data-theme', settings.theme);
  document.documentElement.style.setProperty('--font-family', settings.fontFamily);
  document.documentElement.style.setProperty('--font-scale', settings.fontScale);
  configureSpeech({
    enabled: settings.ttsEnabled,
    lang: settings.ttsVoiceLang,
    voiceGender: settings.ttsVoiceGender,
    voiceMode: settings.ttsVoiceMode,
  });
  applyColorsToDom(settings);
}

function updateBanner() {
  const authed = !!getState().profile.uid;
  if (!firebaseAvailable()) {
    bannerEl.textContent = 'Modalità locale: configura Firebase per abilitare login, community e sync cloud (vedi README).';
    bannerEl.classList.remove('hidden');
  } else if (!authed) {
    bannerEl.classList.add('hidden');
  } else {
    bannerEl.classList.add('hidden');
  }
}

export function toast(message, duration = 2400) {
  const container = document.getElementById('toast-container');
  const el = document.createElement('div');
  el.className = 'toast';
  el.textContent = message;
  container.appendChild(el);
  setTimeout(() => el.remove(), duration);
}

registerRoute('login', renderLogin);
registerRoute('home', renderHome);
registerRoute('scoreboard', renderScoreboard);
registerRoute('community', renderCommunity);
registerRoute('events', renderEvents);
registerRoute('stats', renderStats);
registerRoute('gamification', renderGamification);
registerRoute('settings', renderSettings);
registerRoute('profile', renderProfile);
registerRoute('americano', renderAmericano);
registerRoute('killer', renderKiller);
registerRoute('gamemodes', renderGameModes);

navEl.addEventListener('click', (e) => {
  const btn = e.target.closest('.nav-btn');
  if (btn) navigate(btn.dataset.route);
});

subscribe(applyTheme);
applyTheme();

initRouter(appEl, navEl);
navEl.classList.remove('hidden');
startRouter('home');

initFirebase().then((ok) => {
  updateBanner();
  if (ok) {
    onAuthChanged((user) => {
      updateBanner();
      if (user) initNotifications(toast); else stopNotifications();
      window.dispatchEvent(new CustomEvent('padel:auth-changed', { detail: user }));
    });
  }
});
updateBanner();

window.addEventListener('padel:navigate', (e) => navigate(e.detail));
