import { describe, expect, it } from "vitest";
import { makeStandardCourse, MIN_BOAT_SEPARATION } from "@/lib/race-physics";
import { createRaceNavigationSnapshot, type RaceMapBoat } from "./navigation-model";
import { RADAR_MIN_HULLS, radarBounds, radarFallbackFocus, radarHalfRange } from "./radar";

// M2-4 contract: the radar is a square centred on the player that always
// holds the next mark and the nearest rivals, never zooms in closer than
// RADAR_MIN_HULLS hull lengths and changes range in whole steps.
const MIN = MIN_BOAT_SEPARATION * RADAR_MIN_HULLS;
const course = makeStandardCourse();
const snapshot = (boats: RaceMapBoat[]) => createRaceNavigationSnapshot({ course, boats, windFrom: 0 })!;
const inside = (b: { minX: number; minY: number; maxX: number; maxY: number }, p: { x: number; y: number }) =>
  p.x >= b.minX && p.x <= b.maxX && p.y >= b.minY && p.y <= b.maxY;

describe("radar zoom", () => {
  it("never zooms closer than the minimum range, even on top of the mark", () => {
    expect(radarHalfRange({ x: 0, y: 0 }, { x: 1, y: 0 }, [])).toBe(MIN);
    expect(radarHalfRange({ x: 0, y: 0 }, null, [])).toBe(MIN);
  });

  it.each([60, 200, 450, 900])("holds a mark %s units away with room around it", far => {
    const half = radarHalfRange({ x: 0, y: 0 }, { x: 0, y: -far }, []);
    expect(half).toBeGreaterThan(far);
    expect(half).toBeLessThanOrEqual(Math.max(MIN, far * 1.15 + MIN_BOAT_SEPARATION * 0.5) + MIN / 2);
    // Whole steps: the range does not breathe with every snapshot.
    expect((half / (MIN / 2)) % 1).toBeCloseTo(0, 9);
  });

  it("widens for the two nearest rivals but not for a far straggler", () => {
    const base = radarHalfRange({ x: 0, y: 0 }, { x: 0, y: -150 }, []);
    const near = radarHalfRange({ x: 0, y: 0 }, { x: 0, y: -150 }, [{ x: 200, y: 0 }, { x: -10, y: 10 }]);
    expect(near).toBeGreaterThan(200);
    expect(near).toBeGreaterThan(base);
    expect(radarHalfRange({ x: 0, y: 0 }, { x: 0, y: -150 }, [{ x: 900, y: 0 }])).toBe(base);
    // Only two rivals count: a third, further one does not widen the view.
    const three = radarHalfRange({ x: 0, y: 0 }, { x: 0, y: -150 }, [{ x: 60, y: 0 }, { x: 70, y: 0 }, { x: 230, y: 0 }]);
    expect(three).toBe(radarHalfRange({ x: 0, y: 0 }, { x: 0, y: -150 }, [{ x: 60, y: 0 }, { x: 70, y: 0 }]));
  });

  it("scales with the model's hull length, so metres (M5) keep the same picture", () => {
    const units = radarHalfRange({ x: 0, y: 0 }, { x: 0, y: -300 }, [{ x: 100, y: 0 }]);
    const metres = radarHalfRange({ x: 0, y: 0 }, { x: 0, y: -180 }, [{ x: 60, y: 0 }], { hull: MIN_BOAT_SEPARATION * 0.6 });
    expect(metres).toBeCloseTo(units * 0.6, 6);
  });

  it("centres on the player and holds the supplied next mark and nearest rival", () => {
    const player = { id: "p", pos: { x: 300, y: 900 }, heading: 0, isPlayer: true };
    const rival = { id: "r", pos: { x: 360, y: 860 }, heading: 0 };
    const focus = { x: 400, y: 600 };
    const b = radarBounds(snapshot([player, rival]), focus)!;
    expect((b.minX + b.maxX) / 2).toBe(300);
    expect((b.minY + b.maxY) / 2).toBe(900);
    expect(b.maxX - b.minX).toBe(b.maxY - b.minY);
    expect(inside(b, focus)).toBe(true);
    expect(inside(b, rival.pos)).toBe(true);
    // The far windward mark is not dragged in when the caller says the next target is near.
    expect(inside(b, course.marks[0].pos)).toBe(false);
  });

  it("falls back to the nearest rounding mark and leaves a player-less snapshot to the course map", () => {
    const player = { id: "p", pos: { x: 400, y: 1100 }, heading: 0, isPlayer: true };
    const s = snapshot([player]);
    expect(radarFallbackFocus(s, player.pos)).toEqual(course.marks[0].pos);
    expect(inside(radarBounds(s)!, course.marks[0].pos)).toBe(true);
    expect(radarBounds(snapshot([{ ...player, isPlayer: false }]))).toBeNull();
  });

  it("without a supplied target still holds the finish on the run from the windward mark", () => {
    // Just past the windward mark: the snapshot does not know the leg, and the finish is the next target.
    const player = { id: "p", pos: { x: 420, y: 230 }, heading: 180, isPlayer: true };
    const { a, b } = course.finishLine;
    const finish = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
    const bounds = radarBounds(snapshot([player]))!;
    expect(inside(bounds, finish)).toBe(true);
    expect(inside(bounds, course.marks[0].pos)).toBe(true);
  });
});
