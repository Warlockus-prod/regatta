import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { isIP } from 'node:net';
import { logError, logWarn, logInfo } from '@/lib/log';
import { insertEvent } from '@/lib/db';
import { truncateIp } from '@/lib/net';
import { clientKeys, rateLimitClient } from '@/lib/rate-limit';
import { isBrowserNoise, isClientEvent, pickEventFields } from '@/lib/analytics-events';
import geoip from 'fast-geoip';

export const runtime = 'nodejs';

// Allow-list of body fields persisted into the event meta_json blob. The raw
// request body is attacker-controlled and unbounded, so we never store it
// wholesale. Anything not on this list is dropped. msg / src / line / col are
// what ClientErrorReporter sends for js.uncaught: WebKit stacks carry no
// message, so without msg an iOS WebView error was unreadable.
const META_ALLOW = [
  'path', 'evt', 'level', 'viewport', 'language', 'appVersion',
  'msSinceStart', 'utm_source', 'utm_medium', 'utm_campaign', 'referrer',
  'msOnPage', 'maxScrollPct', 'country', 'message', 'stack', 'reason',
  'msg', 'src', 'line', 'col',
] as const;

// One browser sends a page.view per navigation plus a few funnel and engagement
// events, far below this. The per-IP bucket allows IP_BUCKET_FACTOR (3) times
// more for shared networks. Over the limit the event is dropped, still with 204.
const LOG_LIMIT = 120;
const LOG_WINDOW_MS = 60_000;

// Automated browsers: HeadlessChrome (local scripts, crawlers) and our own
// Playwright runs, which add "RegattaE2E" to the user agent (playwright.config.ts).
const AUTOMATION_UA_RE = /HeadlessChrome|RegattaE2E/;

// fast-geoip returns null on ANY failure, including missing data files, so a
// broken install looks like "no country". The first lookup of each process
// checks a known address and warns once if the database does not answer.
const GEOIP_PROBE_IP = '8.8.8.8';
let geoipChecked = false;
async function checkGeoipOnce(): Promise<void> {
  if (geoipChecked) return;
  geoipChecked = true;
  try {
    const probe = await geoip.lookup(GEOIP_PROBE_IP);
    if (!probe?.country) logWarn('geoip.unavailable', { probe: GEOIP_PROBE_IP });
  } catch (err) {
    logWarn('geoip.unavailable', { err: err instanceof Error ? err.message : 'unknown' });
  }
}
const META_MAX_BYTES = 4096;
// A log report is a few hundred bytes. Anything far larger is abuse: refuse it
// before parsing so a 5 MB body (the nginx limit) never reaches the DB or logs.
const BODY_MAX_BYTES = 16 * 1024;
// Cap for the plain string columns (path, viewport, utm, referrer...).
const COLUMN_MAX = 256;

function str(v: unknown, max = COLUMN_MAX): string | undefined {
  return typeof v === 'string' ? v.slice(0, max) : undefined;
}

/**
 * Build a bounded meta object from the request body: keep only allow-listed
 * keys, then hard-cap the serialized size. If the trimmed object still
 * exceeds the byte budget we drop it entirely (null) rather than store a
 * truncated, invalid JSON fragment.
 */
function buildMeta(
  body: Record<string, unknown>,
  eventFields: Record<string, string | number | boolean> = {},
): Record<string, unknown> | undefined {
  // Funnel fields (exam score, lesson id, campaign token, embed/client) are
  // already validated per event by pickEventFields().
  const out: Record<string, unknown> = { ...eventFields };
  for (const key of META_ALLOW) {
    const v = body[key];
    if (v === undefined || v === null) continue;
    // Only primitives - never nested objects/arrays from the client.
    if (typeof v === 'string') out[key] = v.length > 512 ? v.slice(0, 512) : v;
    else if (typeof v === 'number' || typeof v === 'boolean') out[key] = v;
  }
  if (Object.keys(out).length === 0) return undefined;
  try {
    if (JSON.stringify(out).length > META_MAX_BYTES) return undefined;
  } catch {
    return undefined;
  }
  return out;
}

/**
 * Client-side error/event reporter.
 * POST body: { level: "error"|"warn"|"info", evt: string, ...any }
 * Fire-and-forget from the browser - should always return 204 even on
 * malformed input so it never breaks the user's session.
 *
 * Event names: only the allow-list in src/lib/analytics-events.ts is logged
 * and stored. Anything else (typos, forged server events like race.finish,
 * junk from scanners) is dropped silently, still with 204.
 *
 * Session ID: read from the `regatta_sid` cookie that proxy.ts sets on
 * every page visit. A body.sessionId is ignored: the client never sends one,
 * and accepting it let a script invent a new "visitor" per request.
 *
 * Abuse limits: 120 events per minute per session and 360 per IP
 * (rateLimitClient). Over the limit, from automated browsers, and for error
 * reports that come from browser extensions, nothing is logged or stored and
 * the answer is still 204. The funnel counts in /stats are client-reported
 * either way: these limits bound forgery, they do not prevent it.
 *
 * Country: read from proxy-injected headers (cf-ipcountry from Cloudflare,
 * x-vercel-ip-country from Vercel, x-country-code from a custom nginx
 * geoip2 rule). If no header is present (bare nginx reverse proxy with no
 * geoip module) we store NULL and fall back to a session-sticky value that
 * the client may have computed earlier. Ops note: wire up nginx's
 * `ngx_http_geoip2_module` to inject `X-Country-Code` to populate this
 * without code changes.
 *
 * UTM + referrer: parsed by the client on first page.view (see
 * GoogleAnalytics.tsx / pageview reporting) and forwarded in the body.
 * Sticky per session - first value wins (sessions.utm_* only updated via
 * COALESCE).
 *
 * ms_since_start: client-computed ms between sessionStorage-recorded
 * session first-seen and the current event. Useful for time-on-page
 * bucketing in the /stats dashboard.
 */
export async function POST(req: Request) {
  try {
    const declared = Number(req.headers.get('content-length') ?? 0);
    if (declared > BODY_MAX_BYTES) return new NextResponse(null, { status: 413 });
    const text = await req.text();
    if (text.length > BODY_MAX_BYTES) return new NextResponse(null, { status: 413 });
    const body = JSON.parse(text);
    if (!body || typeof body !== 'object' || Array.isArray(body)) {
      return new NextResponse(null, { status: 204 });
    }
    const level = body.level === 'error' || body.level === 'warn' ? body.level : 'info';
    const evt = body.evt;
    const jar = await cookies();
    const sid = jar.get('regatta_sid')?.value;
    if (!isClientEvent(evt)) return new NextResponse(null, { status: 204 });
    // Before any logging, lookup or insert: a flood costs one map lookup.
    if (!rateLimitClient(clientKeys(req, sid), 'log', LOG_LIMIT, LOG_WINDOW_MS).ok) {
      return new NextResponse(null, { status: 204 });
    }
    const ua = str(req.headers.get('user-agent'));
    if (ua && AUTOMATION_UA_RE.test(ua)) return new NextResponse(null, { status: 204 });
    if (evt.startsWith('js.') && isBrowserNoise(body)) return new NextResponse(null, { status: 204 });
    const eventFields = pickEventFields(evt, body);
    // IP detection - try multiple proxy headers in priority order:
    //   1. x-forwarded-for (first hop, the real client)
    //   2. x-real-ip (nginx convention)
    //   3. cf-connecting-ip (Cloudflare)
    //
    // Discard 127.0.0.1 / private-range values so we don't pollute the DB
    // when the proxy chain is mis-set. Production restores the client IP:
    // the nginx stream SNI router sends PROXY protocol to the :8443 vhost,
    // which trusts it only from loopback (verified 2026-10-18, see
    // src/lib/rate-limit.ts). The first hop read here is the client's claim,
    // fine for geo; limiters use the last hop via clientIpKey().
    const isUseful = (ip: string | null | undefined): ip is string =>
      !!ip
      && isIP(ip) !== 0
      && ip !== '127.0.0.1'
      && ip !== '::1'
      && !ip.startsWith('10.')
      && !ip.startsWith('192.168.')
      // 172.16.0.0/12 only: the old "172.1" prefix also dropped public 172.1.x.x.
      && !/^172\.(?:1[6-9]|2\d|3[01])\./.test(ip);
    const xff = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim();
    const xri = req.headers.get('x-real-ip')?.trim();
    const cfi = req.headers.get('cf-connecting-ip')?.trim();
    const rawIp =
      (isUseful(xff) ? xff : null) ??
      (isUseful(xri) ? xri : null) ??
      (isUseful(cfi) ? cfi : null) ??
      'unknown';
    // Mask the host part at ingest - no full client IP is ever stored or logged.
    // insertEvent() truncates again (storedIp in db.ts); this copy is for the
    // log line and the geo lookup.
    const detectedIp = rawIp === 'unknown' ? rawIp : truncateIp(rawIp);

    // Log only the allow-listed fields, never the raw body.
    const fields: Record<string, unknown> = {
      ...buildMeta(body, eventFields),
      ua: ua ?? 'unknown',
      ip: detectedIp,
    };
    delete fields.level;
    delete fields.evt;

    if (level === 'error') logError(`client.${evt}`, fields);
    else if (level === 'warn') logWarn(`client.${evt}`, fields);
    else logInfo(`client.${evt}`, fields);

    // Country detection - three-tier fallback:
    //   1. proxy-injected header (cf-ipcountry / x-vercel-ip-country /
    //      x-country-code from a geoip2-aware nginx)
    //   2. client-reported (rare; only set if a CDN or earlier endpoint
    //      surfaced it to JS)
    //   3. Node-side fast-geoip lookup against the truncated request IP
    //      (covers bare-VPS deploys with no proxy magic, like the current
    //      regatta box; /24 is enough for a country). fast-geoip lazy-loads
    //      its tiered chunks the first time it sees a new prefix, so the
    //      cold-start cost is bounded and amortised. It must stay in
    //      serverExternalPackages (next.config.ts): bundled, it cannot find
    //      its data files and every lookup returns null.
    const countryHeader =
      req.headers.get('cf-ipcountry') ||
      req.headers.get('x-vercel-ip-country') ||
      req.headers.get('x-country-code');
    let country: string | undefined =
      (typeof countryHeader === 'string' && countryHeader.length === 2 ? countryHeader.toUpperCase() : undefined) ??
      (typeof body.country === 'string' && body.country.length === 2 ? body.country.toUpperCase() : undefined);
    if (!country && detectedIp !== 'unknown') {
      await checkGeoipOnce();
      try {
        const lookup = await geoip.lookup(detectedIp);
        if (lookup?.country && lookup.country.length === 2) {
          country = lookup.country.toUpperCase();
        }
      } catch {
        // Non-fatal: country stays undefined. checkGeoipOnce() has already
        // warned if the database itself is broken.
      }
    }

    // Persist to DB for /stats dashboard
    insertEvent({
      evt,
      path: str(body.path),
      sessionId: sid,
      ua: fields.ua as string,
      ip: fields.ip as string,
      country: country ?? undefined,
      viewport: str(body.viewport, 32),
      language: str(body.language, 16),
      appVersion: str(body.appVersion, 32),
      msSinceStart: typeof body.msSinceStart === 'number' ? body.msSinceStart : undefined,
      utmSource: str(body.utm_source),
      utmMedium: str(body.utm_medium),
      utmCampaign: str(body.utm_campaign),
      referrer: str(body.referrer, 512),
      meta: buildMeta(body, eventFields),
    });
  } catch {
    // Swallow - never 500 to the client for a log report
  }
  return new NextResponse(null, { status: 204 });
}
