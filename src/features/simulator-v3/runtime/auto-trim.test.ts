import { describe, expect, it } from 'vitest';
import { getBoatParams, NO_GO_HALF_DEG } from '@/lib/sailing-physics';
import { AUTO_TRIM_PERIOD_S } from '@/lib/helm-trim';
import { polarAngles } from '@/lib/helm-angles';
import { helmProfileFor } from '@/features/race-hud/target';
import { autoTrimStep, bestVmgTwa, trainerOptimum, trimDiffers } from './auto-trim';
import { createRuntimeState, uiToControls } from './create-runtime-state';
import { stepRuntime } from './step-runtime';
import { SAILING_STEP_SECONDS } from '../../sailing-lab/runtime/fixed-clock';
import { DEFAULT_UI, type UiState } from '../ui/shared';

// Package 13 stage D (ADR-0022): the Trainer's auto-trim, "Best" and "Best
// VMG" read one solver. If either went back to a table of its own, or the
// preset sailed an angle of its own, these fail.

const params = getBoatParams();
const WINDS = [6, 12, 20] as const;

/** Sail the Trainer's runtime with the auto-trim on, as the page does: every
 * AUTO_TRIM_PERIOD_S the controls move to autoTrimStep on the live boat. */
function sailWithAutoTrim(start: UiState, seconds: number) {
  let ui = start;
  let rt = createRuntimeState({ ui, params });
  let clock = 0;
  for (let i = 0; i < Math.round(seconds / SAILING_STEP_SECONDS); i++) {
    clock += SAILING_STEP_SECONDS;
    if (clock >= AUTO_TRIM_PERIOD_S - 1e-9) {
      clock = 0;
      const trim = autoTrimStep(rt.boat, ui, params);
      if (trimDiffers(ui, trim)) ui = { ...ui, ...trim };
    }
    rt = stepRuntime(rt, uiToControls(ui, params), rt.targetHeading, params, SAILING_STEP_SECONDS);
  }
  return { ui, rt };
}

describe('auto-trim and "Best" give the same answer (cruiser, three winds)', () => {
  for (const tws of WINDS) {
    it(`${tws} kn: the auto-trim sails to the sheets "Best" sets`, () => {
      // From the old classic-profile default sheets, far from the answer.
      const start: UiState = { ...DEFAULT_UI, windSpeed: tws, twa: 60, mainAngle: 52, jibAngle: 54 };
      const best = trainerOptimum(start, params);
      const { ui, rt } = sailWithAutoTrim(start, 150);
      expect(Math.abs(ui.mainAngle - best.trim.mainAngle)).toBeLessThanOrEqual(0.5);
      expect(Math.abs(ui.jibAngle - best.trim.jibAngle)).toBeLessThanOrEqual(0.5);
      expect(ui.mainTwistPct).toBe(best.trim.mainTwistPct);
      expect(ui.jibTwistPct).toBe(best.trim.jibTwistPct);
      expect(rt.boat.boatSpeed / best.result.state.boatSpeed).toBeGreaterThan(0.995);
      // The same state: on the boat "Best" settles, one auto-trim step keeps "Best".
      const step = autoTrimStep(best.result.state, { ...start, ...best.trim }, params);
      expect(trimDiffers({ ...start, ...best.trim }, step)).toBe(false);
    });
  }

  it('is far from the former heuristic on the beat, where it was 33-40% slow', () => {
    // The old "Best" put the main at AWA - 16 deg: 18 deg off at 12 kn, TWA 40.
    const best = trainerOptimum({ ...DEFAULT_UI, twa: 40, windSpeed: 12 }, params);
    expect(best.trim.mainAngle).toBeLessThan(10);
    expect(best.result.state.boatSpeed).toBeCloseTo(6.21, 1);
  });

  it('opens the free Trainer at a 100% trim', () => {
    const best = trainerOptimum(DEFAULT_UI, params);
    expect(Math.abs(best.trim.mainAngle - DEFAULT_UI.mainAngle)).toBeLessThanOrEqual(0.5);
    expect(Math.abs(best.trim.jibAngle - DEFAULT_UI.jibAngle)).toBeLessThanOrEqual(0.5);
  });
});

// helm-angles: 45 / 40 / 40 deg upwind (helm-angles.test.ts). Since ADR-0023
// the cruiser's zone is 40, never wider than that, so the preset sails
// helm-angles' own angle in every wind (it sailed the 42 deg edge before).
const EXPECTED_UP = { 6: 45, 12: 40, 20: 40 } as const;

describe('"Best VMG" lands on the angle of helm-angles', () => {
  for (const tws of WINDS) {
    it(`${tws} kn`, () => {
      const { angles, speedAt, noGoDeg } = helmProfileFor(tws, 'cruiser');
      // The one solver of helm-angles on the race's cruiser polar.
      expect(polarAngles(speedAt)).toEqual(angles);
      // The polar's best angle is never inside the zone the Trainer draws.
      expect(angles.upwind.twa).toBeGreaterThanOrEqual(noGoDeg);
      expect(noGoDeg).toBe(NO_GO_HALF_DEG);
      // Upwind: exactly helm-angles' angle, the one the race's BEST VMG sails.
      const up = bestVmgTwa({ twa: 60, windSpeed: tws });
      expect(up).toBe(angles.upwind.twa);
      expect(up).toBe(EXPECTED_UP[tws]);
      expect(speedAt(up) * Math.cos(up * Math.PI / 180)).toBeCloseTo(angles.upwind.vmgKn, 9);
      expect(bestVmgTwa({ twa: 90, windSpeed: tws })).toBe(up);
      expect(bestVmgTwa({ twa: 135, windSpeed: tws })).toBe(angles.downwind.twa);
      // Its sheets are the solver's at rest on that angle.
      const ui: UiState = { ...DEFAULT_UI, windSpeed: tws, twa: angles.upwind.twa, tack: 'port' };
      const trim = trainerOptimum(ui, params).trim;
      expect(trim).toEqual(trainerOptimum({ ...ui, tack: 'starboard' }, params).trim);
    });
  }
});
