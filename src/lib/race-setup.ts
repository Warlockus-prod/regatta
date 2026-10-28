import { missions } from "@/data/missions";
import { dailySettings } from "./daily-challenge";
import type { SavedRaceSetup, WindStrength } from "./race-resume";

/** Preserve the existing wind multipliers when initializing a restored race. */
export function raceSetupWindMultiplier(wind: WindStrength): number {
  return wind === "light" ? .65 : wind === "heavy" ? 1.3 : 1;
}

/** Explicit activity links own their setup. Generic native condition/mode
 * parameters still allow a learner to choose a saved briefing restart. */
export function planRaceResume(saved: SavedRaceSetup, query: URLSearchParams, currentMode: "simple" | "pro"): SavedRaceSetup | null {
  if (["daily", "mission", "fromLesson", "replay", "replayId", "profile", "courseProfile"].some(key => query.has(key))) return null;
  const mode = saved.mode ?? currentMode;
  if (saved.missionId !== null) {
    const mission = missions.find(item => item.id === saved.missionId);
    return mission ? { ...saved, difficulty: mission.difficulty, windStrength: mission.windStrength, mode } : null;
  }
  return { ...saved, mode };
}

/** A linked mission/day owns its conditions; generic options cannot rewrite it. */
export function linkedRaceSetup(query: URLSearchParams): { difficulty: "easy" | "medium" | "hard"; windStrength: "light" | "medium" | "heavy"; missionId: string | null; dailyDay: string | null } | null {
  const day = query.get("daily");
  if (day) {
    try { const daily = dailySettings(day); return { ...daily, dailyDay: daily.day }; }
    catch { /* Invalid dates do not create a daily submission. */ }
  }
  const mission = missions.find(item => item.id === query.get("mission"));
  if (mission) return { difficulty: mission.difficulty, windStrength: mission.windStrength, missionId: mission.id, dailyDay: null };
  const difficulty = query.get("difficulty");
  const wind = query.get("wind");
  if (!difficulty && !wind) return null;
  return {
    difficulty: difficulty === "easy" || difficulty === "hard" ? difficulty : "medium" as const,
    windStrength: wind === "light" || wind === "heavy" ? wind : "medium" as const,
    missionId: null,
    dailyDay: null,
  };
}
