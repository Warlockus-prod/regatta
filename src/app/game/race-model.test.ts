import { describe, expect, it } from "vitest";
import { WIND_DIRECTION_BASE } from "@/lib/race-physics";
import { LEGACY_RACE_CONTEXT } from "@/lib/race-context";
import { readClassifiedRaceResult } from "@/lib/race-result-eligibility";
import { formatTime, makeCourse, raceLogTally, recordSample, soloRaceWind, sortRaceResults, type Boat } from "./race-model";

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
