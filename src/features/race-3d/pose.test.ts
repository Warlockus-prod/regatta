import { describe, expect, it } from "vitest";
import { makeStandardCourse, stepBoat, UNITS_PER_KNOT_SECOND, WIND_DIRECTION_BASE } from "@/lib/race-physics";
import { METRES_PER_UNIT, VISUAL_SPEEDUP, headingDelta, nextTarget, racePose, raceRanks, toWorld, type Race3DBoat } from "./pose";

const boat = (heading: number, extra: Partial<Race3DBoat> = {}): Race3DBoat => ({
  id: "p", color: "#fff", pos: { x: 400, y: 1000 }, heading, speed: 5, lapDone: 0, isPlayer: true, ...extra,
});

// Contract: the 3D race shows the race the canvas runs. Sails sit to leeward
// of the same wind, the boat stands where the race put it, and the next mark
// is the one the race counts.
describe("3D race pose", () => {
  it("puts the sails to leeward on both tacks", () => {
    // Wind from the north. Heading NE: wind over the port bow, sails to starboard (+).
    const portTack = racePose(boat(45), WIND_DIRECTION_BASE);
    expect(portTack.boomAngle).toBeGreaterThan(0);
    expect(portTack.jibAngle).toBeGreaterThan(0);
    // Heading NW: wind over the starboard bow, sails to port (-).
    const stbdTack = racePose(boat(315), WIND_DIRECTION_BASE);
    expect(stbdTack.boomAngle).toBeLessThan(0);
    expect(stbdTack.jibAngle).toBeLessThan(0);
  });

  it("eases the sails as the boat bears away, with the race's own trim", () => {
    const sail = (heading: number) => {
      const b = boat(heading, { speed: 0 });
      for (let i = 0; i < 40; i++) stepBoat(b as Parameters<typeof stepBoat>[0], 0.05, WIND_DIRECTION_BASE, 1, { turn: 0 });
      b.heading = heading;
      return Math.abs(racePose(b, WIND_DIRECTION_BASE).boomAngle);
    };
    const close = sail(45);
    const beam = sail(90);
    const run = sail(165);
    expect(close).toBeLessThan(beam);
    expect(beam).toBeLessThan(run);
  });

  it("flogs the sails head to wind and fills them off it", () => {
    expect(racePose(boat(10), WIND_DIRECTION_BASE).luff).toBe(1);
    expect(racePose(boat(60), WIND_DIRECTION_BASE).luff).toBe(0);
  });

  it("places the boat where the race has it and scales the wake to its visual speed", () => {
    const pose = racePose(boat(0, { pos: { x: 100, y: 200 } }), 0);
    expect(pose.travel).toEqual({ x: 100 * METRES_PER_UNIT, z: 200 * METRES_PER_UNIT });
    expect(toWorld({ x: 800, y: 1200 })).toEqual({ x: 480, z: 720 });
    // 1 kn moves the boat UNITS_PER_KNOT_SECOND units a second; the wake drifts at the same pace.
    expect(VISUAL_SPEEDUP * 0.514444).toBeCloseTo(UNITS_PER_KNOT_SECOND * METRES_PER_UNIT, 6);
  });

  it("steers the rudder toward the turn and wraps headings across north", () => {
    expect(racePose(boat(45), 0, 20).rudderAngle).toBeGreaterThan(0);
    expect(racePose(boat(45), 0, -20).rudderAngle).toBeLessThan(0);
    expect(headingDelta(350, 10)).toBe(20);
    expect(headingDelta(10, 350)).toBe(-20);
  });

  it("aims at the windward mark, then the finish line, then nothing", () => {
    const course = makeStandardCourse();
    expect(nextTarget(boat(0, { lapDone: 0 }), course)).toEqual(course.marks[0].pos);
    const finish = nextTarget(boat(0, { lapDone: 1 }), course)!;
    expect(finish.y).toBe(course.finishLine.a.y);
    expect(nextTarget(boat(0, { lapDone: 2 }), course)).toBeNull();
  });

  it("ranks finished boats by time, then the run, then the beat by distance to go", () => {
    const course = makeStandardCourse();
    const mark = course.marks[0].pos;
    const ranks = raceRanks([
      boat(0, { id: "beat-far", pos: { x: mark.x, y: mark.y + 600 } }),
      boat(0, { id: "beat-near", pos: { x: mark.x, y: mark.y + 100 } }),
      boat(0, { id: "run", lapDone: 1, pos: { x: 400, y: 600 } }),
      boat(0, { id: "second-home", lapDone: 2, finishTime: 95 }),
      boat(0, { id: "first-home", lapDone: 2, finishTime: 80 }),
    ], course);
    expect(["first-home", "second-home", "run", "beat-near", "beat-far"].map((id) => ranks.get(id))).toEqual([1, 2, 3, 4, 5]);
  });
});
