// Lightweight in-app notifications: toast + a small dot on the bottom nav
// when a friend or event listener (already open via Firestore's realtime
// listeners) reports something new, while the app is open. This does NOT
// cover push notifications when the app is fully closed - that needs a
// server-side trigger (Firebase Cloud Functions -> FCM), which requires the
// paid Blaze plan; see README "Notifiche" section.
import { isCloudReady, listenFriends, listenMyCircles, listenEventsForCircles } from './cloud.js';
import { currentUser } from './firebase.js';

let notifyFn = () => {};
let unsubFriends = null;
let unsubCircles = null;
let unsubEvents = null;

export function initNotifications(onNotify) {
  notifyFn = onNotify || (() => {});
  stopNotifications();
  if (!isCloudReady()) return;

  unsubFriends = watchNew(listenFriends, (f) => {
    setNavBadge('community', true);
    notifyFn(f.name ? `${f.name} ti ha aggiunto come amico!` : 'Hai un nuovo amico!');
  });

  unsubCircles = listenMyCircles((circles) => {
    unsubEvents?.();
    const ids = circles.map((c) => c.id);
    if (!ids.length) return;
    unsubEvents = watchNew(
      (cb) => listenEventsForCircles(ids, cb),
      (e) => {
        if (e.hostId && e.hostId === currentUser()?.uid) return; // skip own event, already confirmed locally
        setNavBadge('events', true);
        notifyFn(`Nuovo evento: ${e.title}`);
      },
    );
  });
}

export function stopNotifications() {
  unsubFriends?.(); unsubFriends = null;
  unsubCircles?.(); unsubCircles = null;
  unsubEvents?.(); unsubEvents = null;
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

export function setNavBadge(route, on) {
  document.querySelector(`.nav-btn[data-route="${route}"]`)?.classList.toggle('has-badge', on);
}
