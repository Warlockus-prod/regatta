// Contract tests for /api/replay POST: size caps on every client blob, a
// short slug for missionId, a sanitized nickname, and a plausible time.

import { describe, it, expect, beforeEach, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  sid: 'sid-replay-1' as string | undefined,
  db: {
    insertReplay: vi.fn((_r: Record<string, unknown>) => 'ABC123' as string | null),
    getPlayer: vi.fn(() => null as { nickname: string } | null),
  },
}));

vi.mock('next/headers', () => ({
  cookies: async () => ({ get: () => (mocks.sid ? { value: mocks.sid } : undefined) }),
}));
vi.mock('@/lib/db', () => mocks.db);
vi.mock('@/lib/log', () => ({ logInfo: vi.fn(), logWarn: vi.fn() }));

import { POST } from './route';
import { __resetRateLimitsForTests } from '@/lib/rate-limit';

const samples = [{ t: 0 }, { t: 0.5 }, { t: 1 }];
const base = { difficulty: 'easy', windStrength: 'light', samples, events: [] as unknown[] };

function makeReq(body: unknown): Request {
  return new Request('http://localhost/api/replay', {
    method: 'POST',
    body: JSON.stringify(body),
    headers: { 'content-type': 'application/json', 'x-forwarded-for': '203.0.113.20' },
  });
}

function saved(): Record<string, unknown> {
  return mocks.db.insertReplay.mock.calls[0][0];
}

beforeEach(() => {
  __resetRateLimitsForTests();
  mocks.sid = 'sid-replay-1';
  mocks.db.insertReplay.mockReset().mockReturnValue('ABC123');
  mocks.db.getPlayer.mockReset().mockReturnValue(null);
});

describe('POST /api/replay', () => {
  it('200 on a normal replay', async () => {
    const res = await POST(makeReq({ ...base, missionId: 'clean-laps', finishTimeSec: 95.2, events: [{ type: 'tack', t: 3 }] }));
    expect(res.status).toBe(200);
    expect(saved()).toMatchObject({ missionId: 'clean-laps', finishTimeSec: 95.2 });
  });

  it('400 when the serialized events blob is too large', async () => {
    const fat = Array.from({ length: 10 }, () => ({ type: 'tack', note: 'x'.repeat(20000) }));
    const res = await POST(makeReq({ ...base, events: fat }));
    expect(res.status).toBe(400);
    expect(mocks.db.insertReplay).not.toHaveBeenCalled();
  });

  it('400 when missionId is too long or not a slug', async () => {
    expect((await POST(makeReq({ ...base, missionId: 'm'.repeat(41) }))).status).toBe(400);
    expect((await POST(makeReq({ ...base, missionId: '../../etc' }))).status).toBe(400);
    expect(mocks.db.insertReplay).not.toHaveBeenCalled();
  });

  it('sanitizes nicknameFallback and drops an implausible time', async () => {
    const res = await POST(makeReq({ ...base, nicknameFallback: '<script>Ann</script>' + 'q'.repeat(40), finishTimeSec: 3 }));
    expect(res.status).toBe(200);
    expect(saved().nickname).toMatch(/^[\p{L}\p{N}\-_ .]{2,20}$/u);
    expect(saved().finishTimeSec).toBeNull();
  });

  it('rotating the sid cookie does not lift the hourly limit', async () => {
    let ok = 0;
    for (let i = 0; i < 120; i++) {
      mocks.sid = 'rotating-' + i;
      if ((await POST(makeReq(base))).status === 200) ok++;
    }
    expect(ok).toBeLessThan(120);
    expect(ok).toBe(90); // 30 / hour per sid x IP_BUCKET_FACTOR 3 per IP
  });
});
