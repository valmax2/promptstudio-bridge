// ============================================================================
// CONFIGURAZIONE FIREBASE — sostituisci questi valori con quelli del TUO
// progetto Firebase (gratuito). Istruzioni complete in README.md § Firebase.
//
// Finché i valori restano quelli di esempio, l'app funziona comunque in
// modalità "solo locale": segnapunti, statistiche e impostazioni sono salvati
// sul telefono, ma login, community, eventi e sync cloud restano disattivati.
// ============================================================================
export const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_PROJECT.firebaseapp.com",
  projectId: "YOUR_PROJECT",
  storageBucket: "YOUR_PROJECT.appspot.com",
  messagingSenderId: "YOUR_SENDER_ID",
  appId: "YOUR_APP_ID",
};

// Chiave pubblica VAPID per le notifiche push web (Firebase Console →
// Project Settings → Cloud Messaging → Web Push certificates).
export const vapidKey = "YOUR_VAPID_KEY";

export const isFirebaseConfigured =
  firebaseConfig.apiKey && !firebaseConfig.apiKey.startsWith("YOUR_");
