/**
 * Mobile-side mirror of `src/lib/languages.ts` from the web client.
 *
 * Pure TypeScript, no React, no DOM, no `navigator`. Safe to consume from
 * any RN code (workers, persistence, screens). Keeps the same `Lang` shape
 * as web so `LegacyLocalized<>`-typed data files (bootcamp, rules, anatomy,
 * etc.) read identically.
 *
 * Source of truth is web until ADR-0003 extracts content/i18n into a shared
 * package. Until then, this file is checked in CI to match the web version
 * structurally (see `scripts/sync-content-to-mobile.mjs` once it lands).
 */

// Ordered alphabetically by native name (Latin first, then Cyrillic last).
// RU stays the default via DEFAULT_LANG below, independent of list order.
export const LANGUAGE_CATALOG = [
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
    id: 'en',
    short: 'EN',
    name: 'English',
    nativeName: 'English',
    htmlLang: 'en',
    metadataLocale: 'en_US',
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
    id: 'it',
    short: 'IT',
    name: 'Italian',
    nativeName: 'Italiano',
    htmlLang: 'it',
    metadataLocale: 'it_IT',
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
    id: 'ru',
    short: 'RU',
    name: 'Russian',
    nativeName: 'Русский',
    htmlLang: 'ru',
    metadataLocale: 'ru_RU',
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

const DEFAULT_LANGUAGE: EnabledLanguageMeta =
  ENABLED_LANGUAGES.find((language) => language.id === DEFAULT_LANG) ?? ENABLED_LANGUAGES[0]!;

export function isLang(value: string | null | undefined): value is Lang {
  return ENABLED_LANGUAGES.some((language) => language.id === value);
}

export function getLanguageMeta(lang: Lang): EnabledLanguageMeta {
  return ENABLED_LANGUAGES.find((language) => language.id === lang) ?? DEFAULT_LANGUAGE;
}

export type LocalizedText = Partial<Record<Lang, string>> & {
  ru: string;
  en: string;
};

/**
 * Utility type for data-file rows that use flat-shape translation fields:
 *   `titleRu / titleEn / titlePl / titleEs / titleFr / titleDe / titleIt`.
 *
 * Required: ru, en, pl. Optional: es, fr, de, it. Identical to the web type.
 */
export type LegacyLocalized<Field extends string> =
  { [K in `${Field}Ru` | `${Field}En` | `${Field}Pl`]: string }
  & { [K in `${Field}Es` | `${Field}Fr` | `${Field}De` | `${Field}It`]?: string };

export function pickLocalized(lang: Lang, values: LocalizedText): string {
  return values[lang] ?? values.en ?? values.ru;
}

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
