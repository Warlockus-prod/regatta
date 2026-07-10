import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { rateLimit, clientIpKey } from '@/lib/rate-limit';
import { weatherProvider, type WeatherNow } from '@/lib/weather';

export const runtime = 'nodejs';

/**
 * GET /api/weather?lat={lat}&lon={lon}
 *
 * Phase 1 read-only weather (docs/design/live-weather/DESIGN.md). Returns a
 * single wind/wave snapshot from Open-Meteo. Results are cached per coarse
 * ~11km cell for 15 minutes to stay inside the free tier and keep responses
 * fast. Failures answer 503 so the client falls back to synthetic wind.
 */

// 120 requests / hour / session - generous for a live-mode session that polls
// occasionally, but caps a single client from hammering the upstream provider.
const WEATHER_LIMIT = 120;
const WEATHER_WINDOW_MS = 60 * 60 * 1000;

// Cache TTL per cell. The DESIGN doc allows 10-30 min; 15 keeps data fresh
// enough for a teaching widget while collapsing bursts to one upstream call.
const CACHE_TTL_MS = 15 * 60 * 1000;

interface CacheEntry {
  at: number;
  data: WeatherNow;
}

// Module-scope in-memory cache. Single-container deploy, same rationale as the
// in-memory rate limiter. Key is a coarse cell so nearby requests share data.
const CACHE = new Map<string, CacheEntry>();

function cacheKey(lat: number, lon: number): string {
  return `${lat.toFixed(1)},${lon.toFixed(1)}`;
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const latRaw = url.searchParams.get('lat');
  const lonRaw = url.searchParams.get('lon');
  // Number(null) is 0 and Number('') is 0, so a missing or empty param would
  // otherwise pass as a valid (0,0) coordinate. Reject them explicitly first.
  const lat = latRaw === null || latRaw.trim() === '' ? NaN : Number(latRaw);
  const lon = lonRaw === null || lonRaw.trim() === '' ? NaN : Number(lonRaw);

  if (
    !Number.isFinite(lat) ||
    !Number.isFinite(lon) ||
    lat < -90 ||
    lat > 90 ||
    lon < -180 ||
    lon > 180
  ) {
    return NextResponse.json({ error: 'bad coordinates' }, { status: 400 });
  }

  const jar = await cookies();
  const sid = jar.get('regatta_sid')?.value;
  const ip = clientIpKey(req); // last XFF hop - see rate-limit.ts (anti-spoofing)
  const rl = rateLimit('weather:' + (sid ?? ip), WEATHER_LIMIT, WEATHER_WINDOW_MS);
  if (!rl.ok) {
    return NextResponse.json({ error: 'rate limited' }, { status: 429 });
  }

  const key = cacheKey(lat, lon);
  const now = Date.now();
  const cached = CACHE.get(key);
  if (cached && now - cached.at < CACHE_TTL_MS) {
    return NextResponse.json(cached.data);
  }
  // Drop the entry if it exists but is stale, so the map does not retain dead
  // cells indefinitely (the key space is attacker-controllable via lat/lon).
  if (cached) CACHE.delete(key);

  let data: WeatherNow;
  try {
    data = await weatherProvider.getNow(lat, lon);
  } catch {
    return NextResponse.json({ error: 'weather provider unavailable' }, { status: 503 });
  }

  // Bound the cache so a client iterating coordinates cannot grow it without
  // limit. ~2000 coarse cells is far more than any real usage; when exceeded,
  // evict the oldest entry (Map preserves insertion order).
  if (CACHE.size >= 2000) {
    const oldest = CACHE.keys().next().value;
    if (oldest !== undefined) CACHE.delete(oldest);
  }
  CACHE.set(key, { at: now, data });
  return NextResponse.json(data);
}
