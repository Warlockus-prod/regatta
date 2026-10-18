// Contract: a client cannot reset a per-user limit by sending a fresh
// `regatta_sid` cookie, because the last-hop IP is counted too; a rejected
// request is counted in no layer.

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  clientIpKey,
  clientKeys,
  rateLimit,
  rateLimitClient,
  rateLimitWithGlobal,
  checkUserDailyBudget,
  IP_BUCKET_FACTOR,
  USER_DAILY_AI_LIMIT,
  USER_DAILY_AI_IP_LIMIT,
  __resetRateLimitsForTests,
} from './rate-limit';

const HOUR = 60 * 60 * 1000;

function req(xff?: string): Request {
  return new Request('http://localhost/api/x', {
    headers: xff ? { 'x-forwarded-for': xff } : {},
  });
}

beforeEach(() => __resetRateLimitsForTests());
afterEach(() => vi.useRealTimers());

describe('clientIpKey / clientKeys', () => {
  it('uses the LAST X-Forwarded-For hop (the one nginx appended)', () => {
    expect(clientIpKey(req('6.6.6.6, 203.0.113.7'))).toBe('203.0.113.7');
    expect(clientIpKey(req())).toBe('ip:unknown');
  });

  it('keys the user on sid when present and always keeps the IP', () => {
    expect(clientKeys(req('1.1.1.1, 203.0.113.7'), 'abc')).toEqual({ user: 'sid:abc', ip: 'ip:203.0.113.7' });
    expect(clientKeys(req('203.0.113.7'), undefined)).toEqual({ user: 'ip:203.0.113.7', ip: 'ip:203.0.113.7' });
  });

  it('without X-Forwarded-For (internal caller) there is no shared IP bucket', () => {
    expect(clientKeys(req(), 'abc')).toEqual({ user: 'sid:abc', ip: 'sid:abc' });
    let passed = 0;
    for (let i = 0; i < 100; i++) if (rateLimitClient(clientKeys(req(), 'mp-' + i), 'race-result', 5, HOUR).ok) passed++;
    expect(passed).toBe(100);
  });

  it('clips an oversized sid cookie', () => {
    const k = clientKeys(req('203.0.113.7'), 'x'.repeat(5000));
    expect(k.user.length).toBeLessThanOrEqual(4 + 64);
  });
});

describe('rateLimitClient', () => {
  it('a fresh sid per request is still capped by the IP bucket', () => {
    const limit = 5;
    let passed = 0;
    for (let i = 0; i < 100; i++) {
      const r = rateLimitClient(clientKeys(req('203.0.113.7'), 'sid-' + i), 'fb', limit, HOUR);
      if (r.ok) passed++;
      else expect(r.rejectedBy).toBe('per-ip');
    }
    expect(passed).toBe(limit * IP_BUCKET_FACTOR);
  });

  it('a stable sid hits its own limit first and does not use up the IP', () => {
    const keys = clientKeys(req('203.0.113.7'), 'stable');
    for (let i = 0; i < 5; i++) expect(rateLimitClient(keys, 'fb', 5, HOUR).ok).toBe(true);
    const r = rateLimitClient(keys, 'fb', 5, HOUR);
    expect(r.ok).toBe(false);
    expect(r.rejectedBy).toBe('per-key');
    // Rejected calls were not counted: the NAT neighbour still has 15 - 5 = 10.
    let neighbour = 0;
    for (let i = 0; i < 20; i++) if (rateLimitClient(clientKeys(req('203.0.113.7'), 'n-' + i), 'fb', 5, HOUR).ok) neighbour++;
    expect(neighbour).toBe(10);
  });

  it('different IPs have separate buckets', () => {
    for (let i = 0; i < 15; i++) rateLimitClient(clientKeys(req('203.0.113.7'), 's' + i), 'fb', 5, HOUR);
    expect(rateLimitClient(clientKeys(req('198.51.100.1'), 'other'), 'fb', 5, HOUR).ok).toBe(true);
  });

  it('without a sid only one bucket applies, at the per-user limit', () => {
    const keys = clientKeys(req('203.0.113.7'), undefined);
    let passed = 0;
    for (let i = 0; i < 20; i++) if (rateLimitClient(keys, 'fb', 5, HOUR).ok) passed++;
    expect(passed).toBe(5);
  });
});

describe('rateLimitWithGlobal with client keys', () => {
  it('cookie rotation is capped by the IP and does not burn the global budget', () => {
    const args = (i: number) => ({
      key: 'coach',
      client: clientKeys(req('203.0.113.7'), 'rot-' + i),
      perKeyLimit: 2, perKeyWindowMs: HOUR,
      globalKey: 'coach', globalLimit: 100, globalWindowMs: HOUR,
    });
    let passed = 0;
    for (let i = 0; i < 50; i++) if (rateLimitWithGlobal(args(i)).ok) passed++;
    expect(passed).toBe(2 * IP_BUCKET_FACTOR);
    // Global counted only the passed requests: 100 - 6 left for everyone else.
    let others = 0;
    for (let i = 0; i < 200; i++) {
      if (rateLimitWithGlobal({ ...args(0), client: clientKeys(req(`198.51.${i}.1`), 'o' + i) }).ok) others++;
    }
    expect(others).toBe(100 - 2 * IP_BUCKET_FACTOR);
  });

  it('keeps working for callers that pass a plain key', () => {
    const a = { key: 'og:1.2.3.4', perKeyLimit: 1, perKeyWindowMs: HOUR, globalKey: 'og', globalLimit: 10, globalWindowMs: HOUR };
    expect(rateLimitWithGlobal(a).ok).toBe(true);
    expect(rateLimitWithGlobal(a).rejectedBy).toBe('per-key');
  });
});

describe('checkUserDailyBudget', () => {
  it('caps a sid at the daily limit and an IP at the IP daily limit', () => {
    const stable = clientKeys(req('203.0.113.7'), 'daily');
    let passed = 0;
    for (let i = 0; i < USER_DAILY_AI_LIMIT + 10; i++) if (checkUserDailyBudget(stable).ok) passed++;
    expect(passed).toBe(USER_DAILY_AI_LIMIT);

    let rotated = 0;
    for (let i = 0; i < USER_DAILY_AI_IP_LIMIT + 50; i++) {
      if (checkUserDailyBudget(clientKeys(req('203.0.113.7'), 'r-' + i)).ok) rotated++;
    }
    expect(rotated).toBe(USER_DAILY_AI_IP_LIMIT - USER_DAILY_AI_LIMIT);
  });
});

describe('pruning', () => {
  it('a short-window limiter does not wipe hourly buckets', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-10-18T10:00:00Z'));
    for (let i = 0; i < 3; i++) rateLimit('coach:sid:a', 3, HOUR);
    expect(rateLimit('coach:sid:a', 3, HOUR).ok).toBe(false);
    // 10 minutes later a 60 s limiter triggers the periodic prune.
    vi.setSystemTime(new Date('2026-10-18T10:10:00Z'));
    rateLimit('gallery-like:sid:b', 60, 60_000);
    expect(rateLimit('coach:sid:a', 3, HOUR).ok).toBe(false);
    // After the hour the bucket frees up.
    vi.setSystemTime(new Date('2026-10-18T11:00:01Z'));
    expect(rateLimit('coach:sid:a', 3, HOUR).ok).toBe(true);
  });
});
