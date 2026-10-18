import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { insertReplay, getPlayer } from '@/lib/db';
import { logInfo, logWarn } from '@/lib/log';
import { rateLimitClient, clientKeys } from '@/lib/rate-limit';
import { isPlausibleFinishSec, parseMissionId, sanitizeNickname } from '@/lib/race-submission';

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
  const rl = rateLimitClient(clientKeys(req, sid), 'replay', REPLAY_LIMIT, REPLAY_WINDOW_MS);
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
  // Length alone does not bound size: a few fat sample objects or a huge course
  // blob can still bloat the DB. Cap the serialized payload. ~600KB covers a
  // full 5000-sample race comfortably; the course blob is small by nature.
  if (JSON.stringify(body.samples).length > 600000) {
    return NextResponse.json({ error: 'Replay payload too large' }, { status: 400 });
  }
  if (body.events.length > 2000) {
    return NextResponse.json({ error: 'Too many events' }, { status: 400 });
  }
  // Same reasoning for events: a few huge event objects stay under the count
  // cap. Real races serialize to a few KB (prod max ~1.6KB on 2026-10-18).
  if (JSON.stringify(body.events).length > 100000) {
    return NextResponse.json({ error: 'Events payload too large' }, { status: 400 });
  }
  const missionId = parseMissionId(body.missionId);
  if (missionId === 'invalid') {
    return NextResponse.json({ error: 'Bad missionId' }, { status: 400 });
  }
  if (body.course != null && JSON.stringify(body.course).length > 50000) {
    return NextResponse.json({ error: 'Course payload too large' }, { status: 400 });
  }
  if (!['easy', 'medium', 'hard'].includes(body.difficulty)) {
    return NextResponse.json({ error: 'Bad difficulty' }, { status: 400 });
  }
  if (!['light', 'medium', 'heavy'].includes(body.windStrength)) {
    return NextResponse.json({ error: 'Bad windStrength' }, { status: 400 });
  }

  const player = sid ? getPlayer(sid) : null;
  const nickname = player?.nickname || sanitizeNickname(body.nicknameFallback);

  const code = insertReplay({
    sid,
    nickname,
    difficulty: body.difficulty,
    windStrength: body.windStrength,
    missionId,
    // An unfinished race is still shareable; an implausible time is dropped.
    finishTimeSec: isPlausibleFinishSec(body.finishTimeSec) ? body.finishTimeSec : null,
    samples: body.samples,
    events: body.events,
    course: body.course ?? null,
  });
  if (!code) return NextResponse.json({ error: 'DB write failed' }, { status: 500 });

  logInfo('replay.saved', { code, sid: sid?.slice(0, 8), samples: Array.isArray(body.samples) ? body.samples.length : -1 });
  return NextResponse.json({ ok: true, code });
}
