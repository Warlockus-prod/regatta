import { loadFoundation, passedFoundationIds } from "../learning/foundation-progress";
import { SAIL_PROGRESS_KEY } from "../../features/sailing-lab/lessons/progress";
import { LEARNING_BOOKMARK_KEY } from "./learning-bookmark";
import type { LearningSnapshot } from "./learning";

export { saveLearningBookmark } from "./learning-bookmark";

export function readWebLearning(): LearningSnapshot {
  // Storage access errors must reach the UI; malformed older data is safely ignored.
  const raw = localStorage.getItem("regatta.bootcamp");
  let bootcamp: LearningSnapshot["bootcamp"] = { completed: [], current: null };
  try {
    const value = JSON.parse(raw ?? "null");
    if (value?.v === 1 && value.data && typeof value.data === "object") bootcamp = value.data;
  } catch { /* Invalid JSON is not progress. Do not erase the original. */ }
  const foundation = loadFoundation(localStorage);
  return { bootcamp, foundation: { current: foundation.progress.current, checked: passedFoundationIds(foundation.progress), visited: foundation.visited }, sails: localStorage.getItem(SAIL_PROGRESS_KEY), bookmark: localStorage.getItem(LEARNING_BOOKMARK_KEY) };
}
