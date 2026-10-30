import { dailySettings } from "./daily-challenge";
/**
 * SQLite-backed storage for analytics events and feedback.
 * File: /tmp/regatta-stats.db (persisted on VPS via Docker volume later)
 *
 * Lazy init: DB is opened on first request, schema created on open.
 */

import Database from 'better-sqlite3';
import path from 'path';
import { mkdirSync } from 'fs';
import { isIP } from 'net';
import { UAParser } from 'ua-parser-js';
import { truncateIp } from './net';
import { ensureRaceResultClassSchema } from "./race-result-schema";
import { readClassifiedRaceResult } from "./race-result-eligibility";
import { raceContextForClassId, readRaceComparison, readRaceResultSelection, type RaceResultMode } from "./race-record-class";
import type { RaceClassId, RaceContext } from "./race-context";

const DB_DIR = process.env.REGATTA_DB_DIR || '/tmp';
const DB_PATH = path.join(DB_DIR, 'regatta-stats.db');

let _db: Database.Database | null = null;

function db(): Database.Database {
  if (_db) return _db;

  try {
    mkdirSync(DB_DIR, { recursive: true });
  } catch { /* ignore */ }

  const candidate = new Database(DB_PATH);
  try {
    initializeDatabase(candidate);
    _db = candidate;
    return candidate;
  } catch (error) {
    candidate.close();
    throw error;
  }
}

function initializeDatabase(database: Database.Database): void {
  database.pragma('journal_mode = WAL');
  database.pragma('synchronous = NORMAL');
  // Disk ceiling (audit F10), not set yet: the vps2 disk is shared with other
  // products. Once the owner picks a size, cap the file with
  // _db.pragma('max_page_count = <bytes / page_size>'). Inserts past the cap
  // throw, and every insert helper below already catches and drops the row.

  database.exec(`
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
      device_model TEXT,
      viewport TEXT,
      language TEXT,
      app_version TEXT,
      ms_since_start INTEGER,
      utm_source TEXT,
      utm_medium TEXT,
      utm_campaign TEXT,
      referrer TEXT,
      meta_json TEXT
    );
    CREATE INDEX IF NOT EXISTS idx_events_ts ON events(ts);
    CREATE INDEX IF NOT EXISTS idx_events_session ON events(session_id);
    CREATE INDEX IF NOT EXISTS idx_events_country ON events(country);

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
      device_model TEXT,
      language TEXT,
      utm_source TEXT,
      utm_medium TEXT,
      utm_campaign TEXT,
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

    -- Gallery likes - one row per (item_id, sid) so the same anonymous
    -- user can't like the same photo twice. Counts derive from
    -- COUNT(*) GROUP BY item_id; the sid column lets us toggle off too.
    CREATE TABLE IF NOT EXISTS gallery_likes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      item_id TEXT NOT NULL,
      sid TEXT NOT NULL,
      ts INTEGER NOT NULL,
      UNIQUE(item_id, sid)
    );
    CREATE INDEX IF NOT EXISTS idx_gallery_likes_item ON gallery_likes(item_id);
    CREATE INDEX IF NOT EXISTS idx_gallery_likes_sid ON gallery_likes(sid);
  `);

  // Progressive column additions for existing databases. Each ALTER TABLE
  // ADD COLUMN is a no-op on fresh DBs where the column already exists
  // (wrapped in try/catch because SQLite throws "duplicate column" otherwise).
  const safeAlter = (sql: string) => {
    try { database.exec(sql); } catch { /* column exists, skip */ }
  };
  // events columns (2026-04-25: analytics expansion)
  safeAlter('ALTER TABLE events ADD COLUMN device_model TEXT');
  safeAlter('ALTER TABLE events ADD COLUMN ms_since_start INTEGER');
  safeAlter('ALTER TABLE events ADD COLUMN utm_source TEXT');
  safeAlter('ALTER TABLE events ADD COLUMN utm_medium TEXT');
  safeAlter('ALTER TABLE events ADD COLUMN utm_campaign TEXT');
  safeAlter('ALTER TABLE events ADD COLUMN referrer TEXT');
  safeAlter('CREATE INDEX IF NOT EXISTS idx_events_country ON events(country)');
  // Every /stats query filters by event name inside a time range. (evt, ts)
  // serves those and plain evt lookups, so the old evt-only index goes.
  safeAlter('CREATE INDEX IF NOT EXISTS idx_events_evt_ts ON events(evt, ts)');
  safeAlter('DROP INDEX IF EXISTS idx_events_evt');
  // sessions columns
  safeAlter('ALTER TABLE sessions ADD COLUMN device_model TEXT');
  safeAlter('ALTER TABLE sessions ADD COLUMN utm_source TEXT');
  safeAlter('ALTER TABLE sessions ADD COLUMN utm_medium TEXT');
  safeAlter('ALTER TABLE sessions ADD COLUMN utm_campaign TEXT');

  ensureRaceResultClassSchema(database);
}

/**
 * The only form of a client IP that may be stored: trimmed, a real IPv4 or
 * IPv6 address, truncated by truncateIp(). Anything else (missing, "unknown",
 * a forged X-Forwarded-For value) becomes NULL. Applied by insertEvent() and
 * insertFeedback(), so no route can store a full IP.
 */
export function storedIp(ip: string | null | undefined): string | null {
  const t = ip?.trim();
  if (!t || !isIP(t)) return null;
  return truncateIp(t);
}

function detectDevice(ua: string | null | undefined): string {
  if (!ua) return 'unknown';
  const s = ua.toLowerCase();
  if (/iphone|ipod|android.*mobile/.test(s)) return 'mobile';
  if (/ipad|tablet|android(?!.*mobile)/.test(s)) return 'tablet';
  return 'desktop';
}

/**
 * Label for Chrome's reduced Android user agent ("Android 10; K"): Chrome
 * replaces the real model with the placeholder "K" for most Android traffic,
 * so "K" in /stats meant "model not reported", not a device.
 */
export const ANDROID_MODEL_HIDDEN = 'Android (model hidden)';

/** Shows rows stored before the label existed under the same label. */
const DEVICE_MODEL_SQL = `CASE WHEN device_model = 'K' THEN '${ANDROID_MODEL_HIDDEN}' ELSE device_model END`;

/**
 * Extract specific device model from UA via ua-parser-js. Useful to see
 * "iPhone 15 Pro", "Samsung SM-S911B", "Pixel 8" vs just "mobile" bucket.
 * Returns a stable, short label suitable for grouping.
 */
export function detectDeviceModel(ua: string | null | undefined): string | null {
  if (!ua) return null;
  try {
    const p = new UAParser(ua);
    const device = p.getDevice();
    const os = p.getOS();
    // Desktop UA: report OS vendor name (better than "undefined undefined")
    if (!device.vendor && !device.model) {
      return os.name ? `${os.name} Desktop` : null;
    }
    if (!device.vendor && device.model === 'K') return ANDROID_MODEL_HIDDEN;
    const parts = [device.vendor, device.model].filter(Boolean);
    const label = parts.join(' ').trim();
    return label || null;
  } catch {
    return null;
  }
}

/** Best-effort browser detection from UA string.
 *  Returns a human-readable label like "Chrome", "Safari", "Firefox", etc. */
export function detectBrowser(ua: string | null | undefined): string {
  if (!ua) return 'unknown';
  const s = ua;
  // Order matters - test more specific first.
  if (/EdgA?\//i.test(s)) return 'Edge';
  if (/YaBrowser/i.test(s)) return 'Yandex';
  if (/OPR|Opera/i.test(s)) return 'Opera';
  if (/Firefox/i.test(s)) return 'Firefox';
  if (/SamsungBrowser/i.test(s)) return 'Samsung';
  if (/CriOS|Chrome/i.test(s)) return 'Chrome';
  if (/Safari/i.test(s) && !/Chrome|CriOS/i.test(s)) return 'Safari';
  return 'other';
}

/** Best-effort OS detection from UA string. */
export function detectOS(ua: string | null | undefined): string {
  if (!ua) return 'unknown';
  const s = ua;
  if (/Windows NT/i.test(s)) return 'Windows';
  if (/Mac OS X/i.test(s) && !/iPhone|iPad/i.test(s)) return 'macOS';
  if (/iPhone|iPod/i.test(s)) return 'iOS';
  if (/iPad/i.test(s)) return 'iPadOS';
  if (/Android/i.test(s)) return 'Android';
  if (/Linux/i.test(s)) return 'Linux';
  return 'other';
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
  country?: string;
  viewport?: string;
  language?: string;
  appVersion?: string;
  msSinceStart?: number;
  utmSource?: string;
  utmMedium?: string;
  utmCampaign?: string;
  referrer?: string;
  meta?: Record<string, unknown>;
}

export function insertEvent(e: EventInsert): void {
  try {
    const d = db();
    const deviceModel = detectDeviceModel(e.ua);
    const ip = storedIp(e.ip);
    d.prepare(`
      INSERT INTO events (
        ts, evt, path, session_id, ua, ip, country, device, device_model,
        viewport, language, app_version, ms_since_start,
        utm_source, utm_medium, utm_campaign, referrer, meta_json
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      Date.now(),
      e.evt,
      e.path ?? null,
      e.sessionId ?? null,
      e.ua ?? null,
      ip,
      e.country ?? null,
      detectDevice(e.ua),
      deviceModel,
      e.viewport ?? null,
      e.language ?? null,
      e.appVersion ?? null,
      e.msSinceStart ?? null,
      e.utmSource ?? null,
      e.utmMedium ?? null,
      e.utmCampaign ?? null,
      e.referrer ?? null,
      e.meta ? JSON.stringify(e.meta) : null,
    );

    // Upsert session. visit_count only increments on actual page views,
    // not on every telemetry event (which was the old bug - visit_count
    // grew with every log/feedback/coach call and overstated traffic).
    //
    // UTM + country + device_model are sticky: set on first observed value,
    // don't overwrite. This preserves the user's original acquisition source
    // even if they later arrive via a different referral.
    if (e.sessionId) {
      const isPageView = e.evt === 'page.view';
      d.prepare(`
        INSERT INTO sessions (
          id, first_seen, last_seen, country, device, device_model, language,
          utm_source, utm_medium, utm_campaign, visit_count
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(id) DO UPDATE SET
          last_seen = excluded.last_seen,
          visit_count = visit_count + ?,
          country = COALESCE(sessions.country, excluded.country),
          device_model = COALESCE(sessions.device_model, excluded.device_model),
          utm_source = COALESCE(sessions.utm_source, excluded.utm_source),
          utm_medium = COALESCE(sessions.utm_medium, excluded.utm_medium),
          utm_campaign = COALESCE(sessions.utm_campaign, excluded.utm_campaign)
      `).run(
        e.sessionId,
        Date.now(),
        Date.now(),
        e.country ?? null,
        detectDevice(e.ua),
        deviceModel,
        e.language ?? null,
        e.utmSource ?? null,
        e.utmMedium ?? null,
        e.utmCampaign ?? null,
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
      f.ua ?? null, storedIp(f.ip),
    );
    return info.lastInsertRowid as number;
  } catch {
    return null;
  }
}

// ============================================================================
// Query helpers (for /stats page)
// ============================================================================

export interface RangeMetrics {
  range: { fromMs: number; toMs: number };
  // Totals within range
  events: number;
  pageViews: number;
  uniqueSessions: number;
  uniqueIps: number;
  feedbackNew: number;
  bugsNew: number;
  jsErrors: number;

  // Breakdowns (top 15)
  topPaths: Array<{ path: string; count: number }>;
  topEvents: Array<{ evt: string; count: number }>;
  topIps: Array<{ ip: string; count: number }>;       // raw IPs; mask in UI if exposed
  topReferrers: Array<{ ref: string; count: number }>;
  deviceSplit: Array<{ device: string; count: number }>;
  deviceModelSplit: Array<{ device_model: string; count: number }>;
  browserSplit: Array<{ browser: string; count: number }>;
  osSplit: Array<{ os: string; count: number }>;
  viewportSplit: Array<{ viewport: string; count: number }>;
  languageSplit: Array<{ language: string; count: number }>;
  countrySplit: Array<{ country: string; count: number }>;
  utmSourceSplit: Array<{ utm_source: string; count: number }>;
  utmCampaignSplit: Array<{ utm_campaign: string; count: number }>;

  // Funnel (2026-10-18): app vs web traffic, exams, lessons, radio tasks,
  // App Store clicks by placement.
  funnel: FunnelMetrics;

  // Time-series
  hourly: Array<{ hour: string; events: number; pageViews: number }>;
  daily: Array<{ day: string; events: number; pageViews: number; uniqueSessions: number }>;

  // Visit quality. A visitor is one `regatta_sid` (a 1-year cookie); a visit
  // is a run of that visitor's page views with no gap over 30 minutes.
  visits: number;
  pagesPerVisit: number;
  bounceRate: number;          // fraction 0..1 of visits with exactly 1 page.view
  medianVisitSeconds: number;  // first to last page.view of a visit; 0 for a 1-page visit
  p90VisitSeconds: number;
  returningVisitorPct: number; // visitors with 2+ visits in range, or first seen before it

  // Time-on-page (from ms_since_start)
  avgMsSinceStart: number;      // avg time into session when page.view fires
  medianMsSinceStart: number;   // more robust than avg for skewed distributions

  // Recent events feed (live view)
  recent: Array<{
    ts: number; evt: string; path: string | null;
    ip: string | null; device: string | null; lang: string | null;
    country: string | null; device_model: string | null;
  }>;
}

export interface FunnelMetrics {
  /** page.view split by shell: 'app' (iOS WebView) vs 'web'; old rows are 'unknown'. */
  clientSplit: Array<{ client: string; count: number }>;
  exams: Array<{ base: string; started: number; finished: number; passed: number; avgScorePct: number }>;
  lessons: Array<{ course: string; count: number }>;
  radioTasks: number;
  appStoreClicks: Array<{ ct: string; count: number }>;
  /**
   * Race funnel (M0-12): the device's first race (raceNo = 1) and all races.
   * Each step fires at most once per race (src/lib/funnel.ts trackRace*).
   */
  races: { first: RaceFunnelSteps; all: RaceFunnelSteps; replaySources: Array<{ source: string; count: number }> };
}

export interface RaceFunnelSteps {
  countdown: number;
  firstTack: number;
  firstMark: number;
  /** Races that ended, finished or by the time limit. */
  ended: number;
  finished: number;
  /** Replays opened from the finish screen of the race. */
  replay: number;
}

/**
 * Funnel counters for a time range. Reads the validated fields that /api/log
 * stores in meta_json (see src/lib/analytics-events.ts).
 */
function getFunnelMetrics(d: Database.Database, fromMs: number, toMs: number): FunnelMetrics {
  const p = [fromMs, toMs] as const;
  const clientSplit = d.prepare(`
    SELECT COALESCE(json_extract(meta_json, '$.client'), 'unknown') client, COUNT(*) count
    FROM events WHERE evt = 'page.view' AND ts >= ? AND ts < ?
    GROUP BY client ORDER BY count DESC
  `).all(...p) as Array<{ client: string; count: number }>;

  const examRows = d.prepare(`
    SELECT json_extract(meta_json, '$.base') base,
           SUM(CASE WHEN evt = 'exam.start' THEN 1 ELSE 0 END) started,
           SUM(CASE WHEN evt = 'exam.finish' THEN 1 ELSE 0 END) finished,
           SUM(CASE WHEN evt = 'exam.finish' AND json_extract(meta_json, '$.passed') = 1 THEN 1 ELSE 0 END) passed,
           AVG(CASE WHEN evt = 'exam.finish'
                    THEN 100.0 * json_extract(meta_json, '$.score') / json_extract(meta_json, '$.total') END) avgScorePct
    FROM events WHERE evt IN ('exam.start', 'exam.finish') AND ts >= ? AND ts < ?
    GROUP BY base HAVING base IS NOT NULL ORDER BY base
  `).all(...p) as Array<{ base: string; started: number; finished: number; passed: number; avgScorePct: number | null }>;

  const lessons = d.prepare(`
    SELECT COALESCE(json_extract(meta_json, '$.course'), 'unknown') course, COUNT(*) count
    FROM events WHERE evt = 'lesson.complete' AND ts >= ? AND ts < ?
    GROUP BY course ORDER BY count DESC
  `).all(...p) as Array<{ course: string; count: number }>;

  const radioTasks = (d.prepare(`
    SELECT COUNT(*) c FROM events WHERE evt = 'radio.task.complete' AND ts >= ? AND ts < ?
  `).get(...p) as { c: number }).c;

  const appStoreClicks = d.prepare(`
    SELECT COALESCE(json_extract(meta_json, '$.ct'), '(none)') ct, COUNT(*) count
    FROM events WHERE evt = 'app_store.click' AND ts >= ? AND ts < ?
    GROUP BY ct ORDER BY count DESC
  `).all(...p) as Array<{ ct: string; count: number }>;

  // Client race.* steps only; the server's race.finish (a saved leaderboard
  // time) is a different thing and stays out of this funnel.
  const raceSteps = (firstOnly: boolean): RaceFunnelSteps => {
    const row = d.prepare(`
      SELECT COALESCE(SUM(evt = 'race.countdown'), 0) countdown,
             COALESCE(SUM(evt = 'race.first_tack'), 0) firstTack,
             COALESCE(SUM(evt = 'race.first_mark'), 0) firstMark,
             COALESCE(SUM(evt = 'race.end'), 0) ended,
             COALESCE(SUM(evt = 'race.end' AND json_extract(meta_json, '$.finished') = 1), 0) finished,
             COALESCE(SUM(evt = 'race.replay' AND json_extract(meta_json, '$.source') = 'result'), 0) replay
      FROM events
      WHERE evt IN ('race.countdown', 'race.first_tack', 'race.first_mark', 'race.end', 'race.replay')
        AND ts >= ? AND ts < ? ${firstOnly ? "AND json_extract(meta_json, '$.raceNo') = 1" : ''}
    `).get(...p) as RaceFunnelSteps;
    return { ...row };
  };
  const replaySources = d.prepare(`
    SELECT COALESCE(json_extract(meta_json, '$.source'), 'unknown') source, COUNT(*) count
    FROM events WHERE evt = 'race.replay' AND ts >= ? AND ts < ?
    GROUP BY source ORDER BY count DESC
  `).all(...p) as Array<{ source: string; count: number }>;

  return {
    clientSplit,
    exams: examRows.map((r) => ({ ...r, avgScorePct: Math.round(r.avgScorePct ?? 0) })),
    lessons,
    radioTasks,
    appStoreClicks,
    races: { first: raceSteps(true), all: raceSteps(false), replaySources },
  };
}

/** A visit ends after this long without a page view (the usual web convention). */
export const VISIT_GAP_MS = 30 * 60 * 1000;

/**
 * One row per visit in [from, to): its visitor, page count and length. Page
 * views of one `regatta_sid` start a new visit after a gap over VISIT_GAP_MS.
 * Params: from, to, gap.
 */
const VISITS_CTE = `
  WITH pv AS (
    SELECT session_id, ts,
           ts - LAG(ts) OVER (PARTITION BY session_id ORDER BY ts) AS gap
    FROM events
    WHERE ts >= ? AND ts < ? AND evt = 'page.view' AND session_id IS NOT NULL
  ),
  numbered AS (
    SELECT session_id, ts,
           SUM(CASE WHEN gap IS NULL OR gap > ? THEN 1 ELSE 0 END)
             OVER (PARTITION BY session_id ORDER BY ts ROWS UNBOUNDED PRECEDING) AS visit_no
    FROM pv
  ),
  visits AS (
    SELECT session_id, visit_no, COUNT(*) AS pv_count, MAX(ts) - MIN(ts) AS dur_ms
    FROM numbered GROUP BY session_id, visit_no
  )`;

/** Nearest-rank percentile of an ascending array; 0 when empty. */
function percentile(sorted: number[], p: number): number {
  if (sorted.length === 0) return 0;
  const idx = Math.min(sorted.length - 1, Math.max(0, Math.ceil(p * sorted.length) - 1));
  return sorted[idx];
}

type VisitMetrics = Pick<RangeMetrics,
  'visits' | 'pagesPerVisit' | 'bounceRate' | 'medianVisitSeconds' | 'p90VisitSeconds' | 'returningVisitorPct'>;

/**
 * Visit-based quality metrics. Replaces the old per-sid figures: the sid lives
 * a year, so "duration" (first to last view in the whole range) and
 * "returning" (more than one page view) measured neither visits nor returns.
 */
function getVisitMetrics(d: Database.Database, fromMs: number, toMs: number): VisitMetrics {
  const rows = d.prepare(`${VISITS_CTE}
    SELECT pv_count, dur_ms FROM visits ORDER BY dur_ms
  `).all(fromMs, toMs, VISIT_GAP_MS) as Array<{ pv_count: number; dur_ms: number }>;

  // Returning: 2+ visits inside the range, or first seen before it.
  // `returning` is a reserved SQLite keyword, hence `returning_n`.
  const visitors = d.prepare(`${VISITS_CTE}
    SELECT COUNT(*) AS total,
           SUM(CASE WHEN v.n >= 2 OR s.first_seen < ? THEN 1 ELSE 0 END) AS returning_n
    FROM (SELECT session_id, COUNT(*) AS n FROM visits GROUP BY session_id) v
    LEFT JOIN sessions s ON s.id = v.session_id
  `).get(fromMs, toMs, VISIT_GAP_MS, fromMs) as { total: number; returning_n: number | null };

  const visits = rows.length;
  const seconds = rows.map((r) => r.dur_ms / 1000);
  return {
    visits,
    pagesPerVisit: visits > 0 ? rows.reduce((s, r) => s + r.pv_count, 0) / visits : 0,
    bounceRate: visits > 0 ? rows.filter((r) => r.pv_count === 1).length / visits : 0,
    medianVisitSeconds: percentile(seconds, 0.5),
    p90VisitSeconds: percentile(seconds, 0.9),
    returningVisitorPct: visitors.total > 0 ? (visitors.returning_n ?? 0) / visitors.total : 0,
  };
}

/**
 * Rich metrics for a given time range. Backs the date-picker-driven
 * /stats dashboard. Returns totals, breakdowns, hourly + daily series,
 * session-quality metrics, and a recent-events feed for the live view.
 */
export function getMetricsRange(fromMs: number, toMs: number): RangeMetrics {
  const d = db();
  // Common filter params for prepared statements
  const p = [fromMs, toMs] as const;
  // Event counts
  const events = (d.prepare('SELECT COUNT(*) c FROM events WHERE ts >= ? AND ts < ?').get(...p) as { c: number }).c;
  const pageViews = (d.prepare("SELECT COUNT(*) c FROM events WHERE ts >= ? AND ts < ? AND evt = 'page.view'").get(...p) as { c: number }).c;
  const uniqueSessions = (d.prepare('SELECT COUNT(DISTINCT session_id) c FROM events WHERE ts >= ? AND ts < ? AND session_id IS NOT NULL').get(...p) as { c: number }).c;
  const uniqueIps = (d.prepare('SELECT COUNT(DISTINCT ip) c FROM events WHERE ts >= ? AND ts < ? AND ip IS NOT NULL').get(...p) as { c: number }).c;
  const jsErrors = (d.prepare("SELECT COUNT(*) c FROM events WHERE ts >= ? AND ts < ? AND evt IN ('js.uncaught', 'js.rejection')").get(...p) as { c: number }).c;
  const feedbackNew = (d.prepare("SELECT COUNT(*) c FROM feedback WHERE ts >= ? AND ts < ? AND kind = 'feedback' AND status = 'new'").get(...p) as { c: number }).c;
  const bugsNew = (d.prepare("SELECT COUNT(*) c FROM feedback WHERE ts >= ? AND ts < ? AND kind = 'bug' AND status = 'new'").get(...p) as { c: number }).c;

  // Breakdowns
  const topPaths = d.prepare(`
    SELECT path, COUNT(*) count FROM events
    WHERE ts >= ? AND ts < ? AND evt = 'page.view' AND path IS NOT NULL
    GROUP BY path ORDER BY count DESC LIMIT 15
  `).all(...p) as Array<{ path: string; count: number }>;

  const topEvents = d.prepare(`
    SELECT evt, COUNT(*) count FROM events
    WHERE ts >= ? AND ts < ?
    GROUP BY evt ORDER BY count DESC LIMIT 15
  `).all(...p) as Array<{ evt: string; count: number }>;

  const topIps = d.prepare(`
    SELECT ip, COUNT(*) count FROM events
    WHERE ts >= ? AND ts < ? AND ip IS NOT NULL AND evt = 'page.view'
    GROUP BY ip ORDER BY count DESC LIMIT 15
  `).all(...p) as Array<{ ip: string; count: number }>;

  const topReferrers = d.prepare(`
    SELECT json_extract(meta_json, '$.referrer') ref, COUNT(*) count
    FROM events WHERE ts >= ? AND ts < ? AND evt = 'page.view'
    GROUP BY ref ORDER BY count DESC LIMIT 10
  `).all(...p) as Array<{ ref: string | null; count: number }>;

  const deviceSplit = d.prepare(`
    SELECT device, COUNT(*) count FROM events
    WHERE ts >= ? AND ts < ? AND evt = 'page.view' AND device IS NOT NULL
    GROUP BY device ORDER BY count DESC
  `).all(...p) as Array<{ device: string; count: number }>;

  const deviceModelSplit = d.prepare(`
    SELECT ${DEVICE_MODEL_SQL} AS model, COUNT(*) count FROM events
    WHERE ts >= ? AND ts < ? AND evt = 'page.view' AND device_model IS NOT NULL
    GROUP BY model ORDER BY count DESC LIMIT 20
  `).all(...p).map((r) => {
    const row = r as { model: string; count: number };
    return { device_model: row.model, count: row.count };
  });

  const countrySplit = d.prepare(`
    SELECT country, COUNT(*) count FROM events
    WHERE ts >= ? AND ts < ? AND evt = 'page.view' AND country IS NOT NULL
    GROUP BY country ORDER BY count DESC LIMIT 30
  `).all(...p) as Array<{ country: string; count: number }>;

  const utmSourceSplit = d.prepare(`
    SELECT utm_source, COUNT(*) count FROM events
    WHERE ts >= ? AND ts < ? AND evt = 'page.view' AND utm_source IS NOT NULL
    GROUP BY utm_source ORDER BY count DESC LIMIT 15
  `).all(...p) as Array<{ utm_source: string; count: number }>;

  const utmCampaignSplit = d.prepare(`
    SELECT utm_campaign, COUNT(*) count FROM events
    WHERE ts >= ? AND ts < ? AND evt = 'page.view' AND utm_campaign IS NOT NULL
    GROUP BY utm_campaign ORDER BY count DESC LIMIT 15
  `).all(...p) as Array<{ utm_campaign: string; count: number }>;

  const viewportSplit = d.prepare(`
    SELECT viewport, COUNT(*) count FROM events
    WHERE ts >= ? AND ts < ? AND evt = 'page.view' AND viewport IS NOT NULL
    GROUP BY viewport ORDER BY count DESC LIMIT 10
  `).all(...p) as Array<{ viewport: string; count: number }>;

  const languageSplit = d.prepare(`
    SELECT language, COUNT(*) count FROM events
    WHERE ts >= ? AND ts < ? AND language IS NOT NULL
    GROUP BY language ORDER BY count DESC
  `).all(...p) as Array<{ language: string; count: number }>;

  // Browser / OS split - have to parse UA in-memory.
  const uaRows = d.prepare(`
    SELECT ua, COUNT(*) c FROM events
    WHERE ts >= ? AND ts < ? AND evt = 'page.view' AND ua IS NOT NULL
    GROUP BY ua
  `).all(...p) as Array<{ ua: string; c: number }>;
  const browserMap: Record<string, number> = {};
  const osMap: Record<string, number> = {};
  for (const row of uaRows) {
    const b = detectBrowser(row.ua);
    const o = detectOS(row.ua);
    browserMap[b] = (browserMap[b] ?? 0) + row.c;
    osMap[o] = (osMap[o] ?? 0) + row.c;
  }
  const browserSplit = Object.entries(browserMap).sort((a, b) => b[1] - a[1]).map(([browser, count]) => ({ browser, count }));
  const osSplit = Object.entries(osMap).sort((a, b) => b[1] - a[1]).map(([os, count]) => ({ os, count }));

  // Hourly (30 days back cap to keep query bounded)
  const hourly = d.prepare(`
    SELECT strftime('%Y-%m-%d %H:00', ts/1000, 'unixepoch') hour,
           COUNT(*) events,
           SUM(CASE WHEN evt = 'page.view' THEN 1 ELSE 0 END) pageViews
    FROM events WHERE ts >= ? AND ts < ?
    GROUP BY hour ORDER BY hour
  `).all(...p) as Array<{ hour: string; events: number; pageViews: number }>;

  // Daily
  const daily = d.prepare(`
    SELECT strftime('%Y-%m-%d', ts/1000, 'unixepoch') day,
           COUNT(*) events,
           SUM(CASE WHEN evt = 'page.view' THEN 1 ELSE 0 END) pageViews,
           COUNT(DISTINCT session_id) uniqueSessions
    FROM events WHERE ts >= ? AND ts < ?
    GROUP BY day ORDER BY day
  `).all(...p) as Array<{ day: string; events: number; pageViews: number; uniqueSessions: number }>;

  // Time-on-page via ms_since_start on page.view events.
  // Avg is cheap; median computed from sampled sorted array.
  const msRows = d.prepare(`
    SELECT ms_since_start FROM events
    WHERE ts >= ? AND ts < ? AND evt = 'page.view' AND ms_since_start IS NOT NULL
    ORDER BY ms_since_start ASC
  `).all(...p) as Array<{ ms_since_start: number }>;
  const avgMsSinceStart = msRows.length > 0
    ? msRows.reduce((s, r) => s + r.ms_since_start, 0) / msRows.length
    : 0;
  const medianMsSinceStart = msRows.length > 0
    ? msRows[Math.floor(msRows.length / 2)].ms_since_start
    : 0;

  // Recent events feed (last 30 inside range)
  const recent = d.prepare(`
    SELECT ts, evt, path, ip, device, language lang, country, ${DEVICE_MODEL_SQL} AS device_model
    FROM events WHERE ts >= ? AND ts < ?
    ORDER BY ts DESC LIMIT 30
  `).all(...p) as RangeMetrics['recent'];

  return {
    range: { fromMs, toMs },
    events, pageViews, uniqueSessions, uniqueIps, feedbackNew, bugsNew, jsErrors,
    topPaths, topEvents, topIps,
    topReferrers: topReferrers.map((r) => ({ ref: r.ref ?? '(direct)', count: r.count })),
    deviceSplit, deviceModelSplit, browserSplit, osSplit, viewportSplit, languageSplit,
    countrySplit, utmSourceSplit, utmCampaignSplit,
    funnel: getFunnelMetrics(d, fromMs, toMs),
    hourly, daily,
    ...getVisitMetrics(d, fromMs, toMs),
    avgMsSinceStart,
    medianMsSinceStart,
    recent,
  };
}

/**
 * A feedback row as the /stats admin list sees it. The page sends these rows
 * to the browser, so the IP and the raw user agent stay on the server (older
 * rows still hold full IPs); `client` is a coarse "Browser / OS" label for
 * triaging bug reports instead.
 */
export interface FeedbackListItem {
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
  client: string | null;
  status: string;
}

const FEEDBACK_LIST_COLUMNS =
  'id, ts, kind, category, message, expected, actual, contact, path, viewport, language, ua, status';

export function listFeedback(limit = 100, status?: string): FeedbackListItem[] {
  const d = db();
  const rows = (status
    ? d.prepare(`SELECT ${FEEDBACK_LIST_COLUMNS} FROM feedback WHERE status = ? ORDER BY ts DESC LIMIT ?`).all(status, limit)
    : d.prepare(`SELECT ${FEEDBACK_LIST_COLUMNS} FROM feedback ORDER BY ts DESC LIMIT ?`).all(limit)
  ) as Array<Omit<FeedbackListItem, 'client'> & { ua: string | null }>;
  return rows.map(({ ua, ...row }) => ({
    ...row,
    client: ua ? `${detectBrowser(ua)} / ${detectOS(ua)}` : null,
  }));
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

// ============================================================================
// Gallery likes (anonymous, per-session)
// ============================================================================

/**
 * Toggle a like for an anonymous session. Inserts on first like, deletes
 * on second click. Returns the new state and the new total count for the
 * item so the client can update without a second round-trip.
 */
export function toggleGalleryLike(itemId: string, sid: string): {
  liked: boolean;
  count: number;
} {
  try {
    const d = db();
    const existing = d.prepare(
      'SELECT id FROM gallery_likes WHERE item_id = ? AND sid = ?',
    ).get(itemId, sid);
    if (existing) {
      d.prepare('DELETE FROM gallery_likes WHERE item_id = ? AND sid = ?')
        .run(itemId, sid);
    } else {
      d.prepare('INSERT INTO gallery_likes (item_id, sid, ts) VALUES (?, ?, ?)')
        .run(itemId, sid, Date.now());
    }
    const row = d.prepare(
      'SELECT COUNT(*) c FROM gallery_likes WHERE item_id = ?',
    ).get(itemId) as { c: number };
    return { liked: !existing, count: row.c };
  } catch {
    return { liked: false, count: 0 };
  }
}

/**
 * Bulk fetch like counts + the caller's per-item liked state. Used by the
 * gallery page's first paint - one query for all 38 photos at once.
 */
export function getGalleryLikes(itemIds: string[], sid: string): Record<string, {
  count: number;
  liked: boolean;
}> {
  const out: Record<string, { count: number; liked: boolean }> = {};
  if (itemIds.length === 0) return out;
  try {
    const d = db();
    // Counts per id
    const placeholders = itemIds.map(() => '?').join(',');
    const counts = d.prepare(
      `SELECT item_id, COUNT(*) c FROM gallery_likes
       WHERE item_id IN (${placeholders})
       GROUP BY item_id`,
    ).all(...itemIds) as Array<{ item_id: string; c: number }>;
    const countMap: Record<string, number> = {};
    for (const r of counts) countMap[r.item_id] = r.c;
    // Which ones THIS sid has liked
    const myLikes = d.prepare(
      `SELECT item_id FROM gallery_likes
       WHERE sid = ? AND item_id IN (${placeholders})`,
    ).all(sid, ...itemIds) as Array<{ item_id: string }>;
    const mySet = new Set(myLikes.map((r) => r.item_id));
    for (const id of itemIds) {
      out[id] = { count: countMap[id] ?? 0, liked: mySet.has(id) };
    }
    return out;
  } catch {
    for (const id of itemIds) out[id] = { count: 0, liked: false };
    return out;
  }
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
    const selection = readRaceResultSelection(r);
    if (!selection.ok || selection.value.kind !== "legacy-unclassified") return null;
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

export type ClassifiedRaceResultInsert = RaceResultInsert & {
  raceContext: RaceContext;
  mode: RaceResultMode;
  course: unknown;
  classId?: RaceClassId;
  rawFinishTimeSec: number;
  penaltySeconds: number;
  dailyDay?: unknown;
  daily?: unknown;
};

/** Separate from old-client writes: invalid or disabled metadata cannot fall
 * back into the unclassified pool after a failed classified submission. */
export function insertClassifiedRaceResult(r: ClassifiedRaceResultInsert): number | null {
  try {
    const read = readClassifiedRaceResult(r);
    if (!read.ok) return null;
    const result = read.value;
    const info = db().prepare(`
      INSERT INTO race_results (ts, sid, nickname, difficulty, wind_strength, mission_id,
        finish_time_sec, position, total_boats, tacks, no_go_entries, top_speed, score,
        race_class_id, race_mode, race_context_json, raw_finish_time_sec, penalty_seconds)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      Date.now(), r.sid, r.nickname, result.difficulty, result.windStrength, null,
      result.finishTimeSec, r.position ?? null, r.totalBoats ?? null, r.tacks ?? null,
      r.noGoEntries ?? null, r.topSpeed ?? null, r.score ?? null,
      result.classId, result.mode, JSON.stringify(result.raceContext), result.rawFinishTimeSec, result.penaltySeconds,
    );
    return info.lastInsertRowid as number;
  } catch { return null; }
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
        WHERE r.difficulty = ? AND r.wind_strength = ? AND r.mission_id IS NULL AND r.race_class_id IS NULL
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
        WHERE r.mission_id = ? AND r.race_class_id IS NULL
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

export interface ClassifiedLeaderboardRow extends LeaderboardRow {
  race_class_id: RaceClassId;
  race_mode: RaceResultMode;
  raw_finish_time_sec: number;
  penalty_seconds: number;
}

/** A valid empty class is [], whereas initialization/query failure is null.
 * Physical boards are readable while their producers remain disabled. */
export function topByRaceClass(
  classId: RaceClassId, mode: RaceResultMode, difficulty: string, wind: string, limit = 20,
): ClassifiedLeaderboardRow[] | null {
  const raceContext = raceContextForClassId(classId);
  if (!raceContext || (mode !== "simple" && mode !== "pro") || !readRaceComparison({ raceContext, mode, difficulty, windStrength: wind }).ok
    || !Number.isInteger(limit) || limit < 1 || limit > 1000) return null;
  try {
    return db().prepare(`
      WITH ranked AS (
        SELECT r.nickname, r.sid, r.difficulty, r.wind_strength, r.mission_id,
               r.finish_time_sec, r.score, r.ts, r.race_class_id, r.race_mode,
               r.raw_finish_time_sec, r.penalty_seconds,
               ROW_NUMBER() OVER (
                 PARTITION BY r.sid
                 ORDER BY r.finish_time_sec ASC, r.ts DESC
               ) AS rn
        FROM race_results r
        WHERE r.race_class_id = ? AND r.race_mode = ? AND r.difficulty = ?
          AND r.wind_strength = ? AND r.mission_id IS NULL
      )
      SELECT nickname, sid, difficulty, wind_strength, mission_id,
             finish_time_sec, score, ts, race_class_id, race_mode,
             raw_finish_time_sec, penalty_seconds
      FROM ranked
      WHERE rn = 1
      ORDER BY finish_time_sec ASC
      LIMIT ?
    `).all(classId, mode, difficulty, wind, limit) as ClassifiedLeaderboardRow[];
  } catch { return null; }
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
  const { seed, difficulty, windStrength: wind } = dailySettings(day);
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
          AND r.race_class_id IS NULL
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
