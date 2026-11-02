import { angleDiff, bearing, calcTWA, distance, normalizeAngle, raceAutopilotPlan, WORLD, type AutopilotState, type RaceBoat, type RaceCourse, type RaceRoutePath, type Vec2 } from "./race-physics";

export type RaceGuidanceLeg = "start" | "return-start" | "windward" | "round-port" | "finish" | "complete" | "waypoint";
export type RaceGuidanceAction = "hold" | "steer-port" | "steer-starboard" | "tack" | "gybe" | "return-start" | "round-port";
export interface RaceGuidance {
  leg: RaceGuidanceLeg;
  action: RaceGuidanceAction;
  target: Vec2;
  /** World units, matching the race adapter. The scene owns conversion to metres. */
  distance: number;
  bearing: number;
  suggestedHeading: number;
  turn: -1 | 0 | 1;
  targetInNoGo: boolean;
  /** Windward side, not the sign of the race adapter's heading-minus-wind TWA. */
  tack: "port" | "starboard" | null;
  /** Shared planner geometry. Online waypoint aids deliberately omit it. */
  path?: RaceRoutePath;
  beating?: boolean;
}

export interface RaceGuidanceState {
  courseKey: string;
  autopilot: AutopilotState;
}

const pointIsFinite = (p: Vec2 | undefined) => Boolean(p && Number.isFinite(p.x) && Number.isFinite(p.y));
// Responsive solo steering can follow a slightly tighter stadium than legacy
// bots. Its 75-unit radius crosses the standard gates 66.3 east/west and 40
// north, inside their 25..95 limits. A shorter correction lookahead keeps a
// delayed heading entry from cutting across the far side of the rounding.
const ADVISORY_ROUTE = { radius: 75, lookahead: 30 };
// M0-4: the bots' planner tacks inside a corridor 12..60 units either side of
// the climb, so a player who followed the hint was told to tack 5-7 times on
// one beat and then criticised by the coach for tacking. Low on the beat the
// hint plans from a probe whose sideways offset from the climb is shrunk,
// which widens that corridor by 1 / scale (up to 200 units either side). The
// last `final` units below the rounding, and any speed shedding for it, stay
// the planner's own, so the approach to the mark is unchanged. The planner,
// its constants and the bots are untouched.
const HINT_CORRIDOR = { minScale: 0.3, final: 300, rise: 100 };

/** Factor applied to the probe's offset from the climb at `rise` units below
 * the rounding centre: 1 near the top, down to minScale low on the beat. */
export function hintCorridorScale(rise: number): number {
  if (!(rise > HINT_CORRIDOR.final)) return 1;
  return Math.max(HINT_CORRIDOR.minScale, 1 / (1 + (rise - HINT_CORRIDOR.final) / HINT_CORRIDOR.rise));
}

/** This advisory planner supports the existing horizontal windward/return
 * course only. A different or damaged course gets no misleading route aid. */
function supportedCourse(course: RaceCourse): boolean {
  if (!course || !Array.isArray(course.marks) || course.marks.some(m => !m || !pointIsFinite(m.pos) || !Number.isFinite(m.radius))) return false;
  const mark = course?.marks?.[0];
  if (!mark || mark.type !== "windward" || !pointIsFinite(mark.pos) || !Number.isFinite(mark.radius) || mark.radius < 3 || mark.radius > 24) return false;
  if (course.marks.some((m, i) => i > 0 && m.type === "windward")) return false;
  if (mark.pos.x < 110 || mark.pos.x > WORLD.width - 110 || mark.pos.y < 100) return false;
  for (const line of [course.startLine, course.finishLine]) {
    if (!line || !pointIsFinite(line.a) || !pointIsFinite(line.b) || line.a.y !== line.b.y || Math.abs(line.b.x - line.a.x) < 100) return false;
    if (Math.min(line.a.x, line.b.x) < 100 || Math.max(line.a.x, line.b.x) > WORLD.width - 100 || line.a.y > WORLD.height - 100 || line.a.y - mark.pos.y < 220) return false;
  }
  return true;
}

function copyMemory(memory: AutopilotState): AutopilotState {
  return { ...memory, dip: memory.dip && { ...memory.dip }, finishLoop: memory.finishLoop && { ...memory.finishLoop } };
}

/** The bots' planner sails its beat at this true wind angle (race-physics.ts
 * AUTOPILOT.closeHauled; that file is the server's generated physics and is
 * not changed). The hint recognises a close-hauled plan heading by it. */
export const PLANNER_CLOSE_HAULED_TWA = 45;

/** Read-only advice with independent tack/recovery memory. The caller resets
 * state for a new race. Only a shallow boat copy is passed to the shared
 * planner: it writes autopilot memory, never position, trim, helm or gates.
 * Package 7: with `upwindTwa` (the race's best VMG angle, raceUpwind in
 * features/race-hud/target.ts on the same upwind-vmg.ts solver the skill bars
 * and the coach grade with) a close-hauled plan heading is sailed at that
 * angle on the same tack, so the suggested course is the course the race
 * grades as best. Without it the hint is the planner's own, as before. */
export function planRaceGuidance(boat: RaceBoat, course: RaceCourse, windDir: number, previous?: RaceGuidanceState | null,
  upwindTwa?: number): {
  guidance: RaceGuidance | null; state: RaceGuidanceState | null;
} {
  if (!supportedCourse(course) || !boat || !pointIsFinite(boat.pos) || ![boat.heading, boat.speed, boat.lapDone, windDir].every(Number.isFinite)
    || boat.speed < 0 || ![0, 1, 2].includes(boat.lapDone) || ![0, 1, 2].includes(boat.roundPhase ?? 0)) return { guidance: null, state: null };
  const mark = course.marks[0];
  const courseKey = JSON.stringify([course.startLine, course.finishLine, mark.pos, mark.radius]);
  const memory = () => previous?.courseKey === courseKey && previous.autopilot ? copyMemory(previous.autopilot) : undefined;
  let probe: RaceBoat = { ...boat, autopilot: memory() };
  let plan = raceAutopilotPlan(probe, course, windDir, ADVISORY_ROUTE);
  // Low on the climb (started, before any rounding, not sailing back down
  // after a miss, not shedding speed for the rounding) the hint plans again
  // from a probe nearer the climb line; see HINT_CORRIDOR.
  const scale = hintCorridorScale(boat.pos.y - plan.rounding.center.y);
  if (scale < 1 && boat.started && boat.lapDone === 0 && !(boat.roundPhase ?? 0) && plan.path.kind === "vertical" && plan.path.north
    && !probe.autopilot?.shed && !probe.autopilot?.down) {
    probe = { ...boat, pos: { x: plan.path.x + (boat.pos.x - plan.path.x) * scale, y: boat.pos.y }, autopilot: memory() };
    plan = raceAutopilotPlan(probe, course, windDir, ADVISORY_ROUTE);
  }
  const line = boat.lapDone > 0 ? course.finishLine : course.startLine;
  const cx = (line.a.x + line.b.x) / 2;
  let leg: RaceGuidanceLeg;
  let target: Vec2;
  if (boat.lapDone >= 2) {
    leg = "complete"; target = { ...boat.pos };
  } else if (!boat.started) {
    leg = probe.autopilot?.dip ? "return-start" : "start";
    target = { x: cx, y: line.a.y + (leg === "return-start" ? 60 : -60) };
  } else if (boat.lapDone > 0) {
    leg = "finish";
    target = { x: plan.path.kind === "vertical" ? plan.path.x : cx, y: line.a.y + 30 };
  } else {
    leg = plan.path.kind === "circle" || probe.autopilot?.down || (boat.roundPhase ?? 0) > 0 ? "round-port" : "windward";
    // Exact points on the shared stadium where the ordered gates are met.
    const { center, radius } = plan.rounding;
    const drop = center.y - mark.pos.y;
    const offset = Math.sqrt(radius * radius - drop * drop);
    target = (boat.roundPhase ?? 0) === 0 ? { x: mark.pos.x + offset, y: mark.pos.y }
      : boat.roundPhase === 1 ? { x: mark.pos.x, y: center.y - radius }
        : { x: mark.pos.x - offset, y: mark.pos.y + 1 };
  }
  const closeHauled = upwindCloseHauled(upwindTwa);
  const guidance = guidanceToTarget(boat, target, windDir, closeHauled ?? PLANNER_CLOSE_HAULED_TWA, leg);
  applyHeading(guidance, boat.heading, windDir, leg === "complete" ? boat.heading : beatHeading(plan.heading, windDir, closeHauled));
  guidance.path = plan.path;
  guidance.beating = plan.beating;
  return { guidance, state: { courseKey, autopilot: copyMemory(probe.autopilot!) } };
}

/** A usable solver angle (the hint never points inside 35 or freer than 60,
 * the same clamp guidanceToTarget applies), else null. */
function upwindCloseHauled(twa: number | undefined): number | null {
  return typeof twa === "number" && Number.isFinite(twa) ? Math.max(35, Math.min(60, twa)) : null;
}

/** The planner's heading, or the solver's close-hauled angle on the same tack
 * when the planner holds its own close-hauled course. */
function beatHeading(planHeading: number, windDir: number, closeHauled: number | null): number {
  if (closeHauled === null) return planHeading;
  const off = angleDiff(windDir, planHeading);
  if (Math.abs(Math.abs(off) - PLANNER_CLOSE_HAULED_TWA) > 0.01) return planHeading;
  return normalizeAngle(windDir + Math.sign(off) * closeHauled);
}

/** Initial read-only snapshot; live races retain planRaceGuidance.state. */
export function raceGuidance(boat: RaceBoat, course: RaceCourse, windDir: number): RaceGuidance | null {
  return planRaceGuidance(boat, course, windDir).guidance;
}

function applyHeading(guidance: RaceGuidance, currentHeading: number, windDir: number, heading: number): void {
  const change = angleDiff(currentHeading, heading);
  guidance.suggestedHeading = heading;
  guidance.turn = Math.abs(change) < 5 ? 0 : change > 0 ? 1 : -1;
  const before = angleDiff(currentHeading, windDir), after = angleDiff(heading, windDir);
  let action: RaceGuidanceAction = guidance.turn === 0 ? "hold" : guidance.turn > 0 ? "steer-starboard" : "steer-port";
  if (Math.abs(before) > 1 && Math.abs(after) > 1 && Math.sign(before) !== Math.sign(after)) action = Math.abs(before) + Math.abs(after) < 180 ? "tack" : "gybe";
  if (guidance.leg === "return-start") action = "return-start";
  if (guidance.leg === "round-port" && action === "hold") action = "round-port";
  if (guidance.leg === "complete") action = "hold";
  guidance.action = action;
}

/** Shared read-only heading and maneuver aid for an explicitly supplied
 * target. Online callers use the server waypoint without reconstructing
 * started/roundPhase or advancing any local course progress. */
export function guidanceToTarget(boat: Pick<RaceBoat, "pos" | "heading">, target: Vec2, windDir: number,
  closeHauled = 45, leg: RaceGuidanceLeg = "waypoint"): RaceGuidance {
  const direct = leg === "complete" ? boat.heading : bearing(boat.pos, target);
  const limit = Math.max(35, Math.min(60, Number.isFinite(closeHauled) ? closeHauled : 45));
  const targetInNoGo = leg !== "complete" && Math.abs(calcTWA(direct, windDir)) < limit;
  let heading = direct;
  if (targetInNoGo) {
    const portCourse = normalizeAngle(windDir + limit);
    const starboardCourse = normalizeAngle(windDir - limit);
    heading = Math.abs(angleDiff(boat.heading, portCourse)) <= Math.abs(angleDiff(boat.heading, starboardCourse)) ? portCourse : starboardCourse;
  }
  const change = angleDiff(boat.heading, heading);
  const turn: -1 | 0 | 1 = Math.abs(change) < 5 ? 0 : change > 0 ? 1 : -1;
  const before = angleDiff(boat.heading, windDir);
  const after = angleDiff(heading, windDir);
  const changesTack = Math.abs(before) > 1 && Math.abs(after) > 1 && Math.sign(before) !== Math.sign(after);
  let action: RaceGuidanceAction = turn === 0 ? "hold" : turn > 0 ? "steer-starboard" : "steer-port";
  if (changesTack) action = Math.abs(before) + Math.abs(after) < 180 ? "tack" : "gybe";
  if (leg === "return-start") action = "return-start";
  if (leg === "round-port" && action === "hold") action = "round-port";
  if (leg === "complete") action = "hold";
  return { leg, action, target: { ...target }, distance: distance(boat.pos, target), bearing: direct, suggestedHeading: heading, turn,
    targetInNoGo, tack: Math.abs(before) < 1 || Math.abs(before) > 179 ? null : before > 0 ? "starboard" : "port" };
}
