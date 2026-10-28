import Database from "better-sqlite3";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { LEGACY_RACE_CONTEXT, PHYSICAL_RACE_PROFILES, physicalRaceContext, raceClassId, type RaceContext } from "./race-context";
import { makePhysicalRaceCourse } from "./race-courses";
import { makeStandardCourse } from "./race-physics";
import type { RaceResultMode } from "./race-record-class";

let dir: string;
let raw: Database.Database;
let db: typeof import("./db");
let original: Record<string, unknown>;
let migrated: Record<string, unknown>;
const previousDirectory = process.env.REGATTA_DB_DIR;
// Exact pre-class race_results schema, before the additive migration.
const oldSchema = `CREATE TABLE race_results (
  id INTEGER PRIMARY KEY AUTOINCREMENT, ts INTEGER NOT NULL, sid TEXT NOT NULL,
  nickname TEXT NOT NULL, difficulty TEXT NOT NULL, wind_strength TEXT NOT NULL,
  mission_id TEXT, finish_time_sec REAL NOT NULL, position INTEGER, total_boats INTEGER,
  tacks INTEGER, no_go_entries INTEGER, top_speed REAL, score INTEGER
)`;
beforeAll(async () => {
  dir = mkdtempSync(path.join(tmpdir(), "regatta-race-classes-")); process.env.REGATTA_DB_DIR = dir;
  raw = new Database(path.join(dir, "regatta-stats.db")); raw.exec(oldSchema);
  raw.prepare("INSERT INTO race_results(ts,sid,nickname,difficulty,wind_strength,finish_time_sec,score) VALUES(?,?,?,?,?,?,?)")
    .run(123, "historical", "HISTORICAL", "easy", "light", 81.125, 37);
  original = raw.prepare("SELECT * FROM race_results").get() as Record<string, unknown>;
  db = await import("./db");
  expect(db.topByDifficulty("easy", "light")).toHaveLength(1);
  migrated = raw.prepare("SELECT * FROM race_results").get() as Record<string, unknown>;
});
beforeEach(() => { raw.exec("DELETE FROM race_results"); });
afterAll(() => {
  raw.close(); rmSync(dir, { recursive: true, force: true });
  if (previousDirectory === undefined) delete process.env.REGATTA_DB_DIR; else process.env.REGATTA_DB_DIR = previousDirectory;
});

function legacy(sid = "legacy", finishTimeSec = 80) {
  return { sid, nickname: sid.toUpperCase(), difficulty: "easy", windStrength: "light", finishTimeSec, score: 5 };
}
function classified() {
  return { ...legacy("classified", 85.125), raceContext: LEGACY_RACE_CONTEXT, mode: "pro" as const,
    course: makeStandardCourse(), rawFinishTimeSec: 80.125, penaltySeconds: 5 };
}
/** Physical fixture rows are explicit SQL, not enabled producers. */
function fixture(context: RaceContext, mode: RaceResultMode, options: {
  sid?: string; time?: number; rawTime?: number; penalty?: number; score?: number; ts?: number;
  difficulty?: string; wind?: string; missionId?: string;
} = {}) {
  const time = options.time ?? 80;
  raw.prepare(`INSERT INTO race_results(ts,sid,nickname,difficulty,wind_strength,mission_id,finish_time_sec,score,
    race_class_id,race_mode,race_context_json,raw_finish_time_sec,penalty_seconds) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?)`)
    .run(options.ts ?? 123, options.sid ?? "fixture", (options.sid ?? "fixture").toUpperCase(), options.difficulty ?? "easy", options.wind ?? "light",
      options.missionId ?? null, time, options.score ?? 5, raceClassId(context), mode, JSON.stringify(context), options.rawTime ?? time, options.penalty ?? 0);
}

describe("real SQLite result class storage", () => {
  it("preserves every historical field and leaves all new provenance unknown", () => {
    for (const [key, value] of Object.entries(original)) expect(migrated[key]).toBe(value);
    for (const key of ["race_class_id", "race_mode", "race_context_json", "raw_finish_time_sec", "penalty_seconds"]) expect(migrated[key]).toBeNull();
  });

  it("keeps contextless, null-context and optional-mode old calls unclassified", () => {
    expect(db.insertRaceResult(legacy())).not.toBeNull();
    const withMode = { ...legacy("old-pro"), mode: "pro" };
    const withNull = { ...legacy("null-context"), raceContext: null, mode: "simple" };
    expect(db.insertRaceResult(withMode)).not.toBeNull(); expect(db.insertRaceResult(withNull)).not.toBeNull();
    const rows = raw.prepare("SELECT race_class_id,race_mode,race_context_json,raw_finish_time_sec,penalty_seconds FROM race_results").all();
    expect(rows).toEqual(Array(3).fill({ race_class_id: null, race_mode: null, race_context_json: null, raw_finish_time_sec: null, penalty_seconds: null }));
    expect(db.topByRaceClass("legacy-race-v1:standard:r1", "simple", "easy", "light")).toEqual([]);
  });

  it("stores a derived classified identity and ranked time, without rounding the raw result", () => {
    const input = { ...classified(), finishTimeSec: classified().finishTimeSec + 5e-8 };
    const id = db.insertClassifiedRaceResult(input);
    expect(id).not.toBeNull();
    const row = raw.prepare("SELECT * FROM race_results WHERE id=?").get(id) as Record<string, unknown>;
    expect(row).toMatchObject({ race_class_id: "legacy-race-v1:standard:r1", race_mode: "pro", raw_finish_time_sec: 80.125, penalty_seconds: 5, finish_time_sec: 85.125, mission_id: null });
    expect(JSON.parse(row.race_context_json as string)).toEqual(LEGACY_RACE_CONTEXT);
    const publicCandidate = db.topByRaceClass("legacy-race-v1:standard:r1", "pro", "easy", "light")![0];
    expect(publicCandidate).not.toHaveProperty("race_context_json"); expect(publicCandidate).not.toHaveProperty("course");
    expect(db.topByDifficulty("easy", "light")).toEqual([]);
  });

  it("rejects classified metadata on the old insertion path instead of dropping its identity", () => {
    expect(db.insertRaceResult(classified())).toBeNull();
    for (const patch of [{ raceContext: { model: "future" } }, { classId: "legacy-race-v1:standard:r1" }, { mode: "future" }]) {
      expect(db.insertRaceResult({ ...legacy(), ...patch })).toBeNull();
    }
    expect(raw.prepare("SELECT COUNT(*) AS n FROM race_results").get()).toEqual({ n: 0 });
  });

  it("rejects disabled physical producers and invalid classified payloads without any fallback insert", () => {
    for (const profile of PHYSICAL_RACE_PROFILES) expect(db.insertClassifiedRaceResult({ ...classified(), raceContext: physicalRaceContext(profile), course: makePhysicalRaceCourse(profile) })).toBeNull();
    for (const patch of [{ mode: undefined }, { classId: "physical-cruiser-v1:long:r1" }, { missionId: "sub-90" }, { dailyDay: "2026-10-26" }, { daily: null }, { penaltySeconds: -1 }, { finishTimeSec: 85.126 }, { course: {} }]) {
      expect(db.insertClassifiedRaceResult({ ...classified(), ...patch } as unknown as Parameters<typeof db.insertClassifiedRaceResult>[0])).toBeNull();
    }
    expect(raw.prepare("SELECT COUNT(*) AS n FROM race_results").get()).toEqual({ n: 0 });
  });

  it("isolates all four classes, both modes and all nine conditions, including faster foreign rows", () => {
    const contexts = [LEGACY_RACE_CONTEXT, ...PHYSICAL_RACE_PROFILES.map(physicalRaceContext)];
    let index = 0;
    for (const context of contexts) for (const mode of ["simple", "pro"] as const) for (const difficulty of ["easy", "medium", "hard"]) for (const wind of ["light", "medium", "heavy"]) {
      fixture(context, mode, { sid: "same-player", difficulty, wind, time: 50 + index, score: index, ts: 1000 + index }); index++;
    }
    expect(db.insertRaceResult(legacy("same-player", 20))).not.toBeNull();
    index = 0;
    for (const context of contexts) for (const mode of ["simple", "pro"] as const) for (const difficulty of ["easy", "medium", "hard"]) for (const wind of ["light", "medium", "heavy"]) {
      const rows = db.topByRaceClass(raceClassId(context), mode, difficulty, wind)!;
      expect(rows).toHaveLength(1); expect(rows[0]).toMatchObject({ finish_time_sec: 50 + index, score: index, ts: 1000 + index, race_class_id: raceClassId(context), race_mode: mode }); index++;
    }
    expect(db.topByDifficulty("easy", "light")).toHaveLength(1);
    expect(db.topByDifficulty("easy", "light")[0].finish_time_sec).toBe(20);
  });

  it("picks one actual winning row per sid with the existing latest-timestamp tie rule", () => {
    const context = physicalRaceContext("short");
    fixture(context, "pro", { sid: "a", time: 90, score: 10, ts: 100 });
    fixture(context, "pro", { sid: "a", time: 80, score: 5, ts: 200, rawTime: 75, penalty: 5 });
    fixture(context, "pro", { sid: "a", time: 85, score: 99, ts: 300 });
    fixture(context, "pro", { sid: "a", time: 80, score: 7, ts: 400, rawTime: 77, penalty: 3 });
    fixture(context, "pro", { sid: "b", time: 95, ts: 500 });
    fixture(context, "simple", { sid: "a", time: 20, score: 100, ts: 600 });
    fixture(context, "pro", { sid: "a", time: 21, missionId: "sub-90", ts: 700 });
    const rows = db.topByRaceClass(raceClassId(context), "pro", "easy", "light")!;
    expect(rows.map(r => r.sid)).toEqual(["a", "b"]);
    expect(rows[0]).toMatchObject({ finish_time_sec: 80, raw_finish_time_sec: 77, penalty_seconds: 3, score: 7, ts: 400 });
    expect(db.topByRaceClass(raceClassId(context), "pro", "easy", "light", 1)).toHaveLength(1);
  });

  it("keeps faster classified free and mission rows out of historical free, Daily and mission boards", () => {
    const day = "2026-10-20";
    const daily = db.getOrCreateDaily(day);
    const at = Date.parse(day + "T12:00:00Z");
    raw.prepare("INSERT INTO race_results(ts,sid,nickname,difficulty,wind_strength,mission_id,finish_time_sec) VALUES(?,?,?,?,?,?,?)")
      .run(at, "historical-free", "FREE", daily.difficulty, daily.wind_strength, null, 80);
    raw.prepare("INSERT INTO race_results(ts,sid,nickname,difficulty,wind_strength,mission_id,finish_time_sec) VALUES(?,?,?,?,?,?,?)")
      .run(at, "historical-mission", "MISSION", daily.difficulty, daily.wind_strength, "sub-90", 85);
    const context = physicalRaceContext("short");
    fixture(context, "simple", { sid: "classified-free", time: 20, ts: at, difficulty: daily.difficulty, wind: daily.wind_strength });
    fixture(context, "simple", { sid: "classified-mission", time: 21, ts: at, difficulty: daily.difficulty, wind: daily.wind_strength, missionId: "sub-90" });
    expect(db.topByDifficulty(daily.difficulty, daily.wind_strength).map(row => row.sid)).toEqual(["historical-free"]);
    expect(db.getDailyLeaderboard(day).map(row => row.sid)).toEqual(["historical-free"]);
    expect(db.topByMission("sub-90").map(row => row.sid)).toEqual(["historical-mission"]);
  });

  it("distinguishes valid empty boards from invalid selectors and actual SQL failure", () => {
    expect(db.topByRaceClass("legacy-race-v1:standard:r1", "pro", "easy", "light")).toEqual([]);
    for (const values of [["unknown", "pro", "easy", "light"], ["legacy-race-v1:standard:r1", "future", "easy", "light"], ["legacy-race-v1:standard:r1", "pro", "easy' OR 1=1 --", "light"]]) {
      expect(db.topByRaceClass(...values as Parameters<typeof db.topByRaceClass>)).toBeNull();
    }
    for (const mode of [undefined, null]) expect(db.topByRaceClass("legacy-race-v1:standard:r1", mode as unknown as RaceResultMode, "easy", "light")).toBeNull();
    raw.exec("ALTER TABLE race_results RENAME TO unavailable_results");
    try { expect(db.topByRaceClass("legacy-race-v1:standard:r1", "pro", "easy", "light")).toBeNull(); }
    finally { raw.exec("ALTER TABLE unavailable_results RENAME TO race_results"); }
  });

  it("does not retry a failed classified write as an unclassified insert", () => {
    raw.exec("CREATE TRIGGER reject_classified BEFORE INSERT ON race_results WHEN NEW.race_class_id IS NOT NULL BEGIN SELECT RAISE(ABORT,'blocked'); END");
    try {
      expect(db.insertClassifiedRaceResult(classified())).toBeNull();
      expect(raw.prepare("SELECT COUNT(*) AS n FROM race_results").get()).toEqual({ n: 0 });
      expect(db.insertRaceResult(legacy())).not.toBeNull();
    } finally { raw.exec("DROP TRIGGER reject_classified"); }
  });
});
