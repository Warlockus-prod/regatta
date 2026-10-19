// Contract for the six AI routes (coach, ai-chat, sternik-chat, radio-tts,
// radio-voice, radio-transcribe): each one charges the hourly per-user,
// per-IP and global limits and the shared daily AI budget in ONE atomic
// check. So:
// - rotating the `regatta_sid` cookie on one IP is admitted exactly
//   perKeyLimit x IP_BUCKET_FACTOR times, then refused;
// - a refused request never reaches OpenAI (fetch is not called);
// - hourly refusals do not spend the daily budget;
// - a spent daily budget gets the route's daily answer (radio-tts degrades to
//   200 {fallback:true}, the others 429) without calling OpenAI.

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

const mocks = vi.hoisted(() => ({ sid: 'ai-sid' as string | undefined }));

vi.mock('next/headers', () => ({
  cookies: async () => ({ get: (name: string) => (name === 'regatta_sid' && mocks.sid ? { value: mocks.sid } : undefined) }),
}));
vi.mock('@/lib/db', () => ({ insertEvent: vi.fn() }));
vi.mock('@/lib/log', () => ({ logInfo: vi.fn(), logWarn: vi.fn(), logError: vi.fn() }));

import { POST as coachPOST } from './coach/route';
import { POST as aiChatPOST } from './ai-chat/route';
import { POST as sternikChatPOST } from './sternik-chat/route';
import { POST as radioTtsPOST } from './radio-tts/route';
import { POST as radioVoicePOST } from './radio-voice/route';
import { POST as radioTranscribePOST } from './radio-transcribe/route';
import { VOICE_KINDS } from './radio-voice/voiceGrading';
import {
  __resetRateLimitsForTests,
  checkUserDailyBudget,
  clientKeys,
  IP_BUCKET_FACTOR,
  USER_DAILY_AI_LIMIT,
} from '@/lib/rate-limit';

const XFF = '6.6.6.6, 203.0.113.44';

const fetchMock = vi.fn(async (input: string | URL | Request) => {
  const url = String(input instanceof Request ? input.url : input);
  if (url.includes('/audio/speech')) {
    return new Response(new Uint8Array([1, 2, 3]), { status: 200, headers: { 'content-type': 'audio/mpeg' } });
  }
  if (url.includes('/audio/transcriptions')) {
    return Response.json({ text: 'MAYDAY MAYDAY MAYDAY this is WIND DANCER' });
  }
  const coaching = { overall: 'ok', score: 50, mistakes: [], strengths: [], nextGoalRu: 'x' };
  return Response.json({ choices: [{ message: { content: JSON.stringify(coaching) } }], usage: {} });
});

function jsonReq(path: string, body: unknown): Request {
  return new Request('http://localhost' + path, {
    method: 'POST',
    body: JSON.stringify(body),
    headers: { 'content-type': 'application/json', 'x-forwarded-for': XFF },
  });
}

function audioReq(path: string, fields: Record<string, string>): Request {
  const form = new FormData();
  for (const [k, v] of Object.entries(fields)) form.append(k, v);
  form.append('audio', new Blob([new Uint8Array(2048)], { type: 'audio/webm' }), 'ptt.webm');
  return new Request('http://localhost' + path, { method: 'POST', body: form, headers: { 'x-forwarded-for': XFF } });
}

const raceLog = {
  difficulty: 'easy',
  courseInfo: { windDirection: 0, windwardMark: { x: 400, y: 180 }, startY: 1050 },
  finishTime: 95,
  position: 1,
  totalBoats: 4,
  samples: Array.from({ length: 12 }, (_, i) => ({ t: i * 0.5, x: 400, y: 1050 - i * 10, heading: 45, twa: 45, speed: 5, lap: 0 })),
  events: [{ type: 'tack', t: 3, note: 'to-port-tack' }],
  lang: 'en',
};

interface RouteCase {
  name: string;
  post: (req: Request) => Promise<Response>;
  perKeyLimit: number;
  makeReq: () => Request;
  /** radio-tts answers a spent daily budget with 200 {fallback:true}. */
  dailyStatus: 200 | 429;
  /** The hourly per-IP refusal names the shared network. */
  sharedNetworkText: RegExp;
}

const ROUTES: RouteCase[] = [
  { name: 'coach', post: coachPOST, perKeyLimit: 30, makeReq: () => jsonReq('/api/coach', raceLog), dailyStatus: 429, sharedNetworkText: /shared network limit/ },
  { name: 'ai-chat', post: aiChatPOST, perKeyLimit: 20, makeReq: () => jsonReq('/api/ai-chat', { messages: [{ role: 'user', content: 'What is a tack?' }], lang: 'en' }), dailyStatus: 429, sharedNetworkText: /shared network limit/ },
  { name: 'sternik-chat', post: sternikChatPOST, perKeyLimit: 20, makeReq: () => jsonReq('/api/sternik-chat', { messages: [{ role: 'user', content: 'Co oznacza znak kardynalny N?' }] }), dailyStatus: 429, sharedNetworkText: /wspólny limit sieci/ },
  { name: 'radio-tts', post: radioTtsPOST, perKeyLimit: 60, makeReq: () => jsonReq('/api/radio-tts', { text: 'Mayday received, over.' }), dailyStatus: 200, sharedNetworkText: /shared network limit/ },
  { name: 'radio-voice', post: radioVoicePOST, perKeyLimit: 12, makeReq: () => audioReq('/api/radio-voice', { kind: VOICE_KINDS[0] }), dailyStatus: 429, sharedNetworkText: /wspólny limit sieci/ },
  { name: 'radio-transcribe', post: radioTranscribePOST, perKeyLimit: 30, makeReq: () => audioReq('/api/radio-transcribe', {}), dailyStatus: 429, sharedNetworkText: /wspólny limit sieci/ },
];

function dailyLeft(sid: string): number {
  const keys = clientKeys(new Request('http://localhost/', { headers: { 'x-forwarded-for': XFF } }), sid);
  let left = 0;
  for (let i = 0; i < USER_DAILY_AI_LIMIT; i++) if (checkUserDailyBudget(keys).ok) left++;
  return left;
}

beforeEach(() => {
  __resetRateLimitsForTests();
  vi.stubEnv('OPENAI_API_KEY', 'test-dummy-key');
  vi.stubGlobal('fetch', fetchMock);
  fetchMock.mockClear();
  mocks.sid = 'ai-sid';
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe.each(ROUTES)('$name POST limits', (route) => {
  it('rotating sids on one IP are admitted perKeyLimit x IP_BUCKET_FACTOR times, and a refusal never calls OpenAI', async () => {
    const cap = route.perKeyLimit * IP_BUCKET_FACTOR;
    let admitted = 0;
    let fetchAtCap = -1;
    for (let i = 0; i < cap + 5; i++) {
      mocks.sid = `rot-${route.name}-${i}`;
      const res = await route.post(route.makeReq());
      if (res.status === 429) {
        if (fetchAtCap < 0) fetchAtCap = fetchMock.mock.calls.length;
        const body = await res.json();
        expect(body.error).toMatch(route.sharedNetworkText);
      } else {
        expect(res.status).toBe(200);
        admitted++;
      }
    }
    expect(admitted).toBe(cap);
    // Every admitted request reached the (stubbed) provider ...
    expect(fetchAtCap).toBeGreaterThanOrEqual(cap);
    // ... and none of the refused ones did.
    expect(fetchMock.mock.calls.length).toBe(fetchAtCap);
  });

  it('hourly refusals leave the daily AI budget intact', async () => {
    mocks.sid = `stable-${route.name}`;
    for (let i = 0; i < route.perKeyLimit; i++) expect((await route.post(route.makeReq())).status).toBe(200);
    for (let i = 0; i < 30; i++) expect((await route.post(route.makeReq())).status).toBe(429);
    expect(dailyLeft(mocks.sid)).toBe(USER_DAILY_AI_LIMIT - route.perKeyLimit);
  });

  it('a spent daily budget gets the daily answer and never calls OpenAI', async () => {
    mocks.sid = `daily-${route.name}`;
    expect(dailyLeft(mocks.sid)).toBe(USER_DAILY_AI_LIMIT);
    const res = await route.post(route.makeReq());
    expect(res.status).toBe(route.dailyStatus);
    const body = await res.json();
    if (route.dailyStatus === 200) {
      expect(body).toEqual({ fallback: true });
    } else {
      expect(res.headers.get('retry-after')).toMatch(/^\d+$/);
      expect(String(body.error)).toMatch(/Daily|Dzienny/);
    }
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
