import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { insertReplay, getPlayer } from '@/lib/db';
import { logInfo, logWarn } from '@/lib/log';
import { rateLimit } from '@/lib/rate-limit';

export const runtime = 'nodejs';

// 30 replay uploads / hour / session
const REPLAY_LIMIT = 30;
const REPLAY_WINDOW_MS = 60 * 60 * 1000;

interface Payload {
  difficulty: string;
  windStrength: string;
  missionId?: string | null;
  finishTimeSec?: number | null;
  samples: unknown;
  events: unknown;
  course?: unknown;
  nicknameFallback?: string;
}

export async function POST(req: Request) {
  const jar = await cookies();
  const sid = jar.get('regatta_sid')?.value ?? null;
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0] ?? 'ip:unknown';
  const rl = rateLimit('replay:' + (sid ?? ip), REPLAY_LIMIT, REPLAY_WINDOW_MS);
  if (!rl.ok) {
    return NextResponse.json({ error: 'Too many replays, wait' }, { status: 429 });
  }

  let body: Payload;
  try { body = await req.json(); }
  catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }); }

  // Basic validation
  if (!Array.isArray(body.samples) || !Array.isArray(body.events)) {
    return NextResponse.json({ error: 'Bad samples/events' }, { status: 400 });
  }
  if (body.samples.length < 3) {
    return NextResponse.json({ error: 'Race too short to share' }, { status: 400 });
  }
  if (body.samples.length > 5000) {
    return NextResponse.json({ error: 'Race too long' }, { status: 400 });
  }
  if (!['easy', 'medium', 'hard'].includes(body.difficulty)) {
    return NextResponse.json({ error: 'Bad difficulty' }, { status: 400 });
  }
  if (!['light', 'medium', 'heavy'].includes(body.windStrength)) {
    return NextResponse.json({ error: 'Bad windStrength' }, { status: 400 });
  }

  const player = sid ? getPlayer(sid) : null;
  const nickname = player?.nickname || body.nicknameFallback?.slice(0, 20) || null;

  const code = insertReplay({
    sid,
    nickname,
    difficulty: body.difficulty,
    windStrength: body.windStrength,
    missionId: body.missionId ?? null,
    finishTimeSec: typeof body.finishTimeSec === 'number' && isFinite(body.finishTimeSec) ? body.finishTimeSec : null,
    samples: body.samples,
    events: body.events,
    course: body.course ?? null,
  });
  if (!code) return NextResponse.json({ error: 'DB write failed' }, { status: 500 });

  logInfo('replay.saved', { code, sid: sid?.slice(0, 8), samples: Array.isArray(body.samples) ? body.samples.length : -1 });
  return NextResponse.json({ ok: true, code });
}
