import { describe, expect, it } from "vitest";
import { guidancePath } from "./guidance";
import { raceGuidance } from "@/lib/race-guidance";
import { calcTWA, makeStandardCourse, type RaceBoat } from "@/lib/race-physics";

const course = makeStandardCourse();
const boat = (heading: number, extra: Partial<RaceBoat> = {}): RaceBoat => ({
  id: "p", name: "Player", color: "#fff", pos: { x: 400, y: 900 }, heading, speed: 5, lapDone: 0, started: true, ...extra,
});

describe("water route presentation", () => {
  it("reaches the current gate using two sailing legs when the target is upwind", () => {
    const player = boat(45);
    const guidance = raceGuidance(player, course, 0);
    const path = guidancePath(player.pos, player.heading, 0, guidance);
    expect(path.length).toBeGreaterThan(20);
    expect(path.length).toBeLessThanOrEqual(80);
    expect(path[0]).toMatchObject(player.pos);
    expect(path.at(-1)).toMatchObject(guidance.target);
    // Straight parts of the route must sail outside the no-go zone, rather
    // than drawing a false direct route to an unreachable upwind target.
    for (let i = 1; i < path.length; i++) {
      if (path[i].turning || path[i - 1].turning) continue;
      const dx = path[i].x - path[i - 1].x;
      const dy = path[i].y - path[i - 1].y;
      if (Math.hypot(dx, dy) < 0.01) continue;
      const heading = Math.atan2(dx, -dy) * 180 / Math.PI;
      expect(Math.abs(calcTWA(heading, 0))).toBeGreaterThanOrEqual(44.9);
    }
    expect(path.some(point => point.turning)).toBe(true);
  });

  it("marks a change of course in yellow, with a blue leg after it", () => {
    const player = boat(20, { lapDone: 1, pos: { x: 200, y: 300 } });
    const guidance = raceGuidance(player, course, 0);
    const path = guidancePath(player.pos, player.heading, 0, guidance);
    expect(path[0].turning).toBe(true);
    expect(path.at(-1)?.turning).toBe(false);
    expect(path.at(-1)).toMatchObject(guidance.target);
  });

  it("hides a completed route and rejects invalid coordinates", () => {
    const player = boat(45, { lapDone: 2 });
    const guidance = raceGuidance(player, course, 0);
    expect(guidancePath(player.pos, player.heading, 0, guidance)).toEqual([]);
    expect(guidancePath({ x: NaN, y: 0 }, 0, 0, { ...guidance, leg: "finish" })).toEqual([]);
  });
});
