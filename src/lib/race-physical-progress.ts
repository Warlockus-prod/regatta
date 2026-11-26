import { readRaceContext, type PhysicalRaceContext } from "./race-context";
import { matchesPhysicalRaceCourse, physicalCourseDefinition } from "./race-courses";
import { segmentCrossed, type RaceBoat, type RaceCourse, type Vec2 } from "./race-physics";
import { PHYSICAL_MOTION_MAX_BENDS, type PhysicalRaceMotion } from "./race-physical-motion";

export type PhysicalRaceStage = "start" | "round-east" | "round-north" | "round-west" | "finish" | "complete";
type Gate = { readonly a: Readonly<Vec2>; readonly b: Readonly<Vec2> };
export interface PhysicalRaceGates {
  readonly start: Gate;
  readonly rounding: readonly [Gate, Gate, Gate];
  readonly finish: Gate;
}

/** The same metric gate descriptor must serve progression, the visible next
 * stage and future physical guidance. It never accepts implicit legacy data. */
export function physicalRaceGates(context: PhysicalRaceContext, course: RaceCourse): PhysicalRaceGates | null {
  const read = readRaceContext(context);
  if (!read.ok || read.context.model !== "physical-cruiser-v1" || !matchesPhysicalRaceCourse(read.context, course)) return null;
  const d = physicalCourseDefinition(read.context.profile), m = read.context.metresPerUnit;
  const { x, y } = course.marks[0].pos;
  const inner = d.rounding.gateInnerMetres / m, outer = d.rounding.gateOuterMetres / m;
  const gate = (a: Vec2, b: Vec2): Gate => Object.freeze({ a: Object.freeze({ ...a }), b: Object.freeze({ ...b }) });
  return Object.freeze({
    start: gate(course.startLine.a, course.startLine.b),
    rounding: Object.freeze([
      gate({ x: x + inner, y }, { x: x + outer, y }),
      gate({ x, y: y - inner }, { x, y: y - outer }),
      gate({ x: x - inner, y }, { x: x - outer, y }),
    ] as const),
    finish: gate(course.finishLine.a, course.finishLine.b),
  });
}

export function physicalRaceStage(boat: Pick<RaceBoat, "lapDone" | "started" | "roundPhase">): PhysicalRaceStage {
  return boat.lapDone >= 2 ? "complete" : !boat.started ? "start" : boat.lapDone === 1 ? "finish"
    : boat.roundPhase === 2 ? "round-west" : boat.roundPhase === 1 ? "round-north" : "round-east";
}

const point = (p: Readonly<Vec2> | undefined) => !!p && Number.isFinite(p.x) && Number.isFinite(p.y);

/** Advance only from actual propelled travel, never the boat position
 * after boundary recovery or collision separation. The travelled polyline
 * from -> path... -> to (ADR-0015 point 4) is graded segment by segment, each
 * with its own direction check, so a gate counts iff the path itself crosses
 * it, never because the chord from -> to does. The caller supplies one fixed
 * engine step and the official race time; countdown motion is ungraded.
 * A rejected frame leaves all progress fields untouched. */
export function advancePhysicalRaceProgress(boat: RaceBoat, motion: PhysicalRaceMotion,
  context: PhysicalRaceContext, course: RaceCourse, raceTime: number, racing: boolean): {
    stage: PhysicalRaceStage; event: "start" | "round-east" | "round-north" | "mark" | "finish" | null;
  } | null {
  const gates = physicalRaceGates(context, course);
  if (!gates || !boat || !motion || !point(motion.from) || !point(motion.to)
    || motion.path !== undefined && (!Array.isArray(motion.path) || motion.path.length > PHYSICAL_MOTION_MAX_BENDS
      || !motion.path.every(point))
    || !Number.isFinite(raceTime) || raceTime < 0 || typeof racing !== "boolean"
    || ![0, 1, 2].includes(boat.lapDone) || ![0, 1, 2].includes(boat.roundPhase ?? 0)
    || boat.started !== undefined && typeof boat.started !== "boolean"
    || boat.lapDone > 0 && boat.started !== true
    || (boat.roundPhase ?? 0) > 0 && boat.started !== true
    || boat.lapDone > 0 && boat.roundPhase !== 2
    || boat.lapDone === 2 && boat.finishTime === undefined
    || boat.lapDone < 2 && boat.finishTime !== undefined
    || boat.finishTime !== undefined && (!Number.isFinite(boat.finishTime) || boat.finishTime < 0)) return null;
  const stage = physicalRaceStage(boat);
  if (!racing || stage === "complete") return { stage, event: null };
  // One stage per tick, as before: the first segment that crosses the current
  // stage's gate in its required direction advances it.
  const points = [motion.from, ...(motion.path ?? []), motion.to];
  for (let i = 1; i < points.length; i++) {
    const from = points[i - 1], to = points[i];
    const crosses = (gate: Gate) => segmentCrossed(from, to, gate.a, gate.b);
    if (stage === "start" && to.y < from.y && crosses(gates.start)) {
      boat.started = true; return { stage: "round-east", event: "start" };
    }
    if (stage === "round-east" && to.y < from.y && crosses(gates.rounding[0])) {
      boat.roundPhase = 1; return { stage: "round-north", event: "round-east" };
    }
    if (stage === "round-north" && to.x < from.x && crosses(gates.rounding[1])) {
      boat.roundPhase = 2; return { stage: "round-west", event: "round-north" };
    }
    if (stage === "round-west" && to.y > from.y && crosses(gates.rounding[2])) {
      boat.lapDone = 1; return { stage: "finish", event: "mark" };
    }
    if (stage === "finish" && to.y > from.y && crosses(gates.finish)) {
      boat.lapDone = 2; boat.finishTime = raceTime; return { stage: "complete", event: "finish" };
    }
  }
  return { stage, event: null };
}
