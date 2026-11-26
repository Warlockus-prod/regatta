#!/usr/bin/env node
/**
 * Pull anonymous activity from production into a local SQLite file for the
 * local dashboard (scripts/analytics/dashboard.mjs).
 *
 *   node scripts/analytics/pull.mjs            # new events since the last pull
 *   node scripts/analytics/pull.mjs --full     # start over from the first event
 *
 * How: over the owner's SSH access, `docker exec -i regatta node -` runs a
 * short read-only script inside the app container (the database is opened
 * with readonly: true, nothing is written on the server). It streams events
 * after the last local id as JSON lines, plus the sessions table.
 *
 * What comes over: event name, time, route, anonymous visitor id
 * (`regatta_sid`), country, device class and model, browser and OS family,
 * viewport, language, app version, utm, the referrer reduced to origin and
 * path, and the allow-listed meta fields. Never the stored (truncated) IP and
 * never the raw user agent.
 *
 * Local copy: REGATTA_ANALYTICS_DIR (default ~/.regatta-analytics), outside
 * the repository, so it is never committed and survives worktrees. The server
 * prunes events after 180 days; the local copy keeps them.
 *
 * Settings: REGATTA_SSH_HOST (default 178.104.223.93, vps2),
 * REGATTA_CONTAINER (default regatta).
 */

import { spawn } from 'node:child_process';
import { mkdirSync } from 'node:fs';
import { homedir } from 'node:os';
import path from 'node:path';
import { createInterface } from 'node:readline';
import { fileURLToPath } from 'node:url';
import Database from 'better-sqlite3';

export const DATA_DIR = process.env.REGATTA_ANALYTICS_DIR || path.join(homedir(), '.regatta-analytics');
export const DB_FILE = path.join(DATA_DIR, 'regatta-analytics.db');
const SSH_HOST = process.env.REGATTA_SSH_HOST || '178.104.223.93';
const CONTAINER = process.env.REGATTA_CONTAINER || 'regatta';

/** Runs inside the production container. Read-only; prints JSON lines. */
export const REMOTE_SCRIPT = String.raw`
const Database = require('better-sqlite3');
const db = new Database('/data/regatta-stats.db', { readonly: true, fileMustExist: true });
const since = Number(process.env.SINCE_ID || 0);
const browserOf = (ua) => {
  if (!ua) return null;
  if (/WeekToRegattaApp\//.test(ua)) return 'Приложение iOS';
  if (/Edg\//.test(ua)) return 'Edge';
  if (/SamsungBrowser/.test(ua)) return 'Samsung Internet';
  if (/OPR\/|Opera/.test(ua)) return 'Opera';
  if (/YaBrowser/.test(ua)) return 'Yandex';
  if (/Firefox\/|FxiOS/.test(ua)) return 'Firefox';
  if (/CriOS|Chrome\//.test(ua)) return 'Chrome';
  if (/(iPhone|iPad).*AppleWebKit(?!.*Safari)/.test(ua)) return 'WebView iOS';
  if (/Safari\//.test(ua)) return 'Safari';
  return 'другой';
};
const osOf = (ua) => {
  if (!ua) return null;
  if (/iPhone|iPad|iPod|WeekToRegattaApp/.test(ua)) return 'iOS';
  if (/Android/.test(ua)) return 'Android';
  if (/Mac OS X|Macintosh/.test(ua)) return 'macOS';
  if (/Windows/.test(ua)) return 'Windows';
  if (/CrOS/.test(ua)) return 'ChromeOS';
  if (/Linux/.test(ua)) return 'Linux';
  return 'другая';
};
const shortRef = (r) => {
  if (!r) return null;
  try { const u = new URL(r); return (u.origin + u.pathname).slice(0, 300); } catch { return null; }
};
const out = (o) => process.stdout.write(JSON.stringify(o) + '\n');
const ev = db.prepare('SELECT id, ts, evt, path, session_id, ua, country, device, device_model, viewport, language, app_version, ms_since_start, utm_source, utm_medium, utm_campaign, referrer, meta_json FROM events WHERE id > ? ORDER BY id');
for (const r of ev.iterate(since)) {
  const { ua, referrer, ...rest } = r;
  out({ t: 'e', ...rest, referrer: shortRef(referrer), browser: browserOf(ua), os: osOf(ua) });
}
for (const s of db.prepare('SELECT id, first_seen, last_seen, country, device, device_model, language, utm_source, utm_medium, utm_campaign, visit_count FROM sessions').iterate()) {
  out({ t: 's', ...s });
}
out({ t: 'done' });
`;

export function openLocalDb(file = DB_FILE) {
  mkdirSync(path.dirname(file), { recursive: true, mode: 0o700 });
  const db = new Database(file);
  db.pragma('journal_mode = WAL');
  db.exec(`
    CREATE TABLE IF NOT EXISTS events (
      id INTEGER PRIMARY KEY,
      ts INTEGER NOT NULL,
      evt TEXT NOT NULL,
      path TEXT,
      sid TEXT,
      country TEXT,
      device TEXT,
      device_model TEXT,
      browser TEXT,
      os TEXT,
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
    CREATE INDEX IF NOT EXISTS idx_local_events_ts ON events(ts);
    CREATE TABLE IF NOT EXISTS sessions (
      id TEXT PRIMARY KEY,
      first_seen INTEGER,
      last_seen INTEGER,
      country TEXT,
      device TEXT,
      device_model TEXT,
      language TEXT,
      utm_source TEXT,
      utm_medium TEXT,
      utm_campaign TEXT,
      visit_count INTEGER
    );
    CREATE TABLE IF NOT EXISTS pulls (
      ts INTEGER NOT NULL,
      events INTEGER NOT NULL,
      sessions INTEGER NOT NULL
    );
  `);
  return db;
}

/** Pull new rows into the local database. Resolves with counts. */
export function pull({ full = false, log = console.log } = {}) {
  const db = openLocalDb();
  if (full) db.exec('DELETE FROM events; DELETE FROM sessions;');
  const since = db.prepare('SELECT COALESCE(MAX(id), 0) AS id FROM events').get().id;
  const insEvent = db.prepare(`INSERT OR IGNORE INTO events
    (id, ts, evt, path, sid, country, device, device_model, browser, os, viewport, language, app_version,
     ms_since_start, utm_source, utm_medium, utm_campaign, referrer, meta_json)
    VALUES (@id, @ts, @evt, @path, @session_id, @country, @device, @device_model, @browser, @os, @viewport, @language,
     @app_version, @ms_since_start, @utm_source, @utm_medium, @utm_campaign, @referrer, @meta_json)`);
  const upSession = db.prepare(`INSERT INTO sessions
    (id, first_seen, last_seen, country, device, device_model, language, utm_source, utm_medium, utm_campaign, visit_count)
    VALUES (@id, @first_seen, @last_seen, @country, @device, @device_model, @language, @utm_source, @utm_medium, @utm_campaign, @visit_count)
    ON CONFLICT(id) DO UPDATE SET
      first_seen = MIN(sessions.first_seen, excluded.first_seen),
      last_seen = MAX(sessions.last_seen, excluded.last_seen),
      country = COALESCE(sessions.country, excluded.country),
      device = COALESCE(excluded.device, sessions.device),
      device_model = COALESCE(sessions.device_model, excluded.device_model),
      language = COALESCE(excluded.language, sessions.language),
      utm_source = COALESCE(sessions.utm_source, excluded.utm_source),
      utm_medium = COALESCE(sessions.utm_medium, excluded.utm_medium),
      utm_campaign = COALESCE(sessions.utm_campaign, excluded.utm_campaign),
      visit_count = MAX(sessions.visit_count, excluded.visit_count)`);

  log(`Pulling from ${SSH_HOST} (${CONTAINER}) after event id ${since}...`);
  return new Promise((resolve, reject) => {
    const child = spawn('ssh', ['-o', 'BatchMode=yes', SSH_HOST, `docker exec -i -e SINCE_ID=${Number(since)} ${CONTAINER} node -`], {
      stdio: ['pipe', 'pipe', 'pipe'],
    });
    let events = 0;
    let sessions = 0;
    let done = false;
    let stderr = '';
    const batch = [];
    const flush = db.transaction((rows) => {
      for (const r of rows) {
        if (r.t === 'e') { insEvent.run(r); events += 1; } else if (r.t === 's') { upSession.run(r); sessions += 1; }
      }
    });
    const rl = createInterface({ input: child.stdout });
    rl.on('line', (line) => {
      if (!line.trim()) return;
      let row;
      try { row = JSON.parse(line); } catch { return; }
      if (row.t === 'done') { done = true; return; }
      batch.push(row);
      if (batch.length >= 1000) flush(batch.splice(0));
    });
    child.stderr.on('data', (d) => { stderr += d; });
    child.on('error', reject);
    child.on('close', (code) => {
      rl.close();
      if (batch.length) flush(batch.splice(0));
      if (code !== 0 || !done) {
        db.close();
        reject(new Error(`pull failed (exit ${code}${done ? '' : ', stream incomplete'}): ${stderr.trim().slice(0, 500)}`));
        return;
      }
      db.prepare('INSERT INTO pulls (ts, events, sessions) VALUES (?, ?, ?)').run(Date.now(), events, sessions);
      const total = db.prepare('SELECT COUNT(*) AS n FROM events').get().n;
      db.close();
      log(`Done: ${events} new events, ${sessions} sessions refreshed, ${total} events stored in ${DB_FILE}`);
      resolve({ events, sessions, total });
    });
    child.stdin.end(REMOTE_SCRIPT);
  });
}

const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  pull({ full: process.argv.includes('--full') }).catch((err) => {
    console.error(err.message);
    process.exit(1);
  });
}
