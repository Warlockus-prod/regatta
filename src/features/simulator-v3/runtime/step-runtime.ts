import { getBoatParams, tick, type Controls } from '@/lib/sailing-physics';
import { clamp } from '../ui/shared';
import {
  CONTROL_RATES,
  HEADING_TURN_RATE_DEG_PER_S,
  type RuntimeState,
} from './runtime-types';
import { stepWind, type WindMode } from './wind-dynamics';

// ---------------------------------------------------------------------------
// Control interpolation: walk live toward target at most CONTROL_RATES[k] per
// second. Everything is in [0, 1] (except jibSide which is atomic), so rate
// limits are unit-free "normalized units per second". CONTROL_RATES = 0.6
// means "full eased -> full sheeted in ~1.7s", which matches how fast a
// competent crew trims a winch.
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// Heading interpolation: walk boat.heading toward targetHeading at most
// HEADING_TURN_RATE_DEG_PER_S * dt each tick, picking the shorter rotation
// direction around the compass. This is what makes tack/gybe feel like a
// real maneuver (~4 seconds through the wind) instead of a teleport.
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// One fixed-step simulation step. Takes the previous runtime, the latest
// user targets, params, and dt. Produces the next runtime. Purely functional
// (no mutation, no I/O) so it is safe to call from rAF, tests, or future
// replay recorders.
//
// Order within the step:
// 1. Wind dynamics advance (steady/shift/gust modulation around the base).
// 2. Live controls walk toward target controls (sheet/reef/twist).
// 3. Boat heading walks toward targetHeading (steering).
// 4. Physics tick with the steered heading, modulated wind, controls, dt.
// ---------------------------------------------------------------------------

export function stepRuntime(
  prev: RuntimeState,
  target: Controls,
  targetHeading: number,
  params: ReturnType<typeof getBoatParams>,
  dt: number,
  windMode: WindMode = 'steady',
): RuntimeState {
  const wind = stepWind(prev.wind, windMode, dt);
  const live = interpolateControls(prev.live, target, dt);
  const newHeading = approachHeading(
    prev.boat.heading,
    targetHeading,
    HEADING_TURN_RATE_DEG_PER_S * dt,
  );
  // Effective wind = base modulated by the dynamics layer. In steady mode
  // twsFactor === 1 and dirOffset === 0, so this reduces to the base wind
  // (previous behavior). Heel/AWA/feedback all derive from these fields.
  const steeredBoat = {
    ...prev.boat,
    heading: newHeading,
    trueWindSpeed: wind.baseTws * wind.twsFactor,
    trueWindDir: normalizeAngle(wind.baseDir + wind.dirOffset),
  };
  const result = tick(steeredBoat, live, params, dt);
  return {
    simTime: prev.simTime + dt,
    boat: result.state,
    live,
    target,
    targetHeading,
    lastDiag: result.diag,
    wind,
  };
}
