import { NextResponse } from 'next/server';
import { logError, logWarn, logInfo } from '@/lib/log';

export const runtime = 'nodejs';

/**
 * Client-side error/event reporter.
 * POST body: { level: "error"|"warn"|"info", evt: string, ...any }
 * Fire-and-forget from the browser — should always return 204 even on malformed input
 * so it never breaks the user's session.
 */
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const level = body?.level === 'error' || body?.level === 'warn' ? body.level : 'info';
    const evt = typeof body?.evt === 'string' ? body.evt : 'client.unknown';
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
  } catch {
    // Swallow — never 500 to the client for a log report
  }
  return new NextResponse(null, { status: 204 });
}
