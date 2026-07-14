import { getState } from './store.js';

// Profile avatar frames, unlocked by leveling up (see gamification.js). Each
// one pairs a border color/glow with a small corner badge so equipping one
// actually reads as "themed decoration" rather than just a plain colored ring.
export const FRAMES = [
  { id: 'none', label: 'Nessuna', level: 1, color: 'var(--accent)', glow: 'transparent', badge: '' },
  // Sbloccate fin da subito (livello 1) - semplici di proposito, per dare
  // già una scelta a chi è appena partito; le più elaborate restano un
  // vero traguardo da sbloccare salendo di livello.
  { id: 'bronze', label: 'Bronzo', level: 1, color: '#CD7F32', glow: 'rgba(205,127,50,0.55)', badge: '🥉' },
  { id: 'silver', label: 'Argento', level: 1, color: '#C0C0C0', glow: 'rgba(192,192,192,0.55)', badge: '🥈' },
  { id: 'gold', label: 'Oro', level: 6, color: '#FFD54F', glow: 'rgba(255,213,79,0.6)', badge: '🥇' },
  { id: 'fire', label: 'Fuoco', level: 9, color: '#FF6B4A', glow: 'rgba(255,107,74,0.65)', badge: '🔥' },
  { id: 'ice', label: 'Ghiaccio', level: 12, color: '#69D6FF', glow: 'rgba(105,214,255,0.65)', badge: '❄️' },
  { id: 'neon', label: 'Neon', level: 16, color: '#B388FF', glow: 'rgba(179,136,255,0.7)', badge: '⚡' },
];

// Custom frames caricate dall'admin (vedi js/admin.js) sono immagini intere
// sovrapposte all'avatar, non un colore di bordo - identificate da un id
// "custom:<docId>" in profile.equippedFrame invece di uno dei FRAMES statici.
export function isCustomFrameId(id) {
  return typeof id === 'string' && id.startsWith('custom:');
}

function customFrameById(id) {
  const itemId = id.slice('custom:'.length);
  return (getState().customFrames || []).find((f) => f.id === itemId) || null;
}

export function frameById(id) {
  return FRAMES.find((f) => f.id === id) || FRAMES[0];
}

export function frameStyle(id) {
  if (isCustomFrameId(id)) return 'border-width:0;box-shadow:none;';
  const f = frameById(id);
  const width = f.id === 'none' ? 3 : 5;
  const shadow = f.id === 'none' ? 'none' : `0 0 14px 2px ${f.glow}`;
  return `border-width:${width}px;border-color:${f.color};box-shadow:${shadow};`;
}

export function frameBadgeHtml(id) {
  if (isCustomFrameId(id)) return '';
  const f = frameById(id);
  if (!f.badge) return '';
  return `<span class="avatar-frame-badge">${f.badge}</span>`;
}

export function frameOverlayHtml(id) {
  if (!isCustomFrameId(id)) return '';
  const f = customFrameById(id);
  return f ? `<img class="avatar-frame-overlay" src="${f.imageUrl}" alt="">` : '';
}
