import { describe, expect, it } from "vitest";
import { LEGACY_RACE_CONTEXT, PHYSICAL_RACE_EMISSION_ENABLED, PHYSICAL_RACE_PROFILES, physicalRaceContext, type PhysicalRaceContext } from "./race-context";
import { physicalCourseDefinition, physicalCourseWaterBounds } from "./race-courses";
import { PHYSICAL_RACE_BOAT, stepPhysicalBoat, type PhysicalRaceInput, type PhysicalRaceStepOptions } from "./race-physical-motion";
import { stepBoat, stepRaceBoatForces, type RaceBoat } from "./race-physics";
import { KNOT_METRES_PER_SECOND } from "./sailing-kinematics";

const context = physicalRaceContext("short");
const dt = 1 / 30;
const mkBoat = (heading = 90, speed = 3): RaceBoat => ({
  id: "test", name: "Test", color: "cyan", pos: { x: 400, y: 600 }, heading, speed, lapDone: 0,
});
const helm = (rudder = 0, lowSpeedAssist = false): PhysicalRaceInput => ({ steering: { mode: "helm", rudder, lowSpeedAssist } });

describe("explicit physical race movement", () => {
  it.each(PHYSICAL_RACE_PROFILES)("uses integrated knots and real metres in %s", profile => {
    for (const heading of [45, 90, 150]) {
      const boat = mkBoat(heading, 4);
      let actualMetres = 0, expectedMetres = 0;
      for (let i = 0; i < 300; i++) {
        const motion = stepPhysicalBoat(boat, dt, 0, 1, helm(), physicalRaceContext(profile));
        expect(motion).not.toBeNull();
        actualMetres += Math.hypot(motion!.to.x - motion!.from.x, motion!.to.y - motion!.from.y) * context.metresPerUnit;
        expectedMetres += boat.speed * .514444 * dt;
      }
      expect(actualMetres).toBeCloseTo(expectedMetres, 10);
      expect(actualMetres).toBeGreaterThan(15);
    }
  });

  it.each([0, 90, 180, 270])("converts compass heading %i and actual leeway to east/south", heading => {
    const boat = mkBoat(heading);
    const motion = stepPhysicalBoat(boat, dt, heading - 90, 1, helm(), context)!;
    const distance = boat.speed * .514444 * dt;
    const angle = (boat.heading + boat.physics!.leeway) * Math.PI / 180;
    expect((motion.to.x - motion.from.x) * .6).toBeCloseTo(Math.sin(angle) * distance, 12);
    expect((motion.to.y - motion.from.y) * .6).toBeCloseTo(-Math.cos(angle) * distance, 12);
  });

  it("uses the same 22 degree helm law with a physical, rather than accelerated, turn radius", () => {
    const physical = mkBoat(90, 4), legacy = structuredClone(physical);
    const motion = stepPhysicalBoat(physical, dt, 0, 1, helm(1), context)!;
    stepBoat(legacy, dt, 0, 1, { turn: 1 });
    expect(physical.heading).toBeCloseTo(90 + 22 * dt, 12);
    expect(physical.heading).toBe(legacy.heading);
    // The same force step on the metric race's boat, without the turn: the
    // cruiser profile charges the turn its lateral-force drag (ADR-0021).
    const straight = mkBoat(90, 4);
    straight.heading = physical.heading;
    stepRaceBoatForces(straight, dt, 0, 1, { turn: 0 }, {}, PHYSICAL_RACE_BOAT);
    expect(physical.physics!.boatSpeed).toBeLessThan(straight.physics!.boatSpeed);
    const p = Math.hypot(motion.to.x - motion.from.x, motion.to.y - motion.from.y);
    const l = Math.hypot(legacy.pos.x - 400, legacy.pos.y - 600);
    const turn = 22 * dt * Math.PI / 180;
    const physicalRadiusMetres = p * .6 / (2 * Math.sin(turn / 2));
    const legacyRadiusMetres = l * .6 / (2 * Math.sin(turn / 2));
    // The two boats now sail different profiles (ADR-0021), so the ratio is
    // the scale ratio times the ratio of the speeds they made this step.
    expect(legacyRadiusMetres / physicalRadiusMetres).toBeCloseTo(8 * .6 / .514444 * legacy.speed / physical.speed, 10);
    expect(physicalRadiusMetres).toBeLessThan(7);
  });

  it("uses previous speed for authority and makes low-speed assistance explicit", () => {
    const off = mkBoat(45, 0), on = structuredClone(off);
    stepPhysicalBoat(off, dt, 0, 1, helm(1, false), context);
    stepPhysicalBoat(on, dt, 0, 1, helm(1, true), context);
    expect(off.heading).toBe(45);
    expect(on.heading).toBeCloseTo(45 + 22 * .12 * dt, 12);
    expect(off.speed).toBeGreaterThan(0);
  });

  it.each([[355, 5, 356.5], [5, 355, 3.5], [90, 90.5, 90.5]])("course assist approaches %i -> %i at 45 degrees/second without overshoot", (from, target, next) => {
    const boat = mkBoat(from, 0);
    stepPhysicalBoat(boat, dt, 0, 1, { steering: { mode: "course-assist", heading: target } }, context);
    expect(boat.heading).toBeCloseTo(next, 12);
  });

  it.each([true, false])("keeps the bot crew's forces, trim and non-compounding handicap equal to the shared race force step (autoTrim=%s)", autoTrim => {
    for (const heading of [45, 90, 150]) {
      const physical = mkBoat(heading, 3), legacy = structuredClone(physical);
      const trim = { mainSheet: .7, jibSheet: .5, mainTwist: .3, jibTwist: .4, reef: .2, jibFurl: .1, jibSide: 1 as const };
      const opts = { speedMul: .85, windStrengthMul: 1.2 };
      for (let i = 0; i < 120; i++) {
        const gust = 1 + .08 * Math.sin(i / 30);
        stepPhysicalBoat(physical, dt, 8, gust, { ...helm(), autoTrim, trim }, context, { ...opts, rigTransfer: false });
        // The same force step the legacy race uses, on the metric race's boat.
        stepRaceBoatForces(legacy, dt, 8, gust, { turn: 0, autoTrim, trim }, opts, PHYSICAL_RACE_BOAT);
        expect(physical.physics).toEqual(legacy.physics);
        expect(physical.trim).toEqual(legacy.trim);
        expect(physical.trimClock).toBe(legacy.trimClock);
        expect(physical.speed).toBe(legacy.speed);
      }
    }
  });

  it.each(PHYSICAL_RACE_PROFILES)("keeps the same metric hull clearance and excludes boundary recovery in %s", profile => {
    const boat = mkBoat(0, 0); boat.pos = { x: -3, y: 1204 };
    const c = physicalCourseDefinition(profile);
    const margin = (c.hardware.boatDiameterMetres / 2 + c.hardware.clearanceBufferMetres) / .6;
    const motion = stepPhysicalBoat(boat, dt, 0, 0, helm(), c.context)!;
    expect(motion.from).toEqual({ x: margin, y: 1200 - margin });
    expect(motion.to).toEqual(motion.from);
    expect(boat.pos).toEqual(motion.to);
    boat.pos.x += 100; boat.pos.y -= 100;
    expect(motion.to).toEqual(motion.from);
    expect(Object.isFrozen(motion) && Object.isFrozen(motion.from) && Object.isFrozen(motion.to)).toBe(true);
  });

  it("slides along the water bound with an honest tangential velocity and records the mid-tick bend", () => {
    // ADR-0015 point 4: the bound removes only its normal component. A boat
    // sailing WNW into the west bound keeps all of its northward travel.
    const water = physicalCourseWaterBounds("short");
    const boat = mkBoat(300, 6); boat.pos = { x: water.minX + .05, y: 600 };
    const expected = (b: RaceBoat) => {
      const angle = (b.heading + b.physics!.leeway) * Math.PI / 180, d = b.speed * .514444 * dt / .6;
      return { dx: Math.sin(angle) * d, dy: -Math.cos(angle) * d };
    };
    const first = stepPhysicalBoat(boat, dt, 0, 1, helm(), context)!, free = expected(boat);
    expect(free.dx).toBeLessThan(-.05); // the free travel would leave the water
    expect(first.to.x).toBe(water.minX);
    expect(first.to.y - first.from.y).toBeCloseTo(free.dy, 12);
    expect(first.path).toHaveLength(1);
    const t = (water.minX - first.from.x) / free.dx;
    expect(first.path![0].x).toBe(water.minX);
    expect(first.path![0].y).toBeCloseTo(first.from.y + free.dy * t, 12);
    expect(Object.isFrozen(first.path) && Object.isFrozen(first.path![0])).toBe(true);
    // Pinned at the bound: no bend (it would sit at the start), and the next
    // ticks keep the full tangential travel instead of freezing.
    for (let i = 0; i < 30; i++) {
      const next = stepPhysicalBoat(boat, dt, 0, 1, helm(), context)!, step = expected(boat);
      expect(next.from.x).toBe(water.minX); expect(next.to.x).toBe(water.minX);
      expect(next.path).toBeUndefined();
      expect(next.to.y - next.from.y).toBeCloseTo(step.dy, 12);
      expect(next.to.y).toBeLessThan(next.from.y);
    }
    // Open water: one straight segment, no path key at all.
    expect("path" in stepPhysicalBoat(mkBoat(300, 6), dt, 0, 1, helm(), context)!).toBe(false);
  });

  it("records both bends, in order, when a boat runs into a water corner", () => {
    const water = physicalCourseWaterBounds("short");
    const boat = mkBoat(315, 8); boat.pos = { x: water.minX + .03, y: water.minY + .09 };
    const motion = stepPhysicalBoat(boat, dt, 0, 1, helm(), context)!;
    expect(motion.to).toEqual({ x: water.minX, y: water.minY });
    expect(motion.path).toHaveLength(1); // the second bend is the corner itself, the end point
    expect(motion.path![0].x).toBe(water.minX);
    expect(motion.path![0].y).toBeGreaterThan(water.minY);
  });

  it.each([undefined, null, LEGACY_RACE_CONTEXT, { ...context, geometryRevision: 2 }, { ...context, profile: "future" }, { ...context, metresPerUnit: 1 }])("rejects missing, legacy or unknown explicit context without a mutation", raw => {
    const boat = mkBoat(), before = structuredClone(boat);
    expect(stepPhysicalBoat(boat, dt, 0, 1, helm(), raw as PhysicalRaceContext)).toBeNull();
    expect(boat).toEqual(before);
  });

  it.each([0, -1, NaN, Infinity])("rejects invalid dt=%s before a mutation", delta => {
    const boat = mkBoat(), before = structuredClone(boat);
    expect(stepPhysicalBoat(boat, delta, 0, 1, helm(), context)).toBeNull(); expect(boat).toEqual(before);
  });

  it.each([null, { steering: { mode: "helm", rudder: NaN, lowSpeedAssist: false } }, { steering: { mode: "helm", rudder: 0 } }, { steering: { mode: "course-assist", heading: Infinity } }, { steering: { mode: "future", heading: 0 } }, { ...helm(), trim: { mainSheet: NaN } }, { ...helm(), trim: { jibSide: 3 } }, { ...helm(), autoTrim: "false" }])("rejects invalid steering/trim without partial updates", input => {
    const boat = mkBoat(), before = structuredClone(boat);
    expect(stepPhysicalBoat(boat, dt, 0, 1, input as PhysicalRaceInput, context)).toBeNull(); expect(boat).toEqual(before);
  });

  it.each([{ speedMul: NaN }, { windStrengthMul: Infinity }, { windStrengthMul: -1 }, null])("rejects invalid options before changing heading or forces", opts => {
    const boat = mkBoat(), before = structuredClone(boat);
    expect(stepPhysicalBoat(boat, dt, 0, 1, helm(1), context, opts as PhysicalRaceStepOptions)).toBeNull(); expect(boat).toEqual(before);
  });

  it("rejects corrupt motion/previous trim and nonfinite wind before any update", () => {
    for (const mutate of [(b: RaceBoat) => { b.pos.x = NaN; }, (b: RaceBoat) => { b.speed = -1; }, (b: RaceBoat) => { b.trimClock = Infinity; }]) {
      const boat = mkBoat(); mutate(boat); const before = structuredClone(boat);
      expect(stepPhysicalBoat(boat, dt, 0, 1, helm(), context)).toBeNull(); expect(boat).toEqual(before);
    }
    const valid = mkBoat(); stepPhysicalBoat(valid, dt, 0, 1, helm(), context);
    valid.trim!.reef = NaN; const before = structuredClone(valid);
    expect(stepPhysicalBoat(valid, dt, 0, 1, helm(), context)).toBeNull(); expect(valid).toEqual(before);
    for (const [dir, gust] of [[NaN, 1], [0, Infinity], [0, -1]]) {
      const boat = mkBoat(), copy = structuredClone(boat);
      expect(stepPhysicalBoat(boat, dt, dir, gust, helm(), context)).toBeNull(); expect(boat).toEqual(copy);
    }
  });

  it("does not enable physical emission or infer a new live default", () => {
    expect(KNOT_METRES_PER_SECOND).toBe(.514444);
    expect(PHYSICAL_RACE_EMISSION_ENABLED).toBe(false);
    const legacy = mkBoat(); stepBoat(legacy, dt, 0, 1, { turn: 0 });
    expect(Math.hypot(legacy.pos.x - 400, legacy.pos.y - 600)).toBeCloseTo(legacy.speed * 8 * dt, 12);
  });
});
