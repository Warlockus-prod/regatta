import AsyncStorage from "@react-native-async-storage/async-storage";
import { bootcampLessons } from "../data";
import { serial } from "../persistence/serial";

export const FOUNDATION_POSITION_KEY = "regatta.bootcamp.position.v1";
export const foundationSteps = ["understand", "check", "practice"] as const;
export type FoundationStep = typeof foundationSteps[number];
export interface FoundationPosition { step: FoundationStep; diagram: 0 | 1 | 2 }
type Positions = Record<string, FoundationPosition>;
export const isFoundationLesson = (id: unknown): id is string => typeof id === "string" && bootcampLessons.some(l => l.id === id);
export function readFoundationPositions(raw: string | null): Positions {
  const result: Positions = {};
  try {
    const value = JSON.parse(raw ?? "null");
    if (value?.version !== 1 || !value.lessons) return result;
    for (const lesson of bootcampLessons) {
      const item = value.lessons[lesson.id];
      if (item) result[lesson.id] = { step: foundationSteps.includes(item.step) ? item.step : "understand", diagram: [0, 1, 2].includes(item.diagram) ? item.diagram : 0 };
    }
  } catch { /* Invalid navigation data never changes quiz evidence. */ }
  return result;
}
export const loadFoundationPositions = () => serial(async () => readFoundationPositions(await AsyncStorage.getItem(FOUNDATION_POSITION_KEY)));
export function saveFoundationPosition(id: string, patch: Partial<FoundationPosition>) {
  return serial(async () => {
    if (!isFoundationLesson(id)) throw new Error("Unknown lesson");
    const positions = readFoundationPositions(await AsyncStorage.getItem(FOUNDATION_POSITION_KEY));
    positions[id] = { ...(positions[id] ?? { step: "understand", diagram: 0 }), ...patch };
    await AsyncStorage.setItem(FOUNDATION_POSITION_KEY, JSON.stringify({ version: 1, lessons: positions }));
  });
}

/** Keep the hash after the query; accept only a known local lesson return. */
export function foundationPracticeRoute(route: string, id: string) {
  if (!isFoundationLesson(id)) return route;
  const [path, hash] = route.split("#");
  return `${path}${path.includes("?") ? "&" : "?"}fromLesson=${encodeURIComponent(id)}${hash ? `#${hash}` : ""}`;
}
