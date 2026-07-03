import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { topByDifficulty, topByMission } from '@/lib/db';

export const runtime = 'nodejs';

// Never expose the raw session id to clients (it is the unauthenticated write
// key). Strip it from every row and replace it with an isMe flag computed
// against the caller's own cookie sid, so the UI can still highlight "you".
async function markMine<T extends { sid: string }>(
  rows: T[],
): Promise<Array<Omit<T, 'sid'> & { isMe: boolean }>> {
  const jar = await cookies();
  const me = jar.get('regatta_sid')?.value;
  return rows.map(({ sid, ...rest }) => ({ ...rest, isMe: !!me && sid === me }));
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
