import { createContext, useContext, type ReactNode } from 'react';
import { darkColors, lightColors, type ThemeColors } from './tokens';

/**
 * Which palette the shared components draw with. The app is on paper
 * ('light'); instrument screens (native simulators, race, replay, offline
 * anatomy, web simulators) wrap their content in <DarkSurface> so Text,
 * Button, Card, ListRow and Screen switch to the dark-ocean palette with
 * them. Screen-local styles on those screens import `darkColors` directly.
 */
export type Surface = 'light' | 'dark';

const SurfaceContext = createContext<Surface>('light');

export function DarkSurface({ children }: { children: ReactNode }) {
  return <SurfaceContext.Provider value="dark">{children}</SurfaceContext.Provider>;
}

export function useSurface(): Surface {
  return useContext(SurfaceContext);
}

export function useSurfaceColors(): ThemeColors {
  return useSurface() === 'dark' ? darkColors : lightColors;
}

/** Build a style set per palette once, pick one per render. */
export function bySurface<T>(make: (c: ThemeColors, surface: Surface) => T): Record<Surface, T> {
  return { light: make(lightColors, 'light'), dark: make(darkColors, 'dark') };
}

/**
 * Stack options for an instrument screen: dark header and content, light
 * status bar icons. Spread first so the screen's own title still applies.
 */
export const darkStackOptions = {
  headerStyle: { backgroundColor: darkColors.bgPrimary },
  headerTintColor: darkColors.accentCyan,
  headerTitleStyle: { color: darkColors.textPrimary, fontWeight: '700' as const },
  contentStyle: { backgroundColor: darkColors.bgPrimary },
  statusBarStyle: 'light' as const,
};
