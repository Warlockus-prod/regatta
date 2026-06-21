import { NextResponse } from 'next/server';
import { getMetricsRange } from '@/lib/db';
import { logError } from '@/lib/log';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Range-aware stats endpoint. Protected by proxy.ts Basic Auth because
 * it sits under /api/admin/*.
 *
 * Query params:
 *   from - ISO-8601 timestamp (e.g. 2026-04-20T00:00:00Z), defaults to
 *          7 days ago if omitted
 *   to   - same, defaults to now
 *
 * Response: JSON of RangeMetrics shape (see src/lib/db.ts).
 *
 * Client auto-refreshes this every 15s when "live" toggle is on.
 */
export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const now = Date.now();
    const fromStr = url.searchParams.get('from');
    const toStr = url.searchParams.get('to');
    const fromMs = fromStr ? Date.parse(fromStr) : now - 7 * 24 * 3600 * 1000;
    const toMs = toStr ? Date.parse(toStr) : now;
    if (!Number.isFinite(fromMs) || !Number.isFinite(toMs) || fromMs >= toMs) {
      return NextResponse.json({ error: 'Bad range' }, { status: 400 });
    }
    const metrics = getMetricsRange(fromMs, toMs);
    return NextResponse.json(metrics, {
      headers: { 'Cache-Control': 'no-store' },
    });
  } catch (err) {
    logError('stats-range.exception', { err: err instanceof Error ? err.message : 'unknown' });
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
