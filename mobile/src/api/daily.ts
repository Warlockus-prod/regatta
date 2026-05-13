/**
 * HTTP client for `/api/daily` plus an AsyncStorage cache.
 *
 * The web route returns the day's challenge metadata. We cache the
 * response per-day so the Home banner can render instantly on cold
 * launch and we don't pound the API every render. TTL is 1 hour - the
 * underlying daily seed only changes at UTC midnight, but caching
 * shorter than that lets us pick up server-side tweaks the same day.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_BASE, REQUEST_TIMEOUT_MS, type ApiResult } from './coach';

const CACHE_KEY = 'regatta.daily.cache.v1';
export const DAILY_CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour

export interface DailyChallenge {
  /** UTC date the challenge belongs to: YYYY-MM-DD. */
  day: string;
  challenge: {
    seed: number;
    difficulty: 'easy' | 'medium' | 'hard';
    windStrength: 'light' | 'medium' | 'heavy';
    /** Web pairs the daily with one of the named missions; may be null. */
    missionId: string | null;
  };
  /** Top entries on the daily leaderboard. */
  top: Array<{
    nickname: string;
    finishTimeSec: number;
    ts?: number;
  }>;
}

interface CacheEnvelope {
  fetchedAt: number;
  data: DailyChallenge;
}

async function readCache(): Promise<CacheEnvelope | null> {
  try {
    const raw = await AsyncStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    if (
      parsed &&
      typeof parsed === 'object' &&
      'fetchedAt' in parsed &&
      'data' in parsed &&
      typeof (parsed as CacheEnvelope).fetchedAt === 'number'
    ) {
      return parsed as CacheEnvelope;
    }
    return null;
  } catch {
    return null;
  }
}

async function writeCache(env: CacheEnvelope): Promise<void> {
  try {
    await AsyncStorage.setItem(CACHE_KEY, JSON.stringify(env));
  } catch {
    /* ignore - cache is opportunistic */
  }
}

/** Public for tests / debug; clears the daily cache. */
export async function clearDailyCache(): Promise<void> {
  try {
    await AsyncStorage.removeItem(CACHE_KEY);
  } catch {
    /* ignore */
  }
}

/**
 * Fetch the day's challenge. Returns the cached envelope if it's still
 * fresh; otherwise hits the network with an 8-second timeout. If the
 * network fails BUT we have a stale cache entry from today, we return
 * the stale cache (better than nothing for an opportunistic banner).
 */
export async function fetchDaily(): Promise<ApiResult<DailyChallenge>> {
  const cached = await readCache();
  const now = Date.now();
  if (cached && now - cached.fetchedAt < DAILY_CACHE_TTL_MS) {
    return { ok: true, data: cached.data };
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    const resp = await fetch(`${API_BASE}/api/daily`, {
      method: 'GET',
      headers: { Accept: 'application/json' },
      signal: controller.signal,
    });
    if (!resp.ok) {
      // 404 / 5xx -> opportunistic fallback to whatever we cached today
      // (even if it's older than 1 hour, it's still a valid daily
      // because the seed only flips at UTC midnight).
      if (cached && cached.data.day === todayUTC()) {
        return { ok: true, data: cached.data };
      }
      return { ok: false, status: resp.status, error: `HTTP ${resp.status}` };
    }
    const parsed = (await resp.json()) as Partial<DailyChallenge> & {
      challenge?: Partial<DailyChallenge['challenge']>;
    };
    if (
      !parsed ||
      typeof parsed.day !== 'string' ||
      !parsed.challenge ||
      typeof parsed.challenge.seed !== 'number'
    ) {
      // Server returned a 200 with a shape we don't recognise; degrade.
      return { ok: false, error: 'Bad daily response' };
    }
    const data: DailyChallenge = {
      day: parsed.day,
      challenge: {
        seed: parsed.challenge.seed,
        difficulty: (parsed.challenge.difficulty ?? 'medium') as DailyChallenge['challenge']['difficulty'],
        windStrength: (parsed.challenge.windStrength ?? 'medium') as DailyChallenge['challenge']['windStrength'],
        missionId: parsed.challenge.missionId ?? null,
      },
      top: Array.isArray(parsed.top)
        ? parsed.top.map((row) => ({
            nickname: typeof row.nickname === 'string' ? row.nickname : 'anon',
            finishTimeSec:
              typeof row.finishTimeSec === 'number' ? row.finishTimeSec : 0,
            ts: typeof (row as { ts?: number }).ts === 'number' ? (row as { ts?: number }).ts : undefined,
          }))
        : [],
    };
    await writeCache({ fetchedAt: now, data });
    return { ok: true, data };
  } catch (err) {
    if (cached && cached.data.day === todayUTC()) {
      return { ok: true, data: cached.data };
    }
    if (err instanceof Error && err.name === 'AbortError') {
      return { ok: false, error: 'Request timed out' };
    }
    return {
      ok: false,
      error: err instanceof Error ? err.message : 'Network error',
    };
  } finally {
    clearTimeout(timer);
  }
}

function todayUTC(): string {
  const now = new Date();
  return `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, '0')}-${String(now.getUTCDate()).padStart(2, '0')}`;
}
