import { describe, expect, it } from "vitest";
import {
  angleDiff, attachLine, clearance, createHarbourState, hullWorld, KNOT, OUR_YACHT, rect, releaseLine, speedKnots, stepHarbour, toBody, toWorld,
  type HarbourInput, type HarbourState, type HarbourWorld, type HarbourYacht,
} from "./index";
import { DEFAULT_BOAT } from "../sailing-physics/boat";

const calm: HarbourWorld = { obstacles: [], wind: { speed: 0, direction: 0 } };
const windFrom = (speed: number, direction: number): HarbourWorld => ({ obstacles: [], wind: { speed, direction } });
function run(s: HarbourState, input: HarbourInput, world: HarbourWorld, seconds: number, yacht: HarbourYacht = OUR_YACHT) {
  for (let i = 0; i < Math.round(seconds * 60); i++) s = stepHarbour(s, input, world, yacht).state;
  return s;
}
const rest = (heading = 0) => createHarbourState({ x: 0, y: 0, heading });

describe("our yacht in the harbour", () => {
  it("reads hull length and displacement from the sailing engine instead of copying them", () => {
    expect(OUR_YACHT.loa).toBe(DEFAULT_BOAT.loa);
    expect(OUR_YACHT.displacement).toBe(DEFAULT_BOAT.displacement);
    expect(OUR_YACHT.surgeQuadratic).toBe(DEFAULT_BOAT.hullDragK);
  });

  it("a stopped boat with no wind stays exactly where it is", () => {
    const s = run(rest(37), { helm: 0, throttle: 0 }, calm, 120);
    expect([s.x, s.y, s.heading, s.u, s.v, s.r]).toEqual([0, 0, 37, 0, 0, 0]);
    // Turning the wheel in neutral without flow moves nothing either.
    const wheel = run(rest(37), { helm: 1, throttle: 0 }, calm, 30);
    expect(Math.hypot(wheel.x, wheel.y)).toBe(0);
    expect(wheel.heading).toBe(37);
  });

  it("throttle sets speed with inertia, three inputs give three different speeds", () => {
    const slow = run(rest(), { helm: 0, throttle: 0.4 }, calm, 60);
    const full = run(rest(), { helm: 0, throttle: 1 }, calm, 60);
    const astern = run(rest(), { helm: 0, throttle: -1 }, calm, 60);
    const early = run(rest(), { helm: 0, throttle: 1 }, calm, 3);
    expect(speedKnots(slow)).toBeGreaterThan(3.3);
    expect(speedKnots(slow)).toBeLessThan(4.2);
    expect(speedKnots(full)).toBeGreaterThan(5.6);
    expect(speedKnots(full)).toBeLessThan(6.8);
    expect(speedKnots(astern)).toBeLessThan(-3);
    expect(speedKnots(astern)).toBeGreaterThan(-5);
    // Eight tonnes do not jump to speed: after 3 s at full ahead well under 2.5 kn.
    expect(speedKnots(early)).toBeLessThan(2.5);
  });

  it("stopping: coasting carries way far, astern stops within about a boat length", () => {
    const stop = (throttle: number) => {
      let s = createHarbourState({ x: 0, y: 0, heading: 0 }, { u: 3 * KNOT, gear: 1 }), t = 0;
      while (speedKnots(s) > 0.1 && t < 300) { s = stepHarbour(s, { helm: 0, throttle }, calm).state; t += 1 / 60; }
      return { t, distance: s.y };
    };
    const coast = stop(0), slow = stop(-0.4), full = stop(-1);
    expect(coast.distance).toBeGreaterThan(35);
    expect(slow.distance).toBeLessThan(15);
    expect(full.distance).toBeLessThan(slow.distance);
    expect(full.distance).toBeGreaterThan(4);
    expect(full.t).toBeLessThan(slow.t);
  });

  it("gearbox waits in neutral when going from ahead to astern", () => {
    let s = run(rest(), { helm: 0, throttle: 1 }, calm, 5);
    let neutralSteps = 0;
    for (let i = 0; i < 120; i++) { s = stepHarbour(s, { helm: 0, throttle: -1 }, calm).state; if (s.gear === 0) neutralSteps++; }
    expect(neutralSteps / 60).toBeGreaterThanOrEqual(OUR_YACHT.gearShift - 1 / 60);
    expect(s.gear).toBe(-1);
  });

  it("prop walk: a right-handed prop kicks the stern to port astern, a left-handed one to starboard", () => {
    for (const throttle of [-0.4, -1]) {
      const right = run(rest(), { helm: 0, throttle }, calm, 8);
      const left = run(rest(), { helm: 0, throttle }, calm, 8, { ...OUR_YACHT, propHand: "left" });
      // Stern to port means the bow swings to starboard: heading increases.
      expect(angleDiff(right.heading, 0)).toBeGreaterThan(6);
      expect(angleDiff(left.heading, 0)).toBeLessThan(-6);
      // The transom really moved to port of where it started.
      const stern = toWorld(right, [-OUR_YACHT.loa / 2, 0]);
      expect(toBody({ x: 0, y: 0, heading: 0 }, stern)[1]).toBeLessThan(-0.5);
    }
    // Ahead the walk is weaker and the other way.
    const ahead = stepHarbour(run(rest(), { helm: 0, throttle: 1 }, calm, 2), { helm: 0, throttle: 1 }, calm).diag;
    const astern = stepHarbour(run(rest(), { helm: 0, throttle: -1 }, calm, 2), { helm: 0, throttle: -1 }, calm).diag;
    expect(Math.sign(ahead.propWalkForce)).toBe(-Math.sign(astern.propWalkForce));
    expect(Math.abs(ahead.propWalkForce)).toBeLessThan(Math.abs(astern.propWalkForce));
  });

  it("rudder needs water flow: prop wash steers ahead from rest, nothing steers astern from rest", () => {
    const turn = (throttle: number, seconds: number) => angleDiff(
      run(rest(), { helm: 1, throttle }, calm, seconds).heading, run(rest(), { helm: -1, throttle }, calm, seconds).heading);
    expect(Math.abs(turn(-1, 3))).toBeLessThan(0.5);
    expect(turn(0.4, 3)).toBeGreaterThan(5);
    expect(turn(1, 3)).toBeGreaterThan(turn(0.4, 3));
    // With real sternway the rudder bites, reversed: wheel to starboard, stern to starboard, bow to port.
    const sternway = () => createHarbourState({ x: 0, y: 0, heading: 0 }, { u: -2 * KNOT, gear: -1, engine: -0.4 });
    const a = run(sternway(), { helm: 1, throttle: -0.4 }, calm, 5), b = run(sternway(), { helm: -1, throttle: -0.4 }, calm, 5);
    expect(angleDiff(a.heading, b.heading)).toBeLessThan(-5);
  });

  it("turning circle at slow ahead with full rudder is about two boat lengths", () => {
    let s = run(rest(), { helm: 0, throttle: 0.4 }, calm, 40);
    let minX = Infinity, maxX = -Infinity;
    for (let i = 0; i < 120 * 60; i++) {
      s = stepHarbour(s, { helm: 1, throttle: 0.4 }, calm).state;
      if (i > 3600) { minX = Math.min(minX, s.x); maxX = Math.max(maxX, s.x); }
    }
    expect((maxX - minX) / OUR_YACHT.loa).toBeGreaterThan(1.2);
    expect((maxX - minX) / OUR_YACHT.loa).toBeLessThan(2.5);
  });

  it("wind blows the bow off downwind and drifts the boat to leeward", () => {
    const offWind = (speed: number) => Math.abs(angleDiff(run(rest(5), { helm: 0, throttle: 0 }, windFrom(speed, 0), 60).heading, 0));
    expect(offWind(8)).toBeGreaterThan(10);
    expect(offWind(15)).toBeGreaterThan(45);
    expect(offWind(25)).toBeGreaterThan(offWind(15));
    // Beam on to 15 kn: leeward drift near 0.5-1 kn, bow falling off to leeward.
    const beam = run(rest(90), { helm: 0, throttle: 0 }, windFrom(15, 0), 20);
    expect(beam.y).toBeLessThan(-2);
    expect(Math.hypot(beam.u, beam.v) / KNOT).toBeGreaterThan(0.4);
    expect(Math.hypot(beam.u, beam.v) / KNOT).toBeLessThan(1.1);
    expect(beam.heading).toBeGreaterThan(95);
    // The same from the other side mirrors the swing.
    const mirror = run(rest(270), { helm: 0, throttle: 0 }, windFrom(15, 0), 20);
    expect(angleDiff(mirror.heading, 270)).toBeCloseTo(-angleDiff(beam.heading, 90), 6);
  });

  it("detects contacts, scores their energy and never lets the hull pass through", () => {
    const pontoon = { id: "p", kind: "pontoon" as const, shape: { type: "poly" as const, points: rect(0, 12, 40, 2) } };
    const world: HarbourWorld = { obstacles: [pontoon], wind: { speed: 0, direction: 0 } };
    const hit = (kn: number) => {
      let s = createHarbourState({ x: 0, y: 4, heading: 0 }, { u: kn * KNOT }), maxDepth = -Infinity;
      for (let i = 0; i < 600; i++) {
        s = stepHarbour(s, { helm: 0, throttle: 0 }, world).state;
        maxDepth = Math.max(maxDepth, toWorld(s, [OUR_YACHT.loa / 2, 0])[1] - 11);
      }
      return { s, maxDepth };
    };
    const soft = hit(0.5), hard = hit(2);
    expect(soft.s.contacts).toHaveLength(1);
    expect(soft.s.contacts[0]).toMatchObject({ obstacleId: "p", kind: "pontoon" });
    expect(hard.s.contacts[0].speed).toBeGreaterThan(soft.s.contacts[0].speed * 2);
    expect(hard.s.contacts[0].energy).toBeGreaterThan(soft.s.contacts[0].energy * 4);
    expect(hard.maxDepth).toBeLessThan(0.3);
    expect(hard.s.u).toBeLessThan(0.3);
    // Piles and buoys (circles) are found too, including against the side of the hull.
    const pile: HarbourWorld = { obstacles: [{ id: "pile", kind: "pile", shape: { type: "circle", x: 3, y: 0, r: 0.2 } }], wind: { speed: 10, direction: 270 } };
    let drift = rest(), minGap = Infinity;
    for (let i = 0; i < 15 * 60; i++) {
      drift = stepHarbour(drift, { helm: 0, throttle: 0 }, pile).state;
      minGap = Math.min(minGap, clearance(hullWorld(drift), { type: "circle", x: 3, y: 0, r: 0 }));
    }
    expect(drift.contacts.length).toBeGreaterThan(0);
    expect(drift.contacts.every(c => c.obstacleId === "pile")).toBe(true);
    // Wind drift speed at first touch, and the pile never gets inside the hull.
    expect(drift.contacts[0].speed).toBeGreaterThan(0.05);
    expect(drift.contacts[0].speed).toBeLessThan(0.6);
    expect(minGap).toBeGreaterThan(0.1);
  });

  it("a mooring line holds the boat; releasing it lets the wind take her", () => {
    const line = { id: "bow", cleat: [OUR_YACHT.loa / 2, 0] as const, anchor: [0, 12] as const, length: 5 };
    const world = windFrom(15, 0);
    let s = attachLine(rest(), line);
    s = run(s, { helm: 0, throttle: 0 }, world, 60);
    const cleat = toWorld(s, line.cleat);
    expect(Math.hypot(cleat[0] - line.anchor[0], cleat[1] - line.anchor[1])).toBeLessThan(line.length + 0.3);
    // Lying to a buoy the bow points roughly into the wind.
    expect(Math.abs(angleDiff(s.heading, 0))).toBeLessThan(25);
    const free = run(releaseLine(s, "bow"), { helm: 0, throttle: 0 }, world, 30);
    expect(free.y).toBeLessThan(s.y - 3);
  });

  it("is deterministic and finite", () => {
    const world: HarbourWorld = { obstacles: [{ id: "b", kind: "boat", shape: { type: "poly", points: rect(6, 0, 4, 12) } }], wind: { speed: 22, direction: 250 } };
    const inputs = (i: number): HarbourInput => ({ helm: Math.sin(i / 50), throttle: Math.cos(i / 90) });
    let a = rest(), b = rest();
    for (let i = 0; i < 3000; i++) { a = stepHarbour(a, inputs(i), world).state; b = stepHarbour(b, inputs(i), world).state; }
    expect(a).toEqual(b);
    expect([a.x, a.y, a.u, a.v, a.r, a.heading].every(Number.isFinite)).toBe(true);
  });
});
