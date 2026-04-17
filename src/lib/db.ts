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
      null, // country — lookup deferred (would need geo-ip lib)
      detectDevice(e.ua),
      e.viewport ?? null,
      e.language ?? null,
      e.appVersion ?? null,
      e.meta ? JSON.stringify(e.meta) : null,
    );

    // Upsert session
    if (e.sessionId) {
      d.prepare(`
        INSERT INTO sessions (id, first_seen, last_seen, device, language, visit_count)
        VALUES (?, ?, ?, ?, ?, 1)
        ON CONFLICT(id) DO UPDATE SET last_seen = excluded.last_seen, visit_count = visit_count + 1
      `).run(e.sessionId, Date.now(), Date.now(), detectDevice(e.ua), e.language ?? null);
    }
  } catch {
    // Don't crash on DB errors — best-effort telemetry
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
