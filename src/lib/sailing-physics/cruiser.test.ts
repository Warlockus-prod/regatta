import { describe, expect, it } from "vitest";
import { createInitialState, tick } from "./simulate";
import { CLASSIC_BOAT, CRUISER_BOAT, getBoatParams } from "./boat";
import { solvePolarPoint, trimForDrive } from "./polar";
import { NO_GO_HALF_DEG } from "./constants";
import { residuaryShare } from "./resistance";
import type { BoatParams, Controls } from "./types";
import { createSharedBoat, stepSharedBoat } from "@/features/sailing-lab/runtime/boat-step";

// ============================================================================
// Behavioural contracts of the cruiser profile (DECISIONS.md ADR-0021). Each
// one would fail if the physics fell back to the classic behaviour the
// 2026-11-01 expert review found: no no-go, free tacks, reefing never paying,
// a hard speed cap and the wrong polar shape. Numbers are the ADR's measured
// tables; the bands leave room for libm and small retuning, not for the old
// behaviour. Each claim is checked on at least three inputs (AGENTS.md D1).
// ============================================================================

const P = CRUISER_BOAT;
const LOA = P.loa;
const speed = (twa: number, tws: number, reef = 0, params: BoatParams = P) => solvePolarPoint(twa, tws, reef, params).speed;
function bestVmg(tws: number, lo: number, hi: number, up: boolean, reef = 0, step = 1) {
  let best = { twa: 0, vmg: -Infinity };
  for (let twa = lo; twa <= hi; twa += step) {
    const vmg = speed(twa, tws, reef) * Math.cos(twa * Math.PI / 180) * (up ? 1 : -1);
    if (vmg > best.vmg) best = { twa, vmg };
  }
  return best;
}

/** From 6 kn straight into the wind with the close-hauled sheets held. */
function headToWind(tws: number, trainer: boolean) {
  const controls = solvePolarPoint(42, tws, 0, P).controls;
  const dt = 1 / 30;
  let state = createInitialState({ tws, trueWindDir: 0, heading: 0, boatSpeed: 6 });
  let shared = createSharedBoat(state, { controls }, P);
  let metres = 0;
  for (let i = 1; i <= 90 * 30; i++) {
    let v: number;
    if (trainer) {
      const next = stepSharedBoat(shared, { controls, steering: { mode: "course-assist", heading: 0 } }, { speed: tws, direction: 0 }, P, dt);
      shared = next; metres += next.travel.north; v = next.boat.boatSpeed;
    } else {
      state = tick(state, controls, P, dt).state;
      metres += state.boatSpeed * 0.514444 * Math.cos(state.leeway * Math.PI / 180) * dt; v = state.boatSpeed;
    }
    if (v < 0.5) return { seconds: i * dt, lengths: metres / LOA };
  }
  return { seconds: Infinity, lengths: metres / LOA };
}

/** A tack from TWA -45 to +45 against a twin that holds its course, both with
 * the crew retrimming every half second (raceCrewTrim cadence). */
function tack(tws: number, mode: "helm" | "assist") {
  const dt = 1 / 30;
  let controls: Controls = solvePolarPoint(42, tws, 0, P).controls;
  let boat = { ...createSharedBoat(createInitialState({ tws, trueWindDir: 0, heading: 45, boatSpeed: 5 }), { controls }, P), travel: { east: 0, north: 0 } };
  const step = (b: typeof boat, heading: number, m: "helm" | "assist", c: Controls) => {
    const delta = ((heading - b.boat.heading + 540) % 360) - 180;
    return stepSharedBoat(b, { controls: c, steering: m === "assist" ? { mode: "course-assist", heading }
      : { mode: "helm", rudder: Math.max(-1, Math.min(1, delta / 22)), lowSpeedAssist: true } }, { speed: tws, direction: 0 }, P, dt);
  };
  let clock = 0;
  for (let i = 0; i < 90 * 30; i++) {
    clock += dt; if (clock >= .5) { controls = trimForDrive(boat.boat, controls, P); clock = 0; }
    boat = step(boat, 45, "assist", controls);
  }
  let ref = boat, turned = boat, cRef = controls, cTurned = controls, northRef = 0, northTurned = 0, minSpeed = boat.boat.boatSpeed;
  const start = boat.boat.boatSpeed;
  clock = 0;
  for (let i = 1; i <= 60 * 30; i++) {
    clock += dt; if (clock >= .5) { cRef = trimForDrive(ref.boat, cRef, P); cTurned = trimForDrive(turned.boat, cTurned, P); clock = 0; }
    ref = step(ref, 45, "assist", cRef); turned = step(turned, 315, mode, cTurned);
    northRef += ref.travel.north; northTurned += turned.travel.north;
    minSpeed = Math.min(minSpeed, turned.boat.boatSpeed);
  }
  return { minShare: minSpeed / start, lostLengths: (northRef - northTurned) / LOA };
}

describe("cruiser profile: a luffing rig stops the boat (ADR-0021)", () => {
  it("stops a 6 kn boat head to wind in 12 kn within 2.5-5 lengths, sooner as the wind freshens", () => {
    // Measured: 12 kn 3.9 lengths in 39 s (both paths), 20 kn 1.7-2.0
    // lengths in 16-18 s, 8 kn still moving after 60 s (light flogging).
    for (const trainer of [false, true]) {
      const fresh = headToWind(20, trainer), medium = headToWind(12, trainer), light = headToWind(8, trainer);
      expect(medium.seconds, `trainer ${trainer}`).toBeLessThan(45);
      expect(medium.lengths).toBeGreaterThan(2.5);
      expect(medium.lengths).toBeLessThan(5);
      expect(fresh.lengths).toBeLessThan(medium.lengths);
      expect(light.lengths).toBeGreaterThan(medium.lengths);
    }
  });

  it("cannot sail steadily inside the no-go: TWA 15 stands still, 20 crawls, 25 makes little good", () => {
    // Measured TWS 12: TWA 15 0.00 kn, 20 1.02 kn, 25 2.79 kn (VMG 2.53 of 4.74).
    const best = bestVmg(12, 38, 46, true).vmg;
    expect(speed(15, 12)).toBeLessThan(.2);
    expect(speed(20, 12)).toBeLessThan(1.5);
    expect(speed(25, 12) * Math.cos(25 * Math.PI / 180)).toBeLessThan(.6 * best);
  });

  it("puts the best upwind VMG within 4 deg of the shared no-go reference in light, medium and fresh wind", () => {
    // Measured: 45 (6 kn), 42 (12 kn), 40 (20 kn). The classic profile
    // pointed at 40-41 in every wind and drove at TWA 20.
    for (const tws of [6, 12, 20]) {
      const { twa } = bestVmg(tws, 30, 56, true);
      expect(twa, `${tws} kn`).toBeGreaterThanOrEqual(NO_GO_HALF_DEG - 4);
      expect(twa, `${tws} kn`).toBeLessThanOrEqual(NO_GO_HALF_DEG + 4);
    }
  });

  it("sheets the jib no closer than a cruiser's genoa track", () => {
    expect(P.jibMinOff).toBeGreaterThanOrEqual(9);
    expect(P.jibMinOff).toBeLessThanOrEqual(12);
  });
});

describe("cruiser profile: resistance and polar shape (ADR-0021)", () => {
  it("has no hard speed cap: the wave wall holds the boat near hull speed and speed still grows with wind", () => {
    // Measured beam reach: 20 kn 8.96, 25 kn 9.50; the classic boat sat on
    // 10.60 (1.25 x hull speed) from 20 kn up.
    const [b20, b25, b30] = [20, 25, 30].map(tws => speed(90, tws));
    expect(b20).toBeGreaterThanOrEqual(8);
    expect(b20).toBeLessThanOrEqual(9);
    expect(b25).toBeGreaterThan(b20 + .3);
    expect(b30).toBeGreaterThan(b25);
    expect(b30).toBeLessThan(10.6);
    // The residuary share is the Delft wall: nothing at low Froude numbers, steep past 0.35.
    expect(residuaryShare(.2, P.model!.residuary)).toBeLessThan(.001);
    expect(residuaryShare(.45, P.model!.residuary) / residuaryShare(.35, P.model!.residuary)).toBeGreaterThan(5);
  });

  it("sails at realistic light-air speeds", () => {
    // Measured 6 kn: beam 5.76, TWA 42 4.03 (ORC cruisers with 30% more sail: 4.6-5.0), TWA 60 5.23.
    expect(speed(90, 6)).toBeGreaterThanOrEqual(5.5);
    expect(speed(42, 6)).toBeGreaterThanOrEqual(3.9);
    expect(speed(60, 6)).toBeGreaterThan(speed(42, 6));
  });

  it("keeps the broad reach level with the beam reach", () => {
    // Measured TWA 120 / TWA 90: 6 kn 0.90, 12 kn 0.97, 20 kn 0.97.
    expect(speed(120, 12)).toBeGreaterThanOrEqual(.95 * speed(90, 12));
    expect(speed(120, 20)).toBeGreaterThanOrEqual(.95 * speed(90, 20));
    expect(speed(120, 6)).toBeGreaterThanOrEqual(.85 * speed(90, 6));
  });

  it("runs downwind best at 150-170 deg, not dead downwind", () => {
    // Measured: 8 kn 159, 12 kn 158, 20 kn 167 (classic: 172 in every wind).
    const at8 = bestVmg(8, 130, 180, false).twa;
    expect(at8).toBeGreaterThanOrEqual(145);
    expect(at8).toBeLessThanOrEqual(165);
    for (const tws of [12, 20]) {
      const { twa } = bestVmg(tws, 130, 180, false);
      expect(twa, `${tws} kn`).toBeGreaterThanOrEqual(150);
      expect(twa, `${tws} kn`).toBeLessThanOrEqual(170);
    }
  });
});

describe("cruiser profile: heel costs speed, so reefing pays in a breeze (ADR-0021)", () => {
  it("is fastest unreefed in 12 kn, with half a reef in 20 kn and fully reefed in 25 kn", () => {
    // Measured best upwind VMG (reef 0 / 0.5 / 1): 12 kn 4.74 / 4.62 / 4.35,
    // 20 kn 5.38 / 5.47 / 5.43, 25 kn 5.56 / 5.73 / 5.81.
    const vmg = (tws: number) => [0, .5, 1].map(reef => bestVmg(tws, 34, 50, true, reef, 2).vmg);
    const [r12, r20, r25] = [12, 20, 25].map(vmg);
    expect(r12[0]).toBeGreaterThan(r12[1]);
    expect(r20[1]).toBeGreaterThan(r20[0]);
    expect(r25[2]).toBeGreaterThan(r25[1]);
    expect(r25[1]).toBeGreaterThan(r25[0]);
  });

  it("eases an overpowered boat instead of laying it on its side", () => {
    // The crew trims for drive minus resistance at the heel the sheets make:
    // unreefed close-hauled heel stays under the classic boat's.
    for (const tws of [16, 20, 25]) {
      const cruiser = Math.abs(solvePolarPoint(42, tws, 0, P).state.heel);
      const classic = Math.abs(solvePolarPoint(42, tws, 0, CLASSIC_BOAT).state.heel);
      expect(cruiser, `${tws} kn`).toBeLessThanOrEqual(classic + .5);
    }
  });
});

describe("cruiser profile: a tack costs speed and distance (ADR-0021)", () => {
  it("loses 25-35% of its speed through a 22 deg/s helm tack in 8, 12 and 20 kn", () => {
    // Measured min speed share: 8 kn 0.69, 12 kn 0.70, 20 kn 0.67 (classic
    // trainer boat: 0.66-0.81; the legacy race boat 0.87).
    for (const tws of [8, 12, 20]) {
      const { minShare } = tack(tws, "helm");
      expect(minShare, `${tws} kn`).toBeLessThanOrEqual(.75);
      expect(minShare, `${tws} kn`).toBeGreaterThanOrEqual(.6);
    }
  });

  it("charges the 45 deg/s course-assist tack its turning drag: half the speed and a boat length in 8-12 kn", () => {
    // Measured: 8 kn 0.46 / 1.72 lengths, 12 kn 0.47 / 1.02 lengths, 20 kn
    // 0.47 / 0.42 lengths. The classic assisted tack cost 0.01-0.10 lengths.
    const at12 = tack(12, "assist"), at8 = tack(8, "assist"), at20 = tack(20, "assist");
    expect(at12.minShare).toBeLessThan(.6);
    expect(at12.lostLengths).toBeGreaterThan(.8);
    expect(at8.lostLengths).toBeGreaterThan(1.2);
    expect(at20.minShare).toBeLessThan(.6);
  });
});

describe("classic profile stays frozen for the legacy race (ADR-0021)", () => {
  it("keeps the ADR-0001/0002 polar, its cap and its constants", () => {
    // The legacy race, its server copy and its records sail this boat. These
    // are the 2026-11-01 expert review's numbers, unchanged.
    expect(speed(90, 12, 0, CLASSIC_BOAT)).toBeCloseTo(6.77, 2);
    expect(speed(40, 12, 0, CLASSIC_BOAT)).toBeCloseTo(5.22, 2);
    expect(speed(90, 20, 0, CLASSIC_BOAT)).toBeCloseTo(10.6, 2);
    expect(speed(25, 12, 0, CLASSIC_BOAT)).toBeCloseTo(3.75, 2);
    expect(CLASSIC_BOAT.model).toBeUndefined();
    expect(CLASSIC_BOAT.hullDragK).toBe(240);
    expect(CLASSIC_BOAT.jibMinOff).toBe(5);
    expect(getBoatParams()).toEqual(CRUISER_BOAT);
  });
});
