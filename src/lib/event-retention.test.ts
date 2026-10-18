// Event retention job (scripts/prune-events.mjs).
// Contract: a dry run deletes nothing and reports what a real run would
// delete; a real run removes events and sessions older than the window and
// nothing newer; a too-short window is refused.

import { describe, expect, it } from 'vitest';
import Database from 'better-sqlite3';
import { MIN_RETENTION_DAYS, pruneEvents } from '../../scripts/prune-events.mjs';

const DAY = 24 * 3600 * 1000;
const NOW = Date.UTC(2026, 9, 18);

function seed(eventAgesDays: number[], sessionAgesDays: number[]) {
  const db = new Database(':memory:');
  db.exec(`
    CREATE TABLE events (id INTEGER PRIMARY KEY AUTOINCREMENT, ts INTEGER NOT NULL, evt TEXT NOT NULL);
    CREATE TABLE sessions (id TEXT PRIMARY KEY, first_seen INTEGER NOT NULL, last_seen INTEGER NOT NULL);
    CREATE TABLE feedback (id INTEGER PRIMARY KEY AUTOINCREMENT, ts INTEGER NOT NULL);
  `);
  const ev = db.prepare('INSERT INTO events (ts, evt) VALUES (?, ?)');
  for (const age of eventAgesDays) ev.run(NOW - age * DAY, 'page.view');
  const se = db.prepare('INSERT INTO sessions (id, first_seen, last_seen) VALUES (?, ?, ?)');
  sessionAgesDays.forEach((age, i) => se.run(`s${i}`, NOW - age * DAY, NOW - age * DAY));
  db.prepare('INSERT INTO feedback (ts) VALUES (?)').run(NOW - 400 * DAY);
  return db;
}

const count = (db: Database.Database, table: string) =>
  (db.prepare(`SELECT COUNT(*) c FROM ${table}`).get() as { c: number }).c;

describe('pruneEvents', () => {
  it('dry run counts old rows and deletes nothing', () => {
    const db = seed([1, 100, 179, 181, 365], [2, 200]);
    const r = pruneEvents(db, { dryRun: true, now: NOW });
    expect(r).toMatchObject({ dryRun: true, events: 2, sessions: 1 });
    expect(r.cutoffMs).toBe(NOW - 180 * DAY);
    expect(count(db, 'events')).toBe(5);
    expect(count(db, 'sessions')).toBe(2);
  });

  it('real run deletes exactly what the dry run reported, and only that', () => {
    const db = seed([1, 100, 179, 181, 365], [2, 200]);
    const dry = pruneEvents(db, { dryRun: true, now: NOW });
    const real = pruneEvents(db, { now: NOW });
    expect(real).toMatchObject({ dryRun: false, events: dry.events, sessions: dry.sessions });
    const left = db.prepare('SELECT ts FROM events ORDER BY ts').all() as Array<{ ts: number }>;
    expect(left.every((row) => row.ts >= NOW - 180 * DAY)).toBe(true);
    expect(left).toHaveLength(3);
    expect(count(db, 'sessions')).toBe(1);
    expect(count(db, 'feedback')).toBe(1);
  });

  it('deletes in batches until no old rows remain', () => {
    const db = seed(Array.from({ length: 23 }, () => 200).concat([5]), []);
    const r = pruneEvents(db, { now: NOW, batch: 5 });
    expect(r.events).toBe(23);
    expect(count(db, 'events')).toBe(1);
  });

  it('honours a custom window', () => {
    const db = seed([10, 40, 70], []);
    expect(pruneEvents(db, { days: 60, now: NOW }).events).toBe(1);
  });

  it(`refuses a window shorter than ${MIN_RETENTION_DAYS} days`, () => {
    const db = seed([1, 5], []);
    expect(() => pruneEvents(db, { days: 1, now: NOW })).toThrow(/>= 30/);
    expect(() => pruneEvents(db, { days: Number.NaN, now: NOW })).toThrow();
    expect(count(db, 'events')).toBe(2);
  });

  it('is a no-op on a database without the analytics tables', () => {
    const db = new Database(':memory:');
    expect(pruneEvents(db, { now: NOW })).toMatchObject({ events: 0, sessions: 0 });
  });
});
