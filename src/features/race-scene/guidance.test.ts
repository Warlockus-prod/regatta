import { describe, expect, it } from "vitest";
import { guidancePath, nextTurnIndex } from "./guidance";
import { guidanceToTarget, raceGuidance } from "@/lib/race-guidance";
import { calcTWA, makeStandardCourse, segmentCrossed, type RaceBoat } from "@/lib/race-physics";

const course = makeStandardCourse();
const boat = (heading: number, extra: Partial<RaceBoat> = {}): RaceBoat => ({
  id: "p", name: "Player", color: "#fff", pos: { x: 400, y: 900 }, heading, speed: 5, lapDone: 0, started: true, ...extra,
});

describe("water route presentation", () => {
  it("reaches the current gate using two sailing legs when the target is upwind", () => {
    const player = boat(45);
    const guidance = guidanceToTarget(player, { x: 400, y: 180 }, 0);
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
    const guidance = guidanceToTarget(player, { x: 400, y: 1080 }, 0, 45, "finish");
    const path = guidancePath(player.pos, player.heading, 0, guidance);
    expect(path[0].turning).toBe(true);
    expect(path.at(-1)?.turning).toBe(false);
    expect(path.at(-1)).toMatchObject(guidance.target);
  });

  it("hides a completed route and rejects invalid coordinates", () => {
    const player = boat(45, { lapDone: 2 });
    const guidance = raceGuidance(player, course, 0)!;
    expect(guidancePath(player.pos, player.heading, 0, guidance)).toEqual([]);
    expect(guidancePath({ x: NaN, y: 0 }, 0, 0, { ...guidance, leg: "finish" })).toEqual([]);
  });

  it("draws the actual advisory stadium through all three rounding gates", () => {
    const player = boat(0, { pos: { x: 475, y: 215 }, speed: 3 });
    const guidance = raceGuidance(player, course, 0)!;
    expect(guidance.path).toEqual({ kind: "circle", center: { x: 400, y: 215 }, radius: 75, ccw: true });
    const path = guidancePath(player.pos, player.heading, 0, guidance);
    expect(path[0]).toMatchObject(player.pos);
    expect(path.length).toBeLessThan(80);
    for (const p of path.slice(8)) expect(Math.hypot(p.x - 400, p.y - 215)).toBeCloseTo(75, 8);
    const gates = [
      [{ x: 425, y: 180 }, { x: 495, y: 180 }],
      [{ x: 400, y: 155 }, { x: 400, y: 85 }],
      [{ x: 375, y: 180 }, { x: 305, y: 180 }],
    ];
    for (const [a, b] of gates) expect(path.some((p, i) => i > 0 && segmentCrossed(path[i - 1], p, a, b))).toBe(true);
    expect(path.slice(8).every(p => p.turning)).toBe(true);
  });

  it("shows only the current sailable upwind advice instead of an unreachable straight shortcut", () => {
    const player = boat(45);
    const guidance = raceGuidance(player, course, 0)!;
    const path = guidancePath(player.pos, player.heading, 0, guidance);
    expect(guidance.beating).toBe(true);
    const end = path.at(-1)!;
    expect(Math.hypot(end.x - player.pos.x, end.y - player.pos.y)).toBeCloseTo(100);
    expect(Math.atan2(end.x - player.pos.x, -(end.y - player.pos.y)) * 180 / Math.PI).toBeCloseTo(guidance.suggestedHeading);
    expect(end).not.toMatchObject(guidance.target);
  });
});

describe("next turn point (M2-2)", () => {
  const p = (turning: boolean) => ({ x: 0, y: 0, turning });
  it("marks the middle of the first change of course after the boat's own bend", () => {
    expect(nextTurnIndex([p(true), p(true), p(false), p(false), p(true), p(true), p(true), p(false)])).toBe(5);
    expect(nextTurnIndex([p(false), p(false), p(true), p(true), p(false)])).toBe(2);
  });
  it("has none on a straight leg, on a bend only, or past the drawn count", () => {
    expect(nextTurnIndex([p(false), p(false)])).toBe(-1);
    expect(nextTurnIndex([p(true), p(true), p(false)])).toBe(-1);
    expect(nextTurnIndex([p(false), p(false), p(true)], 2)).toBe(-1);
  });
  it("finds the corner of a two-leg beat to an upwind gate", () => {
    const player = boat(45);
    const guidance = guidanceToTarget(player, { x: 400, y: 180 }, 0);
    const path = guidancePath(player.pos, player.heading, 0, guidance);
    const at = nextTurnIndex(path);
    expect(at).toBeGreaterThan(0);
    expect(path[at].turning).toBe(true);
  });
});
