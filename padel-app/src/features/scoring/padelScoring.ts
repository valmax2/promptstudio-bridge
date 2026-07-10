export type Team = 'teamA' | 'teamB';

export interface MatchConfig {
  /** Sets a team must win to take the match (2 = best of 3, 3 = best of 5). */
  setsToWin: number;
  /** Games at which a tie-break is played (standard padel/tennis = 6, i.e. 6-6). */
  tieBreakAt: number;
  /** Points needed to win the tie-break, win by 2 (standard = 7). */
  tieBreakPoints: number;
  /** "Punto de oro": sudden-death point at deuce instead of advantage scoring. */
  goldenPoint: boolean;
}

export const DEFAULT_MATCH_CONFIG: MatchConfig = {
  setsToWin: 2,
  tieBreakAt: 6,
  tieBreakPoints: 7,
  goldenPoint: true,
};

export interface CompletedSet {
  teamA: number;
  teamB: number;
  tieBreak?: { teamA: number; teamB: number };
}

export interface GameScore {
  /** Raw point count in the current game (0,1,2,3+). Meaningless during a tie-break. */
  teamA: number;
  teamB: number;
}

export interface TieBreakScore {
  teamA: number;
  teamB: number;
}

export type PointOutcome =
  | { kind: 'point' }
  | { kind: 'deuce' }
  | { kind: 'advantage'; team: Team }
  | { kind: 'game'; team: Team }
  | { kind: 'set'; team: Team }
  | { kind: 'match'; team: Team };

export interface MatchState {
  config: MatchConfig;
  completedSets: CompletedSet[];
  currentSet: { teamA: number; teamB: number };
  isTieBreak: boolean;
  game: GameScore;
  tieBreak: TieBreakScore;
  server: Team;
  winner?: Team;
  /** Result of the most recently applied point, for the audio announcer. */
  lastOutcome?: PointOutcome;
}

const POINT_LABELS = ['0', '15', '30', '40'];

function isSetWon(games: { teamA: number; teamB: number }, config: MatchConfig): Team | undefined {
  const { teamA, teamB } = games;
  const target = config.tieBreakAt;
  if (teamA >= target + 1 || teamB >= target + 1) {
    return teamA > teamB ? 'teamA' : 'teamB';
  }
  if ((teamA >= target || teamB >= target) && Math.abs(teamA - teamB) >= 2) {
    return teamA > teamB ? 'teamA' : 'teamB';
  }
  return undefined;
}

function isGameWon(game: GameScore, config: MatchConfig): Team | undefined {
  const { teamA, teamB } = game;
  // Not yet deuce territory until BOTH sides have reached "40" (index >= 3) —
  // a lone 40-0/40-15/40-30 is a normal lead, not deuce, and still needs a 4th point.
  if (teamA < 3 || teamB < 3) {
    if (teamA >= 4) return 'teamA';
    if (teamB >= 4) return 'teamB';
    return undefined;
  }
  // Deuce territory (both reached "40", i.e. index >= 3).
  if (config.goldenPoint) {
    // Sudden death: whoever is ahead at exactly one point wins immediately.
    if (teamA > teamB) return 'teamA';
    if (teamB > teamA) return 'teamB';
    return undefined;
  }
  // Advantage scoring: must lead by 2.
  if (teamA - teamB >= 2) return 'teamA';
  if (teamB - teamA >= 2) return 'teamB';
  return undefined;
}

function serverForGameIndex(gameIndex: number): Team {
  return gameIndex % 2 === 0 ? 'teamA' : 'teamB';
}

/**
 * Pure replay: the entire match state is derived from the ordered list of point
 * winners. This makes "annulla" (undo) trivial and bug-resistant — pop the last
 * entry and recompute, rather than trying to invert mutable state transitions.
 */
export function computeMatchState(config: MatchConfig, pointLog: Team[]): MatchState {
  const completedSets: CompletedSet[] = [];
  let currentSet = { teamA: 0, teamB: 0 };
  let game: GameScore = { teamA: 0, teamB: 0 };
  let tieBreak: TieBreakScore = { teamA: 0, teamB: 0 };
  let isTieBreak = false;
  let winner: Team | undefined;
  let lastOutcome: PointOutcome | undefined;
  let gamesPlayedTotal = 0;

  for (const point of pointLog) {
    if (winner) break; // ignore stray points after match end (shouldn't happen via applyPoint guard)

    if (isTieBreak) {
      tieBreak = { ...tieBreak, [point]: tieBreak[point] + 1 };
      const target = config.tieBreakPoints;
      const tbWinner =
        (tieBreak.teamA >= target || tieBreak.teamB >= target) &&
        Math.abs(tieBreak.teamA - tieBreak.teamB) >= 2
          ? tieBreak.teamA > tieBreak.teamB
            ? 'teamA'
            : 'teamB'
          : undefined;

      if (!tbWinner) {
        lastOutcome = { kind: 'point' };
        continue;
      }

      currentSet = { ...currentSet, [tbWinner]: currentSet[tbWinner] + 1 };
      completedSets.push({ ...currentSet, tieBreak: { ...tieBreak } });
      lastOutcome = { kind: 'set', team: tbWinner };

      const setsWon = completedSets.filter((s) => s.teamA > s.teamB).length;
      const setsWonB = completedSets.filter((s) => s.teamB > s.teamA).length;
      if (setsWon >= config.setsToWin || setsWonB >= config.setsToWin) {
        winner = tbWinner;
        lastOutcome = { kind: 'match', team: tbWinner };
      }

      currentSet = { teamA: 0, teamB: 0 };
      game = { teamA: 0, teamB: 0 };
      tieBreak = { teamA: 0, teamB: 0 };
      isTieBreak = false;
      continue;
    }

    game = { ...game, [point]: game[point] + 1 };
    const gameWinner = isGameWon(game, config);

    if (!gameWinner) {
      if (game.teamA >= 3 && game.teamB >= 3) {
        lastOutcome = game.teamA === game.teamB ? { kind: 'deuce' } : { kind: 'advantage', team: point };
      } else {
        lastOutcome = { kind: 'point' };
      }
      continue;
    }

    currentSet = { ...currentSet, [gameWinner]: currentSet[gameWinner] + 1 };
    game = { teamA: 0, teamB: 0 };
    gamesPlayedTotal += 1;
    lastOutcome = { kind: 'game', team: gameWinner };

    if (currentSet.teamA === config.tieBreakAt && currentSet.teamB === config.tieBreakAt) {
      isTieBreak = true;
      continue;
    }

    const setWinner = isSetWon(currentSet, config);
    if (!setWinner) continue;

    completedSets.push({ ...currentSet });
    lastOutcome = { kind: 'set', team: setWinner };

    const setsWon = completedSets.filter((s) => s.teamA > s.teamB).length;
    const setsWonB = completedSets.filter((s) => s.teamB > s.teamA).length;
    if (setsWon >= config.setsToWin || setsWonB >= config.setsToWin) {
      winner = setWinner;
      lastOutcome = { kind: 'match', team: setWinner };
    }
    currentSet = { teamA: 0, teamB: 0 };
  }

  return {
    config,
    completedSets,
    currentSet,
    isTieBreak,
    game,
    tieBreak,
    server: serverForGameIndex(gamesPlayedTotal),
    winner,
    lastOutcome,
  };
}

export function applyPoint(state: MatchState, pointLog: Team[], team: Team): Team[] {
  if (state.winner) return pointLog;
  return [...pointLog, team];
}

export function undoLastPoint(pointLog: Team[]): Team[] {
  return pointLog.slice(0, -1);
}

/** Human-readable point label ("0", "15", "30", "40", "Ventaggio"), deuce-aware. */
export function formatGamePoint(game: GameScore, team: Team, config: MatchConfig): string {
  const mine = game[team];
  const other = team === 'teamA' ? game.teamB : game.teamA;

  if (mine < 3 || other < 3) return POINT_LABELS[Math.min(mine, 3)];
  if (mine === other) return '40';
  if (config.goldenPoint) return mine > other ? '40' : '40';
  return mine > other ? 'AD' : '40';
}
