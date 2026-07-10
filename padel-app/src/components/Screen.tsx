import React from 'react';
import { ScrollView, StyleSheet, View, ViewStyle } from 'react-native';
import { useAppTheme } from '../theme/ThemeContext';

interface ScreenProps {
  children: React.ReactNode;
  scroll?: boolean;
  style?: ViewStyle;
}

export function Screen({ children, scroll = false, style }: ScreenProps) {
  const { palette } = useAppTheme();
  const containerStyle = [styles.base, { backgroundColor: palette.background }, style];

  if (scroll) {
    return (
      <ScrollView
        style={{ backgroundColor: palette.background }}
        contentContainerStyle={[styles.base, style]}
      >
        {children}
      </ScrollView>
    );
  }
  return <View style={containerStyle}>{children}</View>;
}

const styles = StyleSheet.create({
  base: {
    flex: 1,
    padding: 20,
  },
});
