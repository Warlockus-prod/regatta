import Anthropic from '@anthropic-ai/sdk';
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { logInfo, logWarn, logError } from '@/lib/log';
import { rateLimit, rateLimitHeaders } from '@/lib/rate-limit';

export const runtime = 'nodejs';
export const maxDuration = 30;

// Anti-abuse: 20 requests per hour per session.
const CHAT_LIMIT = 20;
const CHAT_WINDOW_MS = 60 * 60 * 1000;

// ============================================================================
// AI assistant scoped to this app: yachting / sailing / racing only.
// First recommends an internal section of the site; only if the info isn't
// covered here, it may answer from general sailing knowledge. Refuses
// off-topic questions politely.
// ============================================================================

const SITE_SECTIONS = `
Разделы этого сайта (href → что там):
- /start - Bootcamp: 8 уроков по 5 минут (ветер, курсы, паруса, первая мини-гонка).
- /quick - "Освежить за 15 мин" - 6 ключевых тем без воды.
- /rules - Simple Rules: 8 карточек-сценариев (правый галс, место у знака, старт, столкновение).
- /onboard - "Первая неделя на яхте": команды, что опасно, что брать, как вести себя на борту.
- /anatomy - Устройство яхты (Bavaria 46) с кликабельными деталями.
- /checklist - Чек-лист к регате.
- /simulator - Интерактивный тренажёр яхты (top + side view, крен).
- /racing - Тактика: лавировка, старт, знаки, правила расхождения.
- /courses - Курсы относительно ветра (5 курсов + диаграмма).
- /game - Гонка с AI-соперниками, после финиша AI-тренер разбирает ошибки.
- /glossary - Глоссарий (51 термин RU/EN).
`;

const SYSTEM_RU = `Ты дружелюбный ассистент яхтенной школы Regatta. Отвечаешь ТОЛЬКО на вопросы про яхтинг, парусный спорт, гонки, регаты, безопасность на воде, устройство яхты, терминологию, правила расхождения, тактику и подобное.

Правила:
1. Если вопрос НЕ про яхтинг/парусный спорт - вежливо откажись и напомни тему. Один раз.
2. Если ответ есть в разделах сайта - сначала направь пользователя в подходящий раздел (дай короткую ссылку вида "/simulator" - фронтенд сам сделает её кликабельной), потом дай короткое объяснение (1-3 предложения).
3. Если темы нет в разделах - отвечай сам из общих знаний о парусном спорте, коротко и по делу.
4. Отвечай на том языке, на котором задан вопрос (ru/en/pl), даже если раздел помечен по-русски.
5. Максимум 4-6 коротких предложений. Без многословия. Используй markdown умеренно.
6. Не выдумывай факты. Если не знаешь - скажи прямо.
7. ТИПОГРАФИКА: никогда не используй длинное тире (U+2014) или среднее тире (U+2013). Пиши обычный дефис "-". Это жёсткое правило проекта.

${SITE_SECTIONS}`;

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

interface Payload {
  messages: ChatMessage[];
  lang?: 'ru' | 'en' | 'pl';
}

export async function POST(req: Request) {
  const started = Date.now();
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    logWarn('ai-chat.no-api-key');
    return NextResponse.json(
      { error: 'API key not configured', fallback: true },
      { status: 200 },
    );
  }

  // Rate-limit: 20 requests / hour per session. Falls back to IP if no cookie.
  const jar = await cookies();
  const sid = jar.get('regatta_sid')?.value;
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0] ?? 'ip:unknown';
  const rlKey = 'chat:' + (sid ?? ip);
  const rl = rateLimit(rlKey, CHAT_LIMIT, CHAT_WINDOW_MS);
  if (!rl.ok) {
    logWarn('ai-chat.rate-limited', { key: rlKey.slice(0, 16), resetMs: rl.resetMs });
    return NextResponse.json(
      { error: 'Слишком много запросов. Попробуй через час.', retryAfterSec: Math.ceil(rl.resetMs / 1000) },
      { status: 429, headers: { ...rateLimitHeaders(rl, CHAT_LIMIT), 'Retry-After': String(Math.ceil(rl.resetMs / 1000)) } },
    );
  }

  let body: Payload;
  try {
    body = await req.json();
  } catch (err) {
    logError('ai-chat.invalid-json', { err: err instanceof Error ? err.message : 'unknown' });
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const msgs = Array.isArray(body.messages) ? body.messages : [];
  if (msgs.length === 0) {
    return NextResponse.json({ error: 'Empty messages' }, { status: 400 });
  }
  // Cap message size to avoid abuse
  const truncated = msgs
    .slice(-10) // last 10 turns max
    .map((m) => ({
      role: m.role === 'assistant' ? ('assistant' as const) : ('user' as const),
      content: String(m.content ?? '').slice(0, 2000),
    }));

  logInfo('ai-chat.request', { turns: truncated.length, lang: body.lang ?? 'ru' });

  try {
    const client = new Anthropic({ apiKey });
    const response = await client.messages.create({
      model: 'claude-haiku-4-5',
      max_tokens: 600,
      system: [
        {
          type: 'text',
          text: SYSTEM_RU,
          cache_control: { type: 'ephemeral' },
        },
      ],
      messages: truncated,
    });

    const textBlock = response.content.find((b) => b.type === 'text');
    // Enforce project typography rule: no em-dash / en-dash anywhere in user-facing text.
    const raw = textBlock && textBlock.type === 'text' ? textBlock.text : '';
    const text = raw.replace(/\u2014/g, '-').replace(/\u2013/g, '-');

    logInfo('ai-chat.success', {
      ms: Date.now() - started,
      inputTokens: response.usage.input_tokens,
      outputTokens: response.usage.output_tokens,
      cacheRead: response.usage.cache_read_input_tokens ?? 0,
    });

    return NextResponse.json({
      reply: text,
      usage: {
        input: response.usage.input_tokens,
        output: response.usage.output_tokens,
        cacheRead: response.usage.cache_read_input_tokens ?? 0,
      },
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    logError('ai-chat.exception', {
      ms: Date.now() - started,
      err: msg,
    });
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
