import { getState, setState } from '../store.js';
import { listenCompatibleRemotes } from '../cloud.js';
import { firebaseAvailable } from '../firebase.js';
import { navigate } from '../router.js';
import { escapeHtml, BACK_ICON } from '../utils.js';
import { isAdmin } from '../admin.js';

// Pagina dedicata (non più una card dentro Bluetooth) cosi la bacheca
// admin-curata di telecomandi consigliati (max 4, vedi js/screens/admin.js)
// ha spazio per un'immagine per ognuno senza essere schiacciata in una
// lista stretta.
export async function renderRemoteBoard(el) {
  let unsub = null;

  paint(el);

  if (firebaseAvailable()) {
    unsub = listenCompatibleRemotes((list) => {
      setState({ compatibleRemotes: list }, { silent: true });
      paint(el);
    });
  }

  return () => { unsub?.(); };
}

function paint(el) {
  const list = [...getState().compatibleRemotes].sort((a, b) => (a.order ?? 9999) - (b.order ?? 9999));

  el.innerHTML = `
    <div class="topbar"><div class="row"><button class="icon-btn" id="rb-back" aria-label="Indietro">${BACK_ICON}</button><h1>📡 Telecomandi compatibili</h1></div></div>

    ${list.length ? list.map((r) => `
      <div class="card row" style="gap:14px;align-items:center;">
        <div class="avatar" style="width:64px;height:64px;">${r.imageUrl ? `<img src="${r.imageUrl}" alt="" style="width:100%;height:100%;object-fit:cover;border-radius:50%;">` : '🎮'}</div>
        <div class="meta" style="flex:1;"><strong>${escapeHtml(r.label || '')}</strong></div>
        <a class="btn primary small" href="${escapeHtml(r.link || '#')}" target="_blank" rel="noopener noreferrer">Vedi</a>
      </div>
    `).join('') : '<div class="card"><p class="small mb0">Nessun telecomando consigliato al momento.</p></div>'}

    <div class="card"><p class="small mb0" style="opacity:0.7;">Link sponsorizzato/affiliato.</p></div>

    ${isAdmin() ? `<div class="card"><button class="btn secondary block" id="rb-manage">🛠️ Gestisci bacheca</button></div>` : ''}
  `;

  el.querySelector('#rb-back').addEventListener('click', () => navigate('bluetooth-setup'));
  el.querySelector('#rb-manage')?.addEventListener('click', () => navigate('admin'));
}
