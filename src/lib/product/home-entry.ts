import { words } from "./catalog";

/**
 * Package 9 (audit K1, K2): the first entry of the site and the app.
 *
 * A new visitor sees one value line, a real frame of the race scene, ONE
 * primary action ("Start from scratch") and a quieter "Go straight to a
 * race". The radio (SRC) and motorboat (sternik) courses are separate, quieter
 * entrances below (owner decision R-14: the core user is a beginner before the
 * first week on a yacht).
 *
 * "Continue" replaces the start only after a meaningful step: a passed theory
 * check or a completed lesson. Opening a page, a lesson or another course is
 * not one, so a curious look at /sternik never takes over the home.
 *
 * No platform or React dependencies: the website home (src/app/page.tsx) and
 * the app home (mobile/app/index.tsx through mobile/src/home/copy.ts) use the
 * same words and the same rule.
 */

/** Evidence of a meaningful step, counted by each platform from its storage. */
export interface StepEvidence {
  /** "From scratch" lessons with a passed check (web) or passed / marked done (app). */
  lessonsPassed: number;
  /** Sail course lessons whose theory check was answered correctly. */
  sailChecksPassed: number;
}

export function hasMeaningfulStep(evidence: StepEvidence): boolean {
  return evidence.lessonsPassed > 0 || evidence.sailChecksPassed > 0;
}

/** The local still of the real race scene (Göcek, at the start), no external asset. */
export const SCENE_STILL_WEB = "/design-v3/race-scene.webp";
export const SCENE_STILL_SIZE = { width: 1200, height: 860 } as const;

export const homeEntryCopy = {
  value: words(
    "Научись ходить под парусом за неделю",
    "Learn to sail in a week",
    "Naucz się żeglować w tydzień",
    "Aprende a navegar a vela en una semana",
    "Apprends la voile en une semaine",
    "Segeln lernen in einer Woche",
    "Impara ad andare a vela in una settimana",
  ),
  valueDetail: words(
    "Короткие уроки, тренажёр на настоящей физике и гонка с соперниками.",
    "Short lessons, a simulator built on real sailing physics and races against rivals.",
    "Krótkie lekcje, symulator oparty na prawdziwej fizyce żeglowania i regaty z rywalami.",
    "Lecciones cortas, un simulador con física real de vela y regatas contra rivales.",
    "Des leçons courtes, un simulateur fondé sur la vraie physique de la voile et des courses contre des adversaires.",
    "Kurze Lektionen, ein Simulator mit echter Segelphysik und Rennen gegen Gegner.",
    "Lezioni brevi, un simulatore con la vera fisica della vela e regate contro avversari.",
  ),
  startFromScratch: words("Начать с нуля", "Start from scratch", "Zacznij od zera", "Empezar desde cero", "Commencer de zéro", "Bei null anfangen", "Inizia da zero"),
  straightToRace: words("Сразу в гонку", "Go straight to a race", "Od razu do wyścigu", "Directo a una regata", "Directement en course", "Direkt ins Rennen", "Subito in regata"),
  sceneCaption: words("Кадр из гонки в игре", "A frame from the race in the game", "Kadr z wyścigu w grze", "Imagen de la regata del juego", "Image de la course du jeu", "Szene aus dem Rennen im Spiel", "Un fotogramma della regata nel gioco"),
  sceneAlt: words(
    "Яхта игрока на старте рядом с судейским судном, справа соперник, вдали острова",
    "The player's yacht at the start next to the committee boat, a rival on the right, islands in the distance",
    "Jacht gracza na starcie obok statku komisji, rywal po prawej, w oddali wyspy",
    "El velero del jugador en la salida junto al barco del comité, un rival a la derecha y unas islas al fondo",
    "Le voilier du joueur au départ près du bateau comité, un adversaire à droite, des îles au loin",
    "Die Yacht des Spielers am Start neben dem Startschiff, rechts ein Gegner, in der Ferne Inseln",
    "La barca del giocatore alla partenza accanto alla barca giuria, un avversario a destra e isole in lontananza",
  ),
  examQuestion: words("Готовишься к экзамену?", "Preparing for an exam?", "Przygotowujesz się do egzaminu?", "¿Preparas un examen?", "Tu prépares un examen ?", "Bereitest du dich auf eine Prüfung vor?", "Ti prepari a un esame?"),
};
