import { getState, setState, updateSettings } from '../store.js';
import { navigate } from '../router.js';
import { firebaseAvailable, currentUser } from '../firebase.js';
import { listenWelcomeImage } from '../cloud.js';
import { t } from '../i18n.js';

// TODO: sostituisci con la tua email reale di supporto.
const SUPPORT_EMAIL = 'supporto@padelapp.app';

// SVG a dimensione fissa (18x18) cosi le icone dei due pulsanti risultano
// sempre identiche, a differenza degli emoji che su Android variano molto
// di dimensione reale da un glifo all'altro pur nello stesso font-size.
const BOOK_ICON = `<svg class="btn-icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>`;
const MAIL_ICON = `<svg class="btn-icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="4" width="20" height="16" rx="2"/><path d="m22 6-10 7L2 6"/></svg>`;

export async function renderWelcome(el) {
  paint(el);

  let unsubWelcomeImage = null;
  if (firebaseAvailable()) {
    unsubWelcomeImage = listenWelcomeImage((url) => {
      setState({ welcomeImageUrl: url }, { silent: true });
      const img = el.querySelector('.welcome-icon');
      if (img) img.src = url || './icon.svg';
    });
  }

  return () => { unsubWelcomeImage?.(); };
}

// "Accedi" sparisce una volta loggati: al suo posto una riga di conferma,
// così chi apre l'app capisce subito con che account sta giocando.
function loginButton() {
  const user = firebaseAvailable() ? currentUser() : null;
  const profileName = getState().profile?.name;
  if (user) {
    return `<p class="welcome-logged small">✅ Connesso come <strong>${profileName || user.email || 'giocatore'}</strong></p>`;
  }
  if (!firebaseAvailable()) return '';
  return `<button class="btn secondary block welcome-cta" id="welcome-login" style="margin-bottom:10px;">🔑 Accedi / Crea account</button>`;
}

function paint(el) {
  const welcomeImageUrl = getState().welcomeImageUrl;
  el.innerHTML = `
    <div class="welcome-screen">
      <img class="welcome-icon" src="${welcomeImageUrl || './icon.svg'}" alt="Padel App">
      <h1 class="welcome-title">Padel App</h1>
      <p class="welcome-tagline">${t('welcomeTagline')}</p>
      <p class="welcome-desc">${t('welcomeDesc')}</p>
      ${loginButton()}
      <button class="btn primary block welcome-cta" id="welcome-open-full">
        <span class="welcome-choice-title">🏟️ Apri modalità Full</span>
        <span class="welcome-choice-desc">App completa: partite, community, eventi, statistiche</span>
      </button>
      <button class="btn lite-highlight block welcome-cta" id="welcome-open-lite" style="margin-top:10px;">
        <span class="welcome-choice-title">⚡ Apri modalità Light</span>
        <span class="welcome-choice-desc">Solo partita e Bluetooth: semplice e immediata</span>
      </button>
      <div class="row" style="gap:10px;margin-top:14px;">
        <button class="btn secondary" id="welcome-tutorial" style="flex:1;min-width:0;">${BOOK_ICON} ${t('welcomeTutorial')}</button>
        <button class="btn secondary" id="welcome-support" style="flex:1;min-width:0;">${MAIL_ICON} ${t('welcomeSupport')}</button>
      </div>
      <p class="welcome-footer small">${t('welcomeFooter')}</p>
    </div>

    <div class="modal-backdrop hidden" id="tutorial-modal">
      <div class="modal-card">
        <h2><span>${t('tutorialTitle')}</span><button class="icon-btn" id="tutorial-close" aria-label="Chiudi">✕</button></h2>
        <p>${t('tutorial1')}</p>
        <p>${t('tutorial2')}</p>
        <p>${t('tutorial3')}</p>
        <p>${t('tutorial4')}</p>
        <p>${t('tutorial5')}</p>
        <p>${t('tutorial6')}</p>
        <button class="btn primary block mt" id="tutorial-done">${t('tutorialDone')}</button>
      </div>
    </div>
  `;

  el.querySelector('#welcome-login')?.addEventListener('click', () => {
    navigate('login', { params: { from: 'welcome' } });
  });
  el.querySelector('#welcome-open-full').addEventListener('click', () => {
    setState({ hasSeenWelcome: true });
    updateSettings({ liteModeUser: false });
    navigate('home', { replace: true });
  });
  el.querySelector('#welcome-open-lite').addEventListener('click', () => {
    setState({ hasSeenWelcome: true });
    updateSettings({ liteModeUser: true });
    navigate('scoreboard', { replace: true });
  });

  const tutorialModal = el.querySelector('#tutorial-modal');
  el.querySelector('#welcome-tutorial').addEventListener('click', () => tutorialModal.classList.remove('hidden'));
  el.querySelector('#tutorial-close').addEventListener('click', () => tutorialModal.classList.add('hidden'));
  el.querySelector('#tutorial-done').addEventListener('click', () => tutorialModal.classList.add('hidden'));
  tutorialModal.addEventListener('click', (e) => { if (e.target === tutorialModal) tutorialModal.classList.add('hidden'); });

  el.querySelector('#welcome-support').addEventListener('click', () => {
    window.location.href = `mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent('Padel App - Assistenza')}`;
  });
}
