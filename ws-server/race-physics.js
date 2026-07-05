// Pure JS mirror of src/lib/race-physics.ts (kept manually in sync).
// Server runs plain ESM, no bundler, so we duplicate the tiny module here
// instead of pulling in a whole TS toolchain. If the TS version is updated,
// update this file too - src/lib/race-physics.drift.test.ts (run by
// `npm run test:physics`) fails if the two copies diverge numerically.

export const WORLD = { width: 800, height: 1200 };
export const WIND_DIRECTION_BASE = 0;
export const MAX_SPEED = 8.0;
export const TURN_RATE = 90;
export const ACCEL = 2.5;
export const MARK_ROUND_DIST = 28;
export const MIN_BOAT_SEPARATION = 22;

export const deg2rad = d => (d * Math.PI) / 180;
export const normalizeAngle = deg => ((deg % 360) + 360) % 360;

export function distance(a, b) {
  const dx = a.x - b.x, dy = a.y - b.y;
  return Math.sqrt(dx * dx + dy * dy);
}

export function segmentCrossed(prev, curr, a, b) {
  const ccw = (A, B, C) => (C.y - A.y) * (B.x - A.x) > (B.y - A.y) * (C.x - A.x);
  return ccw(a, prev, curr) !== ccw(b, prev, curr) &&
         ccw(a, b, prev) !== ccw(a, b, curr);
}

export function speedFactorFromTWA(twa) {
  const a = Math.abs(twa);
  if (a < 30) return 0;
  if (a < 45) return ((a - 30) / 15) * 0.65;
  if (a < 90) return 0.65 + ((a - 45) / 45) * 0.35;
  if (a < 160) return 1.0 - ((a - 90) / 70) * 0.15;
  return 0.85 - ((a - 160) / 20) * 0.25;
}

export function calcTWA(heading, windDir = 0) {
  return ((heading - windDir + 540) % 360) - 180;
}

export function windAt(t, seed = 0) {
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

export function stepBoat(boat, dt, windDir, gust, input, opts = {}) {
  if (input.turn !== 0) {
    boat.heading = normalizeAngle(boat.heading + input.turn * TURN_RATE * dt);
  }
  const twa = calcTWA(boat.heading, windDir);
  const speedMul = opts.speedMul ?? 1.0;
  const wsm = opts.windStrengthMul ?? 1.0;
  const targetSpeed = speedFactorFromTWA(twa) * MAX_SPEED * speedMul * wsm * gust;
  const accel = (targetSpeed > boat.speed ? ACCEL : ACCEL * 0.6);
  boat.speed += (targetSpeed - boat.speed) * accel * dt;
  const rad = deg2rad(boat.heading);
  boat.pos.x += Math.sin(rad) * boat.speed * 8 * dt;
  boat.pos.y -= Math.cos(rad) * boat.speed * 8 * dt;
  boat.pos.x = Math.max(20, Math.min(WORLD.width - 20, boat.pos.x));
  boat.pos.y = Math.max(20, Math.min(WORLD.height - 20, boat.pos.y));
}

export function resolveCollisions(boats) {
  for (let i = 0; i < boats.length; i++) {
    for (let j = i + 1; j < boats.length; j++) {
      const a = boats[i], b = boats[j];
      const dx = b.pos.x - a.pos.x, dy = b.pos.y - a.pos.y;
      const d = Math.hypot(dx, dy);
      if (d < MIN_BOAT_SEPARATION && d > 0.01) {
        const overlap = (MIN_BOAT_SEPARATION - d) / 2;
        const nx = dx / d, ny = dy / d;
        a.pos.x -= nx * overlap; a.pos.y -= ny * overlap;
        b.pos.x += nx * overlap; b.pos.y += ny * overlap;
        a.speed *= 0.92; b.speed *= 0.92;
      }
    }
  }
}

export function makeStandardCourse() {
  const cx = WORLD.width / 2;
  const startY = WORLD.height - 150;
  const windwardY = 180;
  const startLine = { a: { x: cx - 80, y: startY }, b: { x: cx + 80, y: startY } };
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

export function updateLap(boat, prevPos, course, raceTime) {
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
