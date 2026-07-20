import { getState, subscribe } from './store.js';
import { initRouter, registerRoute, startRouter, navigate } from './router.js';
import { initFirebase, firebaseAvailable, onAuthChanged } from './firebase.js';
import { configureSpeech } from './speech.js';
import { applyColorsToDom } from './color-presets.js';
import { applyUiAccent } from './ui-accents.js';
import { initNotifications, stopNotifications } from './notifications.js';
import { bleTagSupported, connectBleTag, disconnectBleTag } from './ble-remote.js';

import { renderLogin } from './screens/login.js';
import { renderHome } from './screens/home.js';
import { renderScoreboard } from './screens/scoreboard.js';
import { renderCommunity } from './screens/community.js';
import { renderEvents } from './screens/events.js';
import { renderStats } from './screens/stats.js';
import { renderGamification } from './screens/gamification.js';
import { renderSettings } from './screens/settings.js';
import { renderBluetoothSetup } from './screens/bluetooth-setup.js';
import { renderProfile } from './screens/profile.js';
import { renderAmericano } from './screens/americano.js';
import { renderKiller } from './screens/killer.js';
import { renderGameModes } from './screens/gamemodes.js';
import { renderChat } from './screens/chat.js';
import { renderGroupChat } from './screens/group-chat.js';
import { renderWelcome } from './screens/welcome.js';
import { renderAdmin } from './screens/admin.js';
import { renderRemoteBoard } from './screens/remote-board.js';
import { LITE_MODE } from './lite-mode.js';
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
    voiceMode: settings.ttsVoiceMode,
  });
  applyColorsToDom(settings);
  applyUiAccent(settings.uiAccent);
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

// Keeps every enabled BLE tag connected for as long as the app is open,
// instead of only while the scoreboard screen happens to be mounted - a
// disconnected tag beeps on its own (its "anti-lost" alarm) and takes a
// moment to reconnect, both of which used to happen every time you left and
// came back to the scoreboard. Reacts to any settings change (a tag added,
// enabled/disabled, or forgotten) rather than owning its own event wiring.
let connectedTagAddresses = new Set();
function reconcileBleTags() {
  if (!bleTagSupported()) return;
  const enabled = new Set(getState().settings.bleTags.filter((t) => t.enabled).map((t) => t.address));
  enabled.forEach((address) => {
    if (!connectedTagAddresses.has(address)) connectBleTag(address).catch(() => {});
  });
  connectedTagAddresses.forEach((address) => {
    if (!enabled.has(address)) disconnectBleTag(address);
  });
  connectedTagAddresses = enabled;
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
registerRoute('bluetooth-setup', renderBluetoothSetup);
registerRoute('profile', renderProfile);
registerRoute('americano', renderAmericano);
registerRoute('killer', renderKiller);
registerRoute('gamemodes', renderGameModes);
registerRoute('chat', renderChat);
registerRoute('group-chat', renderGroupChat);
registerRoute('welcome', renderWelcome);
registerRoute('admin', renderAdmin);
registerRoute('remote-board', renderRemoteBoard);

navEl.addEventListener('click', (e) => {
  const btn = e.target.closest('.nav-btn');
  if (btn) navigate(btn.dataset.route);
});

subscribe(applyTheme);
applyTheme();

subscribe(reconcileBleTags);
reconcileBleTags();

initRouter(appEl, navEl);

if (LITE_MODE) {
  // Beta-test build: skip community/events/login/welcome entirely and open
  // straight on the match setup screen - just enough to test remotes/tags,
  // nothing else of the full app visible. Bluetooth setup is still one tap
  // away via "Impostazioni" from there.
  navEl.classList.add('hidden');
  bannerEl.classList.add('hidden');
  startRouter('scoreboard');
} else {
  navEl.classList.remove('hidden');
  startRouter(getState().hasSeenWelcome ? 'home' : 'welcome');

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
}

window.addEventListener('padel:navigate', (e) => navigate(e.detail));
