import { describe, expect, it } from "vitest";
import { NO_GO } from "@/lib/race-manoeuvres";
import { NO_GO_HALF_DEG } from "@/lib/sailing-physics/constants";
import { MIN_BOAT_SEPARATION, makeStandardCourse, stepBoat, type RaceBoat } from "@/lib/race-physics";
import { physicalCourseWaterBounds } from "@/lib/race-courses";
import { PHYSICAL_RACE_PROFILES } from "@/lib/race-context";
import { METRES_PER_UNIT, NO_GO_DEG } from "@/features/race-3d/pose";
import { boundaryProximity, noGoEdges, noGoRing, raceTacticsModel, tacticalSizes, zoneMark, type BoundaryProximity } from "./tactics";

// M2-2 / M2-3 contracts: every tactical size and limit comes from the active
// race model (no second definition of no-go, zone or clamp), and the
// boundary hint appears before the clamp stops the boat.
const legacy = raceTacticsModel();
const fresh = (): BoundaryProximity => ({ nearest: 0, ahead: 0, hint: false });

describe("race tactics model", () => {
  it("reads the legacy race's own no-go, hull, zone and clamp", () => {
    expect(legacy.noGoHalfDeg).toBe(NO_GO.angleDeg);
    expect(NO_GO_DEG).toBe(NO_GO.angleDeg);
    expect(legacy.hullUnits).toBe(MIN_BOAT_SEPARATION);
    expect(legacy.markZoneUnits).toBe(MIN_BOAT_SEPARATION * 3);
    // The scene converts with the same factor the overlays size with.
    expect(legacy.metresPerUnit).toBe(METRES_PER_UNIT);
  });

  it("matches the clamp stepBoat actually applies", () => {
    const boat: RaceBoat = { id: "p", name: "P", color: "#fff", pos: { x: 5, y: 5 }, heading: 315, speed: 6, lapDone: 0 };
    stepBoat(boat, 0.5, 0, 1, { turn: 0 });
    expect(boat.pos).toEqual({ x: legacy.water.minX, y: legacy.water.minY });
    boat.pos = { x: 5000, y: 5000 }; boat.heading = 135;
    stepBoat(boat, 0.5, 0, 1, { turn: 0 });
    expect(boat.pos).toEqual({ x: legacy.water.maxX, y: legacy.water.maxY });
  });

  it.each(PHYSICAL_RACE_PROFILES)("takes the %s trial's water bounds and close-hauled cone", profile => {
    const model = raceTacticsModel(profile);
    expect(model.water).toEqual(physicalCourseWaterBounds(profile));
    expect(model.noGoHalfDeg).toBe(NO_GO_HALF_DEG);
    expect(model.metresPerUnit).toBe(METRES_PER_UNIT);
    expect(model.markZoneUnits).toBeCloseTo(model.hullUnits * 3, 9);
    expect(raceTacticsModel(profile)).toBe(model);
  });

  it("sizes the overlays in metres from the hull, so a model in metres keeps them", () => {
    const s = tacticalSizes(legacy);
    expect(s.hullMetres).toBeCloseTo(13.2, 6);
    expect(s.zoneRadius).toBeCloseTo(39.6, 6);
    const metres = tacticalSizes({ ...legacy, metresPerUnit: 1, hullUnits: 13.2, markZoneUnits: 39.6 });
    for (const key of Object.keys(s) as (keyof typeof s)[]) expect(metres[key]).toBeCloseTo(s[key], 6);
    expect(s.wedgeInner).toBeLessThan(s.wedgeOuter);
    expect(s.routeHalfWidth).toBeLessThan(s.routeOutlineHalfWidth);
  });
});

describe("no-go wedge", () => {
  // A flat RingGeometry angle t lands on compass bearing 90 - t (see noGoRing).
  const bearingOf = (t: number) => ((90 - t * 180 / Math.PI) % 360 + 360) % 360;

  it.each([[legacy, 30], [raceTacticsModel("medium"), 42]] as const)("spans head to wind plus and minus the model's half angle", (model, half) => {
    const ring = noGoRing(model);
    expect(ring.thetaLength * 180 / Math.PI).toBeCloseTo(2 * half, 9);
    const a = bearingOf(ring.thetaStart), b = bearingOf(ring.thetaStart + ring.thetaLength);
    expect([a, b].sort((x, y) => x - y)).toEqual([expect.closeTo(half, 9), expect.closeTo(360 - half, 9)]);
    // The middle of the sector is head to wind (north before the wind turn).
    expect(bearingOf(ring.thetaStart + ring.thetaLength / 2)).toBeCloseTo(0, 9);
  });

  it.each([0, 45, 200, 350])("turns its edges with the true wind from %s", windFrom => {
    const [left, right] = noGoEdges(legacy, windFrom);
    expect(left).toBeCloseTo(((windFrom - 30) % 360 + 360) % 360, 9);
    expect(right).toBeCloseTo((windFrom + 30) % 360, 9);
  });
});

describe("mark zone", () => {
  const course = makeStandardCourse();
  it("rings the windward mark until it is rounded, then nothing", () => {
    expect(zoneMark({ lapDone: 0 }, course)).toBe(course.marks[0].pos);
    expect(zoneMark({ lapDone: 1 }, course)).toBeNull();
    expect(zoneMark(undefined, course)).toBeNull();
  });
});

describe("course boundary", () => {
  it("measures the nearest edge and the edge ahead along the heading", () => {
    const p = boundaryProximity({ x: 100, y: 600 }, 270, 0, legacy, fresh());
    expect(p.nearest).toBe(80);
    expect(p.ahead).toBeCloseTo(80, 9);
    const diagonal = boundaryProximity({ x: 400, y: 600 }, 45, 0, legacy, fresh());
    // North-east: the east edge, 380 units away along x, comes before the north one (580).
    expect(diagonal.ahead).toBeCloseTo(380 / Math.sin(Math.PI / 4), 6);
  });

  it("hints early, about five seconds of sailing before the clamp, and not when sailing away", () => {
    // 6 kn in the legacy race is 48 units per second: 5 s is 240 units.
    expect(boundaryProximity({ x: 400, y: 250 }, 0, 6, legacy, fresh()).hint).toBe(true);
    expect(boundaryProximity({ x: 400, y: 300 }, 0, 6, legacy, fresh()).hint).toBe(false);
    expect(boundaryProximity({ x: 400, y: 60 }, 180, 6, legacy, fresh()).hint).toBe(false);
    // Drifting at no speed still gets two hull lengths of warning.
    expect(boundaryProximity({ x: 400, y: 60 }, 0, 0, legacy, fresh()).hint).toBe(true);
    // On the clamp itself, whatever the heading.
    expect(boundaryProximity({ x: 400, y: legacy.water.minY }, 90, 6, legacy, fresh()).hint).toBe(true);
  });

  it("uses real speed in the physical trial: the same 5 s is far fewer units", () => {
    const model = raceTacticsModel("long");
    const y = model.water.minY + model.hullUnits * 4;
    expect(boundaryProximity({ x: 300, y }, 0, 6, model, fresh()).hint).toBe(false);
    expect(boundaryProximity({ x: 300, y: model.water.minY + model.hullUnits }, 0, 6, model, fresh()).hint).toBe(true);
  });

  it("writes into the caller's object, so the frame loop allocates nothing", () => {
    const out = fresh();
    expect(boundaryProximity({ x: 400, y: 600 }, 0, 6, legacy, out)).toBe(out);
  });
});
