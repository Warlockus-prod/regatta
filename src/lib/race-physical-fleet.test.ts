import { describe, expect, it } from "vitest";
import { physicalRaceContext, type PhysicalRaceProfile } from "./race-context";
import { makePhysicalRaceCourse, physicalCourseDefinition, physicalFleetSpawns } from "./race-courses";
import { stepPhysicalRaceFleet, type PhysicalFleetFrame } from "./race-physical-fleet";
import { stepPhysicalBoat, type PhysicalRaceInput } from "./race-physical-motion";
import { PHYSICAL_FLEET_HZ, type PhysicalBotState } from "./race-physical-bot";
import { windAt, type RaceBoat } from "./race-physics";

const boat = (id = "p"): RaceBoat => ({ id, name: id, color: "white", pos: { x: 400, y: 1080 }, heading: 45, speed: 0, lapDone: 0 });
function frame(boats = [boat()], profile: PhysicalRaceProfile = "short"): PhysicalFleetFrame {
  return { entries: boats.map(boat => ({ boat, input: "bot" })), context: physicalRaceContext(profile), course: makePhysicalRaceCourse(profile),
    dt: 1 / 30, raceTime: 1 / 30, racing: true, windDir: 0, gust: 1, windStrengthMul: 1 };
}
const state = (): PhysicalBotState => ({ version: 1, profile: "short", tick: 0, lap: 0 });

describe("explicit physical fleet transaction", () => {
  it("keeps caller boats and nested navigation owned by the caller", () => {
    const original = frame([{ ...boat(), pos: { x: 400, y: 1070 }, speed: 4 }]);
    const memory = { ...state(), dip: { ccw: true, x: 400, r: 70 } };
    const input = { ...original, navigation: new Map([["p", memory]]) }, before = structuredClone(input);
    const result = stepPhysicalRaceFleet(input)!;
    expect(result).not.toBeNull(); expect(input).toEqual(before);
    result.navigation.get("p")!.dip!.x = 123;
    expect(memory.dip.x).toBe(400);
    expect(result.boats[0].autopilot).toBeUndefined();
  });

  it.each([
    { ...state(), version: 2 }, { ...state(), profile: "long" }, { ...state(), lap: 1 },
    { ...state(), tick: NaN }, { ...state(), tick: .5 }, { ...state(), dip: { ccw: true, x: 400, r: 0 } },
    { ...state(), predictive: { heading: 90, until: 2, stage: "start" } },
    { ...state(), raw: "not a navigation field" },
  ])("rejects malformed or foreign navigation %# before changing any boat", memory => {
    const input = { ...frame([boat(), boat("q")]), navigation: new Map([["q", memory as PhysicalBotState]]) };
    const before = structuredClone(input);
    expect(stepPhysicalRaceFleet(input)).toBeNull(); expect(input).toEqual(before);
  });

  it("rejects a bad second driver, duplicate ID, foreign context and changed course without partial work", () => {
    const input = frame([boat(), boat("q")]), before = structuredClone(input);
    const invalid = [
      { ...input, entries: [input.entries[0], { ...input.entries[1], boat: { ...boat("q"), speed: NaN } }] },
      { ...input, entries: [input.entries[0], input.entries[0]] },
      { ...input, context: { ...input.context, model: "future-model" } },
      { ...input, course: { ...input.course, marks: input.course.marks.slice(1) } },
      { ...input, navigation: new Map([["absent", state()]]) },
    ];
    for (const invalidFrame of invalid) expect(stepPhysicalRaceFleet(invalidFrame as PhysicalFleetFrame)).toBeNull();
    expect(input).toEqual(before);
  });

  it.each([0, .05, .1, NaN])("rejects a non30Hz frame duration %s without moving the caller", dt => {
    const f = { ...frame(), dt }, before = structuredClone(f);
    expect(stepPhysicalRaceFleet(f)).toBeNull(); expect(f).toEqual(before);
  });

  it.each([
    { steering: { mode: "helm", rudder: -.6, lowSpeedAssist: false }, autoTrim: false, trim: { mainSheet: .4, jibSheet: .5 } },
    { steering: { mode: "course-assist", heading: 120 }, autoTrim: true },
  ] satisfies PhysicalRaceInput[])("preserves the actual human force/steering path %# beside a bot", input => {
    const human = { ...boat("human"), pos: { x: 200, y: 1080 }, speed: 4 }, bot = { ...boat("bot"), pos: { x: 600, y: 1080 } };
    const f = frame([human, bot]), expected = structuredClone(human);
    const motion = stepPhysicalBoat(expected, f.dt, f.windDir, f.gust, input, f.context, { windStrengthMul: 1 });
    const result = stepPhysicalRaceFleet({ ...f, entries: [{ boat: human, input }, { boat: bot, input: "bot" }] })!;
    expect(result.boats[0]).toEqual(expected); expect(result.motions.get("human")).toEqual(motion);
    expect(result.navigation.has("human")).toBe(false); expect(result.navigation.has("bot")).toBe(true);
  });

  it("observes actual separation without letting a collision push award the start", () => {
    const a = { ...boat("a"), pos: { x: 400, y: 1051 } }, b = { ...boat("b"), pos: { x: 400, y: 1052 } };
    const done = { ...boat("done"), started: true, lapDone: 2, roundPhase: 2, finishTime: 10 };
    const stopped = { steering: { mode: "helm", rudder: 0, lowSpeedAssist: false }, autoTrim: false, trim: { mainHoisted: false, jibFurl: 1 } } as const;
    const f = frame([done, a, b]);
    const result = stepPhysicalRaceFleet({ ...f, entries: f.entries.map(entry => ({ ...entry, input: stopped })) })!;
    expect(result.boats[0]).toEqual(done); expect(result.motions.has("done")).toBe(false);
    expect(result.boats[1].pos.y).toBeLessThan(1050);
    expect(result.motions.get("a")!.to).toEqual(a.pos);
    expect(result.boats[1].started).toBeUndefined(); expect(result.progress.every(p => p.event === null)).toBe(true);
  });

  it("advances navigation during countdown while the official race clock and gate credit stay at zero", () => {
    let f = { ...frame([{ ...boat(), pos: { x: 400, y: 1050.5 }, speed: 4 },
      { ...boat("q"), pos: { x: 450, y: 1050.5 }, speed: 4 }]), raceTime: 0, racing: false };
    let navigation: ReadonlyMap<string, PhysicalBotState> | undefined;
    for (let i = 0; i < 60; i++) {
      const next = stepPhysicalRaceFleet({ ...f, navigation })!;
      expect(next.progress.every(p => p.event === null)).toBe(true);
      expect(next.boats[0].started).toBeUndefined(); navigation = next.navigation;
      f = { ...f, entries: next.boats.map(boat => ({ boat, input: "bot" as const })) };
    }
    expect(navigation!.get("p")!.tick).toBe(60);
    expect(navigation!.get("p")!.tick / PHYSICAL_FLEET_HZ).toBe(2);
    expect(navigation!.get("p")!.predictive!.until).toBeGreaterThanOrEqual(2);
    expect(navigation!.get("p")!.predictive!.until).toBeLessThanOrEqual(2.5);
    expect(f.raceTime).toBe(0);
  });
});

function sail(profile: PhysicalRaceProfile, strength: number, early: boolean) {
  const definition = physicalCourseDefinition(profile), course = makePhysicalRaceCourse(profile), context = physicalRaceContext(profile);
  let boats = physicalFleetSpawns(5).map((pos, i) => ({ ...boat(`b${i}`), pos: { ...pos, y: pos.y - (early ? 60 : 0) },
    heading: i % 2 ? 315 : 45, speed: early ? 4 : 0 }));
  let navigation: ReadonlyMap<string, PhysicalBotState> | undefined;
  const events = new Map(boats.map(b => [b.id, [] as string[]]));
  for (let step = 1; step <= definition.maxRaceSeconds * 30 && boats.some(b => b.lapDone < 2); step++) {
    const raceTime = step / 30, wind = windAt(raceTime, 3);
    const next = stepPhysicalRaceFleet({ ...frame(boats, profile), navigation, course, context, raceTime,
      windDir: wind.dir, gust: wind.gust, windStrengthMul: strength });
    if (!next) throw new Error("A valid physical fleet frame was rejected");
    for (const p of next.progress) if (p.event) events.get(p.boatId)!.push(p.event);
    boats = next.boats; navigation = next.navigation;
  }
  return { boats, events, definition };
}
for (const profile of ["short", "medium", "long"] as const) for (const strength of [.65, 1, 1.3]) for (const early of [false, true]) {
  it(`${profile}: five actual boats finish every ordered gate in wind x${strength}, early=${early}`, () => {
    const result = sail(profile, strength, early);
    expect(result.boats).toHaveLength(5);
    for (const b of result.boats) {
      expect(b.lapDone, b.id).toBe(2);
      expect(b.finishTime).toBeLessThan(result.definition.maxRaceSeconds);
      expect(b.finishTime).toBeGreaterThan(result.definition.legMetres * 2 / (8 * .514444));
      expect(result.events.get(b.id)).toEqual(["start", "round-east", "round-north", "mark", "finish"]);
      expect(b.autopilot).toBeUndefined();
    }
  }, 60_000);
}
