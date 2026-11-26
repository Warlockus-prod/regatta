import { describe, expect, it } from "vitest";
import { nearestOnSegment, timeToLine } from "./race-line-time";

// Contract: the distance is to the nearest point of the line segment, the time
// uses only the speed towards that point, and a boat sailing away or along
// the line has no time. Three approaches (D1): square on, at 45 deg, past an end.
const A = { x: -100, y: 0 }, B = { x: 100, y: 0 };

describe("time to the line", () => {
  it("square on: distance over speed", () => {
    const t = timeToLine({ x: 0, y: 50 }, 0, 5, A, B); // heading north (-y), towards the line
    expect(t.distance).toBeCloseTo(50, 9);
    expect(t.closing).toBeCloseTo(5, 9);
    expect(t.seconds).toBeCloseTo(10, 9);
  });
  it("at 45 degrees only the closing part of the speed counts", () => {
    const t = timeToLine({ x: 0, y: 50 }, 45, 5, A, B);
    expect(t.closing).toBeCloseTo(5 * Math.SQRT1_2, 9);
    expect(t.seconds).toBeCloseTo(50 / (5 * Math.SQRT1_2), 9);
  });
  it("past an end the nearest point is the end of the line", () => {
    expect(nearestOnSegment({ x: 160, y: 80 }, A, B)).toEqual({ x: 100, y: 0 });
    const t = timeToLine({ x: 160, y: 80 }, 0, 4, A, B);
    expect(t.distance).toBeCloseTo(100, 9);
    expect(t.seconds).toBeCloseTo(100 / (4 * 0.8), 9);
  });
  it("sailing away or along the line: no time", () => {
    expect(timeToLine({ x: 0, y: 50 }, 180, 5, A, B).seconds).toBeNull();
    expect(timeToLine({ x: 0, y: 50 }, 90, 5, A, B).seconds).toBeNull();
    expect(timeToLine({ x: 0, y: 50 }, 0, 0, A, B).seconds).toBeNull();
  });
  it("on the line: zero", () => {
    expect(timeToLine({ x: 10, y: 0 }, 0, 3, A, B)).toEqual({ distance: 0, closing: 3, seconds: 0 });
  });
});
