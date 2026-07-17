import { currentUser } from './firebase.js';

// Il tuo UID Firebase (Console → Authentication → Users) - solo questo
// account può scrivere nel catalogo condiviso di avatar/cornici custom (vedi
// firestore.rules): chiunque altro riceve "Missing or insufficient
// permissions" se ci provasse.
export const ADMIN_UID = 'CAvv7ICUfYYpqcCRjA7s3ZhsoGo2';

export function isAdmin() {
  return currentUser()?.uid === ADMIN_UID;
}
