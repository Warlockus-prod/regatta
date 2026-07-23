import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

type CourseLanguage = "pl" | "ru";

interface I18nContextValue {
  lang: CourseLanguage;
  setLang: (lang: CourseLanguage) => void;
  tp: (
    ru: string,
    en: string,
    pl: string,
    extra?: Record<string, string>,
  ) => string;
}

const LANGUAGE_KEY = "regatta.radio.offline.lang.v1";

const I18nContext = createContext<I18nContextValue>({
  lang: "pl",
  setLang: () => {},
  tp: (_ru, _en, pl) => pl,
});

function storedLanguage(): CourseLanguage {
  try {
    const stored = window.localStorage.getItem(LANGUAGE_KEY);
    if (stored === "ru" || stored === "pl") return stored;
  } catch {
    // The native wrapper restores localStorage when it is available.
  }
  return navigator.language.toLowerCase().startsWith("ru") ? "ru" : "pl";
}

export function OfflineI18nProvider({ children }: { children: ReactNode }) {
  const [lang, setLanguage] = useState<CourseLanguage>("pl");

  useEffect(() => {
    setLanguage(storedLanguage());
  }, []);

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
    tp: (ru, _en, pl) => (lang === "ru" ? ru : pl),
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
    tp: (ru, _en, pl) => (lang === "ru" ? ru : pl),
  }), [lang, parent]);
  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n(): I18nContextValue {
  return useContext(I18nContext);
}
