import type { Lang } from "../lib/languages";
import type { MedalGoal } from "../lib/race-medals";
import { formatRecordTime } from "../lib/best-times";
import { DIFFICULTY_CONFIG, type Difficulty } from "./race-difficulty";
import type { MedalWind } from "./race-medals";

/** Seven-language copy of the course medals (M4-5, src/lib/race-medals.ts) on
 * the solo race result screen and in the race menu. The hint switches are
 * named exactly as in the race settings (src/app/game/race-copy.ts:
 * "Route and hints", "Pro trim hints"), so the player finds what to turn off.
 * {medal} is a medal name, {time} a race time like 1:42, {course} the level
 * and the wind. Only what the race measures: a finish time and the hint
 * switches, named with where they are (the race settings). Relative imports:
 * the iOS app's Race hub reads the same copy through Metro. */
export type MedalText = Record<Lang, string>;
const w = (ru: string, en: string, pl: string, es: string, fr: string, de: string, it: string): MedalText => ({ ru, en, pl, es, fr, de, it });

export const raceMedalCopy = {
  medal: {
    bronze: w("Бронза", "Bronze", "Brąz", "Bronce", "Bronze", "Bronze", "Bronzo"),
    silver: w("Серебро", "Silver", "Srebro", "Plata", "Argent", "Silber", "Argento"),
    gold: w("Золото", "Gold", "Złoto", "Oro", "Or", "Gold", "Oro"),
  },
  wind: {
    light: w("слабый ветер", "light wind", "słaby wiatr", "viento flojo", "vent faible", "schwacher Wind", "vento leggero"),
    medium: w("средний ветер", "medium wind", "średni wiatr", "viento medio", "vent moyen", "mittlerer Wind", "vento medio"),
    heavy: w("сильный ветер", "strong wind", "silny wiatr", "viento fuerte", "vent fort", "starker Wind", "vento forte"),
  } satisfies Record<MedalWind, MedalText>,
  course: w("{level}, {wind}", "{level}, {wind}", "{level}, {wind}", "{level}, {wind}", "{level}, {wind}", "{level}, {wind}", "{level}, {wind}"),
  /** Results, the race raised the course medal. */
  newMedal: w("Новая медаль: {medal}", "New medal: {medal}", "Nowy medal: {medal}", "Nueva medalla: {medal}",
    "Nouvelle médaille : {medal}", "Neue Medaille: {medal}", "Nuova medaglia: {medal}"),
  /** Results and menu, the medal this course already has. */
  courseMedal: w("Медаль трассы: {medal}", "Course medal: {medal}", "Medal trasy: {medal}", "Medalla del recorrido: {medal}",
    "Médaille du parcours : {medal}", "Medaille der Bahn: {medal}", "Medaglia del percorso: {medal}"),
  noMedal: w("Медали на этой трассе пока нет", "No medal on this course yet", "Na tej trasie nie masz jeszcze medalu",
    "Aún no tienes medalla en este recorrido", "Pas encore de médaille sur ce parcours", "Auf dieser Bahn noch keine Medaille",
    "Ancora nessuna medaglia su questo percorso"),
  next: {
    bronze: w("Бронза за любой финиш", "Bronze for any finish", "Brąz za każdy ukończony wyścig", "Bronce por terminar la regata",
      "Bronze pour toute arrivée", "Bronze für jeden Zieleinlauf", "Bronzo per ogni arrivo"),
    silver: w("Дальше серебро: финишируй быстрее {time}", "Next, silver: finish faster than {time}",
      "Następny cel, srebro: dopłyń do mety w czasie poniżej {time}",
      "Siguiente, plata: llega en menos de {time}", "Ensuite l'argent : arrive en moins de {time}", "Als Nächstes Silber: ins Ziel unter {time}",
      "Poi l'argento: arriva in meno di {time}"),
    goldSimple: w("Дальше золото: финишируй быстрее {time} с выключенным переключателем «Путь и подсказки» в настройках гонки",
      "Next, gold: finish faster than {time} with \"Route and hints\" off in the race settings",
      "Następny cel, złoto: dopłyń do mety w czasie poniżej {time} z wyłączoną opcją \"Trasa i wskazówki\" w ustawieniach wyścigu",
      "Siguiente, oro: llega en menos de {time} con \"Ruta y consejos\" desactivado en los ajustes de la regata",
      "Ensuite l'or : arrive en moins de {time} avec \"Parcours et conseils\" désactivé dans les réglages de la course",
      "Als Nächstes Gold: ins Ziel unter {time}, mit \"Route und Hinweise\" aus in den Renneinstellungen",
      "Poi l'oro: arriva in meno di {time} con \"Rotta e consigli\" disattivato nelle impostazioni della regata"),
    goldPro: w("Дальше золото: финишируй быстрее {time} с выключенными переключателями «Путь и подсказки» и «Подсказки трима Pro» в настройках гонки",
      "Next, gold: finish faster than {time} with \"Route and hints\" and \"Pro trim hints\" off in the race settings",
      "Następny cel, złoto: dopłyń do mety w czasie poniżej {time} z wyłączonymi opcjami \"Trasa i wskazówki\" i \"Wskazówki trymu Pro\" w ustawieniach wyścigu",
      "Siguiente, oro: llega en menos de {time} con \"Ruta y consejos\" y \"Consejos de trimado Pro\" desactivados en los ajustes de la regata",
      "Ensuite l'or : arrive en moins de {time} avec \"Parcours et conseils\" et \"Conseils de réglage Pro\" désactivés dans les réglages de la course",
      "Als Nächstes Gold: ins Ziel unter {time}, mit \"Route und Hinweise\" und \"Pro-Trimmhinweise\" aus in den Renneinstellungen",
      "Poi l'oro: arriva in meno di {time} con \"Rotta e consigli\" e \"Consigli di trim Pro\" disattivati nelle impostazioni della regata"),
  },
  /** Results: the time was fast enough for gold, but hints were on. Gold needs
   * another race with them off; switching them off now grants nothing. */
  goldWithHints: w("Время было на золото, но подсказки были включены. Проплыви еще раз без них",
    "Your time was fast enough for gold, but hints were on. Race again with them off",
    "Twój czas wystarczał na złoto, ale wskazówki były włączone. Popłyń jeszcze raz bez nich",
    "Tu tiempo bastaba para el oro, pero los consejos estaban activados. Vuelve a correr sin ellos",
    "Ton temps suffisait pour l'or, mais les conseils étaient activés. Refais la course sans eux",
    "Deine Zeit hätte für Gold gereicht, aber die Hinweise waren an. Fahr das Rennen noch einmal ohne sie",
    "Il tuo tempo bastava per l'oro, ma i consigli erano attivi. Rifai la regata senza consigli"),
  /** Results, the device refused to store the medal row (storage full or blocked). */
  thisRace: w("Медаль за эту гонку: {medal}", "This race: {medal}", "Medal za ten wyścig: {medal}", "Medalla de esta regata: {medal}",
    "Médaille de cette course : {medal}", "Medaille dieses Rennens: {medal}", "Medaglia di questa regata: {medal}"),
  notSaved: w("Медаль не сохранилась на этом устройстве, в меню гонки ее не будет",
    "The medal could not be saved on this device, so the race menu will not show it",
    "Nie udało się zapisać medalu na tym urządzeniu, więc nie pojawi się w menu wyścigu",
    "No se pudo guardar la medalla en este dispositivo, así que no aparecerá en el menú de la regata",
    "La médaille n'a pas pu être enregistrée sur cet appareil : elle n'apparaîtra pas dans le menu de la course",
    "Die Medaille konnte auf diesem Gerät nicht gespeichert werden, im Rennmenü erscheint sie nicht",
    "Non è stato possibile salvare la medaglia su questo dispositivo, quindi non comparirà nel menu della regata"),
  top: w("Золото: высшая медаль этой трассы", "Gold: the top medal of this course", "Złoto: najwyższy medal tej trasy",
    "Oro: la medalla más alta de este recorrido", "Or : la plus haute médaille de ce parcours", "Gold: die höchste Medaille dieser Bahn",
    "Oro: la medaglia più alta di questo percorso"),
} as const;

export function fillMedal(text: string, values: Record<string, string>): string {
  return text.replace(/\{(\w+)\}/g, (all, key: string) => values[key] ?? all);
}

/** "Easy, medium wind": the level and the wind of a medal course. */
export function medalCourseText(difficulty: Difficulty, wind: MedalWind, lang: Lang): string {
  const cfg = DIFFICULTY_CONFIG[difficulty];
  const level = ({ ru: cfg.label, en: cfg.labelEn, pl: cfg.labelPl, es: cfg.labelEs, fr: cfg.labelFr, de: cfg.labelDe, it: cfg.labelIt } as Record<Lang, string>)[lang];
  return fillMedal(raceMedalCopy.course[lang], { level, wind: raceMedalCopy.wind[wind][lang] });
}

/** The next goal as one sentence; gold names the hint switches of the mode. */
export function medalGoalText(goal: MedalGoal, mode: "simple" | "pro", lang: Lang): string {
  const time = formatRecordTime(goal.underSec);
  if (goal.medal === "bronze") return raceMedalCopy.next.bronze[lang];
  if (goal.medal === "silver") return fillMedal(raceMedalCopy.next.silver[lang], { time });
  return fillMedal((mode === "pro" ? raceMedalCopy.next.goldPro : raceMedalCopy.next.goldSimple)[lang], { time });
}
