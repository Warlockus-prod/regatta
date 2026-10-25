import { describe, expect, it } from "vitest";
import { makeStandardCourse } from "@/lib/race-physics";
import { apparentWind, twaFromCompass } from "@/lib/sailing-physics/wind";
import {
  createRaceNavigationSnapshot, raceMapProjection, raceWindReading,
  type RaceMapBoat, type RaceMapCourse, type RaceNavigationInput,
} from "./navigation-model";

const player: RaceMapBoat = { id: "player", pos: { x: 400, y: 1100 }, heading: 315, isPlayer: true };
const snapshot = (extra: Partial<RaceNavigationInput> = {}) => createRaceNavigationSnapshot({ course: makeStandardCourse(), boats: [player], windFrom: 0, ...extra });
const savedCourse = (): RaceMapCourse => ({
  marks: [
    { pos: { x: 400, y: -200 }, type: "windward" },
    { pos: { x: 200, y: 1600 }, type: "finish" },
    { pos: { x: 140, y: 1140 }, type: "start" },
  ],
  startLine: { a: { x: 140, y: 1140 }, b: { x: 860, y: 1140 } },
  finishLine: { a: { x: 930, y: 200 }, b: { x: 930, y: 1100 } },
});

describe("race wind readings use the trainer convention", () => {
  it.each([
    [0, 0, 0], [0, 90, 90], [0, 180, 180], [0, 270, -90],
    [90, 0, -90], [270, 0, 90], [350, 10, 20], [10, 350, -20],
  ])("heading %s and wind from %s have signed TWA %s", (heading, windFrom, twaSigned) => {
    expect(raceWindReading({ heading, windFrom, boatSpeedKn: 5, windKnots: 12 })?.twaSigned).toBe(twaSigned);
  });

  it("uses actual knots for a measurable apparent wind rather than the visual wake speed", () => {
    const result = raceWindReading({ heading: 90, windFrom: 0, boatSpeedKn: 5, windKnots: 12 })!;
    expect(result.apparentKnots).toBeCloseTo(13, 12);
    expect(result.awaSigned).toBeCloseTo(-67.38013505195958, 10);
    expect(result.apparentFrom).toBeCloseTo(22.61986494804043, 10);
  });

  it("matches the same trainer vector helper on both tacks, with leeway and wrapped compass inputs", () => {
    for (const heading of [-1081, 0, 43, 180, 317, 1081]) {
      for (const windFrom of [-7, 90, 243, 723]) {
        for (const leeway of [-4, 0, 4]) {
          const result = raceWindReading({ heading, windFrom, boatSpeedKn: 6.2, windKnots: 17.4, leeway })!;
          const trainer = apparentWind(17.4, twaFromCompass(windFrom, heading), 6.2, leeway);
          expect(result.awaSigned).toBeCloseTo(trainer.awa, 10);
          expect(result.apparentKnots).toBeCloseTo(trainer.aws, 10);
          expect(result.heading).toBeGreaterThanOrEqual(0);
          expect(result.heading).toBeLessThan(360);
          expect(Object.isFrozen(result)).toBe(true);
        }
      }
    }
  });

  it("retains unknown old-replay TWS and distinguishes a known calm from missing data", () => {
    for (const windKnots of [undefined, null, -1, Number.NaN, Infinity]) {
      const result = raceWindReading({ heading: 45, windFrom: 0, boatSpeedKn: 5, windKnots })!;
      expect(result.trueKnots).toBeNull();
      expect(result.twaSigned).toBe(-45);
      expect(result.awaSigned).toBeNull();
      expect(result.apparentFrom).toBeNull();
      expect(result.apparentKnots).toBeNull();
    }
    const calm = raceWindReading({ heading: 90, windFrom: 0, boatSpeedKn: 5, windKnots: 0 })!;
    expect(calm.trueKnots).toBe(0);
    expect(calm.apparentKnots).toBeCloseTo(5, 12);
    expect(calm.awaSigned).toBeCloseTo(0, 12);
  });

  it("does not invent an apparent reading from invalid boat telemetry or mutate the input", () => {
    const input = Object.freeze({ heading: 450, windFrom: -360, boatSpeedKn: NaN, windKnots: 12 });
    expect(raceWindReading(input)).toMatchObject({ heading: 90, trueFrom: 0, trueKnots: 12, twaSigned: -90, awaSigned: null });
    expect(input.heading).toBe(450);
    expect(raceWindReading({ ...input, heading: Infinity })).toBeNull();
    expect(raceWindReading({ ...input, windFrom: NaN })).toBeNull();
    expect(raceWindReading({ ...input, boatSpeedKn: 5, leeway: Infinity })?.apparentKnots).toBeNull();
  });
});

describe("race navigation snapshots retain the actual race geometry", () => {
  it("copies every standard mark, both line endpoints and the real player's heading", () => {
    const course = makeStandardCourse(), result = snapshot({ course })!;
    expect(result.course.marks).toEqual(course.marks.map(({ pos, type }) => ({ pos, type })));
    expect(result.course.startLine).toEqual(course.startLine);
    expect(result.course.finishLine).toEqual(course.finishLine);
    expect(result.sharedLine).toBe(true);
    expect(result.boats[0]).toEqual({ ...player, isPlayer: true });
    expect(result.course.marks[0].pos).not.toBe(course.marks[0].pos);
    expect(result.boats[0].pos).not.toBe(player.pos);
    expect(Object.isFrozen(course)).toBe(false);
    expect(Object.isFrozen(player)).toBe(false);
  });

  it("fits a saved 1000x1400 course, all outlying marks, separate finish and live rivals without truncating to WORLD", () => {
    const course = savedCourse();
    const result = snapshot({ course, bounds: { minX: 0, minY: 0, maxX: 1000, maxY: 1400 },
      boats: [player, { id: "rival", pos: { x: 1250, y: 1500 }, heading: -90 }] })!;
    expect(result.course).toEqual(course);
    expect(result.sharedLine).toBe(false);
    expect(result.bounds.minX).toBeLessThan(0);
    expect(result.bounds.maxX).toBeGreaterThan(1250);
    expect(result.bounds.minY).toBeLessThan(-200);
    expect(result.bounds.maxY).toBeGreaterThan(1600);
    expect(result.boats[1].heading).toBe(270);
    expect(result.boats[1].isPlayer).toBe(false);
  });

  it("recognizes reversed endpoints of a shared line and keeps a genuinely different finish", () => {
    const course = makeStandardCourse();
    course.finishLine = { a: { ...course.startLine.b }, b: { ...course.startLine.a } };
    expect(snapshot({ course })?.sharedLine).toBe(true);
    course.finishLine.b.x += 1;
    expect(snapshot({ course })?.sharedLine).toBe(false);
  });

  it("copies a deeply frozen source and freezes its own nested frame independently", () => {
    const course = makeStandardCourse();
    course.marks.forEach(mark => { Object.freeze(mark.pos); Object.freeze(mark); });
    Object.freeze(course.marks); Object.freeze(course.startLine); Object.freeze(course);
    const result = snapshot({ course })!;
    expect(Object.isFrozen(result)).toBe(true);
    expect(Object.isFrozen(result.course)).toBe(true);
    expect(Object.isFrozen(result.course.marks)).toBe(true);
    expect(Object.isFrozen(result.course.marks[0])).toBe(true);
    expect(Object.isFrozen(result.course.marks[0].pos)).toBe(true);
    expect(Object.isFrozen(result.course.startLine.a)).toBe(true);
    expect(Object.isFrozen(result.boats[0].pos)).toBe(true);
    const moving = { ...player, pos: { ...player.pos } };
    const earlier = snapshot({ boats: [moving] })!;
    moving.pos.x = 500; moving.heading = 90;
    expect(earlier.boats[0].pos.x).toBe(400);
    expect(earlier.boats[0].heading).toBe(315);
  });

  it("filters malformed rivals and unsafe colors while preserving valid fleet headings", () => {
    const boats = [player, { ...player }, { ...player, id: "east", heading: 450, color: "#aBc123" },
      { ...player, id: "unsafe-color", color: "url(https://example.invalid/image.svg)" },
      { ...player, id: "bad-position", pos: { x: NaN, y: 1 } }, { ...player, id: "bad-heading", heading: Infinity }];
    const result = snapshot({ boats, windFrom: -90 })!;
    expect(result.boats.map(boat => boat.id)).toEqual(["player", "east", "unsafe-color"]);
    expect(result.boats[1]).toMatchObject({ heading: 90, color: "#aBc123" });
    expect(result.boats[2]).not.toHaveProperty("color");
    expect(result.windFrom).toBe(270);
    expect(snapshot({ windFrom: NaN })?.windFrom).toBeNull();
  });

  it("bounds terrain work and clips distant decoration instead of shrinking the navigable course", () => {
    const far = [{ x: 50000, y: 50000 }, { x: 51000, y: 50000 }, { x: 50000, y: 51000 }];
    const withTerrain = snapshot({ terrain: [far, [{ x: 0, y: 0 }], ...Array.from({ length: 20 }, () => far)] })!;
    expect(withTerrain.bounds).toEqual(snapshot()!.bounds);
    expect(withTerrain.terrain).toHaveLength(11);
    expect(withTerrain.terrain[0]).toEqual(far);
    expect(withTerrain.terrain[0]).not.toBe(far);
    expect(Object.isFrozen(withTerrain.terrain[0][0])).toBe(true);
    expect(snapshot({ terrain: [Array.from({ length: 161 }, () => ({ x: 0, y: 0 }))] })?.terrain).toEqual([]);
  });

  it("fails closed for malformed course/bounds but allows an empty fleet and degenerate line with finite padding", () => {
    expect(snapshot({ course: { ...makeStandardCourse(), marks: [{ pos: { x: NaN, y: 1 }, type: "windward" }] } })).toBeNull();
    expect(snapshot({ bounds: { minX: 0, minY: 0, maxX: 0, maxY: 1400 } })).toBeNull();
    expect(snapshot({ boats: Array.from({ length: 65 }, () => player) })).toBeNull();
    const dot = { a: { x: 10, y: 20 }, b: { x: 10, y: 20 } };
    expect(snapshot({ course: { marks: [], startLine: dot, finishLine: dot }, boats: [] })?.bounds)
      .toEqual({ minX: 0, minY: 10, maxX: 20, maxY: 30 });
  });

  it("rejects malformed saved course collections and lines without throwing", () => {
    const course = makeStandardCourse();
    for (const malformed of [null, { ...course, marks: {} }, { ...course, marks: [course.marks[0], null] },
      { ...course, marks: [{ pos: { x: 1, y: 2 }, type: "island" }] }, { ...course, finishLine: null }]) {
      const raw = { course: malformed, boats: [], windFrom: 0 } as unknown as RaceNavigationInput;
      expect(createRaceNavigationSnapshot(raw)).toBeNull();
    }
  });
});

describe("north-up map projection", () => {
  it("uses one aspect-preserving raw-coordinate scale with north up and east right", () => {
    const p = raceMapProjection({ minX: 0, minY: 0, maxX: 1000, maxY: 1400 }, 400, 240, 20)!;
    expect(p.scale).toBeCloseTo(1 / 7, 12);
    expect(p.project({ x: 500, y: 700 })).toEqual({ x: 200, y: 120 });
    expect(p.project({ x: 500, y: 0 }).y).toBe(20);
    expect(p.project({ x: 500, y: 1400 }).y).toBe(220);
    const center = p.project({ x: 500, y: 700 });
    expect(p.project({ x: 600, y: 700 }).x - center.x).toBeCloseTo(100 / 7, 12);
    expect(p.project({ x: 500, y: 800 }).y - center.y).toBeCloseTo(100 / 7, 12);
    expect(p.viewport.width).toBeCloseTo(1000 / 7, 12);
    expect(p.viewport.height).toBe(200);
  });

  it("changes fit for a landscape viewport without stretching or double-applying the race metre conversion", () => {
    const p = raceMapProjection({ minX: -100, minY: -100, maxX: 100, maxY: 100 }, 844, 390, 20)!;
    expect(p.scale).toBe(1.75);
    expect(p.project({ x: 0, y: 0 })).toEqual({ x: 422, y: 195 });
    expect(p.project({ x: 100, y: 100 })).toEqual({ x: 597, y: 370 });
  });

  it("rejects invalid dimensions and bounds without producing NaN SVG coordinates", () => {
    const bounds = { minX: 0, minY: 0, maxX: 800, maxY: 1200 };
    for (const [width, height, padding] of [[0, 220, 18], [320, NaN, 18], [320, 220, 110], [Infinity, 220, 0], [5000, 220, 0]]) {
      expect(raceMapProjection(bounds, width, height, padding)).toBeNull();
    }
    expect(raceMapProjection({ ...bounds, maxX: Infinity }, 320, 220)).toBeNull();
    expect(raceMapProjection({ ...bounds, maxY: 0 }, 320, 220)).toBeNull();
  });
});
