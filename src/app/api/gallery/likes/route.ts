import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getGalleryLikes } from '@/lib/db';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Bulk-fetch like counts + per-session liked state for a list of gallery
// item IDs. Used by /gallery on first paint to populate hearts.
//
// Query: ?ids=r25-01,r25-02,...
// Returns: { 'r25-01': { count, liked }, ... }
export async function GET(req: Request) {
  const url = new URL(req.url);
  const idsParam = url.searchParams.get('ids') ?? '';
  const ids = idsParam
    .split(',')
    .map((s) => s.trim())
    .filter((s) => s && s.length <= 50)
    .slice(0, 200); // cap to avoid arbitrary-large queries

  if (ids.length === 0) {
    return NextResponse.json({}, { headers: { 'Cache-Control': 'no-store' } });
  }

  const jar = await cookies();
  const sid = jar.get('regatta_sid')?.value ?? '';
  const result = getGalleryLikes(ids, sid);
  return NextResponse.json(result, { headers: { 'Cache-Control': 'no-store' } });
}
