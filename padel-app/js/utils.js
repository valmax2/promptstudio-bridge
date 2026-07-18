// Crisp chevron-left icon for "back" buttons — renders consistently across
// devices, unlike the "←" text glyph whose weight/size varies by font.
export const BACK_ICON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 18 9 12 15 6"></polyline></svg>';

// The real Bluetooth rune on a filled blue badge - clearer at a glance than
// the generic 🔵 dot emoji used before, which just read as "a blue circle".
export const BLUETOOTH_ICON = '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="12" fill="#2196F3"/><polyline points="8.5 7.5 15.5 15.5 12 19 12 5 15.5 8.5 8.5 16.5" fill="none" stroke="#fff" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>';

// Feather-style line icons (stessa famiglia di BACK_ICON) per le azioni
// dello storico partite - sostituiscono le emoji 📤✏️🗑️, poco leggibili a
// dimensione piccola e inconsistenti tra dispositivi.
export const SHARE_ICON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.6" y1="10.5" x2="15.4" y2="6.5"/><line x1="8.6" y1="13.5" x2="15.4" y2="17.5"/></svg>';
export const EDIT_ICON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z"/></svg>';
export const DELETE_ICON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></svg>';

// Vittoria/sconfitta nello storico partite - sostituiscono 🏆/➖: il trofeo
// resta chiaro, ma "➖" (un trattino) veniva letto come un'icona rotta più
// che come "partita persa", da qui la X più esplicita.
export const TROPHY_ICON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M8 21h8"/><path d="M12 17v4"/><path d="M7 4h10v5a5 5 0 0 1-10 0Z"/><path d="M7 5H4a1 1 0 0 0-1 1 4 4 0 0 0 4 4"/><path d="M17 5h3a1 1 0 0 1 1 1 4 4 0 0 1-4 4"/></svg>';
export const LOSS_ICON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="7" y1="7" x2="17" y2="17"/><line x1="17" y1="7" x2="7" y2="17"/></svg>';

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
