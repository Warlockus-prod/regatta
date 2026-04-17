/**
 * Client-side logger - fires-and-forgets events to /api/log.
 * Uses sendBeacon when available (survives page unload), falls back to fetch.
 * Silent on failure - must never break the user's experience.
 */
type Level = 'info' | 'warn' | 'error';

export function clientLog(level: Level, evt: string, fields: Record<string, unknown> = {}): void {
  if (typeof window === 'undefined') return;
  try {
    const payload = {
      level,
      evt,
      ...fields,
      path: window.location.pathname,
      ts: Date.now(),
    };
    const body = JSON.stringify(payload);
    const url = '/api/log';

    if (navigator.sendBeacon) {
      navigator.sendBeacon(url, new Blob([body], { type: 'application/json' }));
    } else {
      fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body,
        keepalive: true,
      }).catch(() => { /* silent */ });
    }
  } catch {
    // Absolutely never throw from a logger
  }
}

export const clientInfo = (evt: string, f?: Record<string, unknown>) => clientLog('info', evt, f);
export const clientWarn = (evt: string, f?: Record<string, unknown>) => clientLog('warn', evt, f);
export const clientError = (evt: string, f?: Record<string, unknown>) => clientLog('error', evt, f);
