// Time to the line (package 13 stage A, ADR-0022): how far the boat is from a
// line (the start or the finish) and, at the speed it makes towards it, how
// many seconds it needs. Pure geometry in the caller's units (race units or
// metres). Not drawn yet: the 60 s pre-start of package 15 shows it.

export interface LinePoint { readonly x: number; readonly y: number }

export interface LineTime {
  /** Shortest distance from the boat to the line segment. */
  readonly distance: number;
  /** Speed towards that nearest point (the velocity's component along the
   * way to it), in units per second; negative: moving away. */
  readonly closing: number;
  /** distance / closing; null when the boat is not closing on the line. */
  readonly seconds: number | null;
}

/** Nearest point of segment a-b to p. */
export function nearestOnSegment(p: LinePoint, a: LinePoint, b: LinePoint): LinePoint {
  const dx = b.x - a.x, dy = b.y - a.y, len2 = dx * dx + dy * dy;
  const t = len2 > 0 ? Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.y - a.y) * dy) / len2)) : 0;
  return { x: a.x + dx * t, y: a.y + dy * t };
}

/**
 * Distance and time to the line for a boat at `pos` sailing `headingDeg`
 * (compass, 0 = north = -y, as race-physics.ts bearing) at `speed` units per
 * second. On the line: distance 0, seconds 0.
 */
export function timeToLine(pos: LinePoint, headingDeg: number, speed: number, a: LinePoint, b: LinePoint): LineTime {
  const near = nearestOnSegment(pos, a, b);
  const ex = near.x - pos.x, ey = near.y - pos.y, distance = Math.hypot(ex, ey);
  if (distance < 1e-9) return { distance: 0, closing: Math.max(0, speed), seconds: 0 };
  const rad = headingDeg * Math.PI / 180;
  const vx = Math.sin(rad) * speed, vy = -Math.cos(rad) * speed;
  const closing = (vx * ex + vy * ey) / distance;
  return { distance, closing, seconds: Number.isFinite(closing) && closing > 1e-6 ? distance / closing : null };
}
