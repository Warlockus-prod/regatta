// Contract for GET /api/leaderboard: rows never carry the raw `regatta_sid`
// (the unauthenticated write key), `isMe` is true only for the caller's own
// cookie, and bad mission / difficulty / wind values are refused before any
// query runs.

import { describe, it, expect, beforeEach, vi } from 'vitest';

const mocks = vi.hoisted(() => {
  const rows = () => [
    { nickname: 'Ola', sid: 'other-sid', difficulty: 'easy', wind_strength: 'light', mission_id: null, finish_time_sec: 70, score: 10, ts: 1 },
    { nickname: 'Me', sid: 'me-sid', difficulty: 'easy', wind_strength: 'light', mission_id: null, finish_time_sec: 80, score: 5, ts: 2 },
  ];
  return {
    sid: 'me-sid' as string | undefined,
    db: {
      topByDifficulty: vi.fn<(difficulty: string, wind: string, limit?: number) => ReturnType<typeof rows>>(() => rows()),
      topByMission: vi.fn<(missionId: string, limit?: number) => ReturnType<typeof rows>>(() => rows()),
    },
  };
});

vi.mock('next/headers', () => ({
  cookies: async () => ({ get: (name: string) => (name === 'regatta_sid' && mocks.sid ? { value: mocks.sid } : undefined) }),
}));
vi.mock('@/lib/db', () => mocks.db);

import { GET } from './route';

function get(query: string): Promise<Response> {
  return GET(new Request('http://localhost/api/leaderboard' + query));
}

beforeEach(() => {
  mocks.sid = 'me-sid';
  mocks.db.topByDifficulty.mockClear();
  mocks.db.topByMission.mockClear();
});

describe('GET /api/leaderboard', () => {
  it.each(['?difficulty=easy&wind=light', '?mission=sub-90'])('%s: no sid in any row, isMe only for the cookie sid', async (q) => {
    const res = await get(q);
    expect(res.status).toBe(200);
    const body = await res.json();
    for (const row of body.rows) expect(row).not.toHaveProperty('sid');
    expect(JSON.stringify(body)).not.toMatch(/other-sid|me-sid/);
    expect(body.rows.map((r: { nickname: string; isMe: boolean }) => [r.nickname, r.isMe])).toEqual([['Ola', false], ['Me', true]]);
  });

  it('without a cookie nobody is "me"', async () => {
    mocks.sid = undefined;
    const body = await (await get('?difficulty=easy&wind=light')).json();
    expect(body.rows.every((r: { isMe: boolean }) => r.isMe === false)).toBe(true);
  });

  it.each([
    '?mission=' + 'm'.repeat(41),
    '?mission=../etc',
    '?difficulty=extreme&wind=light',
    '?difficulty=easy&wind=hurricane',
  ])('400 for %s without querying', async (q) => {
    expect((await get(q)).status).toBe(400);
    expect(mocks.db.topByDifficulty).not.toHaveBeenCalled();
    expect(mocks.db.topByMission).not.toHaveBeenCalled();
  });
});
