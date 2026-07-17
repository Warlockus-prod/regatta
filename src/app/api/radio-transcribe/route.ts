import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { logInfo, logWarn, logError } from '@/lib/log';
import { rateLimitWithGlobal, rateLimitHeaders, checkUserDailyBudget, USER_DAILY_AI_LIMIT, clientIpKey } from '@/lib/rate-limit';

// ============================================================================
// Transcription without grading: "what did the model actually hear?"
//
// Two things need this, and neither wants a checklist:
//
//  1. THE MICROPHONE CHECK. It used to show a level meter and nothing else -
//     a bouncing bar proves the mic is wired up, it does NOT prove the model can
//     understand you through it. A learner with a working meter and an unusable
//     microphone found that out only when a MAYDAY scored zero. Now the check
//     transcribes what you say and shows it back.
//
//  2. THE LIVE CONVERSATION trainer, where the turn is graded on the CLIENT
//     against the dialogue's own required elements (a pure function - see
//     dialogueGrading.ts). The server's only job is audio -> text.
//
// /api/radio-voice keeps doing transcription + scenario grading in one call; it
// is not replaced. This is the smaller, dumber sibling.
// ============================================================================

const LIMIT = 30;
const WINDOW_MS = 60 * 60 * 1000;
const GLOBAL_LIMIT = 200;
const GLOBAL_WINDOW_MS = 60 * 60 * 1000;
const MAX_AUDIO_BYTES = 4 * 1024 * 1024;

const STT_PRIMARY = process.env.OPENAI_STT_MODEL || 'gpt-4o-transcribe';
const STT_FALLBACK = 'whisper-1';

/** Marine vocabulary bias. gpt-4o-transcribe follows this as instruction-style
 *  context, which is most of why it beats whisper-1 on our audio. */
const PROMPT = 'Marine VHF radio transmission in radio English. MAYDAY, PAN PAN, SECURITE, ALL STATIONS, THIS IS, OVER, OUT, ROGER, RADIO CHECK, CHANNEL, WIND DANCER, ORKA, MARINA GDYNIA, VTS ZATOKA GDANSKA, POLISH RESCUE RADIO, MMSI, CALL SIGN, PERSONS ON BOARD, POSITION, DEGREES, MINUTES, NORTH, EAST.';

/** Neutral Polish fallback bias for lang='pl' when the client sends no prompt.
 *  The sternik oral trainer normally posts its own question-specific vocabulary. */
const PROMPT_PL = 'Egzamin ustny na patent sternika motorowodnego, odpowiedz po polsku. Prawo drogi, znaki nawigacyjne, kardynalne i boczne, bezpieczenstwo, przepisy, manewrowanie, locja, MAYDAY, pozycja, kanal 16.';

export async function POST(req: Request) {
  const started = Date.now();
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    logWarn('radio-transcribe.no-api-key');
    // 200 with a flag: the client falls back to the level meter / step-through
    // mode instead of pretending the recording failed.
    return NextResponse.json({ fallback: true }, { status: 200 });
  }

  const jar = await cookies();
  const sid = jar.get('regatta_sid')?.value;
  const ip = clientIpKey(req);

  const daily = checkUserDailyBudget(sid ?? ip);
  if (!daily.ok) {
    return NextResponse.json(
      { error: `Dzienny limit ${USER_DAILY_AI_LIMIT} zapytan AI wyczerpany.`, retryAfterSec: Math.ceil(daily.resetMs / 1000) },
      { status: 429, headers: { 'Retry-After': String(Math.ceil(daily.resetMs / 1000)) } },
    );
  }

  const rl = rateLimitWithGlobal({
    key: 'radio-transcribe:' + (sid ?? ip),
    perKeyLimit: LIMIT,
    perKeyWindowMs: WINDOW_MS,
    globalKey: 'radio-transcribe',
    globalLimit: GLOBAL_LIMIT,
    globalWindowMs: GLOBAL_WINDOW_MS,
  });
  if (!rl.ok) {
    return NextResponse.json(
      { error: 'Zbyt wiele nagran. Sprobuj za godzine.', retryAfterSec: Math.ceil(rl.resetMs / 1000) },
      { status: 429, headers: { ...rateLimitHeaders(rl, LIMIT), 'Retry-After': String(Math.ceil(rl.resetMs / 1000)) } },
    );
  }

  const contentLength = Number(req.headers.get('content-length') ?? 0);
  if (contentLength > MAX_AUDIO_BYTES + 64 * 1024) {
    return NextResponse.json({ error: 'Recording too long' }, { status: 413 });
  }

  const ct = req.headers.get('content-type') ?? '';
  if (!ct.includes('multipart/form-data')) {
    return NextResponse.json({ error: 'Expected multipart/form-data' }, { status: 400 });
  }

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return NextResponse.json({ error: 'Expected multipart/form-data' }, { status: 400 });
  }
  const audio = form.get('audio');
  if (!(audio instanceof Blob) || audio.size === 0) {
    return NextResponse.json({ error: 'Missing audio' }, { status: 400 });
  }
  if (audio.size > MAX_AUDIO_BYTES) {
    return NextResponse.json({ error: 'Recording too long' }, { status: 413 });
  }

  // Language + vocabulary bias. The radio trainers post English marine VHF and
  // send no `lang`, so this stays 'en' and the outgoing request is byte-for-byte
  // what it was before. The sternik oral trainer posts Polish and sends lang='pl',
  // which switches the STT language and prompt so Polish speech is not decoded
  // under an English model with English vocabulary bias.
  const sttLang = String(form.get('lang') ?? '') === 'pl' ? 'pl' : 'en';
  const clientPrompt = String(form.get('prompt') ?? '').trim();
  const sttPrompt = sttLang === 'pl' ? (clientPrompt || PROMPT_PL) : PROMPT;

  const ext = audio.type.includes('mp4') ? 'm4a' : audio.type.includes('ogg') ? 'ogg' : 'webm';

  async function transcribe(model: string): Promise<string> {
    const wf = new FormData();
    wf.append('file', audio as Blob, `ptt.${ext}`);
    wf.append('model', model);
    wf.append('language', sttLang);
    wf.append('prompt', sttPrompt);
    // No response_format: gpt-4o-transcribe rejects verbose_json, and the json
    // default is all we need.
    const res = await fetch('https://api.openai.com/v1/audio/transcriptions', {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}` },
      body: wf,
      signal: AbortSignal.timeout(45_000),
    });
    if (!res.ok) {
      const detail = await res.text().catch(() => '');
      throw new Error(`${model} ${res.status}: ${detail.slice(0, 160)}`);
    }
    const data = (await res.json()) as { text?: string };
    return String(data.text ?? '');
  }

  try {
    let transcript: string;
    try {
      transcript = await transcribe(STT_PRIMARY);
    } catch (err) {
      logWarn('radio-transcribe.primary-failed', { err: err instanceof Error ? err.message : 'unknown' });
      transcript = await transcribe(STT_FALLBACK);
    }
    logInfo('radio-transcribe.ok', { chars: transcript.length, ms: Date.now() - started });
    return NextResponse.json({ transcript }, { headers: rateLimitHeaders(rl, LIMIT) });
  } catch (err) {
    logError('radio-transcribe.failed', { err: err instanceof Error ? err.message : 'unknown' });
    return NextResponse.json({ error: 'Transcription failed' }, { status: 502 });
  }
}
