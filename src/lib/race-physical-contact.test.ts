import { describe, expect, it } from "vitest";
import { observePhysicalRaceContacts } from "./race-physical-contact";
import { physicalRaceContext } from "./race-context";
import { makePhysicalRaceCourse } from "./race-courses";
import type { PhysicalRaceMotion } from "./race-physical-motion";

const motion = (x: number, y: number, tx = x, ty = y): PhysicalRaceMotion => ({ from: { x, y }, to: { x: tx, y: ty } });
function frame(motions: readonly PhysicalRaceMotion[] = [motion(400, 700)]) {
  return { context: physicalRaceContext("short"), course: makePhysicalRaceCourse("short"),
    boats: motions.map((_, i) => ({ id: `b${i}`, lapDone: 0 })), motions: new Map(motions.map((v, i) => [`b${i}`, v])) };
}

describe("actual physical contact observations before response", () => {
  it("retains a same-step encounter when both endpoints are clear", () => {
    const f = frame([motion(350, 700, 450, 700), motion(450, 700, 350, 700)]);
    const before = structuredClone(f), contacts = observePhysicalRaceContacts(f)!;
    expect(contacts).toHaveLength(1);
    expect(contacts[0]).toMatchObject({ kind: "hull", boatId: "b0", otherBoatId: "b1" });
    expect(contacts[0].firstHitFraction).toBeCloseTo(.39, 12);
    expect(contacts[0].minimumClearanceMetres).toBeCloseTo(-13.2, 12);
    expect(f).toEqual(before); expect(Object.isFrozen(contacts)).toBe(true); expect(Object.isFrozen(contacts[0])).toBe(true);
    expect(contacts[0]).not.toHaveProperty("pos"); expect(contacts[0]).not.toHaveProperty("penaltySeconds");
  });

  it("does not invent contact where paths cross at different times", () => {
    expect(observePhysicalRaceContacts(frame([motion(300, 500, 500, 500), motion(400, 500, 400, 700)]))).toEqual([]);
  });

  it("keeps a tangent and initial overlap separate from an actually clear pass", () => {
    const hit = observePhysicalRaceContacts(frame([motion(350, 700, 450, 700), motion(400, 722)]))!;
    expect(hit).toHaveLength(1); expect(hit[0].firstHitFraction).toBeCloseTo(.5, 12);
    expect(hit[0].minimumClearanceMetres).toBeCloseTo(0, 12);
    expect(observePhysicalRaceContacts(frame([motion(350, 700, 450, 700), motion(400, 722.001)]))).toEqual([]);
    const overlap = observePhysicalRaceContacts(frame([motion(400, 700, 350, 700), motion(401, 700, 450, 700)]))!;
    expect(overlap).toHaveLength(1); expect(overlap[0].firstHitFraction).toBe(0);
    expect(overlap[0].minimumClearanceMetres).toBeCloseTo(-12.6, 12);
  });

  it("finds swept buoy contact and uses the larger committee envelope", () => {
    const f = frame(), mark = f.course.marks[0].pos;
    f.motions.set("b0", motion(mark.x - 30, mark.y, mark.x + 30, mark.y));
    const hits = observePhysicalRaceContacts(f)!;
    expect(hits).toHaveLength(1); expect(hits[0]).toMatchObject({ kind: "mark", boatId: "b0", markIndex: 0 });
    expect(hits[0].firstHitFraction).toBeCloseTo((30 - 13.5) / 60, 12);
    expect(hits[0].minimumClearanceMetres).toBeCloseTo(-8.1, 12);
    const committee = f.course.marks[2].pos;
    f.motions.set("b0", motion(committee.x + 18.5, committee.y));
    expect(observePhysicalRaceContacts(f)).toEqual([expect.objectContaining({ kind: "mark", markIndex: 2, firstHitFraction: 0 })]);
    f.motions.set("b0", motion(committee.x + 18.501, committee.y));
    expect(observePhysicalRaceContacts(f)).toEqual([]);
  });

  it("uses canonical mark hardware for all profiles and excludes finished boats", () => {
    for (const profile of ["short", "medium", "long"] as const) {
      const f = { ...frame(), context: physicalRaceContext(profile), course: makePhysicalRaceCourse(profile) };
      const p = f.course.marks[0].pos;
      f.motions.set("b0", motion(p.x, p.y));
      expect(observePhysicalRaceContacts(f)).toEqual([expect.objectContaining({ kind: "mark", markIndex: 0, minimumClearanceMetres: -8.1 })]);
      f.boats[0].lapDone = 2; f.motions.clear(); expect(observePhysicalRaceContacts(f)).toEqual([]);
    }
  });

  it("bounds a full overlapping fleet to ten hull pairs and five mark contacts", () => {
    const f = frame(Array.from({ length: 5 }, () => motion(400, 850)));
    const contacts = observePhysicalRaceContacts(f)!;
    expect(contacts.filter(c => c.kind === "hull")).toHaveLength(10);
    expect(contacts.filter(c => c.kind === "mark")).toHaveLength(5);
    const reversed = observePhysicalRaceContacts({ ...f, boats: [...f.boats].reverse() })!;
    expect(new Set(reversed.filter(c => c.kind === "hull").map(c => `${c.boatId}:${c.otherBoatId}`)))
      .toEqual(new Set(contacts.filter(c => c.kind === "hull").map(c => `${c.boatId}:${c.otherBoatId}`)));
  });

  it("rejects foreign context, changed hardware and malformed frame data without changing inputs", () => {
    const f = frame(), before = structuredClone(f);
    const invalid = [
      { ...f, context: { ...f.context, model: "legacy-race-v1" } },
      { ...f, course: { ...f.course, marks: f.course.marks.map(m => ({ ...m, radius: 99 })) } },
      { ...f, boats: [...f.boats, f.boats[0]] }, { ...f, boats: [{ id: "b0", lapDone: 3 }] },
      { ...f, motions: new Map() }, { ...f, motions: new Map([["b0", motion(NaN, 700)]]) },
      { ...f, motions: new Map([["b0", motion(400, -1)]]) },
      { ...f, motions: new Map([["absent", motion(400, 700)]]) },
      { ...f, boats: [{ id: "b0", lapDone: 2 }] },
    ];
    for (const value of invalid) expect(observePhysicalRaceContacts(value as typeof f)).toBeNull();
    expect(f).toEqual(before);
  });
});
