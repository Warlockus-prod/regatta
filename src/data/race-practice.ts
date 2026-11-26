// M4-2 debrief to practice: every mistake the race judge or the race coach
// names on the finish screen leads to ONE practice, and the practice leads
// back to the race. One source for the website and the app: the web builds
// its links from here (src/lib/race-practice.ts), the app validates the
// in-app destinations against the same targets (mobile/src/navigation/race-entry.ts).
//
// A target is a stable id of existing content, never a URL:
//   - "drill": a drill of the trim trainer (src/data/drills.ts, web platform);
//   - "rule": a rule card (src/data/rules.ts);
//   - "lesson": a foundation lesson (src/data/bootcamp-index.ts), opened on
//     its "understand" step.
// race-practice.test.ts checks that every judge lesson and every coach
// mistake kind maps to an id that exists, and that the rule titles below are
// the card titles of rules.ts word for word. Ids and titles only: importing
// rules.ts (145 KB) or drills.ts into the race would grow the race bundle.

import type { CoachGoalKind } from "../lib/fallback-coach";
import type { RaceJudgeLesson } from "../lib/race-judge";
import { words, type Label } from "../lib/product/catalog";

export type RacePracticeKind = "drill" | "rule" | "lesson";
export interface RacePracticeTarget { kind: RacePracticeKind; id: string }

/** The start jostle (M0-3) is a few penalty-free touches right after the
 * signal: not the player's mistake, so it has no lesson and no practice. */
export type PracticedJudgeLesson = Exclude<RaceJudgeLesson, "start-jostle">;

/** Judge lesson (src/lib/race-judge.ts) -> practice. The rule the incident
 * names decides the card: rule 10 port/starboard, 11 windward/leeward, 12
 * clear astern, 14 avoiding contact, the start line, rule 31 touching a mark
 * (the penalty card explains the one-turn penalty). Which side to leave the
 * mark is taught by the mini-race lesson (course and rounding side). */
export const RACE_JUDGE_PRACTICE: Record<PracticedJudgeLesson, RacePracticeTarget> = {
  "keep-clear-port": { kind: "rule", id: "port-vs-starboard" },
  "keep-clear-windward": { kind: "rule", id: "windward-leeward" },
  "keep-clear-astern": { kind: "rule", id: "overtaking" },
  "avoid-contact-right-of-way": { kind: "rule", id: "collision-avoid" },
  "avoid-contact-unclear": { kind: "rule", id: "collision-avoid" },
  "return-behind-line": { kind: "rule", id: "start-line" },
  "clean-start": { kind: "rule", id: "start-line" },
  "mark-clearance": { kind: "rule", id: "penalty" },
  "round-to-port": { kind: "lesson", id: "mini-race" },
};

/** Coach mistake kind (src/lib/fallback-coach.ts) -> practice. The trim
 * trainer has no drill for steering angles, so these open the lessons that
 * teach them: the no-go zone, tacking through it with speed, and VMG on a beat. */
export const RACE_COACH_PRACTICE: Record<CoachGoalKind, RacePracticeTarget> = {
  "no-go": { kind: "lesson", id: "wind-direction" },
  tacks: { kind: "lesson", id: "tacking" },
  "close-hauled": { kind: "lesson", id: "vmg-beating" },
};

/** Card titles of the rules above, the same words as src/data/rules.ts. */
export const RACE_PRACTICE_RULE_TITLES: Record<string, Label> = {
  "port-vs-starboard": words("Левый и правый галс", "Port vs Starboard Tack", "Lewy i prawy hals", "Amurado a babor frente a amurado a estribor", "Bâbord amures contre tribord amures", "Backbordbug gegen Steuerbordbug", "Mure a sinistra contro mure a dritta"),
  "windward-leeward": words("Наветренный и подветренный на одном галсе", "Windward vs Leeward, Same Tack", "Nawietrzny i zawietrzny na tym samym halsie", "Barlovento contra sotavento, misma amura", "Au vent contre sous le vent, même bord", "Luv gegen Lee auf gleichem Bug", "Sopravvento contro sottovento, stesse mure"),
  overtaking: words("Обгоняешь сзади", "Overtaking from Astern", "Wyprzedzasz od tyłu", "Adelantas desde atrás", "Tu rattrapes par l'arrière", "Überholen von achtern", "Sorpassi da poppa"),
  "collision-avoid": words("Всё идёт к столкновению", "Heading for a Collision", "Wszystko zmierza do zderzenia", "Todo apunta a una colisión", "Tout va droit à la collision", "Kollisionskurs", "Rotta di collisione"),
  "start-line": words("Стартовая линия", "Start Line", "Linia startu", "Línea de salida", "Ligne de départ", "Startlinie", "Linea di partenza"),
  penalty: words("Сделал ошибку - что дальше?", "Made a Mistake - Now What?", "Popełniłeś błąd - co dalej?", "Has cometido un error: ¿y ahora qué?", "Tu as fait une erreur : et maintenant ?", "Fehler gemacht - was nun?", "Hai sbagliato: e adesso?"),
};

/** Titles of the trainer drills the race links to (src/data/drills.ts). None yet. */
export const RACE_PRACTICE_DRILL_TITLES: Record<string, Label> = {};

export const RACE_PRACTICE_COPY = {
  /** The finish screen's practice action for the main mistake. */
  practise: words("Потренировать", "Practise", "Przećwicz", "Practicar", "S'entraîner", "Üben", "Allenati"),
  rule: words("Карточка правила", "Rule card", "Karta przepisu", "Ficha de regla", "Fiche de règle", "Regelkarte", "Scheda della regola"),
  lesson: words("Урок", "Lesson", "Lekcja", "Lección", "Leçon", "Lektion", "Lezione"),
  drill: words("Упражнение в тренажере", "Trainer drill", "Ćwiczenie w trenażerze", "Ejercicio del simulador", "Exercice du simulateur", "Übung im Trainer", "Esercizio del simulatore"),
  /** On the practice page: back to the race the player came from. */
  backToRace: words("Вернуться к гонке", "Back to the race", "Wróć do wyścigu", "Volver a la regata", "Retour à la course", "Zurück zum Rennen", "Torna alla regata"),
  /** After a race opened from a foundation lesson. */
  backToLesson: words("Вернуться к уроку", "Back to the lesson", "Wróć do lekcji", "Volver a la lección", "Retour à la leçon", "Zurück zur Lektion", "Torna alla lezione"),
  nextLesson: words("Следующий урок", "Next lesson", "Następna lekcja", "Siguiente lección", "Leçon suivante", "Nächste Lektion", "Lezione successiva"),
  /** The mini race is the last foundation lesson: its next step is the sails course. */
  nextCourse: words("Следующий курс", "Next course", "Następny kurs", "Siguiente curso", "Cours suivant", "Nächster Kurs", "Corso successivo"),
} as const satisfies Record<string, Label>;
