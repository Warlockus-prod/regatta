import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { insertRaceResult, getPlayer, insertEvent } from '@/lib/db';
import { logInfo, logWarn } from '@/lib/log';

export const runtime = 'nodejs';

interface Payload {
  difficulty: string;
  windStrength: string;
  missionId?: string | null;
  finishTimeSec: number;
  position?: number | null;
  totalBoats?: number | null;
  tacks?: number | null;
  noGoEntries?: number | null;
  topSpeed?: number | null;
  score?: number | null;
  nicknameFallback?: string;
}

export async function POST(req: Request) {
  const jar = await cookies();
  const sid = jar.get('regatta_sid')?.value;
  if (!sid) {
    logWarn('race-result.no-sid');
    return NextResponse.json({ error: 'No session cookie' }, { status: 400 });
  }

  let body: Payload;
  try { body = await req.json(); }
  catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }); }

  if (typeof body.finishTimeSec !== 'number' || !isFinite(body.finishTimeSec) || body.finishTimeSec <= 0) {
    return NextResponse.json({ error: 'finishTimeSec required' }, { status: 400 });
  }
  if (!['easy', 'medium', 'hard'].includes(body.difficulty)) {
    return NextResponse.json({ error: 'bad difficulty' }, { status: 400 });
  }
  if (!['light', 'medium', 'heavy'].includes(body.windStrength)) {
    return NextResponse.json({ error: 'bad windStrength' }, { status: 400 });
  }

  const player = getPlayer(sid);
  const nickname = player?.nickname || body.nicknameFallback?.trim().slice(0, 20);
  if (!nickname) {
    return NextResponse.json({ error: 'No nickname set; call /api/player first' }, { status: 400 });
  }

  const id = insertRaceResult({
    sid,
    nickname,
    difficulty: body.difficulty,
    windStrength: body.windStrength,
    missionId: body.missionId ?? null,
    finishTimeSec: body.finishTimeSec,
    position: body.position ?? null,
    totalBoats: body.totalBoats ?? null,
    tacks: body.tacks ?? null,
    noGoEntries: body.noGoEntries ?? null,
    topSpeed: body.topSpeed ?? null,
    score: body.score ?? null,
  });
  if (!id) {
    return NextResponse.json({ error: 'DB write failed' }, { status: 500 });
  }
  logInfo('race-result.saved', {
    sid: sid.slice(0, 8),
    time: body.finishTimeSec,
    mission: body.missionId ?? 'free',
  });

  // Custom event for /stats: race.finish with finish time + difficulty +
  // mission, sticky-attached to the same session as the page.view that
  // launched it. UA + ip captured server-side from headers so the recent
  // feed shows them.
  insertEvent({
    evt: 'race.finish',
    path: '/game',
    sessionId: sid,
    ua: req.headers.get('user-agent') ?? undefined,
    ip: req.headers.get('x-forwarded-for')?.split(',')[0] ?? undefined,
    meta: {
      finishTimeSec: body.finishTimeSec,
      difficulty: body.difficulty,
      windStrength: body.windStrength,
      missionId: body.missionId ?? null,
      position: body.position ?? null,
      totalBoats: body.totalBoats ?? null,
      tacks: body.tacks ?? null,
      score: body.score ?? null,
    },
  });

  return NextResponse.json({ ok: true, id });
}
