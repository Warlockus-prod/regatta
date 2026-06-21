import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { logInfo, logWarn, logError } from '@/lib/log';
import { rateLimitWithGlobal, rateLimitHeaders } from '@/lib/rate-limit';

export const runtime = 'nodejs';
export const maxDuration = 30;

// Anti-abuse: 20 requests per hour per session.
const CHAT_LIMIT = 20;
const CHAT_WINDOW_MS = 60 * 60 * 1000;
// Global wallet cap across all users per hour.
const CHAT_GLOBAL_LIMIT = 200;
const CHAT_GLOBAL_WINDOW_MS = 60 * 60 * 1000;
// OpenAI chat model. Override via env (OPENAI_MODEL) without a code change.
const OPENAI_MODEL = process.env.OPENAI_MODEL || 'gpt-5-mini';

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
  const apiKey = process.env.OPENAI_API_KEY;
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
  const rl = rateLimitWithGlobal({
    key: rlKey,
    perKeyLimit: CHAT_LIMIT,
    perKeyWindowMs: CHAT_WINDOW_MS,
    globalKey: 'chat',
    globalLimit: CHAT_GLOBAL_LIMIT,
    globalWindowMs: CHAT_GLOBAL_WINDOW_MS,
  });
  if (!rl.ok) {
    logWarn('ai-chat.rate-limited', { key: rlKey.slice(0, 16), resetMs: rl.resetMs, by: rl.rejectedBy });
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

  const lang = body.lang === 'en' ? 'en' : body.lang === 'pl' ? 'pl' : 'ru';
  logInfo('ai-chat.request', { turns: truncated.length, lang });

  // Steer the reply language. SYSTEM_RU rule #4 already asks to mirror the
  // user's language, but an explicit directive derived from body.lang makes
  // the UI-selected language authoritative. Kept as a separate uncached block
  // so the large base prompt stays a stable cache key.
  const LANG_NAME: Record<'ru' | 'en' | 'pl', string> = {
    ru: 'Russian',
    en: 'English',
    pl: 'Polish',
  };
  const langDirective = `Reply in the user's language: ${LANG_NAME[lang]}.`;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 25_000);
  try {
    // OpenAI Chat Completions. The system prompt + the per-request language
    // directive go in a single system message; the conversation turns follow.
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: OPENAI_MODEL,
        // GPT-5 family uses max_completion_tokens (not max_tokens) and consumes
        // reasoning tokens; keep effort low so the chat stays fast + cheap.
        max_completion_tokens: 1200,
        reasoning_effort: 'low',
        messages: [
          { role: 'system', content: `${SYSTEM_RU}\n\n${langDirective}` },
          ...truncated,
        ],
      }),
      signal: controller.signal,
    });
    clearTimeout(timer);

    if (!response.ok) {
      const detail = await response.text().catch(() => '');
      logError('ai-chat.upstream-error', {
        ms: Date.now() - started,
        status: response.status,
        detail: detail.slice(0, 300),
      });
      // Never echo upstream detail to the client.
      return NextResponse.json({ error: 'AI service unavailable' }, { status: 502 });
    }

    const data = await response.json();
    const rawText = data?.choices?.[0]?.message?.content ?? '';
    // Enforce project typography rule: no em-dash / en-dash in user-facing text.
    const text = String(rawText).replace(/\u2014/g, '-').replace(/\u2013/g, '-');
    const usage = data?.usage ?? {};

    logInfo('ai-chat.success', {
      ms: Date.now() - started,
      inputTokens: usage.prompt_tokens ?? 0,
      outputTokens: usage.completion_tokens ?? 0,
    });

    return NextResponse.json({
      reply: text,
      usage: {
        input: usage.prompt_tokens ?? 0,
        output: usage.completion_tokens ?? 0,
        cacheRead: usage.prompt_tokens_details?.cached_tokens ?? 0,
      },
    });
  } catch (err) {
    clearTimeout(timer);
    const msg = err instanceof Error ? err.message : 'Unknown error';
    logError('ai-chat.exception', {
      ms: Date.now() - started,
      err: msg,
    });
    return NextResponse.json({ error: 'AI service unavailable' }, { status: 500 });
  }
}
