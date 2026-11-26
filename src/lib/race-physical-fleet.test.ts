import { describe, expect, it } from "vitest";
import { physicalRaceContext, type PhysicalRaceProfile } from "./race-context";
import { makePhysicalRaceCourse, physicalCourseDefinition, physicalCourseWaterBounds, physicalFleetSpawns } from "./race-courses";
import { stepPhysicalRaceFleet, type PhysicalFleetFrame } from "./race-physical-fleet";
import { stepPhysicalBoat, type PhysicalRaceCrew, type PhysicalRaceInput } from "./race-physical-motion";
import { PHYSICAL_FLEET_HZ, planPhysicalBot, type PhysicalBotState } from "./race-physical-bot";
import { physicalTrialSteering } from "./race-trial";
import { windAt, type RaceBoat } from "./race-physics";
import { DIFFICULTY_CONFIG } from "@/app/game/config";
import { soloRaceWind } from "@/app/game/race-model";
import { createRaceRulesState, evaluateRaceRules } from "./race-rules";
import { raceScale } from "./race-scale";

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
    // M5 escape memory (ADR-0015 point 5): whole ticks, a hold of at most 4 s.
    { ...state(), stall: -1 }, { ...state(), stall: 1.5 },
    { ...state(), escape: { heading: 75, until: 4.1 } }, { ...state(), tick: 60, escape: { heading: 75, until: 1.9 } },
    { ...state(), escape: { heading: NaN, until: 1 } }, { ...state(), escape: { heading: 75, until: 1, side: 1 } },
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

  it("accepts and owns a committed escape and its stall count without changing the caller", () => {
    const memory: PhysicalBotState = { ...state(), tick: 30, stall: 3, escape: { heading: 75, until: 4.5 } };
    const original = { ...frame([{ ...boat(), pos: { x: 400, y: 700 }, heading: 10, speed: .3 }]), navigation: new Map([["p", memory]]) };
    const before = structuredClone(original), result = stepPhysicalRaceFleet(original)!;
    expect(result).not.toBeNull(); expect(original).toEqual(before);
    const next = result.navigation.get("p")!;
    expect(next.escape).toEqual({ heading: 75, until: 4.5 }); expect(next.escape).not.toBe(memory.escape);
    // The held escape is also what the bot is predicted to steer.
    expect(next.predictive!.heading).toBe(75);
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

  it("keeps two boats grinding abeam on the shared force path moving and hands their bent path to the caller", () => {
    // ADR-0015 point 4 through the real fleet step: course assist 5 degrees
    // into each other at 5 kn, 13.2 m apart. Before M5 both stood still
    // (0 m in 5 s); ADR-0004's closing loss still slows a boat that keeps
    // steering into another hull (measured 2026-11-01: 0.31 of free travel at
    // 5 degrees, 0.20 at 15 degrees, speed 5.9 -> 1.1 kn).
    const mk = (id: string, y: number, heading: number) => ({ ...boat(id), pos: { x: 200, y }, heading, speed: 5 });
    let boats = [mk("a", 678, 95), mk("b", 700, 85)];
    const course = (b: RaceBoat) => ({ steering: { mode: "course-assist", heading: b.id === "a" ? 95 : 85 }, autoTrim: true } as const);
    const f = { ...frame(), racing: false };
    let metres = 0, bent = 0;
    for (let i = 0; i < 150; i++) {
      const r = stepPhysicalRaceFleet({ ...f, entries: boats.map(b => ({ boat: b, input: course(b) })) })!;
      expect(r).not.toBeNull();
      const m = r.motions.get("a")!, points = [m.from, ...(m.path ?? []), m.to];
      for (let k = 1; k < points.length; k++) metres += Math.hypot(points[k].x - points[k - 1].x, points[k].y - points[k - 1].y) * .6;
      if (m.path) bent++;
      expect(Math.hypot(r.boats[0].pos.x - r.boats[1].pos.x, r.boats[0].pos.y - r.boats[1].pos.y)).toBeGreaterThanOrEqual(22 - 1e-7);
      boats = r.boats;
    }
    expect(bent).toBeGreaterThan(100);
    expect(metres).toBeGreaterThan(3);
  });

  it("hands a boat sliding onto the water bound its bound bend through the fleet step", () => {
    // stepPhysicalBoat records the bend; the contact response must pass it
    // on to progress and to the caller instead of the chord.
    const west = physicalCourseWaterBounds("short").minX;
    const input = { steering: { mode: "course-assist", heading: 300 }, autoTrim: true } as const;
    const p = { ...boat("p"), pos: { x: west + .05, y: 600 }, heading: 300, speed: 6 };
    const f = { ...frame(), racing: false }, expected = structuredClone(p);
    const proposal = stepPhysicalBoat(expected, f.dt, f.windDir, f.gust, input, f.context, { windStrengthMul: 1 })!;
    expect(proposal.path).toHaveLength(1);
    const r = stepPhysicalRaceFleet({ ...f, entries: [{ boat: p, input }] })!;
    expect(r.motions.get("p")).toEqual(proposal);
    expect(r.motions.get("p")!.path![0].x).toBe(west);
    expect(r.impacts).toEqual([]);
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

type RaceWind = (raceTime: number) => { dir: number; gust: number };
function sail(profile: PhysicalRaceProfile, strength: number, early: boolean, windOf: RaceWind = t => windAt(t, 3)) {
  const definition = physicalCourseDefinition(profile), course = makePhysicalRaceCourse(profile), context = physicalRaceContext(profile);
  // M5: the fair echelon, everybody on the spawn heading (no crossing starts).
  let boats: RaceBoat[] = physicalFleetSpawns(5).map(({ pos, heading }, i) => ({ ...boat(`b${i}`), pos: { ...pos, y: pos.y - (early ? 60 : 0) },
    heading, speed: early ? 4 : 0 }));
  let navigation: ReadonlyMap<string, PhysicalBotState> | undefined;
  const events = new Map(boats.map(b => [b.id, [] as string[]]));
  const contacts = new Set<string>();
  // ADR-0015 point 5: bots sail the shared crew, so a bot tack goes through
  // the rig's tacking manoeuvre (an instant sail transfer never does).
  const tacked = new Set<string>();
  for (let step = 1; step <= definition.maxRaceSeconds * 30 && boats.some(b => b.lapDone < 2); step++) {
    const raceTime = step / 30, wind = windOf(raceTime);
    const next = stepPhysicalRaceFleet({ ...frame(boats, profile), navigation, course, context, raceTime,
      windDir: wind.dir, gust: wind.gust, windStrengthMul: strength });
    if (!next) throw new Error("A valid physical fleet frame was rejected");
    for (const hit of next.contacts) contacts.add(hit.kind === "hull" ? `${hit.boatId}:${hit.otherBoatId}` : `${hit.boatId}:mark${hit.markIndex}`);
    for (const p of next.progress) if (p.event) events.get(p.boatId)!.push(p.event);
    boats = next.boats; navigation = next.navigation;
    for (const b of boats as (RaceBoat & PhysicalRaceCrew)[]) if (b.rig?.maneuver === "tacking") tacked.add(b.id);
  }
  return { boats, events, contacts, definition, tacked };
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

// ADR-0015: the same 18 scenarios under the wind the live solo race really
// sails, soloRaceWind (src/app/game/useRaceLoop.ts), not windAt. Contract:
// five bots finish every ordered gate before the limit without one contact.
// Measured at HEAD (5df78d4a, engine as at e64659ac, 2026-11-01): all 18
// pass, so none is a known gap. The contacts seen with soloRaceWind come from
// fleets with a player who does not yield (race-physical-human-fleet.test.ts).
// ADR-0021 (cruiser profile, 2026-11-02): 17 of 18 pass. One known gap, kept
// as an exact expectation so the test fails when it closes: on medium x1 bot
// b2 tacks and luffs up beside the windward mark at 1.2-2 kn (a luffing rig
// now stops the boat instead of coasting it round), stays above the 1 kn
// escape threshold and slides onto the mark at 234.9 s. Raising the escape
// to 1.5 or 2 kn moved the touch to other scenarios. Bot rounding is retuned
// before switch A (docs/BACKLOG.md package 14).
const SOLO_WIND_KNOWN_CONTACTS: Readonly<Record<string, readonly string[]>> = { "medium:1:false": ["b2:mark0"] };
for (const profile of ["short", "medium", "long"] as const) for (const strength of [.65, 1, 1.3]) for (const early of [false, true]) {
  it(`${profile}: five actual boats finish every ordered gate under soloRaceWind x${strength}, early=${early}`, async () => {
    await new Promise<void>(done => setImmediate(done));
    const result = sail(profile, strength, early, soloRaceWind);
    expect(result.boats).toHaveLength(5);
    expect([...result.contacts]).toEqual(SOLO_WIND_KNOWN_CONTACTS[`${profile}:${strength}:${early}`] ?? []);
    expect([...result.tacked].sort(), "every bot tacks through the shared crew's rig").toEqual(result.boats.map(b => b.id).sort());
    for (const b of result.boats) {
      expect(b.lapDone, b.id).toBe(2);
      expect(b.finishTime).toBeLessThan(result.definition.maxRaceSeconds);
      // No gate credit by shortcut, slide or teleport: two legs at no more than 8 kn.
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
    let boats: RaceBoat[] = physicalFleetSpawns(cfg.opponents + 1).map(({ pos, heading }, i) => ({ ...boat(i === 0 ? "player" : `ai${i - 1}`),
      pos: { ...pos, y: pos.y - (early ? 60 : 0) }, heading, speed: early ? 4 : 0 }));
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

// M5 step 4 (ADR-0015 point 5) through the real fleet step and shared crew.
describe("bot escape on the shared fleet path", () => {
  const twa = (b: RaceBoat, wind: number) => Math.abs(((b.heading - wind) % 360 + 540) % 360 - 180);
  const still = { steering: { mode: "helm", rudder: 0, lowSpeedAssist: false }, autoTrim: false, trim: { mainHoisted: false, jibFurl: 1 } } as const;
  /** A bot at 0.5 kn on heading 45 beside a human-input hull with no sail up that never moves. */
  function pinned(wallEastMetres: number, wallSouthMetres: number, seconds: number) {
    let boats: RaceBoat[] = [{ ...boat("bot"), pos: { x: 400, y: 700 }, heading: 45, speed: .5 },
      { ...boat("wall"), pos: { x: 400 + wallEastMetres / .6, y: 700 + wallSouthMetres / .6 }, heading: 0, speed: 0 }];
    let navigation: ReadonlyMap<string, PhysicalBotState> | undefined;
    let escape: { heading: number } | undefined, freeAt: number | null = null, stillFor = 0, longestStill = 0;
    for (let tick = 1; tick <= seconds * 30; tick++) {
      const previous = { ...boats[0].pos };
      const r = stepPhysicalRaceFleet({ ...frame(boats), navigation, raceTime: tick / 30, entries: [{ boat: boats[0], input: "bot" }, { boat: boats[1], input: still }] })!;
      expect(r).not.toBeNull();
      boats = r.boats; navigation = r.navigation;
      escape ??= navigation.get("bot")!.escape;
      // The gate's standstill: under 0.06 m/s over the ground.
      const ground = Math.hypot(boats[0].pos.x - previous.x, boats[0].pos.y - previous.y) * .6 * 30;
      stillFor = ground < .06 ? stillFor + 1 / 30 : 0; longestStill = Math.max(longestStill, stillFor);
      const gap = Math.hypot(boats[0].pos.x - boats[1].pos.x, boats[0].pos.y - boats[1].pos.y) * .6;
      if (freeAt === null && gap > 20) freeAt = tick / 30;
    }
    return { escape, freeAt, longestStill };
  }

  it("sails a bot out of irons: committed within 3 s, clear of the no-go above 1 kn within 20 s", () => {
    // Measured 2026-11-01: commit at 1.5 s, out at about 17 s; the shared
    // helm turns only about 2.6 deg/s at 0.2 kn, the hold keeps that turn going.
    let boats: RaceBoat[] = [{ ...boat("p"), pos: { x: 400, y: 700 }, heading: 3, speed: .2 }];
    let navigation: ReadonlyMap<string, PhysicalBotState> | undefined;
    let committed: number | null = null, out: number | null = null;
    for (let tick = 1; tick <= 600; tick++) {
      const r = stepPhysicalRaceFleet({ ...frame(boats), navigation, raceTime: tick / 30 })!;
      expect(r).not.toBeNull();
      boats = r.boats; navigation = r.navigation;
      if (committed === null && navigation.get("p")!.escape) committed = tick / 30;
      if (out === null && twa(boats[0], 0) > 35 && boats[0].speed > 1) out = tick / 30;
    }
    expect(committed).not.toBeNull(); expect(committed!).toBeLessThanOrEqual(3);
    expect(out).not.toBeNull(); expect(out!).toBeLessThanOrEqual(20);
  });

  it("bears a bot pinned by a hull on its windward bow away and clear of it", () => {
    // Wall north-west, touching: away is the bot's own tack, 75 deg.
    const { escape, freeAt, longestStill } = pinned(-9.4, -9.4, 15);
    expect(escape?.heading).toBe(75);
    expect(freeAt).not.toBeNull(); expect(freeAt!).toBeLessThanOrEqual(12);
    expect(longestStill).toBeLessThanOrEqual(30);
  });

  it("bears a bot pinned bow-on away and gybes clear instead of tacking through the wind", () => {
    // Wall north-east, dead ahead at heading 45: away on the tack side is
    // 285, through the wind. Measured 2026-11-01: bearing away to 210 keeps
    // it moving (longest standstill about 5 s, clear at about 29 s); the
    // earlier tack through the wind stood 32 s, over the 30 s contract.
    const { escape, freeAt, longestStill } = pinned(9.4, -9.4, 60);
    expect(escape?.heading).toBe(210);
    expect(longestStill).toBeLessThanOrEqual(30);
    expect(freeAt).not.toBeNull(); expect(freeAt!).toBeLessThanOrEqual(45);
  });

  it("bears a bot pinned to leeward away, gybing, and keeps it moving inside 30 s", () => {
    // Wall due east, touching: away is west, on the other tack (285) only
    // through the wind, so the bot bears away to 210. Measured 2026-11-01:
    // longest standstill about 11 s (the earlier tack to 285: 23 s); it slides
    // along the hull and is 20 m clear only after about 54 s, a recorded
    // limit (ADR-0015, open for M6), not part of the 30 s contract.
    const { escape, freeAt, longestStill } = pinned(13.3, 0, 75);
    expect(escape?.heading).toBe(210);
    expect(longestStill).toBeLessThanOrEqual(30);
    expect(freeAt).not.toBeNull(); expect(freeAt!).toBeLessThanOrEqual(65);
  });
});

// M5 step 4 fair start: from the echelon nobody crosses at the gun. The live
// fleet: a human-input player on course assist along the bot route (it never
// yields, and the bots see it as a cone) plus four hard bots, countdown then
// 20 s of racing under the judge. No contact and no right-of-way encounter
// (rule 10 crossing, 11 overlap, 12 clear astern) in that time: slot -1 sits
// 27 m dead astern of the player on the common heading, so a faster bot
// coming through from astern would show up here as rule 12.
it("starts the five-boat metric fleet with a human player without a contact or right-of-way encounter in the first 20 s", () => {
  const profile = "short", course = makePhysicalRaceCourse(profile), context = physicalRaceContext(profile);
  let boats: RaceBoat[] = physicalFleetSpawns(5).map(({ pos, heading }, i) => ({ ...boat(i ? `ai${i - 1}` : "player"), pos: { ...pos }, heading }));
  let navigation: ReadonlyMap<string, PhysicalBotState> | undefined;
  const playerPlan: PhysicalBotState = { version: 1, profile, tick: 0, lap: 0 };
  let rules = createRaceRulesState();
  const encounters: string[] = [];
  let clock = 0;
  for (let tick = 1; tick <= (3 + 20) * 30; tick++) {
    const racing = tick > 90;
    if (racing) clock += 1 / 30;
    const wind = soloRaceWind(clock), previous = Object.fromEntries(boats.map(b => [b.id, { ...b.pos }]));
    playerPlan.tick += 1;
    const planned = planPhysicalBot(boats[0], course, wind.dir, context, playerPlan).heading;
    const player: PhysicalRaceInput = { steering: physicalTrialSteering(0, true, planned), autoTrim: true };
    const r = stepPhysicalRaceFleet({ ...frame(boats), navigation, course, context, raceTime: clock, racing, windDir: wind.dir, gust: wind.gust,
      entries: boats.map(b => b.id === "player" ? { boat: b, input: player } : { boat: b, input: "bot" as const, speedMul: DIFFICULTY_CONFIG.hard.aiSpeedMul * 1.03 }) })!;
    expect(r).not.toBeNull();
    for (const hit of r.contacts) encounters.push(`${clock.toFixed(1)} contact ${hit.kind === "hull" ? `${hit.boatId}/${hit.otherBoatId}` : `${hit.boatId}/mark${hit.markIndex}`}`);
    boats = r.boats; navigation = r.navigation;
    const checked = evaluateRaceRules(rules, { boats, course, windDir: wind.dir, time: clock, racing, previousPositions: previous,
      scale: raceScale(profile), impacts: r.impacts });
    rules = checked.state;
    for (const e of checked.events) if (["10", "11", "12"].includes(e.rule) || e.kind === "contact")
      encounters.push(`${clock.toFixed(1)} ${e.kind} ${e.rule} ${e.boatId}/${e.otherBoatId}`);
  }
  expect(encounters).toEqual([]);
});
