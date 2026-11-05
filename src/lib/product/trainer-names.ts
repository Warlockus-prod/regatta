// Owner decision R-13 (2026-11-05, audit B2): the three trainer pages stay, each
// named by the task it teaches, in one dictionary for the catalog, the page
// titles and the switcher on the site and in the app. V1, V2, V3 stay code names.
type Label = Record<"ru" | "en" | "pl" | "es" | "fr" | "de" | "it", string>;
export type TrainerId = "basics" | "trainer" | "boat";

export const TRAINER_NAMES: Record<TrainerId, Label> = {
  basics: { ru: "Научиться рулить", en: "Learn to steer", pl: "Naucz się sterować", es: "Aprende a timonear", fr: "Apprendre à barrer", de: "Steuern lernen", it: "Impara a timonare" },
  trainer: { ru: "Настроить паруса", en: "Trim the sails", pl: "Ustaw żagle", es: "Ajusta las velas", fr: "Régler les voiles", de: "Segel trimmen", it: "Regola le vele" },
  boat: { ru: "Рассмотреть парус", en: "Inspect the sail", pl: "Obejrzyj żagiel", es: "Observa la vela", fr: "Observer la voile", de: "Segel ansehen", it: "Osserva la vela" },
};

/** The switcher's name for a screen reader. */
export const TRAINER_SWITCHER_LABEL: Label = { ru: "Тренажеры", en: "Trainers", pl: "Trenażery", es: "Simuladores", fr: "Simulateurs", de: "Simulatoren", it: "Simulatori" };

/** The way out of a failed local trainer: the simple version of the first one. */
export const OPEN_BASICS_OFFLINE: Label = {
  ru: `Открыть «${TRAINER_NAMES.basics.ru}» (офлайн)`,
  en: `Open "${TRAINER_NAMES.basics.en}" (offline)`,
  pl: `Otwórz "${TRAINER_NAMES.basics.pl}" (offline)`,
  es: `Abrir "${TRAINER_NAMES.basics.es}" (sin conexión)`,
  fr: `Ouvrir "${TRAINER_NAMES.basics.fr}" (hors ligne)`,
  de: `"${TRAINER_NAMES.basics.de}" öffnen (offline)`,
  it: `Apri "${TRAINER_NAMES.basics.it}" (offline)`,
};
