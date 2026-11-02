import { makeStandardCourse } from "./race-physics";
import { matchesPhysicalRaceCourse, physicalCourseDefinition } from "./race-courses";
import { KNOT_METRES_PER_SECOND } from "./sailing-kinematics";
import { PHYSICAL_RACE_EMISSION_ENABLED, readRaceContext, type RaceContext } from "./race-context";
import { readRaceComparison, readRaceResultSelection, type RaceComparison, type RaceResultSelection } from "./race-record-class";
import { FINISH_SEC_MIN, isPlausibleFinishSec } from "./race-submission";

const object = (value: unknown): value is Record<string, unknown> => !!value && typeof value === "object" && !Array.isArray(value);
const finite = (value: unknown, low: number, high: number): value is number => typeof value === "number" && Number.isFinite(value) && value >= low && value <= high;

/** Eligibility is stricter than replay readability. Translated mark labels do
 * not change a registered track, while any changed gate or hardware does. */
export function matchesRegisteredRaceCourse(context: RaceContext, rawCourse: unknown): boolean {
  if (context == null) return false;
  const read = readRaceContext(context);
  if (!read.ok) return false;
  if (read.context.model === "physical-cruiser-v1") return matchesPhysicalRaceCourse(read.context, rawCourse);
  const expected = makeStandardCourse();
  const number = (value: unknown, target: number) => typeof value === "number" && Number.isFinite(value) && Math.abs(value - target) < 1e-7;
  const point = (value: unknown, target: { x: number; y: number }) => object(value) && number(value.x, target.x) && number(value.y, target.y);
  const line = (value: unknown, target: typeof expected.startLine) => object(value) && point(value.a, target.a) && point(value.b, target.b);
  return object(rawCourse) && line(rawCourse.startLine, expected.startLine) && line(rawCourse.finishLine, expected.finishLine)
    && Array.isArray(rawCourse.marks) && rawCourse.marks.length === expected.marks.length
    && rawCourse.marks.every((mark, index) => {
      const canonical = expected.marks[index];
      return object(mark) && mark.type === canonical.type && point(mark.pos, canonical.pos) && number(mark.radius, canonical.radius)
        && (canonical.type !== "windward" || mark.roundSide === undefined || mark.roundSide === "port");
    });
}

/** M5 step 8 (ADR-0015 point 12): the fastest plausible finish of a class.
 * The legacy course keeps the site-wide FINISH_SEC_MIN (20 s) on the
 * penalty-adjusted time, exactly as before. A metric course is a beat and a
 * run of legMetres each, and no boat of the class sails that at a mean 8 kn,
 * so its floor is floor(2 x legMetres / 8 kn) on the sailed (raw) time, the
 * bound the fleet test uses: short 58 s, medium 145 s, long 291 s. */
export const METRIC_FINISH_FLOOR_KN = 8;
export function minimumFinishSec(context: RaceContext): number {
  if (context.model === "legacy-race-v1") return FINISH_SEC_MIN;
  return Math.floor(2 * physicalCourseDefinition(context.profile).legMetres / (METRIC_FINISH_FLOOR_KN * KNOT_METRES_PER_SECOND));
}

export type ClassifiedRaceResult = Readonly<RaceComparison & {
  classId: Extract<RaceResultSelection, { kind: "classified" }>["classId"];
  rawFinishTimeSec: number;
  penaltySeconds: number;
  finishTimeSec: number;
}>;
export type ReadClassifiedRaceResult = { ok: true; value: ClassifiedRaceResult }
  | { ok: false; reason: "invalid" | "unsupported" | "disabled" };

/** This checks a client's declared result class, not proof of race completion.
 * Linked challenges keep their historical contract until explicitly versioned. */
export function readClassifiedRaceResult(raw: unknown): ReadClassifiedRaceResult {
  if (!object(raw)) return { ok: false, reason: "invalid" };
  const selection = readRaceResultSelection(raw);
  if (!selection.ok) return selection;
  if (selection.value.kind !== "classified") return { ok: false, reason: "invalid" };
  const comparison = readRaceComparison(raw);
  if (!comparison.ok) return comparison;
  if (raw.missionId != null || raw.dailyDay != null || Object.prototype.hasOwnProperty.call(raw, "daily")
    || !matchesRegisteredRaceCourse(selection.value.raceContext, raw.course)
    || !finite(raw.rawFinishTimeSec, .01, 3600) || !finite(raw.penaltySeconds, 0, 3600)
    || (selection.value.raceContext.model === "physical-cruiser-v1" && raw.rawFinishTimeSec < minimumFinishSec(selection.value.raceContext))
    || !isPlausibleFinishSec(raw.finishTimeSec)) return { ok: false, reason: "invalid" };
  const finishTimeSec = raw.rawFinishTimeSec + raw.penaltySeconds;
  if (!isPlausibleFinishSec(finishTimeSec) || Math.abs(finishTimeSec - raw.finishTimeSec) > 1e-7) return { ok: false, reason: "invalid" };
  if (!PHYSICAL_RACE_EMISSION_ENABLED && selection.value.raceContext.model === "physical-cruiser-v1") return { ok: false, reason: "disabled" };
  return { ok: true, value: { ...comparison.value, classId: selection.value.classId,
    rawFinishTimeSec: raw.rawFinishTimeSec, penaltySeconds: raw.penaltySeconds, finishTimeSec } };
}
