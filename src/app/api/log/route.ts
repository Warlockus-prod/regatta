import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { logError, logWarn, logInfo } from '@/lib/log';
import { insertEvent } from '@/lib/db';
import geoip from 'fast-geoip';

export const runtime = 'nodejs';

/**
 * Truncate a client IP before it ever touches storage / logs, for privacy.
 *   - IPv4: zero the last octet      1.2.3.4        -> 1.2.3.0
 *   - IPv6: keep the first 3 hextets 2001:db8:1:2:: -> 2001:db8:1::
 * Country detection relies on CF/Vercel headers (and a /24-accurate geoip
 * fallback), so masking the host part does not affect country granularity
 * but does prevent /stats from surfacing per-visitor IPs.
 */
function truncateIp(ip: string): string {
  if (!ip || ip === 'unknown') return ip;
  if (ip.includes('.') && !ip.includes(':')) {
    // IPv4
    const parts = ip.split('.');
    if (parts.length === 4) return `${parts[0]}.${parts[1]}.${parts[2]}.0`;
    return ip;
  }
  if (ip.includes(':')) {
    // IPv6 - keep first 3 hextets, collapse the rest with ::
    const hextets = ip.split(':').filter((h) => h.length > 0);
    if (hextets.length >= 3) return `${hextets[0]}:${hextets[1]}:${hextets[2]}::`;
    return ip;
  }
  return ip;
}

// Allow-list of body fields persisted into the event meta_json blob. The raw
// request body is attacker-controlled and unbounded, so we never store it
// wholesale. Anything not on this list is dropped.
const META_ALLOW = [
  'path', 'evt', 'level', 'sessionId', 'viewport', 'language', 'appVersion',
  'msSinceStart', 'utm_source', 'utm_medium', 'utm_campaign', 'referrer',
  'msOnPage', 'maxScrollPct', 'country', 'message', 'stack', 'reason',
] as const;
const META_MAX_BYTES = 4096;

/**
 * Build a bounded meta object from the request body: keep only allow-listed
 * keys, then hard-cap the serialized size. If the trimmed object still
 * exceeds the byte budget we drop it entirely (null) rather than store a
 * truncated, invalid JSON fragment.
 */
function buildMeta(body: Record<string, unknown>): Record<string, unknown> | undefined {
  const out: Record<string, unknown> = {};
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
 * Session ID: read from the `regatta_sid` cookie that proxy.ts sets on
 * every page visit. Previously we looked at body.sessionId which the
 * client never sent - so every event landed with session_id = NULL and
 * the sessions table stayed empty.
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
    const body = await req.json();
    const level = body?.level === 'error' || body?.level === 'warn' ? body.level : 'info';
    const evt = typeof body?.evt === 'string' ? body.evt : 'unknown';
    // IP detection - try multiple proxy headers in priority order:
    //   1. x-forwarded-for (first hop, the real client)
    //   2. x-real-ip (nginx convention)
    //   3. cf-connecting-ip (Cloudflare)
    //
    // Discard 127.0.0.1 / private-range values so we don't pollute the DB
    // when the proxy chain is mis-set. Current production has nginx stream
    // SNI routing that loses the client IP - until that's fixed (or
    // Cloudflare is added in front), all values land NULL here. fast-geoip
    // then no-ops gracefully and the /stats Countries panel renders the
    // friendly EmptyHint.
    const isUseful = (ip: string | null | undefined) =>
      !!ip
      && ip !== 'unknown'
      && ip !== '127.0.0.1'
      && ip !== '::1'
      && !ip.startsWith('10.')
      && !ip.startsWith('192.168.')
      && !ip.startsWith('172.1')
      && !ip.startsWith('172.2')
      && !ip.startsWith('172.3');
    const xff = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim();
    const xri = req.headers.get('x-real-ip')?.trim();
    const cfi = req.headers.get('cf-connecting-ip')?.trim();
    const rawIp =
      (isUseful(xff) ? xff : null) ??
      (isUseful(xri) ? xri : null) ??
      (isUseful(cfi) ? cfi : null) ??
      'unknown';
    // Mask the host part at ingest - no full client IP is ever stored or logged.
    const detectedIp = truncateIp(rawIp);

    const fields = {
      ...body,
      ua: req.headers.get('user-agent') ?? 'unknown',
      ip: detectedIp,
    };
    delete fields.level;
    delete fields.evt;

    if (level === 'error') logError(`client.${evt}`, fields);
    else if (level === 'warn') logWarn(`client.${evt}`, fields);
    else logInfo(`client.${evt}`, fields);

    // Session id from cookie takes precedence over anything in the body.
    const jar = await cookies();
    const sid = jar.get('regatta_sid')?.value;

    // Country detection - three-tier fallback:
    //   1. proxy-injected header (cf-ipcountry / x-vercel-ip-country /
    //      x-country-code from a geoip2-aware nginx)
    //   2. client-reported (rare; only set if a CDN or earlier endpoint
    //      surfaced it to JS)
    //   3. Node-side fast-geoip lookup against the request IP (covers
    //      bare-VPS deploys with no proxy magic, like the current
    //      regatta box). fast-geoip lazy-loads its tiered chunks the
    //      first time it sees a new prefix, so the cold-start cost is
    //      bounded and amortised.
    const countryHeader =
      req.headers.get('cf-ipcountry') ||
      req.headers.get('x-vercel-ip-country') ||
      req.headers.get('x-country-code');
    let country: string | undefined =
      (typeof countryHeader === 'string' && countryHeader.length === 2 ? countryHeader.toUpperCase() : undefined) ??
      (typeof body.country === 'string' && body.country.length === 2 ? body.country.toUpperCase() : undefined);
    if (!country && fields.ip && fields.ip !== 'unknown') {
      try {
        const lookup = await geoip.lookup(fields.ip as string);
        if (lookup?.country && lookup.country.length === 2) {
          country = lookup.country.toUpperCase();
        }
      } catch {
        // fast-geoip failures are non-fatal - fall through with country
        // staying undefined.
      }
    }

    // Persist to DB for /stats dashboard
    insertEvent({
      evt,
      path: typeof body.path === 'string' ? body.path : undefined,
      sessionId: sid ?? (typeof body.sessionId === 'string' ? body.sessionId : undefined),
      ua: fields.ua as string,
      ip: fields.ip as string,
      country: country ?? undefined,
      viewport: typeof body.viewport === 'string' ? body.viewport : undefined,
      language: typeof body.language === 'string' ? body.language : undefined,
      appVersion: typeof body.appVersion === 'string' ? body.appVersion : undefined,
      msSinceStart: typeof body.msSinceStart === 'number' ? body.msSinceStart : undefined,
      utmSource: typeof body.utm_source === 'string' ? body.utm_source : undefined,
      utmMedium: typeof body.utm_medium === 'string' ? body.utm_medium : undefined,
      utmCampaign: typeof body.utm_campaign === 'string' ? body.utm_campaign : undefined,
      referrer: typeof body.referrer === 'string' ? body.referrer : undefined,
      meta: buildMeta(body),
    });
  } catch {
    // Swallow - never 500 to the client for a log report
  }
  return new NextResponse(null, { status: 204 });
}
