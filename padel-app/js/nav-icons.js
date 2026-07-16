// Bottom-nav icons as clean line-art SVGs (Feather-style) instead of tiny
// emoji: crisp at any size, and they inherit the button's text color via
// currentColor so the active tab highlights automatically.
const wrap = (paths) => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${paths}</svg>`;

export const NAV_ICONS = {
  home: wrap('<path d="M3 11.5 12 4l9 7.5"/><path d="M5.5 10v9a1 1 0 0 0 1 1H9a1 1 0 0 0 1-1v-4a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1v4a1 1 0 0 0 1 1h2.5a1 1 0 0 0 1-1v-9"/>'),
  scoreboard: wrap('<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M3 9h18"/><path d="M12 9v11"/><rect x="6" y="12.5" width="4" height="6" rx="1"/><rect x="14" y="12.5" width="4" height="6" rx="1"/>'),
  community: wrap('<circle cx="9" cy="8" r="3.2"/><path d="M3.5 19.5c0-3 2.5-5 5.5-5s5.5 2 5.5 5"/><circle cx="17.5" cy="9" r="2.6"/><path d="M14.8 14.3c2.4.2 4.2 2 4.7 4.4"/>'),
  events: wrap('<rect x="4" y="5.5" width="16" height="15" rx="2"/><path d="M4 10h16"/><path d="M8.5 3.5v4"/><path d="M15.5 3.5v4"/>'),
  settings: wrap('<circle cx="12" cy="12" r="3.2"/><path d="M12 2.5v3M12 18.5v3M4.2 4.2l2.1 2.1M17.7 17.7l2.1 2.1M2.5 12h3M18.5 12h3M4.2 19.8l2.1-2.1M17.7 6.3l2.1-2.1"/>'),
  stats: wrap('<path d="M4 20V13"/><path d="M11 20V6"/><path d="M18 20v-9"/><path d="M3 20h18"/>'),
  profile: wrap('<circle cx="12" cy="8.5" r="3.5"/><path d="M5 20c0-3.9 3.1-6.5 7-6.5s7 2.6 7 6.5"/>'),
};
