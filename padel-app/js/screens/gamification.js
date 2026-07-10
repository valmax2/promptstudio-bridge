import { getState, updateProfile, unlockCosmetic } from '../store.js';
import { pushProfile } from '../cloud.js';
import { toast } from '../app.js';

const AVATARS = [
  { id: '🎾', level: 1 }, { id: '🙂', level: 1 }, { id: '😎', level: 2 }, { id: '🔥', level: 3 },
  { id: '🏆', level: 5 }, { id: '🥇', level: 7 }, { id: '🐐', level: 9 }, { id: '🦁', level: 12 },
  { id: '👑', level: 15 }, { id: '💪', level: 18 },
];
const FRAMES = [
  { id: 'none', label: 'Nessuna', level: 1, color: 'var(--accent)' },
  { id: 'bronze', label: 'Bronzo', level: 2, color: '#CD7F32' },
  { id: 'silver', label: 'Argento', level: 4, color: '#C0C0C0' },
  { id: 'gold', label: 'Oro', level: 6, color: '#FFD54F' },
  { id: 'fire', label: 'Fuoco', level: 9, color: '#FF6B4A' },
  { id: 'ice', label: 'Ghiaccio', level: 12, color: '#69D6FF' },
  { id: 'neon', label: 'Neon', level: 16, color: '#B388FF' },
];

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
      toast(`Nuovo avatar sbloccato: ${a.id}`);
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
    ${unlocked ? a.id : '🔒'}
  </button>`;
}

function frameTile(f, profile) {
  const unlocked = profile.unlockedFrames.includes(f.id);
  const selected = profile.equippedFrame === f.id;
  return `<button class="pick-item ${unlocked ? '' : 'locked'} ${selected ? 'selected' : ''}" data-frame="${f.id}" data-level="${f.level}" style="border-color:${selected ? f.color : 'transparent'}">
    ${unlocked ? '🖼️' : '🔒'}
  </button>`;
}
