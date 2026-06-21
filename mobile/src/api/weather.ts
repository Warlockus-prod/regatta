/**
 * HTTP client for `/api/weather`.
 *
 * The web route returns a single live wind/wave snapshot from Open-Meteo:
 *   GET https://regatta.icoffio.com/api/weather?lat={lat}&lon={lon}
 *
 * Per ADR-0001 the mobile app consumes the existing web backend as-is.
 * No new dependencies; we use `fetch` and an `AbortController` for the
 * shared request timeout. The call returns the same typed `ApiResult`
 * envelope as coach.ts / daily.ts so the UI can branch on `ok` without
 * try/catch. This helper never throws.
 *
 * Phase 1 of the live-weather design is read-only and rate limited per
 * coarse cell on the server, so a single snapshot fetch per spot is cheap
 * (responses are cached ~15 min upstream).
 */
import { API_BASE, REQUEST_TIMEOUT_MS, type ApiResult } from './coach';

/**
 * One live snapshot. Mirrors the web `WeatherNow` shape in
 * `src/lib/weather/types.ts` exactly so the response parses unchanged.
 */
export interface WeatherNow {
  /** Provider id, e.g. 'open-meteo'. */
  provider: string;
  /** ISO-8601 forecast time the snapshot is for. */
  ts: string;
  wind: {
    /** Wind speed in knots. */
    speedKn: number;
    /** Direction the wind is coming FROM, degrees true (0-360). */
    dirDeg: number;
    /** Gust speed in knots, or null when the provider gives no gust value. */
    gustKn: number | null;
  };
  /** Wave snapshot, or null when no marine data is available for this point. */
  wave: {
    /** Significant wave height in metres. */
    heightM: number;
    /** Mean wave direction, degrees true (0-360). */
    dirDeg: number;
    /** Mean wave period in seconds. */
    periodS: number;
  } | null;
  /** Surface ocean current, or null/absent when unavailable. setKn = speed
   *  in knots flowing toward dirDeg (degrees true). */
  current?: { setKn: number; dirDeg: number } | null;
  /** Required attribution string clients must display. */
  attribution: string;
}

/**
 * Narrowing guard so we never hand a malformed 200 body to the UI. The
 * server can only realistically return the right shape, but a proxy or a
 * future schema change should degrade to an error CTA rather than crash a
 * render that reads `data.wind.speedKn`.
 */
function isWeatherNow(value: unknown): value is WeatherNow {
  if (!value || typeof value !== 'object') return false;
  const v = value as Record<string, unknown>;
  if (typeof v.provider !== 'string' || typeof v.ts !== 'string') return false;
  if (typeof v.attribution !== 'string') return false;
  const wind = v.wind;
  if (!wind || typeof wind !== 'object') return false;
  const w = wind as Record<string, unknown>;
  if (typeof w.speedKn !== 'number' || typeof w.dirDeg !== 'number') return false;
  if (!(w.gustKn === null || typeof w.gustKn === 'number')) return false;
  const wave = v.wave;
  if (wave !== null) {
    if (!wave || typeof wave !== 'object') return false;
    const wv = wave as Record<string, unknown>;
    if (
      typeof wv.heightM !== 'number' ||
      typeof wv.dirDeg !== 'number' ||
      typeof wv.periodS !== 'number'
    ) {
      return false;
    }
  }
  return true;
}

/**
 * Fetch the current wind/wave snapshot for a coordinate. Resolves to the
 * `ApiResult` envelope: `{ ok: true, data }` on success, otherwise
 * `{ ok: false, error }`. Timeouts (via AbortController) and network
 * failures collapse into the error branch instead of throwing.
 */
export async function fetchWeatherNow(
  lat: number,
  lon: number,
): Promise<ApiResult<WeatherNow>> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    const resp = await fetch(
      `${API_BASE}/api/weather?lat=${lat}&lon=${lon}`,
      {
        method: 'GET',
        headers: { Accept: 'application/json' },
        signal: controller.signal,
      },
    );
    let parsed: unknown = null;
    try {
      parsed = await resp.json();
    } catch {
      // Non-JSON body. Surface as a transport error so the retry CTA can
      // re-fire the request.
      return { ok: false, status: resp.status, error: 'Invalid response' };
    }
    if (!resp.ok) {
      const errMsg =
        parsed &&
        typeof parsed === 'object' &&
        'error' in parsed &&
        typeof (parsed as { error: unknown }).error === 'string'
          ? (parsed as { error: string }).error
          : `HTTP ${resp.status}`;
      return { ok: false, status: resp.status, error: errMsg };
    }
    if (!isWeatherNow(parsed)) {
      return { ok: false, status: resp.status, error: 'Bad weather response' };
    }
    return { ok: true, status: resp.status, data: parsed };
  } catch (err) {
    if (err instanceof Error && err.name === 'AbortError') {
      return { ok: false, error: 'Request timed out' };
    }
    const message = err instanceof Error ? err.message : 'Network error';
    return { ok: false, error: message };
  } finally {
    clearTimeout(timer);
  }
}
