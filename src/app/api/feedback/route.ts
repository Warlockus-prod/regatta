import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { logInfo, logError, logWarn } from '@/lib/log';
import { insertFeedback } from '@/lib/db';
import { rateLimitClient, clientKeys } from '@/lib/rate-limit';
import { truncateIp, clientIp } from '@/lib/net';
import { promises as fs } from 'fs';
import path from 'path';

export const runtime = 'nodejs';
export const maxDuration = 15;

const FEEDBACK_LIMIT = 10;
const FEEDBACK_WINDOW_MS = 60 * 60 * 1000;

/**
 * Feedback / bug report ingestion.
 * Writes structured JSON to stdout (captured by docker logs) AND appends to
 * /tmp/regatta-feedback.jsonl so reports don't scroll away in verbose logs.
 *
 * Screenshot uploads are not supported yet - they'll arrive as base64 in a
 * later iteration behind a feature flag.
 */

interface FeedbackPayload {
  kind: 'feedback' | 'bug';
  category?: 'useful' | 'unclear' | 'idea' | 'other';
  message: string;
  expected?: string;      // only bug
  actual?: string;        // only bug
  contact?: string;       // optional email or tg
  path: string;
  section?: string;
  viewport?: string;
  language?: string;
  ua?: string;
  appVersion?: string;
  releaseId?: string;
  ts?: number;
}

const FEEDBACK_PATH = '/tmp/regatta-feedback.jsonl';

const CATEGORIES = new Set(['useful', 'unclear', 'idea', 'other']);

/** An optional client string clipped to `max`; anything else (number, array, object) is dropped. */
function str(v: unknown, max: number): string | undefined {
  return typeof v === 'string' ? v.slice(0, max) : undefined;
}

export async function POST(req: Request) {
  const jar = await cookies();
  const sid = jar.get('regatta_sid')?.value;
  const rl = rateLimitClient(clientKeys(req, sid), 'fb', FEEDBACK_LIMIT, FEEDBACK_WINDOW_MS);
  if (!rl.ok) {
    logWarn('feedback.rate-limited', { resetMs: rl.resetMs, by: rl.rejectedBy });
    return NextResponse.json({ error: 'Слишком много отзывов за последний час / Too much feedback in the last hour' }, { status: 429 });
  }

  let parsed: unknown;
  try {
    parsed = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }
  // Every field below is read through str() or an allow-list: the body is
  // client JSON, and a number or an array where a string belongs used to
  // throw (a 500) or be silently refused by SQLite.
  const body = parsed as Partial<Record<keyof FeedbackPayload, unknown>>;

  // Basic validation
  if (typeof body.message !== 'string' || body.message.trim().length < 2) {
    return NextResponse.json({ error: 'Message too short' }, { status: 400 });
  }
  if (body.message.length > 4000) {
    return NextResponse.json({ error: 'Message too long' }, { status: 400 });
  }

  const record = {
    kind: body.kind === 'bug' ? 'bug' : 'feedback',
    category: typeof body.category === 'string' && CATEGORIES.has(body.category) ? body.category : 'other',
    message: body.message.trim(),
    expected: str(body.expected, 2000),
    actual: str(body.actual, 2000),
    contact: str(body.contact, 200),
    path: str(body.path, 200),
    section: str(body.section, 100),
    viewport: str(body.viewport, 20),
    language: str(body.language, 8),
    ua: str(body.ua, 300),
    appVersion: str(body.appVersion, 32),
    releaseId: str(body.releaseId, 64),
    ts: Date.now(),
    ip: truncateIp(clientIp(req)),
    uaHeader: (req.headers.get('user-agent') ?? 'unknown').slice(0, 300),
  };

  logInfo('feedback.received', {
    kind: record.kind,
    category: record.category,
    path: record.path,
    messageLen: record.message.length,
  });

  // Append to a dedicated feedback log - survives log rotation better
  try {
    await fs.mkdir(path.dirname(FEEDBACK_PATH), { recursive: true });
    await fs.appendFile(FEEDBACK_PATH, JSON.stringify(record) + '\n', 'utf8');
  } catch (err) {
    logError('feedback.persist-failed', { err: err instanceof Error ? err.message : 'unknown' });
    // Still return ok - the log line above preserves the content in docker logs
  }

  // Also persist to SQLite for /stats admin
  insertFeedback({
    kind: record.kind as 'feedback' | 'bug',
    category: record.category,
    message: record.message,
    expected: record.expected,
    actual: record.actual,
    contact: record.contact,
    path: record.path,
    viewport: record.viewport,
    language: record.language,
    ua: record.ua,
    ip: record.ip,
  });

  return NextResponse.json({ ok: true });
}
