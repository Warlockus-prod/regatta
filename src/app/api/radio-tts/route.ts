import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { logInfo, logWarn, logError } from '@/lib/log';
import { rateLimitWithGlobal, rateLimitHeaders, checkUserDailyBudget, clientIpKey } from '@/lib/rate-limit';

// ============================================================================
// The coast station answers OUT LOUD.
//
// Until now the simulated station replied in text while the learner spoke into a
// microphone - which is the wrong way round: on the exam you are graded on how
// you handle what you HEAR, and a station that only ever writes at you cannot
// train that.
//
// gpt-4o-mini-tts is the only OpenAI speech model that takes an `instructions`
// field, and that is exactly the feature this needs: a coast-station operator is
// flat, clipped and procedural, not a warm audiobook narrator. The reply audio
// is then pushed through a radio-band filter in the browser (see StationVoice),
// so it arrives sounding like a radio, not like a podcast.
//
// The station's lines come from a fixed script pool, so the same phrase recurs
// often. Note this does NOT get deduped by the HTTP cache: browsers and shared
// caches do not cache POST responses by URL, so the Cache-Control header below
// is only a hint and dedupes nothing across sessions. The one real dedupe is the
// in-memory Map in stationVoice.ts, which lasts a single page load. Even so, the
// cost is a fraction of a cent in practice.
// ============================================================================

const TTS_MODEL = process.env.OPENAI_TTS_MODEL || 'gpt-4o-mini-tts';
const VOICE = process.env.OPENAI_TTS_VOICE || 'ash';

const TTS_LIMIT = 60;
const TTS_WINDOW_MS = 60 * 60 * 1000;
const TTS_GLOBAL_LIMIT = 400;
const TTS_GLOBAL_WINDOW_MS = 60 * 60 * 1000;

const MAX_CHARS = 400;

/** A radio operator, not a narrator. This is what makes it sound right. */
const STYLE = [
  'You are a Polish coast radio station operator on marine VHF.',
  'Delivery: clipped, flat, procedural. No warmth, no rising intonation, no drama.',
  'Even pace, short pauses between call signs and between groups of digits.',
  'Enunciate every digit separately. Speak proper nouns clearly.',
  'You are reading a routine radio transmission, not performing it.',
].join(' ');

export async function POST(req: Request) {
  const started = Date.now();
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    logWarn('radio-tts.no-api-key');
    // The trainer must keep working without a key: the client falls back to the
    // written reply it already shows.
    return NextResponse.json({ fallback: true }, { status: 200 });
  }

  const jar = await cookies();
  const sid = jar.get('regatta_sid')?.value;
  const ip = clientIpKey(req);

  // Per-user daily AI budget - the same ceiling radio-voice enforces. The hourly
  // rate limit below caps bursts; this caps the slow drip that would otherwise
  // let one session run up an unbounded daily TTS bill. On cap we degrade to the
  // written reply (fallback:true, 200) rather than 429, because that is the path
  // the client already handles for every other radio-tts failure - a 429 here
  // would surface as a broken button instead of a graceful text fallback.
  const daily = checkUserDailyBudget(sid ?? ip);
  if (!daily.ok) {
    logWarn('radio-tts.daily-budget', { resetMs: daily.resetMs });
    return NextResponse.json({ fallback: true }, { status: 200 });
  }

  const rl = rateLimitWithGlobal({
    key: 'radio-tts:' + (sid ?? ip),
    perKeyLimit: TTS_LIMIT,
    perKeyWindowMs: TTS_WINDOW_MS,
    globalKey: 'radio-tts',
    globalLimit: TTS_GLOBAL_LIMIT,
    globalWindowMs: TTS_GLOBAL_WINDOW_MS,
  });
  if (!rl.ok) {
    return NextResponse.json(
      { error: 'Too many requests' },
      { status: 429, headers: { ...rateLimitHeaders(rl, TTS_LIMIT), 'Retry-After': String(Math.ceil(rl.resetMs / 1000)) } },
    );
  }

  let text = '';
  try {
    const body = (await req.json()) as { text?: unknown };
    text = typeof body.text === 'string' ? body.text.trim() : '';
  } catch {
    return NextResponse.json({ error: 'Bad request' }, { status: 400 });
  }
  if (!text) return NextResponse.json({ error: 'Missing text' }, { status: 400 });
  if (text.length > MAX_CHARS) text = text.slice(0, MAX_CHARS);

  try {
    const res = await fetch('https://api.openai.com/v1/audio/speech', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: TTS_MODEL,
        voice: VOICE,
        input: text,
        instructions: STYLE,
        response_format: 'mp3',
      }),
      signal: AbortSignal.timeout(30_000),
    });

    if (!res.ok) {
      const detail = await res.text().catch(() => '');
      logError('radio-tts.error', { status: res.status, detail: detail.slice(0, 200) });
      return NextResponse.json({ fallback: true }, { status: 200 });
    }

    const audio = await res.arrayBuffer();
    logInfo('radio-tts.ok', { chars: text.length, ms: Date.now() - started });

    return new NextResponse(audio, {
      status: 200,
      headers: {
        'Content-Type': 'audio/mpeg',
        // Retained only as a hint. POST responses are not HTTP-cacheable by URL,
        // so this does not dedupe across sessions; the only dedupe is the
        // in-memory Map in stationVoice.ts (per page load), not this header.
        'Cache-Control': 'public, max-age=86400, immutable',
      },
    });
  } catch (err) {
    logError('radio-tts.exception', { err: err instanceof Error ? err.message : 'unknown' });
    return NextResponse.json({ fallback: true }, { status: 200 });
  }
}
