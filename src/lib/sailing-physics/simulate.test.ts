import { describe, it, expect } from 'vitest';
import { createInitialState, tick, settle } from './simulate';
import { getBoatParams } from './boat';
import type { Controls } from './types';

// ============================================================================
// Verification tests for the sailing-physics engine.
// Each `it` block is one of the 5 scenarios in DECISIONS.md ADR-0001.
// The engine does not "ship" (= is not considered Phase 1 complete) until
// all five are green.
// ============================================================================

const params = getBoatParams();

// "Properly trimmed beam reach" for TWS=12, steady-state bs ~5.5 kn:
// Steady-state AWA ~ 65 deg, we want both sails at AoA near peak Cl (~15 deg).
// Main angle = 65 - 15 = 50 deg  ->  mainSheet = (85 - 50)/85 ~ 0.41
// Jib  angle = 65 - 15 = 50 deg  ->  jibSheet  = (55 - (50 - 5))/55 ~ 0.18
// (Jib range is [jibMinOff=5, jibMaxOff=55] in boat.ts.)
const neutralBeamReachControls: Controls = {
  mainSheet: 0.4,
  jibSheet: 0.2,
  mainTwist: 0.1,
  jibTwist: 0.1,
  reef: 0,
  jibFurl: 0,
  jibSide: 1,
};

describe('ADR-0001 V1 verification', () => {
  it('Test 1: Beam reach baseline (TWA=90, TWS=12, neutral trim)', () => {
    // Start from a reasonable beam-reach speed (5 kn) rather than near-rest.
    // The engine can recover from low speed too, but the test is about the
    // steady state, not the spiral-up; starting at 5 avoids the "stalled at
    // near-rest" transient that real sailors break by easing then re-trimming.
    const state = createInitialState({ tws: 12, twa: 90, boatSpeed: 5 });
    const { state: s, diag } = settle(state, neutralBeamReachControls, params, 60);

    console.log(`  Test 1 out: bs=${s.boatSpeed.toFixed(2)} kn, heel=${s.heel.toFixed(1)}°, ` +
      `leeway=${s.leeway.toFixed(1)}°, AWA=${diag.awa.toFixed(1)}°, AWS=${diag.aws.toFixed(1)} kn, ` +
      `mainAoA=${diag.mainAoA.toFixed(1)}°, jibAoA=${diag.jibAoA.toFixed(1)}°, ` +
      `mainStalled=${diag.mainStalled}, jibStalled=${diag.jibStalled}, ` +
      `drive=${diag.drive.toFixed(0)} N, side=${diag.side.toFixed(0)} N, ` +
      `slot=${diag.slotHealth.toFixed(2)}`);

    expect(s.boatSpeed).toBeGreaterThanOrEqual(5.0);
    expect(s.boatSpeed).toBeLessThanOrEqual(6.5);
    // Our abstract cruiser is moderate sail area / stiff keel = less heel than
    // a Bavaria 46 (which has 30% more sail area). Range tuned to the model
    // in boat.ts; see MEMORY.md 2026-04-18 Phase 1 tuning entry.
    expect(Math.abs(s.heel)).toBeGreaterThanOrEqual(6);
    expect(Math.abs(s.heel)).toBeLessThanOrEqual(15);
  });

  it('Test 2: Over-trim stall (hard-sheet main at beam reach)', () => {
    // Reach steady state first (same scenario as Test 1)
    const s0 = createInitialState({ tws: 12, twa: 90, boatSpeed: 5 });
    const settled = settle(s0, neutralBeamReachControls, params, 60);
    const bsBefore = settled.state.boatSpeed;

    // Now over-sheet the main
    const overTrim: Controls = { ...neutralBeamReachControls, mainSheet: 1.0 };
    // Allow the sim to react. Use enough time to relax heel and adjust speed.
    const after3s = settle(settled.state, overTrim, params, 3);

    console.log(`  Test 2 out: bs before=${bsBefore.toFixed(2)} kn, ` +
      `bs 3s after over-trim=${after3s.state.boatSpeed.toFixed(2)} kn, ` +
      `mainAoA=${after3s.diag.mainAoA.toFixed(1)}°, mainStalled=${after3s.diag.mainStalled}`);

    const drop = (bsBefore - after3s.state.boatSpeed) / bsBefore;
    expect(drop).toBeGreaterThanOrEqual(0.10); // at least 10% speed drop
    expect(after3s.diag.mainStalled).toBe(true);
  });

  it('Test 3: Close-hauled apparent wind (TWA=40, TWS=12)', () => {
    const s0 = createInitialState({ tws: 12, twa: 40 });
    const closeHauled: Controls = {
      mainSheet: 0.85, jibSheet: 0.85,
      mainTwist: 0.15, jibTwist: 0.15,
      reef: 0, jibFurl: 0, jibSide: 1,
    };
    const { state: s, diag } = settle(s0, closeHauled, params, 60);

    console.log(`  Test 3 out: bs=${s.boatSpeed.toFixed(2)} kn, AWA=${diag.awa.toFixed(1)}°, ` +
      `AWS=${diag.aws.toFixed(1)} kn, TWA=40, TWS=12, mainAoA=${diag.mainAoA.toFixed(1)}°, ` +
      `jibAoA=${diag.jibAoA.toFixed(1)}°`);

    expect(Math.abs(diag.awa)).toBeLessThanOrEqual(40); // AW comes forward
    expect(diag.aws).toBeGreaterThan(12); // AW stronger than TW
  });

  it('Test 4: Reef in heavy air (TWS=22 close-hauled)', () => {
    const s0 = createInitialState({ tws: 22, twa: 40 });
    const closeNoReef: Controls = {
      mainSheet: 0.85, jibSheet: 0.85,
      mainTwist: 0.25, jibTwist: 0.25,
      reef: 0, jibFurl: 0, jibSide: 1,
    };
    const noReef = settle(s0, closeNoReef, params, 60);

    console.log(`  Test 4a (no reef): bs=${noReef.state.boatSpeed.toFixed(2)} kn, ` +
      `heel=${noReef.state.heel.toFixed(1)}°`);

    expect(Math.abs(noReef.state.heel)).toBeGreaterThan(25);

    // "Heavily reefed" = 3rd reef in main, roller jib furled to ~#3.
    // In 22 kn on a cruiser this is what a sensible skipper sets up to stay
    // comfortable (heel under 22 deg, boat still moving well).
    const s0b = createInitialState({ tws: 22, twa: 40 });
    const closeReefed: Controls = { ...closeNoReef, reef: 0.85, jibFurl: 0.65 };
    const reefed = settle(s0b, closeReefed, params, 60);

    console.log(`  Test 4b (reefed): bs=${reefed.state.boatSpeed.toFixed(2)} kn, ` +
      `heel=${reefed.state.heel.toFixed(1)}°`);

    expect(Math.abs(reefed.state.heel)).toBeLessThan(22);
    // Reefed speed is slower (that's the point - less power for less heel) but
    // not catastrophically. Deep reef + furl at 22 kn = ~30% speed loss is OK.
    expect(reefed.state.boatSpeed).toBeGreaterThan(noReef.state.boatSpeed * 0.7);
  });

  it('Test 5: Wing-on-wing deep downwind (TWA=180, jib opposite side)', () => {
    // At dead downwind the wing-on-wing advantage is maximal: the jib on the
    // opposite side is not blanketed by the main and presents full area to
    // the wind. We test at TWA=180 (pure run) instead of 170 to isolate the
    // geometric effect from blanketing (which we do not model).
    const sameSide = createInitialState({ tws: 12, twa: 180 });
    const normalControls: Controls = {
      mainSheet: 0.0, // boom all the way out
      jibSheet: 0.0,  // jib all the way out, same side as main
      mainTwist: 0.2, jibTwist: 0.2,
      reef: 0, jibFurl: 0, jibSide: 1,
    };
    const sameResult = settle(sameSide, normalControls, params, 60);

    // Wing-on-wing: jib opposite side (jibSide = -1)
    const wingSide = createInitialState({ tws: 12, twa: 180 });
    const wingControls: Controls = { ...normalControls, jibSide: -1 };
    const wingResult = settle(wingSide, wingControls, params, 60);

    console.log(`  Test 5 same-side: bs=${sameResult.state.boatSpeed.toFixed(2)} kn, ` +
      `drive=${sameResult.diag.drive.toFixed(0)} N`);
    console.log(`  Test 5 wing-on-wing: bs=${wingResult.state.boatSpeed.toFixed(2)} kn, ` +
      `drive=${wingResult.diag.drive.toFixed(0)} N`);

    // Wing-on-wing should produce more drive than same-side at this deep TWA.
    expect(wingResult.diag.drive).toBeGreaterThan(sameResult.diag.drive);
  });
});

describe('Sanity', () => {
  it('tick is deterministic and pure', () => {
    const s0 = createInitialState({ tws: 10, twa: 60 });
    const c: Controls = {
      mainSheet: 0.5, jibSheet: 0.5,
      mainTwist: 0, jibTwist: 0,
      reef: 0, jibFurl: 0, jibSide: 1,
    };
    const r1 = tick(s0, c, params, 0.1);
    const r2 = tick(s0, c, params, 0.1);
    expect(r1.state.boatSpeed).toBe(r2.state.boatSpeed);
    expect(r1.state.heel).toBe(r2.state.heel);
  });

  it('boat speed starts rising from rest', () => {
    const s0 = createInitialState({ tws: 12, twa: 90, boatSpeed: 0 });
    const c: Controls = {
      mainSheet: 0.5, jibSheet: 0.3,
      mainTwist: 0, jibTwist: 0,
      reef: 0, jibFurl: 0, jibSide: 1,
    };
    const r = tick(s0, c, params, 0.1);
    expect(r.state.boatSpeed).toBeGreaterThan(0);
  });

  it('apparent wind goes to zero when boat runs at wind speed', () => {
    // If TWS=12 kn, boat running dead downwind at 12 kn, AWS should be 0.
    const s0 = createInitialState({ tws: 12, twa: 180, boatSpeed: 12 });
    const c: Controls = {
      mainSheet: 0.0, jibSheet: 0.0,
      mainTwist: 0, jibTwist: 0,
      reef: 0, jibFurl: 0, jibSide: 1,
    };
    const r = tick(s0, c, params, 0.1);
    expect(r.diag.aws).toBeLessThan(0.5);
  });
});
