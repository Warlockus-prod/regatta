import { missions } from "@/data/missions";
import { dailySettings } from "./daily-challenge";

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
