export type ThemeMode = 'dark' | 'light' | 'light-contrast';
export type FontScaleKey = 'small' | 'medium' | 'large' | 'xlarge';
export type FontFamilyKey = 'system' | 'rounded' | 'mono';

export interface Palette {
  mode: ThemeMode;
  background: string;
  surface: string;
  surfaceAlt: string;
  border: string;
  textPrimary: string;
  textSecondary: string;
  accent: string;
  accentText: string;
  success: string;
  danger: string;
  warning: string;
}

// Padel-court green as the accent across every theme so it always reads as "the padel app".
const ACCENT = '#7ED957';
const ACCENT_TEXT_ON_DARK = '#0B1A08';

export const darkPalette: Palette = {
  mode: 'dark',
  background: '#0A0B0D',
  surface: '#16181C',
  surfaceAlt: '#1F2227',
  border: '#2A2D33',
  textPrimary: '#F5F6F7',
  textSecondary: '#9AA0A8',
  accent: ACCENT,
  accentText: ACCENT_TEXT_ON_DARK,
  success: '#4ADE80',
  danger: '#F87171',
  warning: '#FBBF24',
};

export const lightPalette: Palette = {
  mode: 'light',
  background: '#F7F8FA',
  surface: '#FFFFFF',
  surfaceAlt: '#EEF0F3',
  border: '#DDE1E6',
  textPrimary: '#14161A',
  textSecondary: '#565B63',
  accent: '#2E8B33',
  accentText: '#FFFFFF',
  success: '#1E8E3E',
  danger: '#D93025',
  warning: '#B36B00',
};

// High-contrast light: pure black-on-white with a darker, saturated accent for
// outdoor / bright-sunlight readability on court.
export const lightContrastPalette: Palette = {
  mode: 'light-contrast',
  background: '#FFFFFF',
  surface: '#FFFFFF',
  surfaceAlt: '#F0F0F0',
  border: '#000000',
  textPrimary: '#000000',
  textSecondary: '#1A1A1A',
  accent: '#0F6B1B',
  accentText: '#FFFFFF',
  success: '#0F6B1B',
  danger: '#B00020',
  warning: '#8A5300',
};

export const palettes: Record<ThemeMode, Palette> = {
  dark: darkPalette,
  light: lightPalette,
  'light-contrast': lightContrastPalette,
};

export const fontScales: Record<FontScaleKey, number> = {
  small: 0.9,
  medium: 1,
  large: 1.15,
  xlarge: 1.3,
};

export const fontFamilies: Record<FontFamilyKey, { normal?: string; bold?: string; label: string }> = {
  system: { label: 'Sistema' },
  rounded: { label: 'Arrotondato' },
  mono: { label: 'Monospace', normal: 'monospace', bold: 'monospace' },
};
