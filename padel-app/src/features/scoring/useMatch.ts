import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  DEFAULT_MATCH_CONFIG,
  MatchConfig,
  Team,
  applyPoint,
  computeMatchState,
  undoLastPoint,
} from './padelScoring';
import { announce, DEFAULT_TEAM_NAMES, TeamNames } from '../audio/announcer';
import { loadJSON, saveJSON } from '../../storage/storage';

interface PersistedMatch {
  config: MatchConfig;
  pointLog: Team[];
  names: TeamNames;
}

const MATCH_KEY = 'current-match';

const EMPTY_MATCH: PersistedMatch = {
  config: DEFAULT_MATCH_CONFIG,
  pointLog: [],
  names: DEFAULT_TEAM_NAMES,
};

export function useMatch(announcerEnabled: boolean) {
  const [config, setConfig] = useState<MatchConfig>(DEFAULT_MATCH_CONFIG);
  const [pointLog, setPointLog] = useState<Team[]>([]);
  const [names, setNames] = useState<TeamNames>(DEFAULT_TEAM_NAMES);
  const [isLoaded, setIsLoaded] = useState(false);
  const announcerEnabledRef = useRef(announcerEnabled);
  announcerEnabledRef.current = announcerEnabled;

  useEffect(() => {
    loadJSON(MATCH_KEY, EMPTY_MATCH).then((stored) => {
      setConfig(stored.config);
      setPointLog(stored.pointLog);
      setNames(stored.names);
      setIsLoaded(true);
    });
  }, []);

  useEffect(() => {
    if (isLoaded) saveJSON(MATCH_KEY, { config, pointLog, names });
  }, [config, pointLog, names, isLoaded]);

  const state = useMemo(() => computeMatchState(config, pointLog), [config, pointLog]);

  const point = useCallback(
    (team: Team) => {
      setPointLog((log) => {
        const next = applyPoint(state, log, team);
        if (next !== log) {
          const nextState = computeMatchState(config, next);
          announce(nextState, names, { enabled: announcerEnabledRef.current });
        }
        return next;
      });
    },
    [state, config, names]
  );

  const undo = useCallback(() => {
    setPointLog((log) => undoLastPoint(log));
  }, []);

  const resetMatch = useCallback(
    (newConfig?: Partial<MatchConfig>, newNames?: Partial<TeamNames>) => {
      setConfig((c) => ({ ...c, ...newConfig }));
      setNames((n) => ({ ...n, ...newNames }));
      setPointLog([]);
    },
    []
  );

  return { state, config, names, point, undo, resetMatch, canUndo: pointLog.length > 0, isLoaded };
}
