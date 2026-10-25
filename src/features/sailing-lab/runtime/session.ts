import type { BoatState, BoatParams, Controls, TickDiagnostics } from "../../../lib/sailing-physics";
import type { RigMotion } from "../rig/transfer";
import { interpolateControls } from "./controls";
import { SAILING_STEP_SECONDS } from "./fixed-clock";
import { compass } from "./math";
import { advanceSailingHeading, sailingDisplacement, type SailingSteering } from "../../../lib/sailing-kinematics";
import { stepWithRig } from "./step-rig";
import { createWindState, stepWind, type WindMode, type WindState } from "./wind";
import { isSessionInput } from "./input";
import type { MainTrimCommand, MainTrimState } from "../rig/main-trim";

export const SESSION_MODEL = "assisted-cruiser-v2";
export { COURSE_ASSIST_TURN_RATE_DEG_PER_S as HEADING_TURN_RATE_DEG_PER_S } from "../../../lib/sailing-kinematics";
export type Steering = SailingSteering;
export interface SessionInput {
  mainTrim?: MainTrimCommand;
  controls: Controls;
  steering: Steering;
  wind: { speed: number; direction: number; mode: WindMode };
}
type SailResponse = ReturnType<typeof stepWithRig>["main"];
/** Serializable authoritative state. Views contain no independent physics. */
export interface SailingSession {
  mainTrim?: MainTrimState;
  model: typeof SESSION_MODEL;
  ticks: number;
  simTime: number;
  boat: BoatState;
  live: Controls;
  target: Controls;
  steering: Steering;
  wind: WindState;
  windMode: WindMode;
  rig: RigMotion;
  lastDiag: TickDiagnostics;
  main: SailResponse;
  jib: SailResponse;
  mainIncidence: number;
  jibIncidence: number;
  /** Metres in earth coordinates. Renderer converts north to its own Z axis. */
  position: { east: number; north: number };
}

export function createSailingSession(boat: BoatState, input: SessionInput, params: BoatParams, seed?: number): SailingSession {
  if (!isSessionInput(input)) throw new RangeError("Invalid or unsupported sailing session input");
  const wind = createWindState({ baseTws: input.wind.speed, baseDir: compass(input.wind.direction), seed });
  const initial = { ...boat, trueWindSpeed: wind.baseTws, trueWindDir: wind.baseDir };
  const result = stepWithRig(initial, input.controls, params, null, 0, input.mainTrim ? { command: input.mainTrim, state: null } : undefined);
  return {
    model: SESSION_MODEL, ticks: 0, simTime: 0, boat: result.state,
    live: { ...result.resolvedControls }, target: { ...input.controls }, steering: { ...input.steering },
    ...(result.mainTrim ? { mainTrim: result.mainTrim } : {}),
    wind, windMode: input.wind.mode, rig: result.motion, lastDiag: result.diag,
    main: result.main, jib: result.jib, mainIncidence: result.mainIncidence, jibIncidence: result.jibIncidence,
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
  const live = interpolateControls(prev.live, input.controls, dt);
  const steering = input.steering;
  const heading = advanceSailingHeading(prev.boat.heading, prev.boat.boatSpeed, steering, dt);
  const boat = { ...prev.boat, heading, trueWindSpeed: wind.baseTws * wind.twsFactor, trueWindDir: compass(wind.baseDir + wind.dirOffset) };
  // Control-mode changes require an explicit fresh study, never a hidden
  // conversion that can jump the boom or erase a loaded tackle.
  if (Boolean(prev.mainTrim) !== Boolean(input.mainTrim)) throw new RangeError("Start a new session to change rig control mode");
  const result = stepWithRig(boat, live, params, prev.rig, dt, input.mainTrim ? { command: input.mainTrim, state: prev.mainTrim ?? null } : undefined);
  const travel = sailingDisplacement(result.state.heading, result.state.leeway, result.state.boatSpeed, dt);
  const ticks = prev.ticks + 1;
  return {
    model: SESSION_MODEL, ticks, simTime: ticks * dt, boat: result.state, live: result.resolvedControls,
    ...(result.mainTrim ? { mainTrim: result.mainTrim } : {}),
    target: { ...input.controls }, steering: { ...steering }, wind, windMode: input.wind.mode,
    rig: result.motion, lastDiag: result.diag, main: result.main, jib: result.jib,
    mainIncidence: result.mainIncidence, jibIncidence: result.jibIncidence,
    position: { east: prev.position.east + travel.east, north: prev.position.north + travel.north },
  };
}
