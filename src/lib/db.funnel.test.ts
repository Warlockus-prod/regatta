// getMetricsRange() and the insert helpers against a real SQLite file.
// Contract: the funnel counts what /api/log stored in meta_json (exams by
// base, lessons by course, radio tasks, App Store clicks by ct, page views by
// client), and the events table carries the (evt, ts) index. No row ever
// holds a full client IP, whichever route wrote it. Visits split on a 30-min
// gap, and "returning" means 2+ visits or first seen before the range.

import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
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

  it('counts the race funnel for first races and all races, apart from the saved race.finish', () => {
    const ev = (evt: string, meta: Record<string, unknown>) => db.insertEvent({ evt, sessionId: 's2', meta });
    // Device A: first race, all steps, replay from the finish screen.
    ev('race.countdown', { raceNo: 1 });
    ev('race.first_tack', { raceNo: 1, atSec: 12 });
    ev('race.first_mark', { raceNo: 1, atSec: 90 });
    ev('race.end', { raceNo: 1, finished: true, position: 2, totalBoats: 4 });
    ev('race.replay', { raceNo: 1, source: 'result' });
    // Device B: first race times out before the mark.
    ev('race.countdown', { raceNo: 1 });
    ev('race.first_tack', { raceNo: 1, atSec: 20 });
    ev('race.end', { raceNo: 1, finished: false });
    // Device A again: second race, quits during the countdown.
    ev('race.countdown', { raceNo: 2 });
    // A shared replay and the server's leaderboard save.
    ev('race.replay', { source: 'shared' });
    ev('race.finish', { finishTimeSec: 180 });

    const m = db.getMetricsRange(Date.now() - 60_000, Date.now() + 60_000);
    expect(m.funnel.races.first).toEqual({ countdown: 2, firstTack: 2, firstMark: 1, ended: 2, finished: 1, replay: 1 });
    expect(m.funnel.races.all).toEqual({ countdown: 3, firstTack: 2, firstMark: 1, ended: 2, finished: 1, replay: 1 });
    expect([...m.funnel.races.replaySources].sort((a, b) => a.source.localeCompare(b.source))).toEqual([
      { source: 'result', count: 1 },
      { source: 'shared', count: 1 },
    ]);
  });

  it('reports a zero race funnel for a range with no race events', () => {
    const m = db.getMetricsRange(0, 1);
    const zero = { countdown: 0, firstTack: 0, firstMark: 0, ended: 0, finished: 0, replay: 0 };
    expect(m.funnel.races).toEqual({ first: zero, all: zero, replaySources: [] });
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

describe('stored IPs', () => {
  const ipOf = (evt: string) => {
    const raw = new Database(path.join(dir, 'regatta-stats.db'), { readonly: true });
    const row = raw.prepare('SELECT ip FROM events WHERE evt = ?').get(evt) as { ip: string | null };
    raw.close();
    return row.ip;
  };

  it('truncates every IP in insertEvent and stores junk as NULL', () => {
    db.insertEvent({ evt: 'ip.test.v4', ip: '83.12.34.56' });
    db.insertEvent({ evt: 'ip.test.mapped', ip: '::ffff:1.2.3.4' });
    db.insertEvent({ evt: 'ip.test.v6', ip: ' 2001:db8:1:2:3:4:5:6 ' });
    db.insertEvent({ evt: 'ip.test.junk', ip: 'not-an-ip' });
    db.insertEvent({ evt: 'ip.test.unknown', ip: 'unknown' });
    db.insertEvent({ evt: 'ip.test.none' });
    expect(ipOf('ip.test.v4')).toBe('83.12.34.0');
    expect(ipOf('ip.test.mapped')).toBe('1.2.3.0');
    expect(ipOf('ip.test.v6')).toBe('2001:db8:1::');
    expect(ipOf('ip.test.junk')).toBeNull();
    expect(ipOf('ip.test.unknown')).toBeNull();
    expect(ipOf('ip.test.none')).toBeNull();
  });

  it('truncates the feedback IP and keeps IP and user agent out of the admin list', () => {
    const id = db.insertFeedback({
      kind: 'bug', message: 'map does not load', ip: '203.0.113.57',
      ua: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36',
    });
    const raw = new Database(path.join(dir, 'regatta-stats.db'), { readonly: true });
    const stored = raw.prepare('SELECT ip FROM feedback WHERE id = ?').get(id) as { ip: string };
    raw.close();
    expect(stored.ip).toBe('203.0.113.0');
    const item = db.listFeedback(10).find((f) => f.id === id)!;
    expect(item).not.toHaveProperty('ip');
    expect(item).not.toHaveProperty('ua');
    expect(item.client).toBe('Chrome / Windows');
  });
});

describe('device model', () => {
  const REDUCED_ANDROID_UA =
    'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Mobile Safari/537.36';

  it('labels the reduced Chrome Android UA instead of reporting model "K"', () => {
    expect(db.detectDeviceModel(REDUCED_ANDROID_UA)).toBe(db.ANDROID_MODEL_HIDDEN);
    expect(db.detectDeviceModel(
      'Mozilla/5.0 (Linux; Android 14; SM-S911B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Mobile Safari/537.36',
    )).toBe('Samsung SM-S911B');
  });

  it('shows rows stored as "K" before the fix under the same label', () => {
    const raw = new Database(path.join(dir, 'regatta-stats.db'));
    raw.prepare("INSERT INTO events (ts, evt, device_model) VALUES (?, 'page.view', 'K')").run(Date.now());
    raw.close();
    db.insertEvent({ evt: 'page.view', ua: REDUCED_ANDROID_UA });
    const m = db.getMetricsRange(Date.now() - 60_000, Date.now() + 60_000);
    expect(m.deviceModelSplit.find((r) => r.device_model === 'K')).toBeUndefined();
    expect(m.deviceModelSplit.find((r) => r.device_model === db.ANDROID_MODEL_HIDDEN)?.count).toBe(2);
    expect(m.recent.some((r) => r.device_model === 'K')).toBe(false);
  });
});

describe('visit metrics', () => {
  const MIN = 60_000;
  const DAY = 24 * 60 * MIN;

  afterEach(() => {
    vi.useRealTimers();
  });

  const viewAt = (ts: number, sessionId: string) => {
    vi.setSystemTime(ts);
    db.insertEvent({ evt: 'page.view', sessionId, path: '/' });
  };

  it('counts visits, their length and returning visitors', () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    const from = Date.UTC(2026, 0, 10, 12);
    viewAt(from - 2 * DAY, 'B'); // B was here two days before the range
    viewAt(from + 5 * MIN, 'A');
    viewAt(from + 6 * MIN, 'A'); // A: one visit, two pages, 60 s
    viewAt(from + 10 * MIN, 'B'); // B: one page, returning
    viewAt(from + 20 * MIN, 'C'); // C: one page, new
    const m = db.getMetricsRange(from, from + 2 * 60 * MIN);
    expect(m.visits).toBe(3);
    expect(m.returningVisitorPct).toBeCloseTo(1 / 3);
    expect(m.medianVisitSeconds).toBe(0);
    expect(m.p90VisitSeconds).toBe(60);
    expect(m.pagesPerVisit).toBeCloseTo(4 / 3);
    expect(m.bounceRate).toBeCloseTo(2 / 3);
  });

  it('starts a new visit after 30 minutes without a page view', () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    const from = Date.UTC(2026, 0, 20, 8);
    viewAt(from + 1 * MIN, 'D');
    viewAt(from + 20 * MIN, 'D'); // 19 min gap: same visit
    viewAt(from + 80 * MIN, 'D'); // 60 min gap: a second visit
    viewAt(from + 2 * MIN, 'E');
    const m = db.getMetricsRange(from, from + 3 * 60 * MIN);
    expect(m.visits).toBe(3);
    // D came back within the range; E has one visit and was never seen before.
    expect(m.returningVisitorPct).toBeCloseTo(1 / 2);
    expect(m.p90VisitSeconds).toBe(19 * 60);
  });
});
