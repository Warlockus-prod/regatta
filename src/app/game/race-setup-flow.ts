// One race setup (M1-1): where a start request goes, and whether this device
// has already seen the briefing of a course. The briefing explains the course
// and three rules; it opens by itself only the first time a player starts on a
// course, and on request from the lobby ("i"). "Again" and "Restart" keep the
// setup and go straight to the countdown.

import type { PhysicalRaceProfile } from "@/lib/race-context";

export const RACE_BRIEFING_SEEN_KEY = "regatta.race.briefing-seen.v1";
/** Bounded so a corrupted or hostile row can never grow the read. */
const MAX_COURSES = 16;
const COURSE_ID = /^[a-z0-9-]{1,32}$/;

/** Start requests: the lobby's primary action, its "i" button, the result's
 * "Again", the pause sheet's "Restart" and the reload resume offer. */
export type RaceEntryTrigger = "start" | "info" | "again" | "restart" | "resume";
export type RaceEntryStep = "briefing" | "countdown";

/** The briefing describes the classic course; each metric trial length is its own course. */
export function briefingCourseId(profile: PhysicalRaceProfile | null): string {
  return profile ? `trial-${profile}` : "classic";
}

export function raceEntryStep(trigger: RaceEntryTrigger, seen: boolean): RaceEntryStep {
  if (trigger === "info" || trigger === "resume") return "briefing";
  if (trigger === "again" || trigger === "restart") return "countdown";
  return seen ? "countdown" : "briefing";
}

/** A phase where the next race begins: its save and replay upload start over.
 * The countdown counts because "Again" and "Restart" skip the briefing. */
export function phaseStartsNewRace(phase: string): boolean {
  return phase === "menu" || phase === "briefing" || phase === "countdown";
}

// Storage can be missing or throw (private mode, the app's file origin): the
// session still remembers, so one visit never shows the briefing twice.
const memory = new Set<string>();

function readStored(): string[] {
  try {
    const parsed: unknown = JSON.parse(localStorage.getItem(RACE_BRIEFING_SEEN_KEY) ?? "[]");
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((id): id is string => typeof id === "string" && COURSE_ID.test(id)).slice(0, MAX_COURSES);
  } catch { return []; }
}

export function hasSeenBriefing(course: string): boolean {
  return memory.has(course) || readStored().includes(course);
}

export function markBriefingSeen(course: string): void {
  if (!COURSE_ID.test(course)) return;
  memory.add(course);
  const stored = readStored();
  if (stored.includes(course)) return;
  try { localStorage.setItem(RACE_BRIEFING_SEEN_KEY, JSON.stringify([...stored, course].slice(-MAX_COURSES))); }
  catch { /* the in-memory record keeps this visit consistent */ }
}

/** Inside the app the Race hub hands over a complete setup (level and wind, a
 * mission or the daily race) in the query: the race then starts without its
 * own menu. A saved replay or a metric trial is never a hand-off. */
export function hubHandsOffSetup(input: { native: boolean; linkedSetup: boolean; replay: boolean; trial: boolean }): boolean {
  return input.native && input.linkedSetup && !input.replay && !input.trial;
}
