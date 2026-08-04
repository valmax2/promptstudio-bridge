import { getState, setState } from '../store.js';
import { listenPrizes } from '../cloud.js';
import { firebaseAvailable } from '../firebase.js';
import { escapeHtml } from '../utils.js';
import { navigate } from '../router.js';
import { isAdmin } from '../admin.js';
import { openImageLightbox } from '../image-lightbox.js';

// "Accessori telecomandi": a small admin-curated showcase (max 5 items, see
// js/admin.js) - read-only here. Foto + descrizione + link opzionale (es.
// dove comprarli): niente XP/livelli/sblocchi, solo quello che l'admin vuole
// mettere in vetrina in questo momento. Stessa "tipologia" a righe di
// "Telecomandi compatibili" (vedi remote-board.js) invece della griglia di
// prima, per coerenza tra le due bacheche - tocca la foto per vederla grande.
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
        ${prizes.map((p) => `
          <div class="list-item row" style="gap:14px;align-items:center;">
            <div class="avatar" style="width:64px;height:64px;flex-shrink:0;cursor:pointer;" data-open-lightbox="${escapeHtml(p.imageUrl)}" data-lightbox-label="${escapeHtml(p.label || '')}"><img src="${p.imageUrl}" alt="${escapeHtml(p.label || '')}" style="width:100%;height:100%;object-fit:cover;border-radius:50%;"></div>
            <div class="meta" style="flex:1;">
              <strong>${escapeHtml(p.label || '')}</strong>
              ${p.description ? `<span>${escapeHtml(p.description)}</span>` : ''}
            </div>
            ${p.link ? `<a class="btn primary small" href="${escapeHtml(p.link)}" target="_blank" rel="noopener noreferrer">Vedi</a>` : ''}
          </div>
        `).join('')}
      </div>
      ` : ''}

      ${isAdmin() ? `<div class="card"><button class="btn secondary block" id="go-admin">🛠️ Gestisci accessori</button></div>` : ''}
    `;

    el.querySelector('#go-admin')?.addEventListener('click', () => navigate('admin'));
    el.querySelectorAll('[data-open-lightbox]').forEach((box) => box.addEventListener('click', () => {
      openImageLightbox(box.dataset.openLightbox, box.dataset.lightboxLabel);
    }));
  }

  if (firebaseAvailable()) {
    unsubPrizes = listenPrizes((list) => { setState({ prizes: list }, { silent: true }); paint(); });
  }

  return () => { unsubPrizes?.(); };
}
