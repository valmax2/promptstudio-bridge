import { getState, updateProfile } from '../store.js';
import { pushProfile, uploadAvatarBlob } from '../cloud.js';
import { firebaseAvailable, signOutUser, currentUser } from '../firebase.js';
import { navigate } from '../router.js';
import { escapeHtml } from '../utils.js';
import { toast } from '../app.js';

export async function renderProfile(el) {
  const { profile } = getState();
  const authed = !!profile.uid;

  el.innerHTML = `
    <div class="topbar"><h1>Profilo</h1></div>

    <div class="card center">
      <div class="avatar xl" style="margin:0 auto 12px;border-color:${frameColor(profile.equippedFrame)}">${avatarContent(profile)}</div>
      <input type="file" accept="image/*" id="avatar-file" class="hidden" style="display:none">
      <button class="btn secondary small" id="change-avatar">Cambia foto</button>
      <div class="row" style="justify-content:center;flex-wrap:wrap;gap:8px;margin-top:12px;">
        ${profile.unlockedAvatars.map((a) => `<button class="btn ghost small emoji-pick" data-emoji="${a}">${a}</button>`).join('')}
      </div>
    </div>

    <div class="card">
      <div class="field">
        <label>Nome visualizzato</label>
        <input id="name" value="${escapeHtml(profile.name)}" maxlength="30">
      </div>
      ${authed ? `<p class="small">Telefono: ${escapeHtml(profile.phone || '—')}</p>` : ''}
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
        : firebaseAvailable() ? `<button class="btn primary block mt" id="login">Accedi con il telefono</button>` : ''}
    </div>
  `;

  el.querySelectorAll('.emoji-pick').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const emoji = btn.dataset.emoji;
      updateProfile({ avatarEmoji: emoji, avatarUrl: null });
      await syncProfile();
      renderProfile(el);
    });
  });

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
    renderProfile(el);
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

async function syncProfile() {
  try { await pushProfile(getState().profile); } catch {}
}

function avatarContent(profile) {
  if (profile.avatarUrl) return `<img src="${profile.avatarUrl}" alt="avatar">`;
  return profile.avatarEmoji || '🎾';
}

function frameColor(frame) {
  const map = { none: 'var(--accent)', gold: '#FFD54F', fire: '#FF6B4A', ice: '#69D6FF' };
  return map[frame] || 'var(--accent)';
}

function fileToDataUrl(file) {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.readAsDataURL(file);
  });
}
