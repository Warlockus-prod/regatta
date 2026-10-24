// The white wake a boat leaves on the water (ADR-0008, "the wake keeps every
// tack"): a ribbon through the stern's recent positions that widens into a V
// and fades with age. Pure geometry, so it is tested without a GPU. Race
// metres in, scene metres out (minus the player's position).

export interface TrailPoint { x: number; z: number; t: number }

/** Seconds a stretch of wake stays on the water. */
export const TRAIL_LIFE = 14;
/** Most points a trail keeps (a new one every TRAIL_STEP metres). */
export const TRAIL_POINTS = 90;
export const TRAIL_STEP = 1.5;
/** Half-width at the stern and how much the V opens per second of age (m). */
const HALF_WIDTH = 0.9;
const SPREAD = 0.55;

/** Adds the stern's position when it has moved far enough; drops what is too old or too many. */
export function pushTrail(points: TrailPoint[], p: TrailPoint): void {
  const last = points[points.length - 1];
  if (!last || Math.hypot(p.x - last.x, p.z - last.z) >= TRAIL_STEP || p.t - last.t > 1.5) points.push(p);
  while (points.length > TRAIL_POINTS || (points.length > 0 && p.t - points[0].t > TRAIL_LIFE)) points.shift();
}

/**
 * Fills `positions` (xyz) and `uvs` (u across 0..1, v = age 0..1) with a
 * triangle strip from the live stern `head` back through `points` (oldest
 * first), and returns the number of vertices written. `height` gives the
 * water's height at a race position.
 */
export function buildRibbon(points: TrailPoint[], head: TrailPoint, now: number, origin: { x: number; z: number },
  height: (x: number, z: number) => number, positions: Float32Array, uvs: Float32Array): number {
  const path = [head, ...points.slice().reverse()];
  let n = 0;
  const capacity = Math.min(positions.length / 6, uvs.length / 4);
  for (let i = 0; i < path.length && n < capacity; i++) {
    const p = path[i];
    const age = Math.max(0, Math.min(1, (now - p.t) / TRAIL_LIFE));
    const a = path[Math.max(0, i - 1)];
    const b = path[Math.min(path.length - 1, i + 1)];
    let dx = a.x - b.x;
    let dz = a.z - b.z;
    const len = Math.hypot(dx, dz);
    if (len < 1e-6) { dx = 0; dz = 1; } else { dx /= len; dz /= len; }
    const half = HALF_WIDTH + SPREAD * age * TRAIL_LIFE;
    // Lifted clear of the water mesh, whose straight edges between vertices rise above the true wave in places.
    const y = height(p.x, p.z) + 0.6;
    // Perpendicular to the path on the water.
    const nx = -dz;
    const nz = dx;
    positions.set([p.x + nx * half - origin.x, y, p.z + nz * half - origin.z, p.x - nx * half - origin.x, y, p.z - nz * half - origin.z], n * 6);
    uvs.set([0, age, 1, age], n * 4);
    n++;
  }
  return n * 2;
}

/** Triangle indices for a strip of `pairs` vertex pairs. */
export function ribbonIndices(pairs: number): Uint16Array {
  const idx = new Uint16Array(Math.max(0, pairs - 1) * 6);
  for (let i = 0; i < pairs - 1; i++) {
    const a = i * 2;
    idx.set([a, a + 1, a + 2, a + 1, a + 3, a + 2], i * 6);
  }
  return idx;
}
