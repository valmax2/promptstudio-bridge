import { firebaseAvailable, setupRecaptcha, sendOtp, confirmOtp, currentUser } from '../firebase.js';
import { updateProfile, updateSettings } from '../store.js';
import { pushProfile, pullProfile } from '../cloud.js';
import { navigate } from '../router.js';
import { toast } from '../app.js';

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

  el.innerHTML = `
    <div class="topbar"><h1>Accedi</h1><div class="subtitle">Con il tuo numero di telefono</div></div>
    <div class="card">
      <div class="field">
        <label>Numero di telefono (con prefisso, es. +39...)</label>
        <input id="phone" type="tel" placeholder="+39 333 1234567" autocomplete="tel">
      </div>
      <button class="btn primary block" id="send-otp">Invia codice</button>
      <div id="recaptcha-container-0"></div>
    </div>
    <div class="card hidden" id="otp-card">
      <div class="field">
        <label>Codice ricevuto via SMS</label>
        <input id="otp" type="tel" inputmode="numeric" maxlength="6" placeholder="123456">
      </div>
      <button class="btn primary block" id="confirm-otp">Conferma</button>
    </div>
  `;

  let confirmationResult = null;
  let recaptchaVerifier = null;
  let recaptchaSeq = 0;

  // Google's reCAPTCHA throws "has already been rendered in this element"
  // on a retry - calling .clear() on the previous RecaptchaVerifier isn't
  // always enough to reset it in an embedded WebView, so each attempt gets
  // a brand new container element (fresh id, swapped into the DOM) rather
  // than reusing the same node: that's the only way to guarantee grecaptcha
  // has no leftover state to trip over.
  async function getRecaptchaVerifier() {
    if (recaptchaVerifier) {
      try { recaptchaVerifier.clear(); } catch {}
      recaptchaVerifier = null;
    }
    const old = el.querySelector(`#recaptcha-container-${recaptchaSeq}`);
    recaptchaSeq += 1;
    const fresh = document.createElement('div');
    fresh.id = `recaptcha-container-${recaptchaSeq}`;
    old.replaceWith(fresh);
    recaptchaVerifier = await setupRecaptcha(fresh.id);
    return recaptchaVerifier;
  }

  el.querySelector('#send-otp').addEventListener('click', async () => {
    const phoneInput = el.querySelector('#phone');
    const phone = phoneInput.value.trim();
    if (!/^\+\d{6,15}$/.test(phone)) {
      toast('Inserisci un numero valido con prefisso internazionale (es. +39...)');
      return;
    }
    try {
      const verifier = await getRecaptchaVerifier();
      confirmationResult = await sendOtp(phone, verifier);
      el.querySelector('#otp-card').classList.remove('hidden');
      toast('Codice inviato via SMS');
    } catch (err) {
      toast('Errore invio SMS: ' + (err.message || err));
    }
  });

  el.querySelector('#confirm-otp').addEventListener('click', async () => {
    const code = el.querySelector('#otp').value.trim();
    if (!confirmationResult || code.length < 4) return;
    try {
      const cred = await confirmOtp(confirmationResult, code);
      const uid = cred.user.uid;
      const phone = cred.user.phoneNumber;
      const remote = await pullProfile();
      const { settings: remoteSettings, ...remoteProfile } = remote || {};
      const profile = Object.keys(remoteProfile).length ? remoteProfile : { name: 'Giocatore' };
      updateProfile({ ...profile, uid, phone });
      if (remoteSettings) updateSettings(remoteSettings);
      await pushProfile({ ...profile, uid, phone });
      toast('Accesso effettuato!');
      navigate('profile');
    } catch (err) {
      toast('Codice non valido');
    }
  });
}
