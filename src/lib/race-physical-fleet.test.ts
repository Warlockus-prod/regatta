import { describe, expect, it } from "vitest";
import { physicalRaceContext, type PhysicalRaceProfile } from "./race-context";
import { makePhysicalRaceCourse, physicalCourseDefinition, physicalFleetSpawns } from "./race-courses";
import { stepPhysicalRaceFleet, type PhysicalFleetFrame } from "./race-physical-fleet";
import { stepPhysicalBoat, type PhysicalRaceInput } from "./race-physical-motion";
import { PHYSICAL_FLEET_HZ, type PhysicalBotState } from "./race-physical-bot";
import { windAt, type RaceBoat } from "./race-physics";
import { DIFFICULTY_CONFIG } from "@/app/game/config";

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
    { ...state(), turnSide: 0 },
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

  it.each([-1, 1] as const)("accepts and owns turn-side memory %s without changing the caller", turnSide => {
    const original = { ...frame([{ ...boat(), heading: 180, speed: 2 }]), navigation: new Map([["p", { ...state(), turnSide }]]) };
    const before = structuredClone(original), result = stepPhysicalRaceFleet(original);
    expect(result).not.toBeNull(); expect(original).toEqual(before);
    expect(result!.navigation.get("p")).not.toBe(original.navigation.get("p"));
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
    expect(result.contacts).toEqual([expect.objectContaining({ kind: "hull", boatId: "a", otherBoatId: "b", firstHitFraction: 0 })]);
    expect(result.initialContacts).toEqual(result.contacts); expect(result.impacts).toEqual([]);
    expect(result.motions.get("a")!.from).toEqual(result.motions.get("a")!.to);
    expect(result.motions.get("a")!.from).not.toEqual(a.pos);
    expect(result.boats[1].started).toBeUndefined(); expect(result.progress.every(p => p.event === null)).toBe(true);
  });

  it("returns real metric impact evidence from the shared-force fleet path", () => {
    const a = { ...boat("a"), pos: { x: 400, y: 700 }, heading: 90, speed: 4 };
    const b = { ...boat("b"), pos: { x: 422.05, y: 700 }, heading: 270, speed: 4 };
    const input = { steering: { mode: "helm", rudder: 0, lowSpeedAssist: true }, autoTrim: true } as const;
    const f = frame([a, b]), before = structuredClone(f);
    const result = stepPhysicalRaceFleet({ ...f, entries: f.entries.map(entry => ({ ...entry, input })) })!;
    expect(f).toEqual(before); expect(result.initialContacts).toEqual([]);
    expect(result.impacts).toHaveLength(1);
    const hit = result.impacts[0];
    expect(hit.kind).toBe("hull"); expect(hit.boatId).toBe("a");
    expect(hit.firstHitFraction).toBeGreaterThan(0); expect(hit.firstHitFraction).toBeLessThan(1);
    expect(hit.closingMetresPerSecond).toBeGreaterThan(3); expect(hit.closingMetresPerSecond).toBeLessThan(5);
    expect(Object.isFrozen(hit.boat.velocityMetresPerSecond)).toBe(true);
    expect(result.contacts).toHaveLength(1); expect(result.progress.every(p => p.event === null)).toBe(true);
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
  const contacts = new Set<string>();
  for (let step = 1; step <= definition.maxRaceSeconds * 30 && boats.some(b => b.lapDone < 2); step++) {
    const raceTime = step / 30, wind = windAt(raceTime, 3);
    const next = stepPhysicalRaceFleet({ ...frame(boats, profile), navigation, course, context, raceTime,
      windDir: wind.dir, gust: wind.gust, windStrengthMul: strength });
    if (!next) throw new Error("A valid physical fleet frame was rejected");
    for (const hit of next.contacts) contacts.add(hit.kind === "hull" ? `${hit.boatId}:${hit.otherBoatId}` : `${hit.boatId}:mark${hit.markIndex}`);
    for (const p of next.progress) if (p.event) events.get(p.boatId)!.push(p.event);
    boats = next.boats; navigation = next.navigation;
  }
  return { boats, events, contacts, definition };
}
for (const profile of ["short", "medium", "long"] as const) for (const strength of [.65, 1, 1.3]) for (const early of [false, true]) {
  it(`${profile}: five actual boats finish every ordered gate in wind x${strength}, early=${early}`, async () => {
    // Let the worker deliver its report between CPU-bound journeys. Keeping
    // the whole file in microtasks can starve Vitest's60s RPC acknowledgement.
    await new Promise<void>(done => setImmediate(done));
    const result = sail(profile, strength, early);
    expect(result.boats).toHaveLength(5);
    expect([...result.contacts]).toEqual([]);
    for (const b of result.boats) {
      expect(b.lapDone, b.id).toBe(2);
      expect(b.finishTime).toBeLessThan(result.definition.maxRaceSeconds);
      expect(b.finishTime).toBeGreaterThan(result.definition.legMetres * 2 / (8 * .514444));
      expect(result.events.get(b.id)).toEqual(["start", "round-east", "round-north", "mark", "finish"]);
      expect(b.autopilot).toBeUndefined();
    }
  }, 60_000);
}

for (const [difficulty, early, seed] of [["easy", true, 3], ["hard", false, 3], ["hard", true, 3], ["hard", true, 1]] as const) {
  it(`finishes the actual short weak-wind ${difficulty} fleet, early=${early}, seed=${seed}, with its current IDs, headings and handicaps`, async () => {
    await new Promise<void>(done => setImmediate(done));
    const cfg = DIFFICULTY_CONFIG[difficulty];
    const profile = "short", course = makePhysicalRaceCourse(profile), context = physicalRaceContext(profile);
    const deadline = physicalCourseDefinition(profile).maxRaceSeconds;
    let boats = physicalFleetSpawns(cfg.opponents + 1).map((pos, i) => ({ ...boat(i === 0 ? "player" : `ai${i - 1}`),
      pos: { ...pos, y: pos.y - (early ? 60 : 0) }, heading: i === 0 || pos.x <= 400 ? 45 : 315, speed: early ? 4 : 0 }));
    let navigation: ReadonlyMap<string, PhysicalBotState> | undefined;
    const events = new Map(boats.map(b => [b.id, [] as string[]]));
    for (let tick = 1; tick <= deadline * 30 && boats.some(b => b.lapDone < 2); tick++) {
      const raceTime = tick / 30, wind = windAt(raceTime, seed);
      const result = stepPhysicalRaceFleet({ ...frame(boats), navigation, course, context, raceTime,
        windDir: wind.dir, gust: wind.gust, windStrengthMul: .65,
        entries: boats.map((boat, i) => ({ boat, input: "bot", speedMul: i === 0 ? 1 : cfg.aiSpeedMul * [.97, 1, 1.03][(i - 1) % 3] })) })!;
      expect(result).not.toBeNull();
      for (const p of result.progress) if (p.event) events.get(p.boatId)!.push(p.event);
      boats = result.boats; navigation = result.navigation;
    }
    for (const b of boats) {
      expect(b.lapDone, b.id).toBe(2);
      expect(b.finishTime).toBeLessThan(deadline);
      expect(events.get(b.id)).toEqual(["start", "round-east", "round-north", "mark", "finish"]);
    }
  }, 60_000);
}
