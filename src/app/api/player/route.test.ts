// Contract for POST /api/player: a nickname is stored only for a session id
// proxy.ts could have issued (a 36-character UUID), at most 20 times an hour
// per session and 60 per IP however the cookie is rotated, and only after the
// shared nickname sanitizer accepts it.

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { randomUUID } from 'node:crypto';

const mocks = vi.hoisted(() => ({
  sid: undefined as string | undefined,
  db: {
    upsertPlayer: vi.fn((sid: string, nickname: string) => ({ sid, nickname, created_at: 0, updated_at: 0 })),
    getPlayer: vi.fn(() => null as { nickname: string } | null),
  },
}));

vi.mock('next/headers', () => ({
  cookies: async () => ({ get: (name: string) => (name === 'regatta_sid' && mocks.sid ? { value: mocks.sid } : undefined) }),
}));
vi.mock('@/lib/db', () => mocks.db);
vi.mock('@/lib/log', () => ({ logInfo: vi.fn(), logWarn: vi.fn() }));

import { POST } from './route';
import { __resetRateLimitsForTests, IP_BUCKET_FACTOR } from '@/lib/rate-limit';

function post(body: unknown, xff = '203.0.113.60'): Promise<Response> {
  return POST(new Request('http://localhost/api/player', {
    method: 'POST',
    body: typeof body === 'string' ? body : JSON.stringify(body),
    headers: { 'content-type': 'application/json', 'x-forwarded-for': xff },
  }));
}

beforeEach(() => {
  __resetRateLimitsForTests();
  mocks.sid = randomUUID();
  mocks.db.upsertPlayer.mockClear();
});

describe('POST /api/player', () => {
  it('stores a sanitized nickname for a UUID session', async () => {
    const res = await post({ nickname: '  Ola <b> ' });
    expect(res.status).toBe(200);
    expect(mocks.db.upsertPlayer).toHaveBeenCalledWith(mocks.sid, 'Ola b');
  });

  it.each([
    ['a 2000-character cookie', 'x'.repeat(2000)],
    ['a short hand-made id', 'abc'],
    ['a UUID with junk appended', randomUUID() + 'x'],
    ['36 characters that are not a UUID', 'z'.repeat(36)],
  ])('400 and nothing stored for %s', async (_label, sid) => {
    mocks.sid = sid;
    expect((await post({ nickname: 'Ola' })).status).toBe(400);
    expect(mocks.db.upsertPlayer).not.toHaveBeenCalled();
  });

  it('400 without a session cookie', async () => {
    mocks.sid = undefined;
    expect((await post({ nickname: 'Ola' })).status).toBe(400);
  });

  it.each([['A'], ['⛵'], ['<>'], [42], [null]])('400 for the nickname %j', async (nickname) => {
    expect((await post({ nickname })).status).toBe(400);
    expect(mocks.db.upsertPlayer).not.toHaveBeenCalled();
  });

  it('400 for a body that is not JSON or not an object', async () => {
    expect((await post('{nope')).status).toBe(400);
    expect((await post('null')).status).toBe(400);
  });

  it('20 an hour per session', async () => {
    let ok = 0;
    for (let i = 0; i < 25; i++) if ((await post({ nickname: 'Ola' + i })).status === 200) ok++;
    expect(ok).toBe(20);
  });

  it('rotating the cookie on one IP is still capped at 3x', async () => {
    let ok = 0;
    let limited = 0;
    for (let i = 0; i < 80; i++) {
      mocks.sid = randomUUID();
      const status = (await post({ nickname: 'Ola' })).status;
      if (status === 200) ok++;
      if (status === 429) limited++;
    }
    expect(ok).toBe(20 * IP_BUCKET_FACTOR);
    expect(limited).toBe(80 - 20 * IP_BUCKET_FACTOR);
    expect(mocks.db.upsertPlayer).toHaveBeenCalledTimes(20 * IP_BUCKET_FACTOR);
  });
});
