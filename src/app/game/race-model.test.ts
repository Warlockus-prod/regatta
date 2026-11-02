import { describe, expect, it } from "vitest";
import { WIND_DIRECTION_BASE } from "@/lib/race-physics";
import { LEGACY_RACE_CONTEXT } from "@/lib/race-context";
import { readClassifiedRaceResult } from "@/lib/race-result-eligibility";
import { formatTime, makeCourse, playerPlaceSettled, raceLogTally, recordSample, soloRaceWind, sortRaceResults, type Boat } from "./race-model";

// The solo race wind exactly as GameClient's loop computed it inline before
// M0-1 moved it here; the helper must keep every number.
function inlineWind(raceT: number) {
  const shift = Math.sin(raceT * (2 * Math.PI / 22)) * 6 + Math.sin(raceT * (2 * Math.PI / 7)) * 2;
  const gust = 1.0 + Math.sin(raceT * (2 * Math.PI / 9)) * 0.12 + Math.sin(raceT * (2 * Math.PI / 3.3)) * 0.05;
  return { dir: (WIND_DIRECTION_BASE + shift + 360) % 360, gust: Math.max(0.75, Math.min(1.25, gust)) };
}

const boat = (patch: Partial<Boat>): Boat => ({ id: "b", name: "B", color: "#fff", pos: { x: 0, y: 0 }, heading: 0, speed: 0,
  isPlayer: false, lapDone: 0, speedMul: 1, ...patch } as Boat);

describe("solo race model", () => {
  it("keeps the solo wind formula: base direction at the gun, bounded shifts and gusts", () => {
    expect(soloRaceWind(0)).toEqual({ dir: WIND_DIRECTION_BASE, gust: 1 });
    for (let t = 0; t <= 300; t += 0.37) {
      const wind = soloRaceWind(t);
      expect(wind).toEqual(inlineWind(t));
      expect(wind.gust).toBeGreaterThanOrEqual(0.75);
      expect(wind.gust).toBeLessThanOrEqual(1.25);
      const shift = ((wind.dir - WIND_DIRECTION_BASE + 540) % 360) - 180;
      expect(Math.abs(shift)).toBeLessThanOrEqual(8);
    }
  });

  it("orders the finish table by penalty-adjusted time with non-finishers last", () => {
    const boats = [
      boat({ id: "player", name: "You", isPlayer: true, finishTime: 100 }),
      boat({ id: "ai0", name: "Nautilus", finishTime: 104 }),
      boat({ id: "ai1", name: "Mistral" }),
    ];
    const rows = sortRaceResults(boats, { player: 5 });
    expect(rows.map(r => [r.name, r.time])).toEqual([["Nautilus", 104], ["You", 105], ["Mistral", Infinity]]);
    expect(rows[1].isPlayer).toBe(true);
    expect(boats.map(b => b.id)).toEqual(["player", "ai0", "ai1"]);
  });

  it("M5: places estimated times among real ones (penalty-adjusted), puts still-racing rows before the DNFs, and leaves legacy rows unmarked", () => {
    const boats = [
      boat({ id: "player", name: "You", isPlayer: true, lapDone: 2, finishTime: 100 }),
      boat({ id: "ai0", name: "Nautilus" }), boat({ id: "ai1", name: "Mistral" }), boat({ id: "ai2", name: "Trident" }),
    ];
    const pending = sortRaceResults(boats, { player: 5 }, { pending: new Set(["ai0", "ai2"]) });
    expect(pending.map(r => [r.name, r.time, r.pending ?? false])).toEqual([["You", 105, false], ["Nautilus", Infinity, true], ["Trident", Infinity, true], ["Mistral", Infinity, false]]);
    // An estimate of 98 s plus a 10 s penalty is 108 s, behind the player's 105 s; 101 s is ahead.
    const estimated = sortRaceResults(boats, { player: 5, ai0: 10 }, { estimated: new Map([["ai0", 98], ["ai1", 101], ["ai2", null]]) });
    expect(estimated.map(r => [r.name, r.time, r.estimated ?? false])).toEqual([["Mistral", 101, true], ["You", 105, false], ["Nautilus", 108, true], ["Trident", Infinity, true]]);
    expect(Object.keys(sortRaceResults(boats, {})[0]).sort()).toEqual(["color", "isPlayer", "name", "time"]);
  });

  it("M5: a penalised player's place is open while a bot still racing can finish inside the penalty window", () => {
    const boats = [
      boat({ id: "player", name: "You", isPlayer: true, lapDone: 2, finishTime: 100 }),
      boat({ id: "ai0", name: "Nautilus" }), boat({ id: "ai1", name: "Mistral" }),
    ];
    const pending = new Set(["ai0", "ai1"]);
    // No player penalty: a bot still racing at 100 s finishes after 100 s.
    expect(playerPlaceSettled(boats, {}, pending, 100)).toBe(true);
    // 30 s on the player: ai0 at 101 s raw would be 101 against 130.
    expect(playerPlaceSettled(boats, { player: 30 }, pending, 100)).toBe(false);
    // ...unless every bot still racing already carries as much: 100 + 30 >= 130.
    expect(playerPlaceSettled(boats, { player: 30, ai0: 30, ai1: 40 }, pending, 100)).toBe(true);
    // A bot no longer pending, or a player without a finish, settles nothing to wait for.
    expect(playerPlaceSettled(boats, { player: 30 }, new Set(), 100)).toBe(true);
    expect(playerPlaceSettled([{ ...boats[0], finishTime: undefined }, boats[1]], { player: 30 }, pending, 100)).toBe(true);
  });

  it("tallies tacks (not gybes), no-go entries and the top logged speed", () => {
    const tally = raceLogTally(
      [{ type: "start", t: 0 }, { type: "tack", t: 3 }, { type: "no-go-entered", t: 4 }, { type: "gybe", t: 6 }, { type: "tack", t: 9 }],
      [{ t: 0, x: 0, y: 0, heading: 0, twa: 0, speed: 3.2, lap: 0 }, { t: 1, x: 0, y: 0, heading: 0, twa: 0, speed: 6.1, lap: 0 }]);
    expect(tally).toEqual({ tacks: 2, noGoEntries: 1, topSpeed: 6.1 });
    expect(raceLogTally([], [])).toEqual({ tacks: 0, noGoEntries: 0, topSpeed: 0 });
  });

  it("labels the standard course marks and records rounded samples", () => {
    const course = makeCourse();
    expect(course.marks.map(m => m.labelEn)).toEqual(["Windward mark", "Start/Finish L", "Start/Finish R"]);
    expect(course.marks[0].roundSide).toBe("port");
    const sample = recordSample(boat({ pos: { x: 10.6, y: -3.4 }, heading: 44.6, speed: 5.26, lapDone: 1 }), 12, 0);
    expect(sample).toMatchObject({ t: 12, x: 11, y: -3, heading: 45, speed: 5.3, lap: 1, windDir: 0, trim: undefined });
  });

  it("formats race times as m:ss.d and a dash for no time", () => {
    expect(formatTime(87.46)).toBe("1:27.4");
    expect(formatTime(5)).toBe("0:05.0");
    expect(formatTime(Infinity)).toBe("-");
  });
});

describe("leaderboard save of a free race (M1-7)", () => {
  it("the course the race screen sends passes the server's classified check in both modes", () => {
    // GameClient.saveResult sends the translated course; labels must not break the geometry match.
    for (const mode of ["simple", "pro"] as const) {
      const read = readClassifiedRaceResult({ difficulty: "easy", windStrength: "medium", missionId: null, finishTimeSec: 95.5,
        raceContext: LEGACY_RACE_CONTEXT, mode, course: makeCourse(), rawFinishTimeSec: 90.5, penaltySeconds: 5 });
      expect(read.ok, mode).toBe(true);
    }
  });
});
