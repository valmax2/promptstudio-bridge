// Traduzioni dei testi dell'interfaccia (non degli annunci vocali della
// partita, che restano in italiano per ora - vedi js/scoring.js). Primo
// passo verso un'app multilingua: al momento copre solo la schermata
// iniziale; altre schermate seguiranno.
import { getState } from './store.js';

const STRINGS = {
  it: {
    welcomeTagline: 'Il tuo segnapunti &amp; assistente intelligente',
    welcomeDesc: `Gestisci le tue partite di <strong>padel</strong> in tempo reale. Aggiorna il punteggio
        direttamente sul tabellone o usa telecomandi e <strong>tag Bluetooth</strong> per fare
        tutto dal campo. Ascolta l'assistente con <strong>sintesi vocale</strong> che annuncia i
        punti, gestisci le tue <strong>squadre</strong> e consulta storici e statistiche avanzate.`,
    welcomeOpen: "▶ Apri l'app",
    welcomeTutorial: 'Tutorial',
    welcomeSupport: 'Supporto',
    welcomeFooter: 'di VStudioApps · Privacy',
    tutorialTitle: '📖 Come funziona',
    tutorial1: '<strong>1. Nuova partita</strong> — dalla Home scegli Doppio/Singolo, Americano o Killer, imposta chi serve e il formato, poi gioca toccando il lato di chi fa punto. A fine partita viene salvata automaticamente nelle Statistiche (modificabile o eliminabile da lì).',
    tutorial2: '<strong>2. Telecomando Bluetooth</strong> — in Impostazioni → Bluetooth puoi associare telecomandi o tag per segnare i punti senza toccare lo schermo.',
    tutorial3: "<strong>3. Community</strong> — aggiungi amici con un codice (puoi anche condividerlo su WhatsApp), crea gruppi con chat condivisa, e organizza eventi.",
    tutorial4: '<strong>4. Premi</strong> — una vetrina di novità scelta di volta in volta, sempre visibile dal Profilo.',
    tutorialDone: 'Ho capito',
  },
  en: {
    welcomeTagline: 'Your smart scoreboard &amp; assistant',
    welcomeDesc: `Manage your <strong>padel</strong> matches in real time. Update the score
        right on the scoreboard or use remotes and <strong>Bluetooth tags</strong> to do
        everything from the court. Listen to the assistant with <strong>voice announcements</strong>
        for every point, manage your <strong>teams</strong>, and check your history and stats.`,
    welcomeOpen: '▶ Open the app',
    welcomeTutorial: 'Tutorial',
    welcomeSupport: 'Support',
    welcomeFooter: 'by VStudioApps · Privacy',
    tutorialTitle: '📖 How it works',
    tutorial1: '<strong>1. New match</strong> — from Home pick Doubles/Singles, Americano or Killer, set who serves and the format, then play by tapping the side that scores. When the match ends it\'s saved automatically to Stats (editable or deletable from there).',
    tutorial2: '<strong>2. Bluetooth remote</strong> — in Settings → Bluetooth you can pair remotes or tags to score points without touching the screen.',
    tutorial3: '<strong>3. Community</strong> — add friends with a code (you can also share it on WhatsApp), create groups with shared chat, and organize events.',
    tutorial4: '<strong>4. Rewards</strong> — a showcase of news picked from time to time, always visible from your Profile.',
    tutorialDone: 'Got it',
  },
};

export function t(key) {
  const lang = getState().settings.appLanguage || 'it';
  const dict = STRINGS[lang] || STRINGS.it;
  return dict[key] ?? STRINGS.it[key] ?? key;
}
