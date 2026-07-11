// Bottom-nav icons as clean line-art SVGs (Feather-style) instead of tiny
// emoji: crisp at any size, and they inherit the button's text color via
// currentColor so the active tab highlights automatically.
const wrap = (paths) => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${paths}</svg>`;

export const NAV_ICONS = {
  home: wrap('<path d="M3 11.5 12 4l9 7.5"/><path d="M5.5 10v9a1 1 0 0 0 1 1H9a1 1 0 0 0 1-1v-4a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1v4a1 1 0 0 0 1 1h2.5a1 1 0 0 0 1-1v-9"/>'),
  scoreboard: wrap('<circle cx="8" cy="8" r="4.2"/><path d="M11 11 20 20"/><path d="M16.5 15.5 20 12"/>'),
  community: wrap('<circle cx="9" cy="8" r="3.2"/><path d="M3.5 19.5c0-3 2.5-5 5.5-5s5.5 2 5.5 5"/><circle cx="17.5" cy="9" r="2.6"/><path d="M14.8 14.3c2.4.2 4.2 2 4.7 4.4"/>'),
  events: wrap('<rect x="4" y="5.5" width="16" height="15" rx="2"/><path d="M4 10h16"/><path d="M8.5 3.5v4"/><path d="M15.5 3.5v4"/>'),
  stats: wrap('<path d="M4 20V13"/><path d="M11 20V6"/><path d="M18 20v-9"/><path d="M3 20h18"/>'),
  profile: wrap('<circle cx="12" cy="8.5" r="3.5"/><path d="M5 20c0-3.9 3.1-6.5 7-6.5s7 2.6 7 6.5"/>'),
};
