// Missed windward mark in the legacy solo race (M0-5). updateLap counts a
// finish only after the windward mark (lapDone 1); a boat that sails back down
// across the start/finish line before rounding gets nothing, and a beginner
// does not know why the race goes on. This detector reports that crossing so
// the race can say "round the windward mark first". It reads the same signals
// as updateLap and never changes the boat, the course or race-physics.

import { segmentCrossed, type RaceCourse, type Vec2 } from "./race-physics";

/** Seconds between two notices, so a boat weaving on the line hears it once. */
export const MISSED_MARK_COOLDOWN_SEC = 12;
/** How far upwind of the line (world units) the boat must get before a
 * southward crossing counts as "came back without rounding". It keeps the
 * crowding right after the start, when a boat dips back over the line,
 * from being read as a wrong finish. About two hull lengths of the race view.
 * The legacy race's value; the metric race arms at two of its own hull
 * lengths (raceScale(profile).missedMarkClearanceUnits, M5 step 6). */
export const MISSED_MARK_CLEARANCE = 40;

export interface MissedMarkState {
  /** The boat has been clear upwind of the line since its last notice. */
  armed: boolean;
  /** Race time of the last notice, or null. */
  lastNoticeAt: number | null;
}

export interface MissedMarkFrame {
  prevPos: Vec2;
  pos: Vec2;
  /** RaceBoat.lapDone before updateLap runs this tick. */
  lapDone: number;
  started: boolean | undefined;
  course: Pick<RaceCourse, "finishLine">;
  /** Race clock, seconds. */
  time: number;
  /** Arming distance upwind of the line, race units (raceScale missedMarkClearanceUnits); MISSED_MARK_CLEARANCE when omitted. */
  clearance?: number;
}

export function createMissedMarkState(): MissedMarkState {
  return { armed: false, lastNoticeAt: null };
}

/** True once per return across the finish line, southwards (the direction
 * updateLap counts a finish), by a started boat that has not rounded the
 * windward mark yet. */
export function detectMissedMark(state: MissedMarkState, frame: MissedMarkFrame): { state: MissedMarkState; missed: boolean } {
  const { prevPos, pos, lapDone, started, course, time } = frame;
  if (!started || lapDone !== 0) return { state: { ...state, armed: false }, missed: false };
  const lineY = Math.min(course.finishLine.a.y, course.finishLine.b.y);
  const armed = state.armed || pos.y < lineY - (frame.clearance ?? MISSED_MARK_CLEARANCE);
  const crossedDown = prevPos.y < pos.y && segmentCrossed(prevPos, pos, course.finishLine.a, course.finishLine.b);
  const cooled = state.lastNoticeAt === null || time - state.lastNoticeAt >= MISSED_MARK_COOLDOWN_SEC;
  if (crossedDown && armed && cooled) return { state: { armed: false, lastNoticeAt: time }, missed: true };
  return { state: { armed, lastNoticeAt: state.lastNoticeAt }, missed: false };
}
