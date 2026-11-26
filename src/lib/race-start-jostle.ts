import type { RaceRuleEvent } from "./race-rules";

/** M0-3: right after the signal the whole fleet sails off the line together.
 * Penalty-free close approaches and contacts in these seconds are one "start
 * jostle": the live notice stays quiet and the judge debrief groups them into
 * one item without a lesson. Penalties stay visible as separate items.
 * Kept apart from race-judge.ts, which the race loads only after the finish.
 * This is the legacy race's value; the metric race has its own
 * (raceScale(profile).startJostleSeconds, course data, M5 step 6). */
export const RACE_START_JOSTLE_SECONDS = 10;

/** The legacy race's start jostle (one argument, safe as an array callback). */
export function isStartJostle(e: RaceRuleEvent): boolean {
  return isStartJostleWithin(e, RACE_START_JOSTLE_SECONDS);
}

/** The start jostle of a race whose jostle lasts `seconds` (raceScale startJostleSeconds). */
export function isStartJostleWithin(e: RaceRuleEvent, seconds: number): boolean {
  return (e.kind === "give-way" || e.kind === "avoid-contact" || e.kind === "contact")
    && Number.isFinite(e.time) && e.time >= 0 && e.time < seconds && !(e.penaltySeconds > 0);
}
