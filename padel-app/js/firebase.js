import { firebaseConfig, vapidKey, isFirebaseConfigured } from '../firebase-config.js';

const SDK_VERSION = '10.13.2';
const CDN = `https://www.gstatic.com/firebasejs/${SDK_VERSION}`;

let _app = null;
let _auth = null;
let _db = null;
let _storage = null;
let _messaging = null;
let _mods = null;
let _initPromise = null;
let _available = false;

export function firebaseAvailable() {
  return _available;
}

// Lazily loads the Firebase modular SDK from the CDN and initializes it.
// Fails gracefully (returns false) when offline or not configured, so the
// rest of the app can keep working in local-only mode.
export async function initFirebase() {
  if (_initPromise) return _initPromise;
  _initPromise = (async () => {
    if (!isFirebaseConfigured) {
      console.warn('[firebase] Configurazione mancante: modalità solo locale.');
      return false;
    }
    try {
      const [appMod, authMod, fsMod, storageMod, msgMod] = await Promise.all([
        import(/* webpackIgnore: true */ `${CDN}/firebase-app.js`),
        import(/* webpackIgnore: true */ `${CDN}/firebase-auth.js`),
        import(/* webpackIgnore: true */ `${CDN}/firebase-firestore.js`),
        import(/* webpackIgnore: true */ `${CDN}/firebase-storage.js`),
        import(/* webpackIgnore: true */ `${CDN}/firebase-messaging.js`).catch(() => null),
      ]);
      _mods = { app: appMod, auth: authMod, fs: fsMod, storage: storageMod, msg: msgMod };
      _app = appMod.initializeApp(firebaseConfig);
      _auth = authMod.initializeAuth
        ? authMod.getAuth(_app)
        : authMod.getAuth(_app);
      _db = fsMod.initializeFirestore
        ? fsMod.initializeFirestore(_app, { experimentalAutoDetectLongPolling: true })
        : fsMod.getFirestore(_app);
      _storage = storageMod.getStorage(_app);
      if (msgMod) {
        try { _messaging = msgMod.getMessaging(_app); } catch { _messaging = null; }
      }
      _available = true;
      return true;
    } catch (err) {
      console.warn('[firebase] Init fallita (probabile assenza di rete):', err.message);
      _available = false;
      return false;
    }
  })();
  return _initPromise;
}

export function mods() { return _mods; }
export function authInstance() { return _auth; }
export function db() { return _db; }
export function storage() { return _storage; }
export function messaging() { return _messaging; }
export { vapidKey };

// ---- Auth: email + password (works identically on any device - phone,
// tablet, no SIM/Google account required, no native plugin) ----
export async function registerWithEmail(email, password) {
  const { auth } = _mods;
  return auth.createUserWithEmailAndPassword(_auth, email, password);
}

export async function signInWithEmail(email, password) {
  const { auth } = _mods;
  return auth.signInWithEmailAndPassword(_auth, email, password);
}

export async function resetPasswordEmail(email) {
  const { auth } = _mods;
  return auth.sendPasswordResetEmail(_auth, email);
}

export function onAuthChanged(cb) {
  if (!_auth) return () => {};
  const { auth } = _mods;
  return auth.onAuthStateChanged(_auth, cb);
}

export function currentUser() {
  return _auth ? _auth.currentUser : null;
}

export async function signOutUser() {
  if (!_auth) return;
  const { auth } = _mods;
  await auth.signOut(_auth);
}

// ---- Firestore helpers ----
export async function fsGet(path) {
  const { fs } = _mods;
  const ref = fs.doc(_db, path);
  const snap = await fs.getDoc(ref);
  return snap.exists() ? snap.data() : null;
}

export async function fsSet(path, data, merge = true) {
  const { fs } = _mods;
  const ref = fs.doc(_db, path);
  await fs.setDoc(ref, data, { merge });
}

export async function fsAdd(collectionPath, data) {
  const { fs } = _mods;
  const ref = fs.collection(_db, collectionPath);
  const docRef = await fs.addDoc(ref, data);
  return docRef.id;
}

export async function fsQueryWhere(collectionPath, field, op, value) {
  const { fs } = _mods;
  const q = fs.query(fs.collection(_db, collectionPath), fs.where(field, op, value));
  const snap = await fs.getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

export function fsListen(path, cb) {
  const { fs } = _mods;
  const ref = fs.doc(_db, path);
  return fs.onSnapshot(ref, (snap) => cb(snap.exists() ? snap.data() : null));
}

export function fsListenCollection(collectionPath, cb, whereClauses = []) {
  const { fs } = _mods;
  let q = fs.collection(_db, collectionPath);
  if (whereClauses.length) {
    q = fs.query(q, ...whereClauses.map(([f, op, v]) => fs.where(f, op, v)));
  }
  return fs.onSnapshot(q, (snap) => cb(snap.docs.map((d) => ({ id: d.id, ...d.data() }))));
}

// ---- Storage: avatar upload ----
export async function uploadAvatar(uid, blob) {
  const { storage: storageMod } = _mods;
  const path = `avatars/${uid}.jpg`;
  const ref = storageMod.ref(_storage, path);
  await storageMod.uploadBytes(ref, blob, { contentType: blob.type || 'image/jpeg' });
  return storageMod.getDownloadURL(ref);
}

// ---- Storage: admin-uploaded avatar/frame catalog images ----
export async function uploadCatalogImage(path, blob) {
  const { storage: storageMod } = _mods;
  const ref = storageMod.ref(_storage, path);
  await storageMod.uploadBytes(ref, blob, { contentType: blob.type || 'image/png' });
  return storageMod.getDownloadURL(ref);
}

