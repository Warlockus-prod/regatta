// Package 32: the names of the race subjects the 15-minute cards show (SAILING_SECTIONS.quick in
// sailing-visuals.ts) that neither the glossary nor the manoeuvres name. They are the titles of
// the rule cards of the same id (src/data/rules.ts), copied here so that a page that shows three
// names does not load the text of all 21 cards in seven languages; race-subject-names.test.ts
// fails when a title and its copy part.
// No "@/..." import here: the app reads this module through Metro's watched folders.
type Names = Record<"ru" | "en" | "pl" | "es" | "fr" | "de" | "it", string>;

export const RACE_SUBJECT_NAMES: Readonly<Record<string, Names>> = {
  "port-vs-starboard": { ru: "Левый и правый галс", en: "Port vs Starboard Tack", pl: "Lewy i prawy hals", es: "Amurado a babor frente a amurado a estribor",
    fr: "Bâbord amures contre tribord amures", de: "Backbordbug gegen Steuerbordbug", it: "Mure a sinistra contro mure a dritta" },
  "windward-leeward": { ru: "Наветренный и подветренный на одном галсе", en: "Windward vs Leeward, Same Tack", pl: "Nawietrzny i zawietrzny na tym samym halsie",
    es: "Barlovento contra sotavento, misma amura", fr: "Au vent contre sous le vent, même bord", de: "Luv gegen Lee auf gleichem Bug", it: "Sopravvento contro sottovento, stesse mure" },
  "collision-avoid": { ru: "Всё идёт к столкновению", en: "Heading for a Collision", pl: "Wszystko zmierza do zderzenia", es: "Todo apunta a una colisión",
    fr: "Tout va droit à la collision", de: "Kollisionskurs", it: "Rotta di collisione" },
  "start-line": { ru: "Стартовая линия", en: "Start Line", pl: "Linia startu", es: "Línea de salida", fr: "Ligne de départ", de: "Startlinie", it: "Linea di partenza" },
};
