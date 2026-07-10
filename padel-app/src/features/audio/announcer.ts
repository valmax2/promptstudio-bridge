import * as Speech from 'expo-speech';
import { MatchState, Team, formatGamePoint } from '../scoring/padelScoring';

export interface TeamNames {
  teamA: string;
  teamB: string;
}

export const DEFAULT_TEAM_NAMES: TeamNames = { teamA: 'Squadra A', teamB: 'Squadra B' };

function otherTeam(team: Team): Team {
  return team === 'teamA' ? 'teamB' : 'teamA';
}

function gamesPhrase(state: MatchState, names: TeamNames): string {
  const { teamA, teamB } = state.currentSet;
  const noun = (n: number) => (n === 1 ? 'gioco' : 'giochi');
  if (teamA === teamB) return `${teamA} ${noun(teamA)} pari`;
  const leader = teamA > teamB ? names.teamA : names.teamB;
  const [hi, lo] = teamA > teamB ? [teamA, teamB] : [teamB, teamA];
  return `${leader} avanti ${hi} a ${lo}`;
}

/** Builds the Italian phrase to speak for the most recent point, given the resulting state. */
export function buildAnnouncement(state: MatchState, names: TeamNames = DEFAULT_TEAM_NAMES): string | undefined {
  const outcome = state.lastOutcome;
  if (!outcome) return undefined;

  switch (outcome.kind) {
    case 'point': {
      if (state.isTieBreak) {
        const { teamA, teamB } = state.tieBreak;
        return teamA === teamB ? `${teamA} pari` : `${teamA} a ${teamB}`;
      }
      const a = formatGamePoint(state.game, 'teamA', state.config);
      const b = formatGamePoint(state.game, 'teamB', state.config);
      if (a === b) return `${a} pari`;
      return `${a} a ${b}`;
    }
    case 'deuce':
      return 'Parità';
    case 'advantage':
      return `Vantaggio ${names[outcome.team]}`;
    case 'game':
      return `Gioco ${names[outcome.team]}. ${gamesPhrase(state, names)}`;
    case 'set':
      return `Set per ${names[outcome.team]}`;
    case 'match':
      return `Partita! Vince ${names[outcome.team]}`;
    default:
      return undefined;
  }
}

export interface AnnouncerOptions {
  enabled: boolean;
  language?: string; // BCP-47, default it-IT
  rate?: number;
  pitch?: number;
}

const DEFAULT_OPTIONS: Required<Omit<AnnouncerOptions, 'enabled'>> = {
  language: 'it-IT',
  rate: 1.0,
  pitch: 1.0,
};

/**
 * Speaks the announcement for the latest point. expo-speech queues utterances
 * automatically, so rapid-fire taps on the remote don't overlap or corrupt
 * playback. Output routes through whatever audio device iOS/Android currently
 * has active (a paired Bluetooth speaker included) — no extra Bluetooth
 * plumbing is needed on the app side once the speaker is paired at the OS level.
 */
export function announce(state: MatchState, names: TeamNames, options: AnnouncerOptions): void {
  if (!options.enabled) return;
  const phrase = buildAnnouncement(state, names);
  if (!phrase) return;
  const { language, rate, pitch } = { ...DEFAULT_OPTIONS, ...options };
  Speech.speak(phrase, { language, rate, pitch });
}

export function stopAnnouncing(): void {
  Speech.stop();
}
