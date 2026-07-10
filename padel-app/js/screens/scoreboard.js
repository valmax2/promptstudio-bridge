import { getState, addMatch, addXp } from '../store.js';
import { pushMatch } from '../cloud.js';
import { say, stopSpeech } from '../speech.js';
import { escapeHtml } from '../utils.js';
import {
  createMatch, addPoint, matchPointDisplay, teamName, isGamePoint,
} from '../scoring.js';
import { navigate } from '../router.js';
import { toast } from '../app.js';

let match = null;
let history = [];
let ttsEnabled = true;

export async function renderScoreboard(el) {
  const { settings } = getState();
  ttsEnabled = settings.ttsEnabled;
  if (!match) match = createMatch({
    goldenPoint: settings.goldenPoint,
    superTiebreak3rdSet: settings.superTiebreak3rdSet,
  });

  document.getElementById('bottom-nav').classList.add('hidden');
  paint(el);
  return () => {
    stopSpeech();
    document.getElementById('bottom-nav').classList.remove('hidden');
  };
}

function paint(el) {
  const modeLabel = match.matchOver ? 'Partita conclusa' : match.inMatchTiebreak ? 'Super tie-break' : match.inTiebreak ? 'Tie-break' : `Set ${match.sets.length + 1}`;

  el.innerHTML = `
    <div class="sb-root">
      <div class="sb-topbar">
        <button id="sb-back">←</button>
        <div class="sb-mode">${modeLabel}</div>
        <button id="sb-mute">${ttsEnabled ? '🔊' : '🔇'}</button>
      </div>
      <div class="sb-halves">
        ${teamHalf('A')}
        ${teamHalf('B')}
        ${match.matchOver ? matchOverOverlay() : ''}
      </div>
      <div class="sb-controls">
        <button id="sb-undo" ${history.length ? '' : 'disabled'}>↩️ Annulla</button>
        <button id="sb-settings">⚙️ Impostazioni</button>
        <button id="sb-newmatch">🔄 Nuova partita</button>
      </div>
    </div>
  `;

  el.querySelector('#sb-back').addEventListener('click', () => navigate('home'));
  el.querySelector('#sb-settings').addEventListener('click', () => navigate('settings'));
  el.querySelector('#sb-mute').addEventListener('click', () => {
    ttsEnabled = !ttsEnabled;
    if (!ttsEnabled) stopSpeech();
    paint(el);
  });
  el.querySelector('#sb-undo').addEventListener('click', onUndo);
  el.querySelector('#sb-newmatch').addEventListener('click', onReset);

  if (!match.matchOver) {
    el.querySelector('#half-a').addEventListener('click', () => onPoint('A'));
    el.querySelector('#half-b').addEventListener('click', () => onPoint('B'));
  }
  el.querySelectorAll('[data-edit-name]').forEach((nameEl) => {
    nameEl.addEventListener('click', (e) => {
      e.stopPropagation();
      onEditName(nameEl.dataset.editName, el);
    });
  });
  el.querySelector('#save-match')?.addEventListener('click', (e) => {
    e.stopPropagation();
    onSaveMatch(el);
  });
}

function teamHalf(team) {
  const name = team === 'A' ? match.teamAName : match.teamBName;
  const disp = matchPointDisplay(match)[team.toLowerCase()];
  const gamesInSet = team === 'A' ? match.currentSet.gamesA : match.currentSet.gamesB;
  const setsWon = team === 'A' ? match.setsWonA : match.setsWonB;
  const serving = match.server === team && !match.inTiebreak && !match.inMatchTiebreak && !match.matchOver;
  const badge = badgeFor(team);

  return `
    <div class="sb-half sb-${team.toLowerCase()}" id="half-${team.toLowerCase()}">
      <div class="sb-name-row" data-edit-name="${team}">${escapeHtml(name)}${serving ? '<span class="serve-ball">🎾</span>' : ''}</div>
      <div class="sb-stack">
        <div class="sb-point">${disp}</div>
        <div class="sb-cap">GAME</div>
        <div class="sb-mid">${match.inMatchTiebreak ? '—' : gamesInSet}</div>
        <div class="sb-cap">SET</div>
        <div class="sb-mid">${setsWon}</div>
      </div>
      ${badge ? `<div class="sb-badge">${badge}</div>` : ''}
    </div>
  `;
}

function badgeFor(team) {
  if (match.matchOver || !isGamePoint(match, team)) return null;
  const preview = addPoint(match, team);
  if (preview.events.matchWon) return 'Palla partita';
  if (preview.events.setWon) return 'Palla set';
  if (preview.events.gameWon) return 'Palla gioco';
  return null;
}

function matchOverOverlay() {
  return `
    <div class="sb-overlay">
      <h2>🏆 ${escapeHtml(teamName(match, match.matchWinner))} vince!</h2>
      <p>${match.sets.map((s) => `${s.a}-${s.b}`).join(' &nbsp;·&nbsp; ')}</p>
      <button class="btn primary" id="save-match">Salva partita nelle statistiche</button>
    </div>
  `;
}

function onPoint(team) {
  if (match.matchOver) return;
  history.push(structuredClone(match));
  const { match: next, announcement, events } = addPoint(match, team);
  match = next;
  if (ttsEnabled) say(announcement);
  if (events.matchWon) toast(announcement);
  paint(document.querySelector('.screen'));
}

function onUndo() {
  if (!history.length) return;
  match = history.pop();
  stopSpeech();
  paint(document.querySelector('.screen'));
}

function onReset() {
  if (!confirm('Iniziare una nuova partita? Il punteggio attuale andrà perso se non salvato.')) return;
  const { settings } = getState();
  const teamAName = match.teamAName;
  const teamBName = match.teamBName;
  match = createMatch({
    teamAName, teamBName,
    goldenPoint: settings.goldenPoint,
    superTiebreak3rdSet: settings.superTiebreak3rdSet,
  });
  history = [];
  stopSpeech();
  paint(document.querySelector('.screen'));
}

function onEditName(team, el) {
  const current = team === 'A' ? match.teamAName : match.teamBName;
  const next = prompt(`Nome squadra ${team === 'A' ? '1' : '2'}`, current);
  if (!next) return;
  if (team === 'A') match.teamAName = next.trim().slice(0, 24) || current;
  else match.teamBName = next.trim().slice(0, 24) || current;
  paint(el);
}

async function onSaveMatch(el) {
  const record = {
    date: new Date().toISOString(),
    teamAName: match.teamAName,
    teamBName: match.teamBName,
    sets: match.sets,
    winner: match.matchWinner,
    golden: match.goldenPoint,
    superTiebreak: match.superTiebreak3rdSet,
  };
  addMatch(record);
  addXp(match.matchWinner === 'A' ? 40 : 15);
  try { await pushMatch(record); } catch {}
  toast('Partita salvata! Hai guadagnato XP 🎉');
  match = null;
  history = [];
  await renderScoreboard(el);
}
