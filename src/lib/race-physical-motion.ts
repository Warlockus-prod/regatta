import { readRaceContext, type PhysicalRaceContext } from "./race-context";
import { physicalCourseWaterBounds } from "./race-courses";
import { raceCrewTrim, stepRaceBoatForces, type InputState, type RaceBoat, type RaceStepOptions, type Vec2 } from "./race-physics";
import { advanceSailingHeading, sailingDisplacement, type SailingSteering } from "./sailing-kinematics";
import { getBoatParams } from "./sailing-physics/boat";
import { createInitialState } from "./sailing-physics/simulate";
import type { Controls } from "./sailing-physics/types";
import { createSharedBoat, stepSharedBoat } from "../features/sailing-lab/runtime/boat-step";
import type { RigMotion } from "../features/sailing-lab/rig/transfer";

export type PhysicalRaceInput = Omit<InputState, "turn"> & { steering: SailingSteering };
/** Crew state the physical boat carries between steps (ADR-0014): the sheets
 * actually held and the sail positions, as in the trainer session. */
export interface PhysicalRaceCrew {
  live?: Controls;
  rig?: RigMotion;
}
export type PhysicalRaceStepOptions = Pick<RaceStepOptions, "speedMul" | "windStrengthMul"> & {
  /** false keeps an instant sail transfer (current bot crews, ADR-0014). */
  rigTransfer?: boolean;
};
/** Propelled movement after boundary recovery and before fleet/hardware
 * collisions. Endpoint copies exclude recovery and later collision pushes. */
export interface PhysicalRaceMotion {
  readonly from: Readonly<Vec2>;
  readonly to: Readonly<Vec2>;
  /** Interior bend points of the travelled polyline from -> path... -> to, at
   * most PHYSICAL_MOTION_MAX_BENDS, recorded where the velocity changed
   * mid-tick (a water bound, a sliding contact, ADR-0015 point 4). Absent
   * means one straight segment. Progress grades the whole polyline. */
  readonly path?: readonly Readonly<Vec2>[];
}
/** A travelled polyline has at most five points: from, four bends, to. */
export const PHYSICAL_MOTION_MAX_BENDS = 4;

const object = (value: unknown): value is Record<string, unknown> =>
  !!value && typeof value === "object" && !Array.isArray(value);
const finite = (value: unknown): value is number => typeof value === "number" && Number.isFinite(value);
const unitFields = ["mainSheet", "jibSheet", "mainTwist", "jibTwist", "reef", "jibFurl"] as const;
function validTrim(value: unknown, complete: boolean): boolean {
  return object(value) && unitFields.every(key => value[key] === undefined && !complete
    || finite(value[key]) && (!complete || value[key] >= 0 && value[key] <= 1))
    && (value.jibSide === undefined && !complete || value.jibSide === -1 || value.jibSide === 1)
    && (value.mainHoisted === undefined || typeof value.mainHoisted === "boolean");
}
export function isPhysicalRaceBoat(boat: RaceBoat): boolean {
  return object(boat) && object(boat.pos) && finite(boat.pos.x) && finite(boat.pos.y)
    && finite(boat.heading) && finite(boat.speed) && boat.speed >= 0
    && (boat.physics === undefined || object(boat.physics)
      && ["trueWindDir", "trueWindSpeed", "heading", "boatSpeed", "heel", "leeway"].every(key => finite((boat.physics as unknown as Record<string, unknown>)[key])))
    && (boat.trim === undefined || validTrim(boat.trim, true))
    && (boat.trimClock === undefined || finite(boat.trimClock) && boat.trimClock >= 0)
    && validCrew(boat as RaceBoat & PhysicalRaceCrew);
}
function validCrew(boat: PhysicalRaceCrew): boolean {
  if (boat.live === undefined && boat.rig === undefined) return true;
  const rig = boat.rig as unknown;
  return validTrim(boat.live, true) && object(rig) && (rig.lee === 1 || rig.lee === -1)
    && finite(rig.main) && finite(rig.jib) && finite(rig.elapsed)
    && (rig.maneuver === "sailing" || rig.maneuver === "tacking" || rig.maneuver === "gybing");
}
export function isPhysicalRaceInput(input: PhysicalRaceInput): boolean {
  if (!object(input) || !object(input.steering)
    || input.autoTrim !== undefined && typeof input.autoTrim !== "boolean"
    || input.trim !== undefined && !validTrim(input.trim, false)) return false;
  const steering = input.steering;
  return steering.mode === "course-assist" ? finite(steering.heading)
    : steering.mode === "helm" && finite(steering.rudder) && typeof steering.lowSpeedAssist === "boolean";
}

/** Explicit ADR-0011 adapter, not a live-race switch. Unknown/missing/legacy
 * context or invalid input returns null before mutating the boat. The caller
 * owns fixed-step scheduling, progress, collisions and result emission. */
export function stepPhysicalBoat(
  boat: RaceBoat,
  dt: number,
  windDir: number,
  gust: number,
  input: PhysicalRaceInput,
  context: PhysicalRaceContext,
  opts: PhysicalRaceStepOptions = {},
): PhysicalRaceMotion | null {
  const read = readRaceContext(context);
  if (!read.ok || read.context.model !== "physical-cruiser-v1"
    || !finite(dt) || dt <= 0 || !finite(windDir) || !finite(gust) || gust < 0
    || !isPhysicalRaceBoat(boat) || !isPhysicalRaceInput(input) || !object(opts)
    || opts.speedMul !== undefined && !finite(opts.speedMul)
    || opts.windStrengthMul !== undefined && (!finite(opts.windStrengthMul) || opts.windStrengthMul < 0)
    || opts.rigTransfer !== undefined && typeof opts.rigTransfer !== "boolean") return null;

  const scale = read.context.metresPerUnit;
  const water = physicalCourseWaterBounds(read.context.profile);
  const boundX = (x: number) => Math.max(water.minX, Math.min(water.maxX, x));
  const boundY = (y: number) => Math.max(water.minY, Math.min(water.maxY, y));
  const from = Object.freeze({ x: boundX(boat.pos.x), y: boundY(boat.pos.y) });
  if (opts.rigTransfer === false) {
    boat.heading = advanceSailingHeading(boat.heading, boat.speed, input.steering, dt);
    const physics = stepRaceBoatForces(boat, dt, windDir, gust, { turn: 0, autoTrim: input.autoTrim, trim: input.trim }, opts);
    return travelBoat(boat, from, sailingDisplacement(boat.heading, physics.leeway, boat.speed, dt), scale, boundX, boundY);
  }
  // The trainer's boat step: helm, crew sheet handling, rig transfer, forces.
  // Bot difficulty (ADR-0007) scales the speed made good, never the model.
  const crew = boat as RaceBoat & PhysicalRaceCrew;
  const params = getBoatParams();
  const mul = Math.max(0.5, Math.min(1.2, opts.speedMul ?? 1));
  const wind = { speed: 12 * (opts.windStrengthMul ?? 1) * gust, direction: windDir };
  const state = { ...(boat.physics ?? createInitialState({ tws: 12 })), heading: boat.heading,
    boatSpeed: boat.speed / mul, trueWindDir: wind.direction, trueWindSpeed: wind.speed };
  const target = raceCrewTrim(boat, state, input, dt);
  const prev = crew.live && crew.rig ? { boat: state, live: crew.live, rig: crew.rig } : createSharedBoat(state, { controls: target }, params);
  const next = stepSharedBoat(prev, { controls: target, steering: input.steering }, wind, params, dt, boat.speed);
  boat.heading = next.boat.heading;
  boat.physics = next.boat;
  boat.speed = next.boat.boatSpeed * mul;
  crew.live = next.live;
  crew.rig = next.rig;
  return travelBoat(boat, from, sailingDisplacement(boat.heading, next.boat.leeway, boat.speed, dt), scale, boundX, boundY);
}

function travelBoat(boat: RaceBoat, from: Readonly<Vec2>, travel: { east: number; north: number }, scale: number,
  boundX: (x: number) => number, boundY: (y: number) => number): PhysicalRaceMotion {
  // Keep the same physical hull and clearance in every course profile.
  const dx = travel.east / scale, dy = -travel.north / scale;
  boat.pos.x = boundX(from.x + dx);
  boat.pos.y = boundY(from.y + dy);
  // The per-axis clamp is a slide along the water bound: the axis into the
  // bound stops where it meets it and the other axis keeps its full travel,
  // so the next tick starts at the bound with an honest tangential velocity.
  // Where that happens mid-tick the travelled path bends; record the bend.
  const bends: { t: number; axis: "x" | "y" }[] = [];
  if (boat.pos.x !== from.x + dx && dx !== 0) bends.push({ t: (boat.pos.x - from.x) / dx, axis: "x" });
  if (boat.pos.y !== from.y + dy && dy !== 0) bends.push({ t: (boat.pos.y - from.y) / dy, axis: "y" });
  const path = bends.filter(b => b.t > 0 && b.t < 1).sort((a, b) => a.t - b.t).map(b => Object.freeze({
    // Each axis travels freely until its own bound, then stays there.
    x: bends.some(o => o.axis === "x" && o.t <= b.t) ? boat.pos.x : from.x + dx * b.t,
    y: bends.some(o => o.axis === "y" && o.t <= b.t) ? boat.pos.y : from.y + dy * b.t,
  })).filter(p => p.x !== boat.pos.x || p.y !== boat.pos.y);
  return Object.freeze({ from, to: Object.freeze({ ...boat.pos }), ...(path.length ? { path: Object.freeze(path) } : {}) });
}
