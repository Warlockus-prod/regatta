/**
 * Theme provider + hooks for Regatta mobile.
 *
 * Adds an Auto / Light / Dark theme mirroring the web:
 *  - `auto` follows the OS (`useColorScheme`), live-updating.
 *  - the choice persists in AsyncStorage under `regatta_theme` (same key as web).
 *  - `useColors()` / `useThemedStyles()` give consumers the active palette;
 *    `useShadows()` / `useGlow()` / `useOceanGradient()` give scheme-tuned
 *    elevation and background.
 *
 * Consumer pattern (see LIGHT_THEME_AND_RELEASE_SPEC.md):
 *   const makeStyles = (c: ThemeColors) => StyleSheet.create({ card: { backgroundColor: c.bgCard } });
 *   function Card() { const styles = useThemedStyles(makeStyles); return <View style={styles.card} />; }
 */
import { useColorScheme } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { StyleSheet } from 'react-native';
import {
  darkColors,
  lightColors,
  glow,
  glowLight,
  shadow,
  shadowLight,
  oceanGradient,
  oceanGradientLight,
  type ThemeColors,
  type GlowSet,
  type ShadowSet,
} from './tokens';

export type ThemeMode = 'auto' | 'light' | 'dark';
export type Scheme = 'light' | 'dark';

/** AsyncStorage key. Same key the web client uses (`THEME_KEY` in src/lib/theme.ts). */
export const THEME_KEY = 'regatta_theme';

interface ThemeContextValue {
  /** The user's choice: auto follows the OS. */
  mode: ThemeMode;
  /** The resolved scheme actually in effect (auto -> current OS scheme). */
  scheme: Scheme;
  colors: ThemeColors;
  shadows: ShadowSet;
  glows: GlowSet;
  oceanGradient: readonly string[];
  setMode: (m: ThemeMode) => void;
}

const ThemeCtx = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const system = useColorScheme(); // live OS scheme ('light' | 'dark' | null)
  const [mode, setModeState] = useState<ThemeMode>('auto');

  // Hydrate the persisted choice once. Until it resolves we render `auto`,
  // which follows the OS - the correct default and no wrong-theme flash for
  // users who never picked one.
  useEffect(() => {
    let alive = true;
    AsyncStorage.getItem(THEME_KEY)
      .then((v) => {
        if (!alive) return;
        if (v === 'light' || v === 'dark' || v === 'auto') setModeState(v);
      })
      .catch(() => {
        /* ignore; keep the auto default */
      });
    return () => {
      alive = false;
    };
  }, []);

  const setMode = (m: ThemeMode) => {
    setModeState(m);
    AsyncStorage.setItem(THEME_KEY, m).catch(() => {
      /* best-effort; the in-memory choice is the source of truth this session */
    });
  };

  const scheme: Scheme = mode === 'auto' ? (system === 'light' ? 'light' : 'dark') : mode;

  const value = useMemo<ThemeContextValue>(() => {
    const light = scheme === 'light';
    return {
      mode,
      scheme,
      colors: light ? lightColors : darkColors,
      shadows: light ? shadowLight : shadow,
      glows: light ? glowLight : glow,
      oceanGradient: light ? oceanGradientLight : oceanGradient,
      setMode,
    };
  }, [mode, scheme]);

  return <ThemeCtx.Provider value={value}>{children}</ThemeCtx.Provider>;
}

export function useTheme(): ThemeContextValue {
  const c = useContext(ThemeCtx);
  if (!c) throw new Error('useTheme must be used inside <ThemeProvider>');
  return c;
}

/** Active color palette for the current scheme. */
export function useColors(): ThemeColors {
  return useTheme().colors;
}

/** Scheme-tuned drop shadows (lighter in light mode). */
export function useShadows(): ShadowSet {
  return useTheme().shadows;
}

/** Scheme-tuned glow set (zeroed in light mode). */
export function useGlow(): GlowSet {
  return useTheme().glows;
}

/** Scheme-appropriate ocean gradient stops for the Screen background. */
export function useOceanGradient(): readonly string[] {
  return useTheme().oceanGradient;
}

/**
 * Build a themed StyleSheet, rebuilt only when the active palette changes.
 * The factory receives the active colors; keep `spacing` / `radii` imported
 * statically (they are theme-independent).
 */
export function useThemedStyles<T extends StyleSheet.NamedStyles<T>>(
  factory: (c: ThemeColors) => T,
): T {
  const colors = useColors();
  return useMemo(() => StyleSheet.create(factory(colors)), [colors, factory]);
}
