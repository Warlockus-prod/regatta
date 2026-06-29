import { fetchWeatherNow, type WeatherNow } from '../src/api/weather';

const SAMPLE: WeatherNow = {
  provider: 'open-meteo',
  ts: '2026-05-25T12:00:00Z',
  wind: { speedKn: 14.6, dirDeg: 225, gustKn: 21.2 },
  wave: { heightM: 0.8, dirDeg: 230, periodS: 5.4 },
  attribution: 'Weather data by Open-Meteo.com (CC BY 4.0)',
};

const originalFetch = global.fetch;

function mockFetchOnce(impl: () => Promise<unknown>) {
  // jest.fn returning a Response-like object the client reads via resp.json().
  global.fetch = jest.fn(impl) as unknown as typeof fetch;
}

afterEach(() => {
  global.fetch = originalFetch;
  jest.clearAllMocks();
});

describe('fetchWeatherNow', () => {
  it('calls the production /api/weather URL with lat/lon query params', async () => {
    mockFetchOnce(async () => ({
      ok: true,
      status: 200,
      json: async () => SAMPLE,
    }));

    await fetchWeatherNow(39.57, 2.65);

    expect(global.fetch).toHaveBeenCalledTimes(1);
    const [url, init] = (global.fetch as jest.Mock).mock.calls[0];
    expect(url).toBe(
      'https://weektoregatta.com/api/weather?lat=39.57&lon=2.65',
    );
    expect(init).toMatchObject({ method: 'GET' });
    // AbortController signal is wired for the timeout.
    expect(init.signal).toBeDefined();
  });

  it('returns ok=true with the parsed snapshot on a 200', async () => {
    mockFetchOnce(async () => ({
      ok: true,
      status: 200,
      json: async () => SAMPLE,
    }));

    const res = await fetchWeatherNow(36.01, -5.6);

    expect(res.ok).toBe(true);
    expect(res.data).toEqual(SAMPLE);
    expect(res.data?.wind.speedKn).toBeCloseTo(14.6);
    expect(res.data?.wave?.heightM).toBeCloseTo(0.8);
  });

  it('accepts a null wave (inland / no marine data)', async () => {
    const inland: WeatherNow = { ...SAMPLE, wave: null, wind: { ...SAMPLE.wind, gustKn: null } };
    mockFetchOnce(async () => ({
      ok: true,
      status: 200,
      json: async () => inland,
    }));

    const res = await fetchWeatherNow(50.76, -1.3);

    expect(res.ok).toBe(true);
    expect(res.data?.wave).toBeNull();
    expect(res.data?.wind.gustKn).toBeNull();
  });

  it('returns ok=false with the server error message on a non-2xx', async () => {
    mockFetchOnce(async () => ({
      ok: false,
      status: 503,
      json: async () => ({ error: 'weather provider unavailable' }),
    }));

    const res = await fetchWeatherNow(39.57, 2.65);

    expect(res.ok).toBe(false);
    expect(res.status).toBe(503);
    expect(res.error).toBe('weather provider unavailable');
  });

  it('returns ok=false when the 200 body has the wrong shape', async () => {
    mockFetchOnce(async () => ({
      ok: true,
      status: 200,
      json: async () => ({ provider: 'x', ts: 'y' }),
    }));

    const res = await fetchWeatherNow(39.57, 2.65);

    expect(res.ok).toBe(false);
    expect(res.error).toBe('Bad weather response');
  });

  it('never throws on a network failure', async () => {
    mockFetchOnce(async () => {
      throw new Error('Network request failed');
    });

    const res = await fetchWeatherNow(39.57, 2.65);

    expect(res.ok).toBe(false);
    expect(res.error).toBe('Network request failed');
  });
});
