import Database from "better-sqlite3";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ensureRaceResultClassSchema } from "./race-result-schema";

const opened: Database.Database[] = [];
const oldSchema = `CREATE TABLE race_results (
  id INTEGER PRIMARY KEY AUTOINCREMENT, ts INTEGER NOT NULL, sid TEXT NOT NULL,
  nickname TEXT NOT NULL, difficulty TEXT NOT NULL, wind_strength TEXT NOT NULL,
  mission_id TEXT, finish_time_sec REAL NOT NULL, position INTEGER, total_boats INTEGER,
  tacks INTEGER, no_go_entries INTEGER, top_speed REAL, score INTEGER
)`;
function oldDatabase() {
  const database = new Database(":memory:"); opened.push(database); database.exec(oldSchema);
  database.prepare("INSERT INTO race_results(ts,sid,nickname,difficulty,wind_strength,finish_time_sec,score) VALUES(?,?,?,?,?,?,?)")
    .run(123, "old", "STARY", "easy", "light", 80.125, 42);
  return database;
}
afterEach(() => { vi.restoreAllMocks(); for (const database of opened.splice(0)) database.close(); });

describe("additive result-class schema", () => {
  it("migrates the real former SQLite schema twice without changing any historical field", () => {
    const database = oldDatabase();
    const before = database.prepare("SELECT * FROM race_results").all() as Array<Record<string, unknown>>;
    ensureRaceResultClassSchema(database); ensureRaceResultClassSchema(database);
    const after = database.prepare("SELECT * FROM race_results").all() as Array<Record<string, unknown>>;
    for (const [key, value] of Object.entries(before[0])) expect(after[0][key]).toBe(value);
    for (const name of ["race_class_id", "race_mode", "race_context_json", "raw_finish_time_sec", "penalty_seconds"]) {
      expect(after[0][name]).toBeNull();
      const column = (database.pragma("table_info(race_results)") as Array<{ name: string; notnull: number; dflt_value: unknown }>).find(c => c.name === name)!;
      expect(column.notnull).toBe(0); expect(column.dflt_value).toBeNull();
    }
    expect(database.pragma("index_list(race_results)")).toEqual(expect.arrayContaining([expect.objectContaining({ name: "idx_race_class_board" })]));
  });

  it("rolls back additions after a real SQLite index-name failure and can retry cleanly", () => {
    const database = oldDatabase();
    database.exec("CREATE TABLE idx_race_class_board(id INTEGER)");
    const schema = database.prepare("SELECT type,name,sql FROM sqlite_master ORDER BY name").all();
    expect(() => ensureRaceResultClassSchema(database)).toThrow();
    expect(database.prepare("SELECT type,name,sql FROM sqlite_master ORDER BY name").all()).toEqual(schema);
    database.exec("DROP TABLE idx_race_class_board");
    ensureRaceResultClassSchema(database);
    expect(database.prepare("SELECT race_class_id FROM race_results").get()).toEqual({ race_class_id: null });
  });

  it("finishes a partially applied historical schema without backfilling rows", () => {
    const database = oldDatabase();
    database.exec("ALTER TABLE race_results ADD COLUMN race_class_id TEXT");
    ensureRaceResultClassSchema(database);
    expect(database.prepare("SELECT race_class_id,race_mode,raw_finish_time_sec,penalty_seconds FROM race_results").get())
      .toEqual({ race_class_id: null, race_mode: null, raw_finish_time_sec: null, penalty_seconds: null });
  });

  it("fails if called without the base table instead of marking the migration ready", () => {
    const database = new Database(":memory:"); opened.push(database);
    expect(() => ensureRaceResultClassSchema(database)).toThrow("Missing race results table");
  });
});
