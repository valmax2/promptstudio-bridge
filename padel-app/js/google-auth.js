// Native Google Sign-In (via the @codetrix-studio/capacitor-google-auth
// plugin, see build-apk.sh/setup-android.sh) instead of Firebase's
// browser-based phone/SMS + reCAPTCHA flow, which proved unreliable inside
// an embedded Android WebView (recaptcha state issues, region/quota
// restrictions). One native tap on the account picker, no SMS, no cost.
function googleAuth() {
  return window.Capacitor?.Plugins?.GoogleAuth || null;
}

export function googleAuthSupported() {
  return !!googleAuth();
}

// Must be called once before signIn() - loads the native sign-in client
// using the androidClientId baked into capacitor.config.json at build time.
export async function initGoogleAuth() {
  await googleAuth()?.initialize();
}

// Resolves with { idToken, name, email, imageUrl, ... } (see plugin docs),
// or throws if the user cancels or the native flow fails.
export async function signInWithGoogle() {
  const plugin = googleAuth();
  if (!plugin) throw new Error('Accesso Google non disponibile su questo dispositivo');
  const user = await plugin.signIn();
  const idToken = user?.authentication?.idToken || user?.idToken;
  if (!idToken) throw new Error('Token Google mancante nella risposta');
  return { ...user, idToken };
}

export async function signOutGoogle() {
  try { await googleAuth()?.signOut(); } catch {}
}
