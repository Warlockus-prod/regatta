/**
 * Replay playback helpers.
 *
 * The Replay viewer reads a `RaceRecord` (from `regatta.race-history.v1`)
 * and walks it forward in time. Sample rows are captured ~1 Hz during a
 * race, so we have to interpolate between adjacent samples to draw a
 * smooth boat at any clock position.
 *
 * Sprint 9 wrote `Array<{x, y, t}>` per the persisted shape. Sprint 10
 * widens the playback layer to also accept the optional `headingRad` and
 * `speedKn` channels declared on the `ReplayPoint` type, falling back to
 * deriving heading from the previous-to-next vector when those channels
 * are missing on legacy rows.
 *
 * All functions in this module are pure - no React, no Skia. They are
 * unit-testable and reusable for both the viewer screen and any
 * frame-by-frame export workflow we may build later.
 */

import type { ReplayPoint } from '../persistence/race-history';

/** Single rendered boat snapshot at a given playback clock value. */
export interface PlaybackFrame {
  x: number;
  y: number;
  /** Heading in screen-space radians (0 = up / north, +CW). */
  headingRad: number;
  /** Boat speed in knots. Derived if not present on the source samples. */
  speedKn: number;
  /** The two sample indices used to build this frame, exposed for the
   *  scrubber callback. `i` is the lower bound, `j` the upper bound. */
  i: number;
  j: number;
  /** The 0..1 lerp ratio between sample `i` and sample `j`. */
  alpha: number;
}

/** Shape returned by `summarizeReplay`. Used by the viewer chrome. */
export interface ReplaySummary {
  totalSec: number;
  sampleCount: number;
  /** True only when at least one sample carries an explicit heading. */
  hasHeading: boolean;
  /** True only when at least one sample carries an explicit speed. */
  hasSpeed: boolean;
  /** Bounding box of the recorded track (canvas px). Useful for fit-to-track
   *  zoom in the viewer. */
  bbox: { minX: number; maxX: number; minY: number; maxY: number };
}

/**
 * Linear interpolation. Out-of-range alpha is clamped because the scrubber
 * may briefly hand us a value just past the last sample (e.g. 1.0001 due
 * to floating-point drift).
 */
function lerp(a: number, b: number, alpha: number): number {
  const t = alpha < 0 ? 0 : alpha > 1 ? 1 : alpha;
  return a + (b - a) * t;
}

/**
 * Spherical lerp (slerp) for angles, taking the short way around the
 * unit circle. Avoids the "boat spins 350 deg the wrong way" artefact a
 * naive `lerp(headingRad)` produces when the recorded heading wraps from
 * -PI to +PI between two samples.
 */
function slerpAngle(a: number, b: number, alpha: number): number {
  const TWO_PI = Math.PI * 2;
  // Normalize the delta into [-PI, PI] so we always rotate the short way.
  let delta = ((b - a + Math.PI) % TWO_PI + TWO_PI) % TWO_PI - Math.PI;
  return a + delta * (alpha < 0 ? 0 : alpha > 1 ? 1 : alpha);
}

/**
 * Derive a heading in screen-space radians from two sample positions.
 * 0 = pointing up (toward -Y in canvas convention), CW positive. Matches
 * the Game screen's `Math.atan2(dx, -dy)` heading model.
 *
 * Returns `null` when the two samples coincide (heading undefined).
 */
function headingFromVector(
  fromX: number,
  fromY: number,
  toX: number,
  toY: number,
): number | null {
  const dx = toX - fromX;
  const dy = toY - fromY;
  if (dx === 0 && dy === 0) return null;
  return Math.atan2(dx, -dy);
}

/**
 * Resolve a heading for sample `i`. Order of preference:
 *   1. Explicit `headingRad` on the sample (Sprint 10 widened shape).
 *   2. Vector from the PREVIOUS sample to this one.
 *   3. Vector from this sample to the NEXT one.
 *   4. 0 (north) as a last resort - happens only when all neighbouring
 *      samples sit on top of each other, which is a degenerate replay.
 */
function resolveHeading(replay: ReplayPoint[], i: number): number {
  const cur = replay[i]!;
  if (typeof cur.headingRad === 'number' && Number.isFinite(cur.headingRad)) {
    return cur.headingRad;
  }
  const prev = i > 0 ? replay[i - 1] : undefined;
  if (prev) {
    const h = headingFromVector(prev.x, prev.y, cur.x, cur.y);
    if (h !== null) return h;
  }
  const next = i + 1 < replay.length ? replay[i + 1] : undefined;
  if (next) {
    const h = headingFromVector(cur.x, cur.y, next.x, next.y);
    if (h !== null) return h;
  }
  return 0;
}

/**
 * Resolve a speed in knots for sample `i`. Order of preference:
 *   1. Explicit `speedKn` on the sample.
 *   2. Distance between this and the next sample / dt, scaled by an
 *      empirical "px per knot per second" factor. The factor cancels in
 *      ratio comparisons, so the displayed value is best-effort - we
 *      mostly need it for the wake density, not for HUD copy.
 *   3. 0.
 *
 * `pxPerKnotSec` defaults to 6 - matches the Game screen's wake density
 * scaling roughly. Tune later if needed.
 */
function resolveSpeed(
  replay: ReplayPoint[],
  i: number,
  pxPerKnotSec = 6,
): number {
  const cur = replay[i]!;
  if (typeof cur.speedKn === 'number' && Number.isFinite(cur.speedKn)) {
    return cur.speedKn;
  }
  const prev = i > 0 ? replay[i - 1] : undefined;
  if (prev) {
    const dt = cur.t - prev.t;
    if (dt > 0) {
      const dx = cur.x - prev.x;
      const dy = cur.y - prev.y;
      const dPx = Math.sqrt(dx * dx + dy * dy);
      return dPx / dt / pxPerKnotSec;
    }
  }
  return 0;
}

/**
 * Find the lower-bound sample index for a given playback clock value
 * via binary search. Returns the index `i` such that
 * `replay[i].t <= clockSec < replay[i+1].t`. Edge cases:
 *  - clock <= replay[0].t           -> 0
 *  - clock >= replay[last].t        -> last
 *  - replay empty                   -> -1 (caller must check)
 */
export function findFrameIndex(replay: ReplayPoint[], clockSec: number): number {
  if (replay.length === 0) return -1;
  if (clockSec <= replay[0]!.t) return 0;
  const last = replay.length - 1;
  if (clockSec >= replay[last]!.t) return last;
  let lo = 0;
  let hi = last;
  while (lo < hi) {
    const mid = (lo + hi + 1) >>> 1;
    if (replay[mid]!.t <= clockSec) {
      lo = mid;
    } else {
      hi = mid - 1;
    }
  }
  return lo;
}

/**
 * Build a single playback frame at `clockSec`. Linear lerp on position,
 * spherical lerp (short way) on heading, linear lerp on speed.
 *
 * Falls back to the closest sample when only one is available; returns
 * a zero-state frame if the replay is empty (the viewer renders an
 * EmptyState in that case so this branch is mostly defensive).
 */
export function frameAt(
  replay: ReplayPoint[],
  clockSec: number,
): PlaybackFrame {
  if (replay.length === 0) {
    return { x: 0, y: 0, headingRad: 0, speedKn: 0, i: -1, j: -1, alpha: 0 };
  }
  const i = findFrameIndex(replay, clockSec);
  const j = Math.min(replay.length - 1, i + 1);
  const a = replay[i]!;
  const b = replay[j]!;
  // Compute the lerp ratio inside the [a.t, b.t] window. When i === j
  // (head/tail of the replay) we collapse to alpha = 0.
  const dt = b.t - a.t;
  const alpha = dt > 0 ? (clockSec - a.t) / dt : 0;

  const x = lerp(a.x, b.x, alpha);
  const y = lerp(a.y, b.y, alpha);

  const headingA = resolveHeading(replay, i);
  const headingB = resolveHeading(replay, j);
  const headingRad = slerpAngle(headingA, headingB, alpha);

  const speedA = resolveSpeed(replay, i);
  const speedB = resolveSpeed(replay, j);
  const speedKn = lerp(speedA, speedB, alpha);

  return { x, y, headingRad, speedKn, i, j, alpha };
}

/**
 * Roll up the replay into a `ReplaySummary`. The viewer chrome reads
 * `totalSec` for the scrubber, the rest is informational and lets us
 * decide whether to render a "heading derived from track" hint.
 */
export function summarizeReplay(replay: ReplayPoint[]): ReplaySummary {
  if (replay.length === 0) {
    return {
      totalSec: 0,
      sampleCount: 0,
      hasHeading: false,
      hasSpeed: false,
      bbox: { minX: 0, maxX: 0, minY: 0, maxY: 0 },
    };
  }
  let minX = Infinity;
  let maxX = -Infinity;
  let minY = Infinity;
  let maxY = -Infinity;
  let hasHeading = false;
  let hasSpeed = false;
  for (const p of replay) {
    if (p.x < minX) minX = p.x;
    if (p.x > maxX) maxX = p.x;
    if (p.y < minY) minY = p.y;
    if (p.y > maxY) maxY = p.y;
    if (typeof p.headingRad === 'number' && Number.isFinite(p.headingRad)) {
      hasHeading = true;
    }
    if (typeof p.speedKn === 'number' && Number.isFinite(p.speedKn)) {
      hasSpeed = true;
    }
  }
  return {
    totalSec: replay[replay.length - 1]!.t,
    sampleCount: replay.length,
    hasHeading,
    hasSpeed,
    bbox: { minX, maxX, minY, maxY },
  };
}
