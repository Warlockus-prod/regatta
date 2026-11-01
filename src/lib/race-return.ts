// M4-2: the race a practice page returns to. A practice link from the race
// finish screen carries it in two query parameters, never as a URL:
// `fromRace` names the race setup ("medium.light", "mission.<id>",
// "daily.<YYYY-MM-DD>" or "menu") and `raceLesson` the foundation lesson the
// race was opened from. "Back to the race" (src/components/RaceReturn.tsx)
// rebuilds the /game link from these validated values, so a lesson race
// returns to its lesson after a detour through practice. Light on purpose:
// practice pages import it (ids of lessons only). Pure: no React, no window.

import { isFoundationLesson } from "./learning/foundation-navigation";

export type RaceReturnSetup =
  | { kind: "conditions"; difficulty: "easy" | "medium" | "hard"; wind: "light" | "medium" | "heavy" }
  | { kind: "mission"; id: string }
  | { kind: "daily"; day: string }
  | { kind: "menu" };

/** The race a practice page returns to. */
export interface RaceReturn { setup: RaceReturnSetup; lesson: string | null }

const DIFFICULTIES = ["easy", "medium", "hard"] as const;
const WINDS = ["light", "medium", "heavy"] as const;
const SAFE_ID = /^[a-zA-Z0-9_-]{1,80}$/;
const DAY = /^\d{4}-\d{2}-\d{2}$/;

export function encodeRaceSetup(setup: RaceReturnSetup): string {
  switch (setup.kind) {
    case "conditions": return `${setup.difficulty}.${setup.wind}`;
    case "mission": return `mission.${setup.id}`;
    case "daily": return `daily.${setup.day}`;
    case "menu": return "menu";
  }
}

export function decodeRaceSetup(token: string | null): RaceReturnSetup | null {
  if (!token || token.length > 100) return null;
  if (token === "menu") return { kind: "menu" };
  const [head, value, ...rest] = token.split(".");
  if (rest.length || value === undefined) return null;
  if (head === "mission") return SAFE_ID.test(value) ? { kind: "mission", id: value } : null;
  if (head === "daily") return DAY.test(value) ? { kind: "daily", day: value } : null;
  const difficulty = DIFFICULTIES.find(d => d === head);
  const wind = WINDS.find(w => w === value);
  return difficulty && wind ? { kind: "conditions", difficulty, wind } : null;
}

/** The race setup the finish screen came from, as a return. A mission or a
 * daily race owns its conditions (race-setup.ts linkedRaceSetup). */
export function raceReturnFor(input: { difficulty: "easy" | "medium" | "hard"; windStrength: "light" | "medium" | "heavy"; missionId?: string | null; dailyDay?: string | null; fromLesson?: string | null }): RaceReturn {
  const setup: RaceReturnSetup = input.missionId && SAFE_ID.test(input.missionId) ? { kind: "mission", id: input.missionId }
    : input.dailyDay && DAY.test(input.dailyDay) ? { kind: "daily", day: input.dailyDay }
    : { kind: "conditions", difficulty: input.difficulty, wind: input.windStrength };
  return { setup, lesson: isFoundationLesson(input.fromLesson) ? input.fromLesson : null };
}

/** The race to return to, read from a practice page's query. Inside the app
 * or an embed there is none: the native back button returns there. */
export function readRaceReturn(search: string, native = false): RaceReturn | null {
  const query = new URLSearchParams(search);
  if (native || query.get("embed") === "1") return null;
  const setup = decodeRaceSetup(query.get("fromRace"));
  if (!setup) return null;
  const lesson = query.get("raceLesson");
  return { setup, lesson: isFoundationLesson(lesson) ? lesson : null };
}

/** The /game link of a return: the same setup preselected, and the lesson
 * return of a lesson race kept. */
export function raceReturnHref(ret: RaceReturn): string {
  const query = new URLSearchParams();
  const { setup } = ret;
  if (setup.kind === "conditions") { query.set("difficulty", setup.difficulty); query.set("wind", setup.wind); }
  else if (setup.kind === "mission") query.set("mission", setup.id);
  else if (setup.kind === "daily") query.set("daily", setup.day);
  if (ret.lesson) query.set("fromLesson", ret.lesson);
  const search = query.toString();
  return `/game${search ? `?${search}` : ""}`;
}
