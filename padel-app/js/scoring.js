// Padel scoring engine: games (0/15/30/40 + deuce/advantage or golden point),
// sets to 6 (tiebreak at 6-6), best of 3 sets, with an optional match
// tiebreak (super tiebreak to 10) as the decider instead of a full 3rd set.
const LABELS = ['0', '15', '30', '40'];
export const pointLabel = (n) => LABELS[n] ?? String(n);

const other = (t) => (t === 'A' ? 'B' : 'A');

export function createMatch({
  teamAName = 'Squadra A',
  teamBName = 'Squadra B',
  goldenPoint = true,
  superTiebreak3rdSet = true,
  mode = 'doubles',
} = {}) {
  return {
    teamAName,
    teamBName,
    goldenPoint,
    superTiebreak3rdSet,
    mode,
    sets: [],
    setsWonA: 0,
    setsWonB: 0,
    currentSet: { gamesA: 0, gamesB: 0 },
    currentGame: { a: 0, b: 0, advantage: null },
    inTiebreak: false,
    inMatchTiebreak: false,
    server: 'A',
    matchOver: false,
    matchWinner: null,
    startedAt: Date.now(),
  };
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

function awardGame(match, team) {
  if (team === 'A') match.currentSet.gamesA++; else match.currentSet.gamesB++;
  match.currentGame = { a: 0, b: 0, advantage: null };
  match.server = other(team);
  const { gamesA, gamesB } = match.currentSet;
  let announcement = `Gioco ${teamName(match, team)}`;
  let setWon = false;
  let matchWon = false;

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
  if (g.advantage) {
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
