'use client';

import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from 'react';
import {
  DEFAULT_LANG,
  isLang,
  pickLangFromNavigator,
  pickLocalized,
  type Lang,
  type LocalizedText,
} from './languages';

export type { Lang } from './languages';

const STORAGE_KEY = 'regatta.lang.v1';
const COOKIE_NAME = 'regatta_lang';

interface I18nContextValue {
  lang: Lang;
  setLang: (l: Lang) => void;
  /** 2-arg form (ru, en) - legacy; pl falls back to en. */
  t: (ru: string, en: string) => string;
  /**
   * 3-arg form (ru, en, pl). Legacy shape - works for a RU/EN/PL-only app.
   * Hardcoded signature means adding IT/ES/FR/DE requires touching every
   * call site. Prefer `tl(obj)` for new code.
   */
  tp: (ru: string, en: string, pl: string) => string;
  /**
   * Object-based translation. Extensible: add any Lang key and it will be
   * picked up automatically. Missing keys fall back to en, then ru, then
   * the first value provided.
   *
   *   {tl({ ru: 'Привет', en: 'Hi', pl: 'Czesc' })}
   *   // later:
   *   {tl({ ru: 'Привет', en: 'Hi', pl: 'Czesc', es: 'Hola', it: 'Ciao' })}
   *
   * RU + EN are required by the `LocalizedText` type; other langs optional.
   */
  tl: (values: LocalizedText) => string;
}

const Ctx = createContext<I18nContextValue | null>(null);

export function I18nProvider({ children, initialLang }: { children: ReactNode; initialLang?: Lang }) {
  // Hydrate with SSR-provided language (from cookie / accept-language).
  // Falls back to 'ru' for SSR without middleware (dev preview of RSC, etc).
  const [lang, setLangState] = useState<Lang>(initialLang ?? DEFAULT_LANG);

  useEffect(() => {
    // Priority order (highest first):
    //  1. ?lang=pl|en|ru in the current URL - forced via a shared link.
    //     Overrides localStorage so the recipient of a /pl link sees PL
    //     even if they previously picked RU on their own device.
    //  2. localStorage - user's explicit picker choice on this device.
    //  3. initialLang from SSR - cookie set by proxy / Accept-Language.
    //  4. navigator.language - absolute fallback.
    try {
      if (typeof window !== 'undefined') {
        const params = new URLSearchParams(window.location.search);
        const urlLang = params.get('lang');
        if (isLang(urlLang)) {
          // Adopt and persist - mirror to both localStorage and cookie so
          // the choice survives navigation and future visits.
          if (urlLang !== lang) setLangState(urlLang);
          try { localStorage.setItem(STORAGE_KEY, urlLang); } catch { /* ignore */ }
          try {
            document.cookie = `${COOKIE_NAME}=${urlLang}; path=/; max-age=${60 * 60 * 24 * 365}; samesite=lax`;
          } catch { /* ignore */ }
          // Strip ?lang= from the visible URL for cleanliness. No navigation.
          try {
            const clean = new URL(window.location.href);
            clean.searchParams.delete('lang');
            const newSearch = clean.searchParams.toString();
            window.history.replaceState(
              null,
              '',
              clean.pathname + (newSearch ? '?' + newSearch : '') + clean.hash,
            );
          } catch { /* ignore */ }
          return;
        }
      }
      const stored = localStorage.getItem(STORAGE_KEY);
      if (isLang(stored)) {
        if (stored !== lang) setLangState(stored);
      } else if (!initialLang) {
        // No cookie OR middleware, no localStorage - use navigator.
        setLangState(pickLangFromNavigator());
      }
    } catch {
      // ignore - stick with current lang
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Keep <html lang="..."> in sync with the current lang. Previously the
  // root layout hardcoded lang="ru" and only setLang() updated it at runtime,
  // which meant auto-picked EN/PL users had the wrong attribute for screen
  // readers and search engine tooling.
  useEffect(() => {
    if (typeof document !== 'undefined') {
      document.documentElement.lang = lang;
    }
  }, [lang]);

  const setLang = useCallback((l: Lang) => {
    setLangState(l);
    try { localStorage.setItem(STORAGE_KEY, l); } catch { /* ignore */ }
    // Mirror to cookie so the next SSR request picks up the user's choice
    // and we skip the first-paint flash across page navigations.
    if (typeof document !== 'undefined') {
      try {
        document.cookie = `${COOKIE_NAME}=${l}; path=/; max-age=${60 * 60 * 24 * 365}; samesite=lax`;
      } catch { /* ignore */ }
      document.documentElement.lang = l;
    }
    // Broadcast so any non-context listeners (rare) can react
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('regatta:lang-changed', { detail: l }));
    }
  }, []);

  const t = useCallback(
    (ru: string, en: string) => (lang === 'ru' ? ru : en),
    [lang],
  );

  const tp = useCallback(
    (ru: string, en: string, pl: string) => (lang === 'ru' ? ru : lang === 'pl' ? pl : en),
    [lang],
  );

  const tl = useCallback(
    (values: LocalizedText) => pickLocalized(lang, values),
    [lang],
  );

  return <Ctx.Provider value={{ lang, setLang, t, tp, tl }}>{children}</Ctx.Provider>;
}

export function useI18n(): I18nContextValue {
  const v = useContext(Ctx);
  if (!v) {
    // SSR fallback: return ru-mode noop so server render doesn't crash
    return {
      lang: 'ru',
      setLang: () => { /* noop on server */ },
      t: (ru: string) => ru,
      tp: (ru: string) => ru,
      tl: (values: LocalizedText) => values.ru,
    };
  }
  return v;
}

/** Inline helper component: <T ru="..." en="..." pl="..." />. Prefer `t()` hook when possible. */
export function T({ ru, en, pl }: { ru: string; en: string; pl?: string }) {
  const { lang } = useI18n();
  if (lang === 'ru') return <>{ru}</>;
  if (lang === 'pl' && pl) return <>{pl}</>;
  return <>{en}</>;
}
