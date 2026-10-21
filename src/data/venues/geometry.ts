// Pure geometry of the venue scenery: 2D shore polygons for the top-down
// races and terrain samples for the 3D horizon. No React, no three.js, no
// canvas: the website, the 3D boat and the native app all draw from these.
//
// Determinism: shapes come from an integer hash, not Math.sin, so a venue
// looks the same on every device and engine.

import type { Coast, Island, LandMass, Relief, Venue } from "./venues";

export interface Pt { x: number; y: number }

/** The website and multiplayer race area (src/lib/race-physics.ts WORLD). Wind from the top. */
export const RACE_AREA = { width: 800, height: 1200 } as const;

// ---------------------------------------------------------------------------
// Noise
// ---------------------------------------------------------------------------

function hash(n: number): number {
  let t = (n | 0) + 0x6d2b79f5;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}

/** Smooth value noise in 0..1. */
export function noise1(seed: number, x: number): number {
  const i = Math.floor(x);
  const f = x - i;
  const a = hash(seed * 7919 + i);
  const b = hash(seed * 7919 + i + 1);
  const s = f * f * (3 - 2 * f);
  return a + (b - a) * s;
}

/** Three octaves of noise1, 0..1. */
export function fbm(seed: number, x: number): number {
  return noise1(seed, x) * 0.6 + noise1(seed + 101, x * 2.3) * 0.28 + noise1(seed + 211, x * 5.1) * 0.12;
}

// ---------------------------------------------------------------------------
// 2D: shore polygons outside the race area
// ---------------------------------------------------------------------------

/** How far the land polygons reach out (they are drawn, not clipped). */
const FAR = 2600;
const COAST_SAMPLES = 72;
const ISLAND_SAMPLES = 44;

function sidePoint(side: Coast["side"], s: number, w: number, h: number): { p: Pt; n: Pt } {
  switch (side) {
    case "N": return { p: { x: s * w, y: 0 }, n: { x: 0, y: -1 } };
    case "S": return { p: { x: s * w, y: h }, n: { x: 0, y: 1 } };
    case "W": return { p: { x: 0, y: s * h }, n: { x: -1, y: 0 } };
    case "E": return { p: { x: w, y: s * h }, n: { x: 1, y: 0 } };
  }
}

/**
 * A shore along one side of the race area: an irregular waterline outside
 * the box and land reaching far beyond it. A full side reaches past both
 * corners so neighbouring shores overlap instead of leaving a gap; a partial
 * one curls away from the water at its open ends (a headland).
 */
export function coastPolygon(c: Coast, area: { width: number; height: number } = RACE_AREA): Pt[] {
  const { width: w, height: h } = area;
  const s0 = c.from <= 0 ? -0.45 : c.from;
  const s1 = c.to >= 1 ? 1.45 : c.to;
  const [omin, omax] = c.offset;
  const line: Pt[] = [];
  for (let i = 0; i <= COAST_SAMPLES; i++) {
    const t = i / COAST_SAMPLES;
    const s = s0 + (s1 - s0) * t;
    let off = omin + (omax - omin) * fbm(c.seed, t * 9);
    // Open ends curl away from the race area.
    if (c.from > 0) off += Math.max(0, 0.12 - t) / 0.12 * (omax * 1.6);
    if (c.to < 1) off += Math.max(0, t - 0.88) / 0.12 * (omax * 1.6);
    const { p, n } = sidePoint(c.side, s, w, h);
    line.push({ x: p.x + n.x * off, y: p.y + n.y * off });
  }
  const end = sidePoint(c.side, s1, w, h);
  const start = sidePoint(c.side, s0, w, h);
  return [
    ...line,
    { x: end.p.x + end.n.x * FAR, y: end.p.y + end.n.y * FAR },
    { x: start.p.x + start.n.x * FAR, y: start.p.y + start.n.y * FAR },
  ];
}

function insideArea(p: Pt, w: number, h: number, pad: number): boolean {
  return p.x > -pad && p.x < w + pad && p.y > -pad && p.y < h + pad;
}

function bearingVector(bearingDeg: number): Pt {
  const b = (bearingDeg * Math.PI) / 180;
  return { x: Math.sin(b), y: -Math.cos(b) };
}

/** Distance from the centre of the box to its edge along a direction. */
function edgeDistance(u: Pt, w: number, h: number): number {
  const tx = u.x > 1e-9 ? (w / 2) / u.x : u.x < -1e-9 ? (w / 2) / -u.x : Infinity;
  const ty = u.y > 1e-9 ? (h / 2) / u.y : u.y < -1e-9 ? (h / 2) / -u.y : Infinity;
  return Math.min(tx, ty);
}

/**
 * An island on a bearing from the centre of the race area, never inside it:
 * placed `gap` beyond the edge, then pushed out until its whole outline (and
 * a 12-unit margin) clears the box.
 */
export function islandPolygon(i: Island, area: { width: number; height: number } = RACE_AREA): Pt[] {
  const { width: w, height: h } = area;
  const u = bearingVector(i.bearing);
  const v = { x: -u.y, y: u.x };
  const [along, across] = i.size;
  const centre = { x: w / 2, y: h / 2 };
  let dist = edgeDistance(u, w, h) + i.gap + across;
  const outline = (d: number): Pt[] => {
    const c = { x: centre.x + u.x * d, y: centre.y + u.y * d };
    const pts: Pt[] = [];
    for (let k = 0; k < ISLAND_SAMPLES; k++) {
      const a = (k / ISLAND_SAMPLES) * Math.PI * 2;
      const r = 0.78 + 0.44 * fbm(i.seed, (k / ISLAND_SAMPLES) * 7);
      const ca = Math.cos(a) * along * r;
      const sa = Math.sin(a) * across * r;
      pts.push({ x: c.x + v.x * ca + u.x * sa, y: c.y + v.y * ca + u.y * sa });
    }
    return pts;
  };
  let pts = outline(dist);
  for (let guard = 0; guard < 200 && pts.some((p) => insideArea(p, w, h, 12)); guard++) {
    dist += 8;
    pts = outline(dist);
  }
  return pts;
}

export function landPolygon(l: LandMass, area: { width: number; height: number } = RACE_AREA): Pt[] {
  return l.kind === "coast" ? coastPolygon(l, area) : islandPolygon(l, area);
}

/** Where to print a land name: the point of the shape nearest the race area, nudged inland. */
export function labelAnchor(l: LandMass, poly: Pt[], area: { width: number; height: number } = RACE_AREA): Pt {
  const c = { x: area.width / 2, y: area.height / 2 };
  if (l.kind === "island") {
    const sx = poly.reduce((a, p) => a + p.x, 0) / poly.length;
    const sy = poly.reduce((a, p) => a + p.y, 0) / poly.length;
    return { x: sx, y: sy };
  }
  // Coast: the middle of the waterline, 34 units inland.
  const line = poly.slice(0, COAST_SAMPLES + 1);
  const mid = line[Math.floor(line.length / 2)];
  const dx = mid.x - c.x;
  const dy = mid.y - c.y;
  const len = Math.hypot(dx, dy) || 1;
  return { x: mid.x + (dx / len) * 34, y: mid.y + (dy / len) * 34 };
}

/** How many contour bands a land shows from above (slopes, rock, summit). */
export function reliefRings(l: LandMass): number {
  switch (l.relief) {
    case "mountains": return 3;
    case "hills": return 2;
    case "cliffs": return 1;
    case "flat": return 0;
  }
}

/**
 * Contour bands for the top-down drawing, outermost (level 1) first: a coast
 * repeats its waterline further inland, an island shrinks toward its middle.
 */
export function reliefPolygons(l: LandMass, area: { width: number; height: number } = RACE_AREA): { level: number; poly: Pt[] }[] {
  const n = reliefRings(l);
  const out: { level: number; poly: Pt[] }[] = [];
  if (l.kind === "coast") {
    for (let level = 1; level <= n; level++) {
      const shifted: Coast = { ...l, offset: [l.offset[0] + level * 55, l.offset[1] + level * 70], seed: l.seed + level * 17 };
      out.push({ level, poly: coastPolygon(shifted, area) });
    }
    return out;
  }
  const base = islandPolygon(l, area);
  const cx = base.reduce((a, p) => a + p.x, 0) / base.length;
  const cy = base.reduce((a, p) => a + p.y, 0) / base.length;
  for (let level = 1; level <= n; level++) {
    const k = 1 - level * 0.27;
    out.push({ level, poly: base.map((p, idx) => {
      const w = 0.9 + 0.2 * noise1(l.seed + level, idx * 0.7);
      return { x: cx + (p.x - cx) * k * w, y: cy + (p.y - cy) * k * w };
    }) });
  }
  return out;
}

// ---------------------------------------------------------------------------
// 3D: terrain around the horizon (metres, X east, Z south, Y up)
// ---------------------------------------------------------------------------

export interface Terrain3D {
  /** Vertex grid, row-major: rows * cols points [x, y, z]. */
  positions: number[];
  rows: number;
  cols: number;
  /** Height of each vertex as 0..1 of the land's peak (for colouring). */
  heights01: number[];
  relief: Relief;
}

const PEAK_M: Record<Relief, number> = { mountains: 72, hills: 34, flat: 7, cliffs: 24 };
const SIDE_BEARING: Record<Coast["side"], number> = { N: 0, E: 90, S: 180, W: 270 };

function point3(bearingDeg: number, r: number, y: number): [number, number, number] {
  const b = (bearingDeg * Math.PI) / 180;
  return [Math.sin(b) * r, y, -Math.cos(b) * r];
}

const smooth = (a: number, b: number, x: number) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};

/**
 * A coast becomes a ridge on the horizon: the same side of the compass, a
 * shoreline at the water and peaks behind it. Bearings sweep clockwise.
 */
export function coastTerrain(c: Coast): Terrain3D {
  const span = 116; // degrees covered by one full side
  const centre = SIDE_BEARING[c.side];
  const clockwise = c.side === "N" || c.side === "E";
  const s0 = c.from <= 0 ? -0.08 : c.from;
  const s1 = c.to >= 1 ? 1.08 : c.to;
  const cols = 72;
  const rows = 10;
  // Beyond the orbit camera's reach (120 m) and inside the fog (110..340 m),
  // so the far shore fades into the haze like a real horizon.
  const r0 = 185 + Math.min(40, c.offset[0] / 4);
  const depth = 95;
  const peak = PEAK_M[c.relief] * c.height;
  const positions: number[] = [];
  const heights01: number[] = [];
  for (let j = 0; j < rows; j++) {
    const d = j / (rows - 1);
    for (let i = 0; i < cols; i++) {
      // Columns always run clockwise (so every face looks up); S and W
      // sides read their part of the side in reverse to do so.
      const t = clockwise ? i / (cols - 1) : 1 - i / (cols - 1);
      const s = s0 + (s1 - s0) * t;
      const bearing = centre + (clockwise ? 1 : -1) * (s - 0.5) * span;
      // Every ridge slopes down to the sea at both ends: an open end of a
      // headland over 14%, a full side over 7% (its neighbour overlaps there).
      const ends = smooth(0, c.from > 0 ? 0.14 : 0.07, t) * smooth(0, c.to < 1 ? 0.14 : 0.07, 1 - t);
      const profile = 0.45 + 0.55 * fbm(c.seed, t * 11 + 3);
      // Steep from the water, then a rugged crest (like the pine slopes of
      // Göcek or the limestone above Split), not a smooth wall.
      const rise = d < 0.6 ? Math.pow(d / 0.6, 0.55) : 1 - 0.35 * (d - 0.6) / 0.4;
      const rugged = 0.82 + 0.18 * noise1(c.seed + 31, t * 23 + d * 7);
      const h01 = Math.min(1, profile * rise * rugged * ends);
      const shore = j === 0 ? -1.2 : 0;
      const r = r0 + d * depth + (fbm(c.seed + 5, t * 6) - 0.5) * 10;
      positions.push(...point3(bearing, r, shore + h01 * peak));
      heights01.push(h01);
    }
  }
  return { positions, rows, cols, heights01, relief: c.relief };
}

/** An island becomes a low dome on its bearing, nearer than the coasts. */
export function islandTerrain(i: Island): Terrain3D {
  const rings = 9;
  const cols = 44;
  const dist = 150 + i.gap / 5;
  const along = i.size[0] / 7;
  const across = i.size[1] / 7;
  const peak = PEAK_M[i.relief] * i.height * (i.relief === "flat" ? 1 : 0.8);
  const [cx, , cz] = point3(i.bearing, dist + across, 0);
  const b = (i.bearing * Math.PI) / 180;
  const u = { x: Math.sin(b), z: -Math.cos(b) };
  const v = { x: -u.z, z: u.x };
  const positions: number[] = [];
  const heights01: number[] = [];
  for (let j = 0; j < rings; j++) {
    const rho = 1 - j / (rings - 1); // outer ring first, centre last
    for (let k = 0; k < cols; k++) {
      const a = (k / cols) * Math.PI * 2;
      const wobble = 0.78 + 0.44 * fbm(i.seed, (k / cols) * 7);
      const ca = Math.cos(a) * along * wobble * rho;
      const sa = Math.sin(a) * across * wobble * rho;
      const dome = Math.pow(Math.max(0, 1 - rho * rho), 1.1);
      const h01 = j === 0 ? 0 : dome * (0.75 + 0.25 * fbm(i.seed + 9, k * 0.4 + j));
      const y = j === 0 ? -1.2 : h01 * peak;
      positions.push(cx + v.x * ca + u.x * sa, y, cz + v.z * ca + u.z * sa);
      heights01.push(h01);
    }
  }
  return { positions, rows: rings, cols, heights01, relief: i.relief };
}

export function venueTerrain(venue: Venue): Terrain3D[] {
  return venue.lands.map((l) => (l.kind === "coast" ? coastTerrain(l) : islandTerrain(l)));
}

/** Triangle indices for a terrain grid. Islands close their rings (`wrap`). */
export function terrainIndices(rows: number, cols: number, wrap: boolean): number[] {
  const idx: number[] = [];
  const last = wrap ? cols : cols - 1;
  for (let j = 0; j < rows - 1; j++) {
    for (let i = 0; i < last; i++) {
      const i2 = (i + 1) % cols;
      const a = j * cols + i;
      const b = j * cols + i2;
      const c = (j + 1) * cols + i;
      const d = (j + 1) * cols + i2;
      // Counter-clockwise seen from above: the faces look up at the sky and the sun.
      idx.push(a, b, c, b, d, c);
    }
  }
  return idx;
}

/** Colour of a terrain vertex: beach, slopes, rock, summit. */
export function terrainColor(relief: Relief, h01: number, palette: Venue["palette"], jitter: number): string {
  if (h01 < 0.02) return palette.sand;
  if (relief === "flat") return jitter > 0.5 ? palette.low : palette.mid;
  if (relief === "cliffs") return h01 > 0.35 ? palette.peak : palette.low;
  if (h01 < 0.5) return jitter > 0.55 ? palette.mid : palette.low;
  if (h01 < 0.8) return jitter > 0.3 ? palette.mid : palette.low;
  if (h01 < 0.93) return jitter > 0.5 ? palette.high : palette.mid;
  return palette.peak;
}
