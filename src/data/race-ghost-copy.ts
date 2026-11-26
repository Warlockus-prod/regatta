import type { Lang } from "@/lib/languages";
import { RACE_UNITS } from "@/features/race-hud/units";
import type { GhostSplit, SplitVerdict } from "@/lib/race-ghost-splits";

/** Seven-language copy of the M4-4 splits against your best race of the same
 * class (the grey boat labelled "Your best" in the scene, src/lib/race-ghost.ts).
 * Every split carries its sign and a word (ahead, behind, level), so green and
 * red are never the only signal. Terms follow scripts/sailing-glossary.md
 * (windward mark, finish); the decimal point stays fixed in every language
 * (glossary rule 7), as in the other race readouts. */
export type GhostText = Record<Lang, string>;
const w = (ru: string, en: string, pl: string, es: string, fr: string, de: string, it: string): GhostText => ({ ru, en, pl, es, fr, de, it });

export const raceGhostCopy = {
  /** Results section title. */
  title: w("Промежуточное время против твоей лучшей гонки", "Splits against your best", "Międzyczasy względem twojego najlepszego wyniku",
    "Parciales frente a tu mejor regata", "Temps intermédiaires face à ta meilleure course", "Zwischenzeiten gegen deine Bestzeit",
    "Intertempi contro il tuo miglior tempo"),
  /** The HUD toast at the mark: "<hud>: -2.4 s, ahead". */
  hud: w("Против твоей лучшей гонки", "Against your best", "Względem najlepszego wyniku", "Frente a tu mejor regata", "Face à ta meilleure course",
    "Gegen deine Bestzeit", "Contro il tuo miglior tempo"),
  mark: w("Верхний знак", "Windward mark", "Znak nawietrzny", "Baliza de barlovento", "Bouée au vent", "Luvtonne", "Boa di bolina"),
  finish: w("Финиш", "Finish", "Meta", "Llegada", "Arrivée", "Ziel", "Arrivo"),
  verdict: {
    ahead: w("впереди", "ahead", "z przodu", "por delante", "en avance", "voraus", "in vantaggio"),
    behind: w("позади", "behind", "z tyłu", "por detrás", "en retard", "zurück", "in ritardo"),
    even: w("вровень", "level", "na równi", "igualado", "à égalité", "gleichauf", "alla pari"),
  } satisfies Record<SplitVerdict, GhostText>,
  /** Screen-reader column names of the results rows. */
  yourTime: w("твое время", "your time", "twój czas", "tu tiempo", "ton temps", "deine Zeit", "il tuo tempo"),
} as const;

/** "-2.4 s", "+1.1 s", "0.0 s": the sign is always written. */
export function splitDeltaText(lang: Lang, deltaSec: number): string {
  const sign = deltaSec < 0 ? "-" : deltaSec > 0 ? "+" : "";
  return `${sign}${Math.abs(deltaSec).toFixed(1)} ${RACE_UNITS.seconds[lang]}`;
}

/** "-2.4 s, ahead" */
export function splitVerdictText(lang: Lang, split: Pick<GhostSplit, "deltaSec" | "verdict">): string {
  return `${splitDeltaText(lang, split.deltaSec)}, ${raceGhostCopy.verdict[split.verdict][lang]}`;
}

/** The HUD toast at the mark: "Against your best: -2.4 s, ahead". */
export function ghostSplitToast(lang: Lang, split: Pick<GhostSplit, "deltaSec" | "verdict">): string {
  return `${raceGhostCopy.hud[lang]}${lang === "fr" ? " :" : ":"} ${splitVerdictText(lang, split)}`;
}

/** The row label of a split in the results. */
export function splitLabel(lang: Lang, split: Pick<GhostSplit, "at">): string {
  return (split.at === "finish" ? raceGhostCopy.finish : raceGhostCopy.mark)[lang];
}
