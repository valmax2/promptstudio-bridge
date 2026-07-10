import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Screen } from '../components/Screen';
import { ThemedText } from '../components/ThemedText';
import { SettingsSection } from '../components/SettingsSection';
import { Button } from '../components/Button';
import { useAppTheme } from '../theme/ThemeContext';

const MOCK_CIRCLES = [
  { name: 'Padel del Martedì', members: 8 },
  { name: 'Ufficio Torino', members: 12 },
];

const MOCK_EVENT = {
  title: 'Partita al Circolo Roma',
  when: 'Sabato 12 luglio · 18:30',
  confirmed: ['Marco', 'Giulia'],
  needed: 4,
};

export function CommunityScreen() {
  const { palette } = useAppTheme();

  return (
    <Screen scroll>
      <ThemedText variant="title" style={{ marginBottom: 4 }}>
        Community
      </ThemedText>
      <ThemedText variant="caption" color="secondary" style={{ marginBottom: 20 }}>
        Anteprima — profili, cerchie ed eventi non sono ancora collegati a un backend reale.
      </ThemedText>

      <SettingsSection title="Il tuo profilo">
        <View style={styles.profileRow}>
          <View style={[styles.avatar, { backgroundColor: palette.surfaceAlt, borderColor: palette.accent }]}>
            <ThemedText variant="subtitle">🎾</ThemedText>
          </View>
          <View style={{ flex: 1 }}>
            <ThemedText variant="body" bold>
              Registrati con numero di telefono
            </ThemedText>
            <ThemedText variant="caption" color="secondary">
              Avatar personalizzabile · da collegare
            </ThemedText>
          </View>
          <Button label="Accedi" onPress={() => {}} />
        </View>
      </SettingsSection>

      <SettingsSection title="Le tue cerchie">
        {MOCK_CIRCLES.map((circle, i) => (
          <View
            key={circle.name}
            style={[
              styles.rowPadded,
              i < MOCK_CIRCLES.length - 1 && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: palette.border },
            ]}
          >
            <ThemedText variant="body">{circle.name}</ThemedText>
            <ThemedText variant="caption" color="secondary">
              {circle.members} membri
            </ThemedText>
          </View>
        ))}
        <View style={{ padding: 14 }}>
          <Button label="+ Crea nuova cerchia" onPress={() => {}} />
        </View>
      </SettingsSection>

      <SettingsSection title="Prossimo evento">
        <View style={{ padding: 14 }}>
          <ThemedText variant="body" bold>
            {MOCK_EVENT.title}
          </ThemedText>
          <ThemedText variant="caption" color="secondary" style={{ marginTop: 2 }}>
            {MOCK_EVENT.when}
          </ThemedText>
          <ThemedText variant="caption" color="secondary" style={{ marginTop: 8 }}>
            Confermati: {MOCK_EVENT.confirmed.join(', ')} ({MOCK_EVENT.confirmed.length}/{MOCK_EVENT.needed})
          </ThemedText>
          <View style={styles.rsvpRow}>
            <Button label="✓ Confermo" variant="primary" onPress={() => {}} style={{ flex: 1 }} />
            <Button label="✕ Rifiuto" variant="danger" onPress={() => {}} style={{ flex: 1 }} />
          </View>
        </View>
      </SettingsSection>
    </Screen>
  );
}

const styles = StyleSheet.create({
  profileRow: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14 },
  avatar: { width: 48, height: 48, borderRadius: 24, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  rowPadded: { padding: 14 },
  rsvpRow: { flexDirection: 'row', gap: 10, marginTop: 14 },
});
