import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { upsertPlayer, getPlayer } from '@/lib/db';
import { logInfo, logWarn } from '@/lib/log';
import { rateLimitClient, clientKeys } from '@/lib/rate-limit';
import { NICKNAME_MAX, NICKNAME_MIN, sanitizeNickname } from '@/lib/race-submission';

export const runtime = 'nodejs';

/**
 * GET  /api/player  -> { sid, nickname }  (nickname may be null)
 * POST /api/player  { nickname }  -> saves/updates nickname for the session
 *
 * The players table is never pruned, so a POST only writes for a session id
 * that proxy.ts could have issued (crypto.randomUUID(), 36 characters) and at
 * most 20 times an hour per session (x3 per IP): a hand-made cookie used to
 * store a row per request, 2000-character keys included.
 */

const PLAYER_LIMIT = 20;
const PLAYER_WINDOW_MS = 60 * 60 * 1000;
const SESSION_UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

async function sid(): Promise<string | null> {
  const jar = await cookies();
  return jar.get('regatta_sid')?.value ?? null;
}

export async function GET() {
  const s = await sid();
  if (!s) return NextResponse.json({ sid: null, nickname: null });
  const p = getPlayer(s);
  return NextResponse.json({ sid: s, nickname: p?.nickname ?? null });
}

export async function POST(req: Request) {
  const s = await sid();
  if (!s) {
    logWarn('player.no-sid');
    return NextResponse.json({ error: 'No session cookie' }, { status: 400 });
  }
  if (!SESSION_UUID.test(s)) {
    logWarn('player.bad-sid', { len: s.length });
    return NextResponse.json({ error: 'Bad session cookie' }, { status: 400 });
  }
  const rl = rateLimitClient(clientKeys(req, s), 'player', PLAYER_LIMIT, PLAYER_WINDOW_MS);
  if (!rl.ok) {
    logWarn('player.rate-limited', { by: rl.rejectedBy });
    return NextResponse.json({ error: 'Too many nickname changes, wait' }, { status: 429 });
  }
  let body: { nickname?: unknown };
  try { body = await req.json(); }
  catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }); }
  if (!body || typeof body !== 'object') {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const raw = typeof body.nickname === 'string' ? body.nickname.trim() : '';
  if (raw.length < NICKNAME_MIN || raw.length > NICKNAME_MAX) {
    return NextResponse.json({ error: 'Nickname must be 2-20 chars' }, { status: 400 });
  }
  // Strip disallowed characters (keep letters from any alphabet, digits, -, _)
  const clean = sanitizeNickname(raw);
  if (!clean) {
    return NextResponse.json({ error: 'Nickname invalid' }, { status: 400 });
  }

  const p = upsertPlayer(s, clean);
  logInfo('player.upsert', { sid: s.slice(0, 8), nick: clean });
  return NextResponse.json({ sid: s, nickname: p?.nickname ?? clean });
}
