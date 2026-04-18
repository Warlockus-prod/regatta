import { NextResponse } from 'next/server';
import { getOrCreateDaily, getDailyLeaderboard } from '@/lib/db';

export const runtime = 'nodejs';

function todayUTC(): string {
  const now = new Date();
  return `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, '0')}-${String(now.getUTCDate()).padStart(2, '0')}`;
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const day = (url.searchParams.get('day') || todayUTC()).slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(day)) {
    return NextResponse.json({ error: 'bad day format' }, { status: 400 });
  }
  const ch = getOrCreateDaily(day);
  const top = getDailyLeaderboard(day, 10);
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
