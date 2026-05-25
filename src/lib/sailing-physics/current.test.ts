import { describe, it, expect } from 'vitest';
import { velocityOverGround } from './current';

// ============================================================================
// Verification tests for the ocean/tidal current helper (Phase 3 of
// docs/design/live-weather/DESIGN.md).
//
// These are NEW cases. They do not touch the VPP engine or its 16 existing
// physics tests; this helper is a standalone pure vector function. The key
// contract is that a null or zero current reproduces the through-water
// velocity unchanged, so the engine's output is identical when no current is
// applied.
// ============================================================================

describe('velocityOverGround', () => {
  it('null current returns through-water velocity unchanged', () => {
    const r = velocityOverGround(5, 123, null);
    expect(r.sogKn).toBe(5);
    expect(r.cogDeg).toBe(123);
  });

  it('zero set returns through-water velocity, heading normalized', () => {
    const r = velocityOverGround(6, -30, { setKn: 0, dirDeg: 90 });
    expect(r.sogKn).toBe(6);
    // -30 deg normalizes to 330.
    expect(r.cogDeg).toBe(330);
  });

  it('current dead astern adds to speed, course unchanged', () => {
    // Heading 90 (East), current also flowing toward 90 (East).
    const r = velocityOverGround(5, 90, { setKn: 2, dirDeg: 90 });
    expect(r.sogKn).toBeCloseTo(7, 9); // 5 + 2
    expect(r.cogDeg).toBeCloseTo(90, 9);
  });

  it('current dead ahead subtracts from speed, course unchanged', () => {
    // Heading 90 (East), current flowing toward 270 (West) - straight at the bow.
    const r = velocityOverGround(5, 90, { setKn: 2, dirDeg: 270 });
    expect(r.sogKn).toBeCloseTo(3, 9); // 5 - 2
    expect(r.cogDeg).toBeCloseTo(90, 9);
  });

  it('90-deg cross current sets the boat, SOG = hypot, COG offset to the set side', () => {
    // Heading 0 (North) at 5 kn; current toward 90 (East) at 3 kn.
    const r = velocityOverGround(5, 0, { setKn: 3, dirDeg: 90 });
    expect(r.sogKn).toBeCloseTo(Math.hypot(5, 3), 9); // 5.83095...
    // Boat is set toward the East (starboard of a north heading): COG > 0.
    expect(r.cogDeg).toBeCloseTo(Math.atan2(3, 5) * (180 / Math.PI), 9); // ~30.96 deg
    expect(r.cogDeg).toBeGreaterThan(0);
    expect(r.cogDeg).toBeLessThan(90);
  });

  it('known numeric case: heading 45, 5 kn, current toward 225 at 5 kn cancels out', () => {
    // Current is exactly opposite the heading and equal speed -> SOG ~ 0.
    const r = velocityOverGround(5, 45, { setKn: 5, dirDeg: 225 });
    expect(r.sogKn).toBeCloseTo(0, 9);
  });

  it('cross current to port sets COG the other way and wraps below 360', () => {
    // Heading 0 (North) at 4 kn; current toward 270 (West) at 4 kn -> COG 315.
    const r = velocityOverGround(4, 0, { setKn: 4, dirDeg: 270 });
    expect(r.sogKn).toBeCloseTo(Math.hypot(4, 4), 9);
    expect(r.cogDeg).toBeCloseTo(315, 9);
  });
});
