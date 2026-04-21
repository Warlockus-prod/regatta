import { getBoatParams, tick, type Controls } from '@/lib/sailing-physics';
import {
  CONTROL_RATES,
  HEADING_TURN_RATE_DEG_PER_S,
  type RuntimeState,
} from './runtime-types';

// ---------------------------------------------------------------------------
// V2 step. Structurally identical to V3's step; the coaching extras live in
// the hook and the scene, so the stepper itself is pure physics + control
// interpolation. PR-7 may lift this into a shared module.
// ---------------------------------------------------------------------------

function clamp(value: number, min: number, max: number): number {
  return value < min ? min : value > max ? max : value;
}

function approach(current: number, target: number, maxStep: number): number {
  if (!isFinite(maxStep)) return target;
  const delta = target - current;
  if (Math.abs(delta) <= maxStep) return target;
  return current + Math.sign(delta) * maxStep;
}

export function interpolateControls(live: Controls, target: Controls, dt: number): Controls {
  return {
    mainSheet: clamp(approach(live.mainSheet, target.mainSheet, CONTROL_RATES.mainSheet * dt), 0, 1),
    jibSheet: clamp(approach(live.jibSheet, target.jibSheet, CONTROL_RATES.jibSheet * dt), 0, 1),
    mainTwist: clamp(approach(live.mainTwist, target.mainTwist, CONTROL_RATES.mainTwist * dt), 0, 1),
    jibTwist: clamp(approach(live.jibTwist, target.jibTwist, CONTROL_RATES.jibTwist * dt), 0, 1),
    reef: clamp(approach(live.reef, target.reef, CONTROL_RATES.reef * dt), 0, 1),
    jibFurl: clamp(approach(live.jibFurl, target.jibFurl, CONTROL_RATES.jibFurl * dt), 0, 1),
    jibSide: target.jibSide,
  };
}

function normalizeAngle(deg: number): number {
  return ((deg % 360) + 360) % 360;
}

export function approachHeading(current: number, target: number, maxStep: number): number {
  const c = normalizeAngle(current);
  const t = normalizeAngle(target);
  let delta = t - c;
  if (delta > 180) delta -= 360;
  if (delta < -180) delta += 360;
  if (Math.abs(delta) <= maxStep) return t;
  return normalizeAngle(c + Math.sign(delta) * maxStep);
}

export function stepRuntime(
  prev: RuntimeState,
  target: Controls,
  targetHeading: number,
  params: ReturnType<typeof getBoatParams>,
  dt: number,
): RuntimeState {
  const live = interpolateControls(prev.live, target, dt);
  const newHeading = approachHeading(
    prev.boat.heading,
    targetHeading,
    HEADING_TURN_RATE_DEG_PER_S * dt,
  );
  const steeredBoat = { ...prev.boat, heading: newHeading };
  const result = tick(steeredBoat, live, params, dt);
  return {
    simTime: prev.simTime + dt,
    boat: result.state,
    live,
    target,
    targetHeading,
    lastDiag: result.diag,
  };
}
