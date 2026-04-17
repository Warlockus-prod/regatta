'use client';

import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from 'react';

export type Lang = 'ru' | 'en';

const STORAGE_KEY = 'regatta.lang.v1';

interface I18nContextValue {
  lang: Lang;
  setLang: (l: Lang) => void;
  t: (ru: string, en: string) => string;
}

const Ctx = createContext<I18nContextValue | null>(null);

export function I18nProvider({ children }: { children: ReactNode }) {
  // Default to RU to avoid hydration mismatch; updated from localStorage after mount
  const [lang, setLangState] = useState<Lang>('ru');

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored === 'en' || stored === 'ru') {
        setLangState(stored);
      } else {
        // First visit: infer from browser
        const nav = navigator.language.toLowerCase();
        setLangState(nav.startsWith('ru') ? 'ru' : 'en');
      }
    } catch {
      // ignore — stick with ru default
    }
  }, []);

  const setLang = useCallback((l: Lang) => {
    setLangState(l);
    try { localStorage.setItem(STORAGE_KEY, l); } catch { /* ignore */ }
    // Update <html lang> for accessibility
    if (typeof document !== 'undefined') document.documentElement.lang = l;
  }, []);

  const t = useCallback((ru: string, en: string) => (lang === 'ru' ? ru : en), [lang]);

  return <Ctx.Provider value={{ lang, setLang, t }}>{children}</Ctx.Provider>;
}

export function useI18n(): I18nContextValue {
  const v = useContext(Ctx);
  if (!v) {
    // SSR fallback: return ru-mode noop so server render doesn't crash
    return {
      lang: 'ru',
      setLang: () => { /* noop on server */ },
      t: (ru: string) => ru,
    };
  }
  return v;
}

/** Inline helper component: <T ru="..." en="..." />. Prefer `t()` hook when possible. */
export function T({ ru, en }: { ru: string; en: string }) {
  const { t } = useI18n();
  return <>{t(ru, en)}</>;
}
