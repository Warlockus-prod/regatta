/**
 * Client-side logger - fires-and-forgets events to /api/log.
 * Uses sendBeacon when available (survives page unload), falls back to fetch.
 * Silent on failure - must never break the user's experience.
 *
 * Features (added 2026-04-20 Tech Risk #1 closure):
 * - Per-signature dedup: same (level, evt, msgHash) logged at most once
 *   per minute. Prevents 1000-entry spam when a render loop throws. Funnel
 *   milestones (FUNNEL_EVENTS) are never deduped: each one counts, and their
 *   callers already guard against repeats.
 * - Offline buffer: if navigator.onLine is false, queue the event in
 *   localStorage (capped at 50 entries). On next page load, flush the
 *   buffer opportunistically.
 * - Per-page-load budgets, one per kind, so a noisy kind cannot starve the
 *   others: 50 JS errors, 50 funnel events, 100 of everything else. A
 *   recurring error during a 90-minute exam no longer eats the exam.finish.
 *
 * Sends nothing at all (see analyticsDisabled()) to automated browsers and
 * when the iOS app says its "Anonymous analytics" switch is off.
 */

import {
  FUNNEL_EVENTS,
  NO_ANALYTICS_GLOBAL,
  NO_ANALYTICS_STORAGE_KEY,
} from './analytics-events';

type Level = 'info' | 'warn' | 'error';

interface QueuedEntry {
  level: Level;
  evt: string;
  fields: Record<string, unknown>;
  ts: number;
  path: string;
}

const BUFFER_KEY = 'regatta.log-buffer.v1';
const DEDUP_WINDOW_MS = 60_000; // 1 minute per signature
const MAX_BUFFERED = 50;

type Budget = 'error' | 'funnel' | 'other';
const BUDGET_LIMITS: Record<Budget, number> = { error: 50, funnel: 50, other: 100 };

const dedupMap = new Map<string, number>(); // signature -> last emission ts
const sent: Record<Budget, number> = { error: 0, funnel: 0, other: 0 };

function budgetOf(evt: string): Budget {
  if (evt.startsWith('js.')) return 'error';
  return FUNNEL_EVENTS.has(evt) ? 'funnel' : 'other';
}

/**
 * True when this browser must not send analytics:
 * - automation (navigator.webdriver: Playwright, CI, agent browsers; or a
 *   HeadlessChrome user agent), which once made up half of all page views;
 * - the iOS app's analytics switch is off: the WebView host sets
 *   window.__REGATTA_NO_ANALYTICS__ (or the sessionStorage flag) before page
 *   scripts run.
 */
export function analyticsDisabled(): boolean {
  if (typeof window === 'undefined') return true;
  try {
    const nav = typeof navigator === 'undefined' ? undefined : navigator;
    if (nav?.webdriver === true) return true;
    if (typeof nav?.userAgent === 'string' && nav.userAgent.includes('HeadlessChrome')) return true;
    if ((window as unknown as Record<string, unknown>)[NO_ANALYTICS_GLOBAL] === true) return true;
    return window.sessionStorage?.getItem(NO_ANALYTICS_STORAGE_KEY) === '1';
  } catch {
    // Storage blocked: fall through to sending, the flags above were checked.
    return false;
  }
}

function hashSig(level: Level, evt: string, fields: Record<string, unknown>): string {
  // Use evt + msg + first stack line to collapse "same error, different timestamps".
  // `path` is included so that page.view events for different routes are
  // treated as distinct events (otherwise all page.views dedup to the same
  // signature and analytics miss most navigations).
  const msg = String(fields.msg ?? fields.reason ?? '').slice(0, 120);
  const firstStackLine = String(fields.stack ?? '').split('|')[0]?.trim().slice(0, 80) ?? '';
  const path = String(fields.path ?? '').slice(0, 80);
  // Events on one page that differ only by id (radio theory chapters,
  // simulator scenarios, two views of the same route) stay distinct.
  const id = String(fields.lessonId ?? fields.taskId ?? fields.viewId ?? '').slice(0, 64);
  return `${level}:${evt}:${path}:${id}:${msg}:${firstStackLine}`;
}

function send(body: string): void {
  // The app's offline radio bundle runs from file://, where there is no
  // /api/log to reach (it relays what matters over postMessage instead).
  if (!/^https?:$/.test(window.location.protocol)) return;
  const url = '/api/log';
  if (navigator.sendBeacon) {
    const ok = navigator.sendBeacon(url, new Blob([body], { type: 'application/json' }));
    if (ok) return;
  }
  fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body,
    keepalive: true,
  }).catch(() => { /* silent */ });
}

function bufferLocally(entry: QueuedEntry): void {
  try {
    const raw = localStorage.getItem(BUFFER_KEY);
    const arr: QueuedEntry[] = raw ? JSON.parse(raw) : [];
    arr.push(entry);
    // Cap the buffer - drop oldest
    while (arr.length > MAX_BUFFERED) arr.shift();
    localStorage.setItem(BUFFER_KEY, JSON.stringify(arr));
  } catch {
    // localStorage full / disabled / JSON broken - silently give up
  }
}

export function flushBufferedLogs(): void {
  if (typeof window === 'undefined') return;
  if (analyticsDisabled()) {
    // Queued while analytics was on, but the user has opted out since: drop it.
    try { localStorage.removeItem(BUFFER_KEY); } catch { /* */ }
    return;
  }
  if (!navigator.onLine) return;
  try {
    const raw = localStorage.getItem(BUFFER_KEY);
    if (!raw) return;
    const arr: QueuedEntry[] = JSON.parse(raw);
    localStorage.removeItem(BUFFER_KEY);
    for (const entry of arr) {
      const body = JSON.stringify({ ...entry.fields, level: entry.level, evt: entry.evt, ts: entry.ts, path: entry.path, replay: true });
      send(body);
    }
  } catch {
    // If anything goes wrong, wipe the buffer so it doesn't accumulate
    try { localStorage.removeItem(BUFFER_KEY); } catch { /* */ }
  }
}

export function clientLog(level: Level, evt: string, fields: Record<string, unknown> = {}): void {
  if (typeof window === 'undefined') return;
  try {
    if (analyticsDisabled()) return;

    // Per-page-load budget for this kind of event.
    const budget = budgetOf(evt);
    if (sent[budget] >= BUDGET_LIMITS[budget]) return;

    // Dedup window (not for funnel milestones, see the header).
    const now = Date.now();
    if (budget !== 'funnel') {
      const sig = hashSig(level, evt, fields);
      const lastSeen = dedupMap.get(sig);
      if (lastSeen !== undefined && now - lastSeen < DEDUP_WINDOW_MS) return;
      dedupMap.set(sig, now);
    }

    sent[budget] += 1;

    const entry: QueuedEntry = {
      level,
      evt,
      fields,
      ts: now,
      path: window.location.pathname,
    };

    // Offline buffer
    if (!navigator.onLine) {
      bufferLocally(entry);
      return;
    }

    const body = JSON.stringify({ level, evt, ...fields, path: entry.path, ts: now });
    send(body);
  } catch {
    // Absolutely never throw from a logger
  }
}

export const clientInfo = (evt: string, f?: Record<string, unknown>) => clientLog('info', evt, f);
export const clientWarn = (evt: string, f?: Record<string, unknown>) => clientLog('warn', evt, f);
export const clientError = (evt: string, f?: Record<string, unknown>) => clientLog('error', evt, f);
