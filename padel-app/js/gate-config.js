import { isPro } from './billing.js';

// Interruttore per rendere il telecomando/tag Bluetooth una funzione Pro.
// Tenuto spento durante il test chiuso (tutti i tester lo hanno gratis);
// va acceso manualmente prima della build che va in produzione sullo Store,
// così chi ha già provato l'app gratis durante i test non se lo vede
// improvvisamente tolto senza preavviso.
export const REMOTE_REQUIRES_PRO = false;

export function canUseRemote() {
  return !REMOTE_REQUIRES_PRO || isPro();
}
