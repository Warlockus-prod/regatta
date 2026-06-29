'use client';

import { useCallback, useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { useI18n } from '@/lib/i18n';
import { applyTheme, readMode, THEME_KEY, type ThemeMode } from '@/lib/theme';

// ============================================================================
// Theme toggle: cycles Auto -> Light -> Dark -> Auto.
//
// - 'auto' follows the OS via prefers-color-scheme.
// - The chosen mode is stored in localStorage; a no-flash inline script in
//   app/layout.tsx applies it (and pins immersive routes to dark) before first
//   paint. ThemeManager re-applies on route changes.
// - Resolution logic + immersive-route handling live in src/lib/theme.ts.
// ============================================================================

export default function ThemeToggle() {
  const { tp } = useI18n();
  const pathname = usePathname();
  const [mode, setMode] = useState<ThemeMode>('auto');

  useEffect(() => {
    setMode(readMode());
  }, []);

  const cycle = useCallback(() => {
    setMode((prev) => {
      const next: ThemeMode = prev === 'auto' ? 'light' : prev === 'light' ? 'dark' : 'auto';
      try {
        localStorage.setItem(THEME_KEY, next);
      } catch {
        /* ignore */
      }
      applyTheme(next, pathname);
      return next;
    });
  }, [pathname]);

  const label =
    mode === 'auto'
      ? tp('Тема: авто', 'Theme: auto', 'Motyw: auto',
          { es: 'Tema: auto', fr: 'Theme: auto', de: 'Thema: auto', it: 'Tema: auto' })
      : mode === 'light'
      ? tp('Тема: светлая', 'Theme: light', 'Motyw: jasny',
          { es: 'Tema: claro', fr: 'Theme: clair', de: 'Thema: hell', it: 'Tema: chiaro' })
      : tp('Тема: тёмная', 'Theme: dark', 'Motyw: ciemny',
          { es: 'Tema: oscuro', fr: 'Theme: sombre', de: 'Thema: dunkel', it: 'Tema: scuro' });

  return (
    <button
      type="button"
      onClick={cycle}
      title={label}
      aria-label={label}
      className="flex w-8 h-8 items-center justify-center rounded-lg text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[rgba(127,127,127,0.14)] transition"
    >
      {mode === 'light' ? (
        // sun
        <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <circle cx="12" cy="12" r="4" />
          <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
        </svg>
      ) : mode === 'dark' ? (
        // moon
        <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z" />
        </svg>
      ) : (
        // auto (monitor)
        <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <rect x="2" y="3" width="20" height="14" rx="2" />
          <path d="M8 21h8M12 17v4" />
        </svg>
      )}
    </button>
  );
}
