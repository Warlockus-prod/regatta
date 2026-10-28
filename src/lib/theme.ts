// Theme preference applies to every surface, including trainers and races.
// A native host may provide a resolved theme before the page starts; this
// changes presentation only and never rewrites the browser's saved choice.
export type ThemeMode = 'auto' | 'light' | 'dark';
export type ResolvedTheme = 'light' | 'dark';

export const THEME_KEY = 'regatta_theme';
export const EMBED_THEME_EVENT = 'regatta-theme-change';
export const BROWSER_THEME_COLORS = { light: '#f7f5f0', dark: '#0a1628' } as const;

/** Used for navigation chrome, never to force a theme. */
export function isEmbed(): boolean {
  return typeof window !== 'undefined' && /[?&]embed=1/.test(window.location.search);
}

export function resolveTheme(mode: unknown, darkSystem: boolean, embedded?: unknown): ResolvedTheme {
  if (embedded === 'light' || embedded === 'dark') return embedded;
  if (mode === 'light' || mode === 'dark') return mode;
  return darkSystem ? 'dark' : 'light';
}

export function systemDark(): boolean {
  return typeof window !== 'undefined'
    && typeof window.matchMedia === 'function'
    && window.matchMedia('(prefers-color-scheme: dark)').matches;
}

export function effectiveTheme(mode: ThemeMode): ResolvedTheme {
  const embedded = typeof window === 'undefined' ? undefined
    : (window as Window & { __REGATTA_EMBED_THEME__?: unknown }).__REGATTA_EMBED_THEME__;
  return resolveTheme(mode, systemDark(), embedded);
}

export function applyTheme(mode: ThemeMode): void {
  const theme = effectiveTheme(mode);
  document.documentElement.dataset.theme = theme;
  for (const meta of document.querySelectorAll('meta[name="theme-color"]')) {
    meta.setAttribute('content', BROWSER_THEME_COLORS[theme]);
    meta.removeAttribute('media');
  }
}

export function readMode(): ThemeMode {
  try {
    const v = localStorage.getItem(THEME_KEY);
    if (v === 'light' || v === 'dark' || v === 'auto') return v;
  } catch {
    /* localStorage unavailable - use the system preference. */
  }
  return 'auto';
}

// Runs before first paint. Its parity with the hydrated resolver is tested
// with real script execution, including storage denial and an explicit host
// override. Keep the host signal independent of localStorage availability.
export const THEME_BOOTSTRAP_SCRIPT = `(function(){var n=window.__REGATTA_EMBED_THEME__,t='auto';try{t=localStorage.getItem('regatta_theme')||'auto';}catch(e){}var s=typeof matchMedia==='function'&&matchMedia('(prefers-color-scheme: dark)').matches,c=n==='light'||n==='dark'?n:t==='light'||t==='dark'?t:s?'dark':'light';document.documentElement.dataset.theme=c;document.querySelectorAll('meta[name="theme-color"]').forEach(function(m){m.setAttribute('content',c==='light'?'${BROWSER_THEME_COLORS.light}':'${BROWSER_THEME_COLORS.dark}');m.removeAttribute('media');});})();`;
