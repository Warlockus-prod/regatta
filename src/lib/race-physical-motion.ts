import { readRaceContext, type PhysicalRaceContext } from "./race-context";
import { physicalCourseDefinition } from "./race-courses";
import { stepRaceBoatForces, type InputState, type RaceBoat, type RaceStepOptions, type Vec2 } from "./race-physics";
import { advanceSailingHeading, sailingDisplacement, type SailingSteering } from "./sailing-kinematics";

export type PhysicalRaceInput = Omit<InputState, "turn"> & { steering: SailingSteering };
export type PhysicalRaceStepOptions = Pick<RaceStepOptions, "speedMul" | "windStrengthMul">;
/** Propelled movement after boundary recovery and before fleet/hardware
 * collisions. Endpoint copies exclude recovery and later collision pushes. */
export interface PhysicalRaceMotion {
  readonly from: Readonly<Vec2>;
  readonly to: Readonly<Vec2>;
}

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
function validBoat(boat: RaceBoat): boolean {
  return object(boat) && object(boat.pos) && finite(boat.pos.x) && finite(boat.pos.y)
    && finite(boat.heading) && finite(boat.speed) && boat.speed >= 0
    && (boat.physics === undefined || object(boat.physics)
      && ["trueWindDir", "trueWindSpeed", "heading", "boatSpeed", "heel", "leeway"].every(key => finite((boat.physics as unknown as Record<string, unknown>)[key])))
    && (boat.trim === undefined || validTrim(boat.trim, true))
    && (boat.trimClock === undefined || finite(boat.trimClock) && boat.trimClock >= 0);
}
function validInput(input: PhysicalRaceInput): boolean {
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
    || !validBoat(boat) || !validInput(input) || !object(opts)
    || opts.speedMul !== undefined && !finite(opts.speedMul)
    || opts.windStrengthMul !== undefined && (!finite(opts.windStrengthMul) || opts.windStrengthMul < 0)) return null;

  const course = physicalCourseDefinition(read.context.profile);
  const scale = read.context.metresPerUnit;
  const margin = (course.hardware.boatDiameterMetres / 2 + course.hardware.clearanceBufferMetres) / scale;
  const boundX = (x: number) => Math.max(margin, Math.min(course.bounds.widthMetres / scale - margin, x));
  const boundY = (y: number) => Math.max(margin, Math.min(course.bounds.heightMetres / scale - margin, y));
  const from = Object.freeze({ x: boundX(boat.pos.x), y: boundY(boat.pos.y) });
  boat.heading = advanceSailingHeading(boat.heading, boat.speed, input.steering, dt);
  const physics = stepRaceBoatForces(boat, dt, windDir, gust, { turn: 0, autoTrim: input.autoTrim, trim: input.trim }, opts);
  const travel = sailingDisplacement(boat.heading, physics.leeway, boat.speed, dt);
  // Keep the same physical hull and clearance in every course profile.
  boat.pos.x = boundX(from.x + travel.east / scale);
  boat.pos.y = boundY(from.y - travel.north / scale);
  return Object.freeze({ from, to: Object.freeze({ ...boat.pos }) });
}
