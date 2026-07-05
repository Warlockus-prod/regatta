import { describe, expect, it } from 'vitest';
import { getBoatParams } from '@/lib/sailing-physics';
import { DEFAULT_UI } from '../ui/shared';
import { createRuntimeState } from './create-runtime-state';
import { stepRuntime } from './step-runtime';
import {
  createWindState,
  stepWind,
  GUST_MIN_FACTOR,
  GUST_MAX_FACTOR,
  SHIFT_AMPLITUDE_DEG,
} from './wind-dynamics';

// ---------------------------------------------------------------------------
// Wind dynamics tests: steady / shift / gust modulation. Everything must be
// deterministic (seeded LCG + time-based phase; no Math.random), so tests
// can assert exact repeatability and hard envelope bounds.
// ---------------------------------------------------------------------------

const params = getBoatParams();
const DT = 1 / 30;

describe('wind dynamics', () => {
  it('steady leaves the wind untouched', () => {
    // Unit level: the modulation never budges off neutral.
    let w = createWindState({ baseTws: 12, baseDir: 40 });
    for (let i = 0; i < 900; i++) {
      w = stepWind(w, 'steady', DT);
      expect(w.twsFactor).toBe(1);
      expect(w.dirOffset).toBe(0);
    }
    expect(w.baseTws).toBe(12);
    expect(w.baseDir).toBe(40);

    // Runtime level: default mode is steady - boat wind stays pinned at
    // the base (exactly the pre-wind-dynamics behavior).
    let rt = createRuntimeState({ ui: DEFAULT_UI, params });
    const baseDir = rt.wind.baseDir;
    for (let i = 0; i < 300; i++) {
      rt = stepRuntime(rt, rt.target, rt.targetHeading, params, DT);
      expect(rt.boat.trueWindSpeed).toBe(DEFAULT_UI.windSpeed);
      expect(rt.boat.trueWindDir).toBeCloseTo(baseDir, 10);
    }
  });

  it('gust raises TWS by 30-45% then decays back to base', () => {
    let w = createWindState({ baseTws: 12, baseDir: 0 });
    const factors: number[] = [];
    // 40 s: the first gust arms within ~4 s and the full envelope
    // (2 s ramp + 4-6 s hold + 3 s decay) completes well inside this.
    for (let i = 0; i < 1200; i++) {
      w = stepWind(w, 'gust', DT);
      factors.push(w.twsFactor);
    }
    const peak = Math.max(...factors);
    expect(peak).toBeGreaterThanOrEqual(GUST_MIN_FACTOR - 1e-9);
    expect(peak).toBeLessThanOrEqual(GUST_MAX_FACTOR + 1e-9);
    // A gust never drops the wind below base...
    expect(Math.min(...factors)).toBeGreaterThanOrEqual(1);
    // ...and after the peak the factor returns exactly to base between
    // episodes (decay completes, scheduler goes quiet).
    const peakIdx = factors.indexOf(peak);
    expect(factors.slice(peakIdx).some((f) => f === 1)).toBe(true);
  });

  it('shift stays within +-12 deg and is deterministic for a fixed seed', () => {
    const run = () => {
      let w = createWindState({ baseTws: 12, baseDir: 90, seed: 1234 });
      const samples: number[] = [];
      for (let i = 0; i < 1800; i++) {
        w = stepWind(w, 'shift', DT);
        samples.push(w.dirOffset);
      }
      return samples;
    };
    const a = run();
    const b = run();
    // Deterministic: identical sequence for an identical seed.
    expect(b).toEqual(a);
    // Bounded: the wander never exceeds the stated amplitude.
    for (const o of a) {
      expect(Math.abs(o)).toBeLessThanOrEqual(SHIFT_AMPLITUDE_DEG + 1e-9);
    }
    // And it genuinely wanders to both sides (not a flat line).
    expect(Math.max(...a)).toBeGreaterThan(6);
    expect(Math.min(...a)).toBeLessThan(-6);
  });

  it('runtime applies modulated wind to the boat (gust TWS, shift dir)', () => {
    // Gust: the boat's felt TWS rises above the slider base, then returns.
    let rt = createRuntimeState({ ui: DEFAULT_UI, params });
    const base = DEFAULT_UI.windSpeed;
    let peakTws = 0;
    let returned = false;
    for (let i = 0; i < 1200; i++) {
      rt = stepRuntime(rt, rt.target, rt.targetHeading, params, DT, 'gust');
      peakTws = Math.max(peakTws, rt.boat.trueWindSpeed);
      if (peakTws > base * 1.25 && Math.abs(rt.boat.trueWindSpeed - base) < 1e-9) {
        returned = true;
      }
    }
    expect(peakTws).toBeGreaterThanOrEqual(base * GUST_MIN_FACTOR - 1e-6);
    expect(peakTws).toBeLessThanOrEqual(base * GUST_MAX_FACTOR + 1e-6);
    expect(returned).toBe(true);
    // Physics stays sane through the gust (heel responds, nothing explodes).
    expect(Number.isFinite(rt.boat.boatSpeed)).toBe(true);
    expect(Math.abs(rt.boat.heel)).toBeLessThan(60);

    // Shift: trueWindDir wanders around the base while the base holds, so
    // the felt TWA gets headed/lifted without the user's intent moving.
    let rt2 = createRuntimeState({ ui: DEFAULT_UI, params });
    const baseDir = rt2.wind.baseDir;
    let maxDev = 0;
    for (let i = 0; i < 1800; i++) {
      rt2 = stepRuntime(rt2, rt2.target, rt2.targetHeading, params, DT, 'shift');
      const raw = (((rt2.boat.trueWindDir - baseDir) % 360) + 540) % 360 - 180;
      maxDev = Math.max(maxDev, Math.abs(raw));
    }
    expect(maxDev).toBeGreaterThan(6);
    expect(maxDev).toBeLessThanOrEqual(SHIFT_AMPLITUDE_DEG + 1e-6);
    expect(rt2.wind.baseDir).toBe(baseDir);
    expect(rt2.wind.baseTws).toBe(DEFAULT_UI.windSpeed);
  });
});
