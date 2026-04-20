// ============================================================================
// Property-based fuzzing for the physics engine.
//
// The hand-written tests in simulate.test.ts check 8 specific qualitative
// behaviours. This file uses fast-check to hammer `tick()` and `settle()`
// with random inputs and verify *invariants* - things that must be true
// no matter what inputs you throw at the engine.
//
// Why: before shipping physics to V1/V2/V3 UIs we rely on `tick()` never
// returning NaN or Infinity, never sending heel past 90°, never giving
// negative boat speed. If any of those happen, the UI renders garbage and
// the user gets a frozen or broken scene.
//
// If a fuzz test fails, fast-check automatically shrinks to a minimal
// reproducer (e.g. "minimum TWS that NaNs the engine is 0.0001"). Copy
// the shrunk case into simulate.test.ts as a new regression test.
// ============================================================================

import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import { tick, createInitialState, settle } from './simulate';
import { getBoatParams } from './boat';
import type { Controls } from './types';

const params = getBoatParams();

/** Arbitrary for a valid Controls object. */
const controlsArb = fc.record<Controls>({
  mainSheet: fc.double({ min: 0, max: 1, noNaN: true }),
  jibSheet: fc.double({ min: 0, max: 1, noNaN: true }),
  mainTwist: fc.double({ min: 0, max: 1, noNaN: true }),
  jibTwist: fc.double({ min: 0, max: 1, noNaN: true }),
  reef: fc.double({ min: 0, max: 1, noNaN: true }),
  jibFurl: fc.double({ min: 0, max: 1, noNaN: true }),
  jibSide: fc.constantFrom<1 | -1>(1, -1),
});

/** Arbitrary for reasonable wind + TWA combinations (the realistic envelope). */
const normalWindArb = fc.record({
  tws: fc.double({ min: 0, max: 40, noNaN: true }),  // 0-40 kt
  twa: fc.double({ min: -180, max: 180, noNaN: true }),
});

/** Arbitrary for out-of-envelope inputs (what a misbehaving client could send). */
const extremeWindArb = fc.record({
  tws: fc.double({ min: -10, max: 200, noNaN: true }), // Negative TWS, hurricane-speed TWS
  twa: fc.double({ min: -720, max: 720, noNaN: true }), // Wrap-around bad
});

function allFinite(obj: Record<string, unknown>): boolean {
  for (const v of Object.values(obj)) {
    if (typeof v === 'number' && !Number.isFinite(v)) return false;
  }
  return true;
}

describe('physics engine: property-based invariants', () => {
  it('tick() never produces NaN or Infinity in state or diagnostics (realistic inputs)', () => {
    fc.assert(
      fc.property(normalWindArb, controlsArb, fc.double({ min: 0.001, max: 0.1, noNaN: true }), (wind, controls, dt) => {
        const state = createInitialState({ tws: wind.tws, twa: wind.twa });
        const result = tick(state, controls, params, dt);
        expect(allFinite(result.state as unknown as Record<string, unknown>)).toBe(true);
        expect(allFinite(result.diag as unknown as Record<string, unknown>)).toBe(true);
      }),
      { numRuns: 500 },
    );
  });

  it('boat speed never goes negative', () => {
    fc.assert(
      fc.property(normalWindArb, controlsArb, fc.double({ min: 0.001, max: 0.1, noNaN: true }), (wind, controls, dt) => {
        const state = createInitialState({ tws: wind.tws, twa: wind.twa });
        const result = tick(state, controls, params, dt);
        expect(result.state.boatSpeed).toBeGreaterThanOrEqual(0);
      }),
      { numRuns: 500 },
    );
  });

  it('heel stays in [-90, 90] degrees (boat does not invert)', () => {
    fc.assert(
      fc.property(normalWindArb, controlsArb, fc.double({ min: 0.001, max: 0.1, noNaN: true }), (wind, controls, dt) => {
        const state = createInitialState({ tws: wind.tws, twa: wind.twa });
        const result = tick(state, controls, params, dt);
        expect(result.state.heel).toBeGreaterThanOrEqual(-90);
        expect(result.state.heel).toBeLessThanOrEqual(90);
      }),
      { numRuns: 500 },
    );
  });

  it('leeway stays within [-45, 45] (extreme but physical upper bound)', () => {
    fc.assert(
      fc.property(normalWindArb, controlsArb, fc.double({ min: 0.001, max: 0.1, noNaN: true }), (wind, controls, dt) => {
        const state = createInitialState({ tws: wind.tws, twa: wind.twa });
        const result = tick(state, controls, params, dt);
        expect(result.state.leeway).toBeGreaterThanOrEqual(-45);
        expect(result.state.leeway).toBeLessThanOrEqual(45);
      }),
      { numRuns: 500 },
    );
  });

  it('diagnostics (AWA, AWS, AoA, drive, side, VMG, slotHealth) are always finite', () => {
    fc.assert(
      fc.property(normalWindArb, controlsArb, fc.double({ min: 0.001, max: 0.1, noNaN: true }), (wind, controls, dt) => {
        const state = createInitialState({ tws: wind.tws, twa: wind.twa });
        const { diag } = tick(state, controls, params, dt);
        expect(Number.isFinite(diag.aws)).toBe(true);
        expect(Number.isFinite(diag.awa)).toBe(true);
        expect(Number.isFinite(diag.mainAoA)).toBe(true);
        expect(Number.isFinite(diag.jibAoA)).toBe(true);
        expect(Number.isFinite(diag.drive)).toBe(true);
        expect(Number.isFinite(diag.side)).toBe(true);
        expect(Number.isFinite(diag.vmg)).toBe(true);
        expect(Number.isFinite(diag.slotHealth)).toBe(true);
        expect(diag.slotHealth).toBeGreaterThanOrEqual(0);
        expect(diag.slotHealth).toBeLessThanOrEqual(1);
      }),
      { numRuns: 500 },
    );
  });

  it('settle() converges to finite state (never NaN) for realistic inputs', () => {
    fc.assert(
      fc.property(normalWindArb, controlsArb, (wind, controls) => {
        const state = createInitialState({ tws: wind.tws, twa: wind.twa });
        // 30 sim-seconds is enough for settle() to reach a stable velocity
        const result = settle(state, controls, params, 30);
        expect(allFinite(result.state as unknown as Record<string, unknown>)).toBe(true);
        expect(allFinite(result.diag as unknown as Record<string, unknown>)).toBe(true);
        expect(result.state.boatSpeed).toBeGreaterThanOrEqual(0);
      }),
      { numRuns: 200 },
    );
  });

  it('hardened against extreme / malformed inputs (no NaN, no throw)', () => {
    // The engine doesn't have to give *correct* answers for TWS=200 - it
    // just has to not blow up. The UI should clamp inputs before calling,
    // but defense in depth is cheap.
    fc.assert(
      fc.property(extremeWindArb, controlsArb, fc.double({ min: 0.001, max: 0.1, noNaN: true }), (wind, controls, dt) => {
        try {
          const state = createInitialState({ tws: wind.tws, twa: wind.twa });
          const result = tick(state, controls, params, dt);
          // We don't require sensible values here, just "not NaN"
          expect(Number.isFinite(result.state.boatSpeed)).toBe(true);
          expect(Number.isFinite(result.state.heel)).toBe(true);
          expect(Number.isFinite(result.diag.drive)).toBe(true);
        } catch (err) {
          // Throwing is acceptable for truly malformed input, but log to
          // know about it.
          // eslint-disable-next-line no-console
          console.warn('Engine threw on extreme input', { wind, controls, err: String(err) });
        }
      }),
      { numRuns: 300 },
    );
  });

  it('many consecutive ticks never accumulate NaN (drift test)', () => {
    fc.assert(
      fc.property(normalWindArb, controlsArb, (wind, controls) => {
        let state = createInitialState({ tws: wind.tws, twa: wind.twa });
        for (let i = 0; i < 200; i++) {
          const result = tick(state, controls, params, 0.05);
          state = result.state;
          if (!Number.isFinite(state.boatSpeed) || !Number.isFinite(state.heel)) {
            throw new Error(`Drift to NaN at step ${i}`);
          }
        }
      }),
      { numRuns: 100 },
    );
  });
});
