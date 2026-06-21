/**
 * Polar curve helpers for the Courses screen.
 *
 * Two strategies, picked at module load:
 *  1. If `mobile/src/simulator/physics` exposes `settle` + `getBoatParams`
 *     (Dev-A's port from `src/lib/sailing-physics`), we run the engine at
 *     each angle and read steady-state boat speed. This is the "real"
 *     polar.
 *  2. Otherwise we use a deterministic sail-trim-aware approximation:
 *     a piecewise-cosine-shoulder curve calibrated against the
 *     `pointsOfSail` speedFactor table. Good enough for a teaching
 *     diagram while the engine port is in flight.
 *
 * TODO(dev-a-integration): once `mobile/src/simulator/physics` lands,
 * switch the dynamic import to a static one and delete the fallback.
 */

import { pointsOfSail } from '../data';

export interface PolarPoint {
  /** True wind angle, deg. 0 = head to wind, 180 = dead downwind. */
  twa: number;
  /** Boat speed at this angle, knots. */
  knots: number;
}

export interface PolarCurve {
  tws: number;
  /** Sampled (twa, knots) pairs from twa=0 to twa=180, step `step`. */
  samples: PolarPoint[];
}

const TWA_STEP = 2;

/**
 * Try to load Dev-A's physics port. Wrapped in a try/catch because the
 * module may not exist yet; require() throws in that case and we fall
 * through to the local approximation.
 */
type PhysicsModule = {
  settle: (
    state: unknown,
    controls: unknown,
    params: unknown,
    seconds: number,
  ) => { state: { boatSpeed: number } };
  getBoatParams: (overrides?: Record<string, unknown>) => unknown;
  createInitialState: (args: { tws: number; twa: number }) => unknown;
};

let physics: PhysicsModule | null = null;
try {
  // eslint-disable-next-line @typescript-eslint/no-require-imports, global-require
  physics = require('../simulator/physics') as PhysicsModule;
} catch {
  physics = null;
}

/** Public flag so the UI can show "approx" vs "engine" badges in dev. */
export const POLAR_SOURCE: 'engine' | 'approx' =
  physics && typeof physics.settle === 'function' ? 'engine' : 'approx';

/**
 * Approximate boat speed (kt) at a given true wind angle and wind speed.
 * Calibrated so that the five `pointsOfSail` mid-angles roughly match
 * `speedFactor * peak`, where peak is a wind-dependent ceiling.
 *
 * Curve shape:
 *  - 0..30 deg = no-go: speed -> 0
 *  - 30..90 deg = upwind shoulder rises smoothly to peak around beam reach
 *  - 90..130 deg = broad reach plateau (~0.93 of peak)
 *  - 130..180 deg = downwind drop to ~0.55 of peak (no spinnaker assumed)
 *
 * The peak is `0.55 * tws` + a small ceiling bonus, capped at hull-speed
 * for a 40 ft cruiser (~8.4 kt).
 */
function approxSpeedAt(twa: number, tws: number): number {
  const a = Math.abs(twa) % 360;
  const t = a > 180 ? 360 - a : a;
  const peak = Math.min(8.4, 0.55 * tws + 1.2);
  if (t <= 30) {
    return 0;
  }
  if (t <= 90) {
    const u = (t - 30) / 60;
    const ramp = 1 - Math.cos(u * Math.PI * 0.5);
    return peak * (0.55 + 0.45 * ramp);
  }
  if (t <= 130) {
    const u = (t - 90) / 40;
    return peak * (1.0 - 0.07 * u);
  }
  const u = (t - 130) / 50;
  const eased = 0.5 - 0.5 * Math.cos(u * Math.PI);
  return peak * (0.93 - 0.38 * eased);
}

function engineSpeedAt(twa: number, tws: number): number {
  if (!physics) return approxSpeedAt(twa, tws);
  const params = physics.getBoatParams();
  const state = physics.createInitialState({ tws, twa: Math.max(0.001, twa) });
  const controls = {
    mainSheet: 0.4,
    jibSheet: 0.25,
    mainTwist: 0.1,
    jibTwist: 0.1,
    reef: 0,
    jibFurl: 0,
    jibSide: 1,
  };
  const r = physics.settle(state, controls, params, 25);
  return Math.max(0, r.state.boatSpeed);
}

export function speedAt(twa: number, tws: number): number {
  return POLAR_SOURCE === 'engine' ? engineSpeedAt(twa, tws) : approxSpeedAt(twa, tws);
}

const cache = new Map<number, PolarCurve>();

export function getPolar(tws: number): PolarCurve {
  const cached = cache.get(tws);
  if (cached) return cached;
  const samples: PolarPoint[] = [];
  for (let twa = 0; twa <= 180; twa += TWA_STEP) {
    samples.push({ twa, knots: speedAt(twa, tws) });
  }
  const curve: PolarCurve = { tws, samples };
  cache.set(tws, curve);
  return curve;
}

export function maxSpeed(curve: PolarCurve): number {
  let m = 0;
  for (const p of curve.samples) {
    if (p.knots > m) m = p.knots;
  }
  return m;
}

/** Linear interp between the two nearest samples. */
export function speedAtAngle(curve: PolarCurve, twaDeg: number): number {
  const a = ((twaDeg % 360) + 360) % 360;
  const t = a > 180 ? 360 - a : a;
  const idx = t / TWA_STEP;
  const lo = Math.floor(idx);
  const hi = Math.min(curve.samples.length - 1, lo + 1);
  const frac = idx - lo;
  const aLo = curve.samples[lo]?.knots ?? 0;
  const aHi = curve.samples[hi]?.knots ?? aLo;
  return aLo + (aHi - aLo) * frac;
}

export type PointOfSailId =
  | 'in-irons'
  | 'close-hauled'
  | 'beam-reach'
  | 'broad-reach'
  | 'running';

/**
 * Resolve a true wind angle to a point-of-sail id. Wraps to the
 * starboard half (0..180) since the diagram is symmetric.
 */
export function pointOfSailAt(twaDeg: number): PointOfSailId {
  const a = ((twaDeg % 360) + 360) % 360;
  const t = a > 180 ? 360 - a : a;
  for (const p of pointsOfSail) {
    if (t >= p.angleMin && t <= p.angleMax) {
      return p.id as PointOfSailId;
    }
  }
  return 'in-irons';
}

/**
 * Mid-angle for a given point-of-sail id, used when a card tap snaps
 * the boat to a representative heading.
 */
export function midAngleFor(id: string): number {
  const p = pointsOfSail.find((x) => x.id === id);
  if (!p) return 90;
  return Math.round((p.angleMin + p.angleMax) / 2);
}
