import type { Label } from "./catalog";

const label = (ru: string, en: string, pl: string, es: string, fr: string, de: string, it: string): Label =>
  ({ ru, en, pl, es, fr, de, it });

/**
 * Package 11 (audit B11): the trainer's drawing words. Part of the UI
 * dictionary (ui-terms.ts, same rules and the same fork test), in a module of
 * their own so the many race and menu chunks that read UI_TERMS do not each
 * carry them (the JS budget).
 */
export const TRAINER_TERMS = {
  /** The two sails as the trainer's drawings name them. */
  jib: label("Стаксель", "Jib", "Fok", "Foque", "Foc", "Fock", "Fiocco"),
  mainsail: label("Грот", "Main", "Grot", "Mayor", "Grand-voile", "Groß", "Randa"),
  /** Compass points on the trainer's instruments and top view (DE Ost, ES/FR/IT Oeste/Ouest/Ovest). */
  compassN: label("С", "N", "N", "N", "N", "N", "N"),
  compassE: label("В", "E", "E", "E", "E", "O", "E"),
  compassS: label("Ю", "S", "S", "S", "S", "S", "S"),
  compassW: label("З", "W", "W", "O", "O", "W", "O"),
} as const satisfies Record<string, Label>;
