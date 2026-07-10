const routes = new Map();
let currentRoute = null;
let mountEl = null;
let navEl = null;
let cleanupFn = null;

export function registerRoute(name, renderFn) {
  routes.set(name, renderFn);
}

export function initRouter(appEl, navElement) {
  mountEl = appEl;
  navEl = navElement;
  window.addEventListener('hashchange', () => navigate(currentHashRoute()));
}

function currentHashRoute() {
  const hash = location.hash.replace('#/', '').trim();
  return hash || 'home';
}

export function startRouter(defaultRoute = 'home') {
  const initial = currentHashRoute() || defaultRoute;
  navigate(initial, { replace: true });
}

export async function navigate(name, { replace = false, params = {} } = {}) {
  if (!routes.has(name)) name = 'home';
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
