import { describe, expect, it } from "vitest";
import { SAILING_STEP_SECONDS } from "@/features/sailing-lab/runtime/fixed-clock";
import { createPendingRaceSaves, resolveFinishedFleet } from "./race-completion";
import { makeStandardCourse, raceAutopilotTurn, raceTrim, resolveCollisions, stepBoat, updateLap, windAt, type RaceBoat } from "./race-physics";
import { createRaceRulesState, evaluateRaceRules, type RaceRulesState } from "./race-rules";
import { validateNativeRace, type NativeRaceSnapshot } from "./race-native";

const course = makeStandardCourse();
const finish = 89 + 1 / 30;
const y = course.finishLine.a.y;
const x = (course.finishLine.a.x + course.finishLine.b.x) / 2;
const boat = (id: string, patch: Partial<RaceBoat> = {}): RaceBoat & { speedMul: number } => ({ id, name: id, color: "#fff", pos: { x, y: y - 20 }, heading: 180, speed: 6, speedMul: 1, lapDone: 1, started: true, ...patch });
const fleet = () => [
  boat("player", { isPlayer: true, lapDone: 2, finishTime: finish, pos: { x, y: y + 2 }, trim: raceTrim({ mainHoisted: false, jibFurl: 1 }) }),
  boat("ahead", { lapDone: 2, finishTime: 85 }),
  boat("near", { pos: { x: x - 60, y: y - 20 } }),
  boat("far", { lapDone: 0, pos: { x: x + 200, y: 200 }, heading: 45, speed: 3 }),
];
const frame = () => ({ boats: fleet(), course, time: finish, windStrengthMul: 1,
  rules: { ...createRaceRulesState(), penalties: { player: 5 } }, rulesEnabled: true, penaltiesEnabled: true });

describe("immediate completed-player finalization", () => {
  it("freezes the completed player and lets every bot sail to its own finish (M0-6)", () => {
    const input = frame(), before = structuredClone(input);
    const result = resolveFinishedFleet(input);
    expect(input).toEqual(before);
    expect(result.boats[0]).toEqual(input.boats[0]); expect(result.boats[1]).toEqual(input.boats[1]);
    const near = result.boats.find(b => b.id === "near")!, far = result.boats.find(b => b.id === "far")!;
    expect(near.lapDone).toBe(2); expect(near.finishTime).toBeGreaterThan(finish);
    expect(near.finishTime).toBeLessThan(finish + 5);
    // Far behind, still before the windward mark: the old 15 s window left it unfinished.
    expect(far.lapDone).toBe(2); expect(far.finishTime).toBeGreaterThan(finish + 15);
    expect(far.finishTime).toBeLessThanOrEqual(300);
    // The fleet stops as soon as the last bot is in, not at the time limit.
    expect(result.time).toBe(Math.max(near.finishTime!, far.finishTime!));
    expect(result.steps).toBe(Math.round((result.time - finish) / SAILING_STEP_SECONDS));
    const order = [...result.boats].sort((a, b) => (a.finishTime === undefined ? Infinity : a.finishTime + (result.rules.penalties[a.id] ?? 0)) - (b.finishTime === undefined ? Infinity : b.finishTime + (result.rules.penalties[b.id] ?? 0)));
    expect(order.map(b => b.id)).toEqual(["ahead", "near", "player", "far"]);
    expect(result.rules.penalties.player).toBe(5);
  });

  it("matches normal 30 Hz bot integration instead of inventing rank or finish timestamps", () => {
    const input = frame(), expected = structuredClone(input.boats);
    let time = input.time;
    let rules: RaceRulesState = input.rules;
    while (expected.some(b => b.lapDone < 2) && time + SAILING_STEP_SECONDS <= 300 + 1e-8) {
      time += SAILING_STEP_SECONDS;
      const wind = windAt(time), previousPositions = Object.fromEntries(expected.map(b => [b.id, { ...b.pos }]));
      for (const b of expected) if (!b.isPlayer && b.lapDone < 2) stepBoat(b, SAILING_STEP_SECONDS, wind.dir, wind.gust,
        { turn: raceAutopilotTurn(b, course, wind.dir) }, { speedMul: b.speedMul, windStrengthMul: input.windStrengthMul, steering: "legacy" });
      rules = evaluateRaceRules(rules, { boats: expected, course, windDir: wind.dir, time, racing: true, enabled: true, penalties: true, previousPositions }).state;
      resolveCollisions(expected, SAILING_STEP_SECONDS);
      for (const b of expected) if (!b.isPlayer && b.lapDone < 2) updateLap(b, previousPositions[b.id], course, time);
    }
    const actual = resolveFinishedFleet(input);
    expect(actual.boats).toEqual(expected); expect(actual.rules).toEqual(rules); expect(actual.time).toBe(time);
  });

  it("honors the five-minute cap, leaves a boat that cannot make it unfinished, and never advances a race before the player finishes", () => {
    const input = frame(); input.time = 299; input.boats[0].finishTime = 299;
    const result = resolveFinishedFleet(input);
    expect(result.steps).toBe(30); expect(result.time).toBeCloseTo(300, 9);
    expect(result.boats.find(b => b.id === "far")!.finishTime).toBeUndefined();
    input.boats[0].lapDone = 1; input.boats[0].finishTime = undefined;
    expect(resolveFinishedFleet(input).steps).toBe(0);
    const done = frame(); done.boats = done.boats.slice(0, 2);
    expect(resolveFinishedFleet(done).steps).toBe(0);
  });
});

function snapshot(id: string): NativeRaceSnapshot {
  return { schema: 1, id, mode: "pro", difficulty: "medium", windStrength: "medium", missionId: null,
    finishTimeSec: finish, penaltySeconds: 5, position: 3, totalBoats: 4,
    course: { ...course, marks: course.marks.map(m => ({ ...m, pos: { ...m.pos }, label: "Знак", labelEn: "Mark", labelPl: "Znak" })) },
    samples: [{ t: 0, x, y: y - 10, heading: 180, twa: 180, speed: 5, lap: 1 },
      { t: finish, x, y: y + 2, heading: 180, twa: 180, speed: 5, lap: 2, trim: { mainSheet: .5, jibSheet: .5, reef: 0, jibFurl: 1, mainHoisted: false } }],
    events: [{ type: "start", t: 0 }, { type: "finish", t: finish }] };
}

describe("completed race saves while another run starts", () => {
  it("keeps an immutable finish/rig/mode/penalty snapshot until its own durable acknowledgement", () => {
    const queue = createPendingRaceSaves(), first = snapshot("first"), second = snapshot("second");
    queue.add(first); queue.add(second); queue.add({ ...first, mode: "simple" });
    first.samples.length = 0; first.events.length = 0; first.course.marks[0].pos.x = 10;
    const saved = queue.get("first")!;
    expect(validateNativeRace(saved)).not.toBeNull();
    expect(saved.mode).toBe("pro"); expect(saved.penaltySeconds).toBe(5);
    expect(saved.samples.at(-1)?.t).toBe(saved.finishTimeSec);
    expect(saved.samples.at(-1)?.trim?.mainHoisted).toBe(false);
    expect(queue.values().map(r => r.id)).toEqual(["first", "second"]);
    expect(queue.acknowledge("unrelated")).toBe(false);
    expect(queue.acknowledge("first")).toBe(true);
    expect(queue.values().map(r => r.id)).toEqual(["second"]);
    expect(queue.get("second")).toEqual(second);
  });
});
