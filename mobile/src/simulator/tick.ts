/**
 * Pure simulation step. Phase 2 stub.
 *
 * `tick(state, controls, params, dt) -> state` is the same shape as the
 * web `simulate.tick` (see `src/lib/sailing-physics/simulate.ts`) but
 * a vastly simplified body: just heading rotation toward target and
 * speed relaxation toward throttle setpoint, integrated over `dt`.
 *
 * No wind, no sail forces, no heel, no leeway. The full physics
 * lands in Phase 2 proper (ADR-0003 extraction to `@regatta/physics`,
 * then port + golden-fixture verification on mobile).
 *
 * Pure, deterministic, no React or DOM dependencies. Safe to run in
 * tests, on a worklet, or in Node.
 */

import type { BoatState, Controls, SimParams } from './types';

const TWO_PI = Math.PI * 2;

/** Wrap an angle delta to the shortest signed path, in radians. */
function shortestAngle(delta: number): number {
  let d = delta % TWO_PI;
  if (d > Math.PI) d -= TWO_PI;
  if (d < -Math.PI) d += TWO_PI;
  return d;
}

export function tick(
  state: BoatState,
  controls: Controls,
  params: SimParams,
  dt: number,
): BoatState {
  // Heading: turn toward target at turnRate, clamped per-frame.
  const dh = shortestAngle(controls.targetHeading - state.heading);
  const maxStep = params.turnRate * dt;
  const turn = Math.max(-maxStep, Math.min(maxStep, dh));
  const heading = state.heading + turn;

  // Speed: exponential relaxation toward throttle setpoint.
  const setpoint = params.maxSpeed * Math.max(0, Math.min(1, controls.throttle));
  const k = Math.exp(-params.drag * dt);
  const speed = state.speed * k + setpoint * (1 - k);

  // Position: integrate forward in heading direction. Canvas Y is
  // screen-down so heading 0 (north / up) means -Y.
  const dx = Math.sin(heading) * speed * dt;
  const dy = -Math.cos(heading) * speed * dt;

  return {
    heading,
    speed,
    x: state.x + dx,
    y: state.y + dy,
  };
}

export { shortestAngle };
