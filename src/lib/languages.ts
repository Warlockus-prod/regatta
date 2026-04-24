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
    enabled: true,
  },
  {
    id: 'fr',
    short: 'FR',
    name: 'French',
    nativeName: 'Français',
    htmlLang: 'fr',
    metadataLocale: 'fr_FR',
    enabled: true,
  },
  {
    id: 'de',
    short: 'DE',
    name: 'German',
    nativeName: 'Deutsch',
    htmlLang: 'de',
    metadataLocale: 'de_DE',
    enabled: true,
  },
  {
    id: 'it',
    short: 'IT',
    name: 'Italian',
    nativeName: 'Italiano',
    htmlLang: 'it',
    metadataLocale: 'it_IT',
    enabled: true,
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

/**
 * Utility type for data-file interfaces that use flat-shape translation
 * fields (`titleRu / titleEn / titlePl / titleEs / titleFr / titleDe /
 * titleIt`). Use alongside `legacyPick()` in consumers.
 *
 *   interface Mission extends LegacyLocalized<'title' | 'desc' | 'hint'> {
 *     id: string;
 *     ...
 *   }
 *
 * Required: ru, en, pl (existing data). Optional: es, fr, de, it (added
 * via translate-data-flat.mjs over time).
 */
export type LegacyLocalized<Field extends string> =
  { [K in `${Field}Ru` | `${Field}En` | `${Field}Pl`]: string }
  & { [K in `${Field}Es` | `${Field}Fr` | `${Field}De` | `${Field}It`]?: string };

export function pickLocalized(lang: Lang, values: LocalizedText): string {
  return values[lang] ?? values.en ?? values.ru;
}

/**
 * Legacy-shape picker for data files that still use flat `fooRu / fooEn /
 * fooPl / fooEs / fooFr / fooDe / fooIt` properties.
 *
 *   legacyPick(anatomyPart, 'name', lang)
 *   // looks up anatomyPart.nameIt -> falls back to nameEn -> falls back to nameRu
 *
 * Use instead of `lang === 'pl' ? x.namePl : lang === 'en' ? x.nameEn : x.nameRu`
 * so adding new languages (ES / FR / DE / IT) just means appending matching
 * `nameEs` / `nameFr` / etc fields, without touching the call site.
 *
 * Returns an empty string if the base field isn't on the object.
 */
// All catalog codes (including disabled), not narrowed to enabled Lang.
type AnyLangCode = (typeof LANGUAGE_CATALOG)[number]['id'];
const CAPITALIZE: Record<AnyLangCode, string> = {
  ru: 'Ru', en: 'En', pl: 'Pl', es: 'Es', fr: 'Fr', de: 'De', it: 'It',
};

export function legacyPick(
  obj: unknown,
  field: string,
  lang: Lang,
): string {
  if (!obj || typeof obj !== 'object') return '';
  const o = obj as Record<string, unknown>;
  const suffix = CAPITALIZE[lang as AnyLangCode] ?? 'En';
  const primary = o[`${field}${suffix}`];
  if (typeof primary === 'string' && primary.length > 0) return primary;
  const en = o[`${field}En`];
  if (typeof en === 'string' && en.length > 0) return en;
  const ru = o[`${field}Ru`];
  return typeof ru === 'string' ? ru : '';
}

/**
 * Array-valued variant of `legacyPick` for fields like `itemsRu: string[]`.
 */
export function legacyPickArray(
  obj: unknown,
  field: string,
  lang: Lang,
): string[] {
  if (!obj || typeof obj !== 'object') return [];
  const o = obj as Record<string, unknown>;
  const suffix = CAPITALIZE[lang as AnyLangCode] ?? 'En';
  const primary = o[`${field}${suffix}`];
  if (Array.isArray(primary) && primary.length > 0) return primary as string[];
  const en = o[`${field}En`];
  if (Array.isArray(en) && en.length > 0) return en as string[];
  const ru = o[`${field}Ru`];
  return Array.isArray(ru) ? (ru as string[]) : [];
}
