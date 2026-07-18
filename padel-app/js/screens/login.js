import { firebaseAvailable, registerWithEmail, signInWithEmail, resetPasswordEmail, currentUser } from '../firebase.js';
import { updateProfile, updateSettings } from '../store.js';
import { pushProfile, pullProfile } from '../cloud.js';
import { navigate } from '../router.js';
import { toast } from '../app.js';
import { genFriendCode } from '../utils.js';

export async function renderLogin(el, params = {}) {
  // Arrivando dal pulsante Accedi della schermata iniziale si torna LÌ dopo
  // il login, per scegliere con calma tra modalità Full e Light - non
  // catapultati nel profilo.
  const fromWelcome = params.from === 'welcome';
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

  if (currentUser()) { navigate(fromWelcome ? 'welcome' : 'home'); return; }

  let mode = 'login';

  function paint() {
    el.innerHTML = `
      <div class="topbar"><h1>Accesso</h1><div class="subtitle">Con email e password</div></div>
      <div class="card">
        <div class="segmented">
          <button data-mode="login" class="${mode === 'login' ? 'active' : ''}">Accedi</button>
          <button data-mode="register" class="${mode === 'register' ? 'active' : ''}">Crea account</button>
        </div>
        <div class="field mt">
          <label>Email</label>
          <input id="email" type="email" placeholder="nome@esempio.com" autocomplete="email">
        </div>
        <div class="field mb0">
          <label>Password</label>
          <div class="password-field">
            <input id="password" type="password" placeholder="Almeno 6 caratteri" autocomplete="${mode === 'register' ? 'new-password' : 'current-password'}">
            <button type="button" class="password-toggle" data-toggle="password" aria-label="Mostra password">👁️</button>
          </div>
        </div>
        ${mode === 'register' ? `
        <div class="field mt mb0">
          <label>Conferma password</label>
          <div class="password-field">
            <input id="password2" type="password" placeholder="Ripeti la password" autocomplete="new-password">
            <button type="button" class="password-toggle" data-toggle="password2" aria-label="Mostra password">👁️</button>
          </div>
        </div>` : ''}
        <button class="btn primary block mt" id="submit">${mode === 'login' ? 'Accedi' : 'Crea account'}</button>
        ${mode === 'login' ? '<button class="btn ghost small block mt" id="forgot">Password dimenticata?</button>' : ''}
      </div>
    `;

    el.querySelectorAll('[data-mode]').forEach((btn) => btn.addEventListener('click', () => {
      mode = btn.dataset.mode;
      paint();
    }));

    el.querySelectorAll('[data-toggle]').forEach((btn) => btn.addEventListener('click', () => {
      const input = el.querySelector(`#${btn.dataset.toggle}`);
      const shown = input.type === 'text';
      input.type = shown ? 'password' : 'text';
      btn.textContent = shown ? '👁️' : '🙈';
    }));

    el.querySelector('#submit').addEventListener('click', async () => {
      const email = el.querySelector('#email').value.trim();
      const password = el.querySelector('#password').value;
      if (!email || !password) { toast('Inserisci email e password'); return; }
      if (mode === 'register') {
        const password2 = el.querySelector('#password2').value;
        if (password !== password2) { toast('Le password non coincidono'); return; }
      }
      try {
        const cred = mode === 'login'
          ? await signInWithEmail(email, password)
          : await registerWithEmail(email, password);
        const uid = cred.user.uid;
        const remote = await pullProfile();
        const { settings: remoteSettings, ...remoteProfile } = remote || {};
        const profile = Object.keys(remoteProfile).length ? remoteProfile : { name: email.split('@')[0] };
        if (!profile.friendCode) profile.friendCode = genFriendCode();
        updateProfile({ ...profile, uid, phone: null });
        if (remoteSettings) updateSettings(remoteSettings);
        await pushProfile({ ...profile, uid });
        toast(mode === 'login' ? 'Accesso effettuato!' : 'Account creato!');
        navigate(fromWelcome ? 'welcome' : 'profile');
      } catch (err) {
        toast(describeAuthError(err));
      }
    });

    el.querySelector('#forgot')?.addEventListener('click', async () => {
      const prefill = el.querySelector('#email').value.trim();
      const email = (prompt('Inserisci la tua email per ricevere il link di reimpostazione password:', prefill) || '').trim();
      if (!email) return;
      try {
        await resetPasswordEmail(email);
        toast(`Email inviata a ${email}: controlla anche nello spam`, 4000);
      } catch (err) {
        toast(describeAuthError(err));
      }
    });
  }

  paint();
}

function describeAuthError(err) {
  const code = err?.code || '';
  if (code.includes('email-already-in-use')) return 'Questa email è già registrata: prova ad accedere invece.';
  if (code.includes('invalid-email')) return 'Email non valida.';
  if (code.includes('weak-password')) return 'Password troppo debole (minimo 6 caratteri).';
  if (code.includes('user-not-found') || code.includes('wrong-password') || code.includes('invalid-credential')) return 'Email o password non corretti.';
  if (code.includes('too-many-requests')) return 'Troppi tentativi: riprova tra qualche minuto.';
  return 'Errore: ' + (err.message || String(err));
}
