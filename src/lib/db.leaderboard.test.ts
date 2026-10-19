// Leaderboard SQL against a real SQLite file.
// Contract: each board shows ONE real row per sid, the one with the best
// time (not a row stitched from several races); free-race boards and the
// daily board leave mission races out; the daily board counts races in the
// half-open UTC window [day 00:00, next day 00:00).

import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

let dir = '';
let db: typeof import('./db');

beforeAll(async () => {
  dir = mkdtempSync(path.join(tmpdir(), 'regatta-lb-'));
  process.env.REGATTA_DB_DIR = dir;
  db = await import('./db');
});

afterAll(() => {
  delete process.env.REGATTA_DB_DIR;
  rmSync(dir, { recursive: true, force: true });
});

afterEach(() => vi.useRealTimers());

function race(at: string, r: { sid: string; time: number; score?: number | null; difficulty?: string; wind?: string; missionId?: string | null }) {
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(new Date(at));
  const id = db.insertRaceResult({
    sid: r.sid,
    nickname: r.sid.toUpperCase(),
    difficulty: r.difficulty ?? 'easy',
    windStrength: r.wind ?? 'light',
    missionId: r.missionId ?? null,
    finishTimeSec: r.time,
    score: r.score ?? null,
  });
  vi.useRealTimers();
  expect(id).not.toBeNull();
}

describe('topByDifficulty / topByMission', () => {
  it('one real best row per sid, never stitched from several races', () => {
    race('2026-10-01T10:00:00Z', { sid: 'a', time: 90, score: 10 });
    race('2026-10-01T10:05:00Z', { sid: 'a', time: 80, score: 5 });
    race('2026-10-01T10:10:00Z', { sid: 'a', time: 85, score: 99 });
    race('2026-10-01T10:15:00Z', { sid: 'b', time: 95, score: 1 });

    const rows = db.topByDifficulty('easy', 'light');
    const a = rows.filter((r) => r.sid === 'a');
    expect(a).toHaveLength(1);
    // The 80 s race with ITS score 5 and ITS timestamp: not MIN(time) + MAX(score).
    expect(a[0]).toMatchObject({ finish_time_sec: 80, score: 5, ts: Date.parse('2026-10-01T10:05:00Z') });
    expect(rows.map((r) => r.sid)).toEqual(['a', 'b']);
  });

  it('free-race boards leave mission races out, mission boards keep only theirs', () => {
    race('2026-10-02T10:00:00Z', { sid: 'm', time: 30, missionId: 'sub-90' });
    expect(db.topByDifficulty('easy', 'light').some((r) => r.sid === 'm')).toBe(false);
    const mission = db.topByMission('sub-90');
    expect(mission.map((r) => r.sid)).toEqual(['m']);
    expect(mission[0].finish_time_sec).toBe(30);
  });
});

describe('getDailyLeaderboard', () => {
  it('counts the half-open UTC day of the daily settings and skips mission races', () => {
    const day = '2026-10-10';
    const ch = db.getOrCreateDaily(day);
    const settings = { difficulty: ch.difficulty, wind: ch.wind_strength };
    const other = { difficulty: ch.difficulty === 'easy' ? 'hard' : 'easy', wind: ch.wind_strength };

    race('2026-10-10T00:00:00.000Z', { sid: 'start', time: 70, ...settings });            // first ms: in
    race('2026-10-10T23:59:59.999Z', { sid: 'end', time: 71, ...settings });              // last ms: in
    race('2026-10-11T00:00:00.000Z', { sid: 'next', time: 50, ...settings });             // next day: out
    race('2026-10-09T23:59:59.999Z', { sid: 'prev', time: 50, ...settings });             // day before: out
    race('2026-10-10T12:00:00Z', { sid: 'other', time: 40, ...other });                   // other settings: out
    race('2026-10-10T12:00:00Z', { sid: 'mission', time: 40, ...settings, missionId: 'clean-laps' }); // out
    race('2026-10-10T08:00:00Z', { sid: 'start', time: 72, ...settings });                // slower: not shown

    const rows = db.getDailyLeaderboard(day);
    expect(rows.map((r) => [r.sid, r.finish_time_sec])).toEqual([['start', 70], ['end', 71]]);
  });

  it('a day without a challenge row has no board', () => {
    expect(db.getDailyLeaderboard('2026-01-01')).toEqual([]);
  });
});
