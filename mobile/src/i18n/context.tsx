import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  DEFAULT_LANG,
  isLang,
  pickLocalized,
  type Lang,
  type LocalizedText,
} from './languages';
import { detectDeviceLang } from './device-locale';

const STORAGE_KEY = 'regatta.lang.v1';

/**
 * Optional 4th-arg overlay for `tp()` carrying ES/FR/DE/IT translations.
 * Each key is independently optional; missing values fall through to the
 * EN argument. Mirrors web behavior so call sites can be copy-pasted.
 */
export type TpExtras = {
  es?: string;
  fr?: string;
  de?: string;
  it?: string;
};

export interface I18nContextValue {
  lang: Lang;
  setLang: (l: Lang) => void;
  /** True after the first hydration pass (storage + device locale resolved). */
  ready: boolean;
  /** 2-arg form (ru, en); legacy. PL falls back to en. */
  t: (ru: string, en: string) => string;
  /**
   * Translation picker. Backward compatible with the original 3-arg form.
   * Pass `extras` to cover ES/FR/DE/IT natively; otherwise those langs
   * fall back to EN.
   */
  tp: (ru: string, en: string, pl: string, extras?: TpExtras) => string;
  /**
   * Object-based translation. Missing keys fall back to en, then ru.
   *
   *   tl({ ru: 'Привет', en: 'Hi', pl: 'Czesc' })
   *   tl({ ru: 'Привет', en: 'Hi', pl: 'Czesc', es: 'Hola', it: 'Ciao' })
   */
  tl: (values: LocalizedText) => string;
}

const Ctx = createContext<I18nContextValue | null>(null);

export function I18nProvider({ children }: { children: ReactNode }) {
  // Start with DEFAULT_LANG ('ru') and rehydrate asynchronously from storage
  // and device locale. `ready` flips to true after the first pass so
  // screens that care can avoid a lang-flicker on first paint.
  const [lang, setLangState] = useState<Lang>(DEFAULT_LANG);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        // Priority order:
        //   1. AsyncStorage - user's explicit picker on this device.
        //   2. Device locale via expo-localization.
        //   3. DEFAULT_LANG ('ru').
        const stored = await AsyncStorage.getItem(STORAGE_KEY);
        if (cancelled) return;
        if (isLang(stored)) {
          setLangState(stored);
        } else {
          setLangState(detectDeviceLang());
        }
      } catch {
        // ignore - keep DEFAULT_LANG
      } finally {
        if (!cancelled) setReady(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const setLang = useCallback((l: Lang) => {
    setLangState(l);
    AsyncStorage.setItem(STORAGE_KEY, l).catch(() => {
      /* ignore - keep in-memory choice */
    });
  }, []);

  const t = useCallback(
    (ru: string, en: string) => (lang === 'ru' ? ru : en),
    [lang],
  );

  const tp = useCallback(
    (ru: string, en: string, pl: string, extras?: TpExtras) => {
      switch (lang) {
        case 'ru': return ru;
        case 'pl': return pl;
        case 'es': return extras?.es ?? en;
        case 'fr': return extras?.fr ?? en;
        case 'de': return extras?.de ?? en;
        case 'it': return extras?.it ?? en;
        default:   return en;
      }
    },
    [lang],
  );

  const tl = useCallback(
    (values: LocalizedText) => pickLocalized(lang, values),
    [lang],
  );

  return (
    <Ctx.Provider value={{ lang, setLang, ready, t, tp, tl }}>
      {children}
    </Ctx.Provider>
  );
}

export function useI18n(): I18nContextValue {
  const v = useContext(Ctx);
  if (!v) {
    throw new Error('useI18n must be used inside <I18nProvider>');
  }
  return v;
}
