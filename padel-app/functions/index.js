const functions = require('firebase-functions');
const admin = require('firebase-admin');

admin.initializeApp();
const db = admin.firestore();
const messaging = admin.messaging();

async function sendToUsers(uids, notification, data = {}) {
  const tokens = [];
  await Promise.all(uids.map(async (uid) => {
    const snap = await db.doc(`users/${uid}`).get();
    const token = snap.exists ? snap.data().pushToken : null;
    if (token) tokens.push(token);
  }));
  if (!tokens.length) return;
  await messaging.sendEachForMulticast({
    tokens,
    notification,
    data,
  }).catch((err) => console.error('sendEachForMulticast error', err));
}

// Notifies circle members when a new event is created, and notifies the host
// when someone RSVPs. Keeps the "reach 4 players" loop moving without the
// app needing to be open.
exports.onEventWrite = functions.firestore
  .document('events/{eventId}')
  .onWrite(async (change, context) => {
    const eventId = context.params.eventId;
    const before = change.before.exists ? change.before.data() : null;
    const after = change.after.exists ? change.after.data() : null;
    if (!after) return null;

    if (!before) {
      // New event created: notify all circle members except the host.
      const circleSnap = await db.doc(`circles/${after.circleId}`).get();
      if (!circleSnap.exists) return null;
      const memberIds = (circleSnap.data().memberIds || []).filter((uid) => uid !== after.hostId);
      const hostSnap = await db.doc(`users/${after.hostId}`).get();
      const hostName = hostSnap.exists ? hostSnap.data().name : 'Un giocatore';
      await sendToUsers(memberIds, {
        title: '📅 Nuova partita organizzata',
        body: `${hostName} ha creato "${after.title}". Rispondi per confermare la presenza!`,
      }, { eventId, type: 'event_invite' });
      return null;
    }

    // Existing event updated: detect new / changed RSVP responses.
    const beforeP = before.participants || {};
    const afterP = after.participants || {};
    const changedUids = Object.keys(afterP).filter((uid) => afterP[uid] !== beforeP[uid] && uid !== after.hostId);
    if (!changedUids.length) return null;

    const confirmed = Object.values(afterP).filter((v) => v === 'yes').length;
    for (const uid of changedUids) {
      const userSnap = await db.doc(`users/${uid}`).get();
      const name = userSnap.exists ? userSnap.data().name : 'Un amico';
      const status = afterP[uid];
      await sendToUsers([after.hostId], {
        title: status === 'yes' ? '✅ Nuova conferma' : '❌ Ha rifiutato',
        body: `${name} ${status === 'yes' ? 'parteciperà a' : 'non può partecipare a'} "${after.title}" (${confirmed}/${after.maxPlayers || 4})`,
      }, { eventId, type: 'event_rsvp' });
    }

    if (confirmed >= (after.maxPlayers || 4) && (before.participants ? Object.values(before.participants).filter((v) => v === 'yes').length : 0) < (after.maxPlayers || 4)) {
      const allUids = Object.keys(afterP);
      await sendToUsers(allUids, {
        title: '🎉 Squadra al completo!',
        body: `"${after.title}" ha raggiunto ${after.maxPlayers || 4} giocatori.`,
      }, { eventId, type: 'event_full' });
    }
    return null;
  });
