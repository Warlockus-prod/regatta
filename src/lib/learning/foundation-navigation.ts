import { bootcampLessons } from "../../data/bootcamp";
import type { FoundationStep } from "./foundation-progress";

export const isFoundationLesson = (id: unknown): id is string => typeof id === "string" && bootcampLessons.some(lesson => lesson.id === id);

export function foundationHref(id: string, step?: FoundationStep) {
  return isFoundationLesson(id) ? `/start?lesson=${encodeURIComponent(id)}${step ? `&step=${step}` : ""}` : "/start";
}
/** Existing web destinations stay intact; visiting one never awards practice. */
export function foundationPracticeHref(id: string): string {
  const lesson = bootcampLessons.find(item => item.id === id);
  if (!lesson) return "/start";
  const url = new URL(lesson.route, "https://local.invalid");
  url.searchParams.set("fromLesson", lesson.id);
  return `${url.pathname}${url.search}${url.hash}`;
}

/** A course return is an internal stable lesson ID, never a saved arbitrary URL. */
export function foundationReturnForSearch(search: string, native = false): string | null {
  const query = new URLSearchParams(search);
  if (native || query.get("embed") === "1") return null;
  const id = query.get("fromLesson");
  return isFoundationLesson(id) ? id : null;
}
