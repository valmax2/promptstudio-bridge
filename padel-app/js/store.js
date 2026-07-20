const KEY = 'padel-app-state-v1';

const DEFAULT_STATE = {
  settings: {
    theme: 'dark',
    // Lingua dei testi dell'interfaccia (vedi js/i18n.js) - separata dalla
    // lingua della sintesi vocale (ttsVoiceLang) qui sotto, anche se di
    // solito si cambiano insieme.
    appLanguage: 'it',
    uiAccent: 'default',
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
    // Fino a 3 club preferiti salvati manualmente (nessuna ricerca
    // automatica/API a pagamento) - array di { id, name, hours, phone }.
    // Vedi js/screens/settings.js, categoria "Club".
    favoriteClubs: [],
    // Ultimi nomi usati in "Nuova partita" - null finché non si inizia la
    // prima partita. Precompila i campi la volta dopo invece di farli
    // ripartire vuoti/coi placeholder generici. Stessa forma di una voce di
    // namePresets sotto (vedi js/screens/scoreboard.js).
    lastMatchNames: null,
    // Fino a 3 configurazioni nome squadra/giocatori salvate a mano
    // dall'utente (es. "Io e Marco vs i soliti") - { id, label, mode,
    // a, b, teamA, a1, a2, teamB, b1, b2 }, solo i campi del mode salvato
    // sono valorizzati. Vedi js/screens/scoreboard.js.
    namePresets: [],
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
    // 0-3: quanto ingrandire il numero del punteggio oltre la dimensione
    // normale (vedi color-presets.js applyColorsToDom) - utile soprattutto
    // in modalità "solo punteggio" e in verticale, dove c'è più spazio
    // libero da riempire.
    numberSizeStep: 0,
    // 0 = disattivato; altrimenti annuncia a voce l'ora corrente ogni tot
    // partite salvate, così chi gioca sa se c'è ancora tempo per un'altra.
    announceTimeEveryMatches: 0,
    // Frase personalizzata per l'annuncio orario a fine partita, con
    // {orario} come segnaposto - null = usa la frase predefinita di sistema.
    timeAnnouncePhrase: null,
    // Frasi personalizzate per l'annuncio vocale di fine partita: {id, text}
    // con {vincitore}/{avversario} come segnaposto per i nomi squadra.
    // activeVictoryPhraseId null = usa l'annuncio predefinito.
    victoryPhrases: [],
    activeVictoryPhraseId: null,
    // Attiva la Modalità Interfaccia Light da dentro l'app (vedi
    // js/lite-mode.js:isLiteMode()) - riduce l'app a solo Nuova partita +
    // Bluetooth, reversibile in qualsiasi momento dall'utente. Separata dal
    // flag LITE_MODE di build (sempre permanente, usato solo per l'APK beta).
    liteModeUser: false,
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
    avatarEmoji: 'm-cap',
    avatarUrl: null,
    // true se sbloccato tramite codice amico (js/cloud.js:redeemProCode) -
    // percorso separato dall'acquisto Play Billing, ma isPro() in
    // js/billing.js considera entrambi validi allo stesso modo.
    proGranted: false,
  },
  // ids of friends/events already surfaced as a notification, so the same
  // one doesn't toast/badge again on every app open - see js/notifications.js.
  seenNotifIds: [],
  // 1:1 chat id or circle id -> timestamp of the last message the user
  // actually opened that conversation to read, used to show a per-item
  // unread dot in Community (separate from the generic nav badge).
  readReceipts: {},
  // Shows the welcome/onboarding screen once on first-ever launch; reachable
  // again afterwards via the "ⓘ Guida" entry in Impostazioni.
  hasSeenWelcome: false,
  // La guida "dove toccare" del tabellone esce da sola solo alla primissima
  // partita; dopo resta richiamabile dal cerchietto "i" sul tabellone.
  hasSeenScoreboardHelp: false,
  friends: [],       // {id, name, phone}
  circles: [],        // {id, name, memberIds, memberNames}
  events: [],          // {id, title, dateTime, location, circleId, hostId, hostName, participants, maxPlayers}
  matches: [],          // {id, date, teamAName, teamBName, sets, winner, golden, superTiebreak}
  // Catalogo condiviso di avatar custom caricati dall'admin (vedi
  // js/admin.js): {id, label, imageUrl, order, createdAt}.
  customAvatars: [],
  // Vetrina "Premi": sempre al massimo 5 elementi, gestiti solo dall'admin
  // (niente XP/livelli/sblocchi - solo un annuncio/vetrina che chiunque
  // vede ma solo lei può cambiare). {id, label, imageUrl, order, createdAt}.
  prizes: [],
  // Bacheca "Telecomandi compatibili" gestita solo dall'admin: nome +
  // link (affiliazione Amazon o altro negozio). {id, label, link, order, createdAt}.
  compatibleRemotes: [],
  // Immagine circolare mostrata nella schermata iniziale, sostituibile
  // dall'admin in qualsiasi momento (vedi js/screens/admin.js). null finché
  // l'admin non ne carica una: si usa icon.png come immagine provvisoria.
  welcomeImageUrl: null,
  // Cataloghi admin per l'immagine di condivisione partita (js/match-share.js):
  // il giocatore sceglie sfondo e cornice tra questi nella finestra di
  // modifica pre-condivisione. Array di {id, imageUrl}, max 4 per tipo.
  shareBackgrounds: [],
  shareFrames: [],
  // Icone vinta/persa dello storico partite, sostituibili dall'admin -
  // null = icone SVG predefinite (trofeo / X).
  matchResultIcons: { wonUrl: null, lostUrl: null },
  // Stato dell'acquisto "Pro" - va trattato come sola lettura lato UI:
  // l'unico modo corretto per cambiarlo è js/billing.js:verifyProOnLaunch(),
  // che lo riverifica sempre contro Play Billing (mai un valore che si
  // "autoconferma" in locale).
  pro: false,
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

export function markConversationRead(conversationId) {
  return setState({ readReceipts: { [conversationId]: Date.now() } }, { silent: true });
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
