import React, { useCallback } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Screen } from '../components/Screen';
import { ThemedText } from '../components/ThemedText';
import { Button } from '../components/Button';
import { useAppTheme } from '../theme/ThemeContext';
import { useMatch } from '../features/scoring/useMatch';
import { useAnnouncerSetting } from '../features/audio/useAnnouncerSetting';
import { useRemoteInput } from '../features/remote/RemoteInputService';
import { formatGamePoint } from '../features/scoring/padelScoring';

export function ScoreboardScreen() {
  const { palette } = useAppTheme();
  const { enabled: announcerEnabled } = useAnnouncerSetting();
  const { state, names, point, undo, resetMatch, canUndo } = useMatch(announcerEnabled);

  const handleAction = useCallback(
    (action: 'pointA' | 'pointB' | 'undo') => {
      if (action === 'pointA') point('teamA');
      else if (action === 'pointB') point('teamB');
      else undo();
    },
    [point, undo]
  );

  const { triggerSimulated } = useRemoteInput(handleAction);

  const pointA = state.isTieBreak ? String(state.tieBreak.teamA) : formatGamePoint(state.game, 'teamA', state.config);
  const pointB = state.isTieBreak ? String(state.tieBreak.teamB) : formatGamePoint(state.game, 'teamB', state.config);

  return (
    <Screen style={{ padding: 0 }}>
      <View style={[styles.setsBar, { borderBottomColor: palette.border, backgroundColor: palette.surface }]}>
        {state.completedSets.map((set, i) => (
          <ThemedText key={i} variant="subtitle" color="secondary" style={styles.setPill}>
            {set.teamA}-{set.teamB}
          </ThemedText>
        ))}
        {state.isTieBreak && (
          <ThemedText variant="subtitle" color="accent" style={styles.setPill}>
            Tie-break
          </ThemedText>
        )}
        {!state.winner && (
          <ThemedText variant="subtitle" color="secondary" style={styles.setPill}>
            Set in corso {state.currentSet.teamA}-{state.currentSet.teamB}
          </ThemedText>
        )}
      </View>

      {state.winner ? (
        <View style={styles.winnerBanner}>
          <ThemedText variant="title" color="accent">
            🏆 Vince {names[state.winner]}
          </ThemedText>
          <Button label="Nuova partita" variant="primary" onPress={() => resetMatch()} style={{ marginTop: 20 }} />
        </View>
      ) : (
        <>
          <Pressable
            style={[styles.teamHalf, { backgroundColor: palette.surface }]}
            onPress={() => triggerSimulated('sim:buttonA')}
          >
            <ThemedText variant="subtitle" color="secondary">
              {names.teamA}
            </ThemedText>
            <ThemedText variant="score" color="primary">
              {pointA}
            </ThemedText>
            <ThemedText variant="caption" color="secondary">
              Tocca per assegnare il punto
            </ThemedText>
          </Pressable>

          <View style={[styles.divider, { backgroundColor: palette.border }]} />

          <Pressable
            style={[styles.teamHalf, { backgroundColor: palette.surface }]}
            onPress={() => triggerSimulated('sim:buttonB')}
          >
            <ThemedText variant="subtitle" color="secondary">
              {names.teamB}
            </ThemedText>
            <ThemedText variant="score" color="primary">
              {pointB}
            </ThemedText>
            <ThemedText variant="caption" color="secondary">
              Tocca per assegnare il punto
            </ThemedText>
          </Pressable>
        </>
      )}

      <View style={[styles.footer, { borderTopColor: palette.border, backgroundColor: palette.surface }]}>
        <Button
          label="↺ Annulla ultimo punto"
          onPress={() => triggerSimulated('sim:buttonCancel')}
          disabled={!canUndo}
        />
        <Button label="Nuova partita" variant="danger" onPress={() => resetMatch()} />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  setsBar: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    padding: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  setPill: {
    paddingHorizontal: 4,
  },
  teamHalf: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
  },
  winnerBanner: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  footer: {
    flexDirection: 'row',
    gap: 12,
    padding: 16,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
});
