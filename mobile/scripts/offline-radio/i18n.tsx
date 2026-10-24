import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

// The offline course's stand-in for src/lib/i18n. The whole radio course follows
// the app's selected language, with all seven catalogs embedded locally.
export type CourseLanguage = "pl" | "ru" | "en" | "es" | "fr" | "de" | "it";
const LANGUAGES: readonly CourseLanguage[] = ["pl", "ru", "en", "es", "fr", "de", "it"];

declare global {
  interface Window {
    /** the app's language, injected by OfflineRadioCourse before the page runs */
    __REGATTA_APP_LANG__?: string;
  }
}

type Extras = Partial<Record<CourseLanguage, string>>;

interface I18nContextValue {
  lang: CourseLanguage;
  setLang: (lang: CourseLanguage) => void;
  tp: (ru: string, en: string, pl: string, extra?: Extras) => string;
}

// v2: an explicit choice in the course bar. The v1 key was written automatically
// (PL for every non-Russian app) and would pin a German app to Polish.
const LANGUAGE_KEY = "regatta.radio.offline.lang.v2";

function pick(lang: CourseLanguage, ru: string, en: string, pl: string, extra?: Extras): string {
  if (lang === "ru") return ru;
  if (lang === "pl") return pl;
  return extra?.[lang] ?? en;
}

const I18nContext = createContext<I18nContextValue>({
  lang: "pl",
  setLang: () => {},
  tp: (_ru, _en, pl) => pl,
});

const isCourseLanguage = (value: unknown): value is CourseLanguage =>
  typeof value === "string" && (LANGUAGES as readonly string[]).includes(value);

/** The app's language, when the native wrapper told us. */
export function appLanguage(): CourseLanguage | null {
  const injected = window.__REGATTA_APP_LANG__;
  return isCourseLanguage(injected) ? injected : null;
}

function storedLanguage(): CourseLanguage {
  const native = appLanguage();
  if (native) return native;
  try {
    const stored = window.localStorage.getItem(LANGUAGE_KEY);
    if (isCourseLanguage(stored)) return stored;
  } catch {
    // The native wrapper restores localStorage when it is available.
  }
  const device = navigator.language.toLowerCase().slice(0, 2);
  return isCourseLanguage(device) ? device : "pl";
}

export function OfflineI18nProvider({ children }: { children: ReactNode }) {
  const [lang, setLanguage] = useState<CourseLanguage>(storedLanguage);

  useEffect(() => {
    document.documentElement.lang = lang;
  }, [lang]);

  const setLang = useCallback((next: CourseLanguage) => {
    setLanguage(next);
    document.documentElement.lang = next;
    try {
      window.localStorage.setItem(LANGUAGE_KEY, next);
    } catch {
      // The course still works if the WebView blocks persistent storage.
    }
  }, []);

  const value = useMemo<I18nContextValue>(() => ({
    lang,
    setLang,
    tp: (ru, en, pl, extra) => pick(lang, ru, en, pl, extra),
  }), [lang, setLang]);

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function I18nScope({
  lang,
  children,
}: {
  lang: CourseLanguage;
  children: ReactNode;
}) {
  const parent = useContext(I18nContext);
  const value = useMemo<I18nContextValue>(() => ({
    ...parent,
    lang,
    tp: (ru, en, pl, extra) => pick(lang, ru, en, pl, extra),
  }), [lang, parent]);
  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n(): I18nContextValue {
  return useContext(I18nContext);
}
