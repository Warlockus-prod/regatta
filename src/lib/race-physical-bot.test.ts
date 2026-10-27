import { expect, it } from "vitest";
import { avoidPhysicalBotHeading, physicalBotRudder, physicalBotTrajectory, planPhysicalBot, type PhysicalBotState } from "./race-physical-bot";
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

it("keeps a temporary obstruction-clearing luff consistent across the close-hauled numeric boundary", () => {
  const b = { ...boat(), pos: { x: 270, y: 1080 }, heading: 90 };
  const context = physicalRaceContext("short"), course = makePhysicalRaceCourse("short");
  const choose = (heading: number) => avoidPhysicalBotHeading(b, [], heading, context, course,
    { version: 1, profile: "short", tick: 1, lap: 0 });
  const chosen = choose(45);
  expect(chosen).toBeLessThan(45);
  for (const delta of [-1e-11, 1e-11]) expect(choose(45 + delta)).toBeCloseTo(chosen, 8);
  const path = physicalBotTrajectory(b, chosen, context.metresPerUnit);
  const d = physicalCourseDefinition("short");
  for (const mark of course.marks) for (const point of path) {
    const gap = Math.hypot(point.x - mark.pos.x * context.metresPerUnit, point.y - mark.pos.y * context.metresPerUnit)
      - mark.radius * context.metresPerUnit - d.hardware.boatDiameterMetres / 2 - d.hardware.clearanceBufferMetres;
    expect(gap).toBeGreaterThanOrEqual(0);
  }
});

it("keeps a rearward turn stable with weak steerage and releases it at full shared helm authority", () => {
  const context = physicalRaceContext("short"), course = makePhysicalRaceCourse("short");
  const choose = (speed: number) => {
    const b = { ...boat(), pos: { x: 400, y: 700 }, heading: 180, speed };
    const memory: PhysicalBotState = { version: 1, profile: "short", tick: 1, lap: 0, turnSide: 1 };
    const target = avoidPhysicalBotHeading(b, [], 45, context, course, memory);
    return { turn: physicalBotRudder(b.heading, target), memory };
  };
  expect(choose(2).turn).toBeGreaterThan(0);
  const full = choose(4);
  expect(full.turn).toBeLessThan(0); expect(full.memory.turnSide).toBeUndefined();
});
