import { getState, updateProfile, unlockCosmetic, setState } from '../store.js';
import { pushProfile, listenCustomAvatars, listenCustomFrames } from '../cloud.js';
import { firebaseAvailable } from '../firebase.js';
import { toast } from '../app.js';
import { escapeHtml } from '../utils.js';
import { AVATARS } from '../avatars.js';
import { FRAMES } from '../frames.js';

export async function renderGamification(el) {
  let unsubAvatars = null;
  let unsubFrames = null;
  autoUnlock();

  paint();

  function paint() {
    const { profile, customAvatars, customFrames } = getState();
    const xpIntoLevel = profile.xp % 500;
    const pct = Math.round((xpIntoLevel / 500) * 100);

    // Predefiniti e caricati dall'admin condividono la stessa griglia,
    // mescolati per "order" (vedi js/avatars.js, js/frames.js e
    // js/admin.js) invece di stare sempre in due sezioni separate.
    const avatarItems = [
      ...AVATARS.map((a) => ({ kind: 'builtin', ...a })),
      ...customAvatars.map((a) => ({ kind: 'custom', id: a.id, order: a.order ?? 9999, imageUrl: a.imageUrl, label: a.label })),
    ].sort((a, b) => a.order - b.order);

    const frameItems = [
      ...FRAMES.map((f) => ({ kind: 'builtin', ...f })),
      ...customFrames.map((f) => ({ kind: 'custom', id: f.id, order: f.order ?? 9999, imageUrl: f.imageUrl, label: f.label })),
    ].sort((a, b) => a.order - b.order);

    el.innerHTML = `
      <div class="topbar"><h1>Premi</h1></div>

      <div class="card">
        <div class="row between"><strong>Livello ${profile.level}</strong><span class="small">${xpIntoLevel}/500 XP</span></div>
        <div class="xp-bar mt"><div class="xp-bar-fill" style="width:${pct}%"></div></div>
        <p class="small mt mb0">Guadagna XP giocando e vincendo partite. Sblocchi automaticamente nuovi avatar e cornici salendo di livello.</p>
      </div>

      <div class="card">
        <h2>Avatar</h2>
        <div class="picker-grid">
          ${avatarItems.map((it) => it.kind === 'builtin' ? avatarTile(it, profile) : customAvatarTile(it, profile)).join('')}
        </div>
      </div>

      <div class="card">
        <h2>Cornici profilo</h2>
        <div class="picker-grid">
          ${frameItems.map((it) => it.kind === 'builtin' ? frameTile(it, profile) : customFrameTile(it, profile)).join('')}
        </div>
      </div>
    `;

    el.querySelectorAll('[data-avatar]').forEach((btn) => btn.addEventListener('click', async () => {
      if (btn.classList.contains('locked')) { toast(`Sblocchi al livello ${btn.dataset.level}`); return; }
      updateProfile({ avatarEmoji: btn.dataset.avatar, avatarUrl: null });
      try { await pushProfile(getState().profile); } catch {}
      paint();
    }));

    el.querySelectorAll('[data-frame]').forEach((btn) => btn.addEventListener('click', async () => {
      if (btn.classList.contains('locked')) { toast(`Sblocchi al livello ${btn.dataset.level}`); return; }
      updateProfile({ equippedFrame: btn.dataset.frame });
      try { await pushProfile(getState().profile); } catch {}
      paint();
    }));

    el.querySelectorAll('[data-custom-avatar]').forEach((btn) => btn.addEventListener('click', async () => {
      const item = getState().customAvatars.find((a) => a.id === btn.dataset.customAvatar);
      if (!item) return;
      updateProfile({ avatarUrl: item.imageUrl });
      try { await pushProfile(getState().profile); } catch {}
      paint();
    }));

    el.querySelectorAll('[data-custom-frame]').forEach((btn) => btn.addEventListener('click', async () => {
      updateProfile({ equippedFrame: `custom:${btn.dataset.customFrame}` });
      try { await pushProfile(getState().profile); } catch {}
      paint();
    }));
  }

  if (firebaseAvailable()) {
    unsubAvatars = listenCustomAvatars((list) => { setState({ customAvatars: list }, { silent: true }); paint(); });
    unsubFrames = listenCustomFrames((list) => { setState({ customFrames: list }, { silent: true }); paint(); });
  }

  return () => { unsubAvatars?.(); unsubFrames?.(); };
}

function autoUnlock() {
  const { profile } = getState();
  for (const a of AVATARS) {
    if (profile.level >= a.level && !profile.unlockedAvatars.includes(a.id)) {
      unlockCosmetic('avatar', a.id);
      toast('Nuovo avatar sbloccato!');
    }
  }
  for (const f of FRAMES) {
    if (profile.level >= f.level && !profile.unlockedFrames.includes(f.id)) {
      unlockCosmetic('frame', f.id);
      toast(`Nuova cornice sbloccata: ${f.label}`);
    }
  }
}

function avatarTile(a, profile) {
  const unlocked = profile.unlockedAvatars.includes(a.id);
  const selected = profile.avatarEmoji === a.id && !profile.avatarUrl;
  return `<button class="pick-item ${unlocked ? '' : 'locked'} ${selected ? 'selected' : ''}" data-avatar="${a.id}" data-level="${a.level}">
    <span class="pick-item-preview">${a.svg}</span>
    ${unlocked ? '' : '<span class="pick-item-lock">🔒</span>'}
  </button>`;
}

function frameTile(f, profile) {
  const unlocked = profile.unlockedFrames.includes(f.id);
  const selected = profile.equippedFrame === f.id;
  const style = unlocked ? `border-width:4px;border-color:${f.color};box-shadow:${f.id === 'none' ? 'none' : `0 0 10px 1px ${f.glow}`};` : `border-width:4px;border-color:${f.color};`;
  return `<div class="frame-pick-wrap">
    <button class="pick-item ${unlocked ? '' : 'locked'} ${selected ? 'selected' : ''}" data-frame="${f.id}" data-level="${f.level}" style="${style}">
      <span class="pick-item-preview">${f.badge || '⭕'}</span>
      ${unlocked ? '' : '<span class="pick-item-lock">🔒</span>'}
    </button>
    <span class="pick-item-label">${f.label}</span>
  </div>`;
}

function customAvatarTile(a, profile) {
  const selected = profile.avatarUrl === a.imageUrl;
  return `<button class="pick-item ${selected ? 'selected' : ''}" data-custom-avatar="${a.id}">
    <span class="pick-item-preview"><img src="${a.imageUrl}" alt="${escapeHtml(a.label || '')}" style="width:100%;height:100%;object-fit:cover;border-radius:50%;"></span>
  </button>`;
}

function customFrameTile(f, profile) {
  const selected = profile.equippedFrame === `custom:${f.id}`;
  return `<div class="frame-pick-wrap">
    <button class="pick-item ${selected ? 'selected' : ''}" data-custom-frame="${f.id}">
      <span class="pick-item-preview"><img src="${f.imageUrl}" alt="" style="width:100%;height:100%;object-fit:contain;"></span>
    </button>
    <span class="pick-item-label">${escapeHtml(f.label || '')}</span>
  </div>`;
}
