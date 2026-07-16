// Padel scoring engine: games (0/15/30/40 + deuce/advantage or golden point),
// sets to 6 (tiebreak at 6-6), best of 3 sets, with an optional match
// tiebreak (super tiebreak to 10) as the decider instead of a full 3rd set.
import { LITE_MODE } from './lite-mode.js';

const LABELS = ['0', '15', '30', '40'];
// La build beta serve solo a testare l'accoppiamento di telecomandi/tag: un
// conteggio semplice (0,1,2,3...) rende immediato verificare che ogni
// pressione corrisponda a un punto, senza dover tradurre "trenta" in "due
// pressioni" - niente terminologia da padel vero.
export const pointLabel = (n) => (LITE_MODE ? String(n) : (LABELS[n] ?? String(n)));

const other = (t) => (t === 'A' ? 'B' : 'A');

export function createMatch({
  teamAName = 'Squadra A',
  teamBName = 'Squadra B',
  teamAPlayers = [teamAName],
  teamBPlayers = [teamBName],
  goldenPoint = true,
  superTiebreak3rdSet = true,
  mode = 'doubles',
  startingServer = 'A',
  // Which of the 2 players on the starting team serves first (index 0/1) -
  // picked directly on a specific player in the setup screen instead of
  // just a team, so the very first announcement can name them.
  startingServerPlayerIdx = 0,
  // 'classic' = normal sets/tiebreak match; 'time' = continuous play for a
  // fixed duration, whoever has more games when time's up wins (no sets).
  format = 'classic',
  timeLimitMinutes = 45,
} = {}) {
  return {
    teamAName,
    teamBName,
    teamAPlayers,
    teamBPlayers,
    goldenPoint,
    superTiebreak3rdSet,
    mode,
    format,
    timeLimitMinutes,
    matchEndsAt: format === 'time' ? Date.now() + timeLimitMinutes * 60000 : null,
    sets: [],
    setsWonA: 0,
    setsWonB: 0,
    currentSet: { gamesA: 0, gamesB: 0 },
    currentGame: { a: 0, b: 0, advantage: null },
    inTiebreak: false,
    inMatchTiebreak: false,
    server: startingServer,
    // Which of the 2 players on each team (index 0/1) is currently serving -
    // only meaningful in doubles. Auto-alternates between partners every
    // time that team's service turn comes back around (see awardGame below,
    // matching real padel rotation), but the very first turn each team
    // serves keeps whatever was picked (or the 0 default) - still editable
    // manually mid-game via the "Batte: <nome> ⇄" toggle in the live
    // scoreboard.
    serverPlayerA: startingServer === 'A' ? startingServerPlayerIdx : 0,
    serverPlayerB: startingServer === 'B' ? startingServerPlayerIdx : 0,
    // How many service turns each team has had so far - lets awardGame tell
    // "first turn" (keep as picked/defaulted) apart from later turns (start
    // alternating the serving partner).
    serverTurnCountA: startingServer === 'A' ? 1 : 0,
    serverTurnCountB: startingServer === 'B' ? 1 : 0,
    matchOver: false,
    matchWinner: null,
    startedAt: Date.now(),
  };
}

// Called by the UI when the timer for a 'time'-format match runs out.
// Whoever has more games total wins; an exact tie has no winner.
export function endTimeMatch(matchIn) {
  const match = structuredClone(matchIn);
  if (match.matchOver) return match;
  match.matchOver = true;
  const { gamesA, gamesB } = match.currentSet;
  match.matchWinner = gamesA === gamesB ? null : (gamesA > gamesB ? 'A' : 'B');
  return match;
}

export function teamName(match, t) {
  return t === 'A' ? match.teamAName : match.teamBName;
}

// Zeroes out the score of the game (or tiebreak) currently being played,
// without touching games/sets already won - useful to fix a mis-scored
// game via remote control without restarting the whole match.
export function resetCurrentGame(matchIn) {
  const match = structuredClone(matchIn);
  match.currentGame = { a: 0, b: 0, advantage: null };
  return match;
}

export function describeSets(match) {
  return match.sets.map((s) => `${s.a}-${s.b}`).join(', ');
}

function result(match, announcement, events = {}) {
  return {
    match,
    announcement,
    events: { gameWon: false, setWon: false, matchWon: false, ...events },
  };
}

function finalizeSet(match, winner, scoreA, scoreB, isTiebreak, tiebreakDetail = null) {
  match.sets.push({ a: scoreA, b: scoreB, tiebreak: isTiebreak, tiebreakScore: tiebreakDetail });
  if (winner === 'A') match.setsWonA++; else match.setsWonB++;
  match.currentSet = { gamesA: 0, gamesB: 0 };
  match.currentGame = { a: 0, b: 0, advantage: null };
  match.inTiebreak = false;
  match.inMatchTiebreak = false;

  if (match.setsWonA === 2 || match.setsWonB === 2) {
    match.matchOver = true;
    match.matchWinner = match.setsWonA === 2 ? 'A' : 'B';
  } else if (match.setsWonA === 1 && match.setsWonB === 1 && match.superTiebreak3rdSet) {
    match.inMatchTiebreak = true;
  }
}

function describeGamePoint(g) {
  if (g.a === g.b) return `${pointLabel(g.a)} pari`;
  const hi = Math.max(g.a, g.b);
  const lo = Math.min(g.a, g.b);
  return `${pointLabel(hi)} a ${pointLabel(lo)}`;
}

// Names the player who serves next for whichever team match.server now
// points to (after the flip in awardGame below) - reads the stored
// serverPlayerA/B index rather than computing any rotation, so it reflects
// whatever was set at match start or via the live "Batte: <nome> ⇄" toggle.
// Empty for singles, where naming the server would just repeat the team name.
function nextServerAnnouncement(match) {
  const players = match.server === 'A' ? match.teamAPlayers : match.teamBPlayers;
  if (players.length < 2) return '';
  const idx = (match.server === 'A' ? match.serverPlayerA : match.serverPlayerB) || 0;
  const name = players[idx];
  return name ? `. Batte ${name}` : '';
}

// Called whenever `team` becomes the next server: on that team's first ever
// service turn the player picked at setup (or the 0 default) stays as-is,
// but from the second turn onward the serving partner alternates - exactly
// how real padel doubles rotates service within a team.
function alternateServingPlayer(match, team) {
  const players = team === 'A' ? match.teamAPlayers : match.teamBPlayers;
  if (players.length < 2) return;
  const turnKey = team === 'A' ? 'serverTurnCountA' : 'serverTurnCountB';
  if (match[turnKey] >= 1) {
    if (team === 'A') match.serverPlayerA = match.serverPlayerA === 0 ? 1 : 0;
    else match.serverPlayerB = match.serverPlayerB === 0 ? 1 : 0;
  }
  match[turnKey]++;
}

function awardGame(match, team) {
  if (team === 'A') match.currentSet.gamesA++; else match.currentSet.gamesB++;
  match.currentGame = { a: 0, b: 0, advantage: null };
  // Service alternates by game count regardless of who won it - using the
  // *winner* here would wrongly let the same team serve twice in a row
  // whenever they break the other side's serve, instead of the other team
  // always taking over next game.
  match.server = other(match.server);
  alternateServingPlayer(match, match.server);
  const { gamesA, gamesB } = match.currentSet;
  let announcement = `Gioco ${teamName(match, team)}`;
  let setWon = false;
  let matchWon = false;

  // Continuous "a tempo" matches have no sets/tiebreak - just keep tallying
  // games until the UI ends the match when the timer runs out.
  if (match.format === 'time') {
    announcement += nextServerAnnouncement(match);
    return result(match, announcement, { gameWon: true, setWon: false, matchWon: false });
  }

  if (gamesA === 6 && gamesB === 6) {
    match.inTiebreak = true;
    announcement += '. Tie-break';
  } else {
    const hi = Math.max(gamesA, gamesB);
    const lo = Math.min(gamesA, gamesB);
    if (hi >= 6 && hi - lo >= 2) {
      finalizeSet(match, team, gamesA, gamesB, false);
      setWon = true;
      announcement = `Set ${teamName(match, team)}! (${describeSets(match)})`;
      if (match.matchOver) {
        matchWon = true;
        announcement = `Partita vinta da ${teamName(match, team)}!`;
      }
    } else {
      announcement += nextServerAnnouncement(match);
    }
  }
  return result(match, announcement, { gameWon: true, setWon, matchWon });
}

function addRegularPoint(match, team) {
  const g = match.currentGame;
  const mineKey = team === 'A' ? 'a' : 'b';
  const otherKey = team === 'A' ? 'b' : 'a';
  const mine = g[mineKey];
  const theirs = g[otherKey];

  if (g.advantage) {
    if (g.advantage === team) return awardGame(match, team);
    g.advantage = null;
    return result(match, 'Parità');
  }

  if (mine === 3 && theirs === 3) {
    if (match.goldenPoint) return awardGame(match, team);
    g.advantage = team;
    return result(match, `Vantaggio ${teamName(match, team)}`);
  }

  if (mine === 3 && theirs < 3) return awardGame(match, team);

  g[mineKey] = mine + 1;
  if (g.a === 3 && g.b === 3) {
    return result(match, match.goldenPoint ? "Parità, punto d'oro" : 'Parità');
  }
  return result(match, describeGamePoint(g));
}

function addTiebreakPoint(match, team, target, isMatchTiebreak) {
  const g = match.currentGame;
  const key = team === 'A' ? 'a' : 'b';
  g[key]++;
  const lead = team === 'A' ? g.a : g.b;
  const trail = team === 'A' ? g.b : g.a;

  if (lead >= target && lead - trail >= 2) {
    if (isMatchTiebreak) {
      finalizeSet(match, team, g.a, g.b, true, { a: g.a, b: g.b, matchTiebreak: true });
    } else {
      const gamesA = match.currentSet.gamesA + (team === 'A' ? 1 : 0);
      const gamesB = match.currentSet.gamesB + (team === 'B' ? 1 : 0);
      finalizeSet(match, team, gamesA, gamesB, true, { a: g.a, b: g.b });
    }
    let announcement = `Set ${teamName(match, team)}! (${describeSets(match)})`;
    let matchWon = false;
    if (match.matchOver) {
      matchWon = true;
      announcement = `Partita vinta da ${teamName(match, team)}!`;
    }
    return result(match, announcement, { gameWon: !isMatchTiebreak, setWon: true, matchWon });
  }
  return result(match, `${g.a} a ${g.b}`);
}

export function addPoint(matchIn, team) {
  const match = structuredClone(matchIn);
  if (match.matchOver) return result(match, '');
  if (match.inMatchTiebreak) return addTiebreakPoint(match, team, 10, true);
  if (match.inTiebreak) return addTiebreakPoint(match, team, 7, false);
  return addRegularPoint(match, team);
}

export function matchPointDisplay(match) {
  if (match.inMatchTiebreak || match.inTiebreak) {
    return { a: String(match.currentGame.a), b: String(match.currentGame.b) };
  }
  const g = match.currentGame;
  if (g.advantage && !LITE_MODE) {
    return {
      a: g.advantage === 'A' ? 'AD' : '40',
      b: g.advantage === 'B' ? 'AD' : '40',
    };
  }
  return { a: pointLabel(g.a), b: pointLabel(g.b) };
}

export function isGamePoint(match, team) {
  if (match.matchOver) return false;
  if (match.inTiebreak || match.inMatchTiebreak) {
    const target = match.inMatchTiebreak ? 10 : 7;
    const mine = team === 'A' ? match.currentGame.a : match.currentGame.b;
    const theirs = team === 'A' ? match.currentGame.b : match.currentGame.a;
    return mine >= target - 1 && mine - theirs >= 1;
  }
  const g = match.currentGame;
  if (g.advantage) return g.advantage === team;
  const mineKey = team === 'A' ? 'a' : 'b';
  const otherKey = team === 'A' ? 'b' : 'a';
  return g[mineKey] === 3 && g[otherKey] < 3;
}
