export const LANGUAGE_CATALOG = [
  {
    id: 'ru',
    short: 'RU',
    name: 'Russian',
    nativeName: 'Русский',
    htmlLang: 'ru',
    metadataLocale: 'ru_RU',
    enabled: true,
  },
  {
    id: 'en',
    short: 'EN',
    name: 'English',
    nativeName: 'English',
    htmlLang: 'en',
    metadataLocale: 'en_US',
    enabled: true,
  },
  {
    id: 'pl',
    short: 'PL',
    name: 'Polish',
    nativeName: 'Polski',
    htmlLang: 'pl',
    metadataLocale: 'pl_PL',
    enabled: true,
  },
  {
    id: 'es',
    short: 'ES',
    name: 'Spanish',
    nativeName: 'Español',
    htmlLang: 'es',
    metadataLocale: 'es_ES',
    enabled: false,
  },
  {
    id: 'fr',
    short: 'FR',
    name: 'French',
    nativeName: 'Français',
    htmlLang: 'fr',
    metadataLocale: 'fr_FR',
    enabled: false,
  },
  {
    id: 'de',
    short: 'DE',
    name: 'German',
    nativeName: 'Deutsch',
    htmlLang: 'de',
    metadataLocale: 'de_DE',
    enabled: false,
  },
  {
    id: 'it',
    short: 'IT',
    name: 'Italian',
    nativeName: 'Italiano',
    htmlLang: 'it',
    metadataLocale: 'it_IT',
    enabled: false,
  },
] as const;

type LanguageMeta = (typeof LANGUAGE_CATALOG)[number];
type EnabledLanguageMeta = Extract<LanguageMeta, { enabled: true }>;
export type Lang = Extract<LanguageMeta, { enabled: true }>['id'];

export const DEFAULT_LANG: Lang = 'ru';
export const FALLBACK_LANG: Lang = 'en';

export const ENABLED_LANGUAGES = LANGUAGE_CATALOG.filter(
  (language): language is EnabledLanguageMeta => language.enabled,
);

export const FUTURE_LANGUAGES = LANGUAGE_CATALOG.filter(
  (language): language is Extract<LanguageMeta, { enabled: false }> => !language.enabled,
);

export const LANG_SHORTCUT_PATHS = ENABLED_LANGUAGES.reduce<Record<string, Lang>>(
  (acc, language) => {
    acc[`/${language.id}`] = language.id;
    acc[`/${language.id}/`] = language.id;
    return acc;
  },
  {},
);

const DEFAULT_LANGUAGE: EnabledLanguageMeta =
  ENABLED_LANGUAGES.find((language) => language.id === DEFAULT_LANG) ?? ENABLED_LANGUAGES[0]!;

export function isLang(value: string | null | undefined): value is Lang {
  return ENABLED_LANGUAGES.some((language) => language.id === value);
}

export function getLanguageMeta(lang: Lang): EnabledLanguageMeta {
  return ENABLED_LANGUAGES.find((language) => language.id === lang) ?? DEFAULT_LANGUAGE;
}

export function pickLangFromAccept(accept: string | null | undefined): Lang {
  if (!accept) return DEFAULT_LANG;

  const requested = accept
    .split(',')
    .map((entry) => entry.split(';')[0]?.trim().toLowerCase() ?? '')
    .filter(Boolean);

  for (const tag of requested) {
    const base = tag.split('-')[0] ?? tag;
    if (isLang(base)) return base;
  }

  return FALLBACK_LANG;
}

export function pickLangFromNavigator(): Lang {
  if (typeof navigator === 'undefined') return DEFAULT_LANG;
  const languages = navigator.languages?.length ? navigator.languages.join(',') : navigator.language;
  return pickLangFromAccept(languages);
}

export type LocalizedText = Partial<Record<Lang, string>> & {
  ru: string;
  en: string;
};

export function pickLocalized(lang: Lang, values: LocalizedText): string {
  return values[lang] ?? values.en ?? values.ru;
}
