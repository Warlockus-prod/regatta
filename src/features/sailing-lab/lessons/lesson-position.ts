import { findSailLesson } from "../../../data/sailing-lab/course";
import { lessonSteps, type LessonStep } from "../../../data/sailing-lab/learning-path";
import { diagramOptions } from "./diagrams";

// Navigation is deliberately separate from theory grades and practice evidence.
export const LESSON_POSITION_KEY = "regatta.sailing.position.v1";
export interface LessonPosition { step: LessonStep; diagram: number }
export interface LessonPositions { version: 1; current: string | null; lessons: Record<string, LessonPosition> }
export const emptyPositions = (): LessonPositions => ({ version: 1, current: null, lessons: {} });
export function readPositions(raw: string | null): LessonPositions {
  const result = emptyPositions();
  try {
    const value = JSON.parse(raw ?? "null");
    if (value?.version !== 1 || !value.lessons || typeof value.lessons !== "object") return result;
    for (const [id, position] of Object.entries(value.lessons)) {
      const lesson = findSailLesson(id);
      if (!lesson || !position || typeof position !== "object") continue;
      const p = position as Partial<LessonPosition>;
      result.lessons[id] = {
        step: lessonSteps.includes(p.step as LessonStep) ? p.step! : "understand",
        diagram: diagramOptions(lesson.diagram, "en").some(o => o.value === p.diagram) ? p.diagram! : 0,
      };
    }
    if (typeof value.current === "string" && findSailLesson(value.current)) result.current = value.current;
  } catch { /* A malformed bookmark cannot create a grade. */ }
  return result;
}
export function visitLesson(state: LessonPositions, id: string, patch: Partial<LessonPosition> = {}): LessonPositions {
  if (!findSailLesson(id)) return state;
  return readPositions(JSON.stringify({ ...state, current: id, lessons: { ...state.lessons, [id]: { ...(state.lessons[id] ?? { step: "understand", diagram: 0 }), ...patch } } }));
}
