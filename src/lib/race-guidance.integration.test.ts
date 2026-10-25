import { describe, expect, it } from "vitest";
import { planRaceGuidance, type RaceGuidanceState } from "./race-guidance";
import { angleDiff, makeStandardCourse, raceAutopilotTurn, stepBoat, updateLap, windAt, type RaceBoat } from "./race-physics";

const initial = (patch: Partial<RaceBoat> = {}): RaceBoat => ({ id: "player", name: "Player", color: "cyan", pos: { x: 400, y: 1080 }, heading: 45, speed: 0, lapDone: 0, ...patch });
const recoveries: [string, Partial<RaceBoat>][] = [
  ["normal start", {}],
  ["early start", { pos: { x: 400, y: 1010 }, speed: 4, started: false }],
  ["fast approach", { pos: { x: 460, y: 300 }, heading: 0, speed: 5, started: true }],
  ["opposite tack", { pos: { x: 460, y: 300 }, heading: 315, speed: 6, started: true }],
  ["missed east gate", { pos: { x: 530, y: 170 }, heading: 315, speed: 5, started: true }],
  ["missed north gate", { pos: { x: 380, y: 160 }, heading: 270, speed: 5, started: true, roundPhase: 1 }],
  ["missed west gate", { pos: { x: 290, y: 230 }, heading: 180, speed: 6, started: true, roundPhase: 2 }],
  ["stopped head to wind", { pos: { x: 450, y: 260 }, heading: 0, speed: 0, started: true }],
];

describe("advisory course followed through the real race gates", () => {
  // This driver only copies the displayed recommendation to the same heading
  // hold used by the player. It never replaces position, rounds a gate, caps
  // speed or applies a bot's legacy rudder. The held cadences model delayed
  // manual course entry, not a claim of human or native runtime acceptance.
  for (const cadence of [1 / 30, .1, 1, 3]) it(`finishes the standard route and seven recoveries with a ${cadence}s held heading`, () => {
    const course = makeStandardCourse();
    for (const [name, patch] of recoveries) {
      const b = initial(patch);
      let memory: RaceGuidanceState | null = null, target = b.heading, nextAdvice = 0;
      const events: string[] = [];
      const phases = new Set<number>();
      for (let i = 0; i < 9000 && b.lapDone < 2; i++) {
        const time = i / 30;
        if (i % Math.max(1, Math.round(Math.min(cadence, .1) * 30)) === 0) {
          const before = structuredClone(b), previous = structuredClone(memory);
          const advice = planRaceGuidance(b, course, 0, memory);
          expect(b).toEqual(before);
          expect(memory).toEqual(previous);
          expect(advice.guidance, name).not.toBeNull();
          memory = advice.state;
          if (time + 1e-8 >= nextAdvice) { target = advice.guidance!.suggestedHeading; nextAdvice += cadence; }
        }
        const previous = { ...b.pos };
        stepBoat(b, 1 / 30, 0, 1, { turn: Math.max(-1, Math.min(1, angleDiff(b.heading, target) / 12)), autoTrim: true }, { steering: "responsive" });
        const event = updateLap(b, previous, course, (i + 1) / 30);
        if (event) events.push(event);
        phases.add(b.roundPhase ?? 0);
      }
      expect(b.lapDone, `${name}: ${JSON.stringify(b)}`).toBe(2);
      expect(b.started, name).toBe(true);
      expect(b.finishTime, name).toBeLessThan(300);
      expect(b.roundPhase, name).toBe(2);
      expect(events, name).toEqual(["mark", "finish"]);
      if (!(patch.roundPhase && patch.roundPhase > 1)) expect(phases.has(1), name).toBe(true);
    }
  }, 60_000);

  // windAt(t, 0) is the solo GameClient formula: the same two direction
  // sines, two gust sines, bounds and phase zero. The advice continues at
  // 10Hz while delayed manual course entries hold the last chosen heading.
  for (const strength of [.65, 1, 1.3]) for (const cadence of [1 / 30, .1, 1, 3]) it(`finishes eight recoveries in shifting wind x${strength} at ${cadence}s course entry`, () => {
    const course = makeStandardCourse();
    for (const [name, patch] of recoveries) {
      const b = initial(patch);
      let memory: RaceGuidanceState | null = null, target = b.heading, nextEntry = 0;
      const events: string[] = [];
      for (let i = 0; i < 9000 && b.lapDone < 2; i++) {
        const time = i / 30, wind = windAt(time, 0);
        if (i % (cadence < .1 ? 1 : 3) === 0) {
          const advice = planRaceGuidance(b, course, wind.dir, memory);
          memory = advice.state;
          if (time + 1e-8 >= nextEntry) { target = advice.guidance!.suggestedHeading; nextEntry += cadence; }
        }
        const previous = { ...b.pos };
        stepBoat(b, 1 / 30, wind.dir, wind.gust, { turn: Math.max(-1, Math.min(1, angleDiff(b.heading, target) / 12)), autoTrim: true }, { steering: "responsive", windStrengthMul: strength });
        const event = updateLap(b, previous, course, (i + 1) / 30);
        if (event) events.push(event);
      }
      expect(b.lapDone, `${name}: ${JSON.stringify(b)}`).toBe(2);
      expect(b.finishTime, name).toBeLessThan(300);
      expect(b.started, name).toBe(true);
      expect(b.roundPhase, name).toBe(2);
      expect(events, name).toEqual(["mark", "finish"]);
    }
  }, 60_000);

  it("preserves the exact legacy bot trajectory and rudder output after extracting its planner", () => {
    const b = initial({ id: "one", pos: { x: 365, y: 1080 } }), course = makeStandardCourse();
    const expected = new Map([
      [0, [.5145275891054268, 365.0022189697761, 1079.9977887303298, 45, .01174746407435441]],
      [300, [-.04590623599975174, 472.50252087473416, 1002.2537794598171, 39.59616843892189, 3.0968816240543853]],
      [900, [-.2837349431252771, 467.0837305744884, 472.2025375103073, 17.056554983495005, 4.113423370052387]],
      [1500, [-1, 319.4188710279166, 220.71788878409197, 172.51850524468466, 3.6240063937610927]],
      [2415, [.000008813771756877031, 418.39375760500724, 1050.704844115959, 180.08633787297526, 3.4829460050755134]],
    ]);
    for (let i = 0; i <= 2415; i++) {
      const w = windAt(i / 30, 3), prev = { ...b.pos }, turn = raceAutopilotTurn(b, course, w.dir);
      stepBoat(b, 1 / 30, w.dir, w.gust, { turn });
      updateLap(b, prev, course, i / 30);
      if (expected.has(i)) expect([turn, b.pos.x, b.pos.y, b.heading, b.speed]).toEqual(expected.get(i));
    }
    expect(b.lapDone).toBe(2);
    expect(b.finishTime).toBe(80.5);
  });

  it("keeps nested memory private and discards memory from a changed course", () => {
    const course = makeStandardCourse(), b = initial({ pos: { x: 400, y: 1010 } });
    const first = planRaceGuidance(b, course, 0), before = structuredClone(first);
    const next = planRaceGuidance(b, course, 0, first.state);
    expect(first).toEqual(before);
    expect(next.state?.autopilot.dip).not.toBe(first.state?.autopilot.dip);
    const changed = structuredClone(course); changed.startLine.a.y += 10; changed.startLine.b.y += 10;
    expect(planRaceGuidance(b, changed, 0, first.state)).toEqual(planRaceGuidance(b, changed, 0));
    const completed = planRaceGuidance(initial({ lapDone: 2, started: true }), course, 0, first.state);
    expect(planRaceGuidance(initial(), course, 0, completed.state)).toEqual(planRaceGuidance(initial(), course, 0));
  });

  it("returns no route and clears advisory memory for unsupported or malformed input", () => {
    const course = makeStandardCourse(), b = initial(), first = planRaceGuidance(b, course, 0);
    const malformed = [
      { ...course, marks: [] },
      { ...course, marks: { 0: course.marks[0] } } as unknown as typeof course,
      { ...course, marks: [course.marks[0], null] } as unknown as typeof course,
      { ...course, marks: [{ ...course.marks[0], radius: 100 }] },
      { ...course, startLine: { a: { x: 300, y: 900 }, b: { x: 500, y: 950 } } },
      { ...course, finishLine: { a: { x: NaN, y: 1050 }, b: { x: 500, y: 1050 } } },
      { ...course, marks: [{ ...course.marks[0], pos: { x: 0, y: 180 } }] },
    ];
    for (const bad of malformed) expect(planRaceGuidance(b, bad, 0, first.state)).toEqual({ guidance: null, state: null });
    expect(planRaceGuidance({ ...b, heading: NaN }, course, 0)).toEqual({ guidance: null, state: null });
    expect(planRaceGuidance(null as unknown as RaceBoat, course, 0)).toEqual({ guidance: null, state: null });
    expect(planRaceGuidance(b, course, Infinity)).toEqual({ guidance: null, state: null });
  });
});
