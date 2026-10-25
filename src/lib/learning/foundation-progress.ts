import { bootcampLessons } from "../../data/bootcamp";
import { getQuizForLesson, isQuizPassed } from "../../data/bootcamp-quiz";
import { isFoundationLesson } from "./foundation-navigation";
export { isFoundationLesson, foundationHref, foundationPracticeHref, foundationReturnForSearch } from "./foundation-navigation";

export const FOUNDATION_KEY = "regatta.foundation.web.v1";
export const LEGACY_FOUNDATION_KEY = "regatta.bootcamp";
export const FOUNDATION_EVENT = "regatta:foundation-progress";
export const foundationSteps = ["understand", "check", "practice"] as const;
export type FoundationStep = typeof foundationSteps[number];
export type FoundationAnswers = Record<string, string>;
export interface FoundationProgress {
  version: 1;
  current: string | null;
  visited: string[];
  positions: Record<string, { step: FoundationStep; diagram: 0 | 1 | 2 }>;
  checks: Record<string, { answers: FoundationAnswers; answeredAt: number }>;
  practiceOpened: string[];
  drafts: Record<string, FoundationAnswers>;
}
export interface FoundationStorage { getItem(key: string): string | null; setItem(key: string, value: string): void }
export const emptyFoundation = (): FoundationProgress => ({ version: 1, current: null, visited: [], positions: {}, checks: {}, practiceOpened: [], drafts: {} });
const object = (value: unknown): value is Record<string, unknown> => Boolean(value) && typeof value === "object" && !Array.isArray(value);
const ids = (value: unknown): string[] => bootcampLessons.filter(lesson => Array.isArray(value) && value.includes(lesson.id)).map(lesson => lesson.id);
function partialAnswers(id: string, raw: unknown): FoundationAnswers | null {
  if (!isFoundationLesson(id) || !object(raw)) return null;
  return Object.fromEntries(getQuizForLesson(id).filter(question => question.options.some(option => option.id === raw[question.id])).map(question => [question.id, raw[question.id] as string]));
}
export function validAnswers(id: string, raw: unknown): FoundationAnswers | null {
  if (!isFoundationLesson(id) || !object(raw)) return null;
  const questions = getQuizForLesson(id);
  if (!questions.length || questions.some(question => !question.options.some(option => option.id === raw[question.id]))) return null;
  return Object.fromEntries(questions.map(question => [question.id, raw[question.id] as string]));
}
export function theoryResult(progress: FoundationProgress, id: string) {
  const questions = getQuizForLesson(id);
  const answers = validAnswers(id, progress.checks[id]?.answers);
  const score = answers ? questions.filter(question => question.options.some(option => option.id === answers[question.id] && option.correct)).length : 0;
  return { answered: Boolean(answers), score, total: questions.length, passed: Boolean(answers) && isQuizPassed(score, questions.length) };
}
export const passedFoundationIds = (progress: FoundationProgress) => bootcampLessons.filter(lesson => theoryResult(progress, lesson.id).passed).map(lesson => lesson.id);

/** A legacy completed marker is a visit, never evidence of answering a check. */
export function readLegacyFoundation(raw: string | null): { visited: string[]; current: string | null } {
  try {
    const envelope: unknown = JSON.parse(raw ?? "null");
    if (!object(envelope) || envelope.v !== 1 || !object(envelope.data)) return { visited: [], current: null };
    return { visited: ids(envelope.data.completed), current: isFoundationLesson(envelope.data.current) ? envelope.data.current : null };
  } catch { return { visited: [], current: null }; }
}
export function readFoundationProgress(raw: string | null): FoundationProgress | null {
  if (raw === null) return emptyFoundation();
  if (raw.length > 64 * 1024) return null;
  try {
    const value: unknown = JSON.parse(raw);
    if (!object(value) || value.version !== 1) return null;
    const result = emptyFoundation();
    result.current = isFoundationLesson(value.current) ? value.current : null;
    result.visited = ids(value.visited); result.practiceOpened = ids(value.practiceOpened);
    for (const lesson of bootcampLessons) {
      const draft = partialAnswers(lesson.id, object(value.drafts) ? value.drafts[lesson.id] : null);
      if (draft && Object.keys(draft).length) result.drafts[lesson.id] = draft;
      const position = object(value.positions) ? value.positions[lesson.id] : null;
      if (object(position)) result.positions[lesson.id] = {
        step: foundationSteps.includes(position.step as FoundationStep) ? position.step as FoundationStep : "understand",
        diagram: position.diagram === 1 || position.diagram === 2 ? position.diagram : 0,
      };
      const check = object(value.checks) ? value.checks[lesson.id] : null;
      if (object(check) && typeof check.answeredAt === "number" && Number.isFinite(check.answeredAt) && check.answeredAt >= 0) {
        const answers = validAnswers(lesson.id, check.answers);
        if (answers) result.checks[lesson.id] = { answers, answeredAt: check.answeredAt };
      }
    }
    return result;
  } catch { return null; }
}
export function loadFoundation(storage: Pick<FoundationStorage, "getItem">) {
  const progress = readFoundationProgress(storage.getItem(FOUNDATION_KEY));
  if (!progress) throw new Error("Unreadable foundation evidence");
  const legacy = readLegacyFoundation(storage.getItem(LEGACY_FOUNDATION_KEY));
  return { progress, legacy, visited: [...new Set([...legacy.visited, ...progress.visited])] };
}
/** Keep all old keys untouched. Publish success only after the new write succeeds. */
export function saveFoundation(storage: FoundationStorage, progress: FoundationProgress): FoundationProgress {
  if (!readFoundationProgress(storage.getItem(FOUNDATION_KEY))) throw new Error("Unreadable foundation evidence");
  const safe = readFoundationProgress(JSON.stringify(progress));
  if (!safe) throw new Error("Invalid foundation evidence");
  storage.setItem(FOUNDATION_KEY, JSON.stringify(safe));
  return safe;
}
export function updateFoundationDraft(progress: FoundationProgress, id: string, raw: FoundationAnswers): FoundationProgress {
  const answers = partialAnswers(id, raw);
  if (!answers) throw new Error("Valid lesson answers required");
  return { ...progress, drafts: { ...progress.drafts, [id]: answers } };
}
export function updateFoundationCheck(progress: FoundationProgress, id: string, raw: FoundationAnswers, now = Date.now()): FoundationProgress {
  const answers = validAnswers(id, raw);
  if (!answers || !Number.isFinite(now) || now < 0) throw new Error("Complete answers required");
  return { ...progress, checks: { ...progress.checks, [id]: { answers, answeredAt: now } } };
}
