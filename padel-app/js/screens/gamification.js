import { getState, updateProfile, unlockCosmetic } from '../store.js';
import { pushProfile } from '../cloud.js';
import { toast } from '../app.js';
import { AVATARS } from '../avatars.js';
import { FRAMES } from '../frames.js';

export async function renderGamification(el) {
  autoUnlock();
  const { profile } = getState();
  const xpIntoLevel = profile.xp % 500;
  const pct = Math.round((xpIntoLevel / 500) * 100);

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
        ${AVATARS.map((a) => avatarTile(a, profile)).join('')}
      </div>
    </div>

    <div class="card">
      <h2>Cornici profilo</h2>
      <div class="picker-grid">
        ${FRAMES.map((f) => frameTile(f, profile)).join('')}
      </div>
    </div>
  `;

  el.querySelectorAll('[data-avatar]').forEach((btn) => btn.addEventListener('click', async () => {
    if (btn.classList.contains('locked')) { toast(`Sblocchi al livello ${btn.dataset.level}`); return; }
    updateProfile({ avatarEmoji: btn.dataset.avatar, avatarUrl: null });
    try { await pushProfile(getState().profile); } catch {}
    renderGamification(el);
  }));

  el.querySelectorAll('[data-frame]').forEach((btn) => btn.addEventListener('click', async () => {
    if (btn.classList.contains('locked')) { toast(`Sblocchi al livello ${btn.dataset.level}`); return; }
    updateProfile({ equippedFrame: btn.dataset.frame });
    try { await pushProfile(getState().profile); } catch {}
    renderGamification(el);
  }));
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
