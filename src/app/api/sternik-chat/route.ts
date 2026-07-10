import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { logInfo, logWarn, logError } from '@/lib/log';
import { rateLimitWithGlobal, rateLimitHeaders, checkUserDailyBudget, USER_DAILY_AI_LIMIT, clientIpKey } from '@/lib/rate-limit';
import { isLang, type Lang } from '@/lib/languages';

export const runtime = 'nodejs';
export const maxDuration = 30;

// Anti-abuse: 20 requests per hour per session, shared global wallet cap.
const CHAT_LIMIT = 20;
const CHAT_WINDOW_MS = 60 * 60 * 1000;
const CHAT_GLOBAL_LIMIT = 200;
const CHAT_GLOBAL_WINDOW_MS = 60 * 60 * 1000;
const OPENAI_MODEL = process.env.OPENAI_MODEL || 'gpt-5-mini';

// ============================================================================
// AI instructor scoped to the /sternik section: preparation for the Polish
// "sternik motorowodny" state exam. Bilingual by design - questions are in
// Polish, the primary audience is Russian-speaking, so it can translate and
// explain in either language.
// ============================================================================

const SYSTEM = `Jestes instruktorem motorowodnym przygotowujacym kursantow do panstwowego egzaminu na patent STERNIKA MOTOROWODNEGO w Polsce. Twoja specjalizacja: przepisy zeglugowe srodladowe i COLREG, znaki nawigacyjne (IALA region A, znaki kardynalne, boczne, tablice srodladowe), swiatla i sygnaly dzwiekowe, budowa jachtu motorowego, silniki zaburtowe, manewrowanie i cumowanie, locja, meteorologia, ratownictwo i pierwsza pomoc, ochrona srodowiska, przepisy o patentach.

Fakty o egzaminie (stan prawny 2026: rozporzadzenie MSiT z 9.04.2013, tekst jednolity Dz.U. 2026 poz. 604):
- Test teoretyczny: 75 pytan jednokrotnego wyboru (A/B/C), 90 minut, prog zdania 65/75 (max 10 bledow).
- Czesc praktyczna: spotkanie i wyprzedzanie, odejscie/dojscie do nadbrzeza, kurs prosty i cyrkulacja, czlowiek za burta, kotwiczenie i cumowanie, komendy. Zle wykonany element mozna powtorzyc raz.
- Minimalny wiek: 14 lat (ponizej 18 - zgoda opiekuna).
- Uprawnienia: srodladzie bez limitu mocy (ponizej 16 lat - do 60 kW); morze - jachty do 12 m dlugosci kadluba, do 2 Mm od brzegu, w dzien.
- Bez patentu: silnik do 10 kW, a na srodladziu takze do 75 kW przy dlugosci kadluba do 13 m i predkosci ograniczonej konstrukcyjnie do 15 km/h (houseboat).
- Oplaty: egzamin 250 zl, wydanie patentu 50 zl; uczniowie i studenci do 26 lat placa 50%.
- Rejestracja jachtu obowiazkowa: dlugosc powyzej 7,5 m lub moc powyzej 15 kW (REJA24).
- Dlugosc sygnalow: krotki ok. 1 s; dlugi na srodladziu ok. 4 s, na morzu (COLREG) 4-6 s.

Zasady odpowiadania:
1. Odpowiadasz TYLKO na tematy zwiazane z motorowodniactwem, zegluga, bezpieczenstwem na wodzie i egzaminem. Inne tematy - grzecznie odmow jednym zdaniem.
2. Uzytkownik uczy sie do polskiego egzaminu, ale czesto mowi po rosyjsku. Odpowiadaj w jezyku pytania. Gdy wyjasniasz polskie pojecie egzaminacyjne po rosyjsku, ZAWSZE podawaj polski termin w nawiasie - kursant musi go rozpoznac na tescie.
3. Na prosbe "przetlumacz" - przetlumacz pytanie/odpowiedzi na rosyjski i krotko wyjasnij, ktora odpowiedz jest poprawna i dlaczego.
4. Badz konkretny: 2-6 krotkich zdan. Mnemotechniki mile widziane (np. zegar kardynalny: E=3, S=6, W=9, N=ciagle).
5. Nie wymyslaj przepisow. Jesli nie jestes pewien - powiedz to wprost i doradz sprawdzenie u organizatora egzaminu.
6. Sekcje tej strony, ktore mozesz polecac: /sternik/teoria (konspekt ze schematami), /sternik/test (trening pytan z natychmiastowa odpowiedzia), /sternik/egzamin (probny egzamin 75 pytan / 90 minut).
7. TRYB KOREPETYTORA: gdy kontekst zawiera wynik uczacego sie, jego najslabsze tematy albo liste powtarzalnie mylonych pytan, wejdz w tryb nauczania. Wtedy: (a) krotko nazwij glowny problem; (b) wyjasnij regule PROSTO, z mnemotechnika; (c) podaj 1-2 typowe pulapki na tym temacie; (d) zakoncz JEDNYM pytaniem sprawdzajacym i poczekaj na odpowiedz uczacego sie. W kolejnych turach oceniaj jego odpowiedz i przechodz do nastepnego slabego tematu. Ucz krok po kroku, nie zrzucaj calej wiedzy naraz.
8. TYPOGRAFIA: nigdy nie uzywaj polpauzy ani myslnika (U+2013, U+2014). Pisz zwykly dywiz "-". To twarda regula.`;

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

interface Payload {
  messages: ChatMessage[];
  lang?: Lang;
  /** Which language the explanation should be in: Polish / Russian / both. */
  explLang?: 'pl' | 'ru' | 'both';
  /** Optional current-question context from the trainer UI. */
  context?: string;
}

export async function POST(req: Request) {
  const started = Date.now();
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    logWarn('sternik-chat.no-api-key');
    return NextResponse.json(
      { error: 'API key not configured', fallback: true },
      { status: 200 },
    );
  }

  const jar = await cookies();
  const sid = jar.get('regatta_sid')?.value;
  const ip = clientIpKey(req); // last XFF hop - see rate-limit.ts (anti-spoofing)

  // Site-wide per-user daily AI cap (all AI endpoints share this budget).
  const daily = checkUserDailyBudget(sid ?? ip);
  if (!daily.ok) {
    logWarn('sternik-chat.daily-cap', { resetMs: daily.resetMs });
    return NextResponse.json(
      { error: `Dzienny limit ${USER_DAILY_AI_LIMIT} zapytan AI wyczerpany. Sprobuj jutro.`, retryAfterSec: Math.ceil(daily.resetMs / 1000) },
      { status: 429, headers: { 'Retry-After': String(Math.ceil(daily.resetMs / 1000)) } },
    );
  }

  const rlKey = 'sternik-chat:' + (sid ?? ip);
  const rl = rateLimitWithGlobal({
    key: rlKey,
    perKeyLimit: CHAT_LIMIT,
    perKeyWindowMs: CHAT_WINDOW_MS,
    globalKey: 'sternik-chat',
    globalLimit: CHAT_GLOBAL_LIMIT,
    globalWindowMs: CHAT_GLOBAL_WINDOW_MS,
  });
  if (!rl.ok) {
    logWarn('sternik-chat.rate-limited', { key: rlKey.slice(0, 20), resetMs: rl.resetMs, by: rl.rejectedBy });
    return NextResponse.json(
      { error: 'Zbyt wiele zapytan. Sprobuj za godzine.', retryAfterSec: Math.ceil(rl.resetMs / 1000) },
      { status: 429, headers: { ...rateLimitHeaders(rl, CHAT_LIMIT), 'Retry-After': String(Math.ceil(rl.resetMs / 1000)) } },
    );
  }

  let body: Payload;
  try {
    body = await req.json();
  } catch (err) {
    logError('sternik-chat.invalid-json', { err: err instanceof Error ? err.message : 'unknown' });
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const msgs = Array.isArray(body.messages) ? body.messages : [];
  if (msgs.length === 0) {
    return NextResponse.json({ error: 'Empty messages' }, { status: 400 });
  }
  const truncated = msgs
    .slice(-10)
    .map((m) => ({
      role: m.role === 'assistant' ? ('assistant' as const) : ('user' as const),
      content: String(m.content ?? '').slice(0, 2000),
    }));

  const lang: Lang = isLang(body.lang) ? body.lang : 'ru';
  const explLang: 'pl' | 'ru' | 'both' =
    body.explLang === 'pl' || body.explLang === 'ru' || body.explLang === 'both' ? body.explLang : 'both';
  // Optional question context from the trainer - bounded, single block.
  const context = typeof body.context === 'string' ? body.context.slice(0, 1200) : '';

  logInfo('sternik-chat.request', { turns: truncated.length, lang, explLang, hasContext: Boolean(context) });

  const LANG_NAME: Record<Lang, string> = {
    ru: 'Russian', en: 'English', pl: 'Polish', es: 'Spanish',
    fr: 'French', de: 'German', it: 'Italian',
  };
  // The explanation-language preference wins over the UI language for the
  // reply, so the chat matches what the learner set in the section toggle.
  const langDirective =
    explLang === 'pl'
      ? 'Reply in Polish. Keep exam terms exactly as they appear.'
      : explLang === 'ru'
        ? 'Reply in Russian, but keep every Polish exam term in parentheses in Polish so the learner recognizes it on the test.'
        : 'Reply in BOTH Polish and Russian: first a short Polish explanation, then the Russian one below it.';
  const directives = [
    langDirective,
    `(UI language is ${LANG_NAME[lang]}; if the user clearly writes in another language, mirror it.)`,
    context ? `Aktualne pytanie testowe, ktorego dotyczy rozmowa:\n${context}` : '',
  ].filter(Boolean).join('\n\n');

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 25_000);
  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: OPENAI_MODEL,
        max_completion_tokens: 1200,
        reasoning_effort: 'low',
        messages: [
          { role: 'system', content: `${SYSTEM}\n\n${directives}` },
          ...truncated,
        ],
      }),
      signal: controller.signal,
    });
    clearTimeout(timer);

    if (!response.ok) {
      const detail = await response.text().catch(() => '');
      logError('sternik-chat.upstream-error', {
        ms: Date.now() - started,
        status: response.status,
        detail: detail.slice(0, 300),
      });
      return NextResponse.json({ error: 'AI service unavailable' }, { status: 502 });
    }

    const data = await response.json();
    const rawText = data?.choices?.[0]?.message?.content ?? '';
    // Project typography rule: no em/en dashes in user-facing text.
    const text = String(rawText).replace(/\u2014/g, '-').replace(/\u2013/g, '-');
    const usage = data?.usage ?? {};

    logInfo('sternik-chat.success', {
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
    logError('sternik-chat.exception', { ms: Date.now() - started, err: msg });
    return NextResponse.json({ error: 'AI service unavailable' }, { status: 500 });
  }
}
