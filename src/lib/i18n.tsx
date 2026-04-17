'use client';

import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from 'react';

export type Lang = 'ru' | 'en' | 'pl';

const STORAGE_KEY = 'regatta.lang.v1';

interface I18nContextValue {
  lang: Lang;
  setLang: (l: Lang) => void;
  /** 2-arg form (ru, en) - legacy; pl falls back to en. */
  t: (ru: string, en: string) => string;
  /** 3-arg form (ru, en, pl). */
  tp: (ru: string, en: string, pl: string) => string;
}

const Ctx = createContext<I18nContextValue | null>(null);

function pickFromBrowser(): Lang {
  if (typeof navigator === 'undefined') return 'ru';
  const nav = navigator.language.toLowerCase();
  if (nav.startsWith('ru')) return 'ru';
  if (nav.startsWith('pl')) return 'pl';
  return 'en';
}

export function I18nProvider({ children }: { children: ReactNode }) {
  // Default to RU to avoid hydration mismatch; updated from localStorage after mount
  const [lang, setLangState] = useState<Lang>('ru');

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored === 'en' || stored === 'ru' || stored === 'pl') {
        setLangState(stored);
      } else {
        setLangState(pickFromBrowser());
      }
    } catch {
      // ignore - stick with ru default
    }
  }, []);

  const setLang = useCallback((l: Lang) => {
    setLangState(l);
    try { localStorage.setItem(STORAGE_KEY, l); } catch { /* ignore */ }
    if (typeof document !== 'undefined') document.documentElement.lang = l;
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

  return <Ctx.Provider value={{ lang, setLang, t, tp }}>{children}</Ctx.Provider>;
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
