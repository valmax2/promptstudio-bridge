import React from 'react';
import { StyleSheet, Switch, View } from 'react-native';
import { useAppTheme } from '../theme/ThemeContext';
import { ThemedText } from './ThemedText';

export function SettingsRow({
  label,
  subtitle,
  right,
  divider = true,
}: {
  label: string;
  subtitle?: string;
  right?: React.ReactNode;
  divider?: boolean;
}) {
  const { palette } = useAppTheme();
  return (
    <View style={[styles.row, divider && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: palette.border }]}>
      <View style={{ flex: 1 }}>
        <ThemedText variant="body">{label}</ThemedText>
        {subtitle ? (
          <ThemedText variant="caption" color="secondary" style={{ marginTop: 2 }}>
            {subtitle}
          </ThemedText>
        ) : null}
      </View>
      {right}
    </View>
  );
}

export function SettingsSwitchRow({
  label,
  subtitle,
  value,
  onValueChange,
  divider = true,
}: {
  label: string;
  subtitle?: string;
  value: boolean;
  onValueChange: (v: boolean) => void;
  divider?: boolean;
}) {
  const { palette } = useAppTheme();
  return (
    <SettingsRow
      label={label}
      subtitle={subtitle}
      divider={divider}
      right={
        <Switch
          value={value}
          onValueChange={onValueChange}
          trackColor={{ true: palette.accent, false: palette.border }}
        />
      }
    />
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    gap: 12,
  },
});
