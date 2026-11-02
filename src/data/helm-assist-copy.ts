// Copy of the race's helm assists (package 13, ADR-0022): the on-screen
// arrows, the tack or gybe button, BEST VMG, the angle hold, the VMG line,
// the race settings choice and the briefing line, in 7 languages. Read only
// by the race chunk (the cockpit, the race settings, the briefing); the names
// of the three helm controls are UI_TERMS (src/lib/product/ui-terms.ts), which
// the app's Settings read too. Terms: scripts/sailing-glossary.md (VMG is
// measured against the wind, VMC against the mark).

import type { Lang } from "../lib/languages";

type Text = Record<Lang, string>;

/** The race helm's three controls, part of the UI dictionary (ui-terms.ts):
 * the site's race settings and the app's race hub and Settings read these.
 * Wheels and sliders are the trainers' own words for their modes. */
export const HELM_CONTROL_TERMS = {
  arrows: { ru: "Стрелки", en: "Arrows", pl: "Strzałki", es: "Flechas", fr: "Flèches", de: "Pfeile", it: "Frecce" },
  wheels: { ru: "Штурвалы", en: "Wheels", pl: "Koła", es: "Ruedas", fr: "Roues", de: "Räder", it: "Ruote" },
  sliders: { ru: "Ползунки", en: "Sliders", pl: "Suwaki", es: "Deslizadores", fr: "Curseurs", de: "Schieberegler", it: "Cursori" },
} as const satisfies Record<"arrows" | "wheels" | "sliders", Text>;

export const HELM_ASSIST_COPY = {
  /** The on-screen arrows' names: Simple moves the course, Pro the rudder (R-6). */
  courseLeft: { ru: "Курс левее", en: "Course to port", pl: "Kurs w lewo", es: "Rumbo a babor", fr: "Cap à bâbord", de: "Kurs nach Backbord", it: "Rotta a sinistra" },
  courseRight: { ru: "Курс правее", en: "Course to starboard", pl: "Kurs w prawo", es: "Rumbo a estribor", fr: "Cap à tribord", de: "Kurs nach Steuerbord", it: "Rotta a dritta" },
  rudderLeft: { ru: "Руль влево", en: "Rudder to port", pl: "Ster w lewo", es: "Timón a babor", fr: "Barre à bâbord", de: "Ruder nach Backbord", it: "Timone a sinistra" },
  rudderRight: { ru: "Руль вправо", en: "Rudder to starboard", pl: "Ster w prawo", es: "Timón a estribor", fr: "Barre à tribord", de: "Ruder nach Steuerbord", it: "Timone a dritta" },
  /** The turn button, by the angle the boat sails now. */
  tack: { ru: "Поворот", en: "Tack", pl: "Przez sztag", es: "Virar", fr: "Virer", de: "Wende", it: "Virata" },
  gybe: { ru: "Фордевинд", en: "Gybe", pl: "Przez rufę", es: "Trasluchar", fr: "Empanner", de: "Halse", it: "Abbattuta" },
  /** While the boat turns, the button names its new course: "{turn}: new course {n}". */
  turning: { ru: "{turn}: новый курс {n}", en: "{turn}: new course {n}", pl: "{turn}: nowy kurs {n}", es: "{turn}: nuevo rumbo {n}", fr: "{turn} : nouveau cap {n}", de: "{turn}: neuer Kurs {n}", it: "{turn}: nuova rotta {n}" },
  /** BEST VMG: Pro reads the sailing term, Simple the plain words. */
  bestVmgPro: { ru: "BEST VMG", en: "BEST VMG", pl: "BEST VMG", es: "BEST VMG", fr: "BEST VMG", de: "BEST VMG", it: "BEST VMG" },
  bestVmgSimple: { ru: "Лучший угол", en: "Best angle", pl: "Najlepszy kąt", es: "Mejor ángulo", fr: "Meilleur angle", de: "Bester Winkel", it: "Angolo migliore" },
  /** R-10: the former course hold now holds the angle to the wind. */
  holdAngle: { ru: "Держать угол", en: "Hold angle", pl: "Trzymaj kąt", es: "Mantener ángulo", fr: "Garder l'angle", de: "Winkel halten", it: "Mantieni angolo" },
  /** Course readout of the Simple arrows. */
  course: { ru: "Курс", en: "Course", pl: "Kurs", es: "Rumbo", fr: "Cap", de: "Kurs", it: "Rotta" },
  angle: { ru: "Угол к ветру", en: "Angle to wind", pl: "Kąt do wiatru", es: "Ángulo al viento", fr: "Angle au vent", de: "Winkel zum Wind", it: "Angolo al vento" },
  /** The VMG line: Pro reads VMG and VMC; Simple says against what it is measured. */
  vmgUp: { ru: "К ветру", en: "Upwind", pl: "Pod wiatr", es: "Al viento", fr: "Au vent", de: "Gegen den Wind", it: "Al vento" },
  vmgDown: { ru: "От ветра", en: "Downwind", pl: "Z wiatrem", es: "A favor", fr: "Au portant", de: "Vor dem Wind", it: "In poppa" },
  vmcMark: { ru: "К знаку", en: "To the mark", pl: "Do znaku", es: "A la baliza", fr: "Vers la bouée", de: "Zur Marke", it: "Verso la boa" },
  trendUp: { ru: "растет", en: "rising", pl: "rośnie", es: "sube", fr: "monte", de: "steigt", it: "sale" },
  trendDown: { ru: "падает", en: "falling", pl: "spada", es: "baja", fr: "baisse", de: "fällt", it: "scende" },
  trendFlat: { ru: "ровно", en: "steady", pl: "bez zmian", es: "estable", fr: "stable", de: "gleich", it: "stabile" },
  target: { ru: "цель", en: "target", pl: "cel", es: "objetivo", fr: "cible", de: "Ziel", it: "obiettivo" },
  /** Notices in the coach line. */
  vmgOff: {
    ru: "Лучший угол выключен: ты взял руль.", en: "Best angle is off: you took the helm.", pl: "Najlepszy kąt wyłączony: przejąłeś ster.",
    es: "Mejor ángulo apagado: has tomado el timón.", fr: "Meilleur angle coupé : tu as repris la barre.", de: "Bester Winkel aus: du hast das Ruder übernommen.", it: "Angolo migliore spento: hai preso il timone.",
  },
  irons: {
    ru: "Лодка в левентике: уваливаемся на крутой бейдевинд.", en: "In irons: bearing away to close-hauled.", pl: "Łódź w łopocie: odpadamy na bajdewind.",
    es: "Proa al viento: arribamos a ceñida.", fr: "Bout au vent : on abat au près.", de: "Im Wind stehen geblieben: wir fallen ab auf Am-Wind-Kurs.", it: "Prua al vento: poggiamo di bolina.",
  },
  /** Race settings before the start (RaceSetupSettings) and the app's Settings. */
  settingsTitle: { ru: "Руль в гонке", en: "Race helm", pl: "Ster w wyścigu", es: "Timón en la regata", fr: "Barre en course", de: "Steuer im Rennen", it: "Timone in regata" },
  settingsNote: {
    ru: "Стрелки: в Простом поворачивают курс, в Pro это перо руля. Лучший угол снимает золото.",
    en: "Arrows: in Simple they turn the course, in Pro they are the rudder. Best angle costs gold.",
    pl: "Strzałki: w trybie Prosty zmieniają kurs, w Pro są płetwą steru. Najlepszy kąt odbiera złoto.",
    es: "Flechas: en Sencillo giran el rumbo, en Pro son la pala del timón. El mejor ángulo quita el oro.",
    fr: "Flèches : en Simple elles tournent le cap, en Pro ce sont le safran. Le meilleur angle coûte l'or.",
    de: "Pfeile: in Einfach drehen sie den Kurs, in Pro sind sie das Ruderblatt. Bester Winkel kostet Gold.",
    it: "Frecce: in Semplice girano la rotta, in Pro sono la pala del timone. L'angolo migliore toglie l'oro.",
  },
  /** The briefing's helm line, by level. */
  briefingSimple: {
    ru: "Руль: стрелки поворачивают курс, лодка держит его. «Поворот» сам переводит лодку на другой галс, «Лучший угол» держит лучший угол к ветру; с ним золота нет.",
    en: "Helm: the arrows turn the course and the boat holds it. \"Tack\" puts the boat on the other tack by itself, \"Best angle\" holds the best angle to the wind; with it there is no gold.",
    pl: "Ster: strzałki zmieniają kurs, łódź go trzyma. \"Przez sztag\" sam przenosi łódź na drugi hals, \"Najlepszy kąt\" trzyma najlepszy kąt do wiatru; z nim nie ma złota.",
    es: "Timón: las flechas giran el rumbo y el barco lo mantiene. \"Virar\" cambia de amura solo, \"Mejor ángulo\" mantiene el mejor ángulo al viento; con él no hay oro.",
    fr: "Barre : les flèches tournent le cap et le bateau le tient. \"Virer\" passe seul sur l'autre amure, \"Meilleur angle\" tient le meilleur angle au vent ; avec lui, pas d'or.",
    de: "Steuer: die Pfeile drehen den Kurs, das Boot hält ihn. \"Wende\" bringt das Boot selbst auf den anderen Bug, \"Bester Winkel\" hält den besten Winkel zum Wind; damit gibt es kein Gold.",
    it: "Timone: le frecce girano la rotta e la barca la mantiene. \"Virata\" porta la barca da sola sull'altro bordo, \"Angolo migliore\" tiene l'angolo migliore al vento; con esso niente oro.",
  },
  briefingPro: {
    ru: "Руль: стрелки это перо руля, шкоты твои. Кнопка поворота и BEST VMG только рулят, и лодке нужен ход; с BEST VMG золота нет.",
    en: "Helm: the arrows are the rudder, the sheets are yours. The tack button and BEST VMG only steer, and the boat needs way on; with BEST VMG there is no gold.",
    pl: "Ster: strzałki są płetwą steru, szoty są twoje. Przycisk zwrotu i BEST VMG tylko sterują, a łódź potrzebuje prędkości; z BEST VMG nie ma złota.",
    es: "Timón: las flechas son la pala del timón, las escotas son tuyas. El botón de virar y BEST VMG solo gobiernan y el barco necesita arrancada; con BEST VMG no hay oro.",
    fr: "Barre : les flèches sont le safran, les écoutes sont à toi. Le bouton de virement et BEST VMG ne font que barrer, et il faut de l'erre ; avec BEST VMG, pas d'or.",
    de: "Steuer: die Pfeile sind das Ruderblatt, die Schoten bleiben bei dir. Wendeknopf und BEST VMG steuern nur, und das Boot braucht Fahrt; mit BEST VMG gibt es kein Gold.",
    it: "Timone: le frecce sono la pala del timone, le scotte sono tue. Il pulsante di virata e BEST VMG governano soltanto e la barca deve avere abbrivio; con BEST VMG niente oro.",
  },
} as const satisfies Record<string, Text>;

export type HelmAssistCopyKey = keyof typeof HELM_ASSIST_COPY;
