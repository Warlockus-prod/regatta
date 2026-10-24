// ============================================================================
// The radio trainer in all seven site languages (owner, 2026-10-24). The
// course data keeps its Polish source and Russian aid (`Bi`); the other five
// languages live in i18n/<lang>.json, keyed by the exact Polish source string,
// so a shared step (every scenario's "power on") is translated once and a
// changed Polish text shows up as a missing key in trainerText.test.ts instead
// of silently keeping an old translation. Place-holders such as {marinaCh}
// stay in the translation and are filled per venue afterwards (venues.ts).
// Radio phrases (MAYDAY, THIS IS, OVER) are radio English in every language.
// ============================================================================

import { useCallback, useMemo } from 'react';
import { useI18n } from '@/lib/i18n';
import type { Lang } from '@/lib/languages';
import en from './i18n/en.json';
import es from './i18n/es.json';
import fr from './i18n/fr.json';
import de from './i18n/de.json';
import it from './i18n/it.json';
import uiEs from './i18n/ui.es.json';
import uiFr from './i18n/ui.fr.json';
import uiDe from './i18n/ui.de.json';
import uiIt from './i18n/ui.it.json';

export const TRAINER_DICTS: Readonly<Record<'en' | 'es' | 'fr' | 'de' | 'it', Readonly<Record<string, string>>>> = { en, es, fr, de, it };

/** The trainer text for a Polish source string. PL and RU come from the data
 *  itself; the others fall back to English, then to the Polish source. */
export function trainerText(pl: string, lang: Lang): string {
  if (lang === 'pl' || lang === 'ru') return pl;
  return TRAINER_DICTS[lang][pl] ?? TRAINER_DICTS.en[pl] ?? pl;
}

type ExtraLang = 'es' | 'fr' | 'de' | 'it';
/** The trainer's interface strings (buttons, statuses) in the four languages the
 *  site's tp(ru, en, pl) does not carry, keyed by the English string. */
export const TRAINER_UI_DICTS: Readonly<Record<ExtraLang, Readonly<Record<string, string>>>> = { es: uiEs, fr: uiFr, de: uiDe, it: uiIt };
const isExtra = (lang: Lang): lang is ExtraLang => lang === 'es' || lang === 'fr' || lang === 'de' || lang === 'it';

/**
 * The site's `tp(ru, en, pl)` for the trainer, plus ES / FR / DE / IT from
 * TRAINER_UI_DICTS: the existing calls keep their shape and gain four
 * languages. Outside the trainer route the section scope is PL / RU anyway.
 */
export function useTrainerI18n() {
  const { tp, lang } = useI18n();
  const ttp = useCallback(
    (ru: string, enText: string, pl: string) => (isExtra(lang) ? TRAINER_UI_DICTS[lang][enText] ?? enText : tp(ru, enText, pl)),
    [tp, lang],
  );
  return useMemo(() => ({ tp: ttp, lang }), [ttp, lang]);
}

/** "{n}%" style place-holders for interface strings that carry a number. */
export function fmt(text: string, vars: Readonly<Record<string, string | number>>): string {
  return text.replace(/\{(\w+)\}/g, (whole, key: string) => (key in vars ? String(vars[key]) : whole));
}

/**
 * A grader check label (the server writes them in Polish) in `lang`. Labels
 * that carry a value - "dokładna pozycja (54 30.5 NORTH, ...)" - are looked up
 * by their template, "dokładna pozycja ({value})". RU keeps the Polish label,
 * as before.
 */
export function checkLabel(label: string, lang: Lang): string {
  if (lang === 'pl' || lang === 'ru') return label;
  const whole = trainerText(label, lang);
  if (whole !== label) return whole;
  const withValue = /^(.*) \((.*)\)$/.exec(label);
  if (withValue) {
    const template = `${withValue[1]} ({value})`;
    const translated = trainerText(template, lang);
    if (translated !== template) return translated.replace('{value}', withValue[2]);
  }
  return label;
}
