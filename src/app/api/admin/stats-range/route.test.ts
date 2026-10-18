// Contract for /api/admin/stats-range: a range wider than 90 days is clamped
// to the last 90 days before `to`, so one dashboard call cannot scan the whole
// events table; bad ranges are a 400.

import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  getMetricsRange: vi.fn((fromMs: number, toMs: number) => ({ range: { fromMs, toMs } })),
}));

vi.mock('@/lib/db', () => ({ getMetricsRange: mocks.getMetricsRange }));
vi.mock('@/lib/log', () => ({ logError: vi.fn() }));

import { GET } from './route';

const DAY = 24 * 3600 * 1000;
// The handler checks admin auth itself (requireAdmin), so tests send it.
const PASS = 'stats-range-test';
const AUTH = `Basic ${Buffer.from(`admin:${PASS}`).toString('base64')}`;
const req = (qs: string) =>
  new Request(`http://localhost/api/admin/stats-range${qs}`, { headers: { authorization: AUTH } });

let savedPass: string | undefined;
beforeAll(() => {
  savedPass = process.env.ADMIN_PASSWORD;
  process.env.ADMIN_PASSWORD = PASS;
});
afterAll(() => {
  if (savedPass === undefined) delete process.env.ADMIN_PASSWORD;
  else process.env.ADMIN_PASSWORD = savedPass;
});

beforeEach(() => mocks.getMetricsRange.mockClear());

describe('GET /api/admin/stats-range', () => {
  it('passes a range within 90 days through unchanged', async () => {
    const res = await GET(req('?from=2026-09-01T00:00:00Z&to=2026-10-01T00:00:00Z'));
    expect(res.status).toBe(200);
    expect(mocks.getMetricsRange).toHaveBeenCalledWith(Date.parse('2026-09-01T00:00:00Z'), Date.parse('2026-10-01T00:00:00Z'));
  });

  it('clamps a one-year range to the last 90 days before `to`', async () => {
    const to = Date.parse('2026-10-18T00:00:00Z');
    const res = await GET(req('?from=2025-10-18T00:00:00Z&to=2026-10-18T00:00:00Z'));
    const body = await res.json();
    expect(mocks.getMetricsRange).toHaveBeenCalledWith(to - 90 * DAY, to);
    expect(body.range).toEqual({ fromMs: to - 90 * DAY, toMs: to });
  });

  it('defaults to the last 7 days', async () => {
    await GET(req(''));
    const [fromMs, toMs] = mocks.getMetricsRange.mock.calls[0];
    expect(toMs - fromMs).toBe(7 * DAY);
  });

  it('rejects an inverted or unparseable range', async () => {
    expect((await GET(req('?from=2026-10-02T00:00:00Z&to=2026-10-01T00:00:00Z'))).status).toBe(400);
    expect((await GET(req('?from=yesterday'))).status).toBe(400);
    expect(mocks.getMetricsRange).not.toHaveBeenCalled();
  });
});
