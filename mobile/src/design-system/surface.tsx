import { createContext, useContext, type ReactNode } from 'react';
import { darkColors, lightColors, type ThemeColors } from './tokens';

/** The current native app uses one day surface for navigation and activity
 * controls. DarkSurface remains an explicit local rendering option, never a
 * route-based override of the app shell. Scene materials are independent. */
export type Surface = 'light' | 'dark';

export const appSurface: Surface = 'light';
const SurfaceContext = createContext<Surface>(appSurface);

/** Reset activity chrome to the current app surface, including under a scene. */
export function AppSurface({ children }: { children: ReactNode }) {
  return <SurfaceContext.Provider value={appSurface}>{children}</SurfaceContext.Provider>;
}

/** Native frames and WebView chrome share this day contract before content loads. */
export const appStackOptions = {
  headerBackButtonDisplayMode: 'minimal' as const,
  headerStyle: { backgroundColor: lightColors.bgPrimary },
  headerTintColor: lightColors.accentCyan,
  contentStyle: { backgroundColor: lightColors.bgPrimary },
  statusBarStyle: 'dark' as const,
};

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
 * status bar icons. RootLayout owns the loaded-font title style and labelled
 * contextual Back. Spread first so the screen's own title still applies.
 */
export const darkStackOptions = {
  headerBackButtonDisplayMode: 'minimal' as const,
  headerStyle: { backgroundColor: darkColors.bgPrimary },
  headerTintColor: darkColors.accentCyan,
  contentStyle: { backgroundColor: darkColors.bgPrimary },
  statusBarStyle: 'light' as const,
};
