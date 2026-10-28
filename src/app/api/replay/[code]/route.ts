import { NextResponse } from 'next/server';
import { getReplay } from '@/lib/db';
import { readReplayRecordContext, replayRecordMetadata } from '@/lib/race-replay';
import { matchesPhysicalRaceCourse } from '@/lib/race-courses';
import { physicalRaceSamplesValid } from '@/lib/physical-race-record';

export const runtime = 'nodejs';

export async function GET(_req: Request, ctx: { params: Promise<{ code: string }> }) {
  const { code } = await ctx.params;
  const clean = String(code || '').toUpperCase().replace(/[^A-Z2-9]/g, '').slice(0, 6);
  if (clean.length !== 6) {
    return NextResponse.json({ error: 'Bad code' }, { status: 400 });
  }
  const row = getReplay(clean);
  if (!row) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  const course = row.course_json ? JSON.parse(row.course_json) : null;
  const context = readReplayRecordContext({ course });
  if (!context.ok) return NextResponse.json({ error: "Unsupported replay context" }, { status: 422 });
  const parsedMetadata = replayRecordMetadata({ course });
  const samples = JSON.parse(row.samples_json);
  if (context.context.model === "physical-cruiser-v1" && (!parsedMetadata
    || !matchesPhysicalRaceCourse(context.context, course)
    || !physicalRaceSamplesValid(samples, context.context, row.finish_time_sec ?? undefined))) {
    return NextResponse.json({ error: "Unsupported physical replay" }, { status: 422 });
  }
  const metadata = parsedMetadata ?? replayRecordMetadata({})!;

  return NextResponse.json({
    code: row.code,
    ts: row.ts,
    nickname: row.nickname,
    difficulty: row.difficulty,
    windStrength: row.wind_strength,
    missionId: row.mission_id,
    finishTimeSec: row.finish_time_sec,
    views: row.views,
    samples,
    events: JSON.parse(row.events_json),
    course,
    mode: metadata.mode,
    penaltySeconds: metadata.penaltySeconds,
    ...(metadata.raceContext !== undefined ? { raceContext: metadata.raceContext } : {}),
  });
}
