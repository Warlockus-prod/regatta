// Only completed, explicitly recorded simulator exercises belong here.
// This is local learning evidence, never certification of real-world skill.
export const PRACTICE_RESULTS_KEY = "regatta.sailing.practice.v1";
export const practiceIds = ["mainsheet", "twist", "depth", "line-bench"] as const;
export type PracticeId = typeof practiceIds[number];
export interface PracticeResults { version: 1; completed: Partial<Record<PracticeId, number>> }
export const emptyPracticeResults = (): PracticeResults => ({ version: 1, completed: {} });
export function readPracticeResults(raw: string | null): PracticeResults {
  const result = emptyPracticeResults();
  try {
    const value = JSON.parse(raw ?? "null");
    if (value?.version !== 1 || !value.completed || typeof value.completed !== "object") return result;
    for (const id of practiceIds) {
      const at = value.completed[id];
      if (typeof at === "number" && Number.isSafeInteger(at) && at > 0) result.completed[id] = at;
    }
  } catch { /* Do not invent successful attempts from damaged storage. */ }
  return result;
}
export function mergePracticeResults(a: PracticeResults, b: PracticeResults): PracticeResults {
  const result = emptyPracticeResults();
  for (const id of practiceIds) {
    const at = Math.max(a.completed[id] ?? 0, b.completed[id] ?? 0);
    if (at) result.completed[id] = at;
  }
  return result;
}
export const lessonPracticeIds = (id: string): PracticeId[] => id === "mainsheet" ? ["mainsheet"] : id === "outhaul" ? ["twist", "depth"] : id === "winch-clutch" ? ["line-bench"] : [];
