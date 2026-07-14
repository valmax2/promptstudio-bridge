const KEY = 'padel-app-state-v1';

const DEFAULT_STATE = {
  settings: {
    theme: 'dark',
    fontFamily: "'Segoe UI', Roboto, system-ui, -apple-system, sans-serif",
    fontScale: 1,
    ttsEnabled: true,
    ttsVoiceLang: 'it-IT',
    // 'natural' | 'energetic' | 'calm' - rate/pitch preset applied on top
    // of the chosen voice so announcements sound less robotic.
    ttsVoiceMode: 'natural',
    goldenPoint: true,
    superTiebreak3rdSet: true,
    cloudSyncEnabled: true,
    bleRemoteEnabled: false,
    // Array of { id, deviceDescriptor, deviceName, keyCode, keyLabel, pattern, action }.
    // Replaces the old fixed 3-slot map: any number of remotes/keys/patterns
    // can each be bound to a different action.
    remoteBindings: [],
    // Array of { id, address, deviceName, enabled } - just the connection
    // list. More than one tag can be connected at once (e.g. one per team);
    // once connected, a tag's button press is bridged into the same
    // padel-hw-key event HID remotes use (keyed by its address), so its
    // actions - including per single/double-click pattern - live in
    // remoteBindings above like any other device, not here.
    bleTags: [],
    // Scoreboard color scheme. `preset` picks one of COLOR_PRESETS (see
    // js/color-presets.js) or 'custom' to use the four fields below as-is;
    // they're kept in sync with the preset so switching to "custom" starts
    // from whatever preset was last active instead of a jarring default.
    colorPreset: 'classic',
    teamAColor: '#1565C0',
    teamBColor: '#F2A900',
    numberColor: '#FFFFFF',
    numberBorderColor: '#000000',
    numberBorderWidth: 0,
  },
  profile: {
    uid: null,
    phone: null,
    // Short shareable code (e.g. "7K4RTQ") used to add friends without
    // exchanging phone numbers - assigned on first Google sign-in.
    friendCode: null,
    name: 'Giocatore',
    // Despite the name (kept for compatibility with existing synced
    // profiles), this holds an illustrated-avatar id, not an emoji - see
    // js/avatars.js.
    avatarEmoji: 'f-ponytail',
    avatarUrl: null,
    equippedFrame: 'none',
    xp: 0,
    level: 1,
    unlockedAvatars: ['f-ponytail', 'm-shortbrown', 'f-curly', 'm-afro'],
    unlockedFrames: ['none'],
  },
  // ids of friends/events already surfaced as a notification, so the same
  // one doesn't toast/badge again on every app open - see js/notifications.js.
  seenNotifIds: [],
  friends: [],       // {id, name, phone}
  circles: [],        // {id, name, memberIds, memberNames}
  events: [],          // {id, title, dateTime, location, circleId, hostId, hostName, participants, maxPlayers}
  matches: [],          // {id, date, teamAName, teamBName, sets, winner, golden, superTiebreak}
};

function loadState() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return structuredClone(DEFAULT_STATE);
    const parsed = JSON.parse(raw);
    return deepMerge(structuredClone(DEFAULT_STATE), parsed);
  } catch {
    return structuredClone(DEFAULT_STATE);
  }
}

function deepMerge(base, patch) {
  if (!patch || typeof patch !== 'object') return base;
  for (const k of Object.keys(patch)) {
    if (Array.isArray(patch[k])) base[k] = patch[k];
    else if (patch[k] && typeof patch[k] === 'object') base[k] = deepMerge(base[k] || {}, patch[k]);
    else base[k] = patch[k];
  }
  return base;
}

let state = loadState();
const listeners = new Set();

function persist() {
  localStorage.setItem(KEY, JSON.stringify(state));
}

function notify() {
  listeners.forEach((fn) => fn(state));
}

export function getState() {
  return state;
}

export function subscribe(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export function setState(patch, { silent = false } = {}) {
  state = deepMerge(structuredClone(state), patch);
  persist();
  if (!silent) notify();
  return state;
}

export function updateSettings(patch) {
  return setState({ settings: patch });
}

export function updateProfile(patch) {
  return setState({ profile: patch });
}

export function addMatch(match) {
  const matches = [{ ...match, id: match.id || crypto.randomUUID() }, ...state.matches];
  return setState({ matches });
}

export function addXp(amount) {
  const xp = Math.max(0, (state.profile.xp || 0) + amount);
  const level = 1 + Math.floor(xp / 500);
  return setState({ profile: { xp, level } });
}

export function unlockCosmetic(type, id) {
  const key = type === 'avatar' ? 'unlockedAvatars' : 'unlockedFrames';
  const current = state.profile[key] || [];
  if (current.includes(id)) return state;
  return setState({ profile: { [key]: [...current, id] } });
}

export function replaceCollection(name, items) {
  return setState({ [name]: items });
}

export function upsertInCollection(name, item) {
  const list = state[name] || [];
  const idx = list.findIndex((x) => x.id === item.id);
  const next = idx >= 0 ? [...list.slice(0, idx), item, ...list.slice(idx + 1)] : [item, ...list];
  return setState({ [name]: next });
}
