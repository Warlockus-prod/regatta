/**
 * First-party activity of the native app, sent to the site's own /api/log.
 *
 * The WebView pages (courses, simulators, race) already report page.view with
 * client 'app'. Native screens (home, menu, lessons, settings, history...) and
 * the time spent in the app were visible only to PostHog. These two events
 * close that gap so the owner's local dashboard (scripts/analytics/) sees the
 * whole app in one place:
 *  - `screen.view`: one per route change, the route is the expo-router path
 *    without query (ids in it are our own lesson / race ids, never user text);
 *  - `app.session`: one per foreground stretch, time in the app and how many
 *    screens were opened.
 *
 * Same anonymity as the web: no user text, no device id. The server keys the
 * visitor by the `regatta_sid` cookie it sets on the first answer (iOS keeps
 * it in the app's own cookie store). Nothing is sent when the user switched
 * "Anonymous analytics" off. The server accepts only names and fields listed in
 * src/lib/analytics-events.ts; an older server simply drops them.
 */

export const FIRST_PARTY_LOG_URL = 'https://weektoregatta.com/api/log';

/** Longest route kept; real routes are far shorter. */
const PATH_MAX = 120;
/** A foreground stretch shorter than this is a flicker, not a visit. */
const MIN_SESSION_MS = 1_000;
/** Same clamp as the web's page.engaged: a phone left on does not count days. */
const MAX_SESSION_MS = 4 * 60 * 60 * 1000;

export interface AppContextInfo {
  language: string;
  appVersion: string;
  viewport: string;
}

export type FirstPartyBody = Record<string, string | number | boolean>;

/** Route of a screen: no query or hash, one leading slash, bounded. */
export function normalizeScreenPath(pathname: string | null | undefined): string {
  if (!pathname) return '/';
  let p = pathname.split(/[?#]/)[0] ?? '/';
  if (!p.startsWith('/')) p = `/${p}`;
  p = p.replace(/\/{2,}/g, '/');
  if (p.length > 1) p = p.replace(/\/$/, '');
  return p.slice(0, PATH_MAX);
}

/** User agent that /api/log classifies as an iPhone or iPad of this app. */
export function appUserAgent(appVersion: string, isPad: boolean, osVersion: string | number): string {
  const device = isPad ? 'iPad' : 'iPhone';
  return `WeekToRegattaApp/${appVersion} (${device}; iOS ${String(osVersion)})`;
}

export function screenViewBody(path: string, ctx: AppContextInfo): FirstPartyBody {
  return {
    evt: 'screen.view',
    level: 'info',
    path,
    client: 'app',
    embed: false,
    language: ctx.language,
    appVersion: ctx.appVersion,
    viewport: ctx.viewport,
  };
}

/**
 * Counts one foreground stretch: start on launch or return to the app, end on
 * background. Pure, so the timing rules are testable without React Native.
 */
export class ForegroundSession {
  private startedAt: number | null;
  private screens = 0;
  private lastPath: string | null = null;

  constructor(now: number) {
    this.startedAt = now;
  }

  /** True when this route differs from the last one reported. */
  enterScreen(path: string): boolean {
    if (path === this.lastPath) return false;
    this.lastPath = path;
    if (this.startedAt !== null) this.screens += 1;
    return true;
  }

  resume(now: number): void {
    if (this.startedAt !== null) return;
    this.startedAt = now;
    this.screens = 0;
    // The screen in front is seen again in this stretch.
    if (this.lastPath !== null) this.screens = 1;
  }

  /** Ends the stretch; returns the app.session body, or null for a flicker. */
  end(now: number, ctx: AppContextInfo): FirstPartyBody | null {
    if (this.startedAt === null) return null;
    const ms = Math.min(Math.max(0, now - this.startedAt), MAX_SESSION_MS);
    const screens = this.screens;
    this.startedAt = null;
    this.screens = 0;
    if (ms < MIN_SESSION_MS) return null;
    return {
      evt: 'app.session',
      level: 'info',
      path: this.lastPath ?? '/',
      client: 'app',
      embed: false,
      durationSec: Math.round(ms / 1000),
      screens: Math.min(screens, 10_000),
      language: ctx.language,
      appVersion: ctx.appVersion,
    };
  }
}

/** Fire-and-forget POST; never throws, never blocks a screen. */
export function sendFirstParty(body: FirstPartyBody, userAgent: string, fetcher: typeof fetch = fetch): void {
  try {
    void fetcher(FIRST_PARTY_LOG_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'User-Agent': userAgent },
      body: JSON.stringify(body),
      credentials: 'include',
    }).catch(() => {
      /* offline or server down: activity is best-effort */
    });
  } catch {
    /* never break the app over analytics */
  }
}

/** postMessage type of an event relayed by an offline course page (src/lib/client-log.ts). */
export const RELAY_LOG_MESSAGE = 'regatta-log';
const RELAY_BODY_MAX = 6_000;
const RELAY_EVT_RE = /^[a-z][a-z_.]{2,40}$/;

/**
 * The offline bundles (radio, sailing) run from file:// and cannot reach
 * /api/log, so their client-log hands each event to the app. Returns the
 * event body to forward, or null when the message is something else or
 * malformed. Only flat primitive fields pass; the server checks names and
 * fields again against its allow-list.
 */
export function parseRelayedLog(raw: string): FirstPartyBody | null {
  if (typeof raw !== 'string' || raw.length > RELAY_BODY_MAX + 100 || !raw.includes(RELAY_LOG_MESSAGE)) return null;
  let msg: unknown;
  try { msg = JSON.parse(raw); } catch { return null; }
  if (!msg || typeof msg !== 'object') return null;
  const m = msg as Record<string, unknown>;
  if (m.type !== RELAY_LOG_MESSAGE || typeof m.body !== 'string' || m.body.length > RELAY_BODY_MAX) return null;
  let body: unknown;
  try { body = JSON.parse(m.body); } catch { return null; }
  if (!body || typeof body !== 'object' || Array.isArray(body)) return null;
  const out: FirstPartyBody = {};
  for (const [k, v] of Object.entries(body as Record<string, unknown>)) {
    if (typeof v === 'string' || typeof v === 'number' || typeof v === 'boolean') out[k] = v;
  }
  if (typeof out.evt !== 'string' || !RELAY_EVT_RE.test(out.evt)) return null;
  return out;
}
