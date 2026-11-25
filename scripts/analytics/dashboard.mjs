#!/usr/bin/env node
/**
 * Local analytics dashboard: what people do on the site and in the app.
 *
 *   npm run analytics                 # pull new data, then open the dashboard
 *   node scripts/analytics/dashboard.mjs --no-pull --port 4500
 *
 * Serves scripts/analytics/dashboard.html on http://127.0.0.1:4500 (loopback
 * only) and answers:
 *   GET  /api/report?from=YYYY-MM-DD&to=YYYY-MM-DD&client=all|web|app&language=xx&country=XX
 *   POST /api/pull    pull new events from production (scripts/analytics/pull.mjs)
 *
 * Reads the local copy made by pull.mjs (REGATTA_ANALYTICS_DIR, default
 * ~/.regatta-analytics). Optional ~/.regatta-analytics/config.json:
 *   { "excludeSessions": ["<regatta_sid of your own browsers>"] }
 * hides your own visits (find the id in the browser: document.cookie).
 */

import { readFileSync, existsSync } from 'node:fs';
import { createServer } from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { DATA_DIR, openLocalDb, pull } from './pull.mjs';
import { buildReport } from './report.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const args = process.argv.slice(2);
const argValue = (name, fallback) => {
  const i = args.indexOf(name);
  return i >= 0 && args[i + 1] ? args[i + 1] : fallback;
};
const PORT = Number(argValue('--port', process.env.REGATTA_ANALYTICS_PORT || 4500));

function loadConfig() {
  const file = path.join(DATA_DIR, 'config.json');
  if (!existsSync(file)) return { excludeSessions: [] };
  try {
    const cfg = JSON.parse(readFileSync(file, 'utf8'));
    return { excludeSessions: Array.isArray(cfg.excludeSessions) ? cfg.excludeSessions.map(String) : [] };
  } catch {
    return { excludeSessions: [] };
  }
}

function loadData() {
  const db = openLocalDb();
  const events = db.prepare('SELECT * FROM events').all().map((r) => {
    let meta = null;
    try { meta = r.meta_json ? JSON.parse(r.meta_json) : null; } catch { meta = null; }
    const { meta_json: _drop, ...rest } = r;
    return { ...rest, meta };
  });
  const sessions = db.prepare('SELECT * FROM sessions').all();
  const lastPull = db.prepare('SELECT ts, events FROM pulls ORDER BY ts DESC LIMIT 1').get() ?? null;
  db.close();
  return { events, sessions, lastPull };
}

/** Local midnight of YYYY-MM-DD, or end of that day when `end` is set. */
function dayBound(s, end) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s ?? '');
  if (!m) return undefined;
  const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  return end ? d.getTime() + 86_400_000 - 1 : d.getTime();
}

function send(res, status, body, type = 'application/json; charset=utf-8') {
  res.writeHead(status, { 'Content-Type': type, 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' });
  res.end(typeof body === 'string' || Buffer.isBuffer(body) ? body : JSON.stringify(body));
}

let pulling = null;

const server = createServer(async (req, res) => {
  const url = new URL(req.url ?? '/', `http://127.0.0.1:${PORT}`);
  try {
    if (req.method === 'GET' && (url.pathname === '/' || url.pathname === '/index.html')) {
      send(res, 200, readFileSync(path.join(HERE, 'dashboard.html')), 'text/html; charset=utf-8');
      return;
    }
    if (req.method === 'GET' && url.pathname === '/api/report') {
      const { events, sessions, lastPull } = loadData();
      const q = url.searchParams;
      const report = buildReport(events, sessions, {
        from: dayBound(q.get('from'), false),
        to: dayBound(q.get('to'), true),
        client: q.get('client') ?? 'all',
        language: q.get('language') ?? '',
        country: q.get('country') ?? '',
        excludeSessions: loadConfig().excludeSessions,
      });
      send(res, 200, { ...report, lastPull, storedEvents: events.length });
      return;
    }
    if (req.method === 'POST' && url.pathname === '/api/pull') {
      // Same-origin only: a page on another site must not trigger SSH.
      const origin = req.headers.origin;
      if (origin && origin !== `http://127.0.0.1:${PORT}` && origin !== `http://localhost:${PORT}`) {
        send(res, 403, { error: 'forbidden' });
        return;
      }
      pulling ??= pull({ log: () => {} }).finally(() => { pulling = null; });
      const result = await pulling;
      send(res, 200, result);
      return;
    }
    send(res, 404, { error: 'not found' });
  } catch (err) {
    send(res, 500, { error: err instanceof Error ? err.message : String(err) });
  }
});

async function main() {
  if (!args.includes('--no-pull')) {
    try {
      await pull();
    } catch (err) {
      console.error(`Pull failed, showing the data already stored: ${err.message}`);
    }
  }
  server.listen(PORT, '127.0.0.1', () => {
    console.log(`Regatta analytics: http://127.0.0.1:${PORT}  (Ctrl+C to stop)`);
  });
}

main();
