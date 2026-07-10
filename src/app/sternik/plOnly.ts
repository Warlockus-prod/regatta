'use client';

import { useCallback } from 'react';
import { useI18n } from '@/lib/i18n';

// ============================================================================
// Language-policy helpers for the sternik section: the Polish (and any
// non-Russian) site version must not show Russian commentary. Russian is an
// opt-in aid on the RU site only. See docs/design/sternik-radio.md.
// ============================================================================

export const CYRILLIC_RE = /[а-яА-ЯёЁ]/;

/**
 * Strips the Russian half of a "PL / RU" bilingual string on non-RU site
 * versions. Returns the string unchanged on the RU site or when the string
 * is not of that shape.
 */
export function usePlOnly() {
  const { lang } = useI18n();
  return useCallback(
    (s: string) => {
      if (lang === 'ru') return s;
      const parts = s.split(' / ');
      if (parts.length === 2 && CYRILLIC_RE.test(parts[1]) && !CYRILLIC_RE.test(parts[0])) return parts[0];
      return s;
    },
    [lang],
  );
}

/**
 * Like usePlOnly, but for optional helper strings (Tile subtitles etc.):
 * a string that is still Russian after stripping is dropped entirely.
 */
export function usePlOnlyOrHide() {
  const { lang } = useI18n();
  return useCallback(
    (s: string | undefined): string | undefined => {
      if (!s || lang === 'ru') return s;
      const parts = s.split(' / ');
      if (parts.length === 2 && CYRILLIC_RE.test(parts[1]) && !CYRILLIC_RE.test(parts[0])) return parts[0];
      return CYRILLIC_RE.test(s) ? undefined : s;
    },
    [lang],
  );
}
