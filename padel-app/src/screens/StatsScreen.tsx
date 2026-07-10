import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Screen } from '../components/Screen';
import { ThemedText } from '../components/ThemedText';
import { SettingsSection } from '../components/SettingsSection';
import { useAppTheme } from '../theme/ThemeContext';

const MOCK_HISTORY = [
  { opponent: 'Team Bianchi', result: 'Vittoria', score: '6-3 6-4', date: '05 lug' },
  { opponent: 'Team Verdi', result: 'Sconfitta', score: '4-6 6-7', date: '28 giu' },
  { opponent: 'Team Rossi', result: 'Vittoria', score: '6-2 6-1', date: '21 giu' },
];

const XP_LEVEL = 7;
const XP_PROGRESS = 0.62;

export function StatsScreen() {
  const { palette } = useAppTheme();

  return (
    <Screen scroll>
      <ThemedText variant="title" style={{ marginBottom: 4 }}>
        Statistiche
      </ThemedText>
      <ThemedText variant="caption" color="secondary" style={{ marginBottom: 20 }}>
        Anteprima con dati di esempio — lo storico reale arriverà collegando le partite giocate.
      </ThemedText>

      <View style={styles.statRow}>
        <StatCard label="Partite" value="24" />
        <StatCard label="Vittorie" value="16" accent />
        <StatCard label="% Vittorie" value="67%" />
      </View>

      <SettingsSection title="Livello e premi">
        <View style={{ padding: 14 }}>
          <ThemedText variant="body" bold>
            Livello {XP_LEVEL} · 620 XP
          </ThemedText>
          <View style={[styles.progressTrack, { backgroundColor: palette.surfaceAlt }]}>
            <View style={[styles.progressFill, { backgroundColor: palette.accent, width: `${XP_PROGRESS * 100}%` }]} />
          </View>
          <ThemedText variant="caption" color="secondary" style={{ marginTop: 8 }}>
            380 XP al prossimo sblocco: cornice profilo "Oro"
          </ThemedText>
        </View>
      </SettingsSection>

      <SettingsSection title="Storico partite">
        {MOCK_HISTORY.map((match, i) => (
          <View
            key={i}
            style={[
              styles.matchRow,
              i < MOCK_HISTORY.length - 1 && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: palette.border },
            ]}
          >
            <View style={{ flex: 1 }}>
              <ThemedText variant="body">vs {match.opponent}</ThemedText>
              <ThemedText variant="caption" color="secondary">
                {match.score} · {match.date}
              </ThemedText>
            </View>
            <ThemedText variant="body" color={match.result === 'Vittoria' ? 'success' : 'danger'} bold>
              {match.result}
            </ThemedText>
          </View>
        ))}
      </SettingsSection>
    </Screen>
  );
}

function StatCard({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  const { palette } = useAppTheme();
  return (
    <View style={[styles.statCard, { backgroundColor: palette.surface, borderColor: palette.border }]}>
      <ThemedText variant="title" color={accent ? 'accent' : 'primary'}>
        {value}
      </ThemedText>
      <ThemedText variant="caption" color="secondary">
        {label}
      </ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  statRow: { flexDirection: 'row', gap: 10, marginBottom: 24 },
  statCard: {
    flex: 1,
    alignItems: 'center',
    padding: 14,
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    gap: 4,
  },
  progressTrack: { height: 8, borderRadius: 4, marginTop: 10, overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: 4 },
  matchRow: { flexDirection: 'row', alignItems: 'center', padding: 14 },
});
