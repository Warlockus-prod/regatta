import { describe, expect, it } from "vitest";
import { guidanceToTarget, planRaceGuidance, turnAhead, TURN_AHEAD, type RaceGuidance, type RaceGuidanceState } from "@/lib/race-guidance";
import { makeStandardCourse, type RaceBoat } from "@/lib/race-physics";
import { METRES_PER_UNIT } from "@/features/race-3d/pose";
import { routeCaption } from "./route-caption";
import { ROUTE_CAPTION_COPY } from "./RouteCaption";

// Package 8 contract (TestFlight 74 feedback): the route caption says when
// the hint will call the next tack or gybe and on what course, and that
// moment is the one the same planner calls when the boat gets there.

const course = makeStandardCourse();
const boatAt = (x: number, y: number, heading: number, extra: Partial<RaceBoat> = {}): RaceBoat => ({
  id: "p", pos: { x, y }, heading, speed: 6, lapDone: 0, started: true, roundPhase: 0, isPlayer: true, ...extra,
} as RaceBoat);
const plan = (probe: RaceBoat, memory: RaceGuidanceState | null) => planRaceGuidance(probe, course, 0, memory, 42);

describe("route caption wording", () => {
  const g = (patch: Partial<RaceGuidance>): RaceGuidance => ({ leg: "windward", action: "hold", target: { x: 0, y: 0 }, distance: 500, bearing: 0,
    suggestedHeading: 42, turn: 0, targetInNoGo: true, tack: "starboard", ...patch });

  it("names a tack or gybe called now with the new course", () => {
    expect(routeCaption(g({ action: "tack", suggestedHeading: 318 }))).toMatchObject({ kind: "tack-now", course: 318 });
    expect(routeCaption(g({ action: "gybe", suggestedHeading: 200, leg: "finish" }))).toMatchObject({ kind: "gybe-now", course: 200 });
  });

  it("names the turn ahead: the course to hold, how far, and the course after it, in whole tens of metres", () => {
    const m = routeCaption(g({ suggestedHeading: 42.4, next: { distance: 205, action: "tack", heading: 317.6 } }));
    expect(m).toEqual({ kind: "tack-ahead", hold: 42, course: 318, turnIn: Math.round(205 * METRES_PER_UNIT / 10) * 10, target: 300 });
    expect(routeCaption(g({ next: { distance: 4, action: "gybe", heading: 140 } }))).toMatchObject({ kind: "gybe-now", course: 140, hold: 140 });
  });

  it("holds or steers when no turn is ahead, and leaves the rounding and the return to the hint's own words", () => {
    expect(routeCaption(g({ next: null })).kind).toBe("hold");
    expect(routeCaption(g({ action: "steer-port", suggestedHeading: -5 }))).toMatchObject({ kind: "steer", course: 355 });
    for (const action of ["round-port", "return-start"] as const) expect(routeCaption(g({ action })).kind).toBe("other");
    expect(routeCaption(g({ leg: "complete" })).kind).toBe("other");
  });

  it("has all seven languages with every placeholder, and no typographic dashes or quotes", () => {
    for (const [kind, copy] of Object.entries(ROUTE_CAPTION_COPY)) {
      expect(Object.keys(copy)).toEqual(["ru", "en", "pl", "es", "fr", "de", "it"]);
      for (const text of Object.values(copy)) {
        for (const slot of kind.endsWith("ahead") ? ["{h}", "{d}", "{c}"] : ["{c}"]) expect(text).toContain(slot);
        expect(text).not.toMatch(new RegExp("[\\u2013\\u2014\\u2026\\u201c\\u201d]"));
      }
    }
    expect(ROUTE_CAPTION_COPY["tack-ahead"].pl).toContain("zwrot przez sztag");
  });
});

describe("turn ahead (race-guidance.ts)", () => {
  it("finds the tack the planner calls further up the beat, and the planner calls it there", () => {
    let boat = boatAt(400, 1000, 42);
    let first = plan(boat, null);
    // Sail the suggested course until the hint is steady on it.
    for (let i = 0; i < 6 && first.guidance!.action !== "hold"; i++) {
      boat = { ...boat, heading: first.guidance!.suggestedHeading };
      first = plan(boat, first.state);
    }
    const g = first.guidance!;
    expect(g.action).toBe("hold");
    const next = turnAhead(boat, g, first.state, plan);
    expect(next).not.toBeNull();
    expect(next!.action).toBe("tack");
    expect(next!.distance).toBeGreaterThan(0);
    expect(next!.distance).toBeLessThanOrEqual(TURN_AHEAD.reach);
    // The new course is on the other tack, the solver's angle off the wind.
    expect(Math.abs(((next!.heading - g.suggestedHeading + 540) % 360) - 180)).toBeGreaterThan(60);
    // Walking the boat there by hand, the planner calls the tack at that point and not before.
    const r = g.suggestedHeading * Math.PI / 180;
    let memory = first.state;
    let walked = { ...boat, heading: g.suggestedHeading };
    for (let d = TURN_AHEAD.step; d <= next!.distance; d += TURN_AHEAD.step) {
      walked = { ...walked, pos: { x: walked.pos.x + Math.sin(r) * TURN_AHEAD.step, y: walked.pos.y - Math.cos(r) * TURN_AHEAD.step } };
      const at = plan(walked, memory);
      memory = at.state;
      expect(at.guidance!.action === "tack").toBe(d === next!.distance);
    }
  });

  it("says now for a tack called now, nothing before the start or round the mark, and leaves the boat alone", () => {
    const boat = boatAt(400, 1000, 42);
    const tackNow: RaceGuidance = { ...plan(boat, null).guidance!, action: "tack", suggestedHeading: 318 };
    expect(turnAhead(boat, tackNow, null, plan)).toEqual({ distance: 0, action: "tack", heading: 318 });
    for (const leg of ["start", "round-port", "complete"] as const) expect(turnAhead(boat, { ...tackNow, action: "hold", leg }, null, plan)).toBeNull();
    const before = JSON.stringify(boat);
    turnAhead(boat, { ...tackNow, action: "hold" }, null, plan);
    expect(JSON.stringify(boat)).toBe(before);
  });

  it("announces no turn beyond the target: the walk stops once it has passed it", () => {
    // A planner that holds south to a target beside the track and turns back
    // up only beyond it (as the finish loop does past the line).
    const target = { x: 0, y: 100 };
    const fake = (probe: { pos: { x: number; y: number }; heading: number }) => ({ state: null, guidance: {
      leg: "finish" as const, action: probe.pos.y > 150 ? "tack" as const : "hold" as const, target, distance: Math.hypot(probe.pos.x - target.x, probe.pos.y - target.y),
      bearing: 180, suggestedHeading: probe.pos.y > 150 ? 20 : 180, turn: 0 as const, targetInNoGo: false, tack: null } });
    const boat = { pos: { x: 30, y: 0 }, heading: 180 };
    expect(turnAhead(boat, fake(boat).guidance, null, fake)).toBeNull();
    // The same turn before the target is announced.
    const early = (probe: { pos: { x: number; y: number }; heading: number }) => ({ ...fake(probe), guidance: { ...fake(probe).guidance, action: probe.pos.y > 60 ? "gybe" as const : "hold" as const } });
    expect(turnAhead(boat, early(boat).guidance, null, early)).toMatchObject({ action: "gybe", distance: 80 });
  });

  it("online: the layline to a waypoint in the no-go zone, from the waypoint aid alone", () => {
    const target = { x: 400, y: 200 };
    const boat = { pos: { x: 330, y: 700 }, heading: 45 };
    const g = guidanceToTarget(boat, target, 0);
    expect(g.action).toBe("hold");
    const next = turnAhead(boat, g, null, probe => ({ guidance: guidanceToTarget(probe, target, 0), state: null }));
    expect(next?.action).toBe("tack");
    // The layline: the waypoint bears 45 degrees off the wind on the other side there.
    const r = 45 * Math.PI / 180;
    const at = { x: boat.pos.x + Math.sin(r) * next!.distance, y: boat.pos.y - Math.cos(r) * next!.distance };
    const bearing = Math.atan2(target.x - at.x, -(target.y - at.y)) * 180 / Math.PI;
    expect(Math.abs(bearing + 45)).toBeLessThan(4);
  });
});
