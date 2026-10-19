import { describe, expect, it } from "vitest";
import {
  RUDDER_DEAD_ZONE_DEG,
  angleDelta,
  applyCourseDelta,
  applyHeadingDelta,
  rudderToWheelAngle,
  ticksCrossed,
  wheelAngleToRudder,
  wheelToCourseDelta,
  wheelToEaseDelta,
} from "./mapping";

// Contracts from the approved concept (docs/design/trainer-controls-concept.md, section 4):
// one helm turn = 90 degrees of course; one turn either way = rudder stop;
// one sheet-wheel turn = 25% of the sheet, clockwise sheets in like a winch.
describe("wheel mappings", () => {
  it("one full helm turn is 90 degrees of course, scaled by sensitivity", () => {
    expect(wheelToCourseDelta(360)).toBe(90);
    expect(wheelToCourseDelta(-360)).toBe(-90);
    expect(wheelToCourseDelta(360, 0.5)).toBe(45);
    expect(wheelToCourseDelta(360, 2)).toBe(180);
  });

  it("the rudder has a small dead zone and stops at one turn", () => {
    expect(wheelAngleToRudder(RUDDER_DEAD_ZONE_DEG / 2)).toBe(0);
    expect(wheelAngleToRudder(360)).toBe(1);
    expect(wheelAngleToRudder(-360)).toBe(-1);
    expect(wheelAngleToRudder(720)).toBe(1);
    expect(wheelAngleToRudder(185)).toBeCloseTo(0.5, 5);
  });

  it("rudder and wheel angle round-trip", () => {
    for (const r of [-1, -0.4, 0, 0.25, 0.9, 1]) expect(wheelAngleToRudder(rudderToWheelAngle(r))).toBeCloseTo(r, 9);
  });

  it("a clockwise sheet-wheel turn sheets in by a quarter of the travel", () => {
    expect(wheelToEaseDelta(360)).toBeCloseTo(-0.25, 9);
    expect(wheelToEaseDelta(-720)).toBeCloseTo(0.5, 9);
    expect(wheelToEaseDelta(360, 2)).toBeCloseTo(-0.5, 9);
  });

  it("pointer angle deltas take the short way across the 180 degree seam", () => {
    expect(angleDelta(170, -170)).toBe(20);
    expect(angleDelta(-170, 170)).toBe(-20);
    expect(angleDelta(10, 30)).toBe(20);
  });

  it("ticks count step boundaries crossed, in both directions", () => {
    expect(ticksCrossed(0.31, 0.34, 0.05)).toBe(0);
    expect(ticksCrossed(0.34, 0.36, 0.05)).toBe(1);
    expect(ticksCrossed(0.36, 0.14, 0.05)).toBe(5); // 0.35, 0.30, 0.25, 0.20, 0.15
    expect(ticksCrossed(4, 11, 5)).toBe(2);
  });
});

describe("Trainer course from the wheel", () => {
  it("bow to starboard on starboard tack heads up, on port tack bears away", () => {
    expect(applyCourseDelta(90, "starboard", 10)).toEqual({ twa: 80, tack: "starboard", crossed: null });
    expect(applyCourseDelta(90, "port", 10)).toEqual({ twa: 100, tack: "port", crossed: null });
  });

  it("turning through the wind is a tack", () => {
    const r = applyCourseDelta(5, "starboard", 15);
    expect(r).toEqual({ twa: 10, tack: "port", crossed: "tack" });
  });

  it("turning through dead downwind is a gybe", () => {
    const r = applyCourseDelta(175, "starboard", -10);
    expect(r.tack).toBe("port");
    expect(r.twa).toBeCloseTo(175, 9);
    expect(r.crossed).toBe("gybe");
  });

  it("Basics heading wraps around north", () => {
    expect(applyHeadingDelta(350, 20)).toBe(10);
    expect(applyHeadingDelta(5, -10)).toBe(355);
  });
});
