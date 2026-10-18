// Funnel metrics in getMetricsRange() against a real SQLite file.
// Contract: the funnel counts what /api/log stored in meta_json (exams by
// base, lessons by course, radio tasks, App Store clicks by ct, page views by
// client), and the events table carries the (evt, ts) index.

import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import Database from 'better-sqlite3';

let dir = '';
let db: typeof import('./db');

beforeAll(async () => {
  dir = mkdtempSync(path.join(tmpdir(), 'regatta-db-'));
  process.env.REGATTA_DB_DIR = dir;
  db = await import('./db');
});

afterAll(() => {
  delete process.env.REGATTA_DB_DIR;
  rmSync(dir, { recursive: true, force: true });
});

describe('getMetricsRange().funnel', () => {
  it('counts exams, lessons, radio tasks, App Store clicks and app vs web views', () => {
    const ev = (evt: string, meta: Record<string, unknown>) => db.insertEvent({ evt, sessionId: 's1', meta });
    ev('page.view', { client: 'app', embed: true });
    ev('page.view', { client: 'app', embed: true });
    ev('page.view', { client: 'web', embed: false });
    ev('page.view', { path: '/' }); // row from before the client field existed
    ev('exam.start', { base: 'sternik' });
    ev('exam.start', { base: 'sternik' });
    ev('exam.finish', { base: 'sternik', score: 66, total: 75, passed: true });
    ev('exam.start', { base: 'src' });
    ev('exam.finish', { base: 'src', score: 5, total: 10, passed: false });
    ev('lesson.complete', { course: 'sails', lessonId: 'telltales' });
    ev('lesson.complete', { course: 'sails', lessonId: 'reefing' });
    ev('lesson.complete', { course: 'bootcamp', lessonId: 'day1' });
    ev('radio.task.complete', { taskId: 'mayday', score: 90 });
    ev('app_store.click', { ct: 'web_home' });

    const m = db.getMetricsRange(Date.now() - 60_000, Date.now() + 60_000);
    expect([...m.funnel.clientSplit].sort((a, b) => a.client.localeCompare(b.client))).toEqual([
      { client: 'app', count: 2 },
      { client: 'unknown', count: 1 },
      { client: 'web', count: 1 },
    ]);
    expect(m.funnel.exams).toEqual([
      { base: 'src', started: 1, finished: 1, passed: 0, avgScorePct: 50 },
      { base: 'sternik', started: 2, finished: 1, passed: 1, avgScorePct: 88 },
    ]);
    expect(m.funnel.lessons).toEqual([{ course: 'sails', count: 2 }, { course: 'bootcamp', count: 1 }]);
    expect(m.funnel.radioTasks).toBe(1);
    expect(m.funnel.appStoreClicks).toEqual([{ ct: 'web_home', count: 1 }]);
  });

  it('indexes events by (evt, ts) and drops the redundant evt-only index', () => {
    const raw = new Database(path.join(dir, 'regatta-stats.db'), { readonly: true });
    const names = (raw.prepare("SELECT name FROM sqlite_master WHERE type = 'index' AND tbl_name = 'events'").all() as Array<{ name: string }>)
      .map((r) => r.name);
    raw.close();
    expect(names).toContain('idx_events_evt_ts');
    expect(names).not.toContain('idx_events_evt');
  });
});
