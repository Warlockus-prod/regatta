'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { applyTheme, EMBED_THEME_EVENT, readMode } from '@/lib/theme';

// Keep one preference through content, trainers and races. A native host
// supplies a resolved override before load and can update it with an event
// without remounting the scene or losing the current lesson/race state.
export default function ThemeManager() {
  const pathname = usePathname();

  useEffect(() => {
    const mq = typeof window.matchMedia === 'function'
      ? window.matchMedia('(prefers-color-scheme: dark)') : undefined;
    const onChange = () => applyTheme(readMode());
    onChange();
    mq?.addEventListener('change', onChange);
    window.addEventListener('storage', onChange);
    window.addEventListener(EMBED_THEME_EVENT, onChange);
    return () => {
      mq?.removeEventListener('change', onChange);
      window.removeEventListener('storage', onChange);
      window.removeEventListener(EMBED_THEME_EVENT, onChange);
    };
  }, [pathname]);

  return null;
}
