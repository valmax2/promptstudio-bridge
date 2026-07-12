import { firebaseAvailable, signInWithGoogleIdToken, currentUser } from '../firebase.js';
import { googleAuthSupported, initGoogleAuth, signInWithGoogle } from '../google-auth.js';
import { updateProfile, updateSettings } from '../store.js';
import { pushProfile, pullProfile } from '../cloud.js';
import { navigate } from '../router.js';
import { toast } from '../app.js';
import { genFriendCode } from '../utils.js';
import { isGoogleAuthConfigured } from '../../firebase-config.js';

export async function renderLogin(el) {
  if (!firebaseAvailable()) {
    el.innerHTML = `
      <div class="topbar"><h1>Accesso</h1></div>
      <div class="card center">
        <span class="empty-state icon" style="font-size:2.4em;display:block;">☁️❌</span>
        <p>Il login richiede Firebase configurato. Vedi <strong>README.md</strong> per attivarlo in pochi minuti (gratuito).</p>
        <button class="btn secondary block mt" id="back">Torna alla home</button>
      </div>`;
    el.querySelector('#back').addEventListener('click', () => navigate('home'));
    return;
  }

  if (currentUser()) { navigate('home'); return; }

  if (!googleAuthSupported()) {
    el.innerHTML = `
      <div class="topbar"><h1>Accesso</h1></div>
      <div class="card center">
        <p>L'accesso con Google richiede l'app installata come APK Android (non funziona nell'anteprima da browser).</p>
        <button class="btn secondary block mt" id="back">Torna alla home</button>
      </div>`;
    el.querySelector('#back').addEventListener('click', () => navigate('home'));
    return;
  }

  if (!isGoogleAuthConfigured) {
    el.innerHTML = `
      <div class="topbar"><h1>Accesso</h1></div>
      <div class="card center">
        <p>L'accesso con Google non è ancora configurato. Vedi <strong>README.md</strong> § Accesso con Google per i pochi minuti di setup su Firebase Console.</p>
        <button class="btn secondary block mt" id="back">Torna alla home</button>
      </div>`;
    el.querySelector('#back').addEventListener('click', () => navigate('home'));
    return;
  }

  el.innerHTML = `
    <div class="topbar"><h1>Accedi</h1><div class="subtitle">Con il tuo account Google</div></div>
    <div class="card center">
      <p>Accedi per sbloccare Community, Eventi e la sincronizzazione cloud. Un tocco, nessun codice da digitare.</p>
      <button class="btn primary block" id="google-signin">Accedi con Google</button>
    </div>
  `;

  el.querySelector('#google-signin').addEventListener('click', async () => {
    try {
      await initGoogleAuth();
      const googleUser = await signInWithGoogle();
      const cred = await signInWithGoogleIdToken(googleUser.idToken);
      const uid = cred.user.uid;
      const remote = await pullProfile();
      const { settings: remoteSettings, ...remoteProfile } = remote || {};
      const profile = Object.keys(remoteProfile).length
        ? remoteProfile
        : { name: googleUser.givenName || googleUser.name || 'Giocatore' };
      if (!profile.friendCode) profile.friendCode = genFriendCode();
      updateProfile({ ...profile, uid, phone: null });
      if (remoteSettings) updateSettings(remoteSettings);
      await pushProfile({ ...profile, uid });
      toast('Accesso effettuato!');
      navigate('profile');
    } catch (err) {
      toast('Accesso fallito: ' + (err.message || err));
    }
  });
}
