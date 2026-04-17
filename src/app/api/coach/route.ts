import Anthropic from '@anthropic-ai/sdk';
import { NextResponse } from 'next/server';
import { logInfo, logWarn, logError } from '@/lib/log';

export const runtime = 'nodejs';
export const maxDuration = 30;

// System prompt - cached so repeated requests are cheap
const SYSTEM = `Ты опытный тренер по парусному спорту. Тебе присылают лог гонки: позиции яхты игрока каждые 0.5 секунды, плюс события (повороты, прохождение знаков, финиш). Трасса - windward/leeward: нужно обогнуть верхний знак и вернуться к финишу. Ветер дует сверху (с севера, направление 0°).

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
- Анализируй: попадание в мёртвую зону (TWA<30°), плохие галсы при лавировке, огибание знаков широко, лишние повороты, падение скорости`;

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

  let log: RaceLog;
  try {
    log = await req.json();
  } catch (err) {
    logError('coach.invalid-json', { err: err instanceof Error ? err.message : 'unknown' });
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  logInfo('coach.request', {
    difficulty: log.difficulty,
    position: log.position,
    totalBoats: log.totalBoats,
    samples: log.samples?.length ?? 0,
    events: log.events?.length ?? 0,
    finishTime: log.finishTime,
  });

  // Downsample samples to keep prompt small (~1 sample per 2 seconds)
  const downsampled = log.samples.filter((_, i) => i % 4 === 0);

  const userMsg = `Гонка завершена.

Сложность: ${log.difficulty}
Место: ${log.position} из ${log.totalBoats}
Время финиша: ${log.finishTime ? log.finishTime.toFixed(1) + ' сек' : 'не финишировал'}
Ветер: направление ${log.courseInfo.windDirection}° (с севера)
Верхний знак: x=${log.courseInfo.windwardMark.x}, y=${log.courseInfo.windwardMark.y}
Старт/финиш: y=${log.courseInfo.startY}

События (${log.events.length}):
${log.events.map((e) => `  t=${e.t.toFixed(1)}s ${e.type}${e.note ? ' ' + e.note : ''}`).join('\n')}

Лог позиций (каждые ~2 сек, всего ${downsampled.length}):
${downsampled.map((s) => `t=${s.t.toFixed(1)} pos=(${s.x.toFixed(0)},${s.y.toFixed(0)}) heading=${s.heading.toFixed(0)}° TWA=${s.twa.toFixed(0)}° speed=${s.speed.toFixed(1)} lap=${s.lap}`).join('\n')}

Проанализируй как игрок прошёл гонку. Верни ТОЛЬКО JSON, без комментариев до или после.`;

  try {
    const client = new Anthropic({ apiKey });
    const response = await client.messages.create({
      model: 'claude-haiku-4-5',
      max_tokens: 1500,
      system: [
        {
          type: 'text',
          text: SYSTEM,
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
