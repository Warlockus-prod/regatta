import { MEDAL_THRESHOLDS_REVISION, RACE_MEDAL_THRESHOLDS, type MedalThresholds, type MedalWind } from "../data/race-medals";
import type { Difficulty } from "../data/race-difficulty";
import { raceClassId, readRaceContext, type RaceClassId, type RaceContext } from "./race-context";

/** M4-5 local progress: one medal per course of the solo race (race class,
 * fleet difficulty and wind; thresholds in src/data/race-medals.ts). Bronze
 * for any finish, so a course can always be passed; gold only without route
 * and trim hints (owner decision #8). No streaks, nothing burns: a medal is
 * never taken away, not even when the thresholds are recomputed. The store
 * keeps the evidence (best time, best time without hints) next to the class
 * and the thresholds revision, so a new revision regrades instead of
 * starting over. Lives in localStorage; the iOS app carries the row through
 * its race bridge (mobile/src/persistence/race-web-storage.ts). */
export const RACE_MEDALS_STORAGE_KEY = "regatta.race.medals.v1";
export const RACE_MEDALS = ["bronze", "silver", "gold"] as const;
export type RaceMedal = typeof RACE_MEDALS[number];
/** Bounded by count; nine legacy courses today, room for the metric classes of M5. */
const MAX_COURSES = 64;
export const MEDAL_STORE_MAX_CHARS = 16_000;

export interface MedalCourse { raceContext: RaceContext; difficulty: Difficulty; windStrength: MedalWind }
export interface MedalEntry {
  schema: 1;
  /** The race class with its own version (model, profile, geometry revision). */
  raceClass: RaceClassId;
  /** MEDAL_THRESHOLDS_REVISION the medal was last graded with. */
  thresholdsRevision: number;
  medal: RaceMedal;
  /** Best penalty-adjusted finish, any hints. */
  bestSec: number;
  /** Best penalty-adjusted finish with route and trim hints off; null when none yet. */
  bestNoHintsSec: number | null;
}
export type MedalStore = Record<string, MedalEntry>;

const rank = (medal: RaceMedal | null) => medal === null ? -1 : RACE_MEDALS.indexOf(medal);
const better = (a: RaceMedal | null, b: RaceMedal | null) => rank(b) > rank(a) ? b : a;
const positive = (v: unknown): v is number => typeof v === "number" && Number.isFinite(v) && v > 0;

export function medalCourseKey(course: MedalCourse): string {
  return `${raceClassId(course.raceContext)}|${course.difficulty}|${course.windStrength}`;
}

/** Thresholds of a course, or null for a class without them (the physical trial). */
export function medalThresholds(course: MedalCourse): MedalThresholds | null {
  const read = readRaceContext(course.raceContext);
  if (!read.ok) return null;
  return RACE_MEDAL_THRESHOLDS[raceClassId(read.context)]?.[course.difficulty]?.[course.windStrength] ?? null;
}

/** The medal one finish earns: bronze for any finish (the race ends at its
 * limit, so a penalty-adjusted time past bronzeSec is still a finish), gold
 * only without hints; none without a finish. */
export function gradeRaceMedal(t: MedalThresholds, finishSec: number | null | undefined, hintsUsed: boolean): RaceMedal | null {
  if (!positive(finishSec)) return null;
  if (!hintsUsed && finishSec <= t.goldSec) return "gold";
  return finishSec <= t.silverSec ? "silver" : "bronze";
}

/** The medal an entry shows: what it earned, or more if its evidence earns
 * more under the current thresholds. Never less. */
export function entryMedal(entry: MedalEntry, t: MedalThresholds | null): RaceMedal {
  if (!t) return entry.medal;
  return better(better(entry.medal, gradeRaceMedal(t, entry.bestSec, true)), gradeRaceMedal(t, entry.bestNoHintsSec, false)) ?? entry.medal;
}

function isMedalEntry(v: unknown, key: string): v is MedalEntry {
  if (!v || typeof v !== "object" || Array.isArray(v)) return false;
  const e = v as Record<string, unknown>;
  return e.schema === 1 && typeof e.raceClass === "string" && key.startsWith(`${e.raceClass}|`)
    && typeof e.thresholdsRevision === "number" && Number.isInteger(e.thresholdsRevision) && e.thresholdsRevision >= 1
    && (RACE_MEDALS as readonly unknown[]).includes(e.medal) && positive(e.bestSec)
    && (e.bestNoHintsSec === null || (positive(e.bestNoHintsSec) && e.bestNoHintsSec >= e.bestSec));
}

/** Valid entries only; a corrupt row reads as no medals, never as an error. */
export function parseMedalStore(raw: string | null | undefined): MedalStore {
  try {
    const parsed: unknown = raw ? JSON.parse(raw) : {};
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return {};
    return Object.fromEntries(Object.entries(parsed).filter(([key, entry]) => isMedalEntry(entry, key)).slice(-MAX_COURSES)) as MedalStore;
  } catch { return {}; }
}

/** A stored medal row as text, checked whole: what the iOS app's bridge accepts. */
export function isMedalStoreText(raw: string): boolean {
  if (raw.length > MEDAL_STORE_MAX_CHARS) return false;
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return false;
    const entries = Object.entries(parsed);
    return entries.length <= MAX_COURSES && entries.every(([key, entry]) => isMedalEntry(entry, key));
  } catch { return false; }
}

export interface MedalAward {
  /** The medal of this race; null when it earned none (past the limit). */
  earned: RaceMedal | null;
  /** The course medal before and after this race. */
  previous: RaceMedal | null;
  medal: RaceMedal;
  /** True when this race raised the course medal. */
  improved: boolean;
  entry: MedalEntry;
  /** False when the device refused to store the row (storage full or
   * blocked); the result then says so instead of "New medal". */
  saved?: boolean;
}

/** Records one finished race of a medal course. Null, and the store
 * untouched, for a class without thresholds (the physical trial) or a race
 * that did not finish. */
export function awardRaceMedal(store: MedalStore, course: MedalCourse, finishSec: number | null | undefined, hintsUsed: boolean)
  : { store: MedalStore; award: MedalAward } | null {
  const t = medalThresholds(course);
  if (!t) return null;
  const earned = gradeRaceMedal(t, finishSec, hintsUsed);
  if (earned === null || !positive(finishSec)) return null;
  const key = medalCourseKey(course);
  const current = isMedalEntry(store[key], key) ? store[key] : null;
  const previous = current ? entryMedal(current, t) : null;
  const medal = better(previous, earned)!;
  const bestSec = Math.min(current?.bestSec ?? Infinity, finishSec);
  // Never below bestSec: bestSec is the best of every finish, with or without hints.
  const bestNoHintsSec = hintsUsed ? current?.bestNoHintsSec ?? null : Math.min(current?.bestNoHintsSec ?? Infinity, finishSec);
  const entry: MedalEntry = { schema: 1, raceClass: raceClassId(course.raceContext), thresholdsRevision: MEDAL_THRESHOLDS_REVISION,
    medal, bestSec, bestNoHintsSec };
  // The course moves to the end; the oldest other courses drop past the bound.
  const next: MedalStore = Object.fromEntries([...Object.entries(store).filter(([k]) => k !== key), [key, entry]]);
  const keys = Object.keys(next);
  while (keys.length > MAX_COURSES) delete next[keys.shift()!];
  return { store: next, award: { earned, previous, medal, improved: rank(medal) > rank(previous), entry } };
}

/** The course medal, or null before the first finish. */
export function courseMedal(store: MedalStore, course: MedalCourse): RaceMedal | null {
  const key = medalCourseKey(course);
  const entry = store[key];
  return isMedalEntry(entry, key) ? entryMedal(entry, medalThresholds(course)) : null;
}

export interface MedalGoal {
  medal: RaceMedal;
  /** Finish at or under this many seconds; bronze needs only a finish. */
  underSec: number;
  /** Gold also needs route and trim hints off. */
  noHints: boolean;
}

/** The next medal of a course (for the results and the race menu, M4-6's
 * "next step"); null when the course has gold or has no thresholds. */
export function nextMedalGoal(current: RaceMedal | null, course: MedalCourse): MedalGoal | null {
  const t = medalThresholds(course);
  if (!t || current === "gold") return null;
  if (current === null) return { medal: "bronze", underSec: t.bronzeSec, noHints: false };
  if (current === "bronze") return { medal: "silver", underSec: t.silverSec, noHints: false };
  return { medal: "gold", underSec: t.goldSec, noHints: true };
}

export function readMedalStore(storage: Pick<Storage, "getItem"> | null): MedalStore {
  try { return parseMedalStore(storage?.getItem(RACE_MEDALS_STORAGE_KEY)); } catch { return {}; }
}
export function writeMedalStore(storage: Pick<Storage, "setItem"> | null, store: MedalStore): boolean {
  try { storage?.setItem(RACE_MEDALS_STORAGE_KEY, JSON.stringify(store)); return !!storage; } catch { return false; }
}

/** Route hints ("Route and hints") count in both modes; trim hints only in
 * Pro, the one mode that shows them. Any moment of the race with either on
 * means the race used hints. The first race hints (M4-7,
 * src/features/race-hud/first-race-hints.ts) do not count: each is shown
 * once per device and names a situation and the general way out, never a
 * heading, a route or a sheet setting. */
export function raceUsesHints(prefs: { mode: "simple" | "pro"; guidance: boolean; trimHints: boolean }): boolean {
  return prefs.guidance || (prefs.mode === "pro" && prefs.trimHints);
}
