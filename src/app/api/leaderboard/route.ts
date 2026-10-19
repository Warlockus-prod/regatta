import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { topByDifficulty, topByMission } from '@/lib/db';
import { publicRows } from '@/lib/race-submission';

export const runtime = 'nodejs';

// Never expose the raw session id to clients (see publicRows()).
async function markMine<T extends { sid: string }>(
  rows: T[],
): Promise<Array<Omit<T, 'sid'> & { isMe: boolean }>> {
  const jar = await cookies();
  return publicRows(rows, jar.get('regatta_sid')?.value);
}

/**
 * GET /api/leaderboard?difficulty=easy&wind=medium[&mission=sub-90]
 */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const mission = url.searchParams.get('mission');
  if (mission && (mission.length > 40 || !/^[a-z0-9_-]+$/i.test(mission))) {
    return NextResponse.json({ error: 'bad mission' }, { status: 400 });
  }
  if (mission) {
    const rows = await markMine(topByMission(mission, 20));
    return NextResponse.json({ rows, mode: 'mission', mission });
  }
  const difficulty = url.searchParams.get('difficulty') ?? 'medium';
  const wind = url.searchParams.get('wind') ?? 'medium';
  if (!['easy', 'medium', 'hard'].includes(difficulty)) {
    return NextResponse.json({ error: 'bad difficulty' }, { status: 400 });
  }
  if (!['light', 'medium', 'heavy'].includes(wind)) {
    return NextResponse.json({ error: 'bad wind' }, { status: 400 });
  }
  const rows = await markMine(topByDifficulty(difficulty, wind, 20));
  return NextResponse.json({ rows, mode: 'free', difficulty, wind });
}
