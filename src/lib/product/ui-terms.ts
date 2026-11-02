import type { Label } from "./catalog";

/**
 * Package 10 (audit B4, top-7): ONE dictionary of the UI words that the site,
 * the app and the seven languages must name the same way. catalog.ts
 * re-exports it.
 *
 * Rule from now on: a new UI word that names a product thing (a mode, a unit,
 * the brand, a recurring button) is added HERE first and read from here by the
 * site (src/) and the app (mobile/src, mobile/app). Mobile copy imports this
 * module the same way it imports catalog.ts and home-entry.ts; it never keeps
 * its own copy. Tests: ui-terms.test.ts (site and app agree) and
 * ui-terms-variants.test.ts (the old variants listed below stay gone).
 *
 * Decisions kept here so nobody re-opens them by accident:
 * - Race modes are "Простой" and "Pro" in every language (owner R-12). The app
 *   already said "Простой"; "Обычный", RU "Про" and DE "Profi" are retired.
 *   ES keeps "Sencillo", the word the site and the app already showed.
 * - Russian writes "Ещё раз" with ё (most of the RU UI already did).
 * - Russian says "ИИ-тренер", never "AI-тренер".
 * - The product name in copy is "Week to Regatta"; "Regatta" is only the short
 *   header logo. Copy never writes "REGATTA" in capitals (the radio call sign
 *   "REGATTA FLEET" is a radio phrase, not the brand).
 * - Polish: the section and the activity are "Regaty" (tab, hub, "Moje
 *   regaty"); one race on screen is "Wyścig" (scripts/sailing-glossary.md,
 *   "Polish race words").
 * - Units: knots "уз" / "w." / "nd" / "kn", metres "м" in Russian, minutes
 *   "мин" in Russian. Instrument readouts read them from here (RACE_UNITS in
 *   src/features/race-hud/units.ts is this same object).
 *
 * Pure data, no React or platform dependency (the app bundles it through
 * Metro, the offline WebView packages through esbuild).
 */
const label = (ru: string, en: string, pl: string, es: string, fr: string, de: string, it: string): Label =>
  ({ ru, en, pl, es, fr, de, it });
/** One word for all seven languages (a proper noun or an international sign). */
const same = (word: string): Label => label(word, word, word, word, word, word, word);

const raceSection = label("Гонка", "Race", "Regaty", "Regata", "Course", "Rennen", "Regata");

/** The two race control modes, keyed as the race stores them (RACE_MODE_LABELS is this object). */
export const RACE_MODES = {
  /** Self-trimming sails. */
  simple: label("Простой", "Simple", "Prosty", "Sencillo", "Simple", "Einfach", "Semplice"),
  /** The player trims the sheets. */
  pro: same("Pro"),
};

export const UI_TERMS = {
  /** Race control modes (owner R-12). */
  modeSimple: RACE_MODES.simple,
  modePro: RACE_MODES.pro,
  /** Repeat the same race or drill (the result screen button). */
  again: label("Ещё раз", "Again", "Jeszcze raz", "Otra vez", "Rejouer", "Noch mal", "Di nuovo"),
  /** The race debrief title before the AI coach answers. */
  raceDebrief: label("Разбор гонки", "Race debrief", "Omówienie wyścigu", "Análisis de la regata", "Bilan de la course", "Rennauswertung", "Analisi della regata"),
  /** The AI race debrief. */
  aiCoach: label("ИИ-тренер", "AI coach", "Trener AI", "Entrenador IA", "Coach IA", "KI-Trainer", "Coach IA"),
  /** The product name in copy, titles and share texts. */
  brand: same("Week to Regatta"),
  /** The short header logo only. */
  brandShort: same("Regatta"),
  /** The section and the activity (tab, hub title). */
  raceSection,
  /** One race on screen (the race screen title, the race camera). */
  race: { ...raceSection, pl: "Wyścig" },
  /** Unit signs, written after a number with a space. */
  knots: label("уз", "kn", "w.", "kn", "nd", "kn", "kn"),
  metres: { ...same("m"), ru: "м" },
  seconds: { ...same("s"), ru: "с" },
  minutes: { ...same("min"), ru: "мин", de: "Min." },
} as const satisfies Record<string, Label>;

export type UiTerm = keyof typeof UI_TERMS;
