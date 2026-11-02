import type { Shape, Vec2 } from "./types";

export const DEG = Math.PI / 180;
export const KNOT = 0.514444;
export const compass = (deg: number) => ((deg % 360) + 360) % 360;
/** Signed smallest difference a - b in degrees, in [-180, 180). */
export const angleDiff = (a: number, b: number) => ((a - b + 540) % 360) - 180;
export const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

export interface Pose { x: number; y: number; heading: number }

/** Forward and starboard unit vectors of a heading, in world east/north. */
export function axes(heading: number): { f: Vec2; s: Vec2 } {
  const h = heading * DEG, sin = Math.sin(h), cos = Math.cos(h);
  return { f: [sin, cos], s: [cos, -sin] };
}

export function toWorld(pose: Pose, p: Vec2): Vec2 {
  const { f, s } = axes(pose.heading);
  return [pose.x + p[0] * f[0] + p[1] * s[0], pose.y + p[0] * f[1] + p[1] * s[1]];
}

export function toBody(pose: Pose, p: Vec2): Vec2 {
  const { f, s } = axes(pose.heading), dx = p[0] - pose.x, dy = p[1] - pose.y;
  return [dx * f[0] + dy * f[1], dx * s[0] + dy * s[1]];
}

const cross = (o: Vec2, a: Vec2, b: Vec2) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);

/** Same polygon, counter-clockwise in the east/north frame. */
export function ccw(points: Vec2[]): Vec2[] {
  let area = 0;
  for (let i = 0; i < points.length; i++) {
    const a = points[i], b = points[(i + 1) % points.length];
    area += a[0] * b[1] - b[0] * a[1];
  }
  return area < 0 ? [...points].reverse() : points;
}

/** For a point inside a counter-clockwise convex polygon: distance to the
 * nearest edge and that edge's outward normal. Null when outside. */
export function insideConvex(poly: Vec2[], p: Vec2): { depth: number; normal: Vec2 } | null {
  let best = Infinity, normal: Vec2 = [0, 0];
  for (let i = 0; i < poly.length; i++) {
    const a = poly[i], b = poly[(i + 1) % poly.length];
    const ex = b[0] - a[0], ey = b[1] - a[1], len = Math.hypot(ex, ey) || 1;
    // Outward normal of a counter-clockwise edge points to its right.
    const nx = ey / len, ny = -ex / len;
    const d = -((p[0] - a[0]) * nx + (p[1] - a[1]) * ny);
    if (d < 0) return null;
    if (d < best) { best = d; normal = [nx, ny]; }
  }
  return { depth: best, normal };
}

export function closestOnPolygon(poly: Vec2[], p: Vec2): { point: Vec2; distance: number } {
  let best = Infinity, point: Vec2 = poly[0];
  for (let i = 0; i < poly.length; i++) {
    const a = poly[i], b = poly[(i + 1) % poly.length];
    const ex = b[0] - a[0], ey = b[1] - a[1], len2 = ex * ex + ey * ey || 1;
    const t = clamp(((p[0] - a[0]) * ex + (p[1] - a[1]) * ey) / len2, 0, 1);
    const q: Vec2 = [a[0] + t * ex, a[1] + t * ey], d = Math.hypot(p[0] - q[0], p[1] - q[1]);
    if (d < best) { best = d; point = q; }
  }
  return { point, distance: best };
}

/** Vertices plus edge midpoints: enough points for a hull lying along a pontoon. */
export function densify(poly: Vec2[]): Vec2[] {
  const out: Vec2[] = [];
  for (let i = 0; i < poly.length; i++) {
    const a = poly[i], b = poly[(i + 1) % poly.length];
    out.push(a, [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2]);
  }
  return out;
}

export interface Penetration {
  /** World contact point. */
  point: Vec2;
  /** Unit normal the boat is pushed along. */
  normal: Vec2;
  depth: number;
}

/** Every point where the hull (world polygon, counter-clockwise) and a shape overlap. */
export function penetrations(hull: Vec2[], samples: Vec2[], shape: Shape): Penetration[] {
  const out: Penetration[] = [];
  if (shape.type === "circle") {
    const c: Vec2 = [shape.x, shape.y];
    const inside = insideConvex(hull, c);
    if (inside) {
      out.push({ point: c, normal: [-inside.normal[0], -inside.normal[1]], depth: inside.depth + shape.r });
    } else {
      const { point, distance } = closestOnPolygon(hull, c);
      if (distance < shape.r && distance > 1e-9) {
        out.push({ point, normal: [(point[0] - c[0]) / distance, (point[1] - c[1]) / distance], depth: shape.r - distance });
      }
    }
    return out;
  }
  const poly = ccw(shape.points);
  for (const p of samples) {
    const inside = insideConvex(poly, p);
    if (inside) out.push({ point: p, normal: inside.normal, depth: inside.depth });
  }
  for (const p of poly) {
    const inside = insideConvex(hull, p);
    if (inside) out.push({ point: p, normal: [-inside.normal[0], -inside.normal[1]], depth: inside.depth });
  }
  return out;
}

/** Shortest gap between the hull and a shape, 0 when they touch. */
export function clearance(hull: Vec2[], shape: Shape): number {
  if (shape.type === "circle") {
    if (insideConvex(hull, [shape.x, shape.y])) return 0;
    return Math.max(0, closestOnPolygon(hull, [shape.x, shape.y]).distance - shape.r);
  }
  const poly = ccw(shape.points);
  let best = Infinity;
  for (const p of hull) {
    if (insideConvex(poly, p)) return 0;
    best = Math.min(best, closestOnPolygon(poly, p).distance);
  }
  for (const p of poly) {
    if (insideConvex(hull, p)) return 0;
    best = Math.min(best, closestOnPolygon(hull, p).distance);
  }
  return best;
}

export function rect(cx: number, cy: number, width: number, height: number, rotationDeg = 0): Vec2[] {
  const pose = { x: cx, y: cy, heading: rotationDeg }, w = width / 2, h = height / 2;
  // width along the rotated east axis, height along the rotated north axis
  return [[-h, -w], [-h, w], [h, w], [h, -w]].map(([f, s]) => toWorld(pose, [f, s] as Vec2));
}
