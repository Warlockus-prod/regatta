import Anthropic from '@anthropic-ai/sdk';
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { logInfo, logWarn, logError } from '@/lib/log';
import { rateLimitWithGlobal, rateLimitHeaders } from '@/lib/rate-limit';

export const runtime = 'nodejs';
export const maxDuration = 30;

const COACH_LIMIT = 30;
const COACH_WINDOW_MS = 60 * 60 * 1000;
// Global cap: total AI coach requests across ALL users per hour.
// Protects ANTHROPIC_API_KEY wallet from denial-of-wallet even if the
// per-sid limit is bypassed by cookie rotation.
const COACH_GLOBAL_LIMIT = 300;
const COACH_GLOBAL_WINDOW_MS = 60 * 60 * 1000;

// System prompts per language - cached so repeated requests are cheap.
// The output JSON field names stay `titleRu / explanationRu / fixRu / nextGoalRu`
// for backward compatibility with the client shape - the STRING VALUES inside
// them are in the requested language. Claude is noticeably more fluent when
// the system prompt itself is in the target language, so we maintain three.
type CoachLang = 'ru' | 'en' | 'pl';
const SYSTEM_BY_LANG: Record<CoachLang, string> = {
  ru: `Ты опытный тренер по парусному спорту. Тебе присылают лог гонки: позиции яхты игрока каждые 0.5 секунды, плюс события (повороты, прохождение знаков, финиш). Трасса - windward/leeward: нужно обогнуть верхний знак и вернуться к финишу. Ветер дует сверху (с севера, направление 0°).

Твоя задача - проанализировать как игрок прошёл гонку и дать конкретные советы. Отвечай ТОЛЬКО валидным JSON в формате:

{
  "overall": "Короткая оценка гонки (1-2 предложения на русском)",
  "score": 0..100,
  "mistakes": [
    {
      "timeStart": число (секунды от старта),
      "timeEnd": число,
      "severity": "minor" | "major",
      "titleRu": "Короткое название ошибки (3-6 слов)",
      "explanationRu": "Что пошло не так и почему (2-3 предложения)",
      "fixRu": "Как нужно было сделать (1-2 предложения)"
    }
  ],
  "strengths": ["Короткая похвала 1", "Короткая похвала 2"],
  "nextGoalRu": "Одна конкретная цель на следующую гонку"
}

Правила:
- mistakes: максимум 3 самых важных
- Говори конкретно, с цифрами из лога (углы, время, расстояния)
- Русский язык, дружелюбный но профессиональный тон
- Если игрок играл хорошо - скажи об этом прямо, не выдумывай ошибки
- Анализируй: попадание в мёртвую зону (TWA<30°), плохие галсы при лавировке, огибание знаков широко, лишние повороты, падение скорости
- ТИПОГРАФИКА: никогда не используй длинное тире (U+2014) или среднее тире (U+2013). Пиши обычный дефис "-".`,

  en: `You are an experienced sailing coach. You receive a race log: player yacht positions every 0.5 seconds, plus events (tacks, mark roundings, finish). The course is windward/leeward: round the upwind mark and return to the finish. Wind blows from the top (north, bearing 0).

Your job: analyse the race and give concrete advice. Respond ONLY with valid JSON in this shape:

{
  "overall": "Short race assessment (1-2 sentences in English)",
  "score": 0..100,
  "mistakes": [
    {
      "timeStart": number (seconds from start),
      "timeEnd": number,
      "severity": "minor" | "major",
      "titleRu": "Short name of mistake (3-6 words, in English)",
      "explanationRu": "What went wrong and why (2-3 sentences, in English)",
      "fixRu": "What should have been done (1-2 sentences, in English)"
    }
  ],
  "strengths": ["Short compliment 1", "Short compliment 2"],
  "nextGoalRu": "One concrete goal for the next race (in English)"
}

(Note: JSON field names are kept in Russian suffix form for client compatibility. The string values inside must be in English.)

Rules:
- mistakes: at most 3 most important
- Be concrete, with numbers from the log (angles, times, distances)
- Friendly but professional tone
- If the player sailed well - say it directly, don't invent mistakes
- Analyse: no-go zone entries (TWA<30°), bad tacks, wide mark roundings, extra tacks, speed drops
- TYPOGRAPHY: never use an em-dash (U+2014) or en-dash (U+2013). Use a plain hyphen "-".`,

  pl: `Jestes doswiadczonym trenerem zeglarskim. Dostajesz log regat: pozycje jachtu gracza co 0.5 sekundy, plus zdarzenia (zwroty, okrazenia znakow, meta). Trasa windward/leeward: oplyn znak nawietrzny i wroc do mety. Wiatr wieje z gory (z polnocy, kierunek 0°).

Twoje zadanie: przeanalizuj regaty i daj konkretne rady. Odpowiadaj WYLACZNIE poprawnym JSONem w formacie:

{
  "overall": "Krotka ocena regat (1-2 zdania po polsku)",
  "score": 0..100,
  "mistakes": [
    {
      "timeStart": liczba (sekundy od startu),
      "timeEnd": liczba,
      "severity": "minor" | "major",
      "titleRu": "Krotka nazwa bledu (3-6 slow, po polsku)",
      "explanationRu": "Co poszlo nie tak i dlaczego (2-3 zdania, po polsku)",
      "fixRu": "Jak nalezalo zrobic (1-2 zdania, po polsku)"
    }
  ],
  "strengths": ["Krotka pochwala 1", "Krotka pochwala 2"],
  "nextGoalRu": "Jeden konkretny cel na kolejne regaty (po polsku)"
}

(Uwaga: nazwy pol JSON zachowano w rosyjskim sufiksie dla zgodnosci z klientem. Wartosci wewnatrz musza byc po polsku.)

Zasady:
- mistakes: maksymalnie 3 najwazniejsze
- Mow konkretnie, z liczbami z logu (katy, czasy, odleglosci)
- Ton przyjazny ale profesjonalny
- Jesli gracz plynal dobrze - powiedz to wprost, nie wymyslaj bledow
- Analizuj: wejscia w strefe martwa (TWA<30°), zle halsy przy halsowaniu, szerokie oplywanie znakow, zbedne zwroty, spadki predkosci
- TYPOGRAFIA: nigdy nie uzywaj dlugiej pauzy (U+2014) ani polpauzy (U+2013). Uzywaj zwyklego dywizu "-".`,
};

interface LogEvent {
  type: 'mark-rounded' | 'tack' | 'finish' | 'no-go-entered' | 'start';
  t: number;
  note?: string;
}

interface LogSample {
  t: number;
  x: number;
  y: number;
  heading: number;
  twa: number;
  speed: number;
  lap: number;
}

interface RaceLog {
  difficulty: string;
  courseInfo: { windDirection: number; windwardMark: { x: number; y: number }; startY: number };
  finishTime: number | null;
  position: number;
  totalBoats: number;
  samples: LogSample[];
  events: LogEvent[];
  /**
   * Language for coaching output. Supported end-to-end: 'ru' / 'en' / 'pl'.
   * If the client sends 'es' / 'fr' / 'de' / 'it', we fall back to 'en'
   * (the string is still tagged in the request for telemetry).
   */
  lang?: 'ru' | 'en' | 'pl' | 'es' | 'fr' | 'de' | 'it';
}

export async function POST(req: Request) {
  const started = Date.now();
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    logWarn('coach.no-api-key');
    return NextResponse.json(
      { error: 'API key not configured', fallback: true },
      { status: 200 },
    );
  }

  const jar = await cookies();
  const sid = jar.get('regatta_sid')?.value;
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0] ?? 'ip:unknown';
  const rlKey = 'coach:' + (sid ?? ip);
  const rl = rateLimitWithGlobal({
    key: rlKey,
    perKeyLimit: COACH_LIMIT,
    perKeyWindowMs: COACH_WINDOW_MS,
    globalKey: 'coach',
    globalLimit: COACH_GLOBAL_LIMIT,
    globalWindowMs: COACH_GLOBAL_WINDOW_MS,
  });
  if (!rl.ok) {
    logWarn('coach.rate-limited', { key: rlKey.slice(0, 16), resetMs: rl.resetMs, by: rl.rejectedBy });
    return NextResponse.json(
      { error: 'Too many coach requests', fallback: true, retryAfterSec: Math.ceil(rl.resetMs / 1000) },
      { status: 429, headers: { ...rateLimitHeaders(rl, COACH_LIMIT), 'Retry-After': String(Math.ceil(rl.resetMs / 1000)) } },
    );
  }

  let log: RaceLog;
  try {
    log = await req.json();
  } catch (err) {
    logError('coach.invalid-json', { err: err instanceof Error ? err.message : 'unknown' });
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  // Map the 7-language frontend lang down to one of our 3 coach system prompts.
  // RU stays RU. PL stays PL. Everything else (including ES/FR/DE/IT) -> EN.
  // This keeps foreign-lang users getting an English race analysis instead of
  // the rule-based fallback silently Russianified.
  const lang: CoachLang =
    log.lang === 'ru' ? 'ru'
    : log.lang === 'pl' ? 'pl'
    : 'en';

  logInfo('coach.request', {
    difficulty: log.difficulty,
    position: log.position,
    totalBoats: log.totalBoats,
    samples: log.samples?.length ?? 0,
    events: log.events?.length ?? 0,
    finishTime: log.finishTime,
    lang,
  });

  // Downsample samples to keep prompt small (~1 sample per 2 seconds)
  const downsampled = log.samples.filter((_, i) => i % 4 === 0);

  // User-message uses English labels (universal, model parses them identically
  // across languages; only the coach's *output* language is driven by the
  // system prompt chosen below).
  const userMsg = `Race finished.

Difficulty: ${log.difficulty}
Place: ${log.position} of ${log.totalBoats}
Finish time: ${log.finishTime ? log.finishTime.toFixed(1) + ' s' : 'did not finish'}
Wind: bearing ${log.courseInfo.windDirection} (from north)
Windward mark: x=${log.courseInfo.windwardMark.x}, y=${log.courseInfo.windwardMark.y}
Start/finish line: y=${log.courseInfo.startY}

Events (${log.events.length}):
${log.events.map((e) => `  t=${e.t.toFixed(1)}s ${e.type}${e.note ? ' ' + e.note : ''}`).join('\n')}

Position log (every ~2 s, ${downsampled.length} rows):
${downsampled.map((s) => `t=${s.t.toFixed(1)} pos=(${s.x.toFixed(0)},${s.y.toFixed(0)}) heading=${s.heading.toFixed(0)}deg TWA=${s.twa.toFixed(0)}deg speed=${s.speed.toFixed(1)} lap=${s.lap}`).join('\n')}

Analyse how the player did. Return ONLY JSON, with no commentary before or after.`;

  try {
    const client = new Anthropic({ apiKey });
    const response = await client.messages.create({
      model: 'claude-haiku-4-5',
      max_tokens: 1500,
      system: [
        {
          type: 'text',
          text: SYSTEM_BY_LANG[lang],
          cache_control: { type: 'ephemeral' },
        },
      ],
      messages: [{ role: 'user', content: userMsg }],
    });

    const textBlock = response.content.find((b) => b.type === 'text');
    if (!textBlock || textBlock.type !== 'text') {
      logError('coach.no-text-response', { ms: Date.now() - started });
      return NextResponse.json({ error: 'No text response' }, { status: 500 });
    }

    // Try to parse JSON from response (may include ```json fences)
    let jsonText = textBlock.text.trim();
    const fence = jsonText.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
    if (fence) jsonText = fence[1];

    let parsed;
    try {
      parsed = JSON.parse(jsonText);
    } catch (err) {
      logError('coach.non-json', {
        ms: Date.now() - started,
        err: err instanceof Error ? err.message : 'unknown',
        rawPreview: textBlock.text.slice(0, 200),
      });
      return NextResponse.json({
        error: 'Model returned non-JSON',
        raw: textBlock.text,
      }, { status: 500 });
    }

    // Enforce typography rule: scrub em-dashes / en-dashes from all string fields.
    const scrub = (s: unknown): unknown => {
      if (typeof s === 'string') return s.replace(/\u2014/g, '-').replace(/\u2013/g, '-');
      if (Array.isArray(s)) return s.map(scrub);
      if (s && typeof s === 'object') {
        const out: Record<string, unknown> = {};
        for (const [k, v] of Object.entries(s as Record<string, unknown>)) out[k] = scrub(v);
        return out;
      }
      return s;
    };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    parsed = scrub(parsed) as any;

    logInfo('coach.success', {
      ms: Date.now() - started,
      score: parsed.score,
      mistakes: parsed.mistakes?.length ?? 0,
      inputTokens: response.usage.input_tokens,
      outputTokens: response.usage.output_tokens,
      cacheRead: response.usage.cache_read_input_tokens ?? 0,
    });

    return NextResponse.json({
      coaching: parsed,
      usage: {
        input: response.usage.input_tokens,
        output: response.usage.output_tokens,
        cacheRead: response.usage.cache_read_input_tokens ?? 0,
      },
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    logError('coach.exception', {
      ms: Date.now() - started,
      err: msg,
      stack: err instanceof Error ? err.stack?.split('\n').slice(0, 3).join(' | ') : undefined,
    });
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
