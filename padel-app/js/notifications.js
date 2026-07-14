// Lightweight in-app notifications: toast + a small dot on the bottom nav
// when a friend/event/chat listener (already open via Firestore's realtime
// listeners) reports something new, while the app is open. This does NOT
// cover push notifications when the app is fully closed - that needs a
// server-side trigger (Firebase Cloud Functions -> FCM), which requires the
// paid Blaze plan; see README "Notifiche" section.
import { isCloudReady, listenFriends, listenMyEvents, listenMyChats } from './cloud.js';
import { currentUser } from './firebase.js';

let notifyFn = () => {};
let unsubFriends = null;
let unsubEvents = null;
let unsubChats = null;

export function initNotifications(onNotify) {
  notifyFn = onNotify || (() => {});
  stopNotifications();
  if (!isCloudReady()) return;

  unsubFriends = watchNew(listenFriends, (f) => {
    setNavBadge('community', true);
    notifyFn(f.name ? `${f.name} ti ha aggiunto come amico!` : 'Hai un nuovo amico!');
  });

  unsubEvents = watchNew(listenMyEvents, (e) => {
    if (e.hostId && e.hostId === currentUser()?.uid) return; // skip own event, already confirmed locally
    setNavBadge('events', true);
    notifyFn(`Nuovo evento: ${e.title}`);
  });

  unsubChats = watchChatMessages();
}

export function stopNotifications() {
  unsubFriends?.(); unsubFriends = null;
  unsubEvents?.(); unsubEvents = null;
  unsubChats?.(); unsubChats = null;
}

// Wraps a Firestore collection listener so the first snapshot (existing
// data) is treated as a baseline, and only items that show up afterwards
// fire `onNew` - otherwise every friend/event you already had would "notify"
// again each time the app opens.
function watchNew(listenFn, onNew) {
  let primed = false;
  let knownIds = new Set();
  return listenFn((list) => {
    const ids = list.map((x) => x.id).filter(Boolean);
    if (!primed) {
      primed = true;
      knownIds = new Set(ids);
      return;
    }
    list.filter((x) => x.id && !knownIds.has(x.id)).forEach(onNew);
    knownIds = new Set(ids);
  });
}

// Chat docs don't get a new id per message (only their lastMessageAt field
// changes), so this tracks per-chat timestamps instead of ids.
function watchChatMessages() {
  const me = currentUser()?.uid;
  let primed = false;
  const seenAt = new Map();
  return listenMyChats((chats) => {
    if (!primed) {
      primed = true;
      chats.forEach((c) => seenAt.set(c.id, c.lastMessageAt || 0));
      return;
    }
    chats.forEach((c) => {
      const prev = seenAt.get(c.id) || 0;
      if (c.lastMessageAt && c.lastMessageAt > prev && c.lastSenderId && c.lastSenderId !== me) {
        setNavBadge('community', true);
        notifyFn('Nuovo messaggio in chat');
      }
      seenAt.set(c.id, c.lastMessageAt || 0);
    });
  });
}

export function setNavBadge(route, on) {
  document.querySelector(`.nav-btn[data-route="${route}"]`)?.classList.toggle('has-badge', on);
}
