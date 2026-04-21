import { getBoatParams, tick, type Controls } from '@/lib/sailing-physics';
import { clamp } from '../ui/shared';
import { CONTROL_RATES, type RuntimeState } from './runtime-types';

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
// One fixed-step simulation step. Takes the previous runtime, the latest
// user targets, params, and dt. Produces the next runtime. Purely functional
// (no mutation, no I/O) so it is safe to call from rAF, tests, or future
// replay recorders.
// ---------------------------------------------------------------------------

export function stepRuntime(
  prev: RuntimeState,
  target: Controls,
  params: ReturnType<typeof getBoatParams>,
  dt: number,
): RuntimeState {
  const live = interpolateControls(prev.live, target, dt);
  const result = tick(prev.boat, live, params, dt);
  return {
    simTime: prev.simTime + dt,
    boat: result.state,
    live,
    target,
    lastDiag: result.diag,
  };
}
