import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { logInfo, logWarn, logError } from '@/lib/log';
import { rateLimitWithGlobal, rateLimitHeaders, checkUserDailyBudget, USER_DAILY_AI_LIMIT, clientIpKey } from '@/lib/rate-limit';
import { POSITION_POOL, VESSEL_POOL } from '@/app/radio/symulator/radioModel';
import { VOICE_KINDS, gradeVoiceTransmission, type VoiceKind } from './voiceGrading';

export const runtime = 'nodejs';
export const maxDuration = 60;

// ============================================================================
// /api/radio-voice - grades a spoken VHF transmission for the SRC simulator.
// Pipeline: audio -> OpenAI Whisper transcription -> deterministic checklist
// grading per message kind (MAYDAY / PAN-PAN / SECURITE / radio check /
// distress cancel). The checklist is code, not an LLM, so grading is stable,
// cheap and explainable; Whisper only converts speech to text.
// ============================================================================

const VOICE_LIMIT = 12;                    // recordings per hour per session
const VOICE_WINDOW_MS = 60 * 60 * 1000;
const VOICE_GLOBAL_LIMIT = 80;
const VOICE_GLOBAL_WINDOW_MS = 60 * 60 * 1000;
const MAX_AUDIO_BYTES = 4 * 1024 * 1024;   // ~45 s of opus is well under this

const KNOWN_KINDS = new Set<string>(VOICE_KINDS);

export async function POST(req: Request) {
  const started = Date.now();
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    logWarn('radio-voice.no-api-key');
    // 200 with fallback flag - the client switches to step-through PTT mode.
    return NextResponse.json({ fallback: true, error: 'Voice mode not configured' }, { status: 200 });
  }

  const jar = await cookies();
  const sid = jar.get('regatta_sid')?.value;
  const ip = clientIpKey(req); // last XFF hop - see rate-limit.ts (anti-spoofing)

  const daily = checkUserDailyBudget(sid ?? ip);
  if (!daily.ok) {
    return NextResponse.json(
      { error: `Dzienny limit ${USER_DAILY_AI_LIMIT} zapytan AI wyczerpany.`, retryAfterSec: Math.ceil(daily.resetMs / 1000) },
      { status: 429, headers: { 'Retry-After': String(Math.ceil(daily.resetMs / 1000)) } },
    );
  }

  const rlKey = 'radio-voice:' + (sid ?? ip);
  const rl = rateLimitWithGlobal({
    key: rlKey,
    perKeyLimit: VOICE_LIMIT,
    perKeyWindowMs: VOICE_WINDOW_MS,
    globalKey: 'radio-voice',
    globalLimit: VOICE_GLOBAL_LIMIT,
    globalWindowMs: VOICE_GLOBAL_WINDOW_MS,
  });
  if (!rl.ok) {
    logWarn('radio-voice.rate-limited', { resetMs: rl.resetMs, by: rl.rejectedBy });
    return NextResponse.json(
      { error: 'Zbyt wiele nagran. Sprobuj za godzine.', retryAfterSec: Math.ceil(rl.resetMs / 1000) },
      { status: 429, headers: { ...rateLimitHeaders(rl, VOICE_LIMIT), 'Retry-After': String(Math.ceil(rl.resetMs / 1000)) } },
    );
  }

  // Cheap size gate BEFORE buffering the body (formData() reads it fully).
  const contentLength = Number(req.headers.get('content-length') ?? 0);
  if (contentLength > MAX_AUDIO_BYTES + 64 * 1024) {
    return NextResponse.json({ error: 'Recording too long' }, { status: 413 });
  }

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return NextResponse.json({ error: 'Expected multipart/form-data' }, { status: 400 });
  }

  const kind = String(form.get('kind') ?? '');
  if (!KNOWN_KINDS.has(kind)) {
    return NextResponse.json({ error: 'Unknown message kind' }, { status: 400 });
  }
  // Scenario variant: which vessel identity the transmission should carry.
  const vesselIdx = Math.min(Math.max(0, Math.trunc(Number(form.get('vessel') ?? 0)) || 0), VESSEL_POOL.length - 1);
  const posIdx = Math.min(Math.max(0, Math.trunc(Number(form.get('position') ?? 0)) || 0), POSITION_POOL.length - 1);
  const pob = Math.min(Math.max(2, Math.trunc(Number(form.get('pob') ?? 4)) || 4), 6);
  const vessel = VESSEL_POOL[vesselIdx];
  const position = POSITION_POOL[posIdx];

  const audio = form.get('audio');
  if (!(audio instanceof Blob) || audio.size === 0) {
    return NextResponse.json({ error: 'Missing audio' }, { status: 400 });
  }
  if (audio.size > MAX_AUDIO_BYTES) {
    return NextResponse.json({ error: 'Recording too long' }, { status: 413 });
  }

  // --- Whisper transcription -------------------------------------------------
  let transcript = '';
  try {
    const wf = new FormData();
    const ext = audio.type.includes('mp4') ? 'm4a' : audio.type.includes('ogg') ? 'ogg' : 'webm';
    wf.append('file', audio, `ptt.${ext}`);
    wf.append('model', 'whisper-1');
    // Radio English with a fixed vocabulary - the prompt biases proper nouns.
    wf.append('language', 'en');
    wf.append('prompt', `Marine VHF radio transmission. MAYDAY, MAYDAY RELAY, PAN PAN, SECURITE, ALL STATIONS, THIS IS, ${vessel.name}, MMSI ${vessel.mmsi}, CALL SIGN ${vessel.call}, POSITION ${position.spoken}, ${pob} PERSONS ON BOARD, RADIO CHECK, MARINA GDYNIA, VTS ZATOKA GDANSKA, TRAINING SHIP, REGATTA FLEET, REQUEST A BERTH, REQUEST MEDICAL ADVICE, RECEIVED MAYDAY, NEPTUN, CANCEL MY DISTRESS ALERT, OVER, OUT.`);

    const res = await fetch('https://api.openai.com/v1/audio/transcriptions', {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}` },
      body: wf,
      signal: AbortSignal.timeout(45_000),
    });
    if (!res.ok) {
      const detail = await res.text().catch(() => '');
      logError('radio-voice.whisper-error', { status: res.status, detail: detail.slice(0, 200) });
      return NextResponse.json({ error: 'Transcription failed' }, { status: 502 });
    }
    const data = (await res.json()) as { text?: string };
    transcript = String(data.text ?? '');
  } catch (err) {
    logError('radio-voice.whisper-exception', { err: err instanceof Error ? err.message : 'unknown' });
    return NextResponse.json({ error: 'Transcription failed' }, { status: 502 });
  }

  const grade = gradeVoiceTransmission({
    kind: kind as VoiceKind,
    transcript,
    vessel,
    positionSpoken: position.spoken,
    pob,
  });

  logInfo('radio-voice.graded', { kind, score: grade.score, ms: Date.now() - started, chars: transcript.length });

  return NextResponse.json(grade);
}
