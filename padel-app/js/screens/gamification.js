import { getState, setState } from '../store.js';
import { listenPrizes } from '../cloud.js';
import { firebaseAvailable } from '../firebase.js';
import { escapeHtml } from '../utils.js';
import { navigate } from '../router.js';
import { isAdmin } from '../admin.js';

// "Accessori telecomandi": a small admin-curated showcase (max 5 items, see
// js/admin.js) - read-only here. Foto + link opzionale (es. dove comprarli):
// niente XP/livelli/sblocchi, solo quello che l'admin vuole mettere in
// vetrina in questo momento.
export async function renderGamification(el) {
  let unsubPrizes = null;

  paint();

  function paint() {
    const prizes = [...getState().prizes].sort((a, b) => (a.order ?? 9999) - (b.order ?? 9999));

    el.innerHTML = `
      <div class="topbar"><h1>🔌 Accessori telecomandi</h1></div>

      <div class="card">
        <p class="small mb0">${prizes.length ? 'Le novità del momento, scelte a mano.' : 'Nessun accessorio in vetrina al momento.'}</p>
      </div>

      ${prizes.length ? `
      <div class="card">
        <div class="picker-grid">
          ${prizes.map((p) => `
            <div class="frame-pick-wrap">
              <div class="pick-item pick-item-framed" ${p.link ? `data-open-link="${escapeHtml(p.link)}" style="cursor:pointer;"` : ''}><span class="pick-item-preview"><img src="${p.imageUrl}" alt="${escapeHtml(p.label || '')}" style="width:100%;height:100%;object-fit:cover;"></span></div>
              <span class="pick-item-label">${escapeHtml(p.label || '')}</span>
              ${p.description ? `<span class="small" style="text-align:center;opacity:0.8;">${escapeHtml(p.description)}</span>` : ''}
              ${p.link ? `<a class="btn ghost small" href="${escapeHtml(p.link)}" target="_blank" rel="noopener noreferrer">Vedi</a>` : ''}
            </div>
          `).join('')}
        </div>
      </div>
      ` : ''}

      ${isAdmin() ? `<div class="card"><button class="btn secondary block" id="go-admin">🛠️ Gestisci accessori</button></div>` : ''}
    `;

    el.querySelector('#go-admin')?.addEventListener('click', () => navigate('admin'));
    el.querySelectorAll('[data-open-link]').forEach((box) => box.addEventListener('click', () => {
      window.open(box.dataset.openLink, '_blank', 'noopener,noreferrer');
    }));
  }

  if (firebaseAvailable()) {
    unsubPrizes = listenPrizes((list) => { setState({ prizes: list }, { silent: true }); paint(); });
  }

  return () => { unsubPrizes?.(); };
}
