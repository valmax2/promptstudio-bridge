import React from 'react';
import { Pressable, StyleSheet, ViewStyle } from 'react-native';
import { useAppTheme } from '../theme/ThemeContext';
import { ThemedText } from './ThemedText';

interface ButtonProps {
  label: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'danger';
  disabled?: boolean;
  large?: boolean;
  style?: ViewStyle;
}

export function Button({ label, onPress, variant = 'secondary', disabled, large, style }: ButtonProps) {
  const { palette } = useAppTheme();

  const backgroundColor =
    variant === 'primary' ? palette.accent : variant === 'danger' ? palette.danger : palette.surfaceAlt;
  const textColor = variant === 'secondary' ? palette.textPrimary : palette.accentText;

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        styles.base,
        large && styles.large,
        {
          backgroundColor,
          borderColor: palette.border,
          opacity: disabled ? 0.4 : pressed ? 0.75 : 1,
        },
        style,
      ]}
    >
      <ThemedText variant={large ? 'subtitle' : 'body'} bold style={{ color: textColor }}>
        {label}
      </ThemedText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    paddingVertical: 12,
    paddingHorizontal: 18,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
    justifyContent: 'center',
  },
  large: {
    paddingVertical: 22,
    borderRadius: 18,
  },
});
