'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { applyTheme, readMode } from '@/lib/theme';

// Re-applies the theme on every route change so immersive routes (game /
// simulators) flip to dark and content routes return to the chosen mode.
// Also re-resolves when the OS theme changes while in 'auto'. Renders nothing.
export default function ThemeManager() {
  const pathname = usePathname();

  useEffect(() => {
    applyTheme(readMode(), pathname);
  }, [pathname]);

  useEffect(() => {
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const onChange = () => applyTheme(readMode(), pathname);
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, [pathname]);

  return null;
}
