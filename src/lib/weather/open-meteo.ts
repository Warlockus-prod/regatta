import type { WeatherNow, WeatherProvider } from './types';

/**
 * Open-Meteo provider (Phase 1). Free, no API key, CC BY 4.0.
 *
 * Wind comes from the Weather forecast API in knots. Waves come from the
 * Marine API on a best-effort basis: inland points return 404 / empty data,
 * in which case wave is set to null and we never throw from the marine leg.
 * The wind leg is mandatory - if it fails or returns no `current` block we
 * throw a clear Error so the route can answer 503 and the client falls back
 * to synthetic wind.
 */

const WIND_URL = 'https://api.open-meteo.com/v1/forecast';
const MARINE_URL = 'https://marine-api.open-meteo.com/v1/marine';
const FETCH_TIMEOUT_MS = 6000;

const ATTRIBUTION = 'Weather data by Open-Meteo.com (CC BY 4.0)';

interface WindResponse {
  current?: {
    time?: string;
    wind_speed_10m?: number;
    wind_direction_10m?: number;
    wind_gusts_10m?: number;
  };
}

interface MarineResponse {
  current?: {
    wave_height?: number;
    wave_direction?: number;
    wave_period?: number;
  };
}

/** fetch with an AbortController timeout. Rejects if the request runs long. */
async function fetchWithTimeout(url: string): Promise<Response> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), FETCH_TIMEOUT_MS);
  try {
    return await fetch(url, { signal: ctrl.signal });
  } finally {
    clearTimeout(timer);
  }
}

function isFiniteNumber(v: unknown): v is number {
  return typeof v === 'number' && Number.isFinite(v);
}

export class OpenMeteoProvider implements WeatherProvider {
  readonly id = 'open-meteo';

  async getNow(lat: number, lon: number): Promise<WeatherNow> {
    const wind = await this.fetchWind(lat, lon);
    const wave = await this.fetchWave(lat, lon);
    return {
      provider: this.id,
      ts: wind.ts,
      wind: { speedKn: wind.speedKn, dirDeg: wind.dirDeg, gustKn: wind.gustKn },
      wave,
      attribution: ATTRIBUTION,
    };
  }

  /** Mandatory wind leg. Throws on any failure or missing current data. */
  private async fetchWind(
    lat: number,
    lon: number,
  ): Promise<{ ts: string; speedKn: number; dirDeg: number; gustKn: number | null }> {
    const url =
      `${WIND_URL}?latitude=${lat}&longitude=${lon}` +
      '&current=wind_speed_10m,wind_direction_10m,wind_gusts_10m' +
      '&wind_speed_unit=kn';

    let res: Response;
    try {
      res = await fetchWithTimeout(url);
    } catch (err) {
      throw new Error(`open-meteo wind fetch failed: ${(err as Error).message}`);
    }
    if (!res.ok) {
      throw new Error(`open-meteo wind fetch returned ${res.status}`);
    }

    let data: WindResponse;
    try {
      data = (await res.json()) as WindResponse;
    } catch (err) {
      throw new Error(`open-meteo wind parse failed: ${(err as Error).message}`);
    }

    const current = data.current;
    if (!current || !isFiniteNumber(current.wind_speed_10m) || !isFiniteNumber(current.wind_direction_10m)) {
      throw new Error('open-meteo wind response has no current data');
    }

    return {
      ts: typeof current.time === 'string' ? current.time : new Date().toISOString(),
      speedKn: current.wind_speed_10m,
      dirDeg: current.wind_direction_10m,
      gustKn: isFiniteNumber(current.wind_gusts_10m) ? current.wind_gusts_10m : null,
    };
  }

  /**
   * Best-effort wave leg. Never throws: any failure, non-OK status, parse
   * error or missing field yields null (inland points, no marine coverage).
   */
  private async fetchWave(lat: number, lon: number): Promise<WeatherNow['wave']> {
    const url =
      `${MARINE_URL}?latitude=${lat}&longitude=${lon}` +
      '&current=wave_height,wave_direction,wave_period';
    try {
      const res = await fetchWithTimeout(url);
      if (!res.ok) return null;
      const data = (await res.json()) as MarineResponse;
      const current = data.current;
      if (
        !current ||
        !isFiniteNumber(current.wave_height) ||
        !isFiniteNumber(current.wave_direction) ||
        !isFiniteNumber(current.wave_period)
      ) {
        return null;
      }
      return {
        heightM: current.wave_height,
        dirDeg: current.wave_direction,
        periodS: current.wave_period,
      };
    } catch {
      return null;
    }
  }
}
