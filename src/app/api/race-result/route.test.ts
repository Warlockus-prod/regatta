// Contract tests for /api/race-result POST.
// Tests the input validation only - happy path mocks db inserts so we can
// assert without spinning up SQLite. The DB layer has its own tests
// elsewhere; this file pins the public HTTP contract so accidental
// validation drift breaks CI immediately.

import { describe, it, expect, beforeEach, vi } from 'vitest';

// vi.mock factories are hoisted; refs they capture must be hoisted too.
const mocks = vi.hoisted(() => {
  return {
    cookieStore: { value: undefined as string | undefined },
    db: {
      insertRaceResult: vi.fn(() => 42),
      getPlayer: vi.fn(() => ({ nickname: 'Tester' }) as { nickname: string } | null),
      insertEvent: vi.fn(),
    },
  };
});

vi.mock('next/headers', () => ({
  cookies: async () => ({
    get: (name: string) => (name === 'regatta_sid' && mocks.cookieStore.value
      ? { value: mocks.cookieStore.value }
      : undefined),
  }),
}));

vi.mock('@/lib/db', () => mocks.db);

vi.mock('@/lib/log', () => ({
  logInfo: vi.fn(),
  logWarn: vi.fn(),
}));

import { POST } from './route';
import { FINISH_SEC_MAX, FINISH_SEC_MIN } from '@/lib/race-submission';
import { __resetRateLimitsForTests } from '@/lib/rate-limit';

function setSid(v: string | undefined) {
  mocks.cookieStore.value = v;
}

function makeReq(body: unknown): Request {
  return new Request('http://localhost/api/race-result', {
    method: 'POST',
    body: typeof body === 'string' ? body : JSON.stringify(body),
    headers: { 'content-type': 'application/json' },
  });
}

beforeEach(() => {
  __resetRateLimitsForTests();
  setSid('sid-test-1234');
  mocks.db.insertRaceResult.mockReset().mockReturnValue(42);
  mocks.db.getPlayer.mockReset().mockReturnValue({ nickname: 'Tester' });
  mocks.db.insertEvent.mockReset();
});

describe('POST /api/race-result - validation', () => {
  it('400 when no sid cookie', async () => {
    setSid(undefined);
    const res = await POST(makeReq({ finishTimeSec: 90, difficulty: 'easy', windStrength: 'light' }));
    expect(res.status).toBe(400);
  });

  it('400 when body is not valid JSON', async () => {
    const res = await POST(makeReq('{not-json'));
    expect(res.status).toBe(400);
  });

  it('400 when finishTimeSec is missing', async () => {
    const res = await POST(makeReq({ difficulty: 'easy', windStrength: 'light' }));
    expect(res.status).toBe(400);
  });

  it('400 when finishTimeSec is negative', async () => {
    const res = await POST(makeReq({ finishTimeSec: -1, difficulty: 'easy', windStrength: 'light' }));
    expect(res.status).toBe(400);
  });

  it('400 when finishTimeSec is zero', async () => {
    const res = await POST(makeReq({ finishTimeSec: 0, difficulty: 'easy', windStrength: 'light' }));
    expect(res.status).toBe(400);
  });

  it('400 when difficulty is invalid', async () => {
    const res = await POST(makeReq({ finishTimeSec: 90, difficulty: 'extreme', windStrength: 'light' }));
    expect(res.status).toBe(400);
  });

  it('400 when windStrength is invalid', async () => {
    const res = await POST(makeReq({ finishTimeSec: 90, difficulty: 'easy', windStrength: 'hurricane' }));
    expect(res.status).toBe(400);
  });

  it('400 when nickname missing and no player record', async () => {
    mocks.db.getPlayer.mockReturnValueOnce(null);
    const res = await POST(makeReq({ finishTimeSec: 90, difficulty: 'easy', windStrength: 'light' }));
    expect(res.status).toBe(400);
  });
});

describe('POST /api/race-result - value bounds (leaderboard poisoning)', () => {
  const base = { finishTimeSec: 90, difficulty: 'easy', windStrength: 'light' };

  it('400 when finishTimeSec exceeds the 2h ceiling', async () => {
    const res = await POST(makeReq({ ...base, finishTimeSec: FINISH_SEC_MAX + 1 }));
    expect(res.status).toBe(400);
  });

  it('400 when finishTimeSec is faster than any boat can sail the course', async () => {
    const res = await POST(makeReq({ ...base, finishTimeSec: FINISH_SEC_MIN - 0.1 }));
    expect(res.status).toBe(400);
    expect(mocks.db.insertRaceResult).not.toHaveBeenCalled();
  });

  it('400 when position is above totalBoats', async () => {
    const res = await POST(makeReq({ ...base, position: 5, totalBoats: 4 }));
    expect(res.status).toBe(400);
  });

  it('400 when missionId is not a short slug', async () => {
    expect((await POST(makeReq({ ...base, missionId: 'x'.repeat(41) }))).status).toBe(400);
    expect((await POST(makeReq({ ...base, missionId: '<img src=x>' }))).status).toBe(400);
    expect((await POST(makeReq({ ...base, missionId: 42 }))).status).toBe(400);
  });

  it('400 when score is above the cap (1e7)', async () => {
    const res = await POST(makeReq({ ...base, score: 1e7 + 1 }));
    expect(res.status).toBe(400);
  });

  it('400 when score is negative', async () => {
    const res = await POST(makeReq({ ...base, score: -5 }));
    expect(res.status).toBe(400);
  });

  it('400 when position is below 1', async () => {
    const res = await POST(makeReq({ ...base, position: 0 }));
    expect(res.status).toBe(400);
  });

  it('400 when position is above 1000', async () => {
    const res = await POST(makeReq({ ...base, position: 1001 }));
    expect(res.status).toBe(400);
  });

  it('400 when topSpeed is above 100', async () => {
    const res = await POST(makeReq({ ...base, topSpeed: 101 }));
    expect(res.status).toBe(400);
  });

  it('400 when tacks is above 1000', async () => {
    const res = await POST(makeReq({ ...base, tacks: 1001 }));
    expect(res.status).toBe(400);
  });

  it('200 when all bounded fields are at their valid edges', async () => {
    const res = await POST(makeReq({
      ...base,
      finishTimeSec: FINISH_SEC_MAX,
      score: 1e7,
      position: 1000,
      topSpeed: 100,
      tacks: 1000,
    }));
    expect(res.status).toBe(200);
  });

  it('200 when optional bounded fields are omitted (null/undefined allowed)', async () => {
    const res = await POST(makeReq(base));
    expect(res.status).toBe(200);
  });
});

describe('POST /api/race-result - happy path', () => {
  it('200 when payload is valid', async () => {
    const res = await POST(makeReq({
      finishTimeSec: 92.5,
      difficulty: 'medium',
      windStrength: 'medium',
      missionId: 'classic',
      position: 1,
      totalBoats: 4,
      tacks: 8,
      noGoEntries: 0,
      topSpeed: 7.4,
      score: 880,
    }));
    expect(res.status).toBe(200);
    expect(mocks.db.insertRaceResult).toHaveBeenCalledTimes(1);
    expect(mocks.db.insertEvent).toHaveBeenCalledWith(expect.objectContaining({
      evt: 'race.finish',
      path: '/game',
    }));
  });

  it('uses nicknameFallback when no player record exists', async () => {
    mocks.db.getPlayer.mockReturnValueOnce(null);
    const res = await POST(makeReq({
      finishTimeSec: 90,
      difficulty: 'easy',
      windStrength: 'light',
      nicknameFallback: 'Anon',
    }));
    expect(res.status).toBe(200);
  });

  it('sanitizes nicknameFallback like /api/player', async () => {
    mocks.db.getPlayer.mockReturnValueOnce(null);
    const res = await POST(makeReq({
      finishTimeSec: FINISH_SEC_MIN,
      difficulty: 'easy',
      windStrength: 'light',
      nicknameFallback: '  <b>Ola</b>"); DROP TABLE x;--' + 'z'.repeat(50),
    }));
    expect(res.status).toBe(200);
    const saved = (mocks.db.insertRaceResult.mock.calls[0] as unknown as [{ nickname: string }])[0].nickname;
    expect(saved).toMatch(/^[\p{L}\p{N}\-_ .]{2,20}$/u);
    expect(saved).not.toMatch(/[<>"();]/);
  });

  it('400 when nicknameFallback has nothing usable', async () => {
    mocks.db.getPlayer.mockReturnValueOnce(null);
    const res = await POST(makeReq({ finishTimeSec: 90, difficulty: 'easy', windStrength: 'light', nicknameFallback: '<>' }));
    expect(res.status).toBe(400);
  });
});
