import { navigate } from '../router.js';
import { BACK_ICON } from '../utils.js';

const MODES = [
  {
    icon: '🎾', title: 'Doppio / Singolo (classico)',
    body: 'Punteggio tradizionale a game (0-15-30-40) e set fino a 6 giochi (tie-break al 6 pari). Vince chi arriva prima a 2 set su 3.',
  },
  {
    icon: '🥇', title: "Punto d'oro (no-ad)",
    body: "Chiamato anche Killer Point, Punto de Oro o Punto Secco: a 40 pari (parità) il punto successivo decide subito il gioco, invece di giocare vantaggio/parità all'infinito. Si attiva/disattiva in Impostazioni → Segnapunti (non è la modalità \"Killer\" qui sotto, che è un torneo a eliminazione diverso).",
  },
  {
    icon: '🏁', title: 'Super tie-break al 3° set',
    body: "Se si arriva 1 set pari, il set decisivo si gioca come un tie-break fino a 10 punti (scarto di 2) invece di un set intero. Si attiva/disattiva in Impostazioni → Segnapunti.",
  },
  {
    icon: '🔄', title: 'Americano',
    body: "Torneo a rotazione con minimo 4 giocatori: ogni turno si formano coppie diverse su uno o più campi, e ognuno accumula punti individuali. Alla fine vince chi ha totalizzato più punti in classifica.",
  },
  {
    icon: '🔪', title: 'Killer (torneo)',
    body: "Diverso dal \"Punto d'oro\" qui sopra, nonostante il nome simile: è un torneo a eliminazione diretta con minimo 3 giocatori e un numero di vite a scelta. Chi perde (un game intero, o un punto secco, a scelta) perde una vita; chi resta senza vite è eliminato, finché non rimane un solo Killer.",
  },
];

export async function renderGameModes(el) {
  el.innerHTML = `
    <div class="topbar"><div class="row"><button class="icon-btn" id="gm-back" aria-label="Indietro">${BACK_ICON}</button><h1>Modalità di gioco</h1></div></div>
    <div class="card">
      <p class="small">Tutte le modalità disponibili per una partita di padel, in un unico posto.</p>
    </div>
    ${MODES.map((m) => `
      <div class="card">
        <h2>${m.icon} ${m.title}</h2>
        <p class="mb0">${m.body}</p>
      </div>
    `).join('')}
    <button class="btn primary block" id="gm-play">🎾 Inizia una partita</button>
    <button class="btn secondary block mt" id="gm-americano">🔄 Inizia Americano</button>
    <button class="btn secondary block mt" id="gm-killer">🔪 Inizia Killer</button>
  `;
  el.querySelector('#gm-back').addEventListener('click', () => navigate('home'));
  el.querySelector('#gm-play').addEventListener('click', () => navigate('scoreboard'));
  el.querySelector('#gm-americano').addEventListener('click', () => navigate('americano'));
  el.querySelector('#gm-killer').addEventListener('click', () => navigate('killer'));
}
