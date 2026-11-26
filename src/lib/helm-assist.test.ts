import { describe, expect, it } from "vitest";
import { helmProfileFor } from "@/features/race-hud/target";
import { NO_GO_HALF_DEG } from "@/lib/sailing-physics/constants";
import {
  HELM_ASSIST, createHelmAssist, helmTurnToward, ironsEscape, remainingTurn, requestHelmTurn, setHelmHold, stepHelmAssist,
  tackTarget, twaOf, type HelmAssistState, type HelmProfile, type HelmTick,
} from "./helm-assist";

// Contracts of the helm assist controller (ADR-0022). A tiny boat model
// follows the assist's heading at 40 deg/s and the polar speed with a lag, so
// the tests watch what the boat does over time, on three winds (D1).

const WIND = 0;
const WINDS = [6, 12, 20] as const;
const wrap = (d: number) => ((((d + 180) % 360) + 360) % 360) - 180;

interface Sim { state: HelmAssistState; heading: number; speed: number; course: number | null; t: number; twas: number[] }
function sim(profile: HelmProfile, heading: number, speed?: number): Sim {
  return { state: createHelmAssist(), heading, speed: speed ?? profile.speedAt(Math.abs(twaOf(heading, WIND))), course: null, t: 0, twas: [] };
}
function run(s: Sim, profile: HelmProfile, seconds: number, extra: Partial<HelmTick> = {}, dt = 0.05): string[] {
  const events: string[] = [];
  for (let i = 0; i < Math.round(seconds / dt); i++) {
    const r = stepHelmAssist(s.state, { dt, heading: s.heading, windDir: WIND, speedKn: s.speed, manual: 0, arrows: 0, nudgeDeg: 0,
      courseHold: s.course, markTwa: 0, profile, ...extra });
    s.state = r.state; s.course = r.courseHold;
    if (r.event) events.push(r.event);
    if (r.heading !== null) s.heading = (s.heading + Math.max(-40 * dt, Math.min(40 * dt, wrap(r.heading - s.heading))) + 360) % 360;
    const target = profile.speedAt(Math.abs(twaOf(s.heading, WIND)));
    s.speed += (target - s.speed) * Math.min(1, dt / 2);
    s.t += dt; s.twas.push(twaOf(s.heading, WIND));
  }
  return events;
}

describe("tack and gybe target with the no-go protection", () => {
  for (const tws of WINDS) {
    const p = helmProfileFor(tws, "cruiser");
    it(`cruiser ${tws} kn`, () => {
      expect(tackTarget(45, p)).toEqual({ kind: "tack", targetTwa: -45, dir: -1 });
      expect(tackTarget(-50, p)).toEqual({ kind: "tack", targetTwa: 50, dir: 1 });
      // A pinch inside the zone ends on the best upwind angle, never inside the zone.
      const out = tackTarget(30, p);
      expect(out.targetTwa).toBe(-Math.max(NO_GO_HALF_DEG, p.angles.upwind.twa));
      expect(Math.abs(out.targetTwa)).toBeGreaterThanOrEqual(NO_GO_HALF_DEG);
      expect(tackTarget(150, p)).toEqual({ kind: "gybe", targetTwa: -150, dir: 1 });
      expect(tackTarget(-120, p)).toEqual({ kind: "gybe", targetTwa: 120, dir: -1 });
      expect(tackTarget(89, p).kind).toBe("tack");
      expect(tackTarget(90, p).kind).toBe("gybe");
    });
  }
  it("the classic boat's zone is 30 degrees", () => {
    const p = helmProfileFor(12, "classic");
    expect(tackTarget(35, p).targetTwa).toBe(-35);
    expect(tackTarget(20, p).targetTwa).toBe(-40);
  });
  it("counts the degrees left along the turn, 0 once past", () => {
    const turn = { targetTwa: -45, dir: -1 as const };
    expect(remainingTurn(45, turn)).toBe(90);
    expect(remainingTurn(0, turn)).toBe(45);
    expect(remainingTurn(-46, turn)).toBe(0);
    expect(remainingTurn(-150, { targetTwa: 150, dir: -1 })).toBe(60);
  });
});

describe("a button turn on three winds", () => {
  for (const tws of WINDS) {
    const p = helmProfileFor(tws, "cruiser");
    it(`tacks through the wind and lands on the mirrored angle, ${tws} kn`, () => {
      const s = sim(p, 45);
      s.state = requestHelmTurn(s.state, { twa: 45, courseHold: null, profile: p });
      const events = run(s, p, 8);
      expect(events).toContain("turn-done");
      expect(s.state.turn).toBeNull();
      expect(Math.min(...s.twas.map(Math.abs))).toBeLessThan(2); // passed head to wind
      expect(Math.max(...s.twas.map(Math.abs))).toBeLessThanOrEqual(46); // never bore away through the run
      expect(Math.abs(twaOf(s.heading, WIND) + 45)).toBeLessThanOrEqual(HELM_ASSIST.turnDoneDeg);
      expect(s.state.usage.buttonTurns).toBe(1);
    });
    it(`gybes through dead downwind, ${tws} kn`, () => {
      const s = sim(p, 150);
      s.state = requestHelmTurn(s.state, { twa: 150, courseHold: null, profile: p });
      run(s, p, 6);
      expect(Math.max(...s.twas.map(Math.abs))).toBeGreaterThan(178);
      expect(Math.min(...s.twas.map(Math.abs))).toBeGreaterThanOrEqual(146);
      expect(Math.abs(twaOf(s.heading, WIND) + 150)).toBeLessThanOrEqual(HELM_ASSIST.turnDoneDeg);
    });
  }

  it("BEST VMG survives the tack and sails the best angle on the new side", () => {
    const p = helmProfileFor(12, "cruiser");
    const s = sim(p, 60);
    s.state = setHelmHold(s.state, "vmg", 60);
    run(s, p, 4);
    expect(twaOf(s.heading, WIND)).toBeCloseTo(p.angles.upwind.twa, 0);
    s.state = requestHelmTurn(s.state, { twa: twaOf(s.heading, WIND), courseHold: null, profile: p });
    const events = run(s, p, 8);
    expect(events).toContain("turn-done");
    expect(s.state.hold).toBe("vmg");
    expect(twaOf(s.heading, WIND)).toBeCloseTo(-p.angles.upwind.twa, 0);
    expect(s.state.usage.bestVmgSec).toBeCloseTo(12, 1);
  });

  it("a course hold resumes on the new course after the tack", () => {
    const p = helmProfileFor(12, "classic");
    const s = sim(p, 45);
    s.course = 45;
    s.state = requestHelmTurn(s.state, { twa: 45, courseHold: 45, profile: p });
    run(s, p, 6);
    expect(s.course).not.toBeNull();
    expect(Math.abs(wrap(s.course! - 315))).toBeLessThanOrEqual(HELM_ASSIST.turnDoneDeg);
  });

  it("a second press during the turn is ignored", () => {
    const p = helmProfileFor(12, "classic");
    const first = requestHelmTurn(createHelmAssist(), { twa: 45, courseHold: null, profile: p });
    expect(requestHelmTurn(first, { twa: 10, courseHold: null, profile: p })).toBe(first);
  });

  it("a turn that stalls is given up after the timeout", () => {
    const p = helmProfileFor(12, "cruiser");
    let state = requestHelmTurn(createHelmAssist(), { twa: 45, courseHold: null, profile: p });
    let event: string | null = null;
    for (let t = 0; t <= HELM_ASSIST.turnTimeoutSec + 0.1; t += 0.1) {
      const r = stepHelmAssist(state, { dt: 0.1, heading: 45, windDir: WIND, speedKn: 0, manual: 0, arrows: 0, nudgeDeg: 0, courseHold: null, markTwa: 0, profile: p });
      state = r.state; event = r.event ?? event;
    }
    expect(state.turn).toBeNull();
    expect(event).toBe("turn-cancelled");
  });
});

describe("manual helm, Simple arrows and the angle hold", () => {
  const p = helmProfileFor(12, "cruiser");

  it("any manual rudder switches BEST VMG and the turn off", () => {
    const s = sim(p, 50);
    s.state = setHelmHold(s.state, "vmg", 50);
    s.state = requestHelmTurn(s.state, { twa: 50, courseHold: null, profile: p });
    const r = stepHelmAssist(s.state, { dt: .05, heading: 50, windDir: WIND, speedKn: 6, manual: -1, arrows: 0, nudgeDeg: 0, courseHold: 50, markTwa: 0, profile: p });
    expect(r.event).toBe("vmg-off");
    expect(r.state.hold).toBe("off");
    expect(r.state.turn).toBeNull();
    expect(r.heading).toBeNull();
    expect(r.courseHold).toBeNull();
  });

  it("Simple arrows move the course 30 deg/s, a tap 2 degrees, and switch BEST VMG off", () => {
    const s = sim(p, 50);
    s.course = 50;
    run(s, p, 1, { arrows: 1 });
    expect(s.course).toBeCloseTo(80, 6);
    const tap = stepHelmAssist(s.state, { dt: .05, heading: s.heading, windDir: WIND, speedKn: s.speed, manual: 0, arrows: 0, nudgeDeg: -HELM_ASSIST.arrowStepDeg, courseHold: s.course, markTwa: 0, profile: p });
    expect(tap.courseHold).toBeCloseTo(78, 6);
    const vmg = setHelmHold(createHelmAssist(), "vmg", 50);
    const off = stepHelmAssist(vmg, { dt: .05, heading: 50, windDir: WIND, speedKn: 6, manual: 0, arrows: -1, nudgeDeg: 0, courseHold: null, markTwa: 0, profile: p });
    expect(off.event).toBe("vmg-off");
    expect(off.state.hold).toBe("off");
    expect(off.courseHold).toBeCloseTo(48.5, 6);
  });

  it("the angle hold follows a wind shift and the arrows move the held angle", () => {
    const state = setHelmHold(createHelmAssist(), "wind", 52.4);
    const shifted = stepHelmAssist(state, { dt: .05, heading: 52, windDir: 10, speedKn: 6, manual: 0, arrows: 0, nudgeDeg: 0, courseHold: null, markTwa: 0, profile: p });
    expect(shifted.heading).toBe(62);
    const nudged = stepHelmAssist(state, { dt: .05, heading: 52, windDir: 0, speedKn: 6, manual: 0, arrows: 0, nudgeDeg: 2, courseHold: null, markTwa: 0, profile: p });
    expect(nudged.state.hold).toBe("wind");
    expect(nudged.heading).toBe(54);
  });
});

describe("out of irons", () => {
  for (const tws of WINDS) {
    const p = helmProfileFor(tws, "cruiser");
    it(`a held boat stopped head to wind bears away to close-hauled, ${tws} kn`, () => {
      expect(ironsEscape(5, 0.2, p)).toBe(Math.max(NO_GO_HALF_DEG, p.angles.upwind.twa));
      expect(ironsEscape(-5, 0.2, p)).toBe(-Math.max(NO_GO_HALF_DEG, p.angles.upwind.twa));
      expect(ironsEscape(5, 3, p)).toBeNull();
      expect(ironsEscape(60, 0, p)).toBeNull();
      const s = sim(p, 3, 0);
      s.course = 3;
      const events = run(s, p, 6);
      expect(events).toContain("irons");
      expect(Math.abs(twaOf(s.heading, WIND))).toBeGreaterThanOrEqual(NO_GO_HALF_DEG - 1);
    });
  }
  it("a boat without any hold is left alone", () => {
    const p = helmProfileFor(12, "cruiser");
    const s = sim(p, 3, 0);
    expect(run(s, p, 6)).not.toContain("irons");
    expect(s.heading).toBe(3);
  });
});

describe("heading to the race's turn input", () => {
  it("full helm from 12 degrees off, either way round", () => {
    expect(helmTurnToward(10, 40)).toBe(1);
    expect(helmTurnToward(10, 4)).toBeCloseTo(-0.5, 6);
    expect(helmTurnToward(350, 5)).toBeCloseTo(1, 6);
  });
});
