// ADR-0015 point 12: the board queries that TestFlight 74, App Store 1.6.4 and
// the current site use. Contract: on a real race_results table (schema made
// by db.ts, including ensureRaceResultClassSchema) holding every kind of row
// that exists in production today, topByDifficulty, topByMission,
// topByRaceClass and getDailyLeaderboard return exactly these rows. Later M5
// steps (course filter, archive cutover, online source tag, metric floor) add
// new query shapes; the old ones must keep these outputs byte for byte.
//
// The rows: unclassified solo races from before M1-7, a multiplayer result as
// ws-server builds it (ws-server/limits.js buildRaceResultBody, through the
// same insert the /api/race-result route uses), mission races, daily races
// on the daily day, legacy classified Simple and Pro rows and one metric
// fixture row (explicit SQL: metric emission is off).
import Database from "better-sqlite3";
import { mkdtempSync, readFileSync, readdirSync, rmSync, statSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { LEGACY_RACE_CONTEXT, physicalRaceContext, raceClassId } from "./race-context";
import { makeStandardCourse } from "./race-physics";
import { dailySettings } from "./daily-challenge";
import { buildRaceResultBody } from "../../ws-server/limits.js";

let dir: string;
let raw: Database.Database;
let db: typeof import("./db");
const previousDirectory = process.env.REGATTA_DB_DIR;
const DAY = "2026-10-30";
const daily = dailySettings(DAY);
const at = (iso: string) => Date.parse(iso);

beforeAll(async () => {
  dir = mkdtempSync(path.join(tmpdir(), "regatta-race-archive-")); process.env.REGATTA_DB_DIR = dir;
  db = await import("./db");
  const clock = vi.spyOn(Date, "now");
  const insert = (ts: number, row: Parameters<typeof db.insertRaceResult>[0]) => { clock.mockReturnValue(ts); expect(db.insertRaceResult(row)).not.toBeNull(); };
  const classified = (ts: number, sid: string, mode: "simple" | "pro", rawSec: number, penalty: number, difficulty = "easy", windStrength = "light") => {
    clock.mockReturnValue(ts);
    expect(db.insertClassifiedRaceResult({ sid, nickname: sid.toUpperCase(), difficulty, windStrength, finishTimeSec: rawSec + penalty, score: 7,
      raceContext: LEGACY_RACE_CONTEXT, mode, course: makeStandardCourse(), rawFinishTimeSec: rawSec, penaltySeconds: penalty })).not.toBeNull();
  };
  // Old solo races (before M1-7): no class, no mode. Two by one player: the best counts.
  insert(at("2026-09-01T10:00:00Z"), { sid: "solo-a", nickname: "Ania", difficulty: "easy", windStrength: "light", finishTimeSec: 95.5, position: 1, totalBoats: 3, tacks: 4, noGoEntries: 1, topSpeed: 6.2, score: 40 });
  insert(at("2026-09-02T10:00:00Z"), { sid: "solo-a", nickname: "Ania", difficulty: "easy", windStrength: "light", finishTimeSec: 91.25, position: 1, totalBoats: 3, tacks: 3, noGoEntries: 0, topSpeed: 6.4, score: 44 });
  insert(at("2026-09-03T10:00:00Z"), { sid: "solo-b", nickname: "Borys", difficulty: "easy", windStrength: "light", finishTimeSec: 120, score: 20 });
  insert(at("2026-09-04T10:00:00Z"), { sid: "solo-c", nickname: "Celia", difficulty: "hard", windStrength: "heavy", finishTimeSec: 70.75, score: 60 });
  // A multiplayer result, exactly as ws-server builds the body (score null, position from the room).
  const room = { difficulty: "easy", windStrength: "light", missionId: null, results: [{ id: "p2" }, { id: "p1" }],
    stats: new Map([["p1", { tacks: 5, noGoEntries: 2, topSpeed: 6.789 }]]) };
  const body = buildRaceResultBody(room, { id: "p1", nickname: "Online Olek", boat: { finishTime: 101.4 } })!;
  expect(body).toEqual({ difficulty: "easy", windStrength: "light", missionId: null, finishTimeSec: 101.4, position: 2, totalBoats: 2,
    tacks: 5, noGoEntries: 2, topSpeed: 6.8, score: null, nicknameFallback: "Online Olek" });
  insert(at("2026-10-05T18:00:00Z"), { sid: "mp-olek", nickname: body.nicknameFallback, difficulty: body.difficulty, windStrength: body.windStrength,
    missionId: body.missionId, finishTimeSec: body.finishTimeSec, position: body.position, totalBoats: body.totalBoats, tacks: body.tacks,
    noGoEntries: body.noGoEntries, topSpeed: body.topSpeed, score: body.score });
  // Mission races.
  insert(at("2026-10-10T08:00:00Z"), { sid: "mission-a", nickname: "Ania", difficulty: "medium", windStrength: "medium", missionId: "clean-laps", finishTimeSec: 88, score: 50 });
  insert(at("2026-10-11T08:00:00Z"), { sid: "mission-d", nickname: "Dawid", difficulty: "medium", windStrength: "medium", missionId: "clean-laps", finishTimeSec: 84.5, score: 52 });
  insert(at("2026-10-12T08:00:00Z"), { sid: "mission-d", nickname: "Dawid", difficulty: "easy", windStrength: "light", missionId: "sub-90", finishTimeSec: 89.9, score: 55 });
  // The daily race: unclassified rows on the daily day with its settings, one the day before, one with other settings.
  clock.mockReturnValue(at(`${DAY}T00:00:01Z`)); db.getOrCreateDaily(DAY);
  insert(at(`${DAY}T07:00:00Z`), { sid: "daily-e", nickname: "Ewa", difficulty: daily.difficulty, windStrength: daily.windStrength, finishTimeSec: 99, score: 30 });
  insert(at(`${DAY}T21:00:00Z`), { sid: "daily-f", nickname: "Filip", difficulty: daily.difficulty, windStrength: daily.windStrength, finishTimeSec: 97.5, score: 31 });
  insert(at("2026-10-29T23:59:59Z"), { sid: "daily-g", nickname: "Gosia", difficulty: daily.difficulty, windStrength: daily.windStrength, finishTimeSec: 60, score: 99 });
  insert(at(`${DAY}T12:00:00Z`), { sid: "daily-h", nickname: "Henryk", difficulty: daily.difficulty === "easy" ? "hard" : "easy", windStrength: daily.windStrength, finishTimeSec: 61, score: 98 });
  // Legacy classified Simple and Pro rows (M1-7).
  classified(at("2026-10-20T09:00:00Z"), "class-s", "simple", 90.5, 0);
  classified(at("2026-10-20T10:00:00Z"), "class-s", "simple", 86, 5);
  classified(at("2026-10-21T09:00:00Z"), "class-p", "pro", 80.125, 5);
  classified(at("2026-10-21T10:00:00Z"), "class-q", "pro", 79, 0, "hard", "heavy");
  clock.mockRestore();
  // One metric row as explicit SQL (the producer is disabled): it must not enter the old boards.
  raw = new Database(path.join(dir, "regatta-stats.db"));
  const metric = physicalRaceContext("short");
  raw.prepare(`INSERT INTO race_results(ts,sid,nickname,difficulty,wind_strength,mission_id,finish_time_sec,score,
    race_class_id,race_mode,race_context_json,raw_finish_time_sec,penalty_seconds) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?)`)
    .run(at("2026-10-25T09:00:00Z"), "metric-m", "METRIC", "easy", "light", null, 40, 9, raceClassId(metric), "simple", JSON.stringify(metric), 40, 0);
});
afterAll(() => {
  raw?.close(); rmSync(dir, { recursive: true, force: true });
  if (previousDirectory === undefined) delete process.env.REGATTA_DB_DIR; else process.env.REGATTA_DB_DIR = previousDirectory;
});

describe("old board query shapes over every production row kind", () => {
  // JSON text, so column order and number formatting are pinned too: the API returns these rows as they are.
  const json = (rows: unknown) => JSON.stringify(rows);

  it("topByDifficulty: the unclassified pool old apps read (/api/leaderboard?difficulty&wind)", () => {
    // Best row per player; multiplayer stays in the pool; missions, classified and metric rows stay out.
    expect(json(db.topByDifficulty("easy", "light"))).toBe("[{\"nickname\":\"Ania\",\"sid\":\"solo-a\",\"difficulty\":\"easy\",\"wind_strength\":\"light\",\"mission_id\":null,\"finish_time_sec\":91.25,\"score\":44,\"ts\":1788343200000},{\"nickname\":\"Online Olek\",\"sid\":\"mp-olek\",\"difficulty\":\"easy\",\"wind_strength\":\"light\",\"mission_id\":null,\"finish_time_sec\":101.4,\"score\":null,\"ts\":1791223200000},{\"nickname\":\"Borys\",\"sid\":\"solo-b\",\"difficulty\":\"easy\",\"wind_strength\":\"light\",\"mission_id\":null,\"finish_time_sec\":120,\"score\":20,\"ts\":1788429600000}]");
    expect(json(db.topByDifficulty("hard", "heavy"))).toBe("[{\"nickname\":\"Celia\",\"sid\":\"solo-c\",\"difficulty\":\"hard\",\"wind_strength\":\"heavy\",\"mission_id\":null,\"finish_time_sec\":70.75,\"score\":60,\"ts\":1788516000000}]");
    expect(json(db.topByDifficulty(daily.difficulty, daily.windStrength))).toBe("[{\"nickname\":\"Gosia\",\"sid\":\"daily-g\",\"difficulty\":\"hard\",\"wind_strength\":\"medium\",\"mission_id\":null,\"finish_time_sec\":60,\"score\":99,\"ts\":1793318399000},{\"nickname\":\"Filip\",\"sid\":\"daily-f\",\"difficulty\":\"hard\",\"wind_strength\":\"medium\",\"mission_id\":null,\"finish_time_sec\":97.5,\"score\":31,\"ts\":1793394000000},{\"nickname\":\"Ewa\",\"sid\":\"daily-e\",\"difficulty\":\"hard\",\"wind_strength\":\"medium\",\"mission_id\":null,\"finish_time_sec\":99,\"score\":30,\"ts\":1793343600000}]");
    expect(db.topByDifficulty("medium", "light")).toEqual([]);
  });

  it("topByMission: mission boards", () => {
    expect(json(db.topByMission("clean-laps"))).toBe("[{\"nickname\":\"Dawid\",\"sid\":\"mission-d\",\"difficulty\":\"medium\",\"wind_strength\":\"medium\",\"mission_id\":\"clean-laps\",\"finish_time_sec\":84.5,\"score\":52,\"ts\":1791705600000},{\"nickname\":\"Ania\",\"sid\":\"mission-a\",\"difficulty\":\"medium\",\"wind_strength\":\"medium\",\"mission_id\":\"clean-laps\",\"finish_time_sec\":88,\"score\":50,\"ts\":1791619200000}]");
    expect(json(db.topByMission("sub-90"))).toBe("[{\"nickname\":\"Dawid\",\"sid\":\"mission-d\",\"difficulty\":\"easy\",\"wind_strength\":\"light\",\"mission_id\":\"sub-90\",\"finish_time_sec\":89.9,\"score\":55,\"ts\":1791792000000}]");
    expect(db.topByMission("minimal-tacks")).toEqual([]);
  });

  it("topByRaceClass: legacy classified Simple and Pro boards, and the readable metric board", () => {
    expect(json(db.topByRaceClass("legacy-race-v1:standard:r1", "simple", "easy", "light"))).toBe("[{\"nickname\":\"CLASS-S\",\"sid\":\"class-s\",\"difficulty\":\"easy\",\"wind_strength\":\"light\",\"mission_id\":null,\"finish_time_sec\":90.5,\"score\":7,\"ts\":1792486800000,\"race_class_id\":\"legacy-race-v1:standard:r1\",\"race_mode\":\"simple\",\"raw_finish_time_sec\":90.5,\"penalty_seconds\":0}]");
    expect(json(db.topByRaceClass("legacy-race-v1:standard:r1", "pro", "easy", "light"))).toBe("[{\"nickname\":\"CLASS-P\",\"sid\":\"class-p\",\"difficulty\":\"easy\",\"wind_strength\":\"light\",\"mission_id\":null,\"finish_time_sec\":85.125,\"score\":7,\"ts\":1792573200000,\"race_class_id\":\"legacy-race-v1:standard:r1\",\"race_mode\":\"pro\",\"raw_finish_time_sec\":80.125,\"penalty_seconds\":5}]");
    expect(json(db.topByRaceClass("legacy-race-v1:standard:r1", "pro", "hard", "heavy"))).toBe("[{\"nickname\":\"CLASS-Q\",\"sid\":\"class-q\",\"difficulty\":\"hard\",\"wind_strength\":\"heavy\",\"mission_id\":null,\"finish_time_sec\":79,\"score\":7,\"ts\":1792576800000,\"race_class_id\":\"legacy-race-v1:standard:r1\",\"race_mode\":\"pro\",\"raw_finish_time_sec\":79,\"penalty_seconds\":0}]");
    expect(json(db.topByRaceClass("physical-cruiser-v1:short:r1", "simple", "easy", "light"))).toBe("[{\"nickname\":\"METRIC\",\"sid\":\"metric-m\",\"difficulty\":\"easy\",\"wind_strength\":\"light\",\"mission_id\":null,\"finish_time_sec\":40,\"score\":9,\"ts\":1792918800000,\"race_class_id\":\"physical-cruiser-v1:short:r1\",\"race_mode\":\"simple\",\"raw_finish_time_sec\":40,\"penalty_seconds\":0}]");
    expect(db.topByRaceClass("physical-cruiser-v1:medium:r1", "simple", "easy", "light")).toEqual([]);
  });

  it("getDailyLeaderboard: only the daily day's unclassified rows with its settings", () => {
    expect(daily).toEqual({ day: DAY, seed: 639, difficulty: "hard", windStrength: "medium", missionId: null });
    expect(json(db.getDailyLeaderboard(DAY))).toBe("[{\"nickname\":\"Filip\",\"sid\":\"daily-f\",\"difficulty\":\"hard\",\"wind_strength\":\"medium\",\"mission_id\":null,\"finish_time_sec\":97.5,\"score\":31,\"ts\":1793394000000},{\"nickname\":\"Ewa\",\"sid\":\"daily-e\",\"difficulty\":\"hard\",\"wind_strength\":\"medium\",\"mission_id\":null,\"finish_time_sec\":99,\"score\":30,\"ts\":1793343600000}]");
    expect(db.getDailyLeaderboard("2026-10-31")).toEqual([]);
  });

  it("keeps every stored row: nothing here or in the code rewrites race_results", () => {
    expect(raw.prepare("SELECT COUNT(*) AS n FROM race_results").get()).toEqual({ n: 17 });
    const sources: string[] = [];
    const walk = (folder: string) => { for (const name of readdirSync(folder)) {
      const full = path.join(folder, name);
      if (name === "node_modules" || name.startsWith(".")) continue;
      if (statSync(full).isDirectory()) walk(full);
      else if (/\.(ts|tsx|js|mjs|cjs|sh|sql)$/.test(name) && !/\.(test|spec)\./.test(name)) sources.push(full);
    } };
    for (const folder of ["src", "ws-server", "scripts", "ops"]) walk(path.resolve(__dirname, "../..", folder));
    expect(sources.length).toBeGreaterThan(100);
    const offenders = sources.filter(file => /\b(update|delete\s+from|replace\s+into)\s+race_results\b/i.test(readFileSync(file, "utf8")));
    expect(offenders).toEqual([]);
  });
});
