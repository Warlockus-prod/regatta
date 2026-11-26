import { words, type Language } from "./catalog";
import type { Difficulty } from "../../data/race-difficulty";
import type { LastRaceSetup, RaceWind } from "../race-last-setup";

/**
 * Package 9 (audit B10): the Race hub of the site and the app has one "Play"
 * that starts with the last used settings; the choices sit under "Change".
 * The app's hub (mobile/src/navigation/ProductHub.tsx) uses the same words.
 *
 * The level names repeat src/data/race-difficulty.ts (a test keeps them equal)
 * so the hub does not bundle the race's level descriptions.
 */
export const raceHubCopy = {
  play: words("Играть", "Play", "Graj", "Jugar", "Jouer", "Spielen", "Gioca"),
  change: words("Изменить", "Change", "Zmień", "Cambiar", "Modifier", "Ändern", "Modifica"),
  mission: words("Миссия", "Mission", "Misja", "Misión", "Mission", "Mission", "Missione"),
  level: {
    easy: words("Лёгкий", "Easy", "Łatwy", "Fácil", "Facile", "Leicht", "Facile"),
    medium: words("Средний", "Medium", "Średni", "Medio", "Moyen", "Mittel", "Medio"),
    hard: words("Сложный", "Hard", "Trudny", "Difícil", "Difficile", "Schwer", "Difficile"),
  } satisfies Record<Difficulty, ReturnType<typeof words>>,
  wind: {
    light: words("слабый ветер", "light wind", "słaby wiatr", "viento flojo", "vent faible", "schwacher Wind", "vento leggero"),
    medium: words("средний ветер", "medium wind", "średni wiatr", "viento medio", "vent moyen", "mittlerer Wind", "vento medio"),
    heavy: words("сильный ветер", "strong wind", "silny wiatr", "viento fuerte", "vent fort", "starker Wind", "vento forte"),
  } satisfies Record<RaceWind, ReturnType<typeof words>>,
};

/** "Easy · medium wind" for a free race, "Mission" for a mission. */
export function raceSetupSummary(setup: LastRaceSetup, lang: Language): string {
  if (setup.kind === "mission") return raceHubCopy.mission[lang];
  return `${raceHubCopy.level[setup.difficulty][lang]} · ${raceHubCopy.wind[setup.wind][lang]}`;
}
