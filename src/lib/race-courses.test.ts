import { describe, expect, it } from "vitest";
import { makeStandardCourse, WORLD } from "./race-physics";
import { raceClassId, readRaceContext } from "./race-context";
import { makePhysicalRaceCourse, PHYSICAL_COURSE_PROFILES, physicalCourseDefinition, physicalFleetSpawns } from "./race-courses";

describe("unconnected physical course registry", () => {
  it.each([["short", 120, 850, 480], ["medium", 300, 550, 1200], ["long", 600, 50, 2400]] as const)(
    "%s has its own metric leg and limit, with the same hull and hardware", (profile, leg, markY, limit) => {
      const d = physicalCourseDefinition(profile);
      const c = makePhysicalRaceCourse(profile), m = d.context.metresPerUnit;
      expect(d.legMetres).toBe(leg);
      expect(d.maxRaceSeconds).toBe(limit);
      expect(c.marks[0].pos).toEqual({ x: 400, y: markY });
      expect((c.startLine.a.y - c.marks[0].pos.y) * m).toBe(leg);
      expect(c.startLine.a.y).toBe(1050);
      expect((c.startLine.b.x - c.startLine.a.x) * m).toBeCloseTo(100, 12);
      expect(c.finishLine).toEqual(c.startLine);
      expect(d.bounds).toEqual({ widthMetres: WORLD.width * m, heightMetres: WORLD.height * m });
      expect(d.hardware).toEqual({ boatDiameterMetres: 13.2, buoyRadiusMetres: 1.5, committeeRadiusMetres: 4.5, clearanceBufferMetres: 2 });
      expect(c.marks.map(mark => mark.radius * m)).toEqual([1.5, 1.5, 4.5]);
      expect(c.marks.map(mark => [mark.type, mark.label])).toEqual(makeStandardCourse().marks.map(mark => [mark.type, mark.label]));
      const restored = JSON.parse(JSON.stringify({ context: d.context, course: c }));
      expect(restored.course).toEqual(c);
      expect(readRaceContext(restored.context)).toEqual({ ok: true, context: d.context });
      expect(raceClassId(d.context)).toBe(`physical-cruiser-v1:${profile}:r1`);
    });

  it("keeps all five spawn hulls inside the line with endpoint and pair clearance", () => {
    const d = physicalCourseDefinition("short"), m = d.context.metresPerUnit;
    const spawns = physicalFleetSpawns(5);
    const c = makePhysicalRaceCourse("short");
    const hull = d.hardware.boatDiameterMetres / 2;
    expect(spawns[0]).toEqual({ x: 400, y: 1080 });
    for (const p of spawns) {
      expect((p.y - c.startLine.a.y) * m).toBe(18);
      expect((p.x - c.startLine.a.x) * m).toBeGreaterThanOrEqual(hull + d.hardware.buoyRadiusMetres + d.hardware.clearanceBufferMetres);
      expect((c.startLine.b.x - p.x) * m + 1e-12).toBeGreaterThanOrEqual(hull + d.hardware.committeeRadiusMetres + d.hardware.clearanceBufferMetres);
      expect(p.x * m - hull).toBeGreaterThan(0);
      expect(p.x * m + hull).toBeLessThan(d.bounds.widthMetres);
      expect(p.y * m + hull).toBeLessThan(d.bounds.heightMetres);
    }
    for (let i = 0; i < spawns.length; i++) for (let j = i + 1; j < spawns.length; j++) {
      expect(Math.hypot(spawns[i].x - spawns[j].x, spawns[i].y - spawns[j].y) * m).toBeGreaterThan(d.hardware.boatDiameterMetres + 2 * d.hardware.clearanceBufferMetres);
    }
    for (const n of [1, 2, 3, 4]) expect(physicalFleetSpawns(n)).toEqual(spawns.slice(0, n));
    for (const n of [0, 6, 8, 1.5, NaN]) expect(() => physicalFleetSpawns(n)).toThrow(RangeError);
  });

  it.each(PHYSICAL_COURSE_PROFILES)("%s rounding crosses the proposed gates with full hull clearance inside the old world", profile => {
    const d = physicalCourseDefinition(profile), r = d.rounding, hull = d.hardware.boatDiameterMetres / 2;
    const sideCrossing = Math.sqrt(r.radiusMetres ** 2 - r.centreDropMetres ** 2);
    const northCrossing = r.radiusMetres - r.centreDropMetres;
    expect(sideCrossing).toBeCloseTo(16.97056274847714, 12);
    for (const crossing of [sideCrossing, northCrossing]) {
      expect(crossing).toBeGreaterThan(r.gateInnerMetres);
      expect(crossing).toBeLessThan(r.gateOuterMetres);
      expect(crossing - hull).toBeGreaterThan(d.hardware.buoyRadiusMetres);
    }
    for (let angle = 0; angle < 360; angle++) {
      const rad = angle * Math.PI / 180;
      const east = d.windward.eastMetres + Math.cos(rad) * r.radiusMetres;
      const south = d.windward.southMetres + r.centreDropMetres + Math.sin(rad) * r.radiusMetres;
      expect(east - hull).toBeGreaterThan(0);
      expect(east + hull).toBeLessThan(d.bounds.widthMetres);
      expect(south - hull).toBeGreaterThan(0);
      expect(south + hull).toBeLessThan(d.bounds.heightMetres);
      // Existing clamp is for the centre. This does not certify later recovery loops.
      expect(south / d.context.metresPerUnit).toBeGreaterThan(20);
    }
  });

  it("freezes definitions, returns independent geometry and leaves the live legacy factory exact", () => {
    const legacyBefore = JSON.stringify(makeStandardCourse());
    const a = makePhysicalRaceCourse("long"), b = makePhysicalRaceCourse("long");
    a.marks[0].pos.y = -100;
    a.startLine.a.x = -100;
    expect(b.marks[0].pos.y).toBe(50);
    expect(b.startLine.a.x).toBeCloseTo(316.6666666666667, 12);
    expect(a.finishLine.a.x).not.toBe(-100);
    for (const profile of PHYSICAL_COURSE_PROFILES) {
      const d = physicalCourseDefinition(profile);
      for (const value of [d, d.context, d.bounds, d.start, d.windward, d.hardware, d.rounding, d.spawn]) expect(Object.isFrozen(value)).toBe(true);
    }
    expect(Object.isFrozen(PHYSICAL_COURSE_PROFILES)).toBe(true);
    expect(JSON.stringify(makeStandardCourse())).toBe(legacyBefore);
    expect(makeStandardCourse().marks[0]).toMatchObject({ pos: { x: 400, y: 180 }, radius: 14 });
  });
});
