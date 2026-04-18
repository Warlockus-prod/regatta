import { NextResponse } from 'next/server';
import { getReplay } from '@/lib/db';

export const runtime = 'nodejs';

export async function GET(_req: Request, ctx: { params: Promise<{ code: string }> }) {
  const { code } = await ctx.params;
  const clean = String(code || '').toUpperCase().replace(/[^A-Z2-9]/g, '').slice(0, 6);
  if (clean.length !== 6) {
    return NextResponse.json({ error: 'Bad code' }, { status: 400 });
  }
  const row = getReplay(clean);
  if (!row) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  return NextResponse.json({
    code: row.code,
    ts: row.ts,
    nickname: row.nickname,
    difficulty: row.difficulty,
    windStrength: row.wind_strength,
    missionId: row.mission_id,
    finishTimeSec: row.finish_time_sec,
    views: row.views,
    samples: JSON.parse(row.samples_json),
    events: JSON.parse(row.events_json),
    course: row.course_json ? JSON.parse(row.course_json) : null,
  });
}
