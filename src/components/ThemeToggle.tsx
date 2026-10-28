'use client';

import { useEffect, useState } from 'react';
import { useI18n } from '@/lib/i18n';
import { applyTheme, readMode, THEME_KEY, type ThemeMode } from '@/lib/theme';

// ============================================================================
// Theme toggle: cycles Auto -> Light -> Dark -> Auto.
//
// - 'auto' follows the OS via prefers-color-scheme.
// - The chosen mode is stored in localStorage; a no-flash inline script in
//   app/layout.tsx applies it before first paint. ThemeManager re-applies on
//   route changes. Trainers and races inherit the same preference.
// - Resolution logic and the native host override live in src/lib/theme.ts.
// ============================================================================

export default function ThemeToggle() {
  const { tp } = useI18n();
  const [mode, setMode] = useState<ThemeMode>('auto');

  useEffect(() => {
    // The stored mode is in localStorage: read after mount so the server HTML
    // ('auto') and the first client render agree.
    // eslint-disable-next-line react-hooks/set-state-in-effect -- post-mount localStorage hydration
    setMode(readMode());
  }, []);

  const cycle = () => {
    const next: ThemeMode = mode === 'auto' ? 'light' : mode === 'light' ? 'dark' : 'auto';
    try {
      localStorage.setItem(THEME_KEY, next);
    } catch {
      /* ignore */
    }
    applyTheme(next);
    setMode(next);
  };

  const label = mode === 'auto'
      ? tp('Тема: авто', 'Theme: auto', 'Motyw: auto',
          { es: 'Tema: auto', fr: 'Thème : auto', de: 'Design: automatisch', it: 'Tema: auto' })
      : mode === 'light'
      ? tp('Тема: светлая', 'Theme: light', 'Motyw: jasny',
          { es: 'Tema: claro', fr: 'Thème : clair', de: 'Design: hell', it: 'Tema: chiaro' })
      : tp('Тема: тёмная', 'Theme: dark', 'Motyw: ciemny',
          { es: 'Tema: oscuro', fr: 'Thème : sombre', de: 'Design: dunkel', it: 'Tema: scuro' });

  return (
    <button
      type="button"
      onClick={cycle}
      title={label}
      aria-label={label}
      className="flex w-11 h-11 items-center justify-center rounded-lg text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[rgba(127,127,127,0.14)] transition"
    >
      <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        {mode === 'light' ? (
          <>
            <circle cx="12" cy="12" r="4" />
            <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
          </>
        ) : mode === 'dark' ? (
          <path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z" />
        ) : (
          <>
            <rect x="2" y="3" width="20" height="14" rx="2" />
            <path d="M8 21h8M12 17v4" />
          </>
        )}
      </svg>
    </button>
  );
}
