import { describe, expect, it } from "vitest";
import baseline from "./race-legacy-motion.fixture.json";
import { stepBoat, type RaceBoat } from "./race-physics";

/** Captured before extracting the force boundary from frozen68 source f7.
 * This is an independent legacy reference, not a newly generated server copy. */
describe("unchanged pre-physical legacy trajectories", () => {
  it.each(baseline.rows)("keeps $heading/$steering/autoTrim=$autoTrim", row => {
    const boat: RaceBoat = { id: "baseline", name: "Baseline", color: "#fff", pos: { x: 400, y: 600 }, heading: row.heading, speed: 3, lapDone: 0 };
    const steering = row.steering as "legacy" | "responsive";
    for (let i = 0; i < baseline.steps; i++) {
      stepBoat(boat, baseline.dt, 8, 1 + .08 * Math.sin(i / 30), {
        turn: i < 60 ? .4 : i < 120 ? -.25 : 0,
        autoTrim: row.autoTrim,
        trim: row.autoTrim ? { reef: .2, jibFurl: .1 } : { mainSheet: .7, jibSheet: .5, mainTwist: .3, jibTwist: .4, reef: .2, jibFurl: .1, jibSide: 1 },
      }, { speedMul: .85, windStrengthMul: 1.2, steering });
    }
    expect(boat.heading).toBeCloseTo(row.expected.heading, 12);
    expect(boat.speed).toBeCloseTo(row.expected.speed, 12);
    expect(boat.pos.x).toBeCloseTo(row.expected.pos.x, 12);
    expect(boat.pos.y).toBeCloseTo(row.expected.pos.y, 12);
    expect(boat.trimClock).toBe(row.expected.trimClock);
    expect(boat.trim).toEqual(row.expected.trim);
    // Mac and Linux disagree in the last few bits of heel/leeway here
    // (observed maximum about5e-15). Keep all other fields exact and these
    // two numeric fields within the existing12-decimal trajectory precision.
    const { heel, leeway, ...physics } = boat.physics!;
    const { heel: expectedHeel, leeway: expectedLeeway, ...expectedPhysics } = row.expected.physics;
    expect(physics).toEqual(expectedPhysics);
    expect(heel).toBeCloseTo(expectedHeel, 12);
    expect(leeway).toBeCloseTo(expectedLeeway, 12);
  });
});
