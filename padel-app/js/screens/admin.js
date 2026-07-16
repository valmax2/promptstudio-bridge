import { getState, setState } from '../store.js';
import {
  listenCustomAvatars, listenPrizes, uploadCustomCatalogItem, deleteCustomCatalogItem,
  updateCustomCatalogItemOrder,
  listenCompatibleRemotes, addCompatibleRemote, updateCompatibleRemoteOrder, deleteCompatibleRemote,
  listenWelcomeImage, uploadWelcomeImage,
} from '../cloud.js';
import { firebaseAvailable } from '../firebase.js';
import { navigate } from '../router.js';
import { escapeHtml } from '../utils.js';
import { toast } from '../app.js';
import { isAdmin } from '../admin.js';
import { openImageCropper } from '../image-crop.js';

const MAX_PRIZES = 5;
const MAX_COMPATIBLE_REMOTES = 4;

export async function renderAdmin(el) {
  if (!isAdmin()) {
    navigate('profile');
    return;
  }

  let unsubAvatars = null;
  let unsubPrizes = null;
  let unsubRemotes = null;
  let unsubWelcomeImage = null;
  let uploading = false;
  let uploadingWelcomeImage = false;
  let pickedRemoteImage = null;

  paint();

  function paint() {
    const customAvatars = [...getState().customAvatars].sort((a, b) => (a.order ?? 9999) - (b.order ?? 9999));
    const prizes = [...getState().prizes].sort((a, b) => (a.order ?? 9999) - (b.order ?? 9999));
    const prizesFull = prizes.length >= MAX_PRIZES;
    const compatibleRemotes = [...getState().compatibleRemotes].sort((a, b) => (a.order ?? 9999) - (b.order ?? 9999));
    const remotesFull = compatibleRemotes.length >= MAX_COMPATIBLE_REMOTES;
    const welcomeImageUrl = getState().welcomeImageUrl;

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

      <div class="card">
        <h2>🖼️ Immagine schermata iniziale</h2>
        <p class="small">L'immagine rettangolare (16:9) mostrata in alto nella prima pagina dell'app. Finché non ne carichi una, si vede l'icona di default.</p>
        <div class="row" style="gap:14px;align-items:center;">
          <img src="${welcomeImageUrl || './icon.svg'}" alt="" style="width:128px;aspect-ratio:16/9;border-radius:10px;object-fit:cover;flex-shrink:0;">
          <input type="file" accept="image/*" id="new-welcome-image-file" class="hidden" style="display:none">
          <button class="btn secondary" id="pick-welcome-image-file" ${uploadingWelcomeImage ? 'disabled' : ''}>${uploadingWelcomeImage ? 'Caricamento...' : '📷 Cambia immagine'}</button>
        </div>
      </div>

      <div class="card">
        <h2>📡 Telecomandi compatibili (${compatibleRemotes.length}/${MAX_COMPATIBLE_REMOTES})</h2>
        <p class="small">Pagina dedicata raggiungibile dalla schermata Bluetooth: nome + link (es. affiliazione Amazon) + immagine opzionale. Al massimo ${MAX_COMPATIBLE_REMOTES}. Compare con dicitura "link sponsorizzato".</p>
        ${remotesFull ? `<p class="small mb0" style="color:var(--danger,#e5484d);">⚠️ Hai già ${MAX_COMPATIBLE_REMOTES} telecomandi. Eliminane uno per poterne aggiungere un altro.</p>` : `
        <div class="field">
          <label>Nome telecomando</label>
          <input id="new-remote-label" placeholder="es. Telecomando scatto foto Bluetooth" maxlength="60">
        </div>
        <div class="field">
          <label>Link</label>
          <input id="new-remote-link" placeholder="https://...">
        </div>
        <div class="field">
          <label>Posizione (opzionale)</label>
          <input id="new-remote-order" type="number" placeholder="es. 1 per metterlo primo">
        </div>
        <div class="row" style="gap:10px;align-items:center;">
          <input type="file" accept="image/*" id="new-remote-file" class="hidden" style="display:none">
          <button class="btn secondary" id="pick-remote-file" type="button">${pickedRemoteImage ? '✓ Immagine scelta' : '📷 Immagine (opzionale)'}</button>
        </div>
        <button class="btn secondary block mt" id="add-remote">➕ Aggiungi alla bacheca</button>
        `}
        <div class="mt">
          ${compatibleRemotes.map((r) => `
            <div class="list-item">
              <div class="avatar">${r.imageUrl ? `<img src="${r.imageUrl}" alt="" style="width:100%;height:100%;object-fit:cover;border-radius:50%;">` : '🎮'}</div>
              <div class="meta"><strong>${escapeHtml(r.label || '')}</strong><span>${escapeHtml(r.link || '')}</span></div>
              <input type="number" class="small" data-order-remote="${r.id}" value="${r.order ?? 9999}" style="width:56px;text-align:center;">
              <button class="btn ghost small" data-save-order-remote="${r.id}">✓</button>
              <button class="btn danger small" data-del-remote="${r.id}">Elimina</button>
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

    el.querySelector('#pick-welcome-image-file').addEventListener('click', () => el.querySelector('#new-welcome-image-file').click());
    el.querySelector('#new-welcome-image-file').addEventListener('change', async (e) => {
      const file = e.target.files[0];
      e.target.value = '';
      if (!file) return;
      const blob = await openImageCropper(file, { shape: 'square', aspect: 16 / 9 });
      if (!blob) return;
      uploadingWelcomeImage = true;
      paint();
      try {
        await uploadWelcomeImage(blob);
        toast('Immagine aggiornata!');
      } catch (err) {
        toast('Errore: ' + err.message);
      } finally {
        uploadingWelcomeImage = false;
        paint();
      }
    });

    el.querySelector('#pick-remote-file')?.addEventListener('click', () => el.querySelector('#new-remote-file').click());
    el.querySelector('#new-remote-file')?.addEventListener('change', async (e) => {
      const file = e.target.files[0];
      e.target.value = '';
      if (!file) return;
      const blob = await openImageCropper(file, { shape: 'circle' });
      if (!blob) return;
      pickedRemoteImage = blob;
      paint();
    });
    el.querySelector('#add-remote')?.addEventListener('click', async () => {
      if (getState().compatibleRemotes.length >= MAX_COMPATIBLE_REMOTES) {
        toast(`Massimo ${MAX_COMPATIBLE_REMOTES} - eliminane uno prima`);
        return;
      }
      const label = el.querySelector('#new-remote-label').value.trim().slice(0, 60);
      const link = el.querySelector('#new-remote-link').value.trim();
      if (!label || !link) { toast('Inserisci nome e link'); return; }
      const orderVal = parseInt(el.querySelector('#new-remote-order').value, 10);
      await addCompatibleRemote(label, link, pickedRemoteImage, isNaN(orderVal) ? 9999 : orderVal);
      pickedRemoteImage = null;
      toast('Aggiunto alla bacheca!');
    });
    el.querySelectorAll('[data-del-remote]').forEach((btn) => btn.addEventListener('click', async () => {
      await deleteCompatibleRemote(btn.dataset.delRemote);
      toast('Rimosso');
    }));
    el.querySelectorAll('[data-save-order-remote]').forEach((btn) => btn.addEventListener('click', async () => {
      const id = btn.dataset.saveOrderRemote;
      const input = el.querySelector(`[data-order-remote="${id}"]`);
      const order = parseInt(input.value, 10);
      await updateCompatibleRemoteOrder(id, isNaN(order) ? 9999 : order);
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
    unsubRemotes = listenCompatibleRemotes((list) => { setState({ compatibleRemotes: list }, { silent: true }); paint(); });
    unsubWelcomeImage = listenWelcomeImage((url) => { setState({ welcomeImageUrl: url }, { silent: true }); if (!uploadingWelcomeImage) paint(); });
  }

  return () => { unsubAvatars?.(); unsubPrizes?.(); unsubRemotes?.(); unsubWelcomeImage?.(); };
}
