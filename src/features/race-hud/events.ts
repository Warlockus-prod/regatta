// Texts of the race events the HUD shows for a moment (game audit F2): the
// cost of a tack or gybe, the split at the windward mark, an overtake.

import type { Lang as Language } from "@/lib/languages";

export type RaceEvent =
  | { kind: "tack" | "gybe"; lossKn: number }
  | { kind: "mark"; place: number; gapSec: number }
  | { kind: "gained" | "lost"; place: number };

/** "2nd", "2-й", "2." ... as each language writes a place. */
export function ordinal(lang: Language, n: number): string {
  switch (lang) {
    case "ru": return `${n}-й`;
    case "en": {
      const tail = n % 100 >= 11 && n % 100 <= 13 ? "th" : ["th", "st", "nd", "rd"][n % 10] ?? "th";
      return `${n}${tail}`;
    }
    case "es": return `${n}.º`;
    case "fr": return n === 1 ? "1er" : `${n}e`;
    case "it": return `${n}º`;
    default: return `${n}.`;
  }
}

const T = {
  tack: { ru: "Оверштаг", en: "Tack", pl: "Zwrot przez sztag", es: "Virada", fr: "Virement", de: "Wende", it: "Virata" },
  gybe: { ru: "Фордевинд", en: "Gybe", pl: "Zwrot przez rufę", es: "Trasluchada", fr: "Empannage", de: "Halse", it: "Strambata" },
  markFirst: { ru: "Знак пройден первым", en: "First round the mark", pl: "Pierwszy na znaku", es: "Primero en la baliza", fr: "Premier à la bouée", de: "Als Erster an der Tonne", it: "Primo alla boa" },
  mark: { ru: "Знак", en: "Mark", pl: "Znak", es: "Baliza", fr: "Bouée", de: "Tonne", it: "Boa" },
  gained: { ru: "Обгон! Ты", en: "Overtake! You're", pl: "Wyprzedzenie! Jesteś", es: "¡Adelantamiento! Vas", fr: "Dépassement ! Tu es", de: "Überholt! Du bist", it: "Sorpasso! Sei" },
  lost: { ru: "Тебя обошли: ты", en: "Passed: you're", pl: "Wyprzedzili cię: jesteś", es: "Te han adelantado: vas", fr: "Doublé : tu es", de: "Überholt worden: Du bist", it: "Ti hanno superato: sei" },
} as const;

const sec = (lang: Language) => (lang === "ru" ? "с" : "s");
const colon = (lang: Language) => (lang === "fr" ? " :" : ":");

export function eventText(lang: Language, e: RaceEvent): string {
  switch (e.kind) {
    case "tack":
    case "gybe":
      return `${T[e.kind][lang]}${colon(lang)} -${e.lossKn.toFixed(1)} kn`;
    case "mark":
      return e.place === 1 ? T.markFirst[lang] : `${T.mark[lang]}${colon(lang)} ${ordinal(lang, e.place)}, +${e.gapSec.toFixed(1)} ${sec(lang)}`;
    case "gained":
    case "lost":
      return `${T[e.kind][lang]} ${ordinal(lang, e.place)}`;
  }
}
