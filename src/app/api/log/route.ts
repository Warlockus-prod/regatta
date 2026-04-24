import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { logError, logWarn, logInfo } from '@/lib/log';
import { insertEvent } from '@/lib/db';

export const runtime = 'nodejs';

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
    const fields = {
      ...body,
      ua: req.headers.get('user-agent') ?? 'unknown',
      ip: req.headers.get('x-forwarded-for')?.split(',')[0] ?? 'unknown',
    };
    delete fields.level;
    delete fields.evt;

    if (level === 'error') logError(`client.${evt}`, fields);
    else if (level === 'warn') logWarn(`client.${evt}`, fields);
    else logInfo(`client.${evt}`, fields);

    // Session id from cookie takes precedence over anything in the body.
    const jar = await cookies();
    const sid = jar.get('regatta_sid')?.value;

    // Country: prefer proxy-injected header, fall back to client-reported
    // value (e.g. set via CloudFront or an earlier ip-api lookup).
    const countryHeader =
      req.headers.get('cf-ipcountry') ||
      req.headers.get('x-vercel-ip-country') ||
      req.headers.get('x-country-code');
    const country =
      (typeof countryHeader === 'string' && countryHeader.length === 2 ? countryHeader.toUpperCase() : null) ||
      (typeof body.country === 'string' && body.country.length === 2 ? body.country.toUpperCase() : undefined);

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
      meta: body,
    });
  } catch {
    // Swallow - never 500 to the client for a log report
  }
  return new NextResponse(null, { status: 204 });
}
