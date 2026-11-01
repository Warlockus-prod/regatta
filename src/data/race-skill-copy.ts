import type { Lang } from "@/lib/languages";
import type { SkillBar, SkillBarId } from "@/lib/race-skill-metrics";

/** Seven-language copy of the skill bars on the solo race result screen
 * (M4-1, src/lib/race-skill-metrics.ts). One plain label and one number per
 * bar; terms follow scripts/sailing-glossary.md, units match RACE_UNITS
 * (src/features/race-hud/units.ts). {n} is the formatted number. The words
 * claim only what the race measures: the start crossing, the speed made
 * good upwind (VMG) against the HUD target, the speed lost in a tack, the
 * time in the no-go zone. No layline: the race does not measure one. */
export type SkillText = Record<Lang, string>;
const w = (ru: string, en: string, pl: string, es: string, fr: string, de: string, it: string): SkillText => ({ ru, en, pl, es, fr, de, it });

export const raceSkillCopy = {
  title: w("Навыки в этой гонке", "Skills in this race", "Umiejętności w tym wyścigu", "Habilidades en esta regata",
    "Compétences sur cette course", "Fähigkeiten in diesem Rennen", "Abilità in questa regata"),
  label: {
    start: w("Старт", "Start", "Start", "Salida", "Départ", "Start", "Partenza"),
    upwind: w("Лавировка", "Upwind", "Halsowanie", "Ceñida", "Près", "Kreuz", "Bolina"),
    tacks: w("Повороты оверштаг", "Tacks", "Zwroty przez sztag", "Viradas", "Virements de bord", "Wenden", "Virate"),
    "no-go": w("Мертвая зона", "No-go zone", "Kąt martwy", "Zona muerta", "Zone morte", "Toter Winkel", "Angolo morto"),
  } satisfies Record<SkillBarId, SkillText>,
  value: {
    start: w("{n} с после сигнала", "{n} s after the start signal", "{n} s po sygnale startu", "{n} s después de la señal de salida",
      "{n} s après le signal de départ", "{n} s nach dem Startsignal", "{n} s dopo il segnale di partenza"),
    upwind: w("{n}% от лучшей скорости на ветер (VMG)", "{n}% of the best upwind speed (VMG)", "{n}% najlepszej prędkości pod wiatr (VMG)",
      "{n}% de la mejor velocidad en ceñida (VMG)", "{n} % de la meilleure vitesse au près (VMG)", "{n} % der besten Geschwindigkeit am Wind (VMG)",
      "{n}% della migliore velocità di bolina (VMG)"),
    tacks: w("в среднем {n} уз скорости теряется в повороте", "{n} kn of speed lost per tack on average", "średnio {n} w. prędkości traconej na zwrocie",
      "{n} kn de velocidad perdida por virada, de media", "{n} nd de vitesse perdue par virement, en moyenne",
      "im Schnitt {n} kn Geschwindigkeitsverlust pro Wende", "in media {n} kn di velocità persa per virata"),
    "no-go": w("{n} с в мертвой зоне", "{n} s in the no-go zone", "{n} s w kącie martwym", "{n} s en la zona muerta",
      "{n} s dans la zone morte", "{n} s im toten Winkel", "{n} s nell'angolo morto"),
  } satisfies Record<SkillBarId, SkillText>,
  /** Read out after a bar's number when it reaches its threshold; on screen a
   * check mark next to the label says the same (not colour alone). */
  good: w("хороший результат", "good result", "dobry wynik", "buen resultado", "bon résultat", "gutes Ergebnis", "buon risultato"),
} as const;

/** The number of a bar as its label shows it: seconds and knots with one
 * decimal and the language's decimal mark, the VMG share as a whole percent
 * (raceSkillBars caps it at 100). */
export function skillBarNumber(bar: SkillBar, lang: Lang): string {
  if (bar.id === "upwind") return String(Math.round(bar.value * 100));
  return new Intl.NumberFormat(lang, { minimumFractionDigits: 1, maximumFractionDigits: 1 }).format(Math.round(bar.value * 10) / 10);
}

export function skillBarText(bar: SkillBar, lang: Lang): { label: string; value: string } {
  return { label: raceSkillCopy.label[bar.id][lang], value: raceSkillCopy.value[bar.id][lang].replace("{n}", skillBarNumber(bar, lang)) };
}
