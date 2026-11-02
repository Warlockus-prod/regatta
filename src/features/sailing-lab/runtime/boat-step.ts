import type { BoatParams, BoatState, Controls, TickDiagnostics } from "../../../lib/sailing-physics";
import { advanceSailingHeading, COURSE_ASSIST_TURN_RATE_DEG_PER_S, sailingDisplacement, type SailingSteering } from "../../../lib/sailing-kinematics";
import type { RigMotion } from "../rig/transfer";
import type { MainTrimCommand, MainTrimState } from "../rig/main-trim";
import { interpolateControls } from "./controls";
import { stepWithRig } from "./step-rig";

type SailResponse = ReturnType<typeof stepWithRig>["main"];

/** The boat part of a trainer session and of a physical race boat (ADR-0014).
 * One owner for helm, crew sheet handling, rig transfer, forces and travel. */
export interface SharedBoatState {
  boat: BoatState;
  live: Controls;
  rig: RigMotion;
  mainTrim?: MainTrimState;
  lastDiag: TickDiagnostics;
  main: SailResponse;
  jib: SailResponse;
  mainIncidence: number;
  jibIncidence: number;
}
export interface SharedBoatCommand {
  controls: Controls;
  steering: SailingSteering;
  mainTrim?: MainTrimCommand;
}
export interface SharedBoatStep extends SharedBoatState {
  /** Metres in earth coordinates for this step, east and north positive. */
  travel: { east: number; north: number };
}

/** Exactly one step of the shared boat. Wind is the true wind the boat sees
 * this step (speed in knots, compass direction it blows from). helmSpeed is
 * the speed the hull actually makes for rudder authority, when a race
 * handicap (ADR-0007) scales it away from the force model's own speed. */
export function stepSharedBoat(prev: Pick<SharedBoatState, "boat" | "live" | "rig" | "mainTrim">, command: SharedBoatCommand,
  wind: { speed: number; direction: number }, params: BoatParams, dt: number, helmSpeed = prev.boat.boatSpeed): SharedBoatStep {
  const live = interpolateControls(prev.live, command.controls, dt);
  const heading = advanceSailingHeading(prev.boat.heading, helmSpeed, command.steering, dt);
  const boat = { ...prev.boat, heading, trueWindSpeed: wind.speed, trueWindDir: wind.direction };
  // Control-mode changes require an explicit fresh study, never a hidden
  // conversion that can jump the boom or erase a loaded tackle.
  if (Boolean(prev.mainTrim) !== Boolean(command.mainTrim)) throw new RangeError("Start a new session to change rig control mode");
  // The yaw rate the helm produced feeds the turning drag of the cruiser
  // profile (ADR-0021); the classic profile ignores it. Below 3 kn the
  // charged rate fades with the helm law's speed authority: course assist
  // spinning a stopped boat is a teaching aid, not a lateral force the keel
  // makes. At speed the whole turn is charged, assist included, so a 45 deg/s
  // assisted tack costs more than a 22 deg/s helm tack, not nothing.
  const rawYaw = dt > 0 ? (((heading - prev.boat.heading + 540) % 360) - 180) / dt : 0;
  const yawCap = COURSE_ASSIST_TURN_RATE_DEG_PER_S * Math.max(0, Math.min(1, helmSpeed / 3));
  const yawRateDegPerS = Math.max(-yawCap, Math.min(yawCap, rawYaw));
  const result = stepWithRig(boat, live, params, prev.rig, dt,
    command.mainTrim ? { command: command.mainTrim, state: prev.mainTrim ?? null } : undefined, { yawRateDegPerS });
  return {
    boat: result.state, live: result.resolvedControls,
    ...(result.mainTrim ? { mainTrim: result.mainTrim } : {}),
    rig: result.motion, lastDiag: result.diag, main: result.main, jib: result.jib,
    mainIncidence: result.mainIncidence, jibIncidence: result.jibIncidence,
    travel: sailingDisplacement(result.state.heading, result.state.leeway, result.state.boatSpeed, dt),
  };
}

/** Settle a boat at rest on its first state, as a fresh trainer session does. */
export function createSharedBoat(boat: BoatState, command: Omit<SharedBoatCommand, "steering">, params: BoatParams): SharedBoatState {
  const result = stepWithRig(boat, command.controls, params, null, 0,
    command.mainTrim ? { command: command.mainTrim, state: null } : undefined);
  return {
    boat: result.state, live: { ...result.resolvedControls },
    ...(result.mainTrim ? { mainTrim: result.mainTrim } : {}),
    rig: result.motion, lastDiag: result.diag, main: result.main, jib: result.jib,
    mainIncidence: result.mainIncidence, jibIncidence: result.jibIncidence,
  };
}
