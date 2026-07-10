import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { logInfo, logWarn, logError } from '@/lib/log';
import { rateLimitWithGlobal, rateLimitHeaders, checkUserDailyBudget, USER_DAILY_AI_LIMIT, clientIpKey } from '@/lib/rate-limit';
import { VESSEL_POOL, type Vessel } from '@/app/radio/symulator/radioModel';

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

interface Check {
  id: string;
  /** label shown to the user (PL - exam language). */
  label: string;
  /** at least `min` regex matches must be present in the transcript. */
  re: RegExp;
  min?: number;
}

// Vessel-aware regex builders - the simulator randomizes the vessel identity
// per run, so the name / MMSI / call-sign checks adapt to the chosen vessel
// (VESSEL_POOL is the shared single source of truth with the client).
function escRe(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
function nameRe(v: Vessel): RegExp {
  return new RegExp(v.name.toLowerCase().split(/\s+/).map(escRe).join('\\s?'));
}
function identRe(v: Vessel): RegExp {
  const mmsi = v.mmsi.split('').map(escRe).join(' ?');
  const call = v.call.toLowerCase().split(/\s+/).map((w) => w.split('').map(escRe).join(' ?')).join(' ?');
  return new RegExp(`(${mmsi}|mmsi|call\\s?sign|${call})`);
}

// Normalized transcript: lowercase, punctuation stripped (see normalize()).
function buildChecklists(v: Vessel): Record<string, Check[]> {
  return {
    'mayday-fire': [
      { id: 'mayday3', label: 'MAYDAY x3', re: /may\s?day/g, min: 3 },
      { id: 'thisis', label: 'THIS IS + nazwa', re: /this is/ },
      { id: 'name', label: `nazwa jednostki (${v.name})`, re: nameRe(v) },
      { id: 'ident', label: 'MMSI lub znak wywolawczy', re: identRe(v) },
      { id: 'position', label: 'pozycja', re: /(position|54|north|latitude)/ },
      { id: 'nature', label: 'rodzaj zagrozenia (fire)', re: /(fire|explosion|burning)/ },
      { id: 'assist', label: 'potrzebna pomoc', re: /(assist|help|require)/ },
      { id: 'persons', label: 'liczba osob', re: /(person|people|crew|souls|two|three|four|five|six)/ },
      { id: 'over', label: 'OVER na koncu', re: /over\s*$/ },
    ],
    'panpan-mob': [
      { id: 'panpan3', label: 'PAN PAN x3', re: /pan\s?[- ]?pan/g, min: 3 },
      { id: 'allstations', label: 'ALL STATIONS', re: /all (stations|ships)/ },
      { id: 'thisis', label: 'THIS IS + nazwa', re: /this is/ },
      { id: 'name', label: `nazwa jednostki (${v.name})`, re: nameRe(v) },
      { id: 'position', label: 'pozycja', re: /(position|54|north)/ },
      { id: 'mob', label: 'czlowiek za burta', re: /(man overboard|person in (the )?water|overboard)/ },
      { id: 'request', label: 'czego oczekujesz (keep clear...)', re: /(keep clear|wake|stand by|assist)/ },
      { id: 'over', label: 'OVER na koncu', re: /over\s*$/ },
    ],
    'panpan-engine': [
      { id: 'panpan3', label: 'PAN PAN x3', re: /pan\s?[- ]?pan/g, min: 3 },
      { id: 'allstations', label: 'ALL STATIONS', re: /all (stations|ships)/ },
      { id: 'thisis', label: 'THIS IS + nazwa', re: /this is/ },
      { id: 'name', label: `nazwa jednostki (${v.name})`, re: nameRe(v) },
      { id: 'position', label: 'pozycja', re: /(position|54|north)/ },
      { id: 'nature', label: 'awaria / dryf', re: /(engine|breakdown|drift|disabled)/ },
      { id: 'tow', label: 'prosba o holowanie', re: /(tow|assistance|assist)/ },
      { id: 'over', label: 'OVER na koncu', re: /over\s*$/ },
    ],
    'securite-hazard': [
      { id: 'securite3', label: 'SECURITE x3', re: /(securite|security|say-?curitay)/g, min: 3 },
      { id: 'allstations', label: 'ALL STATIONS', re: /all (stations|ships)/ },
      { id: 'thisis', label: 'THIS IS + nazwa', re: /this is/ },
      { id: 'hazard', label: 'opis niebezpieczenstwa (kontener)', re: /(container|hazard|obstruction|submerged|debris)/ },
      { id: 'position', label: 'pozycja', re: /(position|54|north)/ },
      { id: 'out', label: 'OUT na koncu (nie OVER)', re: /out\s*$/ },
    ],
    'radio-check': [
      { id: 'station', label: 'stacja wywolywana (Marina Gdynia)', re: /(marina|gdynia)/ },
      { id: 'thisis', label: 'THIS IS + nazwa', re: /this is/ },
      { id: 'name', label: `nazwa jednostki (${v.name})`, re: nameRe(v) },
      { id: 'check', label: 'RADIO CHECK', re: /radio check|how do you read/ },
      { id: 'over', label: 'OVER na koncu', re: /over\s*$/ },
    ],
    'cancel-false': [
      { id: 'allstations', label: 'ALL STATIONS x3', re: /all (stations|ships)/g, min: 2 },
      { id: 'thisis', label: 'THIS IS + nazwa', re: /this is/ },
      { id: 'name', label: `nazwa jednostki (${v.name})`, re: nameRe(v) },
      { id: 'cancel', label: 'CANCEL MY DISTRESS ALERT', re: /cancel (my )?distress/ },
      { id: 'when', label: 'data / czas UTC', re: /(utc|time|today|14)/ },
      { id: 'end', label: 'zakonczenie (OUT)', re: /(out|over)\s*$/ },
    ],
  };
}
const KNOWN_KINDS = new Set(['mayday-fire', 'panpan-mob', 'panpan-engine', 'securite-hazard', 'radio-check', 'cancel-false']);

function normalize(t: string): string {
  return t
    .toLowerCase()
    .replace(/[.,!?;:'"()\-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

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
  const vessel = VESSEL_POOL[vesselIdx];
  const checklist = buildChecklists(vessel)[kind];

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
    wf.append('prompt', `Marine VHF radio transmission. MAYDAY, PAN PAN, SECURITE, ALL STATIONS, THIS IS, ${vessel.name}, MMSI ${vessel.mmsi}, CALL SIGN ${vessel.call}, POSITION 54 30.5 NORTH 018 45.2 EAST, RADIO CHECK, CANCEL MY DISTRESS ALERT, OVER, OUT.`);

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

  // --- deterministic grading ---------------------------------------------------
  const norm = normalize(transcript);
  const checks = checklist.map((c) => {
    const matches = norm.match(c.re);
    const count = matches ? (c.re.global ? matches.length : 1) : 0;
    return { id: c.id, label: c.label, ok: count >= (c.min ?? 1) };
  });
  const okCount = checks.filter((c) => c.ok).length;
  const score = Math.round((okCount / checks.length) * 100);

  logInfo('radio-voice.graded', { kind, score, ms: Date.now() - started, chars: transcript.length });

  return NextResponse.json({ transcript, checks, score });
}
