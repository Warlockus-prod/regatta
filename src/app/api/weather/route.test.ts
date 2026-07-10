// Contract tests for /api/weather GET.
// Network-free: the Open-Meteo provider and the rate limiter are mocked, so
// these assert the public HTTP contract (validation, shape, rate limiting)
// without touching the real upstream. The provider has its own behavior; this
// file pins the route so accidental drift breaks CI immediately.

import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { WeatherNow } from '@/lib/weather';

// vi.mock factories are hoisted; refs they capture must be hoisted too.
const mocks = vi.hoisted(() => {
  return {
    cookieStore: { value: undefined as string | undefined },
    rateLimit: vi.fn(() => ({ ok: true, remaining: 119, resetMs: 0 })),
    getNow: vi.fn(),
  };
});

vi.mock('next/headers', () => ({
  cookies: async () => ({
    get: (name: string) =>
      name === 'regatta_sid' && mocks.cookieStore.value
        ? { value: mocks.cookieStore.value }
        : undefined,
  }),
}));

vi.mock('@/lib/rate-limit', () => ({
  rateLimit: mocks.rateLimit,
  // mirrors the real helper: limiter key = last X-Forwarded-For hop
  clientIpKey: (req: Request) => {
    const xff = req.headers.get('x-forwarded-for');
    if (!xff) return 'ip:unknown';
    const parts = xff.split(',').map((s) => s.trim()).filter(Boolean);
    return parts.length > 0 ? parts[parts.length - 1] : 'ip:unknown';
  },
}));

vi.mock('@/lib/weather', () => ({
  weatherProvider: { id: 'open-meteo', getNow: mocks.getNow },
}));

import { GET } from './route';

function setSid(v: string | undefined) {
  mocks.cookieStore.value = v;
}

function makeReq(query: string): Request {
  return new Request(`http://localhost/api/weather${query}`);
}

const sampleNow: WeatherNow = {
  provider: 'open-meteo',
  ts: '2026-05-25T12:00',
  wind: { speedKn: 12.3, dirDeg: 220, gustKn: 18.1 },
  wave: { heightM: 0.8, dirDeg: 210, periodS: 5.2 },
  attribution: 'Weather data by Open-Meteo.com (CC BY 4.0)',
};

beforeEach(() => {
  setSid('sid-test-1234');
  mocks.rateLimit.mockReset().mockReturnValue({ ok: true, remaining: 119, resetMs: 0 });
  mocks.getNow.mockReset().mockResolvedValue(sampleNow);
});

describe('GET /api/weather - validation', () => {
  it('400 when lat/lon are missing', async () => {
    const res = await GET(makeReq(''));
    expect(res.status).toBe(400);
    expect(mocks.getNow).not.toHaveBeenCalled();
  });

  it('400 when lat is non-numeric', async () => {
    const res = await GET(makeReq('?lat=abc&lon=10'));
    expect(res.status).toBe(400);
  });

  it('400 when lat is out of range (> 90)', async () => {
    const res = await GET(makeReq('?lat=91&lon=10'));
    expect(res.status).toBe(400);
  });

  it('400 when lon is out of range (< -180)', async () => {
    const res = await GET(makeReq('?lat=10&lon=-181'));
    expect(res.status).toBe(400);
  });
});

describe('GET /api/weather - happy path', () => {
  it('200 with the provider snapshot shape for valid coords', async () => {
    // Distinct coords per test avoid the module-scope cache leaking results
    // between cases.
    const res = await GET(makeReq('?lat=43.1&lon=5.9'));
    expect(res.status).toBe(200);
    const body = (await res.json()) as WeatherNow;
    expect(body.provider).toBe('open-meteo');
    expect(body.wind.speedKn).toBe(12.3);
    expect(body.wind.dirDeg).toBe(220);
    expect(body.wind.gustKn).toBe(18.1);
    expect(body.wave?.heightM).toBe(0.8);
    expect(body.attribution).toBe('Weather data by Open-Meteo.com (CC BY 4.0)');
    expect(mocks.getNow).toHaveBeenCalledWith(43.1, 5.9);
  });

  it('503 when the provider throws', async () => {
    mocks.getNow.mockRejectedValueOnce(new Error('upstream down'));
    const res = await GET(makeReq('?lat=44.2&lon=6.1'));
    expect(res.status).toBe(503);
    const body = (await res.json()) as { error: string };
    expect(body.error).toBe('weather provider unavailable');
  });

  it('serves a cached snapshot without re-calling the provider', async () => {
    // First call populates the cache for this cell.
    await GET(makeReq('?lat=45.3&lon=7.2'));
    expect(mocks.getNow).toHaveBeenCalledTimes(1);
    // Second call for the same coarse cell is served from cache.
    const res = await GET(makeReq('?lat=45.3&lon=7.2'));
    expect(res.status).toBe(200);
    expect(mocks.getNow).toHaveBeenCalledTimes(1);
  });
});

describe('GET /api/weather - rate limiting', () => {
  it('429 when the limiter rejects', async () => {
    mocks.rateLimit.mockReturnValueOnce({ ok: false, remaining: 0, resetMs: 1000 });
    // Use coords not warmed by other tests so it is the limiter, not the
    // cache, that decides the response.
    const res = await GET(makeReq('?lat=10.7&lon=20.3'));
    expect(res.status).toBe(429);
    expect(mocks.getNow).not.toHaveBeenCalled();
  });
});
