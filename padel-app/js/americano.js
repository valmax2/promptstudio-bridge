// Americano tournament engine: players rotate partners each round so
// everyone plays with/against everyone else roughly evenly, and each
// player accumulates individual points across all rounds played. Pure
// functions (no DOM/state mutation) so the screen just re-renders after
// each call.
function pairKey(a, b) {
  return [a, b].sort((x, y) => x - y).join('-');
}

function randomShuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function bestSplitFor4(group, partnerCounts) {
  const [w, x, y, z] = group;
  const options = [
    [[w, x], [y, z]],
    [[w, y], [x, z]],
    [[w, z], [x, y]],
  ];
  let best = options[0];
  let bestScore = Infinity;
  for (const opt of options) {
    const score = (partnerCounts[pairKey(...opt[0])] || 0) + (partnerCounts[pairKey(...opt[1])] || 0);
    if (score < bestScore) { bestScore = score; best = opt; }
  }
  return { pairs: best, score: bestScore };
}

function generateMatches(playingIds, partnerCounts, opponentCounts, attempts = 60) {
  let bestArrangement = null;
  let bestScore = Infinity;
  for (let attempt = 0; attempt < attempts; attempt++) {
    const shuffled = randomShuffle(playingIds);
    const groups = [];
    for (let i = 0; i < shuffled.length; i += 4) groups.push(shuffled.slice(i, i + 4));
    let totalScore = 0;
    const matches = groups.map((g) => {
      const { pairs, score } = bestSplitFor4(g, partnerCounts);
      const oppScore = (opponentCounts[pairKey(pairs[0][0], pairs[1][0])] || 0)
        + (opponentCounts[pairKey(pairs[0][0], pairs[1][1])] || 0)
        + (opponentCounts[pairKey(pairs[0][1], pairs[1][0])] || 0)
        + (opponentCounts[pairKey(pairs[0][1], pairs[1][1])] || 0);
      totalScore += score * 10 + oppScore;
      return { pairA: pairs[0], pairB: pairs[1] };
    });
    if (totalScore < bestScore) { bestScore = totalScore; bestArrangement = matches; }
    if (bestScore === 0) break;
  }
  return bestArrangement;
}

export function createAmericano({ players, pointsPerRound = 21 } = {}) {
  const roster = players.map((name, i) => ({ id: i, name, totalPoints: 0, roundsPlayed: 0 }));
  return generateNextRound({
    roster,
    pointsPerRound,
    round: null,
    roundNumber: 0,
    partnerCounts: {},
    opponentCounts: {},
    finished: false,
    history: [],
  });
}

export function generateNextRound(state) {
  const s = structuredClone(state);
  const ids = s.roster.map((p) => p.id);
  const courts = Math.floor(ids.length / 4);
  if (courts < 1) { s.round = null; return s; }
  const sorted = [...ids].sort((a, b) => {
    const ra = s.roster.find((p) => p.id === a).roundsPlayed;
    const rb = s.roster.find((p) => p.id === b).roundsPlayed;
    return ra - rb;
  });
  const numPlaying = courts * 4;
  const playingIds = sorted.slice(0, numPlaying);
  const sitOutIds = sorted.slice(numPlaying);
  const matches = generateMatches(playingIds, s.partnerCounts, s.opponentCounts);
  s.roundNumber += 1;
  s.round = {
    number: s.roundNumber,
    matches: matches.map((m) => ({ ...m, scoreA: null, scoreB: null })),
    sitOut: sitOutIds,
  };
  return s;
}

export function submitRoundScores(state, scoresByCourt) {
  const s = structuredClone(state);
  const round = s.round;
  round.matches.forEach((m, idx) => {
    const { scoreA, scoreB } = scoresByCourt[idx];
    m.scoreA = scoreA;
    m.scoreB = scoreB;
    for (const id of m.pairA) {
      const p = s.roster.find((r) => r.id === id);
      p.totalPoints += scoreA;
      p.roundsPlayed += 1;
    }
    for (const id of m.pairB) {
      const p = s.roster.find((r) => r.id === id);
      p.totalPoints += scoreB;
      p.roundsPlayed += 1;
    }
    const k1 = pairKey(...m.pairA);
    s.partnerCounts[k1] = (s.partnerCounts[k1] || 0) + 1;
    const k2 = pairKey(...m.pairB);
    s.partnerCounts[k2] = (s.partnerCounts[k2] || 0) + 1;
    for (const a of m.pairA) {
      for (const b of m.pairB) {
        const ok = pairKey(a, b);
        s.opponentCounts[ok] = (s.opponentCounts[ok] || 0) + 1;
      }
    }
  });
  s.history.push(round);
  s.round = null;
  return s;
}

export function finishTournament(state) {
  return { ...structuredClone(state), finished: true };
}

export function standings(state) {
  return [...state.roster].sort((a, b) => b.totalPoints - a.totalPoints || a.name.localeCompare(b.name));
}

export function playerName(state, id) {
  return state.roster.find((p) => p.id === id)?.name || '?';
}
