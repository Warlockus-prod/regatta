import { describe, expect, it } from "vitest";
import { sailingEnvironmentFrame, sailingHull, trainerChartOrigin } from "./environment-state";
import { METRES_PER_UNIT, racePose } from "@/features/race-3d/pose";
import { RACE_AREA } from "@/data/venues/geometry";

describe("shared sailing environment adapters", () => {
  it("feeds the same travel and true wind into trainer and race water", () => {
    const pose = racePose({ id: "p", pos: { x: 400, y: 600 }, heading: 75, color: "#fff", speed: 6, lapDone: 0 }, 30);
    const race = sailingEnvironmentFrame(pose);
    const trainer = sailingEnvironmentFrame({ travel: { x: 240, z: 360 }, wind: { from: 30, knots: 12 }, heading: 75 });
    expect(race).toEqual(trainer);
    expect(race.flow.x).toBeCloseTo(-0.5);
    expect(race.flow.z).toBeCloseTo(Math.sqrt(3) / 2);
  });

  it("keeps world waves in phase when the boat turns, and keeps zero wind quiet", () => {
    const pose = { travel: { x: 7, z: -13 }, wind: { from: 90, knots: 0 } };
    const a = sailingEnvironmentFrame({ ...pose, heading: 0 });
    const b = sailingEnvironmentFrame({ ...pose, heading: 180 });
    expect(a).toEqual(b);
    expect(a.windiness).toBe(0);
    expect(a.travel).toEqual(pose.travel);
  });

  it("centres the trainer in the same venue without offsetting its wave coordinates", () => {
    expect(trainerChartOrigin(RACE_AREA, METRES_PER_UNIT)).toEqual({ x: 240, z: 360 });
    expect(sailingEnvironmentFrame({ travel: { x: 0, z: 0 } }).travel).toEqual({ x: 0, z: 0 });
    expect(sailingHull(null)).toMatchObject({ travel: { x: 0, z: 0 }, heading: 90, speedKn: 0 });
  });

  it("rejects invalid renderer input without propagating NaN into the shaders", () => {
    expect(sailingEnvironmentFrame({ travel: { x: NaN, z: Infinity }, wind: { from: NaN, knots: Infinity } }))
      .toEqual(sailingEnvironmentFrame(null));
  });
});
