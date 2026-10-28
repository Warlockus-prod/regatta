import { describe, expect, it } from "vitest";
import { constrainPhysicalRaceTravel } from "./race-physical-response";
import { physicalRaceContext } from "./race-context";
import { makePhysicalRaceCourse, physicalCourseWaterBounds } from "./race-courses";
import { advancePhysicalRaceProgress } from "./race-physical-progress";
import type { PhysicalRaceMotion } from "./race-physical-motion";
import type { RaceBoat } from "./race-physics";

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

  it("truncates a recovered boat at water without an unrecorded final push", () => {
    const water = physicalCourseWaterBounds("short"), f = frame([motion(water.minX, 700, 0, 650)]);
    const r = constrainPhysicalRaceTravel(f)!;
    expect(r.motions.get("b0")).toEqual(motion(water.minX, 700));
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
