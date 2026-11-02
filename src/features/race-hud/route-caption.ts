// Package 8: what the route caption says, from the route hint alone (pure,
// tested on its own). Distances are metres, courses whole degrees 0..359.
import type { RaceGuidance } from "@/lib/race-guidance";
import { METRES_PER_UNIT } from "@/features/race-3d/pose";

export type RouteCaptionKind = "tack-now" | "gybe-now" | "tack-ahead" | "gybe-ahead" | "hold" | "steer" | "other";

export interface RouteCaptionModel {
  kind: RouteCaptionKind;
  /** The course to sail now (after a turn called now: the new course). */
  course: number;
  /** The course to steer now: held until a turn ahead, else the course itself. */
  hold: number;
  /** Metres to the turn ahead, whole tens; 0 when none. */
  turnIn: number;
  /** Metres to the hint's target, whole tens. */
  target: number;
}

const deg = (value: number) => ((Math.round(value) % 360) + 360) % 360;
const tens = (units: number) => Math.round(units * METRES_PER_UNIT / 10) * 10;

/**
 * The caption for a route hint: a tack or gybe called now, the next one ahead
 * on this leg (RaceGuidance.next, turnAhead in race-guidance.ts), a course to
 * hold or to turn to, or "other" for the steps that have no course to give
 * (round the mark, return behind the start line, finished).
 */
export function routeCaption(guidance: RaceGuidance): RouteCaptionModel {
  const next = guidance.next ?? null;
  const course = deg(guidance.suggestedHeading);
  const base = { course, hold: course, turnIn: 0, target: tens(guidance.distance) };
  const special = guidance.leg === "complete" || guidance.action === "round-port" || guidance.action === "return-start";
  if (special) return { ...base, kind: "other" };
  if (guidance.action === "tack" || guidance.action === "gybe") return { ...base, kind: guidance.action === "tack" ? "tack-now" : "gybe-now" };
  // A turn closer than the rounding of the distance is a turn now.
  if (next && tens(next.distance) <= 0) return { ...base, course: deg(next.heading), hold: deg(next.heading), kind: next.action === "tack" ? "tack-now" : "gybe-now" };
  if (next) return { ...base, kind: next.action === "tack" ? "tack-ahead" : "gybe-ahead", course: deg(next.heading), turnIn: tens(next.distance) };
  return { ...base, kind: guidance.action === "hold" ? "hold" : "steer" };
}
