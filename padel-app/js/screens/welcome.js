import { getState, setState } from '../store.js';
import { navigate } from '../router.js';

// TODO: sostituisci con la tua email reale di supporto.
const SUPPORT_EMAIL = 'supporto@padelapp.app';

// SVG a dimensione fissa (18x18) cosi le icone dei due pulsanti risultano
// sempre identiche, a differenza degli emoji che su Android variano molto
// di dimensione reale da un glifo all'altro pur nello stesso font-size.
const BOOK_ICON = `<svg class="btn-icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>`;
const MAIL_ICON = `<svg class="btn-icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="4" width="20" height="16" rx="2"/><path d="m22 6-10 7L2 6"/></svg>`;

export async function renderWelcome(el) {
  el.innerHTML = `
    <div class="welcome-screen">
      <img class="welcome-icon" src="./icon.svg" alt="Padel App">
      <h1 class="welcome-title">Padel App</h1>
      <p class="welcome-tagline">Il tuo segnapunti &amp; assistente intelligente</p>
      <p class="welcome-desc">
        Gestisci le tue partite di <strong>padel</strong> in tempo reale. Aggiorna il punteggio
        direttamente sul tabellone o usa telecomandi e <strong>tag Bluetooth</strong> per fare
        tutto dal campo. Ascolta l'assistente con <strong>sintesi vocale</strong> che annuncia i
        punti, gestisci le tue <strong>squadre</strong> e consulta storici e statistiche avanzate.
      </p>
      <button class="btn primary block welcome-cta" id="welcome-open">▶ Apri l'app</button>
      <div class="row" style="gap:10px;margin-top:14px;">
        <button class="btn secondary" id="welcome-tutorial" style="flex:1;min-width:0;">${BOOK_ICON} Tutorial</button>
        <button class="btn secondary" id="welcome-support" style="flex:1;min-width:0;">${MAIL_ICON} Supporto</button>
      </div>
      <p class="welcome-footer small">di VStudioApps · Privacy</p>
    </div>

    <div class="modal-backdrop hidden" id="tutorial-modal">
      <div class="modal-card">
        <h2><span>📖 Come funziona</span><button class="icon-btn" id="tutorial-close" aria-label="Chiudi">✕</button></h2>
        <p><strong>1. Nuova partita</strong> — dalla Home scegli Doppio/Singolo, Americano o Killer, imposta chi serve e il formato, poi gioca toccando il lato di chi fa punto. A fine partita viene salvata automaticamente nelle Statistiche (modificabile o eliminabile da lì).</p>
        <p><strong>2. Telecomando Bluetooth</strong> — in Impostazioni → Bluetooth puoi associare telecomandi o tag per segnare i punti senza toccare lo schermo.</p>
        <p><strong>3. Community</strong> — aggiungi amici con un codice (puoi anche condividerlo su WhatsApp), crea gruppi con chat condivisa, e organizza eventi.</p>
        <p><strong>4. Premi</strong> — una vetrina di novità scelta di volta in volta, sempre visibile dal Profilo.</p>
        <button class="btn primary block mt" id="tutorial-done">Ho capito</button>
      </div>
    </div>
  `;

  el.querySelector('#welcome-open').addEventListener('click', () => {
    setState({ hasSeenWelcome: true });
    navigate('home', { replace: true });
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
