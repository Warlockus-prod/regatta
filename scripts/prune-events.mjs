#!/usr/bin/env node
/**
 * Event retention for the analytics SQLite store (regatta-stats.db).
 *
 * Deletes raw rows older than the retention window (default 180 days):
 *   - events    by ts         (page views, funnel events, JS errors)
 *   - sessions  by last_seen  (per-visitor session rows)
 * Feedback, leaderboard, replays, players and gallery likes are NOT touched.
 *
 * Runs inside the `regatta` container, as the container's non-root user, so
 * the host only triggers a fixed command and never executes repository code:
 *
 *   docker exec regatta node scripts/prune-events.mjs --dry-run   # always first
 *   docker exec regatta node scripts/prune-events.mjs             # then delete
 *
 * Options:
 *   --dry-run      count what would be deleted, delete nothing
 *   --days=N       retention window in days (default 180, minimum 30)
 *   --db=PATH      database file (default $REGATTA_DB_DIR/regatta-stats.db)
 *
 * Deletes in batches so the app's own inserts are never blocked for long. Freed
 * pages are reused by SQLite; the file does not shrink without a VACUUM, which
 * this script does not run. Schedule and recovery: docs/OPS.md.
 */

import Database from 'better-sqlite3';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const DEFAULT_RETENTION_DAYS = 180;
// Guard against a typo such as --days=1 wiping almost the whole history.
export const MIN_RETENTION_DAYS = 30;
const DAY_MS = 24 * 3600 * 1000;

/**
 * @param {import('better-sqlite3').Database} db
 * @param {{ days?: number, dryRun?: boolean, now?: number, batch?: number }} [opts]
 * @returns {{ cutoffMs: number, dryRun: boolean, events: number, sessions: number }}
 *   `events` / `sessions` are rows deleted, or rows that would be deleted on a dry run.
 */
export function pruneEvents(db, opts = {}) {
  const days = opts.days ?? DEFAULT_RETENTION_DAYS;
  const dryRun = opts.dryRun ?? false;
  const now = opts.now ?? Date.now();
  const batch = opts.batch ?? 5000;
  if (!Number.isInteger(days) || days < MIN_RETENTION_DAYS) {
    throw new Error(`retention must be a whole number of days >= ${MIN_RETENTION_DAYS}, got ${days}`);
  }
  const cutoffMs = now - days * DAY_MS;
  const hasTable = (name) =>
    Boolean(db.prepare("SELECT 1 FROM sqlite_master WHERE type = 'table' AND name = ?").get(name));
  const hasEvents = hasTable('events');
  const hasSessions = hasTable('sessions');

  if (dryRun) {
    const count = (sql) => /** @type {{ c: number }} */ (db.prepare(sql).get(cutoffMs)).c;
    return {
      cutoffMs,
      dryRun,
      events: hasEvents ? count('SELECT COUNT(*) c FROM events WHERE ts < ?') : 0,
      sessions: hasSessions ? count('SELECT COUNT(*) c FROM sessions WHERE last_seen < ?') : 0,
    };
  }

  let events = 0;
  if (hasEvents) {
    const del = db.prepare('DELETE FROM events WHERE id IN (SELECT id FROM events WHERE ts < ? LIMIT ?)');
    for (;;) {
      const n = del.run(cutoffMs, batch).changes;
      events += n;
      if (n < batch) break;
    }
  }
  const sessions = hasSessions
    ? db.prepare('DELETE FROM sessions WHERE last_seen < ?').run(cutoffMs).changes
    : 0;
  return { cutoffMs, dryRun, events, sessions };
}

function parseArgs(argv) {
  const out = { dryRun: false, days: DEFAULT_RETENTION_DAYS, db: '' };
  for (const arg of argv) {
    if (arg === '--dry-run') out.dryRun = true;
    else if (arg.startsWith('--days=')) out.days = Number(arg.slice('--days='.length));
    else if (arg.startsWith('--db=')) out.db = arg.slice('--db='.length);
    else throw new Error(`unknown argument: ${arg}`);
  }
  return out;
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  const dbPath = args.db || path.join(process.env.REGATTA_DB_DIR || '/tmp', 'regatta-stats.db');
  const db = new Database(dbPath, { fileMustExist: true });
  db.pragma('busy_timeout = 5000');
  try {
    const r = pruneEvents(db, { days: args.days, dryRun: args.dryRun });
    const cutoff = new Date(r.cutoffMs).toISOString();
    const verb = r.dryRun ? 'would delete' : 'deleted';
    console.log(
      `[${new Date().toISOString()}] prune-events${r.dryRun ? ' (dry run)' : ''}: ${verb} ` +
      `${r.events} events and ${r.sessions} sessions older than ${cutoff} (${args.days} days) in ${dbPath}`,
    );
  } finally {
    db.close();
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    main();
  } catch (err) {
    console.error(`[${new Date().toISOString()}] prune-events failed: ${err instanceof Error ? err.message : err}`);
    process.exit(1);
  }
}
