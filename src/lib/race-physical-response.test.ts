import { describe, expect, it } from "vitest";
import { constrainPhysicalRaceTravel } from "./race-physical-response";
import { physicalRaceContext } from "./race-context";
import { makePhysicalRaceCourse, physicalCourseWaterBounds } from "./race-courses";
import { advancePhysicalRaceProgress } from "./race-physical-progress";
import type { PhysicalRaceMotion } from "./race-physical-motion";
import type { RaceBoat } from "./race-physics";
import { KNOT_METRES_PER_SECOND } from "./sailing-kinematics";

const motion = (x: number, y: number, tx = x, ty = y): PhysicalRaceMotion => ({ from: { x, y }, to: { x: tx, y: ty } });
function frame(motions: readonly PhysicalRaceMotion[] = [motion(400, 700)]) {
  return { context: physicalRaceContext("short"), course: makePhysicalRaceCourse("short"), dt: 1 / 30,
    boats: motions.map((_, i) => ({ id: `b${i}`, lapDone: 0 })), motions: new Map(motions.map((v, i) => [`b${i}`, v])) };
}
describe("coupled physical travel constraints", () => {
  it("stops both swept hulls before they tunnel through each other, preserving the caller", () => {
    const f = frame([motion(350, 700, 450, 700), motion(450, 700, 350, 700)]), before = structuredClone(f);
    const r = constrainPhysicalRaceTravel(f)!;
    expect(r.motions.get("b0")!.to.x).toBeCloseTo(389, 10);
    expect(r.motions.get("b1")!.to.x).toBeCloseTo(411, 10);
    expect(r.contacts).toEqual([expect.objectContaining({ kind: "hull", firstHitFraction: .39 })]);
    expect(r.speedMultipliers.get("b0")).toBeLessThan(1); expect(f).toEqual(before);
  });

  it("owns actual metric impact velocities instead of averaging truncated travel", () => {
    const supplied = { from: { x: 350, y: 700 }, to: { x: 450, y: 700 } };
    const f = frame([supplied, motion(450, 700, 350, 700)]);
    const r = constrainPhysicalRaceTravel(f)!, m = f.context.metresPerUnit;
    expect(r.initialContacts).toEqual([]); expect(r.impacts).toHaveLength(1);
    const hit = r.impacts[0];
    expect(hit.kind).toBe("hull"); if (hit.kind !== "hull") throw new Error("Expected actual hull impact");
    expect(hit.firstHitFraction).toBeCloseTo(.39, 12);
    expect(hit.closingMetresPerSecond).toBeCloseTo(200 * m / f.dt, 10);
    expect(hit.boat.centreMetres).toEqual({ x: 389 * m, y: 700 * m });
    expect(hit.otherBoat.centreMetres).toEqual({ x: 411 * m, y: 700 * m });
    expect(hit.boat.velocityMetresPerSecond).toEqual({ x: 100 * m / f.dt, y: 0 });
    expect(hit.otherBoat.velocityMetresPerSecond).toEqual({ x: -100 * m / f.dt, y: 0 });
    expect(hit.closingMetresPerSecond).toBeGreaterThan(2 * (r.motions.get("b0")!.to.x - 350) * m / f.dt);
    for (const value of [r.impacts, hit, hit.boat, hit.otherBoat, hit.boat.centreMetres,
      hit.boat.velocityMetresPerSecond, hit.otherBoat.centreMetres, hit.otherBoat.velocityMetresPerSecond]) expect(Object.isFrozen(value)).toBe(true);
    const reversed = constrainPhysicalRaceTravel({ ...f, boats: [...f.boats].reverse(), motions: new Map([...f.motions].reverse()) })!;
    expect(reversed.impacts).toEqual(r.impacts);
    supplied.from.x = 1;
    expect(hit.boat.centreMetres.x).toBe(389 * m);
  });

  it("continues an unrelated boat and finds a later encounter with a stopped hull on the same clock", () => {
    const f = frame([motion(350, 700, 450, 700), motion(400, 700), motion(300, 700, 420, 700), motion(600, 600, 610, 600)]);
    const r = constrainPhysicalRaceTravel(f)!;
    expect(r.contacts).toHaveLength(2);
    expect(r.contacts.map(c => c.kind === "hull" && [c.boatId, c.otherBoatId])).toEqual([["b0", "b1"], ["b0", "b2"]]);
    expect(r.contacts[0].firstHitFraction).toBeCloseTo(.28, 10);
    expect(r.contacts[1].firstHitFraction).toBeCloseTo(56 / 120, 10);
    expect(r.motions.get("b2")!.to.x).toBeCloseTo(356, 10);
    expect(r.motions.get("b3")).toEqual(f.motions.get("b3"));
    expect(r.impacts).toHaveLength(2);
    const [first, later] = r.impacts, scale = f.context.metresPerUnit / f.dt;
    expect(first.closingMetresPerSecond).toBeCloseTo(100 * scale, 10);
    expect(later.closingMetresPerSecond).toBeCloseTo(120 * scale, 10);
    expect(later.boatId).toBe("b0"); expect(later.boat.velocityMetresPerSecond).toEqual({ x: 0, y: 0 });
    expect(later.kind).toBe("hull");
    if (later.kind === "hull") expect(later.otherBoat.velocityMetresPerSecond).toEqual({ x: 120 * scale, y: 0 });
  });

  it("captures simultaneous closing velocities before stopping any involved hull", () => {
    const f = frame([motion(350, 700, 450, 700), motion(400, 700), motion(450, 700, 350, 700)]);
    const r = constrainPhysicalRaceTravel(f)!, scale = f.context.metresPerUnit / f.dt;
    expect(r.impacts).toHaveLength(2);
    expect(r.impacts.map(hit => hit.firstHitFraction)).toEqual([.28, .28]);
    for (const hit of r.impacts) expect(hit.closingMetresPerSecond).toBeCloseTo(100 * scale, 10);
    const hit = r.impacts[1];
    expect(hit.kind).toBe("hull"); if (hit.kind !== "hull") throw new Error("Expected actual hull impact");
    expect(hit.boatId).toBe("b1"); expect(hit.boat.velocityMetresPerSecond.x).toBe(0);
    expect(hit.otherBoat.velocityMetresPerSecond.x).toBe(-100 * scale);
  });

  it("separates unknown initial overlap from a subsequent actual closing impact", () => {
    const f = frame([motion(400, 700, 410, 700), motion(410, 700, 400, 700)]);
    const r = constrainPhysicalRaceTravel(f)!;
    expect(r.initialContacts).toEqual([expect.objectContaining({ kind: "hull", firstHitFraction: 0,
      minimumClearanceMetres: -12 * f.context.metresPerUnit })]);
    expect(r.impacts).toHaveLength(1);
    expect(r.impacts[0].firstHitFraction).toBeGreaterThanOrEqual(0);
    expect(r.impacts[0].firstHitFraction).toBeLessThan(1e-7);
    expect(r.impacts[0].closingMetresPerSecond).toBeCloseTo(20 * f.context.metresPerUnit / f.dt, 10);
    expect(r.contacts).toHaveLength(1);
  });

  it("keeps a grazing trajectory and a separating touch free of repeated slowing", () => {
    const f = frame([motion(350, 700, 450, 700), motion(400, 722)]), r = constrainPhysicalRaceTravel(f)!;
    expect(r.motions.get("b0")).toEqual(f.motions.get("b0"));
    expect(r.contacts).toEqual([expect.objectContaining({ firstHitFraction: .5, minimumClearanceMetres: 0 })]);
    expect(r.impacts).toEqual([expect.objectContaining({ kind: "hull", firstHitFraction: .5, closingMetresPerSecond: 0 })]);
    expect([...r.speedMultipliers.values()]).toEqual([1, 1]);
    const escape = frame([motion(400, 700, 390, 700), motion(422, 700, 432, 700)]);
    const escaped = constrainPhysicalRaceTravel(escape)!;
    expect(escaped.initialContacts).toHaveLength(1); expect(escaped.impacts).toEqual([]);
    expect([...escaped.motions.values()]).toEqual([...escape.motions.values()]);
    expect([...escaped.speedMultipliers.values()]).toEqual([1, 1]);
    const resting = constrainPhysicalRaceTravel(frame([motion(400, 700, 400 + 1e-8, 700), motion(422, 700)]))!;
    expect(resting).not.toBeNull(); expect([...resting.speedMultipliers.values()]).toEqual([1, 1]);
  });

  it("stops at actual buoy and committee radii in every profile", () => {
    for (const profile of ["short", "medium", "long"] as const) for (const markIndex of [0, 1, 2]) {
      const f = { ...frame(), context: physicalRaceContext(profile), course: makePhysicalRaceCourse(profile) };
      const mark = f.course.marks[markIndex];
      f.motions.set("b0", motion(mark.pos.x - 30, mark.pos.y, mark.pos.x + 30, mark.pos.y));
      const r = constrainPhysicalRaceTravel(f)!;
      expect(r.motions.get("b0")!.to.x).toBeCloseTo(mark.pos.x - 11 - mark.radius, 9);
      expect(r.contacts).toEqual([expect.objectContaining({ kind: "mark", markIndex })]);
      expect(r.initialContacts).toEqual([]);
      expect(r.impacts).toEqual([expect.objectContaining({ kind: "mark", markIndex,
        closingMetresPerSecond: 60 * f.context.metresPerUnit / f.dt })]);
    }
  });

  it("does not report an intended encounter cancelled by an earlier actual impact", () => {
    const f = frame([motion(330, 700, 450, 700), motion(400, 700), motion(450, 700)]);
    const r = constrainPhysicalRaceTravel(f)!;
    expect(r.contacts).toEqual([expect.objectContaining({ kind: "hull", boatId: "b0", otherBoatId: "b1" })]);
    expect(r.impacts).toEqual([expect.objectContaining({ kind: "hull", boatId: "b0", otherBoatId: "b1" })]);
  });

  it("recovers initial hull/mark overlap without including the push in travelled credit", () => {
    const f = frame(Array.from({ length: 5 }, () => motion(400, 850))), before = structuredClone(f);
    const r = constrainPhysicalRaceTravel(f)!;
    expect(r).not.toBeNull(); expect(r.contacts).toHaveLength(15);
    expect(r.initialContacts).toHaveLength(15); expect(r.impacts).toEqual([]);
    expect(Object.isFrozen(r.initialContacts)).toBe(true);
    for (const [id, travelled] of r.motions) {
      expect(travelled.from).toEqual(travelled.to); expect(travelled.from).not.toEqual(f.motions.get(id)!.from);
    }
    const reversed = constrainPhysicalRaceTravel({ ...f, boats: [...f.boats].reverse() })!;
    expect(reversed.motions).toEqual(r.motions); expect(f).toEqual(before);
  });

  it("keeps coupled hull recovery inside water and clear of committee hardware", () => {
    const f = frame(), water = physicalCourseWaterBounds("short");
    for (const [x, y] of [[water.minX, water.minY], [water.maxX, water.maxY], [f.course.marks[2].pos.x, f.course.marks[2].pos.y]]) {
      const r = constrainPhysicalRaceTravel(frame(Array.from({ length: 5 }, () => motion(x, y))))!;
      expect(r, `water/committee recovery at${x},${y}`).not.toBeNull();
      for (const travelled of r.motions.values()) {
        expect(travelled.to.x).toBeGreaterThanOrEqual(water.minX - 1e-7); expect(travelled.to.x).toBeLessThanOrEqual(water.maxX + 1e-7);
        expect(travelled.to.y).toBeGreaterThanOrEqual(water.minY - 1e-7); expect(travelled.to.y).toBeLessThanOrEqual(water.maxY + 1e-7);
      }
    }
  });

  it("slides a recovered boat along the water bound without an unrecorded final push", () => {
    // ADR-0015: the bound removes only the component along its normal (x here);
    // the tangential travel (y) stays. Before M5 the boat froze at the bound.
    const water = physicalCourseWaterBounds("short"), f = frame([motion(water.minX, 700, 0, 650)]);
    const r = constrainPhysicalRaceTravel(f)!;
    expect(r.motions.get("b0")).toEqual(motion(water.minX, 700, water.minX, 650));
    expect(r.contacts).toEqual([]); expect(r.speedMultipliers.get("b0")).toBe(1);
    expect(r.impacts).toEqual([]);
  });

  it("cannot award a start behind committee hardware or from initial recovery", () => {
    const f = frame([motion(480, 1080, 480, 1020)]), r = constrainPhysicalRaceTravel(f)!;
    const b: RaceBoat = { id: "b0", name: "b0", color: "white", pos: { ...r.motions.get("b0")!.to }, heading: 0, speed: 4, lapDone: 0 };
    expect(advancePhysicalRaceProgress(b, r.motions.get("b0")!, f.context, f.course, 1, true)!.event).toBeNull();
    expect(b.started).toBeUndefined(); expect(r.contacts).toEqual([expect.objectContaining({ kind: "mark", markIndex: 2 })]);
    const recovered = constrainPhysicalRaceTravel(frame([motion(400, 1051), motion(400, 1052)]))!;
    expect(recovered.motions.get("b0")!.to.y).toBeLessThan(1050);
    expect(advancePhysicalRaceProgress(b, recovered.motions.get("b0")!, f.context, f.course, 1, true)!.event).toBeNull();
  });

  it("excludes a finished hull without moving it or blocking another boat", () => {
    const f = frame([motion(350, 700, 450, 700), motion(400, 700)]);
    f.boats[1].lapDone = 2; f.motions.delete("b1");
    const r = constrainPhysicalRaceTravel(f)!;
    expect(r.motions.size).toBe(1); expect(r.motions.get("b0")).toEqual(f.motions.get("b0")); expect(r.contacts).toEqual([]);
    expect(r.initialContacts).toEqual([]); expect(r.impacts).toEqual([]);
  });

  it("rejects malformed or foreign input atomically", () => {
    const f = frame(), before = structuredClone(f);
    for (const invalid of [{ ...f, dt: .1 }, { ...f, context: { ...f.context, profile: "unknown" } },
      { ...f, motions: new Map([["b0", motion(NaN, 700)]]) }, { ...f, boats: [...f.boats, f.boats[0]] }]) {
      expect(constrainPhysicalRaceTravel(invalid as typeof f)).toBeNull();
    }
    expect(f).toEqual(before);
  });
});

// ADR-0015 point 4. Contract: a hull in contact keeps its velocity tangential
// to the contact normal and loses only its own component into the other body;
// the ADR-0004 closing loss is unchanged and no overlap survives a tick.
const KN_UNITS_PER_TICK = KNOT_METRES_PER_SECOND / .6 / 30;
const ADR_0004_FULL_SHARE_TICK = Math.exp(-1.67 / 30);
const along = (x: number, y: number, headingDeg: number, kn: number): PhysicalRaceMotion => {
  const r = headingDeg * Math.PI / 180, d = kn * KN_UNITS_PER_TICK;
  return motion(x, y, x + Math.sin(r) * d, y - Math.cos(r) * d);
};
const travelled = (m: PhysicalRaceMotion) => {
  const points = [m.from, ...(m.path ?? []), m.to];
  return points.slice(1).reduce((sum, p, i) => sum + Math.hypot(p.x - points[i].x, p.y - points[i].y), 0);
};
function assertLegal(f: ReturnType<typeof frame>, r: NonNullable<ReturnType<typeof constrainPhysicalRaceTravel>>) {
  const water = physicalCourseWaterBounds(f.context.profile), ends = [...r.motions.values()].map(v => v.to);
  for (const [i, p] of ends.entries()) {
    expect(p.x).toBeGreaterThanOrEqual(water.minX - 1e-7); expect(p.x).toBeLessThanOrEqual(water.maxX + 1e-7);
    expect(p.y).toBeGreaterThanOrEqual(water.minY - 1e-7); expect(p.y).toBeLessThanOrEqual(water.maxY + 1e-7);
    for (const mark of f.course.marks) expect(Math.hypot(p.x - mark.pos.x, p.y - mark.pos.y)).toBeGreaterThanOrEqual(11 + mark.radius - 1e-7);
    for (const q of ends.slice(i + 1)) expect(Math.hypot(p.x - q.x, p.y - q.y)).toBeGreaterThanOrEqual(22 - 1e-7);
  }
  for (const v of r.motions.values()) expect((v.path ?? []).length).toBeLessThanOrEqual(4);
}

describe("sliding contact (ADR-0015 point 4)", () => {
  it("lets two hulls grinding abeam keep sailing instead of freezing each other", () => {
    // 13.2 m abeam (touching), 5 kn, headings converging 5 degrees each.
    let a = { x: 300, y: 900 }, b = { x: 322, y: 900 }, moved = { a: 0, b: 0 }, contacts = 0;
    const ticks = 5 * 30;
    for (let tick = 0; tick < ticks; tick++) {
      const f = frame([along(a.x, a.y, 5, 5), along(b.x, b.y, -5, 5)]), r = constrainPhysicalRaceTravel(f)!;
      expect(r, `tick ${tick}`).not.toBeNull(); assertLegal(f, r);
      contacts += r.impacts.length;
      moved = { a: moved.a + travelled(r.motions.get("b0")!), b: moved.b + travelled(r.motions.get("b1")!) };
      a = { ...r.motions.get("b0")!.to }; b = { ...r.motions.get("b1")!.to };
    }
    const free = ticks * 5 * KN_UNITS_PER_TICK;
    expect(contacts).toBeGreaterThan(100); // they really grind the whole time
    expect(moved.a / free).toBeGreaterThanOrEqual(.9);
    expect(moved.b / free).toBeGreaterThanOrEqual(.9);
    // Only the 5 degree component into the other hull is lost: cos 5 = 0.996.
    expect(moved.a / free).toBeCloseTo(Math.cos(5 * Math.PI / 180), 2);
  });

  it.each([
    { order: "rear first (front is the impact's other body)", frontFirst: false },
    { order: "front first (front is the impact's own body)", frontFirst: true },
  ])("leaves the front boat of a 1 kn rear-end bit-identical to free travel, $order", ({ frontFirst }) => {
    // Ids decide which body is hit.a; the result must not depend on them.
    const front = along(400, 677.99, 0, 4), rear = along(400, 700, 0, 5);
    const f = frame(frontFirst ? [front, rear] : [rear, front]), r = constrainPhysicalRaceTravel(f)!;
    const frontId = frontFirst ? "b0" : "b1", rearId = frontFirst ? "b1" : "b0";
    expect(r.impacts).toHaveLength(1);
    expect(r.impacts[0].boatId).toBe("b0");
    expect(r.impacts[0].closingMetresPerSecond).toBeCloseTo(KNOT_METRES_PER_SECOND, 10);
    const out = r.motions.get(frontId)!;
    expect(Object.is(out.to.x, front.to.x) && Object.is(out.to.y, front.to.y)).toBe(true);
    expect(out).toEqual(front);
    // The rear boat sails straight into the transom: its whole velocity is
    // along the normal, so it stops at the contact point, never pushes.
    const hit = r.impacts[0].firstHitFraction;
    expect(r.motions.get(rearId)!.to.y).toBeCloseTo(700 - 5 * KN_UNITS_PER_TICK * hit, 10);
    // ADR-0004 unchanged: 1 kn closing is the full share, on both boats.
    expect(r.speedMultipliers.get("b0")).toBeCloseTo(ADR_0004_FULL_SHARE_TICK, 12);
    expect(r.speedMultipliers.get("b1")).toBeCloseTo(ADR_0004_FULL_SHARE_TICK, 12);
  });

  it("hands a proposal bent on the water bound back unchanged, bend included", () => {
    // stepPhysicalBoat clamps per axis, so a bound-bent proposal always ends
    // exactly on the bound. That end is not a wall hit: the bend must reach
    // progress, never be replaced by the chord.
    const water = physicalCourseWaterBounds("short");
    const bent: PhysicalRaceMotion = { from: { x: water.minX + .05, y: 600 }, path: [{ x: water.minX, y: 599.9 }], to: { x: water.minX, y: 599.5 } };
    const corner: PhysicalRaceMotion = { from: { x: water.minX + .03, y: water.minY + .09 }, path: [{ x: water.minX, y: water.minY + .03 }], to: { x: water.minX, y: water.minY } };
    const f = frame([bent, motion(400, 700, 400, 699), corner]), r = constrainPhysicalRaceTravel(f)!;
    expect(r.motions.get("b0")).toEqual(bent);
    expect(r.motions.get("b2")).toEqual(corner);
    expect(r.impacts).toEqual([]); expect([...r.speedMultipliers.values()]).toEqual([1, 1, 1]);
    // A proposal that would really leave the water still slides on the bound.
    const out = constrainPhysicalRaceTravel(frame([motion(water.minX + .05, 600, water.minX - .05, 599.5)]))!.motions.get("b0")!;
    expect(out.to).toEqual({ x: water.minX, y: expect.closeTo(599.5, 9) });
    expect(out.path).toEqual([{ x: water.minX, y: expect.closeTo(599.75, 9) }]);
  });

  it("stops both boats of a head-on ram with the ADR-0004 damping", () => {
    // 0.25 kn each: 0.5 kn closing is half the full share.
    const f = frame([along(400, 700, 90, .25), along(422.005, 700, 270, .25)]), r = constrainPhysicalRaceTravel(f)!;
    expect(r.impacts).toHaveLength(1);
    const a = r.motions.get("b0")!, b = r.motions.get("b1")!;
    expect(b.to.x - a.to.x).toBeCloseTo(22, 9);
    expect(a.to.x - 400).toBeCloseTo(.0025, 9); expect(422.005 - b.to.x).toBeCloseTo(.0025, 9);
    expect(r.speedMultipliers.get("b0")).toBeCloseTo(Math.exp(-1.67 / 30 * .5), 12);
    expect(r.speedMultipliers.get("b1")).toBeCloseTo(Math.exp(-1.67 / 30 * .5), 12);
    // Fast ram: the full share, never more.
    const fast = constrainPhysicalRaceTravel(frame([along(400, 700, 90, 6), along(422.1, 700, 270, 6)]))!;
    expect(fast.speedMultipliers.get("b0")).toBeCloseTo(ADR_0004_FULL_SHARE_TICK, 15);
  });

  it("slides round a buoy and records the bend in the travelled path", () => {
    const f = frame(), mark = f.course.marks[0].pos;
    // Aimed 3 units off the buoy's centre line: a glancing hit.
    f.motions.set("b0", motion(mark.x - 3, mark.y + 14, mark.x - 3, mark.y + 10));
    const r = constrainPhysicalRaceTravel(f)!, out = r.motions.get("b0")!;
    expect(r.impacts).toEqual([expect.objectContaining({ kind: "mark", markIndex: 0 })]);
    expect(out.path).toHaveLength(1);
    expect(out.to.x).toBeLessThan(mark.x - 3); // deflected away, tangentially
    expect(out.to.y).toBeLessThan(out.path![0].y); // still making way forward
    assertLegal(f, r);
  });

  it("returns a legal frame for a boat wedged between a hull and the water bound", () => {
    const water = physicalCourseWaterBounds("short");
    for (const [cx, bx, bv, cy] of [[water.minX, water.minX + 22, -6, 0], [water.minX + .5, water.minX + 22.6, -8, -3],
      [water.minX + 1, water.minX + 23.5, -20, 2]]) {
      const f = frame([motion(cx, 700, cx - 1, 700 + cy * KN_UNITS_PER_TICK), motion(bx, 700, bx + bv * KN_UNITS_PER_TICK, 700.05)]);
      const r = constrainPhysicalRaceTravel(f);
      expect(r, `wedge ${cx},${bx}`).not.toBeNull(); assertLegal(f, r!);
    }
    // Squeezed between two hulls pressing in from both sides.
    const squeeze = frame([motion(300, 700, 301, 700.2), motion(322.01, 700, 321, 700), motion(277.99, 700, 279, 700)]);
    const r = constrainPhysicalRaceTravel(squeeze);
    expect(r).not.toBeNull(); assertLegal(squeeze, r!);
  });

  it("never overlaps and never rejects 1000 seeded random 5-boat frames", () => {
    // HEAD (5df78d4a) accepted every one of these frames; measured 2026-11-01.
    let s = 20261101;
    const rnd = () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 2 ** 32; };
    const water = physicalCourseWaterBounds("short"), course = makePhysicalRaceCourse("short");
    let sliding = 0;
    for (let n = 0; n < 1000; n++) {
      // Crowd round the windward mark, the committee boat, a water corner or open water.
      const centre = [course.marks[0].pos, course.marks[2].pos, { x: water.minX + 10, y: water.minY + 10 }, { x: 400, y: 700 }][n % 4];
      const placed: { x: number; y: number }[] = [];
      while (placed.length < 5) {
        const p = { x: Math.max(water.minX, Math.min(water.maxX, centre.x + (rnd() - .5) * 90)),
          y: Math.max(water.minY, Math.min(water.maxY, centre.y + (rnd() - .5) * 90)) };
        if (placed.every(q => Math.hypot(p.x - q.x, p.y - q.y) >= 22)
          && course.marks.every(mark => Math.hypot(p.x - mark.pos.x, p.y - mark.pos.y) >= 11 + mark.radius)) placed.push(p);
      }
      const f = frame(placed.map(p => along(p.x, p.y, rnd() * 360, rnd() * 12 + (rnd() < .1 ? 40 : 0))));
      const r = constrainPhysicalRaceTravel(f);
      expect(r, `frame ${n}`).not.toBeNull(); assertLegal(f, r!);
      sliding += [...r!.motions.values()].filter(v => v.path).length;
    }
    expect(sliding).toBeGreaterThan(50); // the frames really exercise sliding
  });
});

