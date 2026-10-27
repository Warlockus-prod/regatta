import { expect, it } from "vitest";
import { physicalBotTrajectory } from "./race-physical-bot";
import type { RaceBoat } from "./race-physics";

const boat = (): RaceBoat => ({ id: "p", name: "p", color: "white", pos: { x: 400, y: 1080 }, heading: 0, speed: 4, lapDone: 0 });

it("predicts reachable helm turns instead of instantly replacing the velocity direction", () => {
  const b = boat(), before = structuredClone(b);
  const path = physicalBotTrajectory(b, 90, .6);
  expect(path).toHaveLength(24);
  expect(path[0].x - b.pos.x * .6).toBeGreaterThan(0);
  expect(path[0].x - b.pos.x * .6).toBeLessThan(.3);
  expect(b.pos.y * .6 - path[0].y).toBeGreaterThan(.9);
  expect(b).toEqual(before);
});

it("keeps human course assist distinct from the bot's physical helm", () => {
  const b = boat();
  const helm = physicalBotTrajectory(b, 90, .6)[0];
  const assisted = physicalBotTrajectory(b, { mode: "course-assist", heading: 90 }, .6)[0];
  expect(assisted.x).toBeGreaterThan(helm.x); expect(assisted.y).toBeGreaterThan(helm.y);
});

it("uses actual metres per knot rather than the legacy world-speed multiplier", () => {
  const b = { ...boat(), heading: 90, speed: 1 };
  const oneSecond = physicalBotTrajectory(b, 90, .6)[1];
  expect(oneSecond.x - b.pos.x * .6).toBeCloseTo(.514444, 10);
  expect(oneSecond.y).toBeCloseTo(b.pos.y * .6, 10);
});
