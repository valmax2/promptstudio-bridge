import { getState, updateProfile, setState } from '../store.js';
import { pushProfile, uploadAvatarBlob, listenCustomAvatars, listenCustomFrames } from '../cloud.js';
import { firebaseAvailable, signOutUser, currentUser } from '../firebase.js';
import { navigate } from '../router.js';
import { escapeHtml } from '../utils.js';
import { toast } from '../app.js';
import { avatarSvg, avatarById } from '../avatars.js';
import { FRAMES, frameStyle, frameBadgeHtml, frameOverlayHtml } from '../frames.js';
import { isAdmin } from '../admin.js';

export async function renderProfile(el) {
  let unsubAvatars = null;
  let unsubFrames = null;

  paint();

  function paint() {
    const { profile, customAvatars, customFrames } = getState();
    const authed = !!profile.uid;

    // Avatar/cornici predefiniti e caricati dall'admin condividono la stessa
    // griglia, mescolati per "order" (vedi js/avatars.js, js/frames.js e
    // js/admin.js) - non sono più due gruppi separati con i predefiniti
    // sempre per primi.
    const avatarItems = [
      ...profile.unlockedAvatars.map((id) => ({ kind: 'builtin', id, order: avatarById(id).order })),
      ...customAvatars.map((a) => ({ kind: 'custom', id: a.id, order: a.order ?? 9999, imageUrl: a.imageUrl, label: a.label })),
    ].sort((a, b) => a.order - b.order);

    const frameItems = [
      ...FRAMES.filter((f) => profile.unlockedFrames.includes(f.id)).map((f) => ({ kind: 'builtin', ...f })),
      ...customFrames.map((f) => ({ kind: 'custom', id: f.id, order: f.order ?? 9999, imageUrl: f.imageUrl, label: f.label })),
    ].sort((a, b) => a.order - b.order);

    el.innerHTML = `
      <div class="topbar"><h1>Profilo</h1></div>

      <div class="card center">
        <div class="avatar-frame-wrap" style="margin:0 auto 12px;">
          <div class="avatar xl" style="${frameStyle(profile.equippedFrame)}">${avatarContent(profile)}</div>
          ${frameBadgeHtml(profile.equippedFrame)}
          ${frameOverlayHtml(profile.equippedFrame)}
        </div>
        <input type="file" accept="image/*" id="avatar-file" class="hidden" style="display:none">
        <button class="btn secondary small" id="change-avatar">Cambia foto</button>
        <div class="row" style="justify-content:center;flex-wrap:wrap;gap:8px;margin-top:12px;">
          ${avatarItems.map((it) => it.kind === 'builtin'
            ? `<button class="avatar-pick ${it.id === profile.avatarEmoji && !profile.avatarUrl ? 'selected' : ''}" data-emoji="${it.id}">${avatarSvg(it.id)}</button>`
            : `<button class="avatar-pick" data-custom-avatar="${it.id}" title="${escapeHtml(it.label || '')}" style="${profile.avatarUrl === it.imageUrl ? 'border-color:var(--accent);' : ''}"><img src="${it.imageUrl}" alt="${escapeHtml(it.label || '')}" style="width:100%;height:100%;object-fit:cover;"></button>`
          ).join('')}
        </div>

        <label class="small mt" style="display:block;">Cornice</label>
        <div class="row" style="justify-content:center;flex-wrap:wrap;gap:8px;margin-top:6px;">
          ${frameItems.map((it) => it.kind === 'builtin'
            ? `<button class="avatar-pick frame-pick ${it.id === profile.equippedFrame ? 'selected' : ''}" data-frame="${it.id}" style="${frameStyle(it.id)}" title="${it.label}">${it.badge || '⭕'}</button>`
            : `<button class="avatar-pick frame-pick ${profile.equippedFrame === `custom:${it.id}` ? 'selected' : ''}" data-custom-frame="${it.id}" title="${escapeHtml(it.label || '')}"><img src="${it.imageUrl}" alt="" style="width:100%;height:100%;object-fit:contain;"></button>`
          ).join('')}
          <button class="btn ghost small" id="more-frames">🔒 Altre</button>
        </div>
      </div>

      ${isAdmin() ? `<div class="card"><button class="btn secondary block" id="go-admin">🛠️ Pannello amministratore</button></div>` : ''}

      <div class="card">
        <div class="field">
          <label>Nome visualizzato</label>
          <input id="name" value="${escapeHtml(profile.name)}" maxlength="30">
        </div>
        ${authed ? `<p class="small">Codice amico: ${escapeHtml(profile.friendCode || '—')}</p>` : ''}
        <button class="btn primary block" id="save-name">Salva</button>
      </div>

      <div class="card row between">
        <div><strong>Livello ${profile.level}</strong><p class="mb0 small">${profile.xp} XP</p></div>
        <button class="btn ghost small" id="go-gami">Vedi premi</button>
      </div>

      <div class="card">
        <button class="btn ghost block" id="go-settings">⚙️ Impostazioni</button>
        ${authed
          ? `<button class="btn danger block mt" id="logout">Esci</button>`
          : firebaseAvailable() ? `<button class="btn primary block mt" id="login">Accedi</button>` : ''}
      </div>
    `;

    el.querySelectorAll('[data-emoji]').forEach((btn) => {
      btn.addEventListener('click', async () => {
        const emoji = btn.dataset.emoji;
        updateProfile({ avatarEmoji: emoji, avatarUrl: null });
        await syncProfile();
        paint();
      });
    });

    el.querySelectorAll('[data-custom-avatar]').forEach((btn) => {
      btn.addEventListener('click', async () => {
        const item = getState().customAvatars.find((a) => a.id === btn.dataset.customAvatar);
        if (!item) return;
        updateProfile({ avatarUrl: item.imageUrl });
        await syncProfile();
        paint();
      });
    });

    el.querySelectorAll('[data-frame]').forEach((btn) => {
      btn.addEventListener('click', async () => {
        updateProfile({ equippedFrame: btn.dataset.frame });
        await syncProfile();
        paint();
      });
    });

    el.querySelectorAll('[data-custom-frame]').forEach((btn) => {
      btn.addEventListener('click', async () => {
        updateProfile({ equippedFrame: `custom:${btn.dataset.customFrame}` });
        await syncProfile();
        paint();
      });
    });
    el.querySelector('#more-frames')?.addEventListener('click', () => navigate('gamification'));
    el.querySelector('#go-admin')?.addEventListener('click', () => navigate('admin'));

    el.querySelector('#change-avatar').addEventListener('click', () => el.querySelector('#avatar-file').click());
    el.querySelector('#avatar-file').addEventListener('change', async (e) => {
      const file = e.target.files[0];
      if (!file) return;
      const dataUrl = await fileToDataUrl(file);
      updateProfile({ avatarUrl: dataUrl });
      if (currentUser()) {
        try {
          const url = await uploadAvatarBlob(file);
          if (url) updateProfile({ avatarUrl: url });
        } catch {}
      }
      await syncProfile();
      paint();
    });

    el.querySelector('#save-name').addEventListener('click', async () => {
      const name = el.querySelector('#name').value.trim().slice(0, 30) || 'Giocatore';
      updateProfile({ name });
      await syncProfile();
      toast('Profilo aggiornato');
    });

    el.querySelector('#go-gami').addEventListener('click', () => navigate('gamification'));
    el.querySelector('#go-settings').addEventListener('click', () => navigate('settings'));
    el.querySelector('#logout')?.addEventListener('click', async () => {
      await signOutUser();
      updateProfile({ uid: null, phone: null });
      toast('Disconnesso');
      navigate('home');
    });
    el.querySelector('#login')?.addEventListener('click', () => navigate('login'));
  }

  if (firebaseAvailable()) {
    unsubAvatars = listenCustomAvatars((list) => { setState({ customAvatars: list }, { silent: true }); paint(); });
    unsubFrames = listenCustomFrames((list) => { setState({ customFrames: list }, { silent: true }); paint(); });
  }

  return () => { unsubAvatars?.(); unsubFrames?.(); };
}

async function syncProfile() {
  try { await pushProfile(getState().profile); } catch {}
}

function avatarContent(profile) {
  if (profile.avatarUrl) return `<img src="${profile.avatarUrl}" alt="avatar">`;
  return avatarSvg(profile.avatarEmoji);
}

function fileToDataUrl(file) {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.readAsDataURL(file);
  });
}
