import type { RaceRuleEvent } from "./race-rules";

/** M0-3: right after the signal the whole fleet sails off the line together.
 * Penalty-free close approaches and contacts in these seconds are one "start
 * jostle": the live notice stays quiet and the judge debrief groups them into
 * one item without a lesson. Penalties stay visible as separate items.
 * Kept apart from race-judge.ts, which the race loads only after the finish. */
export const RACE_START_JOSTLE_SECONDS = 10;

export function isStartJostle(e: RaceRuleEvent): boolean {
  return (e.kind === "give-way" || e.kind === "avoid-contact" || e.kind === "contact")
    && Number.isFinite(e.time) && e.time >= 0 && e.time < RACE_START_JOSTLE_SECONDS && !(e.penaltySeconds > 0);
}
