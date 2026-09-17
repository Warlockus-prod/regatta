import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import type { Language } from "../../../src/lib/product/catalog";

declare global {
  interface Window {
    __REGATTA_LANGUAGE__?: string;
    ReactNativeWebView?: { postMessage(value: string): void };
  }
}
const languages = ["ru", "en", "pl", "es", "fr", "de", "it"];
const valid = (value: unknown): Language => typeof value === "string" && languages.includes(value) ? value as Language : "en";
type Translate = (ru: string, en: string, pl: string, extra?: Partial<Record<Language, string>>) => string;
const Context = createContext<{ lang: Language; tp: Translate }>({ lang: "en", tp: (_ru, en) => en });

export function OfflineSailingI18n({ children }: { children: ReactNode }) {
  const [lang, setLang] = useState(() => valid(window.__REGATTA_LANGUAGE__));
  useEffect(() => {
    const update = () => setLang(valid(window.__REGATTA_LANGUAGE__));
    window.addEventListener("regatta-language", update);
    return () => window.removeEventListener("regatta-language", update);
  }, []);
  useEffect(() => { document.documentElement.lang = lang; }, [lang]);
  const tp = useCallback<Translate>((ru, en, pl, extra) => ({ ru, en, pl, ...extra }[lang] ?? en), [lang]);
  const value = useMemo(() => ({ lang, tp }), [lang, tp]);
  return <Context.Provider value={value}>{children}</Context.Provider>;
}
export const useI18n = () => useContext(Context);
