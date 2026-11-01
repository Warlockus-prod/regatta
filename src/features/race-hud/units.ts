// Units of the race readouts in the seven languages (M1-7). One place for the
// knot, second and metre signs, so no HUD piece writes " m", " s" or "kn"
// by hand. Instrument readouts keep a fixed decimal point in every language
// (scripts/sailing-glossary.md, rule 7); only the unit sign is localized.
// Pure module: the race event texts (events.ts) and the React copy hooks
// (src/app/game/race-copy.ts, navigation-copy.ts) read the same resource.

import type { Lang } from "@/lib/languages";

export const RACE_UNITS = {
  knots: { ru: "уз", en: "kn", pl: "w.", es: "kn", fr: "nd", de: "kn", it: "kn" },
  seconds: { ru: "с", en: "s", pl: "s", es: "s", fr: "s", de: "s", it: "s" },
  metres: { ru: "м", en: "m", pl: "m", es: "m", fr: "m", de: "m", it: "m" },
} as const satisfies Record<string, Record<Lang, string>>;

/** "4.2 уз", "4.2 kn": a speed with one decimal by default. */
export function knotsText(lang: Lang, knots: number, digits = 1): string {
  return `${knots.toFixed(digits)} ${RACE_UNITS.knots[lang]}`;
}

/** "120 м", "120 m": a distance rounded to the whole metre. */
export function metresText(lang: Lang, metres: number): string {
  return `${Math.round(metres)} ${RACE_UNITS.metres[lang]}`;
}

/** "+5 с", "+5 s": a time penalty as the race counts it. */
export function penaltyText(lang: Lang, seconds: number): string {
  return `+${seconds} ${RACE_UNITS.seconds[lang]}`;
}

/** "+4.3 с", "+4.3 s": a gap behind another boat, one decimal. */
export function gapText(lang: Lang, seconds: number): string {
  return `+${seconds.toFixed(1)} ${RACE_UNITS.seconds[lang]}`;
}
