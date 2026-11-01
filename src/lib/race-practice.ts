// M4-2 debrief to practice and back: links from the race finish screen to the
// practice of a mistake (src/data/race-practice.ts) and on from a lesson race.
// On the website a practice link carries the race to return to
// (src/lib/race-return.ts); in the app the race posts an in-app destination
// (racePracticeNativeHref), the app checks it (isRaceFinishNativeHref) and the
// native back button is the way back. Pure: no React, no window.

import { bootcampLessonHeads } from "../data/bootcamp-index";
import {
  RACE_COACH_PRACTICE, RACE_JUDGE_PRACTICE, RACE_PRACTICE_COPY, RACE_PRACTICE_DRILL_TITLES, RACE_PRACTICE_RULE_TITLES,
  type PracticedJudgeLesson, type RacePracticeTarget,
} from "../data/race-practice";
import { coachMistakeKind } from "./fallback-coach";
import { foundationHref, isFoundationLesson } from "./learning/foundation-navigation";
import { legacyPick } from "./languages";
import { destinations, type Language } from "./product/catalog";
import type { RaceJudgeItem } from "./race-judge";
import { encodeRaceSetup, type RaceReturn } from "./race-return";

function withReturn(path: string, ret: RaceReturn | null): string {
  if (!ret) return path;
  const url = new URL(path, "https://local.invalid");
  url.searchParams.set("fromRace", encodeRaceSetup(ret.setup));
  if (ret.lesson) url.searchParams.set("raceLesson", ret.lesson);
  return `${url.pathname}${url.search}${url.hash}`;
}

/** Website link of a practice, carrying the race to return to. */
export function racePracticeHref(target: RacePracticeTarget, ret: RaceReturn | null): string {
  const id = encodeURIComponent(target.id);
  const path = target.kind === "drill" ? `/simulator-v3?drill=${id}`
    : target.kind === "rule" ? `/rules?rule=${id}`
    : foundationHref(target.id, "understand");
  return withReturn(path, ret);
}

/** In-app destination of a practice (mobile/app routes). */
export function racePracticeNativeHref(target: RacePracticeTarget): string {
  const id = encodeURIComponent(target.id);
  return target.kind === "drill" ? `/simulator-v3?drill=${id}` : target.kind === "rule" ? `/rules/${id}` : `/bootcamp/${id}`;
}

const allTargets = (): RacePracticeTarget[] => [...Object.values(RACE_JUDGE_PRACTICE), ...Object.values(RACE_COACH_PRACTICE)];
const SAILS = destinations.find(d => d.id === "sails")!;

/** In-app destinations the race finish screen may open: the practice of a
 * mapped mistake, a foundation lesson (next lesson) or the sails course. The
 * app checks every request from the race page against this list. */
export function isRaceFinishNativeHref(href: unknown): href is string {
  if (typeof href !== "string" || href.length > 200) return false;
  if (href === SAILS.native) return true;
  if (href.startsWith("/bootcamp/") && isFoundationLesson(href.slice("/bootcamp/".length))) return true;
  return allTargets().some(target => racePracticeNativeHref(target) === href);
}

export function practiceForJudgeItem(item: Pick<RaceJudgeItem, "lesson" | "jostle">): RacePracticeTarget | null {
  if (item.jostle || item.lesson === "start-jostle") return null;
  return RACE_JUDGE_PRACTICE[item.lesson as PracticedJudgeLesson] ?? null;
}

export function practiceForCoachMistake(mistake: { kind?: unknown } | undefined): RacePracticeTarget | null {
  const kind = mistake ? coachMistakeKind(mistake) : null;
  return kind ? RACE_COACH_PRACTICE[kind] : null;
}

/** The visible name of a practice: "Lesson 1. Wind & direction", "Rule card: Start Line". */
export function racePracticeLabel(target: RacePracticeTarget, lang: Language): string {
  if (target.kind === "lesson") return racePracticeTitle(target, lang);
  const prefix = target.kind === "rule" ? RACE_PRACTICE_COPY.rule : RACE_PRACTICE_COPY.drill;
  return `${prefix[lang]}: ${racePracticeTitle(target, lang)}`;
}

/** The name without the "Rule card:" or "Drill:" prefix, for the
 * "Practise: <name>" action, so the button reads with one colon:
 * "Practise: Start Line", "Practise: Lesson 1. Wind & direction". */
export function racePracticeTitle(target: RacePracticeTarget, lang: Language): string {
  if (target.kind === "lesson") {
    const lesson = bootcampLessonHeads.find(item => item.id === target.id);
    const title = lesson ? lessonTitle(lesson, lang) : target.id;
    return `${RACE_PRACTICE_COPY.lesson[lang]} ${lesson?.order ?? ""}. ${title}`;
  }
  const titles = target.kind === "rule" ? RACE_PRACTICE_RULE_TITLES : RACE_PRACTICE_DRILL_TITLES;
  return titles[target.id]?.[lang] ?? target.id;
}

const lessonTitle = (lesson: (typeof bootcampLessonHeads)[number], lang: Language) => legacyPick(lesson, "title", lang);

export interface RaceLessonLink { href: string; label: string }

/** After a race opened from a foundation lesson: back to that lesson and on
 * to the next one. The mini race is the last foundation lesson, so its next
 * step is the sails course. In the app, "/race" returns to the lesson the
 * race came from (mobile/src/navigation/race-entry.ts). */
export function raceLessonLinks(lessonId: string, lang: Language, native: boolean): { back: RaceLessonLink; next: RaceLessonLink } | null {
  const index = bootcampLessonHeads.findIndex(item => item.id === lessonId);
  if (index < 0) return null;
  const back = { href: native ? "/race" : foundationHref(lessonId, "practice"), label: RACE_PRACTICE_COPY.backToLesson[lang] };
  const nextLesson = bootcampLessonHeads[index + 1];
  const next = nextLesson
    ? { href: native ? `/bootcamp/${nextLesson.id}` : foundationHref(nextLesson.id, "understand"), label: `${RACE_PRACTICE_COPY.nextLesson[lang]}: ${lessonTitle(nextLesson, lang)}` }
    : { href: native ? SAILS.native! : SAILS.web!, label: `${RACE_PRACTICE_COPY.nextCourse[lang]}: ${SAILS.title[lang]}` };
  return { back, next };
}
