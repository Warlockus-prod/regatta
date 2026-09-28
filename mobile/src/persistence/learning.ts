import AsyncStorage from "@react-native-async-storage/async-storage";
import { SAIL_PROGRESS_KEY } from "../../../src/features/sailing-lab/lessons/progress";
import { LEARNING_BOOKMARK_KEY, type LearningSnapshot } from "../../../src/lib/product/learning";

export async function readNativeLearning(): Promise<LearningSnapshot> {
  const [bookmark, sails, completedRaw, currentRaw] = await Promise.all([
    AsyncStorage.getItem(LEARNING_BOOKMARK_KEY),
    AsyncStorage.getItem(SAIL_PROGRESS_KEY),
    AsyncStorage.getItem("regatta.progress.bootcamp.v1"),
    AsyncStorage.getItem("regatta.progress.bootcamp.lastViewed.v1"),
  ]);
  const parse = (raw: string | null): unknown => { try { return JSON.parse(raw ?? "null"); } catch { return null; } };
  return { bookmark, sails, bootcamp: { completed: parse(completedRaw), current: parse(currentRaw) } };
}
