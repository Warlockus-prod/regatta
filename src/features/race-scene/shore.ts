// Distance from the water to the nearest shore, sampled once per venue into a
// small grid the water shader reads: shallow water turns lighter and a band of
// foam runs along the beach, where the 2D shore meets the 3D land. Pure, so
// it is tested without a GPU. Metres, race frame (X east, Z south).

export interface ShoreField {
  /** One byte per cell, row-major by Z: 0 on or inside land, 255 at maxDist or further. */
  data: Uint8Array;
  cols: number;
  rows: number;
  /** World position of the first cell's corner and the size of the whole grid (m). */
  min: { x: number; z: number };
  size: { x: number; z: number };
  maxDist: number;
}

type P = { x: number; z: number };

function inside(p: P, poly: P[]): boolean {
  let hit = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const a = poly[i];
    const b = poly[j];
    if ((a.z > p.z) !== (b.z > p.z) && p.x < ((b.x - a.x) * (p.z - a.z)) / (b.z - a.z) + a.x) hit = !hit;
  }
  return hit;
}

function segmentDistance(p: P, a: P, b: P): number {
  const dx = b.x - a.x;
  const dz = b.z - a.z;
  const len2 = dx * dx + dz * dz;
  const t = len2 > 0 ? Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.z - a.z) * dz) / len2)) : 0;
  return Math.hypot(p.x - (a.x + dx * t), p.z - (a.z + dz * t));
}

/**
 * The shore field over `bounds` for the land outlines `polys` (closed
 * polygons in metres). Cells further than maxDist from every outline's box
 * skip that outline, so open water costs almost nothing.
 */
export function shoreField(polys: P[][], bounds: { min: P; max: P }, opts: { cols: number; rows: number; maxDist: number }): ShoreField {
  const { cols, rows, maxDist } = opts;
  const size = { x: bounds.max.x - bounds.min.x, z: bounds.max.z - bounds.min.z };
  const data = new Uint8Array(cols * rows);
  const boxes = polys.map((poly) => ({
    poly,
    minX: Math.min(...poly.map((p) => p.x)) - maxDist,
    maxX: Math.max(...poly.map((p) => p.x)) + maxDist,
    minZ: Math.min(...poly.map((p) => p.z)) - maxDist,
    maxZ: Math.max(...poly.map((p) => p.z)) + maxDist,
  }));
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const p = { x: bounds.min.x + ((c + 0.5) / cols) * size.x, z: bounds.min.z + ((r + 0.5) / rows) * size.z };
      let best = maxDist;
      for (const box of boxes) {
        if (p.x < box.minX || p.x > box.maxX || p.z < box.minZ || p.z > box.maxZ) continue;
        if (inside(p, box.poly)) { best = 0; break; }
        const poly = box.poly;
        for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
          const d = segmentDistance(p, poly[j], poly[i]);
          if (d < best) best = d;
        }
      }
      data[r * cols + c] = Math.round((best / maxDist) * 255);
    }
  }
  return { data, cols, rows, min: bounds.min, size, maxDist };
}

/** The field's distance at a race position (m), nearest cell; maxDist outside the grid. */
export function shoreDistanceAt(field: ShoreField, p: P): number {
  const c = Math.floor(((p.x - field.min.x) / field.size.x) * field.cols);
  const r = Math.floor(((p.z - field.min.z) / field.size.z) * field.rows);
  if (c < 0 || r < 0 || c >= field.cols || r >= field.rows) return field.maxDist;
  return (field.data[r * field.cols + c] / 255) * field.maxDist;
}
