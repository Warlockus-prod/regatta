import { describe, expect, it } from "vitest";
import { makeStandardCourse, UNITS_PER_KNOT_SECOND, WORLD, type RaceBoat, type RaceCourse } from "./race-physics";
import { VISUAL_SPEEDUP } from "@/features/race-3d/pose";
import { makePhysicalRaceCourse, physicalCourseDefinition } from "./race-courses";
import { KNOT_METRES_PER_SECOND } from "./sailing-kinematics";
import { raceScale, type RaceScale } from "./race-scale";
import { createRaceRulesState, evaluateRaceRules, raceClosestApproach, type RaceRuleEvent, type RaceRulesState } from "./race-rules";

// Contract (M5 step 2, ADR-0015): the judge reads one scale model. The same
// encounter expressed in metres produces the same rule events in either model
// when each model moves the boats at its own speed (legacy 8 units per knot
// second, metric real speed), with the look-ahead counted in real seconds in
// the metric race; every legacy output is unchanged (the snapshot below was
// taken from race-rules.ts at HEAD 5df78d4a).
const legacy = raceScale(null);
const metric = raceScale("short");
const M = 0.6;
const KN = 5;
const WIND = 0;
/** A clear stretch of water on both courses: away from the windward mark, the start marks and the line. */
const CENTRE = { x: 400, y: 950 };
const legacyCourse = makeStandardCourse();
const metricCourse = makePhysicalRaceCourse("short");

const boat = (id: string, eastM: number, southM: number, heading: number, speed = KN): RaceBoat =>
  ({ id, name: id, color: "#fff", pos: { x: CENTRE.x + eastM / M, y: CENTRE.y + southM / M }, heading, speed, lapDone: 0, started: true });
const s = Math.SQRT1_2;
/** Port (heading 45) and starboard (315) tack meeting at CENTRE, each `trackM` metres of track from it. */
const crossing = (trackM: number) => [boat("port", -trackM * s, trackM * s, 45), boat("stbd", trackM * s, trackM * s, 315)];
/** Same tack side by side, `abeamM` apart, the eastern boat converging by `convergeDeg` (sailed with the wind from the east). */
// Sailing south, away from the windward mark zone, with the start marks well clear.
const parallel = (abeamM: number, convergeDeg: number) => [boat("lee", 0, 0, 180), boat("wind", abeamM, 0, 180 + convergeDeg)];
/** Opposite tacks on a reach, bow to bow, `gapM` apart. */
const headOn = (gapM: number) => [boat("port", -gapM / 2, 0, 90), boat("stbd", gapM / 2, 0, 270)];

function judgeOnce(boats: RaceBoat[], scale: RaceScale, course: RaceCourse, windDir = WIND) {
  return evaluateRaceRules(createRaceRulesState(), { boats, course, windDir, time: 20, racing: true, scale }).events;
}

/** Sail the encounter in straight lines at each model's own speed until the
 * first contact (or `seconds`), judging every 1/30 s tick. */
function sailEncounter(start: RaceBoat[], scale: RaceScale, course: RaceCourse, windDir = WIND, seconds = 40) {
  const boats = start.map(b => ({ ...b, pos: { ...b.pos } }));
  let state: RaceRulesState = createRaceRulesState();
  const events: (RaceRuleEvent & { gapM: number })[] = [];
  const dt = 1 / 30;
  for (let t = 20; t < 20 + seconds; t += dt) {
    const previousPositions = Object.fromEntries(boats.map(b => [b.id, { ...b.pos }]));
    for (const b of boats) {
      const r = b.heading * Math.PI / 180;
      b.pos.x += Math.sin(r) * b.speed * scale.unitsPerKnotSecond * dt;
      b.pos.y -= Math.cos(r) * b.speed * scale.unitsPerKnotSecond * dt;
    }
    const judged = evaluateRaceRules(state, { boats, course, windDir, time: t, racing: true, previousPositions, scale });
    state = judged.state;
    const gapM = Math.hypot(boats[0].pos.x - boats[1].pos.x, boats[0].pos.y - boats[1].pos.y) * M;
    events.push(...judged.events.map(e => ({ ...e, gapM })));
    if (judged.events.some(e => e.kind === "contact")) break;
  }
  return events;
}
const sequence = (events: RaceRuleEvent[]) => events.map(e => `${e.kind}:${e.rule}:${e.boatId}:${e.penaltySeconds}`);

describe("the metric judge counts in real seconds", () => {
  it("takes its look-ahead, wrong-side band and contact speed from the course data", () => {
    const d = physicalCourseDefinition("short");
    expect(metric.lookaheadSeconds).toBe(d.judge.lookaheadSeconds);
    expect(metric.lookaheadSeconds).toBe(8);
    expect(metric.unitsPerKnotSecond).toBeCloseTo(KNOT_METRES_PER_SECOND / M, 12);
    expect(metric.wrongRoundingOuter).toEqual({ from: "centre", units: d.rounding.gateOuterMetres / M });
    expect(metric.wrongRoundingOuter.units).toBeCloseTo(43.33, 2);
    // 0.2 kn in both models, in each model's units.
    expect(metric.contactClosingUnitsPerSecond / metric.unitsPerKnotSecond).toBeCloseTo(0.2, 12);
    expect(legacy.contactClosingUnitsPerSecond / legacy.unitsPerKnotSecond).toBeCloseTo(0.2, 12);
    expect(metric.visualSpeedup).toBe(1);
    expect(legacy.visualSpeedup).toBeCloseTo(9.33, 2);
  });

  it("is quiet for a port/starboard crossing 60 m of track away (about 12 s) and warns at 35 m (about 7 s)", () => {
    // Time to the crossing at 5 kn: 30 m / 2.57 m/s = 11.7 s, 17.5 m / 2.57 m/s = 6.8 s.
    expect(raceClosestApproach(crossing(30)[0], crossing(30)[1], metric).time).toBe(8);
    expect(judgeOnce(crossing(30), metric, metricCourse)).toEqual([]);
    const near = judgeOnce(crossing(17.5), metric, metricCourse);
    expect(raceClosestApproach(crossing(17.5)[0], crossing(17.5)[1], metric).time).toBeCloseTo(17.5 / (KN * KNOT_METRES_PER_SECOND), 6);
    expect(near).toContainEqual(expect.objectContaining({ kind: "give-way", rule: "10", boatId: "port", otherBoatId: "stbd", penaltySeconds: 0 }));
    expect(near).toContainEqual(expect.objectContaining({ kind: "avoid-contact", rule: "14", boatId: "stbd" }));
    // The legacy race moves boats 9.33 times faster: the same 60 m is 1.25 s away and warns at once.
    expect(sequence(judgeOnce(crossing(30), legacy, legacyCourse))).toEqual(["give-way:10:port:0", "avoid-contact:14:stbd:0"]);
  });

  it("gives the same rule events in either model when each sails the encounter at its own speed", () => {
    const encounters = {
      crossing: crossing(40),
      "parallel 15 m abeam, 3 deg": parallel(15, 3),
      "head-on 100 m": headOn(100),
    } as const;
    const report: Record<string, unknown> = {};
    for (const [name, start] of Object.entries(encounters)) {
      // Wind 90 for the parallel pair: both on port tack, the eastern boat to windward.
      const wind = name.startsWith("parallel") ? 90 : WIND;
      const inMetric = sailEncounter(start, metric, metricCourse, wind), inLegacy = sailEncounter(start, legacy, legacyCourse, wind);
      expect(sequence(inMetric), name).toEqual(sequence(inLegacy));
      expect(inMetric.at(-1)?.kind, name).toBe("contact");
      report[name] = { events: sequence(inMetric), firstWarningGapM: { metric: +(inMetric[0].gapM.toFixed(1)), legacy: +(inLegacy[0].gapM.toFixed(1)) } };
    }
    // The metric judge warns at real distances: the head-on pair about 8 s x 5.1 m/s = 41 m out
    // (the legacy one on the first tick, inside its 105 m pair limit).
    const headOnReport = report["head-on 100 m"] as { events: string[]; firstWarningGapM: { metric: number; legacy: number } };
    expect(headOnReport.events).toEqual(["give-way:10:port:0", "avoid-contact:14:stbd:0", "contact:10:port:5"]);
    expect(headOnReport.firstWarningGapM.metric).toBeGreaterThan(40);
    expect(headOnReport.firstWarningGapM.metric).toBeLessThan(42.5);
    expect(headOnReport.firstWarningGapM.legacy).toBeGreaterThan(98);
    // A slow converging pair touches without a warning first, in both models: rule 11, windward boat.
    expect((report["parallel 15 m abeam, 3 deg"] as { events: string[] }).events).toEqual(["contact:11:wind:5"]);
  });

  it("does not count a resting touch (below 0.2 kn of closing) as a contact in either model", () => {
    for (const [scale, course] of [[metric, metricCourse], [legacy, legacyCourse]] as const) {
      const events = sailEncounter(parallel(15, 1), scale, course, 90, 60);
      expect(events.filter(e => e.kind === "contact"), scale.model).toEqual([]);
    }
  });
});

describe("impact evidence in the metric race", () => {
  const mark = metricCourse.marks[0];
  it("counts a mark the constraint stopped the hull on, even a hair beyond the touching distance", () => {
    const touchUnits = mark.radius + 11;
    const b = { ...boat("p", 0, 0, 0, 3), pos: { x: mark.pos.x, y: mark.pos.y + touchUnits + 1e-6 } };
    const frame = { boats: [b], course: metricCourse, windDir: 0, time: 30, racing: true, scale: metric };
    expect(evaluateRaceRules(createRaceRulesState(), frame).events).toEqual([]);
    const withImpact = evaluateRaceRules(createRaceRulesState(), { ...frame,
      impacts: [{ kind: "mark", boatId: "p", markIndex: 0, closingMetresPerSecond: 1.5 }] }).events;
    expect(withImpact).toContainEqual(expect.objectContaining({ kind: "mark-touch", rule: "31", boatId: "p", penaltySeconds: 3 }));
  });

  it("counts a hull impact as a contact with the measured closing speed", () => {
    // Port and starboard reaching side by side, 22.2 units apart (beyond the 22.1 tolerance), headings parallel.
    const a = boat("port", 0, 0, 90, 4), b = { ...boat("stbd", 0, 0, 270, 4), pos: { x: CENTRE.x, y: CENTRE.y - 22.2 } };
    const frame = { boats: [a, b], course: metricCourse, windDir: 0, time: 30, racing: true, scale: metric };
    expect(evaluateRaceRules(createRaceRulesState(), frame).events.filter(e => e.kind === "contact")).toEqual([]);
    const slow = evaluateRaceRules(createRaceRulesState(), { ...frame, impacts: [{ kind: "hull", boatId: "stbd", otherBoatId: "port", closingMetresPerSecond: 0.05 }] });
    expect(slow.state.contacts).toEqual(["port|stbd"]);
    expect(slow.events.filter(e => e.kind === "contact")).toEqual([]);
    const hit = evaluateRaceRules(createRaceRulesState(), { ...frame, impacts: [{ kind: "hull", boatId: "stbd", otherBoatId: "port", closingMetresPerSecond: 0.5 }] });
    expect(hit.events).toContainEqual(expect.objectContaining({ kind: "contact", rule: "10", boatId: "port", otherBoatId: "stbd", penaltySeconds: 5 }));
  });

  it("uses the metric wrong-side band: out to the round-west gate, 26 m from the mark", () => {
    const at = (westM: number) => {
      const b = { ...boat("p", 0, 0, 0, 3), pos: { x: mark.pos.x - westM / M, y: mark.pos.y - 1 } };
      return evaluateRaceRules(createRaceRulesState(), { boats: [b], course: metricCourse, windDir: 0, time: 30, racing: true, scale: metric,
        previousPositions: { p: { x: b.pos.x, y: mark.pos.y + 1 } } }).events.map(e => e.kind);
    };
    expect(at(20)).toEqual(["wrong-rounding"]);
    expect(at(30)).toEqual([]);
  });
});

// --- Legacy snapshot -------------------------------------------------------

/** Deterministic LCG, never Math.random. */
function seeded(seed: number) {
  let v = seed >>> 0;
  return () => { v = (v * 1664525 + 1013904223) >>> 0; return v / 2 ** 32; };
}
/** FNV-1a over a string, as hex. */
function fnv(text: string) {
  let h = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) { h ^= text.charCodeAt(i); h = Math.imul(h, 0x01000193) >>> 0; }
  return h.toString(16).padStart(8, "0");
}
/** 300 random legacy fleets (2 to 4 boats round the course, any heading,
 * speed, leeway, lap, phase and start state) sailed 24 ticks each in straight
 * lines at legacy speed, judged with the legacy defaults. */
function legacyJudgeFingerprint(withScale: RaceScale | undefined) {
  const rnd = seeded(20261101), course = makeStandardCourse();
  const lines: string[] = [];
  let events = 0;
  for (let scenario = 0; scenario < 300; scenario++) {
    const n = 2 + Math.floor(rnd() * 3);
    const near = course.marks[Math.floor(rnd() * course.marks.length)].pos;
    const boats: RaceBoat[] = Array.from({ length: n }, (_, i) => ({ id: `b${i}`, name: `b${i}`, color: "#fff",
      pos: { x: near.x + (rnd() - .5) * 160, y: near.y + (rnd() - .5) * 160 }, heading: rnd() * 360, speed: rnd() * 8,
      lapDone: rnd() < .8 ? 0 : 1, started: rnd() < .85, roundPhase: rnd() < .5 ? 0 : 1,
      ...(rnd() < .5 ? { physics: { leeway: (rnd() - .5) * 8 } as RaceBoat["physics"] } : {}) }));
    for (const b of boats) if (b.lapDone === 1) b.started = true;
    let state = createRaceRulesState();
    const windDir = (rnd() - .5) * 40;
    for (let tick = 0; tick < 24; tick++) {
      const previousPositions = Object.fromEntries(boats.map(b => [b.id, { ...b.pos }]));
      for (const b of boats) {
        const r = (b.heading + (b.physics?.leeway ?? 0)) * Math.PI / 180;
        b.pos.x += Math.sin(r) * b.speed * 8 / 30; b.pos.y -= Math.cos(r) * b.speed * 8 / 30;
      }
      const time = 5 + tick / 30 * 4;
      const judged = evaluateRaceRules(state, { boats, course, windDir, time, racing: true, previousPositions, penalties: scenario % 7 !== 0,
        ...(withScale ? { scale: withScale } : {}) });
      state = judged.state;
      events += judged.events.length;
      for (const e of judged.events) lines.push(`${scenario}|${e.id}|${e.penaltySeconds}`);
    }
    const cpa = withScale ? raceClosestApproach(boats[0], boats[1], withScale) : raceClosestApproach(boats[0], boats[1]);
    lines.push(`${scenario}|cpa|${cpa.time}|${cpa.distance}|${cpa.closing}|${JSON.stringify(state)}`);
  }
  return { events, hash: fnv(lines.join("\n")) };
}

describe("the legacy judge is unchanged", () => {
  it("keeps every legacy number the judge, the HUD and the wake used before", () => {
    expect(legacy.unitsPerKnotSecond).toBe(UNITS_PER_KNOT_SECOND);
    expect(legacy.lookaheadSeconds).toBe(3);
    expect(legacy.wrongRoundingOuter).toEqual({ from: "inner", units: 70 });
    expect(legacy.contactClosingUnitsPerSecond).toBe(UNITS_PER_KNOT_SECOND * .2);
    expect(legacy.water).toEqual({ minX: 20, minY: 20, maxX: WORLD.width - 20, maxY: WORLD.height - 20 });
    expect(legacy.visualSpeedup).toBe(VISUAL_SPEEDUP);
    expect(raceScale(undefined)).toBe(legacy);
  });

  // Measured with race-rules.ts at HEAD 5df78d4a (before the scale model), 2026-11-01.
  const HEAD = { events: 633, hash: "8385031d" };
  it("matches the HEAD snapshot with the default scale and with the explicit legacy scale", () => {
    expect(legacyJudgeFingerprint(undefined)).toEqual(HEAD);
    expect(legacyJudgeFingerprint(legacy)).toEqual(HEAD);
  });
});
