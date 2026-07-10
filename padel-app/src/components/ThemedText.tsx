import React from 'react';
import { Text, TextProps } from 'react-native';
import { useAppTheme } from '../theme/ThemeContext';

type Variant = 'title' | 'subtitle' | 'body' | 'caption' | 'score';

const BASE_SIZE: Record<Variant, number> = {
  title: 28,
  subtitle: 18,
  body: 15,
  caption: 13,
  score: 56,
};

interface ThemedTextProps extends TextProps {
  variant?: Variant;
  color?: 'primary' | 'secondary' | 'accent' | 'success' | 'danger' | 'warning';
  bold?: boolean;
}

export function ThemedText({
  variant = 'body',
  color = 'primary',
  bold,
  style,
  ...props
}: ThemedTextProps) {
  const { palette, fontScale, fontFamily } = useAppTheme();

  const colorMap = {
    primary: palette.textPrimary,
    secondary: palette.textSecondary,
    accent: palette.accent,
    success: palette.success,
    danger: palette.danger,
    warning: palette.warning,
  };

  return (
    <Text
      {...props}
      style={[
        {
          color: colorMap[color],
          fontSize: BASE_SIZE[variant] * fontScale,
          fontWeight: bold || variant === 'title' || variant === 'score' ? '700' : '400',
          fontFamily: (bold ? fontFamily.bold : fontFamily.normal) ?? undefined,
        },
        style,
      ]}
    />
  );
}
