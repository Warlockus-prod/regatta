'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { useI18n } from "@/lib/i18n";
import type { Lang, LocalizedText } from "@/lib/languages";
import { loadRadioCatalog, loadRadioAliases, radioText, type RadioCatalog, type RadioAliases } from "./text";

interface Resources { catalog: RadioCatalog; aliases: RadioAliases }
const CatalogContext = createContext<Resources>({ catalog: {}, aliases: {} });
const loading: Record<Lang, string> = {
  ru: "Загружаю курс...", en: "Loading the course...", pl: "Wczytuję kurs...",
  es: "Cargando el curso...", fr: "Chargement du cours...", de: "Kurs wird geladen...", it: "Caricamento del corso...",
};
const retries: Record<Lang, string> = {
  ru: "Повторить загрузку", en: "Retry loading", pl: "Ponów wczytywanie",
  es: "Volver a cargar", fr: "Réessayer le chargement", de: "Erneut laden", it: "Riprova a caricare",
};

export function RadioLocaleProvider({ children, initialLang, initialCatalog, initialAliases, bundled, bundledAliases }: {
  children: ReactNode;
  initialLang?: Lang;
  initialCatalog?: RadioCatalog;
  initialAliases?: RadioAliases;
  bundledAliases?: RadioAliases;
  bundled?: Readonly<Record<Lang, RadioCatalog>>;
}) {
  const { lang } = useI18n();
  const [loaded, setLoaded] = useState<Resources & { lang?: Lang }>({
    lang: initialLang, catalog: initialCatalog ?? {}, aliases: initialAliases ?? {},
  });
  const catalog = bundled?.[lang] ?? (loaded.lang === lang ? loaded.catalog : null);
  const [failed, setFailed] = useState(false);
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    if (bundled || loaded.lang === lang) return;
    let alive = true;
    Promise.all([loadRadioCatalog(lang), loadRadioAliases()])
      .then(([catalog, aliases]) => { if (alive) { setLoaded({ lang, catalog, aliases }); setFailed(false); } })
      .catch(() => { if (alive) setFailed(true); });
    return () => { alive = false; };
  }, [bundled, lang, loaded.lang, retry]);

  if (!catalog) {
    return (
      <div role="status" className="p-6">
        <p>{loading[lang]}</p>
        {failed && <button type="button" className="min-h-[44px] px-4" onClick={() => { setFailed(false); setRetry(n => n + 1); }}>{retries[lang]}</button>}
      </div>
    );
  }
  return <CatalogContext.Provider value={{ catalog, aliases: bundledAliases ?? loaded.aliases }}>{children}</CatalogContext.Provider>;
}

/** Call at each visible text read. State and user speech retain their values. */
export function useRadioI18n() {
  const site = useI18n();
  const { catalog, aliases } = useContext(CatalogContext);
  const rt = useCallback(<T,>(value: T): T => radioText(value, catalog, aliases), [catalog, aliases]);
  const tp = useCallback((ru: string, en: string, pl: string, extras?: Partial<Record<Lang, string>>) => rt(extras?.[site.lang] ?? (site.lang === "ru" ? ru : pl || en)), [rt, site.lang]);
  const t = useCallback((ru: string, en: string) => rt(site.lang === "ru" ? ru : en), [rt, site.lang]);
  const tl = useCallback((values: LocalizedText) => rt(values[site.lang] ?? values.pl ?? values.en), [rt, site.lang]);
  return useMemo(() => ({ ...site, tp, t, tl, rt }), [site, tp, t, tl, rt]);
}
