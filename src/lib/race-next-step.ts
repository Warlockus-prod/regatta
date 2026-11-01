// M4-6 race home: ONE "next step" card on top of the race menu (website
// /game lobby, the app's native Race hub), with the personal record and the
// progress under it. Pure: no React, no window; relative imports, because the
// iOS app's Race hub reads the same module through Metro.
//
// Which card shows (pickRaceNextStep), in this order:
//   1. the goal from the last race: the main mistake the race coach measured
//      (src/lib/fallback-coach.ts, the one the finish screen lists first) as a
//      short practice goal, with the practice of src/data/race-practice.ts;
//   2. a medal not yet earned on the course the start opens (M4-5,
//      src/lib/race-medals.ts): its next medal;
//   3. today's daily race, when it is not finished yet today and the menu is
//      not already the daily race.
// No card when none applies. The menu's one primary action stays the start
// button: the card offers at most one secondary link.
//
// The local row `regatta.race.home.v1` keeps what the card needs and nothing
// else: the local calendar days with a race (a gentle "days raced this week",
// owner decision #8: no streak that burns, no guilt copy, nothing is ever
// counted down), the last race's goal and the last finished daily race day.
// Never written for the physical trial (PHYSICAL_RACE_EMISSION_ENABLED stays
// false). In the iOS app the race WebView writes it and the race bridge
// carries it (mobile/src/persistence/race-web-storage.ts, isRaceHomeStoreText).

import type { CoachGoalKind } from "./fallback-coach";
import { courseMedal, nextMedalGoal, type MedalCourse, type MedalGoal, type MedalStore } from "./race-medals";
import { dailySettings, type DailySettings } from "./daily-challenge";
import { raceClassId, type RaceContext } from "./race-context";
import { raceComparisonKey } from "./race-record-class";
import { RACE_COACH_PRACTICE, type RacePracticeTarget } from "../data/race-practice";
import { RACE_MEDAL_THRESHOLDS, type MedalWind } from "../data/race-medals";
import type { Difficulty } from "../data/race-difficulty";

export const RACE_HOME_STORAGE_KEY = "regatta.race.home.v1";
export const RACE_HOME_STORE_MAX_CHARS = 2_000;
/** Two weeks of race days: enough for "this week", bounded by count. */
export const RACE_HOME_MAX_DAYS = 14;

/** The coach's goal kinds, listed here so the lobby does not import the coach. */
const GOAL_KINDS = ["no-go", "tacks", "close-hauled"] as const satisfies readonly CoachGoalKind[];
const DAY = /^\d{4}-\d{2}-\d{2}$/;

export interface RaceHomeStore {
  schema: 1;
  /** Local calendar days (YYYY-MM-DD) with an ended race, oldest first. */
  days: string[];
  /** The main mistake of the last ended race; null when it had none. */
  goal: CoachGoalKind | null;
  /** The last daily race day (UTC, the daily race's own day) that was finished. */
  dailyDone: string | null;
}

export const EMPTY_RACE_HOME: RaceHomeStore = { schema: 1, days: [], goal: null, dailyDone: null };

const isDay = (v: unknown): v is string => typeof v === "string" && DAY.test(v);
const isGoal = (v: unknown): v is CoachGoalKind => (GOAL_KINDS as readonly unknown[]).includes(v);

function isRaceHomeStore(v: unknown): v is RaceHomeStore {
  if (!v || typeof v !== "object" || Array.isArray(v)) return false;
  const s = v as Record<string, unknown>;
  return s.schema === 1 && Array.isArray(s.days) && s.days.length <= RACE_HOME_MAX_DAYS && s.days.every(isDay)
    && (s.goal === null || isGoal(s.goal)) && (s.dailyDone === null || isDay(s.dailyDone));
}

/** A corrupt or missing row reads as an empty one, never as an error. */
export function parseRaceHomeStore(raw: string | null | undefined): RaceHomeStore {
  try {
    const parsed: unknown = raw ? JSON.parse(raw) : null;
    return isRaceHomeStore(parsed) ? { schema: 1, days: [...parsed.days], goal: parsed.goal, dailyDone: parsed.dailyDone } : { ...EMPTY_RACE_HOME, days: [] };
  } catch { return { ...EMPTY_RACE_HOME, days: [] }; }
}

/** The row as text, checked whole: what the iOS app's race bridge accepts. */
export function isRaceHomeStoreText(raw: string): boolean {
  if (raw.length > RACE_HOME_STORE_MAX_CHARS) return false;
  try { return isRaceHomeStore(JSON.parse(raw)); } catch { return false; }
}

const pad = (n: number) => String(n).padStart(2, "0");
/** The local calendar day of a moment, YYYY-MM-DD. */
export function localDay(now: Date): string {
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}
/** The day of the daily race: UTC, the same day the server and the app use. */
export function dailyRaceDay(now: Date): string {
  return now.toISOString().slice(0, 10);
}
/** Monday of the local week of a moment. */
export function localWeekStart(now: Date): string {
  const d = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  d.setDate(d.getDate() - ((d.getDay() + 6) % 7));
  return localDay(d);
}

/** Records one ended race (a finish or the time limit). The day counts
 * either way; the goal is the one this race left (or none); a daily race
 * counts as done only when it finished, and an older daily (a shared link)
 * never moves the done day back. */
export function recordRaceEnd(store: RaceHomeStore, race: { now: Date; goal: CoachGoalKind | null; dailyDay: string | null; finished: boolean }): RaceHomeStore {
  const today = localDay(race.now);
  const days = [...new Set([...store.days, today])].sort().slice(-RACE_HOME_MAX_DAYS);
  return { schema: 1, days, goal: isGoal(race.goal) ? race.goal : null,
    dailyDone: race.finished && isDay(race.dailyDay) && (!store.dailyDone || race.dailyDay > store.dailyDone) ? race.dailyDay : store.dailyDone };
}

/** A stored best-times row (src/lib/best-times.ts, the same text in the app's
 * AsyncStorage) holds at least one valid finish time, in any bucket. */
function hasAnyBestTime(raw: string | null | undefined): boolean {
  if (!raw) return false;
  try {
    const store: unknown = JSON.parse(raw);
    if (!store || typeof store !== "object" || Array.isArray(store)) return false;
    return Object.values(store as Record<string, unknown>).some(rec => !!rec && typeof rec === "object"
      && typeof (rec as { timeSec?: unknown }).timeSec === "number" && Number.isFinite((rec as { timeSec: number }).timeSec) && (rec as { timeSec: number }).timeSec > 0);
  } catch { return false; }
}

/** F1: this device has ended a solo race, so the race menu stops calling its
 * easy preset a "first race". Any one of three local signals is enough: a
 * race day in the race home row (every ended race since M4-6), a personal
 * best (a finish; builds before M4-6 wrote only this) or, in the iOS app, a
 * race kept in the native race history. A corrupt row counts as no race. */
export function hasRacedBefore(input: { home: RaceHomeStore; bestTimesRaw?: string | null; savedRaces?: number }): boolean {
  return input.home.days.length > 0 || (input.savedRaces ?? 0) > 0 || hasAnyBestTime(input.bestTimesRaw);
}

/** Days with a race in this local week (Monday to today). Zero is shown as nothing. */
export function daysRacedThisWeek(store: RaceHomeStore, now: Date): number {
  const from = localWeekStart(now), to = localDay(now);
  return store.days.filter(d => d >= from && d <= to).length;
}

export function readRaceHomeStore(storage: Pick<Storage, "getItem"> | null): RaceHomeStore {
  try { return parseRaceHomeStore(storage?.getItem(RACE_HOME_STORAGE_KEY)); } catch { return { ...EMPTY_RACE_HOME, days: [] }; }
}
export function writeRaceHomeStore(storage: Pick<Storage, "setItem"> | null, store: RaceHomeStore): boolean {
  try { storage?.setItem(RACE_HOME_STORAGE_KEY, JSON.stringify(store)); return !!storage; } catch { return false; }
}

export type RaceNextStep =
  | { kind: "goal"; goal: CoachGoalKind; practice: RacePracticeTarget }
  | { kind: "medal"; goal: MedalGoal }
  | { kind: "daily"; day: string };

/** The one card of the race menu; null when none applies. */
export function pickRaceNextStep(input: {
  /** The last race's goal (RaceHomeStore.goal). */
  goal: CoachGoalKind | null;
  /** The next medal of the course the start opens; null with gold or without thresholds. */
  medal: MedalGoal | null;
  /** Today's daily race day (dailyRaceDay). */
  today: string;
  /** The last finished daily race day. */
  dailyDone: string | null;
  /** The menu is already the daily race: no card sends there again. */
  inDaily: boolean;
}): RaceNextStep | null {
  if (input.goal && isGoal(input.goal)) return { kind: "goal", goal: input.goal, practice: RACE_COACH_PRACTICE[input.goal] };
  if (input.medal) return { kind: "medal", goal: input.medal };
  if (!input.inDaily && isDay(input.today) && input.dailyDone !== input.today) return { kind: "daily", day: input.today };
  return null;
}

/** The personal record of a comparison bucket from a stored best-times row
 * (src/lib/best-times.ts, the same format in the app's AsyncStorage). Pure
 * and silent: the menu reads it on every mount, without a diagnostic. */
export function storedBestSec(raw: string | null | undefined, comparison: unknown): number | null {
  const key = raceComparisonKey(comparison);
  if (!key || !raw) return null;
  try {
    const store: unknown = JSON.parse(raw);
    if (!store || typeof store !== "object" || Array.isArray(store)) return null;
    const rec = (store as Record<string, unknown>)[key] as { timeSec?: unknown } | undefined;
    return rec && typeof rec.timeSec === "number" && Number.isFinite(rec.timeSec) && rec.timeSec > 0 ? rec.timeSec : null;
  } catch { return null; }
}

/** Medal progress of a race class: courses with any medal out of the courses
 * that award one (nine for the legacy race: three levels times three winds). */
export function medalProgress(store: MedalStore, raceContext: RaceContext): { won: number; total: number } {
  const table = RACE_MEDAL_THRESHOLDS[raceClassId(raceContext)];
  if (!table) return { won: 0, total: 0 };
  const courses = (Object.keys(table) as Difficulty[]).flatMap(difficulty =>
    (Object.keys(table[difficulty]) as MedalWind[]).map(windStrength => ({ raceContext, difficulty, windStrength })));
  return { won: courses.filter(course => courseMedal(store, course) !== null).length, total: courses.length };
}

export interface RaceHomeView {
  step: RaceNextStep | null;
  /** The course the start opens (the medal step's course). */
  medalCourse: MedalCourse;
  /** The personal record of the course the start opens, in the selected mode. */
  recordSec: number | null;
  medals: { won: number; total: number };
  /** Days with a race this local week; zero shows no line. */
  weekDays: number;
  /** Today's daily race, for its card and for the menu's daily entry. */
  daily: DailySettings;
}

/** Everything the race menu's next-step card shows, from the three stored
 * rows (already read: localStorage on the web, AsyncStorage in the app). */
export function raceHomeView(input: {
  home: RaceHomeStore; medals: MedalStore; bestTimesRaw: string | null | undefined;
  course: MedalCourse; mode: "simple" | "pro"; now: Date; inDaily: boolean;
  /** False when the menu has no course to start yet (the mission tab before a mission is picked). */
  courseChosen?: boolean;
}): RaceHomeView {
  const { home, medals, course, mode, now, inDaily, courseChosen = true } = input;
  const daily = dailySettings(dailyRaceDay(now));
  const medal = courseChosen ? nextMedalGoal(courseMedal(medals, course), course) : null;
  return {
    step: pickRaceNextStep({ goal: home.goal, medal, today: daily.day, dailyDone: home.dailyDone, inDaily }),
    medalCourse: course,
    recordSec: courseChosen ? storedBestSec(input.bestTimesRaw, { raceContext: course.raceContext, mode, difficulty: course.difficulty, windStrength: course.windStrength }) : null,
    medals: medalProgress(medals, course.raceContext),
    weekDays: daysRacedThisWeek(home, now),
    daily,
  };
}
