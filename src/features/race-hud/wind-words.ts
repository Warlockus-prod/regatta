import type { Lang } from "@/lib/languages";

type Words = Record<Lang, string>;

/** The resolved words one Simple race wind reading shows (RaceWindInstrument `words`). */
export interface WindWords { offBow: string; left: string; right: string; ahead: string; astern: string }

/**
 * Package 12 (audit B3): the Simple race reads the wind in words first,
 * "80° от носа" over "ветер слева"; TWA stays in Pro and the trainer, TWD small
 * on the second line. Terms: scripts/sailing-glossary.md, "Beginner wind words".
 * A module of its own, read only by the single race cockpit, so the trainer,
 * multiplayer and replay chunks that share the wind instrument do not carry it
 * (the JS budget).
 */
export const RACE_WIND_WORDS: Record<keyof WindWords, Words> = {
  offBow: { ru: "от носа", en: "off the bow", pl: "od dziobu", es: "de la proa", fr: "de l'avant", de: "vom Bug", it: "dalla prua" },
  left: { ru: "ветер слева", en: "wind from the left", pl: "wiatr z lewej", es: "viento por la izquierda", fr: "vent à gauche", de: "Wind von links", it: "vento da sinistra" },
  right: { ru: "ветер справа", en: "wind from the right", pl: "wiatr z prawej", es: "viento por la derecha", fr: "vent à droite", de: "Wind von rechts", it: "vento da destra" },
  ahead: { ru: "ветер в нос", en: "wind on the nose", pl: "wiatr w dziób", es: "viento de proa", fr: "vent de face", de: "Wind von vorn", it: "vento in prua" },
  astern: { ru: "ветер в корму", en: "wind from behind", pl: "wiatr w rufę", es: "viento de popa", fr: "vent arrière", de: "Wind von hinten", it: "vento in poppa" },
};

/** The words in one language. */
export function windWordsFor(lang: Lang): WindWords {
  return {
    offBow: RACE_WIND_WORDS.offBow[lang], left: RACE_WIND_WORDS.left[lang], right: RACE_WIND_WORDS.right[lang],
    ahead: RACE_WIND_WORDS.ahead[lang], astern: RACE_WIND_WORDS.astern[lang],
  };
}
