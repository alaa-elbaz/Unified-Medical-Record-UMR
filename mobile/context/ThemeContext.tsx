import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useColorScheme as useNwColorScheme } from 'nativewind';

export type ThemePreference = 'light' | 'dark' | 'system';

interface ThemeContextType {
  themePreference: ThemePreference;
  setThemePreference: (pref: ThemePreference) => void;
  isDark: boolean;
}

const ThemeCtx = createContext<ThemeContextType>({
  themePreference: 'system',
  setThemePreference: () => {},
  isDark: false,
});

const STORAGE_KEY = '@medcore:theme';

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const { colorScheme, setColorScheme } = useNwColorScheme();
  const [themePreference, setPreferenceState] = useState<ThemePreference>('system');

  // Hydrate from AsyncStorage on first render and apply to NativeWind.
  useEffect(() => {
    (async () => {
      try {
        const saved = await AsyncStorage.getItem(STORAGE_KEY);
        if (saved === 'light' || saved === 'dark' || saved === 'system') {
          setPreferenceState(saved);
          setColorScheme(saved);
        } else {
          setColorScheme('system');
        }
      } catch {
        setColorScheme('system');
      }
    })();
  }, [setColorScheme]);

  const setThemePreference = useCallback(
    (pref: ThemePreference) => {
      setPreferenceState(pref);
      setColorScheme(pref);
      AsyncStorage.setItem(STORAGE_KEY, pref).catch(() => {});
    },
    [setColorScheme]
  );

  const isDark = colorScheme === 'dark';

  return (
    <ThemeCtx.Provider value={{ themePreference, setThemePreference, isDark }}>
      {children}
    </ThemeCtx.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeCtx);
}
