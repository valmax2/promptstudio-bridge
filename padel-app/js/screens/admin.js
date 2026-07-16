import { getState, setState } from '../store.js';
import {
  listenCustomAvatars, listenPrizes, uploadCustomCatalogItem, deleteCustomCatalogItem,
  updateCustomCatalogItemOrder,
} from '../cloud.js';
import { firebaseAvailable } from '../firebase.js';
import { navigate } from '../router.js';
import { escapeHtml } from '../utils.js';
import { toast } from '../app.js';
import { isAdmin } from '../admin.js';
import { openImageCropper } from '../image-crop.js';

const MAX_PRIZES = 5;

export async function renderAdmin(el) {
  if (!isAdmin()) {
    navigate('profile');
    return;
  }

  let unsubAvatars = null;
  let unsubPrizes = null;
  let uploading = false;

  paint();

  function paint() {
    const customAvatars = [...getState().customAvatars].sort((a, b) => (a.order ?? 9999) - (b.order ?? 9999));
    const prizes = [...getState().prizes].sort((a, b) => (a.order ?? 9999) - (b.order ?? 9999));
    const prizesFull = prizes.length >= MAX_PRIZES;

    el.innerHTML = `
      <div class="topbar"><h1>🛠️ Amministratore</h1></div>

      <div class="card">
        <p class="small">Carica qui le immagini che tutti i giocatori potranno scegliere come avatar nel Profilo. Il campo "Posizione" decide dove appare nella lista: un numero più basso lo mette più in alto (i disegni originali usano 10, 20, 30... quindi ad es. 5 lo mette prima di tutti). Lascialo vuoto per metterlo in fondo, e puoi sempre cambiarlo dopo.</p>
      </div>

      <div class="card">
        <h2>Nuovo avatar</h2>
        <div class="field">
          <label>Nome</label>
          <input id="new-avatar-label" placeholder="es. Volpe dorata" maxlength="30">
        </div>
        <div class="field">
          <label>Posizione (opzionale)</label>
          <input id="new-avatar-order" type="number" placeholder="es. 5 per metterlo primo">
        </div>
        <input type="file" accept="image/*" id="new-avatar-file" class="hidden" style="display:none">
        <button class="btn secondary block" id="pick-avatar-file" ${uploading ? 'disabled' : ''}>${uploading ? 'Caricamento...' : '📷 Scegli immagine e carica'}</button>
      </div>

      <div class="card">
        <h2>Avatar caricati (${customAvatars.length})</h2>
        <div class="picker-grid">
          ${customAvatars.map((a) => `
            <div class="frame-pick-wrap">
              <div class="pick-item"><span class="pick-item-preview"><img src="${a.imageUrl}" alt="" style="width:100%;height:100%;object-fit:cover;border-radius:50%;"></span></div>
              <span class="pick-item-label">${escapeHtml(a.label || '')}</span>
              <input type="number" class="small" data-order-avatar="${a.id}" value="${a.order ?? 9999}" style="width:64px;text-align:center;margin-top:4px;">
              <button class="btn ghost small" data-save-order-avatar="${a.id}">✓</button>
              <button class="btn danger small" data-del-avatar="${a.id}">Elimina</button>
            </div>
          `).join('') || '<p class="small mb0">Nessuno.</p>'}
        </div>
      </div>

      <div class="card">
        <h2>Vetrina Premi (${prizes.length}/${MAX_PRIZES})</h2>
        <p class="small">Al massimo ${MAX_PRIZES} alla volta: una vetrina che tutti vedono in "Premi", che cambi quando vuoi (tema natalizio, un premio vero, ecc). Solo tu la gestisci.</p>
        ${prizesFull ? `<p class="small mb0" style="color:var(--danger,#e5484d);">⚠️ Hai già ${MAX_PRIZES} premi. Eliminane uno per poterne caricare un altro.</p>` : `
        <div class="field">
          <label>Nome</label>
          <input id="new-prize-label" placeholder="es. Buon Natale!" maxlength="30">
        </div>
        <div class="field">
          <label>Posizione (opzionale)</label>
          <input id="new-prize-order" type="number" placeholder="es. 1 per metterlo primo">
        </div>
        <input type="file" accept="image/*" id="new-prize-file" class="hidden" style="display:none">
        <button class="btn secondary block" id="pick-prize-file" ${uploading ? 'disabled' : ''}>${uploading ? 'Caricamento...' : '🎁 Scegli immagine e carica'}</button>
        `}
      </div>

      <div class="card">
        <h2>Premi in vetrina</h2>
        <div class="picker-grid">
          ${prizes.map((p) => `
            <div class="frame-pick-wrap">
              <div class="pick-item"><span class="pick-item-preview"><img src="${p.imageUrl}" alt="" style="width:100%;height:100%;object-fit:cover;"></span></div>
              <span class="pick-item-label">${escapeHtml(p.label || '')}</span>
              <input type="number" class="small" data-order-prize="${p.id}" value="${p.order ?? 9999}" style="width:64px;text-align:center;margin-top:4px;">
              <button class="btn ghost small" data-save-order-prize="${p.id}">✓</button>
              <button class="btn danger small" data-del-prize="${p.id}">Elimina</button>
            </div>
          `).join('') || '<p class="small mb0">Nessuno.</p>'}
        </div>
      </div>
    `;

    el.querySelector('#pick-avatar-file').addEventListener('click', () => el.querySelector('#new-avatar-file').click());
    el.querySelector('#new-avatar-file').addEventListener('change', (e) => handleUpload('avatar', e));

    el.querySelector('#pick-prize-file')?.addEventListener('click', () => el.querySelector('#new-prize-file').click());
    el.querySelector('#new-prize-file')?.addEventListener('change', (e) => handleUpload('prize', e));

    el.querySelectorAll('[data-del-avatar]').forEach((btn) => btn.addEventListener('click', async () => {
      await deleteCustomCatalogItem('avatar', btn.dataset.delAvatar);
      toast('Avatar eliminato');
    }));
    el.querySelectorAll('[data-del-prize]').forEach((btn) => btn.addEventListener('click', async () => {
      await deleteCustomCatalogItem('prize', btn.dataset.delPrize);
      toast('Premio eliminato');
    }));

    el.querySelectorAll('[data-save-order-avatar]').forEach((btn) => btn.addEventListener('click', async () => {
      const id = btn.dataset.saveOrderAvatar;
      const input = el.querySelector(`[data-order-avatar="${id}"]`);
      const order = parseInt(input.value, 10);
      await updateCustomCatalogItemOrder('avatar', id, isNaN(order) ? 9999 : order);
      toast('Posizione aggiornata');
    }));
    el.querySelectorAll('[data-save-order-prize]').forEach((btn) => btn.addEventListener('click', async () => {
      const id = btn.dataset.saveOrderPrize;
      const input = el.querySelector(`[data-order-prize="${id}"]`);
      const order = parseInt(input.value, 10);
      await updateCustomCatalogItemOrder('prize', id, isNaN(order) ? 9999 : order);
      toast('Posizione aggiornata');
    }));
  }

  async function handleUpload(kind, e) {
    const file = e.target.files[0];
    e.target.value = '';
    if (!file) return;
    if (kind === 'prize' && getState().prizes.length >= MAX_PRIZES) {
      toast(`Massimo ${MAX_PRIZES} premi in vetrina - eliminane uno prima`);
      return;
    }
    const labelInput = el.querySelector(kind === 'avatar' ? '#new-avatar-label' : '#new-prize-label');
    const orderInput = el.querySelector(kind === 'avatar' ? '#new-avatar-order' : '#new-prize-order');
    const label = labelInput.value.trim().slice(0, 30) || (kind === 'avatar' ? 'Avatar' : 'Premio');
    const orderVal = parseInt(orderInput.value, 10);
    const order = isNaN(orderVal) ? 9999 : orderVal;

    const blob = await openImageCropper(file, { shape: kind === 'avatar' ? 'circle' : 'square' });
    if (!blob) return;

    uploading = true;
    paint();
    try {
      await uploadCustomCatalogItem(kind, label, blob, order);
      toast(kind === 'avatar' ? 'Avatar caricato!' : 'Premio caricato!');
    } catch (err) {
      toast('Errore: ' + err.message);
    } finally {
      uploading = false;
      paint();
    }
  }

  if (firebaseAvailable()) {
    unsubAvatars = listenCustomAvatars((list) => { setState({ customAvatars: list }, { silent: true }); if (!uploading) paint(); });
    unsubPrizes = listenPrizes((list) => { setState({ prizes: list }, { silent: true }); if (!uploading) paint(); });
  }

  return () => { unsubAvatars?.(); unsubPrizes?.(); };
}
