import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useAppTheme } from '../theme/ThemeContext';
import { ThemedText } from './ThemedText';

interface Option<T extends string> {
  value: T;
  label: string;
}

interface ChipRowProps<T extends string> {
  options: Option<T>[];
  value: T | undefined;
  onChange: (value: T) => void;
}

export function ChipRow<T extends string>({ options, value, onChange }: ChipRowProps<T>) {
  const { palette } = useAppTheme();
  return (
    <View style={styles.row}>
      {options.map((opt) => {
        const selected = opt.value === value;
        return (
          <Pressable
            key={opt.value}
            onPress={() => onChange(opt.value)}
            style={[
              styles.chip,
              {
                backgroundColor: selected ? palette.accent : palette.surfaceAlt,
                borderColor: palette.border,
              },
            ]}
          >
            <ThemedText variant="caption" style={{ color: selected ? palette.accentText : palette.textPrimary }}>
              {opt.label}
            </ThemedText>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, padding: 14 },
  chip: { paddingVertical: 8, paddingHorizontal: 14, borderRadius: 999, borderWidth: StyleSheet.hairlineWidth },
});
