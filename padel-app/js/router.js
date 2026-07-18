import { isLiteMode } from './lite-mode.js';
import { showBanner, hideBanner } from './ads.js';

// Il banner AdMob resta nascosto durante il punteggio dal vivo, mai durante
// una partita in corso - solo sulle altre schermate.
const LIVE_MATCH_ROUTES = ['scoreboard', 'americano', 'killer'];

const routes = new Map();
let currentRoute = null;
let mountEl = null;
let navEl = null;
let cleanupFn = null;

// In the beta-test build, every route except these bounces back to the
// scoreboard - a single choke point here means no button anywhere (even
// ones inside a screen we didn't specifically audit) can ever leak into
// the full app (community, events, login, settings, ...).
const LITE_ALLOWED_ROUTES = ['scoreboard', 'bluetooth-setup', 'remote-board'];

export function registerRoute(name, renderFn) {
  routes.set(name, renderFn);
}

export function initRouter(appEl, navElement) {
  mountEl = appEl;
  navEl = navElement;
  window.addEventListener('hashchange', () => navigate(currentHashRoute()));
}

// Returns '' (not a fallback route name) when there's no hash, so callers
// can tell "no hash yet" apart from an actual route and apply their own
// fallback - navigate() already treats an unregistered/empty name as 'home'
// on its own, so this doesn't change hashchange behavior.
function currentHashRoute() {
  return location.hash.replace('#/', '').trim();
}

export function startRouter(defaultRoute = 'home') {
  const initial = currentHashRoute() || defaultRoute;
  navigate(initial, { replace: true });
}

export async function navigate(name, { replace = false, params = {} } = {}) {
  if (!routes.has(name)) name = 'home';
  if (isLiteMode() && !LITE_ALLOWED_ROUTES.includes(name)) name = 'scoreboard';
  if (location.hash !== `#/${name}`) {
    if (replace) history.replaceState(null, '', `#/${name}`);
    else location.hash = `#/${name}`;
  }
  currentRoute = name;
  if (cleanupFn) { try { cleanupFn(); } catch {} cleanupFn = null; }
  mountEl.innerHTML = '';
  const wrap = document.createElement('div');
  wrap.className = 'screen';
  mountEl.appendChild(wrap);
  const renderFn = routes.get(name);
  const result = await renderFn(wrap, params);
  if (typeof result === 'function') cleanupFn = result;
  updateNavActive(name);
  window.scrollTo(0, 0);
  if (LIVE_MATCH_ROUTES.includes(name)) hideBanner(); else showBanner();
}

function updateNavActive(name) {
  if (!navEl) return;
  navEl.querySelectorAll('.nav-btn').forEach((btn) => {
    btn.classList.toggle('active', btn.dataset.route === name);
  });
}

export function currentRouteName() {
  return currentRoute;
}
