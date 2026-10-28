import Database from "better-sqlite3";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { expect, it } from "vitest";

it("does not cache a database before a failed class migration and retries after the actual cause is fixed", async () => {
  const previous = process.env.REGATTA_DB_DIR;
  const dir = mkdtempSync(path.join(tmpdir(), "regatta-race-init-")); process.env.REGATTA_DB_DIR = dir;
  const raw = new Database(path.join(dir, "regatta-stats.db"));
  raw.exec(`CREATE TABLE race_results (
    id INTEGER PRIMARY KEY AUTOINCREMENT, ts INTEGER NOT NULL, sid TEXT NOT NULL,
    nickname TEXT NOT NULL, difficulty TEXT NOT NULL, wind_strength TEXT NOT NULL,
    mission_id TEXT, finish_time_sec REAL NOT NULL, position INTEGER, total_boats INTEGER,
    tacks INTEGER, no_go_entries INTEGER, top_speed REAL, score INTEGER
  ); CREATE TABLE idx_race_class_board(id INTEGER)`);
  try {
    const db = await import("./db");
    expect(db.topByRaceClass("legacy-race-v1:standard:r1", "pro", "easy", "light")).toBeNull();
    const value = { sid: "retry", nickname: "RETRY", difficulty: "easy", windStrength: "light", finishTimeSec: 80 };
    expect(db.insertRaceResult(value)).toBeNull();
    expect((raw.pragma("table_info(race_results)") as Array<{ name: string }>).some(column => column.name === "race_class_id")).toBe(false);
    expect(raw.prepare("SELECT COUNT(*) AS n FROM race_results").get()).toEqual({ n: 0 });
    raw.exec("DROP TABLE idx_race_class_board");
    expect(db.topByRaceClass("legacy-race-v1:standard:r1", "pro", "easy", "light")).toEqual([]);
    expect(db.insertRaceResult(value)).not.toBeNull();
    expect(db.topByDifficulty("easy", "light").map(row => row.sid)).toEqual(["retry"]);
    expect(raw.prepare("SELECT race_class_id,race_mode FROM race_results").get()).toEqual({ race_class_id: null, race_mode: null });
  } finally {
    raw.close(); rmSync(dir, { recursive: true, force: true });
    if (previous === undefined) delete process.env.REGATTA_DB_DIR; else process.env.REGATTA_DB_DIR = previous;
  }
});
