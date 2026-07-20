import { navigate } from '../router.js';
import { toast } from '../app.js';
import { escapeHtml } from '../utils.js';
import {
  createAmericano, submitRoundScores, generateNextRound, finishTournament, standings, playerName,
} from '../americano.js';

let state = null;
let setupPlayers = ['', '', '', ''];
let setupPoints = 21;

export async function renderAmericano(el) {
  paint(el);
}

function paint(el) {
  if (!state) return paintSetup(el);
  if (state.finished) return paintFinal(el);
  return paintRound(el);
}

// ===== Setup =====

function paintSetup(el) {
  el.innerHTML = `
    <div class="topbar"><h1>🔄 Americano</h1><div class="subtitle">Rotazione compagni, classifica individuale</div></div>

    <div class="card">
      <h2>Giocatori (minimo 4)</h2>
      <div id="players-list">
        ${setupPlayers.map((name, i) => `
          <div class="row mt" style="gap:8px;">
            <input class="player-name" data-idx="${i}" value="${escapeHtml(name)}" placeholder="Giocatore ${i + 1}" maxlength="20">
            ${setupPlayers.length > 4 ? `<button class="btn ghost small" data-remove="${i}">✕</button>` : ''}
          </div>
        `).join('')}
      </div>
      <button class="btn secondary small mt" id="add-player">+ Aggiungi giocatore</button>
    </div>

    <div class="card">
      <div class="field mb0">
        <label>Punti per turno (per campo)</label>
        <input type="number" id="points-per-round" value="${setupPoints}" min="4" max="60">
      </div>
      <p class="small mt">I due team di ogni campo si dividono questo totale (es. 15 a 6). Ogni giocatore riparte con un compagno diverso ad ogni turno.</p>
    </div>

    <button class="btn primary block" id="start-tournament">Inizia torneo</button>
  `;

  el.querySelector('#add-player').addEventListener('click', () => {
    setupPlayers.push('');
    paint(el);
  });
  el.querySelectorAll('[data-remove]').forEach((btn) => btn.addEventListener('click', () => {
    setupPlayers.splice(Number(btn.dataset.remove), 1);
    paint(el);
  }));
  el.querySelectorAll('.player-name').forEach((input) => input.addEventListener('input', (e) => {
    setupPlayers[Number(e.target.dataset.idx)] = e.target.value;
  }));
  el.querySelector('#points-per-round').addEventListener('change', (e) => {
    setupPoints = parseInt(e.target.value, 10) || 21;
  });
  el.querySelector('#start-tournament').addEventListener('click', () => {
    const names = setupPlayers.map((n) => n.trim()).filter(Boolean);
    if (names.length < 4) { toast('Servono almeno 4 giocatori'); return; }
    state = createAmericano({ players: names, pointsPerRound: setupPoints });
    paint(el);
  });
}

// ===== Round play =====

function paintRound(el) {
  const round = state.round;
  const table = standings(state);

  el.innerHTML = `
    <div class="topbar"><h1>🔄 Turno ${round.number}</h1><div class="subtitle">Americano</div></div>

    <div class="card">
      ${round.matches.map((m, idx) => matchCard(m, idx)).join('')}
      ${round.sitOut.length ? `<p class="small mt">Riposano questo turno: ${round.sitOut.map((id) => escapeHtml(playerName(state, id))).join(', ')}</p>` : ''}
    </div>

    <button class="btn primary block" id="confirm-round">Conferma risultati e vai al turno successivo</button>
    <button class="btn ghost block mt" id="finish-tournament">🏁 Termina torneo ora</button>

    <div class="card mt">
      <h2>Classifica live</h2>
      ${table.map((p, i) => standingRow(p, i)).join('')}
    </div>
  `;

  el.querySelectorAll('[data-court]').forEach((input) => {
    input.addEventListener('input', () => syncOpponentScore(el, input));
  });

  el.querySelector('#confirm-round').addEventListener('click', () => {
    const scores = round.matches.map((m, idx) => {
      const a = parseInt(el.querySelector(`[data-court="${idx}"][data-side="a"]`).value, 10);
      const b = parseInt(el.querySelector(`[data-court="${idx}"][data-side="b"]`).value, 10);
      return { scoreA: isNaN(a) ? 0 : a, scoreB: isNaN(b) ? 0 : b };
    });
    state = submitRoundScores(state, scores);
    state = generateNextRound(state);
    if (!state.round) state = finishTournament(state);
    paint(el);
  });

  el.querySelector('#finish-tournament').addEventListener('click', () => {
    if (!confirm('Terminare il torneo? Il turno corrente non verrà conteggiato se non lo confermi prima.')) return;
    state = finishTournament(state);
    paint(el);
  });
}

function matchCard(m, idx) {
  return `
    <div class="card" style="background:var(--surface-2);">
      <div class="row between">
        <strong>Campo ${idx + 1}</strong>
      </div>
      <div class="row between mt">
        <span>${escapeHtml(playerName(state, m.pairA[0]))} + ${escapeHtml(playerName(state, m.pairA[1]))}</span>
        <input type="number" class="score-input" data-court="${idx}" data-side="a" value="${Math.round(state.pointsPerRound / 2)}" min="0" max="${state.pointsPerRound}" style="width:70px;text-align:center;">
      </div>
      <div class="row between mt">
        <span>${escapeHtml(playerName(state, m.pairB[0]))} + ${escapeHtml(playerName(state, m.pairB[1]))}</span>
        <input type="number" class="score-input" data-court="${idx}" data-side="b" value="${Math.floor(state.pointsPerRound / 2)}" min="0" max="${state.pointsPerRound}" style="width:70px;text-align:center;">
      </div>
    </div>
  `;
}

function syncOpponentScore(el, input) {
  const court = input.dataset.court;
  const side = input.dataset.side;
  const otherSide = side === 'a' ? 'b' : 'a';
  const other = el.querySelector(`[data-court="${court}"][data-side="${otherSide}"]`);
  const val = parseInt(input.value, 10);
  if (!isNaN(val) && other) {
    other.value = Math.max(0, state.pointsPerRound - val);
  }
}

function standingRow(p, i) {
  return `<div class="list-item">
    <div class="avatar">${i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : '🎾'}</div>
    <div class="meta"><strong>${escapeHtml(p.name)}</strong><span>${p.roundsPlayed} turni giocati</span></div>
    <span class="badge accent">${p.totalPoints} pt</span>
  </div>`;
}

// ===== Final =====

function paintFinal(el) {
  const table = standings(state);
  el.innerHTML = `
    <div class="topbar"><h1>🏁 Torneo concluso</h1></div>
    <div class="card center">
      <h2>🏆 ${escapeHtml(table[0]?.name || '')} vince l'Americano!</h2>
      <p>${state.history.length} turni giocati</p>
    </div>
    <div class="card">
      <h2>Classifica finale</h2>
      ${table.map((p, i) => standingRow(p, i)).join('')}
    </div>
    <button class="btn primary block" id="new-tournament">Nuovo torneo</button>
    <button class="btn ghost block mt" id="go-home">Torna alla home</button>
  `;
  el.querySelector('#new-tournament').addEventListener('click', () => {
    state = null;
    setupPlayers = ['', '', '', ''];
    paint(el);
  });
  el.querySelector('#go-home').addEventListener('click', () => navigate('home'));
}
