// Pure mapping from a top-down race boat (src/lib/race-physics.ts) to the 3D
// yacht pose (src/features/simulator-3d/types.ts). No three.js, so it is
// tested on its own: the 3D race must show the same race the canvas runs.

import { calcTWA, distance, UNITS_PER_KNOT_SECOND, type Vec2 } from "@/lib/race-physics";
import { getBoatParams } from "@/lib/sailing-physics/boat";
import type { BoatState, Controls } from "@/lib/sailing-physics/types";
import type { YachtState } from "@/features/simulator-3d/types";

/**
 * Metres per race unit. Boats repel at 22 units (MIN_BOAT_SEPARATION), and a
 * 13 m hull there just touches its neighbour, so the race area is 480 x 720 m.
 */
export const METRES_PER_UNIT = 0.6;

/**
 * The race runs fast: a boat covers UNITS_PER_KNOT_SECOND units per knot per
 * second, so in metres it moves this many times its real speed. The wake gets
 * the scaled speed, so its foam stays put on the water instead of being towed.
 */
export const VISUAL_SPEEDUP = (UNITS_PER_KNOT_SECOND * METRES_PER_UNIT) / 0.514444;

/** Race camera: behind the stern, or high above it to read the course. */
export type RaceCamera = "stern" | "high";

/** Inside this true wind angle the sails cannot fill (the canvas race uses 30 too). */
export const NO_GO_DEG = 30;

export interface Race3DBoat {
  id: string;
  name?: string;
  color: string;
  pos: Vec2;
  heading: number;
  speed: number;
  lapDone: number;
  finishTime?: number;
  started?: boolean;
  returningToStart?: boolean;
  roundPhase?: number;
  isPlayer?: boolean;
  physics?: BoatState;
  trim?: Controls;
}

export interface Race3DCourse {
  marks: { pos: Vec2; type: "start" | "windward" | "finish" }[];
  startLine: { a: Vec2; b: Vec2 };
  finishLine: { a: Vec2; b: Vec2 };
}

/** Race position (x east, y south, units) to world metres (X east, Z south). */
export function toWorld(p: Vec2): { x: number; z: number } {
  return { x: p.x * METRES_PER_UNIT, z: p.y * METRES_PER_UNIT };
}

const PARAMS = getBoatParams();
const clamp01 = (v: number) => Math.max(0, Math.min(1, v));

/**
 * The yacht pose for one race boat. The sails go to leeward (wind on port,
 * boom to starboard), as far out as the boat's own trim lets them, and flog
 * when the boat points into the no-go zone. `turnRate` is the heading change
 * in deg/s; the rudder follows it.
 */
export function racePose(boat: Race3DBoat, windDir: number, turnRate = 0): YachtState {
  const twa = calcTWA(boat.heading, windDir); // positive: wind over the port side
  const side: 1 | -1 = twa >= 0 ? 1 : -1;
  const trim = boat.trim;
  const mainOff = trim ? (1 - clamp01(trim.mainSheet)) * PARAMS.mainMaxOff : 25;
  const jibOff = trim ? PARAMS.jibMinOff + (1 - clamp01(trim.jibSheet)) * (PARAMS.jibMaxOff - PARAMS.jibMinOff) : 18;
  const irons = Math.abs(twa) < NO_GO_DEG;
  const luff = irons ? 1 : 0;
  const fill = irons ? 0.2 : 1;
  return {
    boomAngle: side * (irons ? 4 : mainOff),
    jibAngle: side * (irons ? 5 : jibOff),
    sailSide: side,
    camber: 0.6,
    twist: trim?.mainTwist ?? 0.35,
    luff,
    fill,
    reef: trim?.reef ?? 0,
    mainHoisted: trim?.mainHoisted !== false,
    rudderAngle: Math.max(-30, Math.min(30, turnRate * 1.2)),
    heel: boat.physics?.heel ?? 0,
    heading: boat.heading,
    speedKn: boat.speed * VISUAL_SPEEDUP,
    wind: { from: windDir, knots: boat.physics?.trueWindSpeed ?? 12 },
    travel: toWorld(boat.pos),
    jibShape: { camber: 0.7, twist: trim?.jibTwist ?? 0.4, luff, fill, furl: clamp01(trim?.jibFurl ?? 0) },
  };
}

/** Signed heading change from `from` to `to`, -180..180 deg. */
export function headingDelta(from: number, to: number): number {
  return ((to - from + 540) % 360) - 180;
}

/** Where the player is heading next: the windward mark, then the finish line. */
export function nextTarget(boat: Race3DBoat, course: Race3DCourse): Vec2 | null {
  if (boat.lapDone >= 2) return null;
  if (boat.lapDone === 0) return course.marks.find((m) => m.type === "windward")?.pos ?? null;
  const { a, b } = course.finishLine;
  return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
}

/**
 * Places in the race, 1 = leading, as the race HUD counts them: finished boats
 * by time, then boats on the run by distance to the finish, then boats on the
 * beat by distance to the windward mark.
 */
export function raceRanks(boats: Race3DBoat[], course: Race3DCourse): Map<string, number> {
  const { a, b } = course.finishLine;
  const finish = { x: (a.x + b.x) / 2, y: a.y };
  const windward = course.marks.find((m) => m.type === "windward")?.pos ?? course.marks[0].pos;
  const score = (boat: Race3DBoat) => boat.lapDone >= 2 ? 10000 - (boat.finishTime ?? 0)
    : boat.lapDone === 1 ? 5000 - distance(boat.pos, finish)
    : 2500 - distance(boat.pos, windward);
  const sorted = [...boats].sort((x, y) => score(y) - score(x));
  return new Map(sorted.map((boat, i) => [boat.id, i + 1]));
}
