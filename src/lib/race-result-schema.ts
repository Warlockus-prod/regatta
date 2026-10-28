import type Database from "better-sqlite3";

/** Additive and atomic: historical rows keep NULL provenance, with no guessed
 * mode/model or raw/penalty values. A failed migration must be retried. */
export function ensureRaceResultClassSchema(database: Database.Database): void {
  database.transaction(() => {
    const columns = database.pragma("table_info(race_results)") as Array<{ name: string }>;
    if (!columns.length) throw new Error("Missing race results table");
    const names = new Set(columns.map(column => column.name));
    const additions = [
      ["race_class_id", "TEXT"], ["race_mode", "TEXT"], ["race_context_json", "TEXT"],
      ["raw_finish_time_sec", "REAL"], ["penalty_seconds", "REAL"],
    ] as const;
    for (const [name, type] of additions) if (!names.has(name)) database.exec(`ALTER TABLE race_results ADD COLUMN ${name} ${type}`);
    database.exec("CREATE INDEX IF NOT EXISTS idx_race_class_board ON race_results(race_class_id, race_mode, difficulty, wind_strength, mission_id, finish_time_sec)");
  })();
}
