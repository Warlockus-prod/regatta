import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { toggleGalleryLike } from '@/lib/db';
import { rateLimitWithGlobal, rateLimitHeaders } from '@/lib/rate-limit';

export const runtime = 'nodejs';

// Toggle a like on a gallery item. Anonymous identity from the
// `regatta_sid` cookie that proxy.ts sets on every page visit. Rate
// limited per-sid to prevent quick-clicking flooding the table.
//
// Body: { itemId: 'r25-01' }
// Returns: { liked: boolean, count: number }
export async function POST(req: Request) {
  let body: { itemId?: unknown };
  try { body = await req.json(); }
  catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }); }

  const itemId = typeof body.itemId === 'string' ? body.itemId.trim() : '';
  if (!itemId || itemId.length > 50) {
    return NextResponse.json({ error: 'Bad itemId' }, { status: 400 });
  }

  const jar = await cookies();
  const sid = jar.get('regatta_sid')?.value;
  if (!sid) {
    return NextResponse.json({ error: 'No session' }, { status: 401 });
  }

  // 60 toggles / minute per sid is plenty for a real user clicking around;
  // catches click-flooding bots without affecting humans.
  const rl = rateLimitWithGlobal({
    key: 'gallery-like:' + sid,
    perKeyLimit: 60,
    perKeyWindowMs: 60_000,
    globalKey: 'gallery-like',
    globalLimit: 1500,
    globalWindowMs: 60_000,
  });
  if (!rl.ok) {
    return NextResponse.json(
      { error: 'rate-limited', retryAfterSec: Math.ceil(rl.resetMs / 1000) },
      { status: 429, headers: rateLimitHeaders(rl, 60) },
    );
  }

  const result = toggleGalleryLike(itemId, sid);
  return NextResponse.json(result);
}
