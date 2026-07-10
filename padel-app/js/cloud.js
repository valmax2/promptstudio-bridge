// Thin wrappers around js/firebase.js that map app entities (profile, friends,
// circles, events, matches) onto Firestore collections. Every function is a
// no-op (returns null / does nothing) when Firebase isn't configured or the
// device is offline, so screens can call these unconditionally.
import {
  firebaseAvailable, db, mods, currentUser,
  fsGet, fsSet, fsAdd, fsQueryWhere, fsListenCollection, uploadAvatar,
} from './firebase.js';

function uid() {
  const u = currentUser();
  return u ? u.uid : null;
}

export function isCloudReady() {
  return firebaseAvailable() && !!uid();
}

// ---- Profile ----
export async function pullProfile() {
  const id = uid();
  if (!isCloudReady() || !id) return null;
  return fsGet(`users/${id}`);
}

export async function pushProfile(profile) {
  const id = uid();
  if (!isCloudReady() || !id) return;
  await fsSet(`users/${id}`, { ...profile, uid: id, updatedAt: Date.now() });
}

export async function uploadAvatarBlob(blob) {
  const id = uid();
  if (!isCloudReady() || !id) return null;
  return uploadAvatar(id, blob);
}

// ---- Friends ----
export async function findUserByPhone(phone) {
  if (!firebaseAvailable()) return null;
  const results = await fsQueryWhere('users', 'phone', '==', phone);
  return results[0] || null;
}

export async function addFriend(friendUid, friendData) {
  const id = uid();
  if (!isCloudReady() || !id) return;
  await fsSet(`users/${id}/friends/${friendUid}`, { ...friendData, addedAt: Date.now() });
  await fsSet(`users/${friendUid}/friends/${id}`, { addedAt: Date.now(), reciprocalOf: id });
}

export function listenFriends(cb) {
  const id = uid();
  if (!isCloudReady() || !id) return () => {};
  return fsListenCollection(`users/${id}/friends`, cb);
}

// ---- Circles (closed groups) ----
export async function createCircle(name) {
  const id = uid();
  if (!isCloudReady() || !id) return null;
  return fsAdd('circles', { name, ownerId: id, memberIds: [id], createdAt: Date.now() });
}

export async function joinCircle(circleId) {
  const id = uid();
  if (!isCloudReady() || !id) return;
  const { fs } = mods();
  const ref = fs.doc(db(), `circles/${circleId}`);
  const snap = await fs.getDoc(ref);
  if (!snap.exists()) throw new Error('Cerchia non trovata');
  const data = snap.data();
  const memberIds = Array.from(new Set([...(data.memberIds || []), id]));
  await fs.setDoc(ref, { memberIds }, { merge: true });
}

export function listenMyCircles(cb) {
  const id = uid();
  if (!isCloudReady() || !id) return () => {};
  return fsListenCollection('circles', cb, [['memberIds', 'array-contains', id]]);
}

// ---- Events ----
export async function createEvent(event) {
  const id = uid();
  if (!isCloudReady() || !id) return null;
  return fsAdd('events', {
    ...event,
    hostId: id,
    participants: { [id]: 'yes' },
    createdAt: Date.now(),
  });
}

export async function respondToEvent(eventId, response) {
  const id = uid();
  if (!isCloudReady() || !id) return;
  const { fs } = mods();
  const ref = fs.doc(db(), `events/${eventId}`);
  await fs.setDoc(ref, { participants: { [id]: response } }, { merge: true });
}

export function listenEventsForCircles(circleIds, cb) {
  if (!isCloudReady() || !circleIds.length) return () => {};
  return fsListenCollection('events', cb, [['circleId', 'in', circleIds.slice(0, 10)]]);
}

// ---- Matches ----
export async function pushMatch(match) {
  const id = uid();
  if (!isCloudReady() || !id) return;
  await fsAdd('matches', { ...match, createdBy: id, createdAt: Date.now() });
}

export function listenMyMatches(cb) {
  const id = uid();
  if (!isCloudReady() || !id) return () => {};
  return fsListenCollection('matches', cb, [['createdBy', '==', id]]);
}
