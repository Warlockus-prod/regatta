import type { BoatState, BoatParams, Controls } from "../../../lib/sailing-physics";
import { SAILING_STEP_SECONDS } from "./fixed-clock";
import { compass } from "./math";
import { type SailingSteering } from "../../../lib/sailing-kinematics";
import { createSharedBoat, stepSharedBoat, type SharedBoatState } from "./boat-step";
import { createWindState, stepWind, type WindMode, type WindState } from "./wind";
import { isSessionInput } from "./input";
import type { MainTrimCommand } from "../rig/main-trim";

export const SESSION_MODEL = "assisted-cruiser-v2";
export { COURSE_ASSIST_TURN_RATE_DEG_PER_S as HEADING_TURN_RATE_DEG_PER_S } from "../../../lib/sailing-kinematics";
export type Steering = SailingSteering;
export interface SessionInput {
  mainTrim?: MainTrimCommand;
  controls: Controls;
  steering: Steering;
  wind: { speed: number; direction: number; mode: WindMode };
}
/** Serializable authoritative state. Views contain no independent physics. */
export interface SailingSession extends SharedBoatState {
  model: typeof SESSION_MODEL;
  ticks: number;
  simTime: number;
  target: Controls;
  steering: Steering;
  wind: WindState;
  windMode: WindMode;
  /** Metres in earth coordinates. Renderer converts north to its own Z axis. */
  position: { east: number; north: number };
}

const rigFields = (shared: SharedBoatState) => ({ rig: shared.rig, lastDiag: shared.lastDiag,
  main: shared.main, jib: shared.jib, mainIncidence: shared.mainIncidence, jibIncidence: shared.jibIncidence });

export function createSailingSession(boat: BoatState, input: SessionInput, params: BoatParams, seed?: number): SailingSession {
  if (!isSessionInput(input)) throw new RangeError("Invalid or unsupported sailing session input");
  const wind = createWindState({ baseTws: input.wind.speed, baseDir: compass(input.wind.direction), seed });
  const initial = { ...boat, trueWindSpeed: wind.baseTws, trueWindDir: wind.baseDir };
  const shared = createSharedBoat(initial, input, params);
  // Key order is part of the serialized checkpoint and its golden digest.
  return {
    model: SESSION_MODEL, ticks: 0, simTime: 0, boat: shared.boat,
    live: shared.live, target: { ...input.controls }, steering: { ...input.steering },
    ...(shared.mainTrim ? { mainTrim: shared.mainTrim } : {}),
    wind, windMode: input.wind.mode, ...rigFields(shared),
    position: { east: 0, north: 0 },
  };
}

export function sessionInput(session: SailingSession): SessionInput {
  return { controls: { ...session.target }, steering: { ...session.steering },
    ...(session.mainTrim ? { mainTrim: { ...session.mainTrim.target } } : {}),
    wind: { speed: session.wind.baseTws, direction: session.wind.baseDir, mode: session.windMode } };
}

/** Exactly one 30 Hz step. Pause is a host concern: do not call while paused.
 * Course assist is a teaching constraint, not a simulated autopilot. Sails
 * currently transfer with an assisted crew; no manual handling is certified.
 */
export function stepSailingSession(prev: SailingSession, input: SessionInput, params: BoatParams): SailingSession {
  if (!isSessionInput(input)) throw new RangeError("Invalid or unsupported sailing session input");
  const dt = SAILING_STEP_SECONDS;
  const wind = stepWind({ ...prev.wind, baseTws: input.wind.speed, baseDir: compass(input.wind.direction) }, input.wind.mode, dt);
  const shared = stepSharedBoat(prev, input,
    { speed: wind.baseTws * wind.twsFactor, direction: compass(wind.baseDir + wind.dirOffset) }, params, dt);
  const travel = shared.travel;
  const ticks = prev.ticks + 1;
  return {
    model: SESSION_MODEL, ticks, simTime: ticks * dt, boat: shared.boat, live: shared.live,
    ...(shared.mainTrim ? { mainTrim: shared.mainTrim } : {}),
    target: { ...input.controls }, steering: { ...input.steering }, wind, windMode: input.wind.mode,
    ...rigFields(shared),
    position: { east: prev.position.east + travel.east, north: prev.position.north + travel.north },
  };
}
