import { getState, setState } from '../store.js';
import {
  listenCustomAvatars, listenPrizes, uploadCustomCatalogItem, deleteCustomCatalogItem,
  updateCustomCatalogItemOrder, updateCustomCatalogItemImage, updateCustomCatalogItem,
  listenCompatibleRemotes, addCompatibleRemote, updateCompatibleRemoteOrder, deleteCompatibleRemote,
  updateCompatibleRemoteImage,
  listenWelcomeImage, uploadWelcomeImage,
  listenShareAssets, addShareAsset, deleteShareAsset,
  listenMatchResultIcons, uploadMatchResultIcon,
} from '../cloud.js';
import { firebaseAvailable } from '../firebase.js';
import { navigate } from '../router.js';
import { escapeHtml } from '../utils.js';
import { toast } from '../app.js';
import { isAdmin } from '../admin.js';
import { openImageCropper } from '../image-crop.js';
import { micButtonHtml, wireAllMicButtons } from '../speech-input.js';

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
  let unsubShareBg = null;
  let unsubShareFrames = null;
  let unsubResultIcons = null;
  let uploading = false;
  let uploadingWelcomeImage = false;
  let uploadingShareAsset = false;
  let uploadingResultIcon = false;
  let pickedRemoteImage = null;
  // { kind: 'avatar'|'prize'|'remote', id, shape } dell'elemento la cui foto
  // stiamo per sostituire cliccando sulla sua anteprima già esistente -
  // riusa un solo input file nascosto invece di uno per riga.
  let editingImage = null;
  // Finestra "Modifica accessorio" (id dell'accessorio aperto, o null se
  // chiusa) - un'unica finestra per cambiare foto, link e posizione insieme,
  // invece dei controlli sparsi riga per riga di prima.
  let accessoryEditId = null;
  let accessoryEditPickedImage = null;

  paint();

  function paint() {
    const customAvatars = [...getState().customAvatars].sort((a, b) => (a.order ?? 9999) - (b.order ?? 9999));
    const prizes = [...getState().prizes].sort((a, b) => (a.order ?? 9999) - (b.order ?? 9999));
    const prizesFull = prizes.length >= MAX_PRIZES;
    const compatibleRemotes = [...getState().compatibleRemotes].sort((a, b) => (a.order ?? 9999) - (b.order ?? 9999));
    const remotesFull = compatibleRemotes.length >= MAX_COMPATIBLE_REMOTES;
    const welcomeImageUrl = getState().welcomeImageUrl;
    const shareBackgrounds = getState().shareBackgrounds || [];
    const shareFrames = getState().shareFrames || [];
    const matchResultIcons = getState().matchResultIcons || {};

    el.innerHTML = `
      <div class="topbar"><h1>🛠️ Amministratore</h1></div>

      <div class="card">
        <p class="small">Carica qui le immagini che tutti i giocatori potranno scegliere come avatar nel Profilo. Il campo "Posizione" decide dove appare nella lista: un numero più basso lo mette più in alto (i disegni originali usano 10, 20, 30... quindi ad es. 5 lo mette prima di tutti). Lascialo vuoto per metterlo in fondo, e puoi sempre cambiarlo dopo.</p>
      </div>

      <div class="card">
        <h2>Nuovo avatar</h2>
        <div class="field row" style="align-items:flex-end;gap:6px;">
          <div style="flex:1;">
            <label>Nome</label>
            <input id="new-avatar-label" placeholder="es. Volpe dorata" maxlength="30">
          </div>
          ${micButtonHtml('mic-new-avatar-label')}
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
              <div class="pick-item" data-edit-image="avatar:${a.id}" title="Clicca per cambiare foto" style="cursor:pointer;"><span class="pick-item-preview"><img src="${a.imageUrl}" alt="" style="width:100%;height:100%;object-fit:cover;border-radius:50%;"></span></div>
              <span class="pick-item-label">${escapeHtml(a.label || '')}</span>
              <input type="number" class="small" data-order-avatar="${a.id}" value="${a.order ?? 9999}" style="width:64px;text-align:center;margin-top:4px;">
              <button class="btn ghost small" data-save-order-avatar="${a.id}">✓</button>
              <button class="btn danger small" data-del-avatar="${a.id}">Elimina</button>
            </div>
          `).join('') || '<p class="small mb0">Nessuno.</p>'}
        </div>
      </div>

      <div class="card">
        <h2>🔌 Accessori telecomandi (${prizes.length}/${MAX_PRIZES})</h2>
        <p class="small">Al massimo ${MAX_PRIZES} alla volta: una vetrina che tutti vedono in "Accessori telecomandi" (foto + link opzionale, es. dove comprarli), che cambi quando vuoi. Solo tu la gestisci.</p>
        ${prizesFull ? `<p class="small mb0" style="color:var(--danger,#e5484d);">⚠️ Hai già ${MAX_PRIZES} accessori. Eliminane uno per poterne caricare un altro.</p>` : `
        <div class="field row" style="align-items:flex-end;gap:6px;">
          <div style="flex:1;">
            <label>Nome</label>
            <input id="new-prize-label" placeholder="es. Custodia telecomando" maxlength="30">
          </div>
          ${micButtonHtml('mic-new-prize-label')}
        </div>
        <div class="field">
          <label>Link (opzionale)</label>
          <input id="new-prize-link" placeholder="https://...">
        </div>
        <div class="field">
          <label>Posizione (opzionale)</label>
          <input id="new-prize-order" type="number" placeholder="es. 1 per metterlo primo">
        </div>
        <input type="file" accept="image/*" id="new-prize-file" class="hidden" style="display:none">
        <button class="btn secondary block" id="pick-prize-file" ${uploading ? 'disabled' : ''}>${uploading ? 'Caricamento...' : '🔌 Scegli immagine e carica'}</button>
        `}
      </div>

      <div class="card">
        <h2>Accessori in vetrina</h2>
        <div class="picker-grid">
          ${prizes.map((p) => `
            <div class="frame-pick-wrap">
              <div class="pick-item pick-item-framed"><span class="pick-item-preview"><img src="${p.imageUrl}" alt="" style="width:100%;height:100%;object-fit:cover;"></span></div>
              <span class="pick-item-label">${escapeHtml(p.label || '')}</span>
              <button class="btn ghost small" data-edit-accessory="${p.id}">✏️ Modifica</button>
            </div>
          `).join('') || '<p class="small mb0">Nessuno.</p>'}
        </div>
      </div>

      <div class="card">
        <h2>🖼️ Immagine schermata iniziale</h2>
        <p class="small">L'immagine rettangolare (16:9) mostrata in alto nella prima pagina dell'app. Finché non ne carichi una, si vede l'icona di default.</p>
        <div class="row" style="gap:14px;align-items:center;">
          <img src="${welcomeImageUrl || './icon.png'}" alt="" style="width:128px;aspect-ratio:16/9;border-radius:10px;object-fit:cover;flex-shrink:0;">
          <input type="file" accept="image/*" id="new-welcome-image-file" class="hidden" style="display:none">
          <button class="btn secondary" id="pick-welcome-image-file" ${uploadingWelcomeImage ? 'disabled' : ''}>${uploadingWelcomeImage ? 'Caricamento...' : '📷 Cambia immagine'}</button>
        </div>
      </div>

      <div class="card">
        <h2>🖼️ Sfondi condivisione (${shareBackgrounds.length}/4)</h2>
        <p class="small">Gli sfondi tra cui il giocatore può scegliere quando personalizza l'immagine del risultato (matita nello storico partite). Fino a 4; se non ne carichi nessuno resta solo quello di base. Tocca una miniatura per eliminarla.</p>
        <div class="share-asset-row">
          ${shareBackgrounds.map((b) => `<button class="share-asset-btn" data-del-share-asset="background:${b.id}"><img src="${b.imageUrl}" alt=""></button>`).join('')}
        </div>
        <input type="file" accept="image/*" id="new-share-bg-file" class="hidden" style="display:none">
        <button class="btn secondary block mt" id="pick-share-bg-file" ${uploadingShareAsset || shareBackgrounds.length >= 4 ? 'disabled' : ''}>${uploadingShareAsset ? 'Caricamento...' : '➕ Aggiungi sfondo'}</button>
      </div>

      <div class="card">
        <h2>🪟 Cornici condivisione (${shareFrames.length}/4)</h2>
        <p class="small">Le cornici tra cui il giocatore può scegliere. Usa immagini PNG con il <strong>centro trasparente</strong> (formato verticale 4:5): vengono sovrapposte all'immagine del risultato. Tocca una miniatura per eliminarla.</p>
        <div class="share-asset-row">
          ${shareFrames.map((f) => `<button class="share-asset-btn" data-del-share-asset="frame:${f.id}"><img src="${f.imageUrl}" alt=""></button>`).join('')}
        </div>
        <input type="file" accept="image/*" id="new-share-frame-file" class="hidden" style="display:none">
        <button class="btn secondary block mt" id="pick-share-frame-file" ${uploadingShareAsset || shareFrames.length >= 4 ? 'disabled' : ''}>${uploadingShareAsset ? 'Caricamento...' : '➕ Aggiungi cornice'}</button>
      </div>

      <div class="card">
        <h2>🏆 Icone vinta/persa storico</h2>
        <p class="small">Le immagini tonde accanto a ogni partita nello storico (Statistiche). Se non le carichi si usano le icone di base (trofeo / X).</p>
        <div class="row" style="gap:18px;">
          <div class="center" style="flex:1;">
            <div class="avatar match-result-icon big won" style="margin:0 auto 8px;">${matchResultIcons.wonUrl ? `<img src="${matchResultIcons.wonUrl}" alt="">` : '🏆'}</div>
            <input type="file" accept="image/*" id="new-icon-won-file" class="hidden" style="display:none">
            <button class="btn secondary small" id="pick-icon-won-file" ${uploadingResultIcon ? 'disabled' : ''}>📷 Vinta</button>
          </div>
          <div class="center" style="flex:1;">
            <div class="avatar match-result-icon big lost" style="margin:0 auto 8px;">${matchResultIcons.lostUrl ? `<img src="${matchResultIcons.lostUrl}" alt="">` : '❌'}</div>
            <input type="file" accept="image/*" id="new-icon-lost-file" class="hidden" style="display:none">
            <button class="btn secondary small" id="pick-icon-lost-file" ${uploadingResultIcon ? 'disabled' : ''}>📷 Persa</button>
          </div>
        </div>
      </div>

      <div class="card">
        <h2>📡 Telecomandi compatibili (${compatibleRemotes.length}/${MAX_COMPATIBLE_REMOTES})</h2>
        <p class="small">Pagina dedicata raggiungibile dalla schermata Bluetooth: nome + link (es. affiliazione Amazon) + immagine opzionale. Al massimo ${MAX_COMPATIBLE_REMOTES}. Compare con dicitura "link sponsorizzato".</p>
        ${remotesFull ? `<p class="small mb0" style="color:var(--danger,#e5484d);">⚠️ Hai già ${MAX_COMPATIBLE_REMOTES} telecomandi. Eliminane uno per poterne aggiungere un altro.</p>` : `
        <div class="field row" style="align-items:flex-end;gap:6px;">
          <div style="flex:1;">
            <label>Nome telecomando</label>
            <input id="new-remote-label" placeholder="es. Telecomando scatto foto Bluetooth" maxlength="60">
          </div>
          ${micButtonHtml('mic-new-remote-label')}
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
              <div class="avatar" data-edit-image="remote:${r.id}" title="Clicca per cambiare foto" style="cursor:pointer;">${r.imageUrl ? `<img src="${r.imageUrl}" alt="" style="width:100%;height:100%;object-fit:cover;border-radius:50%;">` : '🎮'}</div>
              <div class="meta"><strong>${escapeHtml(r.label || '')}</strong><span>${escapeHtml(r.link || '')}</span></div>
              <input type="number" class="small" data-order-remote="${r.id}" value="${r.order ?? 9999}" style="width:56px;text-align:center;">
              <button class="btn ghost small" data-save-order-remote="${r.id}">✓</button>
              <button class="btn danger small" data-del-remote="${r.id}">Elimina</button>
            </div>
          `).join('') || '<p class="small mb0">Nessuno.</p>'}
        </div>
      </div>

      <input type="file" accept="image/*" id="edit-image-file" class="hidden" style="display:none">

      ${accessoryEditId ? accessoryEditModal(prizes.find((p) => p.id === accessoryEditId)) : ''}
    `;

    wireAllMicButtons(el);
    el.querySelector('#pick-avatar-file').addEventListener('click', () => el.querySelector('#new-avatar-file').click());
    el.querySelector('#new-avatar-file').addEventListener('change', (e) => handleUpload('avatar', e));

    el.querySelector('#pick-prize-file')?.addEventListener('click', () => el.querySelector('#new-prize-file').click());
    el.querySelector('#new-prize-file')?.addEventListener('change', (e) => handleUpload('prize', e));

    el.querySelectorAll('[data-del-avatar]').forEach((btn) => btn.addEventListener('click', async () => {
      await deleteCustomCatalogItem('avatar', btn.dataset.delAvatar);
      toast('Avatar eliminato');
    }));
    el.querySelectorAll('[data-save-order-avatar]').forEach((btn) => btn.addEventListener('click', async () => {
      const id = btn.dataset.saveOrderAvatar;
      const input = el.querySelector(`[data-order-avatar="${id}"]`);
      const order = parseInt(input.value, 10);
      await updateCustomCatalogItemOrder('avatar', id, isNaN(order) ? 9999 : order);
      toast('Posizione aggiornata');
    }));

    el.querySelectorAll('[data-edit-accessory]').forEach((btn) => btn.addEventListener('click', () => {
      accessoryEditId = btn.dataset.editAccessory;
      accessoryEditPickedImage = null;
      paint();
    }));
    el.querySelector('#accessory-edit-close')?.addEventListener('click', () => { accessoryEditId = null; accessoryEditPickedImage = null; paint(); });
    el.querySelector('#accessory-edit-modal')?.addEventListener('click', (e) => {
      if (e.target.id === 'accessory-edit-modal') { accessoryEditId = null; accessoryEditPickedImage = null; paint(); }
    });
    el.querySelector('#accessory-edit-preview')?.addEventListener('click', () => el.querySelector('#accessory-edit-file').click());
    el.querySelector('#accessory-edit-file')?.addEventListener('change', async (e) => {
      const file = e.target.files[0];
      e.target.value = '';
      if (!file) return;
      const blob = await openImageCropper(file, { shape: 'square' });
      if (!blob) return;
      accessoryEditPickedImage = blob;
      paint();
    });
    el.querySelector('#accessory-edit-save')?.addEventListener('click', async () => {
      const id = accessoryEditId;
      const label = el.querySelector('#accessory-edit-label').value.trim().slice(0, 30) || 'Accessorio';
      const link = el.querySelector('#accessory-edit-link').value.trim();
      const orderVal = parseInt(el.querySelector('#accessory-edit-order').value, 10);
      const order = isNaN(orderVal) ? 9999 : orderVal;
      try {
        if (accessoryEditPickedImage) await updateCustomCatalogItemImage('prize', id, accessoryEditPickedImage);
        await updateCustomCatalogItem('prize', id, { label, link: link || null, order });
        toast('Accessorio aggiornato!');
      } catch (err) {
        toast('Errore: ' + err.message);
      }
      accessoryEditId = null;
      accessoryEditPickedImage = null;
      paint();
    });
    el.querySelector('#accessory-edit-delete')?.addEventListener('click', async () => {
      if (!confirm('Eliminare questo accessorio?')) return;
      await deleteCustomCatalogItem('prize', accessoryEditId);
      toast('Accessorio eliminato');
      accessoryEditId = null;
      accessoryEditPickedImage = null;
      paint();
    });

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

    const wireShareAssetUpload = (pickId, fileId, kind, label, crop) => {
      el.querySelector(pickId)?.addEventListener('click', () => el.querySelector(fileId).click());
      el.querySelector(fileId)?.addEventListener('change', async (e) => {
        const file = e.target.files[0];
        e.target.value = '';
        if (!file) return;
        // Le cornici NON passano dal ritaglio: il PNG col centro trasparente
        // va caricato intero, il ritaglio lo convertirebbe perdendo l'alfa.
        const blob = crop ? await openImageCropper(file, { shape: 'square', aspect: 4 / 5 }) : file;
        if (!blob) return;
        uploadingShareAsset = true;
        paint();
        try {
          await addShareAsset(kind, blob);
          toast(label + ' aggiunto!');
        } catch (err) {
          toast('Errore: ' + err.message);
        } finally {
          uploadingShareAsset = false;
          paint();
        }
      });
    };
    wireShareAssetUpload('#pick-share-bg-file', '#new-share-bg-file', 'background', 'Sfondo', true);
    wireShareAssetUpload('#pick-share-frame-file', '#new-share-frame-file', 'frame', 'Cornice', false);

    el.querySelectorAll('[data-del-share-asset]').forEach((btn) => btn.addEventListener('click', async () => {
      const [kind, itemId] = btn.dataset.delShareAsset.split(':');
      if (!confirm(kind === 'frame' ? 'Eliminare questa cornice?' : 'Eliminare questo sfondo?')) return;
      try {
        await deleteShareAsset(kind, itemId);
        toast('Eliminato');
      } catch (err) {
        toast('Errore: ' + err.message);
      }
    }));

    const wireResultIconUpload = (pickId, fileId, kind) => {
      el.querySelector(pickId)?.addEventListener('click', () => el.querySelector(fileId).click());
      el.querySelector(fileId)?.addEventListener('change', async (e) => {
        const file = e.target.files[0];
        e.target.value = '';
        if (!file) return;
        const blob = await openImageCropper(file, { shape: 'circle' });
        if (!blob) return;
        uploadingResultIcon = true;
        paint();
        try {
          await uploadMatchResultIcon(kind, blob);
          toast('Icona aggiornata!');
        } catch (err) {
          toast('Errore: ' + err.message);
        } finally {
          uploadingResultIcon = false;
          paint();
        }
      });
    };
    wireResultIconUpload('#pick-icon-won-file', '#new-icon-won-file', 'won');
    wireResultIconUpload('#pick-icon-lost-file', '#new-icon-lost-file', 'lost');

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

    el.querySelectorAll('[data-edit-image]').forEach((box) => box.addEventListener('click', () => {
      const [kind, id] = box.dataset.editImage.split(':');
      editingImage = { kind, id };
      el.querySelector('#edit-image-file').click();
    }));
    el.querySelector('#edit-image-file').addEventListener('change', async (e) => {
      const file = e.target.files[0];
      e.target.value = '';
      if (!file || !editingImage) return;
      const { kind, id } = editingImage;
      const shape = kind === 'prize' ? 'square' : 'circle';
      const blob = await openImageCropper(file, { shape });
      editingImage = null;
      if (!blob) return;
      try {
        if (kind === 'remote') await updateCompatibleRemoteImage(id, blob);
        else await updateCustomCatalogItemImage(kind, id, blob);
        toast('Foto aggiornata!');
      } catch (err) {
        toast('Errore: ' + err.message);
      }
      paint();
    });
  }

  // Finestra "Modifica accessorio": foto (con cornice spessa), link e
  // posizione tutti insieme, invece della riga sparsa di prima - si apre dal
  // pulsante "✏️ Modifica" su ogni accessorio in vetrina.
  function accessoryEditModal(prize) {
    if (!prize) return '';
    const previewUrl = accessoryEditPickedImage ? URL.createObjectURL(accessoryEditPickedImage) : prize.imageUrl;
    return `
      <div class="modal-backdrop" id="accessory-edit-modal">
        <div class="modal-card">
          <h2><span>🔌 Modifica accessorio</span><button class="icon-btn" id="accessory-edit-close" aria-label="Chiudi">✕</button></h2>
          <div class="center">
            <div class="pick-item pick-item-framed" id="accessory-edit-preview" style="width:120px;height:120px;margin:0 auto 14px;cursor:pointer;border-radius:14px;overflow:hidden;background:var(--surface-2);display:flex;align-items:center;justify-content:center;position:relative;" title="Tocca per cambiare foto">
              <span class="pick-item-preview"><img src="${previewUrl}" alt="" style="width:100%;height:100%;object-fit:cover;"></span>
            </div>
          </div>
          <input type="file" accept="image/*" id="accessory-edit-file" class="hidden" style="display:none">
          <div class="field row" style="align-items:flex-end;gap:6px;">
            <div style="flex:1;">
              <label>Nome</label>
              <input id="accessory-edit-label" value="${escapeHtml(prize.label || '')}" maxlength="30">
            </div>
            ${micButtonHtml('mic-accessory-edit-label')}
          </div>
          <div class="field">
            <label>Link (opzionale)</label>
            <input id="accessory-edit-link" value="${escapeHtml(prize.link || '')}" placeholder="https://...">
          </div>
          <div class="field">
            <label>Posizione</label>
            <input id="accessory-edit-order" type="number" value="${prize.order ?? 9999}">
          </div>
          <button class="btn primary block mt" id="accessory-edit-save">Salva</button>
          <button class="btn danger block" id="accessory-edit-delete">Elimina accessorio</button>
        </div>
      </div>
    `;
  }

  async function handleUpload(kind, e) {
    const file = e.target.files[0];
    e.target.value = '';
    if (!file) return;
    if (kind === 'prize' && getState().prizes.length >= MAX_PRIZES) {
      toast(`Massimo ${MAX_PRIZES} accessori in vetrina - eliminane uno prima`);
      return;
    }
    const labelInput = el.querySelector(kind === 'avatar' ? '#new-avatar-label' : '#new-prize-label');
    const orderInput = el.querySelector(kind === 'avatar' ? '#new-avatar-order' : '#new-prize-order');
    const label = labelInput.value.trim().slice(0, 30) || (kind === 'avatar' ? 'Avatar' : 'Accessorio');
    const orderVal = parseInt(orderInput.value, 10);
    const order = isNaN(orderVal) ? 9999 : orderVal;
    const link = kind === 'prize' ? el.querySelector('#new-prize-link').value.trim() : null;

    const blob = await openImageCropper(file, { shape: kind === 'avatar' ? 'circle' : 'square' });
    if (!blob) return;

    uploading = true;
    paint();
    try {
      await uploadCustomCatalogItem(kind, label, blob, order, link);
      toast(kind === 'avatar' ? 'Avatar caricato!' : 'Accessorio caricato!');
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
    unsubShareBg = listenShareAssets('background', (items) => { setState({ shareBackgrounds: items }, { silent: true }); if (!uploadingShareAsset) paint(); });
    unsubShareFrames = listenShareAssets('frame', (items) => { setState({ shareFrames: items }, { silent: true }); if (!uploadingShareAsset) paint(); });
    unsubResultIcons = listenMatchResultIcons((icons) => { setState({ matchResultIcons: icons }, { silent: true }); if (!uploadingResultIcon) paint(); });
  }

  return () => { unsubAvatars?.(); unsubPrizes?.(); unsubRemotes?.(); unsubWelcomeImage?.(); unsubShareBg?.(); unsubShareFrames?.(); unsubResultIcons?.(); };
}
