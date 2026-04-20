/**
 * Client-side logger - fires-and-forgets events to /api/log.
 * Uses sendBeacon when available (survives page unload), falls back to fetch.
 * Silent on failure - must never break the user's experience.
 *
 * Features (added 2026-04-20 Tech Risk #1 closure):
 * - Per-signature dedup: same (level, evt, msgHash) logged at most once
 *   per minute. Prevents 1000-entry spam when a render loop throws.
 * - Offline buffer: if navigator.onLine is false, queue the event in
 *   localStorage (capped at 50 entries). On next page load, flush the
 *   buffer opportunistically.
 * - Absolute session cap: max 100 logs per session to prevent
 *   runaway log storms from eating /api/log bandwidth.
 */

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
const MAX_PER_SESSION = 100;

const dedupMap = new Map<string, number>(); // signature -> last emission ts
let sessionCount = 0;

function hashSig(level: Level, evt: string, fields: Record<string, unknown>): string {
  // Use evt + msg + first stack line to collapse "same error, different timestamps"
  const msg = String(fields.msg ?? fields.reason ?? '').slice(0, 120);
  const firstStackLine = String(fields.stack ?? '').split('|')[0]?.trim().slice(0, 80) ?? '';
  return `${level}:${evt}:${msg}:${firstStackLine}`;
}

function send(body: string): void {
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
    // Session cap - stop logging entirely once we've hit the limit
    if (sessionCount >= MAX_PER_SESSION) return;

    // Dedup window
    const sig = hashSig(level, evt, fields);
    const now = Date.now();
    const lastSeen = dedupMap.get(sig);
    if (lastSeen !== undefined && now - lastSeen < DEDUP_WINDOW_MS) return;
    dedupMap.set(sig, now);

    sessionCount += 1;

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
