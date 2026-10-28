// Contract tests for /api/replay POST: size caps on every client blob,
// counted in UTF-8 bytes; samples and events rebuilt from numeric allow-lists
// so string padding is never stored; a short slug for missionId, a sanitized
// nickname, a plausible time; per-session, per-IP and site-wide hourly caps.

import { describe, it, expect, beforeEach, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  sid: 'sid-replay-1' as string | undefined,
  db: {
    insertReplay: vi.fn<(r: Record<string, unknown>) => string | null>(() => 'ABC123'),
    getPlayer: vi.fn(() => null as { nickname: string } | null),
  },
}));

vi.mock('next/headers', () => ({
  cookies: async () => ({ get: () => (mocks.sid ? { value: mocks.sid } : undefined) }),
}));
vi.mock('@/lib/db', () => mocks.db);
vi.mock('@/lib/log', () => ({ logInfo: vi.fn(), logWarn: vi.fn() }));
vi.mock('@/lib/rate-limit', async importOriginal => {
  const actual = await importOriginal<typeof import('@/lib/rate-limit')>();
  return { ...actual, rateLimitGlobal: vi.fn(actual.rateLimitGlobal) };
});

import { POST } from './route';
import { __resetRateLimitsForTests, rateLimitGlobal } from '@/lib/rate-limit';
import { defaultReplayCourse } from '@/lib/race-replay';
import { LEGACY_RACE_CONTEXT, PHYSICAL_RACE_PROFILES, physicalRaceContext } from '@/lib/race-context';
import { makePhysicalRaceCourse } from '@/lib/race-courses';

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
  vi.mocked(rateLimitGlobal).mockClear();
  mocks.sid = 'sid-replay-1';
  mocks.db.insertReplay.mockReset().mockReturnValue('ABC123');
  mocks.db.getPlayer.mockReset().mockReturnValue(null);
});

describe('POST /api/replay', () => {
  it('200 on a normal replay', async () => {
    const res = await POST(makeReq({ ...base, missionId: 'clean-laps', finishTimeSec: 95.2, events: [{ type: 'tack', t: 3 }] }));
    expect(res.status).toBe(200);
    expect(saved()).toMatchObject({ missionId: 'clean-laps', finishTimeSec: 95.2 });
    expect(saved().course).toBeNull();
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

  it('keeps exact start/finish timestamps, wind, deployment and bounded metadata', async () => {
    const finish = 89 + 1 / 30;
    const trim = { mainSheet: .3, jibSheet: .4, reef: .2, jibFurl: 1, mainHoisted: false, pad: 'drop' };
    const track = [samples[0], { ...samples[1], trim, windDir: 358 }, { ...samples[2], t: finish, lap: 2, trim, windDir: 2 }];
    const course = { ...defaultReplayCourse(), padding: 'drop' };
    const res = await POST(makeReq({ ...base, samples: track, course, finishTimeSec: finish, mode: 'pro', penaltySeconds: 5, events: [{ type: 'finish', t: finish }] }));
    expect(res.status).toBe(200);
    const result = saved();
    expect(result.finishTimeSec).toBe(finish);
    expect(result.samples).toEqual([samples[0], { ...samples[1], trim: { mainSheet: .3, jibSheet: .4, reef: .2, jibFurl: 1, mainHoisted: false }, windDir: 358 },
      { ...samples[2], t: finish, lap: 2, trim: { mainSheet: .3, jibSheet: .4, reef: .2, jibFurl: 1, mainHoisted: false }, windDir: 2 }]);
    expect(result.events).toEqual([{ type: 'finish', t: finish }]);
    expect(result.course).toEqual({ ...defaultReplayCourse(), replayMetadata: { schema: 1, mode: 'pro', penaltySeconds: 5 } });
  });

  it('refuses malformed new fields and non-monotone tracks without storing them', async () => {
    for (const patch of [
      { samples: samples.map(s => ({ ...s, windDir: 361 })) },
      { samples: samples.map(s => ({ ...s, trim: { mainSheet: 2 } })) },
      { samples: [...samples].reverse() }, { mode: 'mixed' }, { penaltySeconds: -5 }, { penaltySeconds: 3601 },
      { course: { ...defaultReplayCourse(), finishLine: { a: { x: 'bad', y: 0 }, b: { x: 0, y: 0 } } } },
    ]) expect((await POST(makeReq({ ...base, ...patch }))).status).toBe(400);
    expect(mocks.db.insertReplay).not.toHaveBeenCalled();
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

  it.each(PHYSICAL_RACE_PROFILES)("422 for a canonical %s physical replay before any global budget or DB access", async profile => {
    const response = await POST(makeReq({ ...base, mode: "simple", raceContext: physicalRaceContext(profile), course: makePhysicalRaceCourse(profile) }));
    expect(response.status).toBe(422);
    expect(await response.json()).toEqual({ error: "Physical race sharing is not enabled" });
    expect(rateLimitGlobal).not.toHaveBeenCalled();
    expect(mocks.db.getPlayer).not.toHaveBeenCalled();
    expect(mocks.db.insertReplay).not.toHaveBeenCalled();
  });

  it("rejects unknown or conflicting nested context even when top-level mode or context is valid", async () => {
    const physical = physicalRaceContext("short");
    const course = makePhysicalRaceCourse("short");
    for (const raceContext of [{ ...physical, geometryRevision: 2 }, { ...physical, model: "future-model" }, { ...physical, coordinateUnits: "pixels" }]) {
      for (const patch of [{ mode: "pro" }, { raceContext: LEGACY_RACE_CONTEXT }]) {
        const response = await POST(makeReq({ ...base, ...patch, course: { ...course, replayMetadata: { raceContext } } }));
        expect(response.status).toBe(400);
      }
    }
    expect((await POST(makeReq({ ...base, raceContext: physical,
      course: { ...course, replayMetadata: { raceContext: physicalRaceContext("long") } } }))).status).toBe(400);
    expect(rateLimitGlobal).not.toHaveBeenCalled();
    expect(mocks.db.getPlayer).not.toHaveBeenCalled();
    expect(mocks.db.insertReplay).not.toHaveBeenCalled();
  });

  it("refuses mismatched raw physical geometry rather than hiding it behind the emission gate or normalization", async () => {
    const course = makePhysicalRaceCourse("short");
    const courses = [
      defaultReplayCourse(),
      { ...course, finishLine: undefined },
      ...["starboard", "future-rounding", null, 3].map(roundSide => ({ ...course,
        marks: course.marks.map((mark, index) => index ? mark : { ...mark, roundSide }) })),
    ];
    for (const value of courses) {
      expect((await POST(makeReq({ ...base, mode: "pro", raceContext: physicalRaceContext("short"), course: value }))).status).toBe(400);
    }
    expect(rateLimitGlobal).not.toHaveBeenCalled();
    expect(mocks.db.insertReplay).not.toHaveBeenCalled();
  });

  it("does not repair, drop or clamp invalid physical samples before returning a validation error", async () => {
    const physical = { ...base, mode: "pro", raceContext: physicalRaceContext("short"), course: makePhysicalRaceCourse("short") };
    for (const patch of [{ heading: "bad" }, { twa: 360 }, { speed: -1 }, { lap: 99 }, { x: 801 }, { y: 1201 }, { t: "bad" }]) {
      expect((await POST(makeReq({ ...physical, samples: [{ ...samples[0], ...patch }, ...samples.slice(1)] }))).status).toBe(400);
    }
    for (const finishTimeSec of [1, 10, -1, "invalid"]) {
      expect((await POST(makeReq({ ...physical, finishTimeSec }))).status).toBe(400);
    }
    expect((await POST(makeReq({ ...physical, samples: samples.map(sample => ({ ...sample, t: sample.t + 1 })) }))).status).toBe(400);
    const complete = samples.map((sample, index) => index === samples.length - 1 ? { ...sample, lap: 2 } : sample);
    expect((await POST(makeReq({ ...physical, samples: complete, finishTimeSec: 1 }))).status).toBe(422);
    expect((await POST(makeReq({ ...physical, finishTimeSec: null }))).status).toBe(422);
    expect(rateLimitGlobal).not.toHaveBeenCalled();
    expect(mocks.db.insertReplay).not.toHaveBeenCalled();
  });

  it.each(["top", "nested"])("preserves explicit context-only legacy metadata from the %s location", async location => {
    const course = defaultReplayCourse();
    const payload = location === "top"
      ? { ...base, course, raceContext: { ...LEGACY_RACE_CONTEXT, padding: "drop" } }
      : { ...base, course: { ...course, replayMetadata: { raceContext: { ...LEGACY_RACE_CONTEXT, padding: "drop" } } } };
    expect((await POST(makeReq(payload))).status).toBe(200);
    expect(saved().course).toEqual({ ...course, replayMetadata: { schema: 1, mode: "simple", penaltySeconds: 0, raceContext: LEGACY_RACE_CONTEXT } });
  });

  it("preserves nested legacy Pro metadata without requiring duplicate top-level fields", async () => {
    const course = { ...defaultReplayCourse(), replayMetadata: { mode: "pro", penaltySeconds: 5 } };
    expect((await POST(makeReq({ ...base, course }))).status).toBe(200);
    expect(saved().course).toEqual({ ...defaultReplayCourse(), replayMetadata: { schema: 1, mode: "pro", penaltySeconds: 5 } });
  });

  it("checks the actual stored UTF-8 course size after translated-label rebuilding", async () => {
    const course = { ...defaultReplayCourse(), marks: Array.from({ length: 20 }, () => ({
      pos: { x: 400, y: 180 }, radius: 14, type: "windward", label: "€".repeat(140),
    })) };
    expect(Buffer.byteLength(JSON.stringify(course))).toBeLessThan(16_000);
    expect((await POST(makeReq({ ...base, course, raceContext: LEGACY_RACE_CONTEXT }))).status).toBe(400);
    expect(rateLimitGlobal).not.toHaveBeenCalled();
    expect(mocks.db.insertReplay).not.toHaveBeenCalled();
  });
});
