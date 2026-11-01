import type { Lang } from "@/lib/languages";

/** Seven-language copy of the teaching replay (M4-3,
 * src/lib/race-replay-teaching.ts): the speed group, the event ribbon and the
 * "watch the moment" buttons of the finish screen. Terms follow
 * scripts/sailing-glossary.md (tack, windward mark); the knots unit is
 * RACE_UNITS (src/features/race-hud/units.ts); the judge's incident names come
 * from race-judge-copy.ts. A tack's number is the speed it cost, never time
 * or distance (M0-13: a tack here loses speed for about a second). */
type Text = Record<Lang, string>;
const w = (ru: string, en: string, pl: string, es: string, fr: string, de: string, it: string): Text => ({ ru, en, pl, es, fr, de, it });

export const replayTeachingCopy = {
  speed: w("Скорость повтора", "Playback speed", "Prędkość odtwarzania", "Velocidad de reproducción", "Vitesse de lecture",
    "Wiedergabegeschwindigkeit", "Velocità di riproduzione"),
  ribbon: w("События гонки: касание перематывает на 5 с раньше", "Race events: a tap jumps to 5 s before",
    "Zdarzenia wyścigu: dotknięcie cofa do 5 s przed", "Momentos de la regata: al tocar, salta 5 s antes",
    "Moments de la course : un appui revient 5 s avant", "Rennereignisse: Antippen springt 5 s davor",
    "Momenti della regata: un tocco salta a 5 s prima"),
  start: w("Старт", "Start", "Start", "Salida", "Départ", "Start", "Partenza"),
  tack: w("Поворот оверштаг", "Tack", "Zwrot przez sztag", "Virada", "Virement de bord", "Wende", "Virata"),
  /** {n} is the speed lost in the tack with its unit, "0,6 уз". */
  tackLoss: w("потеря {n}", "lost {n}", "strata {n}", "pérdida {n}", "perte {n}", "Verlust {n}", "perdita {n}"),
  mark: w("Верхний знак", "Windward mark", "Znak nawietrzny", "Baliza de barlovento", "Bouée au vent", "Luvtonne", "Boa di bolina"),
  /** Under a judge item or a coach mistake: open the replay at that moment. */
  watchMoment: w("Посмотреть момент", "Watch the moment", "Zobacz ten moment", "Ver el momento", "Revoir le moment",
    "Moment ansehen", "Guarda il momento"),
  /** The finish screen's "Watch" slot: the replay at the main mistake. */
  watchMistake: w("Посмотреть ошибку", "Watch the mistake", "Zobacz błąd", "Ver el error", "Revoir l'erreur",
    "Fehler ansehen", "Guarda l'errore"),
} as const;
