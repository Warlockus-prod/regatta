import { describe, expect, it } from "vitest";
import { guidanceToTarget, hintCorridorScale, planRaceGuidance, raceGuidance, type RaceGuidanceState } from "./race-guidance";
import { angleDiff, calcTWA, makeStandardCourse, raceAutopilotPlan, raceTrim, raceTurnRate, stepBoat, updateLap, windAt, type InputState, type RaceBoat } from "./race-physics";

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
  it("uses an explicit server waypoint without guessing race progress", () => {
    const b = boat({ pos: { x: 400, y: 900 }, heading: 315, started: undefined, roundPhase: undefined });
    const target = { x: 400, y: 100 };
    const before = structuredClone(b);
    const hint = guidanceToTarget(b, target, 0);
    expect(hint).toMatchObject({ leg: "waypoint", target, suggestedHeading: 315, targetInNoGo: true, tack: "starboard" });
    expect(hint.target).not.toBe(target);
    expect(b).toEqual(before);
  });
  it("distinguishes a tack from a gybe for an explicitly supplied target", () => {
    const b = boat({ pos: { x: 0, y: 0 }, heading: 315 });
    expect(guidanceToTarget(b, { x: 100, y: -100 }, 0).action).toBe("tack");
    expect(guidanceToTarget({ ...b, heading: 225 }, { x: 100, y: 100 }, 0).action).toBe("gybe");
  });
  it("commits a sailable upwind course using the shared corridor and leaves the boat unchanged", () => {
    // 185 units below the rounding centre: the shared corridor, not the wider hint one (M0-4).
    const b = boat({ pos: { x: 400, y: 400 }, heading: 315 });
    const before = structuredClone(b);
    const hint = raceGuidance(b, course, 0)!;
    expect(hint.targetInNoGo).toBe(true);
    expect(hint.suggestedHeading).toBe(45);
    expect(hint.tack).toBe("starboard");
    expect(b).toEqual(before);
  });
  it("guides an early starter back before the line without mutating the boat", () => {
    const b = boat({ pos: { x: 400, y: 1020 }, started: false, heading: 90 });
    const hint = raceGuidance(b, course, 0)!;
    expect(hint.leg).toBe("return-start");
    expect(hint.action).toBe("return-start");
    expect(hint.target.y).toBeGreaterThan(course.startLine.a.y);
    expect(b.returningToStart).toBeUndefined();
  });
  it("follows all three port-rounding gates, then the finish", () => {
    const b = boat({ pos: { x: 460, y: 180 }, heading: 315, roundPhase: 1 });
    const north = raceGuidance(b, course, 0)!;
    expect(north.leg).toBe("round-port");
    expect(north.target.x).toBe(course.marks[0].pos.x);
    expect(north.target.y).toBeLessThan(course.marks[0].pos.y);
    b.roundPhase = 2;
    expect(raceGuidance(b, course, 0)!.target.y).toBeGreaterThan(course.marks[0].pos.y);
    b.lapDone = 1;
    expect(raceGuidance(b, course, 0)!.leg).toBe("finish");
    b.lapDone = 2;
    expect(raceGuidance(b, course, 0)).toMatchObject({ leg: "complete", distance: 0, action: "hold" });
  });
});

describe("route hint hysteresis on the beat (M0-4)", () => {
  const course = makeStandardCourse();
  it("widens the tacking corridor only low on the beat", () => {
    expect(hintCorridorScale(-20)).toBe(1);
    expect(hintCorridorScale(300)).toBe(1);
    expect(hintCorridorScale(400)).toBeCloseTo(.5);
    expect(hintCorridorScale(800)).toBe(.3);
    // 485 units below the rounding centre and 75 west of the climb: the bots'
    // planner (60-unit corridor) would tack; the hint holds starboard tack...
    const inside = boat({ pos: { x: 400, y: 700 }, heading: 315, speed: 5 });
    expect(raceAutopilotPlan({ ...inside }, course, 0, { radius: 75, lookahead: 30 }).heading).toBe(45);
    expect(raceGuidance(inside, course, 0)).toMatchObject({ suggestedHeading: 315, action: "hold" });
    // ...until the boat leaves its own corridor (60 / 0.35 = 171 units).
    expect(raceGuidance({ ...inside, pos: { x: 290, y: 700 } }, course, 0)).toMatchObject({ suggestedHeading: 45, action: "tack" });
  });

  // The same start, wind and 0.1 s course entry, followed twice: once by the
  // bots' planner with the advisory route (the hint before M0-4), once by
  // the hint. Counted: changes of the advised tack on the climb.
  const follow = (strength: number, advise: (b: RaceBoat, wind: number) => number) => {
    const b: RaceBoat = { id: "player", name: "Player", color: "cyan", pos: { x: 400, y: 1080 }, heading: 45, speed: 0, lapDone: 0 };
    let target = b.heading, side = 0, changes = 0;
    for (let i = 0; i < 9000 && b.lapDone < 2; i++) {
      const wind = windAt(i / 30, 0);
      if (i % 3 === 0) {
        target = advise(b, wind.dir);
        const next = Math.sign(calcTWA(target, wind.dir));
        if (b.started && b.lapDone === 0 && !b.roundPhase && side && next !== side) changes++;
        side = next;
      }
      const previous = { ...b.pos };
      stepBoat(b, 1 / 30, wind.dir, wind.gust, { turn: Math.max(-1, Math.min(1, angleDiff(b.heading, target) / 12)), autoTrim: true }, { steering: "responsive", windStrengthMul: strength });
      updateLap(b, previous, course, (i + 1) / 30);
    }
    return { changes, finished: b.lapDone === 2 };
  };
  it("asks for fewer tacks than the bots' planner on the same beat in light, medium and strong wind", () => {
    const counts = [.65, 1, 1.3].map((strength) => {
      let memory: RaceBoat["autopilot"];
      const planner = follow(strength, (b, wind) => {
        const probe = { ...b, autopilot: memory };
        const heading = raceAutopilotPlan(probe, course, wind, { radius: 75, lookahead: 30 }).heading;
        memory = probe.autopilot;
        return heading;
      });
      let state: RaceGuidanceState | null = null;
      const hint = follow(strength, (b, wind) => {
        const advice = planRaceGuidance(b, course, wind, state);
        state = advice.state;
        return advice.guidance!.suggestedHeading;
      });
      expect(planner.finished && hint.finished).toBe(true);
      expect(hint.changes, `x${strength}`).toBeLessThanOrEqual(planner.changes);
      return [planner.changes, hint.changes];
    });
    // Measured 2026-10-30: planner 5, 6, 6; hint 5, 4, 2.
    const total = (k: number) => counts.reduce((sum, c) => sum + c[k], 0);
    expect(total(1)).toBeLessThanOrEqual(total(0) - 4);
  });
});
