import { expect, it } from "vitest";
import { physicalBotTrajectory, planPhysicalBot, type PhysicalBotState } from "./race-physical-bot";
import { makePhysicalRaceCourse, physicalCourseDefinition, physicalCourseWaterBounds, physicalFleetSpawns } from "./race-courses";
import { physicalRaceContext } from "./race-context";
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

it("predicts the same hull-centre water limit that actual physical movement uses", () => {
  const water = physicalCourseWaterBounds("long");
  const b = { ...boat(), pos: { x: 400, y: water.minY + .1 } };
  const path = physicalBotTrajectory(b, 0, .6, water);
  for (const p of path) expect(p.y).toBeCloseTo(water.minY * .6, 12);
  expect(b.pos.y).toBe(water.minY + .1);
});

it("fits the whole recovery circle between both start endpoints in every profile", () => {
  for (const profile of ["short", "medium", "long"] as const) {
    const context = physicalRaceContext(profile), course = makePhysicalRaceCourse(profile), d = physicalCourseDefinition(profile);
    for (const pos of physicalFleetSpawns(5)) for (const speed of [0, 4, 8]) for (const ccw of [false, true]) {
      const b = { ...boat(), pos: { x: pos.x, y: pos.y - 60 }, speed };
      const memory: PhysicalBotState = { version: 1, profile, tick: 1, lap: 0, dip: { ccw, x: pos.x, r: 70 } };
      const plan = planPhysicalBot(b, course, 0, context, memory);
      expect(plan.path.kind).toBe("circle");
      if (plan.path.kind !== "circle") throw new Error("Missing recovery circle");
      expect(plan.path.radius * context.metresPerUnit).toBeLessThanOrEqual(d.rounding.radiusMetres * 2);
      for (const mark of course.marks.slice(1)) {
        const gap = (Math.hypot(plan.path.center.x - mark.pos.x, plan.path.center.y - mark.pos.y) - plan.path.radius - mark.radius) * context.metresPerUnit;
        expect(gap).toBeGreaterThanOrEqual(d.hardware.boatDiameterMetres / 2 + d.hardware.clearanceBufferMetres - 1e-9);
      }
    }
  }
});
