// ============================================================================
// CONFIGURAZIONE FIREBASE — sostituisci questi valori con quelli del TUO
// progetto Firebase (gratuito). Istruzioni complete in README.md § Firebase.
//
// Finché i valori restano quelli di esempio, l'app funziona comunque in
// modalità "solo locale": segnapunti, statistiche e impostazioni sono salvati
// sul telefono, ma login, community, eventi e sync cloud restano disattivati.
// ============================================================================
export const firebaseConfig = {
  apiKey: "AIzaSyCdf0kfYXvaY_9ZkIJxNN8v-iIoGMu6xos",
  authDomain: "padel-app-c9592.firebaseapp.com",
  projectId: "padel-app-c9592",
  storageBucket: "padel-app-c9592.firebasestorage.app",
  messagingSenderId: "501348619857",
  appId: "1:501348619857:web:571278a4b37aad2020ca70",
};

// Chiave pubblica VAPID per le notifiche push web (Firebase Console →
// Project Settings → Cloud Messaging → Web Push certificates).
export const vapidKey = "BNzbof342O7fTVmaBI19Mx90BoAay-c1mEVuWZScwYeszU38hfMFI5Yc-QO2AFXJ9iWLpui7oHEg1Y14I7dcOEI";

// Web client ID per l'accesso con Google (Firebase Console → Authentication →
// Sign-in method → Google → sezione "Web SDK configuration" → "Web client
// ID"). Serve anche per l'app Android: vedi README.md § Accesso con Google.
export const googleWebClientId = "YOUR_GOOGLE_WEB_CLIENT_ID.apps.googleusercontent.com";

export const isGoogleAuthConfigured =
  googleWebClientId && !googleWebClientId.startsWith("YOUR_");

export const isFirebaseConfigured =
  firebaseConfig.apiKey && !firebaseConfig.apiKey.startsWith("YOUR_");
