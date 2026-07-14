import { getState, setState } from '../store.js';
import {
  listenCustomAvatars, listenCustomFrames, uploadCustomCatalogItem, deleteCustomCatalogItem,
} from '../cloud.js';
import { firebaseAvailable } from '../firebase.js';
import { navigate } from '../router.js';
import { escapeHtml } from '../utils.js';
import { toast } from '../app.js';
import { isAdmin } from '../admin.js';

export async function renderAdmin(el) {
  if (!isAdmin()) {
    navigate('profile');
    return;
  }

  let unsubAvatars = null;
  let unsubFrames = null;
  let uploading = false;

  paint();

  function paint() {
    const { customAvatars, customFrames } = getState();

    el.innerHTML = `
      <div class="topbar"><h1>🛠️ Amministratore</h1></div>

      <div class="card">
        <p class="small">Carica qui immagini che tutti i giocatori potranno scegliere come avatar o cornice, in "Premi" e nel Profilo.</p>
      </div>

      <div class="card">
        <h2>Nuovo avatar</h2>
        <div class="field">
          <label>Nome</label>
          <input id="new-avatar-label" placeholder="es. Volpe dorata" maxlength="30">
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
              <button class="btn danger small" data-del-avatar="${a.id}">Elimina</button>
            </div>
          `).join('') || '<p class="small mb0">Nessuno.</p>'}
        </div>
      </div>

      <div class="card">
        <h2>Nuova cornice</h2>
        <div class="field">
          <label>Nome</label>
          <input id="new-frame-label" placeholder="es. Fulmine oro" maxlength="30">
        </div>
        <input type="file" accept="image/*" id="new-frame-file" class="hidden" style="display:none">
        <button class="btn secondary block" id="pick-frame-file" ${uploading ? 'disabled' : ''}>${uploading ? 'Caricamento...' : '🖼️ Scegli immagine e carica'}</button>
        <p class="small mt mb0">Consiglio: usa un PNG trasparente al centro (la cornice si sovrappone all'avatar).</p>
      </div>

      <div class="card">
        <h2>Cornici caricate (${customFrames.length})</h2>
        <div class="picker-grid">
          ${customFrames.map((f) => `
            <div class="frame-pick-wrap">
              <div class="pick-item"><span class="pick-item-preview"><img src="${f.imageUrl}" alt="" style="width:100%;height:100%;object-fit:contain;"></span></div>
              <span class="pick-item-label">${escapeHtml(f.label || '')}</span>
              <button class="btn danger small" data-del-frame="${f.id}">Elimina</button>
            </div>
          `).join('') || '<p class="small mb0">Nessuna.</p>'}
        </div>
      </div>
    `;

    el.querySelector('#pick-avatar-file').addEventListener('click', () => el.querySelector('#new-avatar-file').click());
    el.querySelector('#new-avatar-file').addEventListener('change', (e) => handleUpload('avatar', e));

    el.querySelector('#pick-frame-file').addEventListener('click', () => el.querySelector('#new-frame-file').click());
    el.querySelector('#new-frame-file').addEventListener('change', (e) => handleUpload('frame', e));

    el.querySelectorAll('[data-del-avatar]').forEach((btn) => btn.addEventListener('click', async () => {
      await deleteCustomCatalogItem('avatar', btn.dataset.delAvatar);
      toast('Avatar eliminato');
    }));
    el.querySelectorAll('[data-del-frame]').forEach((btn) => btn.addEventListener('click', async () => {
      await deleteCustomCatalogItem('frame', btn.dataset.delFrame);
      toast('Cornice eliminata');
    }));
  }

  async function handleUpload(kind, e) {
    const file = e.target.files[0];
    if (!file) return;
    const labelInput = el.querySelector(kind === 'avatar' ? '#new-avatar-label' : '#new-frame-label');
    const label = labelInput.value.trim().slice(0, 30) || (kind === 'avatar' ? 'Avatar' : 'Cornice');
    uploading = true;
    paint();
    try {
      await uploadCustomCatalogItem(kind, label, file);
      toast(kind === 'avatar' ? 'Avatar caricato!' : 'Cornice caricata!');
    } catch (err) {
      toast('Errore: ' + err.message);
    } finally {
      uploading = false;
      paint();
    }
  }

  if (firebaseAvailable()) {
    unsubAvatars = listenCustomAvatars((list) => { setState({ customAvatars: list }, { silent: true }); if (!uploading) paint(); });
    unsubFrames = listenCustomFrames((list) => { setState({ customFrames: list }, { silent: true }); if (!uploading) paint(); });
  }

  return () => { unsubAvatars?.(); unsubFrames?.(); };
}
