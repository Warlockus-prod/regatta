import { words } from "../../../src/lib/product/catalog";
import { DIFFICULTY_CONFIG, type Difficulty } from "../../../src/app/game/config";
import missionData from "../data/missions.json";

/**
 * M1-1: the app asks the race setup once, in the Race hub. The hub hands it to
 * the shared race in the query (`difficulty` and `wind`, or `mission`), which
 * raceEntryQuery forwards; the race then starts without its own menu. The mode
 * and the venue are picked in the same hub (VenuePicker).
 */
export type HubPreset = "learn" | "free" | "mission";
export type HubWind = "light" | "medium" | "heavy";
export interface HubRaceSetup { preset: HubPreset; difficulty: Difficulty; wind: HubWind; missionId: string | null }
export interface HubMission { id: string; emoji: string; difficulty: Difficulty; windStrength: HubWind; [field: string]: unknown }

export const hubMissions = (missionData as { missions: HubMission[] }).missions;
export const DEFAULT_HUB_SETUP: HubRaceSetup = { preset: "learn", difficulty: "easy", wind: "medium", missionId: null };
export const HUB_DIFFICULTIES = Object.keys(DIFFICULTY_CONFIG) as Difficulty[];
export const HUB_WINDS: HubWind[] = ["light", "medium", "heavy"];

/** The route the hub's start opens. A first race is always easy with medium wind. */
export function hubRaceHref(setup: HubRaceSetup): string {
  if (setup.preset === "mission") {
    const mission = hubMissions.find(m => m.id === setup.missionId) ?? hubMissions[0];
    return `/game?mission=${encodeURIComponent(mission.id)}`;
  }
  const difficulty = setup.preset === "learn" ? "easy" : setup.difficulty;
  const wind = setup.preset === "learn" ? "medium" : setup.wind;
  return `/game?difficulty=${difficulty}&wind=${wind}`;
}

/** Switching to Mission picks the first mission, so the start is never a dead button. */
export function choosePreset(setup: HubRaceSetup, preset: HubPreset): HubRaceSetup {
  if (preset === "mission") return { ...setup, preset, missionId: setup.missionId ?? hubMissions[0].id };
  return { ...setup, preset };
}

export function difficultyLabel(d: Difficulty, lang: keyof ReturnType<typeof words>): string {
  const c = DIFFICULTY_CONFIG[d];
  return { ru: c.label, en: c.labelEn, pl: c.labelPl, es: c.labelEs, fr: c.labelFr, de: c.labelDe, it: c.labelIt }[lang];
}

export const hubSetupCopy = {
  setup: words("Заезд", "Race setup", "Ustawienia wyścigu", "Configuración de la regata", "Réglages de la course", "Renn-Einstellungen", "Impostazioni della regata"),
  learn: words("Первая гонка", "First race", "Pierwszy wyścig", "Primera regata", "Première course", "Erstes Rennen", "Prima regata"),
  learnNote: words("Лёгкий уровень, средний ветер", "Easy level, medium wind", "Łatwy poziom, średni wiatr", "Nivel fácil, viento medio", "Niveau facile, vent moyen", "Leichte Stufe, mittlerer Wind", "Livello facile, vento medio"),
  free: words("Свободная", "Free race", "Wolny wyścig", "Regata libre", "Course libre", "Freies Rennen", "Regata libera"),
  mission: words("Миссия", "Mission", "Misja", "Misión", "Mission", "Mission", "Missione"),
  level: words("Сложность", "Difficulty", "Poziom", "Dificultad", "Difficulté", "Schwierigkeit", "Difficoltà"),
  wind: words("Сила ветра", "Wind strength", "Siła wiatru", "Fuerza del viento", "Force du vent", "Windstärke", "Forza del vento"),
  light: words("Слабый", "Light", "Słaby", "Flojo", "Faible", "Schwach", "Leggero"),
  medium: words("Средний", "Medium", "Średni", "Medio", "Moyen", "Mittel", "Medio"),
  heavy: words("Сильный", "Strong", "Silny", "Fuerte", "Fort", "Stark", "Forte"),
  start: words("Начать гонку", "Start the race", "Zacznij wyścig", "Empezar la regata", "Lancer la course", "Rennen starten", "Inizia la regata"),
  startFirst: words("Начать первую гонку", "Start your first race", "Zacznij pierwszy wyścig", "Empezar la primera regata", "Lancer la première course", "Erstes Rennen starten", "Inizia la prima regata"),
  startMission: words("Начать миссию", "Start the mission", "Zacznij misję", "Empezar la misión", "Lancer la mission", "Mission starten", "Inizia la missione"),
};
