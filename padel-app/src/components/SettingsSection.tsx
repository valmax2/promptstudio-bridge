import React from 'react';
import { StyleSheet, View } from 'react-native';
import { useAppTheme } from '../theme/ThemeContext';
import { ThemedText } from './ThemedText';

export function SettingsSection({ title, children }: { title: string; children: React.ReactNode }) {
  const { palette } = useAppTheme();
  return (
    <View style={styles.wrapper}>
      <ThemedText variant="caption" color="secondary" style={styles.title}>
        {title.toUpperCase()}
      </ThemedText>
      <View style={[styles.card, { backgroundColor: palette.surface, borderColor: palette.border }]}>
        {children}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { marginBottom: 24 },
  title: { marginBottom: 8, letterSpacing: 0.5 },
  card: { borderRadius: 14, borderWidth: StyleSheet.hairlineWidth, overflow: 'hidden' },
});
