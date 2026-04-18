/**
 * Pure sailing physics functions.
 *
 * Used BOTH on the client (offline / solo racing) AND on the ws-server
 * (authoritative multiplayer tick). Keep this file dependency-free and
 * platform-agnostic - no React, no DOM, no Node APIs.
 */

export interface Vec2 { x: number; y: number }

export const WORLD = { width: 800, height: 1200 };
export const WIND_DIRECTION_BASE = 0;            // deg, wind source (0 = from north)
export const MAX_SPEED = 8.0;                    // knots
export const TURN_RATE = 90;                     // deg/sec player
export const ACCEL = 2.5;                        // speed lerp factor
export const MARK_ROUND_DIST = 28;
export const MIN_BOAT_SEPARATION = 22;           // collision repel distance

// ---------------------------------------------------------------------------
// Angle helpers
// ---------------------------------------------------------------------------
export const deg2rad = (d: number) => (d * Math.PI) / 180;
export const rad2deg = (r: number) => (r * 180) / Math.PI;

export function normalizeAngle(deg: number): number {
  return ((deg % 360) + 360) % 360;
}

export function angleDiff(a: number, b: number): number {
  let d = normalizeAngle(b) - normalizeAngle(a);
  if (d > 180) d -= 360;
  if (d < -180) d += 360;
  return d;
}

export function distance(a: Vec2, b: Vec2): number {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  return Math.sqrt(dx * dx + dy * dy);
}

export function bearing(a: Vec2, b: Vec2): number {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const rad = Math.atan2(dx, -dy);
  return (rad2deg(rad) + 360) % 360;
}

export function segmentCrossed(prev: Vec2, curr: Vec2, a: Vec2, b: Vec2): boolean {
  const ccw = (A: Vec2, B: Vec2, C: Vec2) =>
    (C.y - A.y) * (B.x - A.x) > (B.y - A.y) * (C.x - A.x);
  return ccw(a, prev, curr) !== ccw(b, prev, curr) &&
         ccw(a, b, prev) !== ccw(a, b, curr);
}

// ---------------------------------------------------------------------------
// Sailing performance curves
// ---------------------------------------------------------------------------

/** Speed factor (0..1) based on true wind angle (TWA, absolute). */
export function speedFactorFromTWA(twa: number): number {
  const a = Math.abs(twa);
  if (a < 30) return 0;                                // no-go
  if (a < 45) return ((a - 30) / 15) * 0.65;
  if (a < 90) return 0.65 + ((a - 45) / 45) * 0.35;
  if (a < 160) return 1.0 - ((a - 90) / 70) * 0.15;
  return 0.85 - ((a - 160) / 20) * 0.25;
}

/** Signed TWA in [-180..180] for a boat heading + wind source direction. */
export function calcTWA(heading: number, windDir = 0): number {
  return ((heading - windDir + 540) % 360) - 180;
}

// ---------------------------------------------------------------------------
// Wind shifts (deterministic from a seed)
// ---------------------------------------------------------------------------

/**
 * Returns { dir, gust } at race-relative time t (seconds).
 * Deterministic per `seed` so every client sees the same wind.
 */
export function windAt(t: number, seed = 0): { dir: number; gust: number } {
  const shift = Math.sin(t * (2 * Math.PI / 22) + seed * 0.37) * 6
              + Math.sin(t * (2 * Math.PI / 7)  + seed * 0.91) * 2;
  const gust  = 1.0
              + Math.sin(t * (2 * Math.PI / 9)   + seed * 0.13) * 0.12
              + Math.sin(t * (2 * Math.PI / 3.3) + seed * 0.71) * 0.05;
  return {
    dir: (WIND_DIRECTION_BASE + shift + 360) % 360,
    gust: Math.max(0.75, Math.min(1.25, gust)),
  };
}

// ---------------------------------------------------------------------------
// Boat input + step integrator - shared client/server
// ---------------------------------------------------------------------------

export interface RaceBoat {
  id: string;
  name: string;
  color: string;
  pos: Vec2;
  heading: number;
  speed: number;
  wake?: Vec2[];
  lapDone: number;        // 0 = before mark, 1 = after mark, 2 = finished
  finishTime?: number;
  // Client-side only extras are allowed (ignored server side):
  skill?: number;
  tackPreference?: 'port' | 'starboard';
  aiTackTimer?: number;
  isPlayer?: boolean;
}

export interface InputState {
  /** -1..1, negative = port, positive = starboard. */
  turn: number;
}

/** Advance one boat by dt seconds, with a given wind vector. */
export function stepBoat(
  boat: RaceBoat,
  dt: number,
  windDir: number,
  gust: number,
  input: InputState,
  opts: { speedMul?: number; windStrengthMul?: number } = {},
): void {
  // Heading
  if (input.turn !== 0) {
    boat.heading = normalizeAngle(boat.heading + input.turn * TURN_RATE * dt);
  }

  // Speed
  const twa = calcTWA(boat.heading, windDir);
  const speedMul = opts.speedMul ?? 1.0;
  const wsm = opts.windStrengthMul ?? 1.0;
  const targetSpeed = speedFactorFromTWA(twa) * MAX_SPEED * speedMul * wsm * gust;
  const accel = (targetSpeed > boat.speed ? ACCEL : ACCEL * 0.6);
  boat.speed += (targetSpeed - boat.speed) * accel * dt;

  // Position
  const rad = deg2rad(boat.heading);
  boat.pos.x += Math.sin(rad) * boat.speed * 8 * dt;
  boat.pos.y -= Math.cos(rad) * boat.speed * 8 * dt;

  // World clamp
  boat.pos.x = Math.max(20, Math.min(WORLD.width - 20, boat.pos.x));
  boat.pos.y = Math.max(20, Math.min(WORLD.height - 20, boat.pos.y));
}

/** Pair-wise boat repel to prevent overlap. */
export function resolveCollisions(boats: RaceBoat[]): void {
  for (let i = 0; i < boats.length; i++) {
    for (let j = i + 1; j < boats.length; j++) {
      const a = boats[i];
      const b = boats[j];
      const dx = b.pos.x - a.pos.x;
      const dy = b.pos.y - a.pos.y;
      const d = Math.hypot(dx, dy);
      if (d < MIN_BOAT_SEPARATION && d > 0.01) {
        const overlap = (MIN_BOAT_SEPARATION - d) / 2;
        const nx = dx / d;
        const ny = dy / d;
        a.pos.x -= nx * overlap;
        a.pos.y -= ny * overlap;
        b.pos.x += nx * overlap;
        b.pos.y += ny * overlap;
        a.speed *= 0.92;
        b.speed *= 0.92;
      }
    }
  }
}

// ---------------------------------------------------------------------------
// Standard windward-leeward course (same shape as the single-player game)
// ---------------------------------------------------------------------------

export interface CourseMark {
  pos: Vec2;
  radius: number;
  label: string;
  type: 'start' | 'windward' | 'finish';
}
export interface RaceCourse {
  marks: CourseMark[];
  startLine: { a: Vec2; b: Vec2 };
  finishLine: { a: Vec2; b: Vec2 };
}

export function makeStandardCourse(): RaceCourse {
  const cx = WORLD.width / 2;
  const startY = WORLD.height - 150;
  const windwardY = 180;
  const startLine = {
    a: { x: cx - 80, y: startY },
    b: { x: cx + 80, y: startY },
  };
  return {
    marks: [
      { pos: { x: cx, y: windwardY }, radius: 14, label: 'Windward', type: 'windward' },
      { pos: startLine.a, radius: 10, label: 'Start L', type: 'start' },
      { pos: startLine.b, radius: 10, label: 'Start R', type: 'start' },
    ],
    startLine,
    finishLine: startLine,
  };
}

/** Update a boat's lapDone if it crossed the windward mark or the finish line. */
export function updateLap(
  boat: RaceBoat,
  prevPos: Vec2,
  course: RaceCourse,
  raceTime: number,
): 'mark' | 'finish' | null {
  if (boat.lapDone === 0) {
    const w = course.marks[0];
    if (distance(boat.pos, w.pos) < MARK_ROUND_DIST + w.radius) {
      boat.lapDone = 1;
      return 'mark';
    }
  } else if (boat.lapDone === 1) {
    if (segmentCrossed(prevPos, boat.pos, course.finishLine.a, course.finishLine.b)) {
      if (prevPos.y < boat.pos.y) {
        boat.lapDone = 2;
        boat.finishTime = raceTime;
        return 'finish';
      }
    }
  }
  return null;
}
