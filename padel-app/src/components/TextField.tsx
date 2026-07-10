import React from 'react';
import { StyleSheet, TextInput, TextInputProps, View } from 'react-native';
import { useAppTheme } from '../theme/ThemeContext';
import { ThemedText } from './ThemedText';

interface TextFieldProps extends TextInputProps {
  label?: string;
}

export function TextField({ label, style, ...props }: TextFieldProps) {
  const { palette, fontScale } = useAppTheme();
  return (
    <View style={styles.wrap}>
      {label ? (
        <ThemedText variant="caption" color="secondary" style={{ marginBottom: 4 }}>
          {label}
        </ThemedText>
      ) : null}
      <TextInput
        placeholderTextColor={palette.textSecondary}
        style={[
          styles.input,
          {
            backgroundColor: palette.surfaceAlt,
            borderColor: palette.border,
            color: palette.textPrimary,
            fontSize: 15 * fontScale,
          },
          style,
        ]}
        {...props}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginBottom: 12 },
  input: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
});
