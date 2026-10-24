import { angleDiff, bearing, calcTWA, distance, MIN_BOAT_SEPARATION, normalizeAngle, type RaceBoat, type RaceCourse, type Vec2 } from "./race-physics";

export type RaceGuidanceLeg = "start" | "return-start" | "windward" | "round-port" | "finish" | "complete";
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
}

/** Read-only route aid. It neither steers the boat nor advances its rounding gates.
 * The proposed close-hauled headings are teaching aids, not a wind/traffic-aware router. */
export function raceGuidance(boat: RaceBoat, course: RaceCourse, windDir: number, closeHauled = 45): RaceGuidance {
  const line = course.startLine;
  const lineX = (line.a.x + line.b.x) / 2;
  const lineY = (line.a.y + line.b.y) / 2;
  let leg: RaceGuidanceLeg;
  let target: Vec2;
  if (boat.lapDone >= 2) {
    leg = "complete"; target = { ...boat.pos };
  } else if (!boat.started) {
    const returning = boat.pos.y < lineY || Boolean(boat.returningToStart && boat.pos.y < lineY + 35);
    leg = returning ? "return-start" : "start";
    target = { x: lineX, y: lineY + (returning ? 60 : -60) };
  } else if (boat.lapDone > 0) {
    leg = "finish";
    target = { x: (course.finishLine.a.x + course.finishLine.b.x) / 2, y: course.finishLine.a.y + 30 };
  } else {
    const mark = course.marks[0];
    const r = mark.radius + MIN_BOAT_SEPARATION / 2 + 35;
    leg = (boat.roundPhase ?? 0) > 0 || distance(boat.pos, mark.pos) < r * 3 ? "round-port" : "windward";
    target = (boat.roundPhase ?? 0) === 0 ? { x: mark.pos.x + r, y: mark.pos.y - r }
      : boat.roundPhase === 1 ? { x: mark.pos.x - r, y: mark.pos.y - r }
        : { x: mark.pos.x - r, y: mark.pos.y + r };
  }
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
  return { leg, action, target, distance: distance(boat.pos, target), bearing: direct, suggestedHeading: heading, turn,
    targetInNoGo, tack: Math.abs(before) < 1 || Math.abs(before) > 179 ? null : before > 0 ? "starboard" : "port" };
}
