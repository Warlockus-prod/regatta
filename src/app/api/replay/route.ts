import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { insertReplay, getPlayer } from '@/lib/db';
import { logInfo, logWarn } from '@/lib/log';
import { rateLimitClient, rateLimitGlobal, clientKeys } from '@/lib/rate-limit';
import { isPlausibleFinishSec, parseMissionId, sanitizeNickname } from '@/lib/race-submission';
import { defaultReplayCourse, replayCourse, replayMetadata, replaySamples } from '@/lib/race-replay';

export const runtime = 'nodejs';

// 30 replay uploads / hour / session (x3 per IP), and at most 300 an hour
// site-wide: every replay is a row on the SQLite disk vps2 shares with other
// products, and replays are never pruned.
const REPLAY_LIMIT = 30;
const REPLAY_WINDOW_MS = 60 * 60 * 1000;
const REPLAY_GLOBAL_LIMIT = 300;

// Size caps count UTF-8 BYTES (what lands on disk), not UTF-16 characters: a
// string of 3-byte characters used to store three times the cap.
const MAX_BODY_BYTES = 1_000_000;
const MAX_SAMPLES_BYTES = 600_000;   // a full 5000-sample race is ~400 KB
const MAX_EVENTS_BYTES = 100_000;    // real races: a few KB (prod max ~1.6 KB)
const MAX_COURSE_BYTES = 16_000;     // the standard course with 7-language labels is ~1.5 KB
const MAX_SAMPLES = 5000;
const MAX_EVENTS = 2000;

const MAX_RACE_SEC = 24 * 60 * 60;

interface Payload {
  difficulty: string;
  windStrength: string;
  missionId?: string | null;
  finishTimeSec?: number | null;
  samples: unknown;
  events: unknown;
  course?: unknown;
  nicknameFallback?: string;
  mode?: "simple" | "pro";
  penaltySeconds?: number;
}

interface ReplayEvent { type: string; t: number; note?: string }

function bytes(v: unknown): number {
  return Buffer.byteLength(JSON.stringify(v) ?? '', 'utf8');
}

/** Events keep a slug `type`, a finite `t` and an optional slug `note`. */
function rebuildEvents(raw: unknown[]): ReplayEvent[] {
  const out: ReplayEvent[] = [];
  for (const item of raw) {
    if (!item || typeof item !== 'object') continue;
    const r = item as Record<string, unknown>;
    const t = typeof r.t === 'number' && Number.isFinite(r.t) && r.t >= 0 && r.t <= MAX_RACE_SEC ? r.t : null;
    const type = typeof r.type === 'string' ? r.type.replace(/[^a-z-]/gi, '').slice(0, 24) : '';
    if (t === null || !type) continue;
    const note = typeof r.note === 'string' ? r.note.replace(/[^a-z0-9-]/gi, '').slice(0, 40) : '';
    out.push(note ? { type, t, note } : { type, t });
  }
  return out;
}

export async function POST(req: Request) {
  const jar = await cookies();
  const sid = jar.get('regatta_sid')?.value ?? null;
  // Per-session and per-IP first: every attempt counts, so one client cannot
  // hammer the route. The site-wide budget is charged only after validation
  // (below), so a stream of junk bodies cannot lock out everyone else.
  const rl = rateLimitClient(clientKeys(req, sid), 'replay', REPLAY_LIMIT, REPLAY_WINDOW_MS);
  if (!rl.ok) {
    logWarn('replay.rate-limited', { by: rl.rejectedBy });
    return NextResponse.json({ error: 'Too many replays, wait' }, { status: 429 });
  }

  // Cheap gate before buffering, then the real byte count of what arrived.
  if (Number(req.headers.get('content-length') ?? 0) > MAX_BODY_BYTES) {
    return NextResponse.json({ error: 'Replay payload too large' }, { status: 413 });
  }
  let text: string;
  try { text = await req.text(); }
  catch { return NextResponse.json({ error: 'Invalid body' }, { status: 400 }); }
  if (Buffer.byteLength(text, 'utf8') > MAX_BODY_BYTES) {
    return NextResponse.json({ error: 'Replay payload too large' }, { status: 413 });
  }
  let body: Payload;
  try { body = JSON.parse(text); }
  catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }); }
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  // Basic validation
  if (!Array.isArray(body.samples) || !Array.isArray(body.events)) {
    return NextResponse.json({ error: 'Bad samples/events' }, { status: 400 });
  }
  if (body.samples.length > MAX_SAMPLES) {
    return NextResponse.json({ error: 'Race too long' }, { status: 400 });
  }
  if (bytes(body.samples) > MAX_SAMPLES_BYTES) {
    return NextResponse.json({ error: 'Replay payload too large' }, { status: 400 });
  }
  if (body.events.length > MAX_EVENTS) {
    return NextResponse.json({ error: 'Too many events' }, { status: 400 });
  }
  if (bytes(body.events) > MAX_EVENTS_BYTES) {
    return NextResponse.json({ error: 'Events payload too large' }, { status: 400 });
  }
  const samples = replaySamples(body.samples);
  if (!samples || samples.length < 3) {
    return NextResponse.json({ error: 'Race too short to share' }, { status: 400 });
  }
  const events = rebuildEvents(body.events);
  const missionId = parseMissionId(body.missionId);
  if (missionId === 'invalid') {
    return NextResponse.json({ error: 'Bad missionId' }, { status: 400 });
  }
  if (body.course != null && bytes(body.course) > MAX_COURSE_BYTES) {
    return NextResponse.json({ error: 'Course payload too large' }, { status: 400 });
  }
  const metadata = replayMetadata(body);
  if (!metadata) return NextResponse.json({ error: 'Bad replay metadata' }, { status: 400 });
  const course = body.course == null ? null : replayCourse(body.course);
  if (body.course != null && !course) return NextResponse.json({ error: 'Bad course' }, { status: 400 });
  if (!['easy', 'medium', 'hard'].includes(body.difficulty)) {
    return NextResponse.json({ error: 'Bad difficulty' }, { status: 400 });
  }
  if (!['light', 'medium', 'heavy'].includes(body.windStrength)) {
    return NextResponse.json({ error: 'Bad windStrength' }, { status: 400 });
  }

  const player = sid ? getPlayer(sid) : null;
  const nickname = player?.nickname || sanitizeNickname(body.nicknameFallback);

  const site = rateLimitGlobal('replay', REPLAY_GLOBAL_LIMIT, REPLAY_WINDOW_MS);
  if (!site.ok) {
    logWarn('replay.rate-limited', { by: 'global' });
    return NextResponse.json({ error: 'Too many replays, wait' }, { status: 429 });
  }

  const code = insertReplay({
    sid,
    nickname,
    difficulty: body.difficulty,
    windStrength: body.windStrength,
    missionId,
    // An unfinished race is still shareable; an implausible time is dropped.
    finishTimeSec: isPlausibleFinishSec(body.finishTimeSec) ? body.finishTimeSec : null,
    samples,
    events,
    // Metadata shares the existing bounded JSON column, preserving old rows.
    course: body.mode !== undefined || body.penaltySeconds !== undefined
      ? { ...(course ?? defaultReplayCourse()), replayMetadata: metadata } : course,
  });
  if (!code) return NextResponse.json({ error: 'DB write failed' }, { status: 500 });

  logInfo('replay.saved', { code, sid: sid?.slice(0, 8), samples: samples.length });
  return NextResponse.json({ ok: true, code });
}
