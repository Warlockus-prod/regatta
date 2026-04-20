/**
 * SQLite-backed storage for analytics events and feedback.
 * File: /tmp/regatta-stats.db (persisted on VPS via Docker volume later)
 *
 * Lazy init: DB is opened on first request, schema created on open.
 */

import Database from 'better-sqlite3';
import path from 'path';
import { promises as fs } from 'fs';
import { mkdirSync } from 'fs';

const DB_DIR = process.env.REGATTA_DB_DIR || '/tmp';
const DB_PATH = path.join(DB_DIR, 'regatta-stats.db');

let _db: Database.Database | null = null;

function db(): Database.Database {
  if (_db) return _db;

  try {
    mkdirSync(DB_DIR, { recursive: true });
  } catch { /* ignore */ }

  _db = new Database(DB_PATH);
  _db.pragma('journal_mode = WAL');
  _db.pragma('synchronous = NORMAL');

  _db.exec(`
    CREATE TABLE IF NOT EXISTS events (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      ts INTEGER NOT NULL,
      evt TEXT NOT NULL,
      path TEXT,
      session_id TEXT,
      ua TEXT,
      ip TEXT,
      country TEXT,
      device TEXT,
      viewport TEXT,
      language TEXT,
      app_version TEXT,
      meta_json TEXT
    );
    CREATE INDEX IF NOT EXISTS idx_events_ts ON events(ts);
    CREATE INDEX IF NOT EXISTS idx_events_evt ON events(evt);
    CREATE INDEX IF NOT EXISTS idx_events_session ON events(session_id);

    CREATE TABLE IF NOT EXISTS feedback (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      ts INTEGER NOT NULL,
      kind TEXT NOT NULL,
      category TEXT,
      message TEXT NOT NULL,
      expected TEXT,
      actual TEXT,
      contact TEXT,
      path TEXT,
      viewport TEXT,
      language TEXT,
      ua TEXT,
      ip TEXT,
      status TEXT NOT NULL DEFAULT 'new'
    );
    CREATE INDEX IF NOT EXISTS idx_feedback_ts ON feedback(ts);
    CREATE INDEX IF NOT EXISTS idx_feedback_status ON feedback(status);

    CREATE TABLE IF NOT EXISTS sessions (
      id TEXT PRIMARY KEY,
      first_seen INTEGER NOT NULL,
      last_seen INTEGER NOT NULL,
      country TEXT,
      device TEXT,
      language TEXT,
      visit_count INTEGER NOT NULL DEFAULT 1
    );

    -- Anonymous player profiles (session_id -> nickname)
    CREATE TABLE IF NOT EXISTS players (
      sid TEXT PRIMARY KEY,
      nickname TEXT NOT NULL,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    );

    -- Finished race results for leaderboards
    CREATE TABLE IF NOT EXISTS race_results (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      ts INTEGER NOT NULL,
      sid TEXT NOT NULL,
      nickname TEXT NOT NULL,
      difficulty TEXT NOT NULL,
      wind_strength TEXT NOT NULL,
      mission_id TEXT,
      finish_time_sec REAL NOT NULL,
      position INTEGER,
      total_boats INTEGER,
      tacks INTEGER,
      no_go_entries INTEGER,
      top_speed REAL,
      score INTEGER
    );
    CREATE INDEX IF NOT EXISTS idx_race_ts ON race_results(ts);
    CREATE INDEX IF NOT EXISTS idx_race_leaderboard ON race_results(difficulty, wind_strength, finish_time_sec);
    CREATE INDEX IF NOT EXISTS idx_race_mission ON race_results(mission_id, finish_time_sec);

    -- Shareable replays (Wave 13)
    CREATE TABLE IF NOT EXISTS replays (
      code TEXT PRIMARY KEY,
      ts INTEGER NOT NULL,
      sid TEXT,
      nickname TEXT,
      difficulty TEXT,
      wind_strength TEXT,
      mission_id TEXT,
      finish_time_sec REAL,
      samples_json TEXT NOT NULL,
      events_json TEXT NOT NULL,
      course_json TEXT,
      views INTEGER NOT NULL DEFAULT 0
    );
    CREATE INDEX IF NOT EXISTS idx_replays_ts ON replays(ts);
    CREATE INDEX IF NOT EXISTS idx_replays_sid ON replays(sid);

    -- Daily challenges (Wave 13)
    CREATE TABLE IF NOT EXISTS daily_challenges (
      day TEXT PRIMARY KEY,
      seed INTEGER NOT NULL,
      difficulty TEXT NOT NULL,
      wind_strength TEXT NOT NULL,
      mission_id TEXT,
      created_at INTEGER NOT NULL
    );
  `);

  return _db;
}

function detectDevice(ua: string | null | undefined): string {
  if (!ua) return 'unknown';
  const s = ua.toLowerCase();
  if (/iphone|ipod|android.*mobile/.test(s)) return 'mobile';
  if (/ipad|tablet|android(?!.*mobile)/.test(s)) return 'tablet';
  return 'desktop';
}

// ============================================================================
// Public API
// ============================================================================

export interface EventInsert {
  evt: string;
  path?: string;
  sessionId?: string;
  ua?: string;
  ip?: string;
  viewport?: string;
  language?: string;
  appVersion?: string;
  meta?: Record<string, unknown>;
}

export function insertEvent(e: EventInsert): void {
  try {
    const d = db();
    d.prepare(`
      INSERT INTO events (ts, evt, path, session_id, ua, ip, country, device, viewport, language, app_version, meta_json)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      Date.now(),
      e.evt,
      e.path ?? null,
      e.sessionId ?? null,
      e.ua ?? null,
      e.ip ?? null,
      null, // country - lookup deferred (would need geo-ip lib)
      detectDevice(e.ua),
      e.viewport ?? null,
      e.language ?? null,
      e.appVersion ?? null,
      e.meta ? JSON.stringify(e.meta) : null,
    );

    // Upsert session. visit_count only increments on actual page views,
    // not on every telemetry event (which was the old bug - visit_count
    // grew with every log/feedback/coach call and overstated traffic).
    if (e.sessionId) {
      const isPageView = e.evt === 'page.view';
      d.prepare(`
        INSERT INTO sessions (id, first_seen, last_seen, device, language, visit_count)
        VALUES (?, ?, ?, ?, ?, ?)
        ON CONFLICT(id) DO UPDATE SET
          last_seen = excluded.last_seen,
          visit_count = visit_count + ?
      `).run(
        e.sessionId,
        Date.now(),
        Date.now(),
        detectDevice(e.ua),
        e.language ?? null,
        isPageView ? 1 : 0,
        isPageView ? 1 : 0,
      );
    }
  } catch {
    // Don't crash on DB errors - best-effort telemetry
  }
}

export interface FeedbackInsert {
  kind: 'feedback' | 'bug';
  category?: string;
  message: string;
  expected?: string;
  actual?: string;
  contact?: string;
  path?: string;
  viewport?: string;
  language?: string;
  ua?: string;
  ip?: string;
}

export function insertFeedback(f: FeedbackInsert): number | null {
  try {
    const d = db();
    const info = d.prepare(`
      INSERT INTO feedback (ts, kind, category, message, expected, actual, contact, path, viewport, language, ua, ip)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      Date.now(), f.kind, f.category ?? null, f.message,
      f.expected ?? null, f.actual ?? null, f.contact ?? null,
      f.path ?? null, f.viewport ?? null, f.language ?? null,
      f.ua ?? null, f.ip ?? null,
    );
    return info.lastInsertRowid as number;
  } catch {
    return null;
  }
}

// ============================================================================
// Query helpers (for /stats page)
// ============================================================================

export interface Metrics {
  eventsTotal: number;
  eventsToday: number;
  eventsLast7d: number;
  sessionsTotal: number;
  sessionsToday: number;
  topPaths: Array<{ path: string; count: number }>;
  topEvents: Array<{ evt: string; count: number }>;
  deviceSplit: Array<{ device: string; count: number }>;
  languageSplit: Array<{ language: string; count: number }>;
  feedbackCount: { total: number; new: number };
  bugCount: { total: number; new: number };
  dailyEvents: Array<{ day: string; count: number }>;
}

export function getMetrics(): Metrics {
  const d = db();
  const now = Date.now();
  const today = now - 24 * 3600 * 1000;
  const week = now - 7 * 24 * 3600 * 1000;

  const eventsTotal = (d.prepare('SELECT COUNT(*) as c FROM events').get() as { c: number }).c;
  const eventsToday = (d.prepare('SELECT COUNT(*) as c FROM events WHERE ts >= ?').get(today) as { c: number }).c;
  const eventsLast7d = (d.prepare('SELECT COUNT(*) as c FROM events WHERE ts >= ?').get(week) as { c: number }).c;
  const sessionsTotal = (d.prepare('SELECT COUNT(*) as c FROM sessions').get() as { c: number }).c;
  const sessionsToday = (d.prepare('SELECT COUNT(*) as c FROM sessions WHERE last_seen >= ?').get(today) as { c: number }).c;

  const topPaths = d.prepare(`
    SELECT path, COUNT(*) as count FROM events
    WHERE evt = 'page.view' AND path IS NOT NULL AND ts >= ?
    GROUP BY path ORDER BY count DESC LIMIT 10
  `).all(week) as Array<{ path: string; count: number }>;

  const topEvents = d.prepare(`
    SELECT evt, COUNT(*) as count FROM events
    WHERE ts >= ?
    GROUP BY evt ORDER BY count DESC LIMIT 10
  `).all(week) as Array<{ evt: string; count: number }>;

  const deviceSplit = d.prepare(`
    SELECT device, COUNT(*) as count FROM events
    WHERE ts >= ? GROUP BY device
  `).all(week) as Array<{ device: string; count: number }>;

  const languageSplit = d.prepare(`
    SELECT language, COUNT(*) as count FROM events
    WHERE language IS NOT NULL AND ts >= ? GROUP BY language
  `).all(week) as Array<{ language: string; count: number }>;

  const feedbackRow = d.prepare(`
    SELECT COUNT(*) as total, SUM(CASE WHEN status = 'new' THEN 1 ELSE 0 END) as new FROM feedback WHERE kind = 'feedback'
  `).get() as { total: number; new: number };
  const bugRow = d.prepare(`
    SELECT COUNT(*) as total, SUM(CASE WHEN status = 'new' THEN 1 ELSE 0 END) as new FROM feedback WHERE kind = 'bug'
  `).get() as { total: number; new: number };

  const dailyEvents = d.prepare(`
    SELECT strftime('%Y-%m-%d', ts/1000, 'unixepoch') as day, COUNT(*) as count
    FROM events WHERE ts >= ?
    GROUP BY day ORDER BY day ASC
  `).all(now - 30 * 24 * 3600 * 1000) as Array<{ day: string; count: number }>;

  return {
    eventsTotal, eventsToday, eventsLast7d,
    sessionsTotal, sessionsToday,
    topPaths, topEvents,
    deviceSplit, languageSplit,
    feedbackCount: feedbackRow,
    bugCount: bugRow,
    dailyEvents,
  };
}

export interface FeedbackRow {
  id: number;
  ts: number;
  kind: string;
  category: string | null;
  message: string;
  expected: string | null;
  actual: string | null;
  contact: string | null;
  path: string | null;
  viewport: string | null;
  language: string | null;
  ua: string | null;
  ip: string | null;
  status: string;
}

export function listFeedback(limit = 100, status?: string): FeedbackRow[] {
  const d = db();
  if (status) {
    return d.prepare('SELECT * FROM feedback WHERE status = ? ORDER BY ts DESC LIMIT ?').all(status, limit) as FeedbackRow[];
  }
  return d.prepare('SELECT * FROM feedback ORDER BY ts DESC LIMIT ?').all(limit) as FeedbackRow[];
}

export function updateFeedbackStatus(id: number, status: string): boolean {
  try {
    const d = db();
    const info = d.prepare('UPDATE feedback SET status = ? WHERE id = ?').run(status, id);
    return info.changes > 0;
  } catch {
    return false;
  }
}

export async function ensureDbDirExists() {
  try { await fs.mkdir(DB_DIR, { recursive: true }); } catch { /* ignore */ }
}

// ============================================================================
// Players / leaderboard (Wave 7 Phase A)
// ============================================================================

export interface Player {
  sid: string;
  nickname: string;
  created_at: number;
  updated_at: number;
}

export function upsertPlayer(sid: string, nickname: string): Player | null {
  try {
    const d = db();
    const now = Date.now();
    d.prepare(`
      INSERT INTO players (sid, nickname, created_at, updated_at)
      VALUES (?, ?, ?, ?)
      ON CONFLICT(sid) DO UPDATE SET nickname = excluded.nickname, updated_at = excluded.updated_at
    `).run(sid, nickname, now, now);
    return d.prepare('SELECT * FROM players WHERE sid = ?').get(sid) as Player;
  } catch {
    return null;
  }
}

export function getPlayer(sid: string): Player | null {
  try {
    const d = db();
    return (d.prepare('SELECT * FROM players WHERE sid = ?').get(sid) as Player) ?? null;
  } catch {
    return null;
  }
}

export interface RaceResultInsert {
  sid: string;
  nickname: string;
  difficulty: string;
  windStrength: string;
  missionId?: string | null;
  finishTimeSec: number;
  position?: number | null;
  totalBoats?: number | null;
  tacks?: number | null;
  noGoEntries?: number | null;
  topSpeed?: number | null;
  score?: number | null;
}

export function insertRaceResult(r: RaceResultInsert): number | null {
  try {
    const d = db();
    const info = d.prepare(`
      INSERT INTO race_results (ts, sid, nickname, difficulty, wind_strength, mission_id,
        finish_time_sec, position, total_boats, tacks, no_go_entries, top_speed, score)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      Date.now(), r.sid, r.nickname, r.difficulty, r.windStrength,
      r.missionId ?? null, r.finishTimeSec, r.position ?? null, r.totalBoats ?? null,
      r.tacks ?? null, r.noGoEntries ?? null, r.topSpeed ?? null, r.score ?? null,
    );
    return info.lastInsertRowid as number;
  } catch {
    return null;
  }
}

export interface LeaderboardRow {
  nickname: string;
  sid: string;
  difficulty: string;
  wind_strength: string;
  mission_id: string | null;
  finish_time_sec: number;
  score: number | null;
  ts: number;
}

export function topByDifficulty(difficulty: string, wind: string, limit = 20): LeaderboardRow[] {
  try {
    const d = db();
    // Pick ONE best race per sid - the row with the shortest finish_time_sec.
    // Previously used MIN(time) + MAX(score) + MAX(ts) with GROUP BY sid,
    // which synthesized a fake row from different races of the same player
    // (best time from race A, best score from race B, latest ts from race C -
    // a combination that never existed). Now we use a window function to
    // select the actual winning row per sid.
    return d.prepare(`
      WITH ranked AS (
        SELECT r.nickname, r.sid, r.difficulty, r.wind_strength, r.mission_id,
               r.finish_time_sec, r.score, r.ts,
               ROW_NUMBER() OVER (
                 PARTITION BY r.sid
                 ORDER BY r.finish_time_sec ASC, r.ts DESC
               ) AS rn
        FROM race_results r
        WHERE r.difficulty = ? AND r.wind_strength = ? AND r.mission_id IS NULL
      )
      SELECT nickname, sid, difficulty, wind_strength, mission_id,
             finish_time_sec, score, ts
      FROM ranked
      WHERE rn = 1
      ORDER BY finish_time_sec ASC
      LIMIT ?
    `).all(difficulty, wind, limit) as LeaderboardRow[];
  } catch {
    return [];
  }
}

export function topByMission(missionId: string, limit = 20): LeaderboardRow[] {
  try {
    const d = db();
    return d.prepare(`
      WITH ranked AS (
        SELECT r.nickname, r.sid, r.difficulty, r.wind_strength, r.mission_id,
               r.finish_time_sec, r.score, r.ts,
               ROW_NUMBER() OVER (
                 PARTITION BY r.sid
                 ORDER BY r.finish_time_sec ASC, r.ts DESC
               ) AS rn
        FROM race_results r
        WHERE r.mission_id = ?
      )
      SELECT nickname, sid, difficulty, wind_strength, mission_id,
             finish_time_sec, score, ts
      FROM ranked
      WHERE rn = 1
      ORDER BY finish_time_sec ASC
      LIMIT ?
    `).all(missionId, limit) as LeaderboardRow[];
  } catch {
    return [];
  }
}

// ============================================================================
// Replays (Wave 13)
// ============================================================================

export interface ReplayRow {
  code: string;
  ts: number;
  sid: string | null;
  nickname: string | null;
  difficulty: string | null;
  wind_strength: string | null;
  mission_id: string | null;
  finish_time_sec: number | null;
  samples_json: string;
  events_json: string;
  course_json: string | null;
  views: number;
}

export interface ReplayInsert {
  sid: string | null;
  nickname: string | null;
  difficulty: string;
  windStrength: string;
  missionId: string | null;
  finishTimeSec: number | null;
  samples: unknown;    // will be JSON.stringified
  events: unknown;
  course: unknown;
}

function randReplayCode(): string {
  const alpha = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
  let s = '';
  for (let i = 0; i < 6; i++) s += alpha[Math.floor(Math.random() * alpha.length)];
  return s;
}

export function insertReplay(r: ReplayInsert): string | null {
  try {
    const d = db();
    for (let attempt = 0; attempt < 5; attempt++) {
      const code = randReplayCode();
      const existing = d.prepare('SELECT code FROM replays WHERE code = ?').get(code);
      if (existing) continue;
      d.prepare(`
        INSERT INTO replays (code, ts, sid, nickname, difficulty, wind_strength, mission_id,
          finish_time_sec, samples_json, events_json, course_json, views)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0)
      `).run(
        code, Date.now(), r.sid, r.nickname, r.difficulty, r.windStrength,
        r.missionId, r.finishTimeSec,
        JSON.stringify(r.samples), JSON.stringify(r.events), JSON.stringify(r.course),
      );
      return code;
    }
    return null;
  } catch {
    return null;
  }
}

export function getReplay(code: string): ReplayRow | null {
  try {
    const d = db();
    const row = d.prepare('SELECT * FROM replays WHERE code = ?').get(code) as ReplayRow | undefined;
    if (!row) return null;
    // Increment views (best-effort)
    try { d.prepare('UPDATE replays SET views = views + 1 WHERE code = ?').run(code); } catch { /* ignore */ }
    return row;
  } catch {
    return null;
  }
}

// ============================================================================
// Daily challenges (Wave 13)
// ============================================================================

export interface DailyChallenge {
  day: string;
  seed: number;
  difficulty: string;
  wind_strength: string;
  mission_id: string | null;
  created_at: number;
}

export function getOrCreateDaily(day: string): DailyChallenge {
  const d = db();
  let row = d.prepare('SELECT * FROM daily_challenges WHERE day = ?').get(day) as DailyChallenge | undefined;
  if (row) return row;
  // Deterministic pseudo-random from the date string
  const hash = Array.from(day).reduce((acc, c) => (acc * 131 + c.charCodeAt(0)) >>> 0, 7);
  const difficulties = ['easy', 'medium', 'medium', 'medium', 'hard'];
  const winds = ['light', 'medium', 'medium', 'heavy'];
  const seed = (hash % 1000);
  const difficulty = difficulties[hash % difficulties.length];
  const wind = winds[(hash >>> 3) % winds.length];
  d.prepare(`
    INSERT INTO daily_challenges (day, seed, difficulty, wind_strength, mission_id, created_at)
    VALUES (?, ?, ?, ?, NULL, ?)
  `).run(day, seed, difficulty, wind, Date.now());
  row = d.prepare('SELECT * FROM daily_challenges WHERE day = ?').get(day) as DailyChallenge;
  return row;
}

export function getDailyLeaderboard(day: string, limit = 10): LeaderboardRow[] {
  try {
    const d = db();
    // Races on that day matching the daily difficulty + wind
    const daily = d.prepare('SELECT * FROM daily_challenges WHERE day = ?').get(day) as DailyChallenge | undefined;
    if (!daily) return [];
    const dayStart = Date.parse(day + 'T00:00:00Z');
    const dayEnd = dayStart + 24 * 60 * 60 * 1000;
    return d.prepare(`
      WITH ranked AS (
        SELECT r.nickname, r.sid, r.difficulty, r.wind_strength, r.mission_id,
               r.finish_time_sec, r.score, r.ts,
               ROW_NUMBER() OVER (
                 PARTITION BY r.sid
                 ORDER BY r.finish_time_sec ASC, r.ts DESC
               ) AS rn
        FROM race_results r
        WHERE r.ts >= ? AND r.ts < ?
          AND r.difficulty = ?
          AND r.wind_strength = ?
          AND r.mission_id IS NULL
      )
      SELECT nickname, sid, difficulty, wind_strength, mission_id,
             finish_time_sec, score, ts
      FROM ranked
      WHERE rn = 1
      ORDER BY finish_time_sec ASC
      LIMIT ?
    `).all(dayStart, dayEnd, daily.difficulty, daily.wind_strength, limit) as LeaderboardRow[];
  } catch {
    return [];
  }
}
