// Contract for GET /api/daily: rows never carry the raw `regatta_sid` (the
// unauthenticated write key) and `isMe` is true only for the caller's own
// cookie; a challenge row is created only for a real day within today plus or
// minus one, so arbitrary date strings cannot grow the table.

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  sid: 'me-sid' as string | undefined,
  db: {
    getOrCreateDaily: vi.fn((day: string) => ({
      day, seed: 7, difficulty: 'medium', wind_strength: 'heavy', mission_id: null, created_at: 0,
    })),
    getDailyLeaderboard: vi.fn((_day: string, _limit?: number) => [
      { nickname: 'Ola', sid: 'other-sid', difficulty: 'medium', wind_strength: 'heavy', mission_id: null, finish_time_sec: 81.2, score: null, ts: 1 },
      { nickname: 'Me', sid: 'me-sid', difficulty: 'medium', wind_strength: 'heavy', mission_id: null, finish_time_sec: 90, score: null, ts: 2 },
    ]),
  },
}));

vi.mock('next/headers', () => ({
  cookies: async () => ({ get: (name: string) => (name === 'regatta_sid' && mocks.sid ? { value: mocks.sid } : undefined) }),
}));
vi.mock('@/lib/db', () => mocks.db);

import { GET } from './route';

function get(query = ''): Promise<Response> {
  return GET(new Request('http://localhost/api/daily' + query));
}

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date('2026-10-19T12:00:00Z'));
  mocks.sid = 'me-sid';
  mocks.db.getOrCreateDaily.mockClear();
  mocks.db.getDailyLeaderboard.mockClear();
});
afterEach(() => vi.useRealTimers());

describe('GET /api/daily', () => {
  it('serves today by default with no sid in any row', async () => {
    const res = await get();
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.day).toBe('2026-10-19');
    expect(body.challenge).toEqual({ seed: 7, difficulty: 'medium', windStrength: 'heavy', missionId: null });
    expect(body.top).toHaveLength(2);
    for (const row of body.top) expect(row).not.toHaveProperty('sid');
    expect(JSON.stringify(body)).not.toContain('other-sid');
    expect(JSON.stringify(body)).not.toContain('me-sid');
  });

  it('isMe is true only for the cookie sid', async () => {
    const body = await (await get()).json();
    expect(body.top.map((r: { nickname: string; isMe: boolean }) => [r.nickname, r.isMe])).toEqual([['Ola', false], ['Me', true]]);
    mocks.sid = undefined;
    const anon = await (await get()).json();
    expect(anon.top.every((r: { isMe: boolean }) => r.isMe === false)).toBe(true);
  });

  it('yesterday and tomorrow (UTC midnight skew) are served', async () => {
    expect((await get('?day=2026-10-18')).status).toBe(200);
    expect((await get('?day=2026-10-20')).status).toBe(200);
    expect(mocks.db.getOrCreateDaily).toHaveBeenCalledTimes(2);
  });

  it.each(['2026-13-45', '9999-99-99', '2026-02-30', '2026-10-19T00:00', 'today', ''])(
    '400 for %j and nothing is created', async (day) => {
      const res = await get('?day=' + encodeURIComponent(day));
      expect(res.status).toBe(400);
      expect(mocks.db.getOrCreateDaily).not.toHaveBeenCalled();
    },
  );

  it.each(['2026-10-01', '2027-01-01', '1999-12-31'])('404 for the real day %s outside today +-1, nothing created', async (day) => {
    const res = await get('?day=' + day);
    expect(res.status).toBe(404);
    expect(mocks.db.getOrCreateDaily).not.toHaveBeenCalled();
  });
});
