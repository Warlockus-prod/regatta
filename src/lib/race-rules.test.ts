import { describe, expect, it } from "vitest";
import { makeStandardCourse, type RaceBoat } from "./race-physics";
import { createRaceRulesState, evaluateRaceRules, raceClosestApproach, raceRightOfWay, raceTack, type RaceRulesFrame } from "./race-rules";

const boat = (id: string, x: number, y: number, heading: number, speed = 4): RaceBoat => ({ id, name: id, color: "white", pos: { x, y }, heading, speed, lapDone: 0, started: true });
const course = makeStandardCourse();
const frame = (boats: RaceBoat[], extra: Partial<RaceRulesFrame> = {}): RaceRulesFrame => ({ boats, course, windDir: 0, time: 10, racing: true, ...extra });

describe("educational right-of-way subset", () => {
  it("uses the real windward tack, independently of the race adapter's opposite TWA sign", () => {
    expect(raceTack(45, 0)).toBe("port");
    expect(raceTack(315, 0)).toBe("starboard");
    expect(raceTack(0, 0)).toBeNull();
    expect(raceTack(180, 0)).toBeNull();
  });
  it("puts a port-tack boat under rule 10 and a same-tack windward boat under rule 11", () => {
    expect(raceRightOfWay(boat("p", 370, 700, 45), boat("s", 430, 700, 315), 0)).toEqual({ giveWayId: "p", standOnId: "s", rule: "10" });
    expect(raceRightOfWay(boat("windward", 420, 700, 0), boat("leeward", 400, 700, 0), 90)).toEqual({ giveWayId: "windward", standOnId: "leeward", rule: "11" });
  });
  it("applies rule 12 to a boat clear astern, not rule 11 just because she is to windward", () => {
    expect(raceRightOfWay(boat("astern", 420, 740, 0), boat("ahead", 400, 700, 0), 90)).toEqual({ giveWayId: "astern", standOnId: "ahead", rule: "12" });
    expect(raceRightOfWay(boat("turning", 420, 700, 20), boat("other", 400, 700, 300), 90)).toBeNull();
  });
  it("warns for a predicted close crossing and tells the priority boat to avoid contact too", () => {
    const p = boat("p", 370, 700, 45), s = boat("s", 430, 700, 315);
    const cpa = raceClosestApproach(p, s);
    expect(cpa.distance).toBeLessThan(1);
    expect(cpa.time).toBeGreaterThan(0);
    const { events, state } = evaluateRaceRules(createRaceRulesState(), frame([p, s]));
    expect(events).toContainEqual(expect.objectContaining({ kind: "give-way", rule: "10", boatId: "p", otherBoatId: "s", penaltySeconds: 0 }));
    expect(events).toContainEqual(expect.objectContaining({ kind: "avoid-contact", rule: "14", boatId: "s" }));
    expect(state.penalties).toEqual({});
  });
});

describe("incident deduplication and transparent training seconds", () => {
  it("charges one training penalty to the clear give-way boat per contact, never per tick", () => {
    const p = boat("p", 390, 700, 45), s = boat("s", 410, 700, 315);
    const empty = createRaceRulesState(), untouched = structuredClone(empty), fleet = structuredClone([p, s]);
    let result = evaluateRaceRules(empty, frame([p, s]));
    expect(result.state.penalties).toEqual({ p: 5 });
    expect(empty).toEqual(untouched);
    expect([p, s]).toEqual(fleet);
    for (let t = 10.05; t < 40; t += .05) result = evaluateRaceRules(result.state, frame([p, s], { time: t }));
    expect(result.state.penalties).toEqual({ p: 5 });
  });
  it("does not punish two boats moving apart, an ambiguous encounter, or a mark-room dispute", () => {
    const apart = evaluateRaceRules(createRaceRulesState(), frame([boat("p", 390, 700, 315), boat("s", 410, 700, 45)]));
    expect(apart.state.penalties).toEqual({});
    const uncertain = evaluateRaceRules(createRaceRulesState(), frame([boat("a", 400, 700, 0), boat("b", 400, 680, 180)]));
    expect(uncertain.state.penalties).toEqual({});
    const byMark = evaluateRaceRules(createRaceRulesState(), frame([boat("p", 390, 220, 45), boat("s", 410, 220, 315)]));
    expect(byMark.state.penalties).toEqual({});
  });
  it("coalesces contact across separation jitter and allows a later independent incident", () => {
    const p = boat("p", 390, 700, 45), s = boat("s", 410, 700, 315);
    let result = evaluateRaceRules(createRaceRulesState(), frame([p, s]));
    s.pos.x = 413;
    result = evaluateRaceRules(result.state, frame([p, s], { time: 11 }));
    s.pos.x = 410;
    result = evaluateRaceRules(result.state, frame([p, s], { time: 20 }));
    expect(result.state.penalties.p).toBe(5);
    s.pos.x = 460;
    result = evaluateRaceRules(result.state, frame([p, s], { time: 21 }));
    s.pos.x = 410;
    result = evaluateRaceRules(result.state, frame([p, s], { time: 30 }));
    expect(result.state.penalties.p).toBe(10);
  });
  it("can keep advice while disabling time penalties, and does nothing during countdown", () => {
    const fleet = [boat("p", 390, 700, 45), boat("s", 410, 700, 315)];
    const hintOnly = evaluateRaceRules(createRaceRulesState(), frame(fleet, { penalties: false }));
    expect(hintOnly.events.some(e => e.kind === "contact")).toBe(true);
    expect(hintOnly.events.every(e => e.penaltySeconds === 0)).toBe(true);
    expect(hintOnly.state.penalties).toEqual({});
    const off = evaluateRaceRules(createRaceRulesState(), frame(fleet, { racing: false }));
    expect(off.events).toEqual([]);
  });
});

describe("start and port-rounding education", () => {
  it("requires an early starter to return, without claiming a time addition is the real OCS remedy", () => {
    const b = { ...boat("p", 400, 1000, 90), started: false };
    let result = evaluateRaceRules(createRaceRulesState(), frame([b]));
    expect(result.events).toContainEqual(expect.objectContaining({ kind: "early-start", rule: "29.1", boatId: "p", penaltySeconds: 0 }));
    expect(result.state.early).toEqual(["p"]);
    result = evaluateRaceRules(result.state, frame([b], { time: 10.1 }));
    expect(result.events).toEqual([]);
    b.pos.y = 1070;
    result = evaluateRaceRules(result.state, frame([b], { time: 11 }));
    expect(result.events.some(e => e.kind === "start-clear")).toBe(true);
    expect(result.state.early).toEqual([]);
  });
  it("adds a single mark-contact training penalty, warns for a wrong-side gate, and confirms a proper rounding", () => {
    const b = boat("p", 400, 180, 90);
    let result = evaluateRaceRules(createRaceRulesState(), frame([b]));
    expect(result.state.penalties.p).toBe(3);
    result = evaluateRaceRules(result.state, frame([b], { time: 10.1 }));
    expect(result.state.penalties.p).toBe(3);
    b.pos = { x: 350, y: 160 };
    result = evaluateRaceRules(result.state, frame([b], { time: 11, previousPositions: { p: { x: 350, y: 200 } } }));
    expect(result.events.some(e => e.kind === "wrong-rounding" && e.penaltySeconds === 0)).toBe(true);
    b.lapDone = 1;
    result = evaluateRaceRules(result.state, frame([b], { time: 12 }));
    expect(result.events.some(e => e.kind === "mark-rounded")).toBe(true);
    result = evaluateRaceRules(result.state, frame([b], { time: 12.1 }));
    expect(result.events.some(e => e.kind === "mark-rounded")).toBe(false);
  });
});
