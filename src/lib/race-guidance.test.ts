import { describe, expect, it } from "vitest";
import { raceGuidance } from "./race-guidance";
import { angleDiff, makeStandardCourse, raceTrim, raceTurnRate, stepBoat, type InputState, type RaceBoat } from "./race-physics";

const boat = (patch: Partial<RaceBoat> = {}): RaceBoat => ({ id: "player", name: "Player", color: "cyan", pos: { x: 400, y: 700 }, heading: 90, speed: 0, lapDone: 0, started: true, ...patch });
function sail(input: InputState, seconds = 60): RaceBoat {
  const b = boat();
  for (let i = 0; i < seconds * 20; i++) stepBoat(b, .05, 0, 1, input);
  return b;
}

describe("race player controls", () => {
  it("makes manual sheets affect boat speed while automatic trim keeps the original optimum", () => {
    const automatic = sail({ turn: 0 });
    const overtrimmed = sail({ turn: 0, autoTrim: false, trim: { mainSheet: 1, jibSheet: 1 } });
    const eased = sail({ turn: 0, autoTrim: false, trim: { mainSheet: 0, jibSheet: 0 } });
    expect(automatic.speed).toBeGreaterThan(5);
    expect(overtrimmed.speed).toBeLessThan(automatic.speed * .75);
    expect(eased.speed).toBeLessThan(automatic.speed * .75);
    expect(overtrimmed.trim!.mainSheet).toBe(1);
    expect(overtrimmed.trim!.jibSheet).toBe(1);
    expect(eased.trim!.mainSheet).toBe(0);
    expect(eased.trim!.jibSheet).toBe(0);
  });

  it("keeps deployment under player control even when sheets trim automatically", () => {
    const lowered = sail({ turn: 0, trim: { mainHoisted: false, jibFurl: 1 } });
    expect(lowered.speed).toBeLessThan(.05);
    expect(lowered.trim?.mainHoisted).toBe(false);
    expect(lowered.trim?.jibFurl).toBe(1);
    const a = sail({ turn: 0 }, 10), b = sail({ turn: 0, autoTrim: true }, 10);
    expect(b).toEqual(a);
  });

  it("returns from manual to automatic trim immediately and retains optional sail deployment", () => {
    const b = sail({ turn: 0, autoTrim: false, trim: { mainSheet: 1, jibSheet: 1, reef: .4 } }, 5);
    stepBoat(b, .05, 0, 1, { turn: 0, autoTrim: true, trim: { reef: .4 } });
    expect(b.trim?.mainSheet).toBeLessThan(.9);
    expect(b.trim?.reef).toBe(.4);
    expect(b.trimClock).toBe(0);
  });

  it("sanitizes invalid controls and preserves the caller's values", () => {
    const raw = { mainSheet: 2, jibSheet: -2, reef: Number.NaN, mainTwist: Infinity, mainHoisted: false };
    const trim = raceTrim(raw);
    expect(trim).toMatchObject({ mainSheet: 1, jibSheet: 0, reef: 0, mainTwist: .35, mainHoisted: false });
    expect(raw.mainSheet).toBe(2);
    const b = boat({ speed: 4 });
    stepBoat(b, .05, 0, 1, { turn: Number.NaN, autoTrim: false, trim: raw });
    expect(Number.isFinite(b.speed)).toBe(true);
    expect(b.heading).toBe(90);
    const copy = structuredClone(b);
    stepBoat(b, Number.NaN, 0, 1, { turn: 1 });
    expect(b).toEqual(copy);
  });

  it("matches native trainer responsiveness only when the solo player opts in", () => {
    expect(raceTurnRate(6)).toBe(22);
    expect(raceTurnRate(6, "responsive")).toBe(40);
    expect(raceTurnRate(0)).toBe(0);
    expect(raceTurnRate(0, "responsive")).toBe(8);
    // At 6 knots our 8 world units/knot/s formerly made a 125-unit radius.
    // The native trainer turns at 0.7 rad/s (40.1 deg/s); player assist now matches it.
    const radius = (rate: number) => 6 * 8 / (rate * Math.PI / 180);
    expect(radius(raceTurnRate(6))).toBeCloseTo(125, 0);
    expect(radius(raceTurnRate(6, "responsive"))).toBeCloseTo(68.75, 1);
    const old = boat({ speed: 6 }), responsive = structuredClone(old);
    for (let i = 0; i < 20; i++) {
      stepBoat(old, .05, 0, 1, { turn: 1 });
      stepBoat(responsive, .05, 0, 1, { turn: 1 }, { steering: "responsive" });
    }
    expect(angleDiff(90, responsive.heading)).toBeGreaterThan(angleDiff(90, old.heading) * 1.7);
    expect(angleDiff(90, responsive.heading)).toBeCloseTo(40, 3);
  });

  it("lets assisted players recover a course at rest without changing legacy rudder authority", () => {
    const legacy = boat({ heading: 0 }), responsive = structuredClone(legacy);
    stepBoat(legacy, .05, 0, 1, { turn: 1 });
    stepBoat(responsive, .05, 0, 1, { turn: 1 }, { steering: "responsive" });
    expect(legacy.heading).toBe(0);
    expect(responsive.heading).toBeCloseTo(.4);
  });
});

describe("read-only race route guidance", () => {
  const course = makeStandardCourse();
  it("offers a sailable upwind course and keeps the current tack instead of pointing into no-go", () => {
    const b = boat({ heading: 315 });
    const before = structuredClone(b);
    const hint = raceGuidance(b, course, 0);
    expect(hint.targetInNoGo).toBe(true);
    expect(hint.suggestedHeading).toBe(315);
    expect(hint.tack).toBe("starboard");
    expect(b).toEqual(before);
  });
  it("guides an early starter back before the line without mutating the boat", () => {
    const b = boat({ pos: { x: 400, y: 1020 }, started: false, heading: 90 });
    const hint = raceGuidance(b, course, 0);
    expect(hint.leg).toBe("return-start");
    expect(hint.action).toBe("return-start");
    expect(hint.target.y).toBeGreaterThan(course.startLine.a.y);
    expect(b.returningToStart).toBeUndefined();
  });
  it("follows all three port-rounding gates, then the finish", () => {
    const b = boat({ pos: { x: 460, y: 180 }, heading: 315, roundPhase: 1 });
    const north = raceGuidance(b, course, 0);
    expect(north.leg).toBe("round-port");
    expect(north.target.x).toBeLessThan(course.marks[0].pos.x);
    expect(north.target.y).toBeLessThan(course.marks[0].pos.y);
    b.roundPhase = 2;
    expect(raceGuidance(b, course, 0).target.y).toBeGreaterThan(course.marks[0].pos.y);
    b.lapDone = 1;
    expect(raceGuidance(b, course, 0).leg).toBe("finish");
    b.lapDone = 2;
    expect(raceGuidance(b, course, 0)).toMatchObject({ leg: "complete", distance: 0, action: "hold" });
  });
});
