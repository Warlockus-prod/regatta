import type { Lang } from "../lib/languages";

/** F1 (TestFlight 74 feedback): the race menu's easy preset and its start,
 * the same words on the website lobby (src/app/game/GameMenu.tsx) and the
 * app's Race hub (mobile/src/navigation/race-setup.ts). Before the first solo
 * race on this device the preset is "First race" and the start "Start your
 * first race"; once a race has ended (src/lib/race-next-step.ts
 * hasRacedBefore) the same easy preset with medium wind is "Easy race" and
 * the start a plain "Start the race". Relative imports: the app reads it
 * through Metro. */
export type RaceStartText = Record<Lang, string>;
const w = (ru: string, en: string, pl: string, es: string, fr: string, de: string, it: string): RaceStartText => ({ ru, en, pl, es, fr, de, it });

export const raceStartCopy = {
  firstRace: w("Первая гонка", "First race", "Pierwszy wyścig", "Primera regata", "Première course", "Erstes Rennen", "Prima regata"),
  easyRace: w("Лёгкая гонка", "Easy race", "Łatwy wyścig", "Regata fácil", "Course facile", "Leichtes Rennen", "Regata facile"),
  startFirst: w("Начать первую гонку", "Start your first race", "Zacznij pierwszy wyścig", "Empezar la primera regata", "Lancer la première course", "Erstes Rennen starten", "Inizia la prima regata"),
  start: w("Начать гонку", "Start the race", "Zacznij wyścig", "Empezar la regata", "Lancer la course", "Rennen starten", "Inizia la regata"),
  /** The website preset's longer line (wide screens only). */
  firstRaceDesc: w(
    "Спокойные противники, плавные повороты. Для первого опыта гонки.",
    "Calm opponents, gentle turns. For a first racing experience.",
    "Spokojni rywale, łagodne zwroty. Na pierwsze regatowe doświadczenie.",
    "Rivales tranquilos, viradas suaves. Para tu primera experiencia de regata.",
    "Adversaires calmes, virements en douceur. Pour une première expérience de course.",
    "Ruhige Gegner, sanfte Wenden. Für dein erstes Regatta-Erlebnis.",
    "Avversari tranquilli, virate morbide. Per una prima esperienza di regata."),
  easyRaceDesc: w(
    "Спокойные противники, плавные повороты. Чтобы размяться или спокойно потренироваться.",
    "Calm opponents, gentle turns. To warm up or practise at an easy pace.",
    "Spokojni rywale, łagodne zwroty. Na rozgrzewkę albo spokojny trening.",
    "Rivales tranquilos, viradas suaves. Para calentar o entrenar con calma.",
    "Adversaires calmes, virements en douceur. Pour s'échauffer ou s'entraîner tranquillement.",
    "Ruhige Gegner, sanfte Wenden. Zum Aufwärmen oder für ein ruhiges Training.",
    "Avversari tranquilli, virate morbide. Per scaldarti o allenarti con calma."),
};

/** The easy preset's name and its start, by whether this device has raced. */
export function easyPresetText(racedBefore: boolean, lang: Lang): { title: string; start: string; desc: string } {
  return racedBefore
    ? { title: raceStartCopy.easyRace[lang], start: raceStartCopy.start[lang], desc: raceStartCopy.easyRaceDesc[lang] }
    : { title: raceStartCopy.firstRace[lang], start: raceStartCopy.startFirst[lang], desc: raceStartCopy.firstRaceDesc[lang] };
}
