// Killer (Eliminazione) engine: "king of the court" queue with lives. Two
// players are on court; whoever loses the round (a full game, or a single
// point in "punto secco" mode) loses a life. The winner stays on court to
// face the next challenger from the queue; a player with no lives left is
// eliminated. Last player standing wins. Pure functions, no DOM.
export function createKiller({ players, lives = 3, trigger = 'game' } = {}) {
  const roster = players.map((name, i) => ({ id: i, name, lives, eliminated: false }));
  return {
    roster,
    lives,
    trigger, // 'game' | 'point'
    court: [roster[0]?.id ?? null, roster[1]?.id ?? null],
    queue: roster.slice(2).map((p) => p.id),
    eliminationOrder: [],
    winnerId: null,
    finished: roster.length < 2,
    history: [],
  };
}

export function recordRoundResult(state, loserId) {
  const s = structuredClone(state);
  if (s.finished) return s;
  const loser = s.roster.find((p) => p.id === loserId);
  const winnerId = s.court.find((id) => id !== loserId);
  loser.lives -= 1;
  s.history.push({ court: [...s.court], loserId, winnerId, timestamp: Date.now() });

  if (loser.lives <= 0) {
    loser.eliminated = true;
    s.eliminationOrder.push(loserId);
    if (s.queue.length) {
      const next = s.queue.shift();
      s.court = [winnerId, next];
    } else {
      s.court = [winnerId, null];
    }
  } else if (s.queue.length) {
    const next = s.queue.shift();
    s.queue.push(loserId);
    s.court = [winnerId, next];
  } else {
    s.court = [winnerId, loserId];
  }

  const active = s.roster.filter((p) => !p.eliminated);
  if (active.length <= 1) {
    s.finished = true;
    s.winnerId = active[0]?.id ?? winnerId;
  }
  return s;
}

export function playerName(state, id) {
  return state.roster.find((p) => p.id === id)?.name || '?';
}

export function playerLives(state, id) {
  return state.roster.find((p) => p.id === id)?.lives ?? 0;
}
