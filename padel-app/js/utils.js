// Crisp chevron-left icon for "back" buttons — renders consistently across
// devices, unlike the "←" text glyph whose weight/size varies by font.
export const BACK_ICON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 18 9 12 15 6"></polyline></svg>';

// The real Bluetooth rune on a filled blue badge - clearer at a glance than
// the generic 🔵 dot emoji used before, which just read as "a blue circle".
export const BLUETOOTH_ICON = '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="12" fill="#2196F3"/><polyline points="8.5 7.5 15.5 15.5 12 19 12 5 15.5 8.5 8.5 16.5" fill="none" stroke="#fff" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>';

export function escapeHtml(str = '') {
  return String(str).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

export function formatDateTime(iso) {
  const d = new Date(iso);
  return `${d.toLocaleDateString('it-IT')} · ${d.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })}`;
}

export function uid() {
  return crypto.randomUUID();
}

// Short, easy-to-read/share code (no ambiguous 0/O/1/I) for adding friends
// without exchanging phone numbers - e.g. "7K4RTQ".
const FRIEND_CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
export function genFriendCode() {
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += FRIEND_CODE_ALPHABET[Math.floor(Math.random() * FRIEND_CODE_ALPHABET.length)];
  }
  return code;
}

export function debounce(fn, ms = 500) {
  let t;
  return (...args) => {
    clearTimeout(t);
    t = setTimeout(() => fn(...args), ms);
  };
}
