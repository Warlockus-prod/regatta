import { describe, expect, it } from "vitest";
import { makeStandardCourse, WORLD } from "./race-physics";
import { raceClassId, readRaceContext } from "./race-context";
import { makePhysicalRaceCourse, PHYSICAL_COURSE_PROFILES, physicalCourseDefinition, physicalFleetSpawns } from "./race-courses";

describe("unconnected physical course registry", () => {
  // M5 limits (ADR-0015 point 6): short 720, medium 1500, long 2400 s. The
  // slowest bot on the shared crew, measured 2026-11-01 after the step 4
  // review (escape without a slow tack through the wind), all at wind x0.65:
  // short 442.3 s and long 1489.7 s (the 135-cell full-race gate,
  // race-physical-human-fleet.test.ts, RACE_GATE_LONG=1), medium 813.4 s
  // (five bots alone, soloRaceWind, race-physical-fleet.test.ts). Before the
  // review five bots alone needed 614.3 s on the short course. Before M5 the
  // short limit was 480 s with light-wind bots near 475 s.
  it("keeps every limit inside the record and replay caps", () => {
    for (const profile of PHYSICAL_COURSE_PROFILES) {
      const limit = physicalCourseDefinition(profile).maxRaceSeconds;
      expect(limit).toBeLessThanOrEqual(2400);
      // Replay: at most 5000 samples at 0.5 s; eligibility: rawFinishTimeSec <= 3600.
      expect(limit / .5).toBeLessThanOrEqual(5000);
      expect(limit).toBeLessThanOrEqual(3600);
    }
    // The measured slowest bot keeps at least 10% of its limit in hand.
    const slowestBot = { short: 442.3, medium: 813.4, long: 1489.7 } as const;
    for (const profile of PHYSICAL_COURSE_PROFILES) expect(slowestBot[profile] / physicalCourseDefinition(profile).maxRaceSeconds).toBeLessThan(.9);
  });

  it.each([["short", 120, 850, 720], ["medium", 300, 550, 1500], ["long", 600, 50, 2400]] as const)(
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

  it("lays the five spawn hulls out as the fair echelon in metres, clear of the pin, the committee and the water", () => {
    // M5 (ADR-0015 point 5): the M0-2 echelon of race-spawn.ts at 0.6 m per
    // unit. Player 18 m under the line centre; bot slots -1, +1, -2, +2 at
    // 20.4 m across and 18 m further down per slot; all on heading 45.
    const d = physicalCourseDefinition("short"), m = d.context.metresPerUnit;
    const spawns = physicalFleetSpawns(5);
    const c = makePhysicalRaceCourse("short");
    const hull = d.hardware.boatDiameterMetres / 2, buffer = d.hardware.clearanceBufferMetres;
    const metres = spawns.map(({ pos }) => ({ east: pos.x * m, belowLine: pos.y * m - c.startLine.a.y * m }));
    const expected = [[240, 18], [219.6, 36], [260.4, 36], [199.2, 54], [280.8, 54]];
    metres.forEach((p, i) => { expect(p.east).toBeCloseTo(expected[i][0], 9); expect(p.belowLine).toBeCloseTo(expected[i][1], 9); });
    expect(spawns.map(s => s.heading)).toEqual([45, 45, 45, 45, 45]);
    for (const { pos } of spawns) {
      // Pin (start L buoy) and committee (start R) with the hull and buffer.
      for (const mark of c.marks) expect((Math.hypot(pos.x - mark.pos.x, pos.y - mark.pos.y) - mark.radius) * m).toBeGreaterThan(hull + buffer);
      // Inside the bots' start corridor, so they sail straight up instead of looping.
      expect(Math.abs(pos.x - (c.startLine.a.x + c.startLine.b.x) / 2) * m).toBeLessThan(d.start.widthMetres / 2 - 6);
      expect(pos.x * m - hull - buffer).toBeGreaterThan(0);
      expect(pos.x * m + hull + buffer).toBeLessThan(d.bounds.widthMetres);
      expect(pos.y * m + hull + buffer).toBeLessThan(d.bounds.heightMetres);
    }
    for (let i = 0; i < spawns.length; i++) for (let j = i + 1; j < spawns.length; j++) {
      const a = spawns[i].pos, b = spawns[j].pos;
      expect(Math.hypot(a.x - b.x, a.y - b.y) * m).toBeGreaterThan(d.hardware.boatDiameterMetres + 2 * buffer);
    }
    for (const n of [1, 2, 3, 4]) expect(physicalFleetSpawns(n)).toEqual(spawns.slice(0, n));
    expect(physicalFleetSpawns(5)[0].pos).not.toBe(spawns[0].pos);
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
      for (const value of [d, d.context, d.bounds, d.start, d.windward, d.hardware, d.rounding, d.spawn, d.bots, d.bots.escape, d.bots.prediction]) expect(Object.isFrozen(value)).toBe(true);
    }
    expect(Object.isFrozen(PHYSICAL_COURSE_PROFILES)).toBe(true);
    expect(JSON.stringify(makeStandardCourse())).toBe(legacyBefore);
    expect(makeStandardCourse().marks[0]).toMatchObject({ pos: { x: 400, y: 180 }, radius: 14 });
  });
});
