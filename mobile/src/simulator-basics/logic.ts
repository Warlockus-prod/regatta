/**
 * Pure helpers for the Basics simulator (mobile twin of web `/simulator`).
 *
 * Wind always blows FROM heading 0 (screen top). The user only controls the
 * boat heading; everything else (angle to wind, tack, point of sail, speed
 * potential) derives from it.
 *
 * Point-of-sail bands come from the synced canonical dataset
 * (`mobile/src/data/sailing-data.json`, mirrored from web
 * `src/data/sailing-data.ts` by `mobile/scripts/sync-content.ts`).
 */

import { pointsOfSail, type PointOfSail } from '../data';

/** Mirror of `src/lib/sailing-physics/constants.ts` NO_GO_HALF_DEG. */
export const NO_GO_HALF_DEG = 42;

/** Normalize any angle to [0, 360). */
export function normalize360(deg: number): number {
  return ((deg % 360) + 360) % 360;
}

/** Angle between bow and the wind, 0..180 (0 = head to wind). */
export function angleToWind(headingDeg: number): number {
  const a = normalize360(headingDeg);
  return a > 180 ? 360 - a : a;
}

export type Tack = 'starboard' | 'port';

/**
 * Which side the wind hits. Wind from screen top (0 deg): a boat heading
 * east (0..180) takes the wind on its port side; heading west (180..360)
 * on its starboard side. Head to wind / dead run default to starboard.
 */
export function tackOf(headingDeg: number): Tack {
  const a = normalize360(headingDeg);
  return a > 0 && a < 180 ? 'port' : 'starboard';
}

/**
 * Point-of-sail band for an angle to wind (0..180).
 *
 * Uses the canonical data bands, except the in-irons / close-hauled
 * boundary is clamped to the physics NO_GO_HALF_DEG (42) so the label
 * always matches the red wedge (the data table rounds that edge to 45).
 */
export function bandFor(twaDeg: number): PointOfSail {
  const t = Math.min(180, Math.max(0, Math.abs(twaDeg)));
  let last: PointOfSail = pointsOfSail[0];
  for (const p of pointsOfSail) {
    const min = p.id === 'close-hauled' ? NO_GO_HALF_DEG : p.angleMin;
    const max = p.id === 'in-irons' ? NO_GO_HALF_DEG : p.angleMax;
    if (t >= min && t < max) return p;
    last = p;
  }
  return last; // t === 180 -> running
}

/**
 * Speed-potential anchors: 0 at the edge of the no-go wedge, then each
 * band's `speedFactor` at its center angle, held flat to 180.
 * With the synced data this yields: 42->0, 52.5->0.65, 85->1.0, 135->0.85,
 * 170->0.6, 180->0.6.
 */
const ANCHORS: { twa: number; factor: number }[] = (() => {
  const centers = pointsOfSail
    .filter((p) => p.id !== 'in-irons')
    .map((p) => ({
      twa: (Math.max(p.angleMin, NO_GO_HALF_DEG) + p.angleMax) / 2,
      factor: p.speedFactor,
    }))
    .sort((a, b) => a.twa - b.twa);
  const tail = centers.length > 0 ? centers[centers.length - 1].factor : 0;
  return [{ twa: NO_GO_HALF_DEG, factor: 0 }, ...centers, { twa: 180, factor: tail }];
})();

/**
 * Speed potential 0..1 for an angle to wind: 0 inside the no-go wedge,
 * cosine-smoothed interpolation between band centers elsewhere.
 */
export function speedPotential(twaDeg: number): number {
  const t = Math.min(180, Math.max(0, Math.abs(twaDeg)));
  if (t <= NO_GO_HALF_DEG) return 0;
  for (let i = 0; i < ANCHORS.length - 1; i++) {
    const a = ANCHORS[i];
    const b = ANCHORS[i + 1];
    if (t >= a.twa && t <= b.twa) {
      const u = (t - a.twa) / Math.max(1e-6, b.twa - a.twa);
      const s = 0.5 - 0.5 * Math.cos(Math.PI * u);
      return a.factor + (b.factor - a.factor) * s;
    }
  }
  return ANCHORS[ANCHORS.length - 1].factor;
}

/**
 * Visual boom angle from the centerline, deg. 0 inside the no-go wedge
 * (sail luffing on the centerline), easing out toward ~85 dead downwind.
 */
export function boomAngleDeg(twaDeg: number): number {
  const t = Math.min(180, Math.max(0, Math.abs(twaDeg)));
  if (t <= NO_GO_HALF_DEG) return 0;
  return Math.min(85, 10 + (t - NO_GO_HALF_DEG) * 0.55);
}
