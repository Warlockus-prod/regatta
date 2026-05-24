/**
 * SQLite-backed storage for analytics events and feedback.
 * File: /tmp/regatta-stats.db (persisted on VPS via Docker volume later)
 *
 * Lazy init: DB is opened on first request, schema created on open.
 */

import Database from 'better-sqlite3';
import path from 'path';
import { mkdirSync } from 'fs';
import { UAParser } from 'ua-parser-js';

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
    CREATE INDEX IF NOT EXISTS idx_events_evt ON events(evt);
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
    try { _db!.exec(sql); } catch { /* column exists, skip */ }
  };
  // events columns (2026-04-25: analytics expansion)
  safeAlter('ALTER TABLE events ADD COLUMN device_model TEXT');
  safeAlter('ALTER TABLE events ADD COLUMN ms_since_start INTEGER');
  safeAlter('ALTER TABLE events ADD COLUMN utm_source TEXT');
  safeAlter('ALTER TABLE events ADD COLUMN utm_medium TEXT');
  safeAlter('ALTER TABLE events ADD COLUMN utm_campaign TEXT');
  safeAlter('ALTER TABLE events ADD COLUMN referrer TEXT');
  safeAlter('CREATE INDEX IF NOT EXISTS idx_events_country ON events(country)');
  // sessions columns
  safeAlter('ALTER TABLE sessions ADD COLUMN device_model TEXT');
  safeAlter('ALTER TABLE sessions ADD COLUMN utm_source TEXT');
  safeAlter('ALTER TABLE sessions ADD COLUMN utm_medium TEXT');
  safeAlter('ALTER TABLE sessions ADD COLUMN utm_campaign TEXT');

  return _db;
}

function detectDevice(ua: string | null | undefined): string {
  if (!ua) return 'unknown';
  const s = ua.toLowerCase();
  if (/iphone|ipod|android.*mobile/.test(s)) return 'mobile';
  if (/ipad|tablet|android(?!.*mobile)/.test(s)) return 'tablet';
  return 'desktop';
}

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
      e.ip ?? null,
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

  // Time-series
  hourly: Array<{ hour: string; events: number; pageViews: number }>;
  daily: Array<{ day: string; events: number; pageViews: number; uniqueSessions: number }>;

  // Session-quality metrics
  avgPagesPerSession: number;
  avgSessionSeconds: number;
  bounceRate: number;       // fraction 0..1 of sessions with exactly 1 page.view
  returningSessionPct: number; // sessions with > 1 visit_count over all sessions in range

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
    SELECT device_model, COUNT(*) count FROM events
    WHERE ts >= ? AND ts < ? AND evt = 'page.view' AND device_model IS NOT NULL
    GROUP BY device_model ORDER BY count DESC LIMIT 20
  `).all(...p) as Array<{ device_model: string; count: number }>;

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

  // Session quality: pages per session, duration, bounce rate
  const sessStats = d.prepare(`
    SELECT session_id,
           COUNT(*) pv_count,
           MAX(ts) - MIN(ts) as dur_ms
    FROM events
    WHERE ts >= ? AND ts < ? AND evt = 'page.view' AND session_id IS NOT NULL
    GROUP BY session_id
  `).all(...p) as Array<{ session_id: string; pv_count: number; dur_ms: number }>;

  const pagesPerSession = sessStats.length > 0
    ? sessStats.reduce((s, r) => s + r.pv_count, 0) / sessStats.length
    : 0;
  const avgSessionSeconds = sessStats.length > 0
    ? sessStats.reduce((s, r) => s + (r.dur_ms || 0), 0) / sessStats.length / 1000
    : 0;
  const bounces = sessStats.filter((r) => r.pv_count === 1).length;
  const bounceRate = sessStats.length > 0 ? bounces / sessStats.length : 0;

  // Returning sessions (visit_count > 1 in sessions table, among those seen in range).
  // `returning` is a reserved SQLite keyword (RETURNING clause), so alias
  // as `returning_n` to avoid a parser error.
  const returningRow = d.prepare(`
    SELECT
      SUM(CASE WHEN visit_count > 1 THEN 1 ELSE 0 END) AS returning_n,
      COUNT(*) AS total
    FROM sessions
    WHERE last_seen >= ? AND last_seen < ?
  `).get(...p) as { returning_n: number | null; total: number };
  const returningSessionPct = returningRow.total > 0
    ? (returningRow.returning_n ?? 0) / returningRow.total
    : 0;

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
    SELECT ts, evt, path, ip, device, language lang, country, device_model
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
    hourly, daily,
    avgPagesPerSession: pagesPerSession,
    avgSessionSeconds,
    bounceRate,
    returningSessionPct,
    avgMsSinceStart,
    medianMsSinceStart,
    recent,
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
