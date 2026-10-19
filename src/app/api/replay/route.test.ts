// Contract tests for /api/replay POST: size caps on every client blob,
// counted in UTF-8 bytes; samples and events rebuilt from numeric allow-lists
// so string padding is never stored; a short slug for missionId, a sanitized
// nickname, a plausible time; per-session, per-IP and site-wide hourly caps.

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

const samples = [0, 0.5, 1].map((t) => ({ t, x: 400, y: 1050 - t * 10, heading: 45, twa: 45, speed: 5, lap: 0 }));
const base = { difficulty: 'easy', windStrength: 'light', samples, events: [] as unknown[] };

function makeReq(body: unknown, xff = '203.0.113.20'): Request {
  return new Request('http://localhost/api/replay', {
    method: 'POST',
    body: JSON.stringify(body),
    headers: { 'content-type': 'application/json', 'x-forwarded-for': xff },
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

  it('counts the caps in UTF-8 bytes: 3-byte characters under the old char cap are refused', async () => {
    // 40 000 characters (under the old 100 000-char events cap) but 120 000 bytes.
    const res = await POST(makeReq({ ...base, events: [{ type: 'tack', t: 1, note: '€'.repeat(40_000) }] }));
    expect(res.status).toBe(400);
    expect(mocks.db.insertReplay).not.toHaveBeenCalled();
  });

  it('413 when the whole body is over the byte cap', async () => {
    const res = await POST(makeReq({ ...base, course: { pad: '€'.repeat(400_000) } }));
    expect(res.status).toBe(413);
    expect(mocks.db.insertReplay).not.toHaveBeenCalled();
  });

  it('400 when the course blob is over its byte cap', async () => {
    const res = await POST(makeReq({ ...base, course: { label: 'ж'.repeat(9000) } }));
    expect(res.status).toBe(400);
  });

  it('stores only allow-listed numeric sample fields and slug events, never padding', async () => {
    const padded = [0, 0.5, 1, 1.5].map((t) => ({
      t, x: 400.123, y: 1050, heading: 'x'.repeat(5000), twa: 45, speed: 5.678, lap: 0,
      pad: 'y'.repeat(5000), nested: { more: 'z'.repeat(5000) },
    }));
    const events = [
      { type: 'tack', t: 2, note: 'to-port-tack', extra: 'q'.repeat(5000) },
      { type: '<img src=x>', t: 3, note: '<script>alert(1)</script>' },
      { type: 'finish', t: 'soon' },
    ];
    const res = await POST(makeReq({ ...base, samples: [...padded, { t: 2, x: 'NaN', y: 1 }], events }));
    expect(res.status).toBe(200);
    const stored = saved();
    expect(stored.samples).toEqual(padded.map((p) => ({ t: p.t, x: 400.1, y: 1050, heading: 0, twa: 45, speed: 5.68, lap: 0 })));
    expect(stored.events).toEqual([
      { type: 'tack', t: 2, note: 'to-port-tack' },
      { type: 'imgsrcx', t: 3, note: 'scriptalert1script' },
    ]);
    expect(JSON.stringify(stored.samples).length).toBeLessThan(400);
  });

  it('400 when fewer than 3 usable samples remain after rebuilding', async () => {
    const res = await POST(makeReq({ ...base, samples: [{ t: 0, x: 1, y: 1 }, { t: 1, x: 'a', y: 1 }, 'junk', null] }));
    expect(res.status).toBe(400);
  });

  it('invalid uploads never spend the site-wide budget', async () => {
    for (let i = 0; i < 400; i++) {
      mocks.sid = 'junk-' + i;
      expect((await POST(makeReq({ ...base, samples: [] }, `198.18.${Math.floor(i / 50)}.${i % 50}`))).status).toBe(400);
    }
    mocks.sid = 'real-uploader';
    expect((await POST(makeReq(base, '192.0.2.200'))).status).toBe(200);
  });

  it('one IPv6 /64 shares a single per-IP bucket', async () => {
    let ok = 0;
    for (let i = 0; i < 100; i++) {
      mocks.sid = 'v6-' + i;
      if ((await POST(makeReq(base, `2001:db8:abcd:12::${(i + 1).toString(16)}`))).status === 200) ok++;
    }
    expect(ok).toBe(90); // REPLAY_LIMIT x IP_BUCKET_FACTOR for the whole /64
  });

  it('caps uploads site-wide even across many IPs', async () => {
    let ok = 0;
    for (let i = 0; i < 320; i++) {
      mocks.sid = 'global-' + i;
      if ((await POST(makeReq(base, `198.51.${Math.floor(i / 50)}.${i % 50}`))).status === 200) ok++;
    }
    expect(ok).toBe(300);
  });
});
