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
 * Event names: we store the raw evt in the DB (e.g. 'page.view') so
 * downstream code (visit_count increment, top-paths query) can key on
 * known names. The `client.` prefix is kept only in the server log
 * stream (logInfo/logWarn/logError) to help distinguish client-emitted
 * vs server-emitted events in a tail.
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

    // Persist to DB for /stats dashboard
    insertEvent({
      evt,
      path: typeof body.path === 'string' ? body.path : undefined,
      sessionId: sid ?? (typeof body.sessionId === 'string' ? body.sessionId : undefined),
      ua: fields.ua as string,
      ip: fields.ip as string,
      viewport: typeof body.viewport === 'string' ? body.viewport : undefined,
      language: typeof body.language === 'string' ? body.language : undefined,
      appVersion: typeof body.appVersion === 'string' ? body.appVersion : undefined,
      meta: body,
    });
  } catch {
    // Swallow - never 500 to the client for a log report
  }
  return new NextResponse(null, { status: 204 });
}
