import { describe, expect, it } from "vitest";
import { makeStandardCourse } from "@/lib/race-physics";
import { createRaceNavigationSnapshot } from "./navigation-model";
import { BIG_MAP_INITIAL, MAP_ZOOM, bigMapReducer, clampMapZoom, mapDragToPan, mapFitBounds, mapPanLimit, mapTrackPoints, raceMapView, recordTrackPoint, roundingArc, stepMapZoom } from "./map-view";

// F3 contract: the big map at zoom 1 shows the whole course (north up) or the
// whole course around the boat at any heading (bow up); zooming in keeps the
// player's boat where it was on the map; bow up puts the bow at the top; the
// zoom stays between 1 and 8 whatever the buttons, a pinch or the wheel ask.

const snapshot = createRaceNavigationSnapshot({ course: makeStandardCourse(), windFrom: 0,
  boats: [{ id: "p", pos: { x: 300, y: 1100 }, heading: 30, isPlayer: true }, { id: "r", pos: { x: 700, y: 400 }, heading: 200 }] })!;
const player = snapshot.boats[0];
const W = 360, H = 420;
const inside = (p: { x: number; y: number }, pad = 0) => p.x >= pad - 1e-6 && p.x <= W - pad + 1e-6 && p.y >= pad - 1e-6 && p.y <= H - pad + 1e-6;
const corners = (b: { minX: number; minY: number; maxX: number; maxY: number }) =>
  [{ x: b.minX, y: b.minY }, { x: b.maxX, y: b.minY }, { x: b.minX, y: b.maxY }, { x: b.maxX, y: b.maxY }];

describe("zoom", () => {
  it("clamps to 1..8 and turns broken values into the whole course", () => {
    expect(clampMapZoom(0.2)).toBe(MAP_ZOOM.min);
    expect(clampMapZoom(40)).toBe(MAP_ZOOM.max);
    expect(clampMapZoom(Number.NaN)).toBe(1);
    expect(clampMapZoom(1.0004)).toBe(1);
    expect(stepMapZoom(1, 1)).toBe(1.5);
    expect(stepMapZoom(1, -3)).toBe(1);
    expect(stepMapZoom(6, 2)).toBe(8);
  });
  it("buttons step, a pinch scales from its start, the wheel multiplies, fit resets the zoom only", () => {
    let s = bigMapReducer(BIG_MAP_INITIAL, { type: "zoom", steps: 1 });
    expect(s.zoom).toBe(1.5);
    s = bigMapReducer(s, { type: "orientation", orientation: "heading" });
    s = bigMapReducer(s, { type: "scale", base: 2, factor: 2 });
    expect(s.zoom).toBe(4);
    s = bigMapReducer(s, { type: "factor", factor: 0.5 });
    expect(s.zoom).toBe(2);
    s = bigMapReducer(s, { type: "scale", base: 2, factor: -1 });
    expect(s.zoom).toBe(2);
    expect(bigMapReducer(s, { type: "fit" })).toEqual({ zoom: 1, orientation: "heading", pan: { x: 0, y: 0 } });
    expect(bigMapReducer(s, { type: "orientation", orientation: "sideways" as "north" })).toBe(s);
  });
});

describe("drag (pan)", () => {
  const limit = { x: 100, y: 50 };
  it("moves only a zoomed map, stays within half the course, and resets at the whole course", () => {
    expect(bigMapReducer(BIG_MAP_INITIAL, { type: "pan", dx: 10, dy: 10, limit })).toBe(BIG_MAP_INITIAL);
    let s = bigMapReducer(BIG_MAP_INITIAL, { type: "zoom", steps: 2 });
    s = bigMapReducer(s, { type: "pan", dx: 30, dy: -20, limit });
    expect(s.pan).toEqual({ x: 30, y: -20 });
    s = bigMapReducer(s, { type: "pan", dx: 500, dy: -500, limit });
    expect(s.pan).toEqual({ x: 100, y: -50 });
    expect(bigMapReducer(s, { type: "pan", dx: Number.NaN, dy: 0, limit })).toBe(s);
    // Zooming in or out keeps the drag; back at zoom 1 (button, pinch, wheel, fit) it goes.
    expect(bigMapReducer(s, { type: "zoom", steps: -1 }).pan).toEqual({ x: 100, y: -50 });
    expect(bigMapReducer(s, { type: "zoom", steps: -5 }).pan).toEqual({ x: 0, y: 0 });
    expect(bigMapReducer(s, { type: "scale", base: 1, factor: 0.5 }).pan).toEqual({ x: 0, y: 0 });
    expect(bigMapReducer(s, { type: "factor", factor: 0.01 }).pan).toEqual({ x: 0, y: 0 });
    expect(bigMapReducer(s, { type: "fit" }).pan).toEqual({ x: 0, y: 0 });
    expect(mapPanLimit({ minX: 0, minY: 100, maxX: 800, maxY: 1300 })).toEqual({ x: 400, y: 600 });
  });
  it("turns a screen drag into the opposite move of the centre, north up and bow up", () => {
    const fit = mapFitBounds(snapshot);
    for (const orientation of ["north", "heading"] as const) {
      const view = raceMapView({ fit, width: W, height: H, zoom: 2, orientation, player })!;
      const step = mapDragToPan(view, 40, -25);
      const moved = raceMapView({ fit, width: W, height: H, zoom: 2, orientation, player, pan: step })!;
      const a = view.project(player.pos), b = moved.project(player.pos);
      expect(b.x - a.x).toBeCloseTo(40, 6);
      expect(b.y - a.y).toBeCloseTo(-25, 6);
    }
    expect(mapDragToPan({ scale: 0, rotation: 0 }, 10, 10)).toEqual({ x: 0, y: 0 });
    // At the whole course a pan in the input is ignored.
    const whole = raceMapView({ fit, width: W, height: H, zoom: 1, orientation: "north", player })!;
    expect(raceMapView({ fit, width: W, height: H, zoom: 1, orientation: "north", player, pan: { x: 200, y: 0 } })!.centre).toEqual(whole.centre);
  });
});

describe("raceMapView", () => {
  const fit = mapFitBounds(snapshot);
  it("north up at zoom 1 keeps the whole course and fleet inside the map", () => {
    const view = raceMapView({ fit, width: W, height: H, zoom: 1, orientation: "north", player })!;
    expect(view.rotation).toBe(0);
    for (const c of corners(fit)) expect(inside(view.project(c), 17)).toBe(true);
  });
  it("zooming in keeps the player's boat at the same place on the map", () => {
    const at = (zoom: number) => raceMapView({ fit, width: W, height: H, zoom, orientation: "north", player })!;
    const base = at(1).project(player.pos);
    for (const zoom of [1.5, 3, 8]) {
      const view = at(zoom);
      expect(view.scale).toBeCloseTo(at(1).scale * zoom, 9);
      const p = view.project(player.pos);
      expect(p.x).toBeCloseTo(base.x, 6);
      expect(p.y).toBeCloseTo(base.y, 6);
    }
  });
  it("bow up puts the boat in the centre with its bow at the top, and the course fits at any heading", () => {
    for (const heading of [0, 30, 90, 135, 210, 330]) {
      const boat = { pos: player.pos, heading };
      const view = raceMapView({ fit, width: W, height: H, zoom: 1, orientation: "heading", player: boat })!;
      const centre = view.project(boat.pos);
      expect(centre.x).toBeCloseTo(W / 2, 6);
      expect(centre.y).toBeCloseTo(H / 2, 6);
      const rad = heading * Math.PI / 180;
      const ahead = view.project({ x: boat.pos.x + Math.sin(rad) * 100, y: boat.pos.y - Math.cos(rad) * 100 });
      expect(ahead.x).toBeCloseTo(W / 2, 6);
      expect(ahead.y).toBeLessThan(H / 2);
      expect(view.rotation).toBeCloseTo(-heading, 9);
      for (const c of corners(fit)) expect(inside(view.project(c), 17)).toBe(true);
    }
  });
  it("falls back to north up without a player and refuses a map too small to draw", () => {
    expect(raceMapView({ fit, width: W, height: H, zoom: 2, orientation: "heading", player: null })!.rotation).toBe(0);
    expect(raceMapView({ fit, width: 40, height: H, zoom: 1, orientation: "north" })).toBeNull();
    expect(raceMapView({ fit: { minX: 0, minY: 0, maxX: 0, maxY: 1 }, width: W, height: H, zoom: 1, orientation: "north" })).toBeNull();
  });
});

describe("track and rounding helpers", () => {
  it("records the online track once a second, bounded, and starts again for a new race", () => {
    const track: { x: number; y: number; t: number }[] = [];
    recordTrackPoint(track, { x: 1, y: 1 }, 0);
    recordTrackPoint(track, { x: 2, y: 2 }, 0.4);
    recordTrackPoint(track, { x: 3, y: 3 }, 1);
    recordTrackPoint(track, null, 2);
    recordTrackPoint(track, { x: Number.NaN, y: 3 }, 3);
    expect(track).toEqual([{ x: 1, y: 1, t: 0 }, { x: 3, y: 3, t: 1 }]);
    recordTrackPoint(track, { x: 9, y: 9 }, 0.2);
    expect(track).toEqual([{ x: 9, y: 9, t: 0.2 }]);
    const long: { x: number; y: number; t: number }[] = [];
    for (let t = 0; t < 30; t++) recordTrackPoint(long, { x: t, y: 0 }, t, 1, 10);
    expect(long).toHaveLength(10);
    expect(long[0].x).toBe(20);
    expect(long.at(-1)!.x).toBe(29);
  });
  it("the fit holds the whole track", () => {
    const fit = mapFitBounds(snapshot, [{ x: -500, y: 3000 }, { x: Number.NaN, y: 0 }]);
    expect(fit.minX).toBe(-500);
    expect(fit.maxY).toBe(3000);
    expect(fit.maxX).toBe(snapshot.bounds.maxX);
  });
  it("thins a long track evenly and keeps its last point", () => {
    const long = Array.from({ length: 1000 }, (_, i) => ({ x: i, y: 2 * i }));
    const thin = mapTrackPoints(long, 100);
    expect(thin).toHaveLength(100);
    expect(thin[0]).toEqual({ x: 0, y: 0 });
    expect(thin.at(-1)).toEqual({ x: 999, y: 1998 });
    expect(mapTrackPoints(null)).toEqual([]);
    expect(mapTrackPoints([{ x: 1, y: 2 }, { x: Number.NaN, y: 0 }])).toEqual([{ x: 1, y: 2 }]);
  });
  it("draws a port rounding anticlockwise over the north of the mark, starboard clockwise", () => {
    const centre = { x: 100, y: 100 };
    const turning = (arc: { x: number; y: number }[]) => {
      // Signed area round the mark with y growing south: negative is anticlockwise as seen on the map.
      let area = 0;
      const r = arc.map(p => ({ x: p.x - centre.x, y: p.y - centre.y }));
      for (let i = 0; i < r.length - 1; i++) area += r[i].x * r[i + 1].y - r[i + 1].x * r[i].y;
      return Math.sign(area);
    };
    const port = roundingArc(centre, 10, "port"), starboard = roundingArc(centre, 10, "starboard");
    expect(port[0].x).toBeCloseTo(110); expect(port.at(-1)!.x).toBeCloseTo(90);
    expect(starboard[0].x).toBeCloseTo(90); expect(starboard.at(-1)!.x).toBeCloseTo(110);
    expect(Math.min(...port.map(p => p.y))).toBeCloseTo(90);
    expect(turning(port)).toBe(-1);
    expect(turning(starboard)).toBe(1);
  });
});
