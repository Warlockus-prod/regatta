import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getOrCreateDaily, getDailyLeaderboard } from '@/lib/db';
import { publicRows } from '@/lib/race-submission';

export const runtime = 'nodejs';

const DAY_MS = 24 * 60 * 60 * 1000;

function todayUTC(): string {
  return new Date().toISOString().slice(0, 10);
}

/** Midnight UTC of a `YYYY-MM-DD` that is a real calendar day, else null (2026-13-45). */
function parseDay(raw: string): number | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(raw)) return null;
  const ms = Date.parse(raw + 'T00:00:00Z');
  if (!Number.isFinite(ms) || new Date(ms).toISOString().slice(0, 10) !== raw) return null;
  return ms;
}

/**
 * GET /api/daily[?day=YYYY-MM-DD] - the daily challenge and its top 10.
 *
 * A GET used to insert a challenge row for any date string. Rows are now
 * created only for today plus or minus one day (client and server clocks
 * straddle midnight UTC); any other real day answers 404 and a malformed or
 * impossible date 400, both without touching the table. Rows never carry the
 * raw sid (see publicRows()).
 */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const today = todayUTC();
  const day = url.searchParams.get('day') ?? today;
  const dayMs = parseDay(day);
  if (dayMs === null) {
    return NextResponse.json({ error: 'bad day format' }, { status: 400 });
  }
  const offsetDays = Math.round((dayMs - Date.parse(today + 'T00:00:00Z')) / DAY_MS);
  if (Math.abs(offsetDays) > 1) {
    // Older challenges are not served: reading one without creating it needs
    // a read-only lookup in db.ts, and no client asks for them.
    return NextResponse.json({ error: 'no daily challenge for that day' }, { status: 404 });
  }
  const ch = getOrCreateDaily(day);
  const jar = await cookies();
  const top = publicRows(getDailyLeaderboard(day, 10), jar.get('regatta_sid')?.value);
  return NextResponse.json({
    day,
    challenge: {
      seed: ch.seed,
      difficulty: ch.difficulty,
      windStrength: ch.wind_strength,
      missionId: ch.mission_id,
    },
    top,
  });
}
