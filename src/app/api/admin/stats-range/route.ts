import { NextResponse } from 'next/server';
import { getMetricsRange } from '@/lib/db';
import { logError } from '@/lib/log';
import { requireAdmin } from '@/lib/admin-auth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Range-aware stats endpoint. Protected by proxy.ts Basic Auth because
 * it sits under /api/admin/*, and again by requireAdmin() in the handler.
 *
 * Query params:
 *   from - ISO-8601 timestamp (e.g. 2026-04-20T00:00:00Z), defaults to
 *          7 days ago if omitted
 *   to   - same, defaults to now
 *
 * The window is capped at MAX_RANGE_DAYS: a wider request keeps `to` and
 * moves `from` forward, so one dashboard call cannot scan the whole table.
 * The response's `range` shows the window actually used.
 *
 * Response: JSON of RangeMetrics shape (see src/lib/db.ts).
 *
 * Client auto-refreshes this every 15s when "live" toggle is on.
 */
const MAX_RANGE_DAYS = 90;
const MAX_RANGE_MS = MAX_RANGE_DAYS * 24 * 3600 * 1000;

export async function GET(req: Request) {
  const denied = requireAdmin(req);
  if (denied) return denied;

  try {
    const url = new URL(req.url);
    const now = Date.now();
    const fromStr = url.searchParams.get('from');
    const toStr = url.searchParams.get('to');
    const toMs = toStr ? Date.parse(toStr) : now;
    let fromMs = fromStr ? Date.parse(fromStr) : toMs - 7 * 24 * 3600 * 1000;
    if (!Number.isFinite(fromMs) || !Number.isFinite(toMs) || fromMs >= toMs) {
      return NextResponse.json({ error: 'Bad range' }, { status: 400 });
    }
    fromMs = Math.max(fromMs, toMs - MAX_RANGE_MS);
    const metrics = getMetricsRange(fromMs, toMs);
    return NextResponse.json(metrics, {
      headers: { 'Cache-Control': 'no-store' },
    });
  } catch (err) {
    logError('stats-range.exception', { err: err instanceof Error ? err.message : 'unknown' });
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
