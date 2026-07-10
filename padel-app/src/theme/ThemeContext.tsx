import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { useColorScheme } from 'react-native';
import {
  FontFamilyKey,
  FontScaleKey,
  Palette,
  ThemeMode,
  fontFamilies,
  fontScales,
  palettes,
} from './palettes';
import { loadJSON, saveJSON } from '../storage/storage';

interface ThemeSettings {
  mode: ThemeMode | 'system';
  fontScale: FontScaleKey;
  fontFamily: FontFamilyKey;
}

const DEFAULT_SETTINGS: ThemeSettings = {
  mode: 'dark',
  fontScale: 'medium',
  fontFamily: 'system',
};

interface ThemeContextValue {
  settings: ThemeSettings;
  palette: Palette;
  fontScale: number;
  fontFamily: { normal?: string; bold?: string; label: string };
  setMode: (mode: ThemeSettings['mode']) => void;
  setFontScale: (scale: FontScaleKey) => void;
  setFontFamily: (family: FontFamilyKey) => void;
  isLoaded: boolean;
}

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

const SETTINGS_KEY = 'theme-settings';

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const systemScheme = useColorScheme();
  const [settings, setSettings] = useState<ThemeSettings>(DEFAULT_SETTINGS);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    loadJSON(SETTINGS_KEY, DEFAULT_SETTINGS).then((stored) => {
      setSettings(stored);
      setIsLoaded(true);
    });
  }, []);

  useEffect(() => {
    if (isLoaded) saveJSON(SETTINGS_KEY, settings);
  }, [settings, isLoaded]);

  const resolvedMode: ThemeMode =
    settings.mode === 'system' ? (systemScheme === 'light' ? 'light' : 'dark') : settings.mode;

  const value = useMemo<ThemeContextValue>(
    () => ({
      settings,
      palette: palettes[resolvedMode],
      fontScale: fontScales[settings.fontScale],
      fontFamily: fontFamilies[settings.fontFamily],
      setMode: (mode) => setSettings((s) => ({ ...s, mode })),
      setFontScale: (fontScale) => setSettings((s) => ({ ...s, fontScale })),
      setFontFamily: (fontFamily) => setSettings((s) => ({ ...s, fontFamily })),
      isLoaded,
    }),
    [settings, resolvedMode, isLoaded]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useAppTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useAppTheme must be used within a ThemeProvider');
  return ctx;
}
