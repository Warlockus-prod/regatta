import { NextResponse } from 'next/server';
import { logInfo, logError } from '@/lib/log';
import { insertFeedback } from '@/lib/db';
import { promises as fs } from 'fs';
import path from 'path';

export const runtime = 'nodejs';
export const maxDuration = 15;

/**
 * Feedback / bug report ingestion.
 * Writes structured JSON to stdout (captured by docker logs) AND appends to
 * /tmp/regatta-feedback.jsonl so reports don't scroll away in verbose logs.
 *
 * Screenshot uploads are not supported yet — they'll arrive as base64 in a
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

export async function POST(req: Request) {
  let body: FeedbackPayload;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  // Basic validation
  if (typeof body?.message !== 'string' || body.message.trim().length < 2) {
    return NextResponse.json({ error: 'Message too short' }, { status: 400 });
  }
  if (body.message.length > 4000) {
    return NextResponse.json({ error: 'Message too long' }, { status: 400 });
  }

  const record = {
    kind: body.kind === 'bug' ? 'bug' : 'feedback',
    category: body.category ?? 'other',
    message: body.message.trim(),
    expected: body.expected?.slice(0, 2000),
    actual: body.actual?.slice(0, 2000),
    contact: body.contact?.slice(0, 200),
    path: body.path?.slice(0, 200),
    section: body.section?.slice(0, 100),
    viewport: body.viewport,
    language: body.language,
    ua: body.ua?.slice(0, 300),
    appVersion: body.appVersion,
    releaseId: body.releaseId,
    ts: Date.now(),
    ip: req.headers.get('x-forwarded-for')?.split(',')[0] ?? 'unknown',
    uaHeader: req.headers.get('user-agent') ?? 'unknown',
  };

  logInfo('feedback.received', {
    kind: record.kind,
    category: record.category,
    path: record.path,
    messageLen: record.message.length,
  });

  // Append to a dedicated feedback log — survives log rotation better
  try {
    await fs.mkdir(path.dirname(FEEDBACK_PATH), { recursive: true });
    await fs.appendFile(FEEDBACK_PATH, JSON.stringify(record) + '\n', 'utf8');
  } catch (err) {
    logError('feedback.persist-failed', { err: err instanceof Error ? err.message : 'unknown' });
    // Still return ok — the log line above preserves the content in docker logs
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
