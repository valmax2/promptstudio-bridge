import { getState } from '../store.js';
import { say, stopSpeech } from '../speech.js';
import { escapeHtml } from '../utils.js';
import { navigate } from '../router.js';
import { toast } from '../app.js';
import {
  createMatch, addPoint, matchPointDisplay,
} from '../scoring.js';
import {
  createKiller, recordRoundResult, playerName, playerLives,
} from '../killer.js';

let killer = null;
let setupPlayers = ['', '', ''];
let setupLives = 3;
let setupTrigger = 'game';
let roundMatch = null; // mini single-game scoreboard state, trigger === 'game' only

export async function renderKiller(el) {
  paint(el);
  return () => stopSpeech();
}

function paint(el) {
  if (!killer) return paintSetup(el);
  if (killer.finished) return paintFinal(el);
  return paintPlay(el);
}

// ===== Setup =====

function paintSetup(el) {
  el.innerHTML = `
    <div class="topbar"><h1>🔪 Killer</h1><div class="subtitle">Eliminazione a vite, re del campo</div></div>

    <div class="card">
      <h2>Giocatori (minimo 3)</h2>
      <div>
        ${setupPlayers.map((name, i) => `
          <div class="row mt" style="gap:8px;">
            <input class="player-name" data-idx="${i}" value="${escapeHtml(name)}" placeholder="Giocatore ${i + 1}" maxlength="20">
            ${setupPlayers.length > 3 ? `<button class="btn ghost small" data-remove="${i}">✕</button>` : ''}
          </div>
        `).join('')}
      </div>
      <button class="btn secondary small mt" id="add-player">+ Aggiungi giocatore</button>
    </div>

    <div class="card">
      <div class="field">
        <label>Numero di vite</label>
        <input type="number" id="lives" value="${setupLives}" min="1" max="9">
      </div>
      <div class="field mb0">
        <label>Cosa fa perdere una vita</label>
        <div class="segmented">
          <button data-trigger="game" class="${setupTrigger === 'game' ? 'active' : ''}">Game intero</button>
          <button data-trigger="point" class="${setupTrigger === 'point' ? 'active' : ''}">Punto secco</button>
        </div>
      </div>
    </div>

    <button class="btn primary block" id="start-killer">Inizia</button>
  `;

  el.querySelector('#add-player').addEventListener('click', () => { setupPlayers.push(''); paint(el); });
  el.querySelectorAll('[data-remove]').forEach((btn) => btn.addEventListener('click', () => {
    setupPlayers.splice(Number(btn.dataset.remove), 1);
    paint(el);
  }));
  el.querySelectorAll('.player-name').forEach((input) => input.addEventListener('input', (e) => {
    setupPlayers[Number(e.target.dataset.idx)] = e.target.value;
  }));
  el.querySelector('#lives').addEventListener('change', (e) => { setupLives = parseInt(e.target.value, 10) || 3; });
  el.querySelectorAll('[data-trigger]').forEach((btn) => btn.addEventListener('click', () => {
    setupTrigger = btn.dataset.trigger;
    paint(el);
  }));
  el.querySelector('#start-killer').addEventListener('click', () => {
    const names = setupPlayers.map((n) => n.trim()).filter(Boolean);
    if (names.length < 3) { toast('Servono almeno 3 giocatori'); return; }
    killer = createKiller({ players: names, lives: setupLives, trigger: setupTrigger });
    roundMatch = setupTrigger === 'game' ? freshRoundMatch() : null;
    paint(el);
  });
}

function freshRoundMatch() {
  const { settings } = getState();
  return createMatch({ goldenPoint: settings.goldenPoint, superTiebreak3rdSet: false });
}

// ===== Play =====

function paintPlay(el) {
  const [idA, idB] = killer.court;
  const waiting = killer.queue;

  el.innerHTML = `
    <div class="topbar"><h1>🔪 Killer</h1><div class="subtitle">${killer.trigger === 'game' ? 'Game intero' : 'Punto secco'} · ${killer.lives} vite</div></div>

    <div class="card center">
      <h2>In campo</h2>
      ${courtRow(idA)}
      ${courtRow(idB)}
      ${killer.trigger === 'game' && idA != null && idB != null ? gameControls(idA, idB) : ''}
      ${killer.trigger === 'point' && idA != null && idB != null ? pointControls(idA, idB) : ''}
      ${idB == null ? '<p class="small mt">In attesa di uno sfidante…</p>' : ''}
    </div>

    ${waiting.length ? `
    <div class="card">
      <h2>In coda</h2>
      ${waiting.map((id, i) => `<div class="list-item"><div class="avatar">${i + 1}</div><div class="meta"><strong>${escapeHtml(playerName(killer, id))}</strong></div><span class="small">${'❤️'.repeat(playerLives(killer, id))}</span></div>`).join('')}
    </div>` : ''}

    ${killer.eliminationOrder.length ? `
    <div class="card">
      <h2>Eliminati</h2>
      ${killer.eliminationOrder.slice().reverse().map((id) => `<div class="list-item"><div class="avatar">❌</div><div class="meta"><strong>${escapeHtml(playerName(killer, id))}</strong></div></div>`).join('')}
    </div>` : ''}
  `;

  if (killer.trigger === 'game') {
    el.querySelector('#half-a')?.addEventListener('click', () => onGamePoint(el, 'A'));
    el.querySelector('#half-b')?.addEventListener('click', () => onGamePoint(el, 'B'));
  } else {
    el.querySelector('#lose-a')?.addEventListener('click', () => onRoundLoss(el, idA));
    el.querySelector('#lose-b')?.addEventListener('click', () => onRoundLoss(el, idB));
  }
}

function courtRow(id) {
  if (id == null) return `<div class="list-item"><div class="avatar">—</div><div class="meta"><strong>In attesa</strong></div></div>`;
  return `<div class="list-item">
    <div class="avatar">🙂</div>
    <div class="meta"><strong>${escapeHtml(playerName(killer, id))}</strong></div>
    <span>${'❤️'.repeat(playerLives(killer, id))}</span>
  </div>`;
}

function gameControls(idA, idB) {
  const disp = matchPointDisplay(roundMatch);
  return `
    <div class="grid-2 mt">
      <button class="btn primary" id="half-a" style="padding:26px 12px;font-size:1.3em;">${escapeHtml(playerName(killer, idA))}<br><span style="font-size:1.6em;">${disp.a}</span></button>
      <button class="btn primary" id="half-b" style="padding:26px 12px;font-size:1.3em;">${escapeHtml(playerName(killer, idB))}<br><span style="font-size:1.6em;">${disp.b}</span></button>
    </div>
  `;
}

function pointControls(idA, idB) {
  return `
    <div class="grid-2 mt">
      <button class="btn danger" id="lose-a">Punto perso da<br>${escapeHtml(playerName(killer, idA))}</button>
      <button class="btn danger" id="lose-b">Punto perso da<br>${escapeHtml(playerName(killer, idB))}</button>
    </div>
  `;
}

function onGamePoint(el, side) {
  const { settings } = getState();
  const { match: next, announcement, events } = addPoint(roundMatch, side);
  roundMatch = next;
  if (settings.ttsEnabled) say(announcement);
  if (events.gameWon) {
    const [idA, idB] = killer.court;
    const loserId = side === 'A' ? idB : idA;
    finishRound(el, loserId);
    return;
  }
  paint(el);
}

function onRoundLoss(el, loserId) {
  finishRound(el, loserId);
}

function finishRound(el, loserId) {
  const loserName = playerName(killer, loserId);
  killer = recordRoundResult(killer, loserId);
  const eliminated = killer.eliminationOrder[killer.eliminationOrder.length - 1] === loserId;
  const { settings } = getState();
  if (settings.ttsEnabled) say(eliminated ? `${loserName} eliminato!` : `${loserName} perde una vita`);
  if (eliminated) toast(`${loserName} eliminato!`);
  if (!killer.finished && killer.trigger === 'game') roundMatch = freshRoundMatch();
  paint(el);
}

// ===== Final =====

function paintFinal(el) {
  const podium = [killer.winnerId, ...killer.eliminationOrder.slice().reverse()];
  el.innerHTML = `
    <div class="topbar"><h1>🏁 Killer concluso</h1></div>
    <div class="card center">
      <h2>🏆 ${escapeHtml(playerName(killer, killer.winnerId))} è il Killer!</h2>
    </div>
    <div class="card">
      <h2>Classifica</h2>
      ${podium.map((id, i) => `<div class="list-item"><div class="avatar">${i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : i + 1}</div><div class="meta"><strong>${escapeHtml(playerName(killer, id))}</strong></div></div>`).join('')}
    </div>
    <button class="btn primary block" id="new-killer">Nuovo Killer</button>
    <button class="btn ghost block mt" id="go-home">Torna alla home</button>
  `;
  el.querySelector('#new-killer').addEventListener('click', () => {
    killer = null;
    roundMatch = null;
    setupPlayers = ['', '', ''];
    paint(el);
  });
  el.querySelector('#go-home').addEventListener('click', () => navigate('home'));
}
