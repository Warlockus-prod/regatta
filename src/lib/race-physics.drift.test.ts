import { describe, it, expect } from 'vitest';
import * as SRC from '@/lib/race-physics';
// The ws-server runs plain ESM with no TS toolchain, so ws-server/race-physics.js
// is a hand-maintained mirror of this module. Import it directly and assert the
// two copies stay numerically identical - this is the drift guard that lets the
// three physics copies (GameClient imports SRC, ws-server imports the mirror,
// this test cross-checks them) never silently diverge again.
import * as MIRROR from '../../ws-server/race-physics.js';

type AnyBoat = Record<string, unknown> & {
  pos: { x: number; y: number }; heading: number; speed: number; lapDone: number; finishTime?: number;
};

describe('race-physics mirror parity (ws-server/race-physics.js vs src/lib/race-physics.ts)', () => {
  it('exposes identical constants', () => {
    expect(MIRROR.WORLD).toEqual(SRC.WORLD);
    expect(MIRROR.WIND_DIRECTION_BASE).toBe(SRC.WIND_DIRECTION_BASE);
    expect(MIRROR.MAX_SPEED).toBe(SRC.MAX_SPEED);
    expect(MIRROR.TURN_RATE).toBe(SRC.TURN_RATE);
    expect(MIRROR.ACCEL).toBe(SRC.ACCEL);
    expect(MIRROR.MARK_ROUND_DIST).toBe(SRC.MARK_ROUND_DIST);
    expect(MIRROR.MIN_BOAT_SEPARATION).toBe(SRC.MIN_BOAT_SEPARATION);
  });

  it('speedFactorFromTWA matches across the whole TWA range (incl. the no-go boundary)', () => {
    for (let twa = -180; twa <= 180; twa += 0.5) {
      expect(MIRROR.speedFactorFromTWA(twa)).toBeCloseTo(SRC.speedFactorFromTWA(twa), 10);
    }
  });

  it('calcTWA matches across headings and wind directions', () => {
    for (let h = 0; h < 360; h += 5) {
      for (let w = 0; w < 360; w += 15) {
        expect(MIRROR.calcTWA(h, w)).toBeCloseTo(SRC.calcTWA(h, w), 10);
      }
    }
  });

  it('normalizeAngle matches', () => {
    for (let d = -720; d <= 720; d += 7) {
      expect(MIRROR.normalizeAngle(d)).toBeCloseTo(SRC.normalizeAngle(d), 10);
    }
  });

  it('windAt matches across time and seeds (deterministic wind must agree client/server)', () => {
    for (let seed = 0; seed < 6; seed++) {
      for (let t = 0; t <= 300; t += 1) {
        const a = MIRROR.windAt(t, seed);
        const b = SRC.windAt(t, seed);
        expect(a.dir).toBeCloseTo(b.dir, 9);
        expect(a.gust).toBeCloseTo(b.gust, 9);
      }
    }
  });

  it('stepBoat produces identical motion for the same inputs', () => {
    for (let h = 0; h < 360; h += 30) {
      for (const turn of [-1, 0, 1]) {
        for (const gust of [0.8, 1.0, 1.2]) {
          const mk = (): AnyBoat => ({ id: 'x', name: 'x', color: '#fff', pos: { x: 400, y: 600 }, heading: h, speed: 3, lapDone: 0 });
          const b1 = mk();
          const b2 = mk();
          SRC.stepBoat(b1 as never, 1 / 20, 10, gust, { turn }, { speedMul: 0.9, windStrengthMul: 1.1 });
          MIRROR.stepBoat(b2, 1 / 20, 10, gust, { turn }, { speedMul: 0.9, windStrengthMul: 1.1 });
          expect(b2.heading).toBeCloseTo(b1.heading, 9);
          expect(b2.speed).toBeCloseTo(b1.speed, 9);
          expect(b2.pos.x).toBeCloseTo(b1.pos.x, 9);
          expect(b2.pos.y).toBeCloseTo(b1.pos.y, 9);
        }
      }
    }
  });

  it('makeStandardCourse produces an identical course', () => {
    expect(MIRROR.makeStandardCourse()).toEqual(SRC.makeStandardCourse());
  });

  it('updateLap agrees on mark rounding', () => {
    const course = SRC.makeStandardCourse();
    const mk = (): AnyBoat => ({ id: 'x', name: 'x', color: '#fff', pos: { ...course.marks[0].pos }, heading: 0, speed: 5, lapDone: 0 });
    const b1 = mk();
    const b2 = mk();
    const prev = { x: b1.pos.x, y: b1.pos.y + 5 };
    expect(MIRROR.updateLap(b2, prev, course, 12)).toBe(SRC.updateLap(b1 as never, prev, course, 12));
    expect(b2.lapDone).toBe(b1.lapDone);
  });
});
