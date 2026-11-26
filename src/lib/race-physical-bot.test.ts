import { describe, expect, it } from "vitest";
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
    for (const { pos } of physicalFleetSpawns(5)) for (const speed of [0, 4, 8]) for (const ccw of [false, true]) {
      // 30 units (18 m) above the line at each spawn's x, as before the M5 echelon.
      const b = { ...boat(), pos: { x: pos.x, y: course.startLine.a.y - 30 }, speed };
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

// M5 step 4 (ADR-0015 point 5) contract: a bot in irons (under 1 kn inside
// 35 deg of the wind) or pinned by a hull (under 1.5 kn with a hull centre
// within 13.5 m) commits after 1.5 s to the wind +- 75 deg, away from that
// hull, and holds it 4 s; a boat that is sailing is never taken over.
describe("irons and pin escape", () => {
  const context = physicalRaceContext("short"), course = makePhysicalRaceCourse("short");
  /** Calls the avoidance once per 30 Hz tick with a fixed boat; returns the heading of each tick. */
  function steer(b: RaceBoat, ticks: number, planned: (tick: number) => number, contactNormal: { x: number; y: number } | null = null) {
    const memory: PhysicalBotState = { version: 1, profile: "short", tick: 0, lap: 0 };
    const headings: number[] = [];
    for (let tick = 1; tick <= ticks; tick++) {
      memory.tick = tick;
      headings.push(avoidPhysicalBotHeading(b, [], planned(tick), context, course, memory, { windDir: 0, contactNormal }));
    }
    return { headings, memory };
  }
  const first = (headings: number[], heading: number) => headings.findIndex(h => Math.abs(h - heading) < 1e-9) + 1;

  it("takes a bot at 0.2 kn and TWA 3 deg out of irons within 3 s and holds the bear-away 4 s", () => {
    const b = { ...boat(), pos: { x: 400, y: 700 }, heading: 3, speed: .2 };
    const { headings } = steer(b, 300, () => 3);
    const commit = first(headings, 75);
    expect(commit).toBeGreaterThan(0);
    expect(commit / 30).toBeLessThanOrEqual(3);
    expect(commit).toBe(45);
    // Held without re-evaluation for 4 s, although the route still says 3 deg.
    expect(headings.slice(commit - 1, commit - 1 + 120).every(h => h === 75)).toBe(true);
    // Then the route again on the very first tick after the 4 s: the escape's
    // predictive hold ends with the escape, not half a second later.
    expect(headings[commit - 1 + 120]).toBe(3);
    expect(headings.slice(0, commit - 1).every(h => Math.abs(h - 75) > 1e-9)).toBe(true);
  });

  it("bears a bot pinned at TWA 45 by a stationary hull away from that hull, not along its own tack", () => {
    // The other hull lies east, so the away normal points west (-x). The
    // tack-side away heading (285) lies through the wind, so the slow bot
    // bears away and gybes to 210 instead (west of south, opening from the hull).
    const b = { ...boat(), pos: { x: 400, y: 700 }, heading: 45, speed: .5 };
    const pinned = steer(b, 120, () => 45, { x: -1, y: 0 });
    expect(first(pinned.headings, 210)).toBe(45);
    expect(pinned.headings).not.toContain(75); expect(pinned.headings).not.toContain(285);
    // The same hull to the west: away is east, which is also its own tack.
    expect(first(steer(b, 120, () => 45, { x: 1, y: 0 }).headings, 75)).toBe(45);
  });

  it("bears a slow bot away (gybing) instead of tacking when away from the hull lies only through the wind", () => {
    // Hull ahead to the north-east (normal south-west) at heading 45: away on
    // the tack side is 285, through the wind at a few deg/s. Bearing away to
    // 210 opens more from the hull and never crosses the wind.
    const b = { ...boat(), pos: { x: 400, y: 700 }, heading: 45, speed: .5 };
    const ahead = steer(b, 120, () => 45, { x: -Math.SQRT1_2, y: Math.SQRT1_2 });
    expect(first(ahead.headings, 210)).toBe(45);
    expect(ahead.headings).not.toContain(285);
    // Hull to the south-east (normal north-west): no bear-away heading opens
    // from it either, so the bot keeps its own tack (75) rather than tacking
    // through the wind at a few deg/s; the sliding contact takes it clear.
    const astern = steer(b, 120, () => 45, { x: -Math.SQRT1_2, y: -Math.SQRT1_2 });
    expect(first(astern.headings, 75)).toBe(45);
    expect(astern.headings).not.toContain(285);
  });

  it("never takes over a bot sailing at 4 kn and TWA 30 deg", () => {
    const b = { ...boat(), pos: { x: 400, y: 700 }, heading: 30, speed: 4 };
    const { headings, memory } = steer(b, 600, () => 30);
    expect(headings.every(h => Math.abs(h - 75) > 1e-9 && Math.abs(h - 285) > 1e-9)).toBe(true);
    expect(memory.escape).toBeUndefined(); expect(memory.stall).toBe(0);
  });

  it("is deterministic for equal inputs", () => {
    const b = { ...boat(), pos: { x: 400, y: 700 }, heading: 1, speed: .3 };
    const run = () => steer(b, 240, tick => tick % 7, { x: .6, y: -.8 }).headings;
    expect(run()).toEqual(run());
    // Head to wind with no contact the side comes from the boat id, not chance.
    const still = { ...b, heading: 0 };
    const side = steer(still, 60, () => 0).headings[44];
    expect([75, 285]).toContain(side);
    expect(steer(still, 60, () => 0).headings[44]).toBe(side);
  });
});

it("coasts the predicted speed down inside the no-go zone and keeps it outside", () => {
  const b = { ...boat(), pos: { x: 400, y: 700 }, heading: 0, speed: 4 };
  const coast = { windDir: 0, noGoTwaDeg: 35, tauSeconds: 12 };
  const step = (p: { x: number; y: number }[], i: number) => Math.hypot(p[i].x - p[i - 1].x, p[i].y - p[i - 1].y);
  const irons = physicalBotTrajectory(b, 0, .6, undefined, coast);
  // 12 s head to wind: the last half-second covers exp(-11.5/12) of the first.
  expect(step(irons, 23) / step(irons, 1)).toBeCloseTo(Math.exp(-22 * .5 / 12), 6);
  const reach = physicalBotTrajectory({ ...b, heading: 90 }, 90, .6, undefined, coast);
  expect(step(reach, 23)).toBeCloseTo(step(reach, 1), 9);
  expect(physicalBotTrajectory(b, 0, .6)).not.toEqual(irons);
});
