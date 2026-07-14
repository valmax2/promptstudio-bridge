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
export async function findUserByFriendCode(code) {
  if (!firebaseAvailable()) return null;
  const results = await fsQueryWhere('users', 'friendCode', '==', code.trim().toUpperCase());
  return results[0] || null;
}

export async function addFriend(friendUid, friendData, myData = {}) {
  const id = uid();
  if (!isCloudReady() || !id) return;
  await fsSet(`users/${id}/friends/${friendUid}`, { ...friendData, addedAt: Date.now() });
  // Also write my own name/friendCode on the other side, not just a bare
  // "reciprocalOf" marker - otherwise the friend sees a nameless entry in
  // their own list, and features like chat/event invites have nothing to
  // display for the person who did the adding.
  await fsSet(`users/${friendUid}/friends/${id}`, { ...myData, addedAt: Date.now(), reciprocalOf: id });
}

export function listenFriends(cb) {
  const id = uid();
  if (!isCloudReady() || !id) return () => {};
  return fsListenCollection(`users/${id}/friends`, cb);
}

export async function removeFriend(friendUid) {
  const id = uid();
  if (!isCloudReady() || !id) return;
  const { fs } = mods();
  await fs.deleteDoc(fs.doc(db(), `users/${id}/friends/${friendUid}`));
  await fs.deleteDoc(fs.doc(db(), `users/${friendUid}/friends/${id}`));
}

// ---- Chat (1:1 with a friend) ----
export function chatIdFor(a, b) {
  return [a, b].sort().join('_');
}

export async function ensureChat(otherUid) {
  const id = uid();
  if (!isCloudReady() || !id) return null;
  const chatId = chatIdFor(id, otherUid);
  await fsSet(`chats/${chatId}`, { participants: [id, otherUid].sort(), updatedAt: Date.now() });
  return chatId;
}

export async function sendChatMessage(chatId, text) {
  const id = uid();
  if (!isCloudReady() || !id) return;
  await fsAdd(`chats/${chatId}/messages`, { senderId: id, text, createdAt: Date.now() });
  await fsSet(`chats/${chatId}`, { lastMessage: text, lastMessageAt: Date.now(), lastSenderId: id });
}

export function listenChatMessages(chatId, cb) {
  if (!isCloudReady()) return () => {};
  return fsListenCollection(`chats/${chatId}/messages`, cb);
}

export function listenMyChats(cb) {
  const id = uid();
  if (!isCloudReady() || !id) return () => {};
  return fsListenCollection('chats', cb, [['participants', 'array-contains', id]]);
}

export async function deleteChat(chatId) {
  if (!isCloudReady()) return;
  const { fs } = mods();
  await fs.deleteDoc(fs.doc(db(), `chats/${chatId}`));
}

// ---- Circles (closed groups, shown to users as "Gruppi") ----
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
  if (!snap.exists()) throw new Error('Gruppo non trovato');
  const data = snap.data();
  const memberIds = Array.from(new Set([...(data.memberIds || []), id]));
  await fs.setDoc(ref, { memberIds }, { merge: true });
}

// Adds a friend directly by uid (the "+ Aggiungi" flow), as an alternative
// to sharing a join code.
export async function addMemberToCircle(circleId, friendUid) {
  if (!isCloudReady()) return;
  const { fs } = mods();
  const ref = fs.doc(db(), `circles/${circleId}`);
  const snap = await fs.getDoc(ref);
  if (!snap.exists()) throw new Error('Gruppo non trovato');
  const memberIds = Array.from(new Set([...(snap.data().memberIds || []), friendUid]));
  await fs.setDoc(ref, { memberIds }, { merge: true });
}

export async function leaveCircle(circleId) {
  const id = uid();
  if (!isCloudReady() || !id) return;
  const { fs } = mods();
  const ref = fs.doc(db(), `circles/${circleId}`);
  const snap = await fs.getDoc(ref);
  if (!snap.exists()) return;
  const memberIds = (snap.data().memberIds || []).filter((m) => m !== id);
  await fs.setDoc(ref, { memberIds }, { merge: true });
}

export async function deleteCircle(circleId) {
  if (!isCloudReady()) return;
  const { fs } = mods();
  await fs.deleteDoc(fs.doc(db(), `circles/${circleId}`));
}

export function listenMyCircles(cb) {
  const id = uid();
  if (!isCloudReady() || !id) return () => {};
  return fsListenCollection('circles', cb, [['memberIds', 'array-contains', id]]);
}

// ---- Group chat (one thread per circle, shared by all its members) ----
export async function sendCircleMessage(circleId, text) {
  const id = uid();
  if (!isCloudReady() || !id) return;
  await fsAdd(`circles/${circleId}/messages`, { senderId: id, text, createdAt: Date.now() });
}

export function listenCircleMessages(circleId, cb) {
  if (!isCloudReady()) return () => {};
  return fsListenCollection(`circles/${circleId}/messages`, cb);
}

// ---- Events ----
// invitedFriendIds: uids picked from the friends list when creating the
// event. invitedIds (host + invitees) is what listenMyEvents queries on -
// events no longer require a circle to be visible to the people invited.
export async function createEvent(event, invitedFriendIds = []) {
  const id = uid();
  if (!isCloudReady() || !id) return null;
  const invitedIds = Array.from(new Set([id, ...invitedFriendIds]));
  const participants = { [id]: 'yes' };
  invitedFriendIds.forEach((fid) => { participants[fid] = 'invited'; });
  return fsAdd('events', {
    ...event,
    hostId: id,
    invitedIds,
    participants,
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

export function listenMyEvents(cb) {
  const id = uid();
  if (!isCloudReady() || !id) return () => {};
  return fsListenCollection('events', cb, [['invitedIds', 'array-contains', id]]);
}

export async function deleteEvent(eventId) {
  if (!isCloudReady()) return;
  const { fs } = mods();
  await fs.deleteDoc(fs.doc(db(), `events/${eventId}`));
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
