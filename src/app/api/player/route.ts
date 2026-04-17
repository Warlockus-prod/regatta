import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { upsertPlayer, getPlayer } from '@/lib/db';
import { logInfo, logWarn } from '@/lib/log';

export const runtime = 'nodejs';

/**
 * GET  /api/player  -> { sid, nickname }  (nickname may be null)
 * POST /api/player  { nickname }  -> saves/updates nickname for the session
 */

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
  let body: { nickname?: string };
  try { body = await req.json(); }
  catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }); }

  const raw = (body.nickname ?? '').trim();
  if (raw.length < 2 || raw.length > 20) {
    return NextResponse.json({ error: 'Nickname must be 2-20 chars' }, { status: 400 });
  }
  // Strip disallowed characters (keep letters from any alphabet, digits, -, _)
  const clean = raw.replace(/[^\p{L}\p{N}\-_ .]/gu, '').slice(0, 20);
  if (clean.length < 2) {
    return NextResponse.json({ error: 'Nickname invalid' }, { status: 400 });
  }

  const p = upsertPlayer(s, clean);
  logInfo('player.upsert', { sid: s.slice(0, 8), nick: clean });
  return NextResponse.json({ sid: s, nickname: p?.nickname ?? clean });
}
