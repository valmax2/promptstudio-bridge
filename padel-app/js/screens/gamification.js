import { getState, setState } from '../store.js';
import { listenPrizes } from '../cloud.js';
import { firebaseAvailable } from '../firebase.js';
import { escapeHtml } from '../utils.js';
import { navigate } from '../router.js';
import { isAdmin } from '../admin.js';

// "Premi": a small admin-curated showcase (max 5 items, see js/admin.js) -
// read-only here. Not tied to XP/levels/unlocks - just whatever the admin
// wants to announce right now (a seasonal theme, an actual prize, etc).
export async function renderGamification(el) {
  let unsubPrizes = null;

  paint();

  function paint() {
    const prizes = [...getState().prizes].sort((a, b) => (a.order ?? 9999) - (b.order ?? 9999));

    el.innerHTML = `
      <div class="topbar"><h1>🎁 Premi</h1></div>

      <div class="card">
        <p class="small mb0">${prizes.length ? 'Le novità del momento, scelte a mano.' : 'Nessun premio in vetrina al momento.'}</p>
      </div>

      ${prizes.length ? `
      <div class="card">
        <div class="picker-grid">
          ${prizes.map((p) => `
            <div class="frame-pick-wrap">
              <div class="pick-item"><span class="pick-item-preview"><img src="${p.imageUrl}" alt="${escapeHtml(p.label || '')}" style="width:100%;height:100%;object-fit:cover;"></span></div>
              <span class="pick-item-label">${escapeHtml(p.label || '')}</span>
            </div>
          `).join('')}
        </div>
      </div>
      ` : ''}

      ${isAdmin() ? `<div class="card"><button class="btn secondary block" id="go-admin">🛠️ Gestisci i premi</button></div>` : ''}
    `;

    el.querySelector('#go-admin')?.addEventListener('click', () => navigate('admin'));
  }

  if (firebaseAvailable()) {
    unsubPrizes = listenPrizes((list) => { setState({ prizes: list }, { silent: true }); paint(); });
  }

  return () => { unsubPrizes?.(); };
}
