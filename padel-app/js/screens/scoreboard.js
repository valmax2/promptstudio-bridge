import { getState, addMatch, addXp } from '../store.js';
import { pushMatch } from '../cloud.js';
import { say, stopSpeech } from '../speech.js';
import { escapeHtml } from '../utils.js';
import {
  createMatch, addPoint, matchPointDisplay, teamName, isGamePoint,
} from '../scoring.js';
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

  paint(el);
  return () => stopSpeech();
}

function paint(el) {
  const dispA = matchPointDisplay(match).a;
  const dispB = matchPointDisplay(match).b;
  const modeLabel = match.matchOver ? 'Partita conclusa' : match.inMatchTiebreak ? 'Super tie-break (decisivo)' : match.inTiebreak ? 'Tie-break' : `Set ${match.sets.length + 1}`;

  el.innerHTML = `
    <div class="topbar">
      <div>
        <h1>Segnapunti</h1>
        <div class="subtitle">${modeLabel}</div>
      </div>
      <button class="btn ghost small" id="edit-names">✏️ Nomi</button>
    </div>

    <div class="scoreboard">
      ${teamCard('A', dispA)}
      ${teamCard('B', dispB)}
    </div>

    <div class="score-actions">
      <button class="btn primary" id="point-a" ${match.matchOver ? 'disabled' : ''}>Punto ${escapeHtml(match.teamAName)}</button>
      <button class="btn primary" id="point-b" ${match.matchOver ? 'disabled' : ''}>Punto ${escapeHtml(match.teamBName)}</button>
    </div>

    <div class="score-toolbar">
      <button class="btn secondary small" id="undo" ${history.length ? '' : 'disabled'}>↩️ Annulla</button>
      <button class="btn secondary small" id="toggle-tts">${ttsEnabled ? '🔊 Voce ON' : '🔇 Voce OFF'}</button>
      <button class="btn danger small" id="reset">Nuova partita</button>
    </div>

    ${match.matchOver ? `
    <div class="card center mt">
      <h2>🏆 ${escapeHtml(teamName(match, match.matchWinner))} vince!</h2>
      <p>${match.sets.map((s) => `${s.a}-${s.b}`).join(' · ')}</p>
      <button class="btn primary block" id="save-match">Salva partita nelle statistiche</button>
    </div>` : ''}
  `;

  el.querySelector('#point-a').addEventListener('click', () => onPoint('A'));
  el.querySelector('#point-b').addEventListener('click', () => onPoint('B'));
  el.querySelector('#undo').addEventListener('click', onUndo);
  el.querySelector('#reset').addEventListener('click', onReset);
  el.querySelector('#edit-names').addEventListener('click', () => onEditNames(el));
  el.querySelector('#toggle-tts').addEventListener('click', () => {
    ttsEnabled = !ttsEnabled;
    if (!ttsEnabled) stopSpeech();
    paint(el);
  });
  const saveBtn = el.querySelector('#save-match');
  if (saveBtn) saveBtn.addEventListener('click', () => onSaveMatch(el));
}

function teamCard(team, points) {
  const name = team === 'A' ? match.teamAName : match.teamBName;
  const gp = isGamePoint(match, team);
  const setScores = match.sets.map((s) => String(team === 'A' ? s.a : s.b));
  if (!match.matchOver && !match.inMatchTiebreak) {
    const current = team === 'A' ? match.currentSet.gamesA : match.currentSet.gamesB;
    setScores.push(String(current));
  }
  return `
    <div class="score-team ${match.server === team && !match.inTiebreak && !match.inMatchTiebreak ? 'serving' : ''}">
      <div>
        <div class="team-name">${escapeHtml(name)} ${match.server === team ? '🎾' : ''}</div>
        <div class="set-history">${setScores.map((s) => `<span>${s}</span>`).join('')}</div>
        ${gp && !match.matchOver ? '<div class="badge accent mt">Palla gioco</div>' : ''}
      </div>
      <div class="score-points">${points}</div>
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

function onEditNames(el) {
  const a = prompt('Nome squadra A', match.teamAName);
  if (a) match.teamAName = a.trim().slice(0, 24);
  const b = prompt('Nome squadra B', match.teamBName);
  if (b) match.teamBName = b.trim().slice(0, 24);
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
