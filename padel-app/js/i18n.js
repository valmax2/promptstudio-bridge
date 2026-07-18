// Traduzioni dei testi dell'interfaccia (non degli annunci vocali della
// partita, che restano in italiano per ora - vedi js/scoring.js).
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
    tutorial5: '<strong>5. Riepilogo partita</strong> — mentre giochi, tocca "📋 Riepilogo" per cambiare al volo modalità, punto d\'oro, super tie-break, chi serve o rinominare i giocatori, senza mai uscire dal tabellone. A fine partita puoi condividere un\'immagine col risultato completo direttamente dallo storico partite in Statistiche.',
    tutorial6: '<strong>6. Modalità Light</strong> — dalla Home puoi passare a un\'interfaccia minimale che mostra solo l\'essenziale per giocare (via il Bluetooth resta comunque raggiungibile), utile se vuoi solo segnare i punti senza distrazioni. Personalizza inoltre tema, colori e lingua in Impostazioni.',
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
    tutorial5: '<strong>5. Quick summary</strong> — while playing, tap "📋 Summary" to switch mode, golden point, super tie-break, who\'s serving, or rename players on the fly, without ever leaving the scoreboard. When a match ends you can share an image with the full result straight from the match history in Stats.',
    tutorial6: '<strong>6. Light Mode</strong> — from Home you can switch to a minimal interface that shows only what you need to play (Bluetooth stays reachable), handy if you just want to score points without distractions. You can also customize theme, colors and language in Settings.',
    tutorialDone: 'Got it',
  },
  fr: {
    welcomeTagline: 'Votre tableau de score &amp; assistant intelligent',
    welcomeDesc: `Gérez vos matchs de <strong>padel</strong> en temps réel. Mettez à jour le score
        directement sur le tableau ou utilisez des télécommandes et des <strong>tags Bluetooth</strong>
        pour tout faire depuis le court. Écoutez l'assistant avec la <strong>synthèse vocale</strong>
        qui annonce les points, gérez vos <strong>équipes</strong> et consultez l'historique et les statistiques.`,
    welcomeOpen: "▶ Ouvrir l'app",
    welcomeTutorial: 'Tutoriel',
    welcomeSupport: 'Support',
    welcomeFooter: 'par VStudioApps · Confidentialité',
    tutorialTitle: '📖 Comment ça marche',
    tutorial1: '<strong>1. Nouveau match</strong> — depuis l\'accueil, choisissez Double/Simple, Americano ou Killer, indiquez qui sert et le format, puis jouez en touchant le côté qui marque. À la fin du match, il est enregistré automatiquement dans les Statistiques (modifiable ou supprimable depuis là).',
    tutorial2: '<strong>2. Télécommande Bluetooth</strong> — dans Paramètres → Bluetooth, associez des télécommandes ou des tags pour marquer les points sans toucher l\'écran.',
    tutorial3: "<strong>3. Communauté</strong> — ajoutez des amis avec un code (partageable aussi sur WhatsApp), créez des groupes avec chat partagé, et organisez des événements.",
    tutorial4: '<strong>4. Récompenses</strong> — une vitrine de nouveautés choisie de temps en temps, toujours visible depuis le Profil.',
    tutorial5: '<strong>5. Résumé du match</strong> — pendant que vous jouez, touchez "📋 Résumé" pour changer à la volée le mode, le point en or, le super tie-break, qui sert, ou renommer les joueurs, sans jamais quitter le tableau de score. À la fin du match, partagez une image avec le résultat complet directement depuis l\'historique dans Statistiques.',
    tutorial6: '<strong>6. Mode Light</strong> — depuis l\'accueil, passez à une interface minimale qui n\'affiche que l\'essentiel pour jouer (le Bluetooth reste accessible), pratique si vous voulez juste marquer les points sans distractions. Personnalisez aussi le thème, les couleurs et la langue dans Paramètres.',
    tutorialDone: "J'ai compris",
  },
};

export function t(key) {
  const lang = getState().settings.appLanguage || 'it';
  const dict = STRINGS[lang] || STRINGS.it;
  return dict[key] ?? STRINGS.it[key] ?? key;
}
