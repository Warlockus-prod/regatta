// ============================================================================
// Theme resolution shared by ThemeToggle, ThemeManager and the no-flash
// inline script in app/layout.tsx.
//
// Modes: 'auto' (follow OS) | 'light' | 'dark', stored in localStorage.
// Immersive, canvas-heavy surfaces (game, simulators, multiplayer) are
// art-directed dark and stay dark regardless of the chosen theme - their
// rendering uses hardcoded colors that are not theme-aware, so a light shell
// around a dark canvas would look broken. We pin those routes to dark here,
// in the Shared lane, without touching any simulator/game code.
// ============================================================================

export type ThemeMode = 'auto' | 'light' | 'dark';

export const THEME_KEY = 'regatta_theme';

export const IMMERSIVE_PREFIXES = [
  '/game',
  '/multiplayer',
  '/simulator',
  '/simulator2',
  '/simulator-v3',
];

export function isImmersive(pathname: string): boolean {
  return IMMERSIVE_PREFIXES.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}

export function systemDark(): boolean {
  return typeof window !== 'undefined'
    && window.matchMedia('(prefers-color-scheme: dark)').matches;
}

export function effectiveTheme(mode: ThemeMode, pathname: string): 'dark' | 'light' {
  if (isImmersive(pathname)) return 'dark';
  if (mode === 'dark') return 'dark';
  if (mode === 'light') return 'light';
  return systemDark() ? 'dark' : 'light';
}

export function applyTheme(mode: ThemeMode, pathname: string): void {
  document.documentElement.dataset.theme = effectiveTheme(mode, pathname);
}

export function readMode(): ThemeMode {
  try {
    const v = localStorage.getItem(THEME_KEY);
    if (v === 'light' || v === 'dark' || v === 'auto') return v;
  } catch {
    /* localStorage unavailable - fall through to default */
  }
  return 'auto';
}
