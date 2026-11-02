import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { logInfo, logWarn, logError } from '@/lib/log';
import { rateLimitWithGlobal, rateLimitHeaders, isDailyRejection, USER_DAILY_AI_LIMIT, USER_DAILY_AI_IP_LIMIT, clientKeys } from '@/lib/rate-limit';
import { insertEvent } from '@/lib/db';
import { mirrorCoachKeys, type Coaching } from '@/lib/fallback-coach';
import { sanitizeRaceLog, type RaceLog } from './sanitize';

export const runtime = 'nodejs';
export const maxDuration = 30;

const COACH_LIMIT = 30;
const COACH_WINDOW_MS = 60 * 60 * 1000;
// Global cap: total AI coach requests across ALL users per hour.
// Protects the OPENAI_API_KEY wallet from denial-of-wallet even if the
// per-sid limit is bypassed by cookie rotation.
const COACH_GLOBAL_LIMIT = 300;
const COACH_GLOBAL_WINDOW_MS = 60 * 60 * 1000;
// OpenAI model. Override via env (OPENAI_MODEL) without a code change.
const OPENAI_MODEL = process.env.OPENAI_MODEL || 'gpt-5-mini';

// System prompts per language - cached so repeated requests are cheap.
// The output JSON field names stay `titleRu / explanationRu / fixRu / nextGoalRu`
// for backward compatibility with the client shape - the STRING VALUES inside
// them are in the requested language. The model is noticeably more fluent when
// the system prompt itself is in the target language, so we maintain seven.
type CoachLang = 'ru' | 'en' | 'pl' | 'es' | 'fr' | 'de' | 'it';
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
      "kind": "no-go" | "tacks" | "close-hauled" | "other",
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
- kind: "no-go" для мёртвой зоны, "tacks" для поворотов, "close-hauled" для скорости в бейдевинде, иначе "other"
- Говори конкретно, с цифрами из лога (углы, время, расстояния)
- Русский язык, дружелюбный но профессиональный тон
- Если игрок играл хорошо - скажи об этом прямо, не выдумывай ошибки
- Анализируй: попадание в мёртвую зону (события no-go-entered в логе), плохие галсы при лавировке, огибание знаков широко, лишние повороты, падение скорости
- Не называй угол мёртвой зоны числом и не советуй держать конкретный угол к ветру: советуй держать рекомендуемый курс из подсказок, это лучший угол к ветру для этой лодки
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
      "kind": "no-go" | "tacks" | "close-hauled" | "other",
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
- kind: "no-go" for the no-go zone, "tacks" for tacks, "close-hauled" for close-hauled speed, otherwise "other"
- Be concrete, with numbers from the log (angles, times, distances)
- Friendly but professional tone
- If the player sailed well - say it directly, don't invent mistakes
- Analyse: no-go zone entries (the no-go-entered events in the log), bad tacks, wide mark roundings, extra tacks, speed drops
- Never state the no-go zone as a number of degrees and never prescribe an angle to the wind: tell the player to follow the suggested course of the route hint, the best angle to the wind for this boat
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
      "kind": "no-go" | "tacks" | "close-hauled" | "other",
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
- kind: "no-go" dla kąta martwego, "tacks" dla zwrotów, "close-hauled" dla prędkości na bajdewindzie, w innym razie "other"
- Mow konkretnie, z liczbami z logu (katy, czasy, odleglosci)
- Ton przyjazny ale profesjonalny
- Jesli gracz plynal dobrze - powiedz to wprost, nie wymyslaj bledow
- Analizuj: wejscia w strefe martwa (zdarzenia no-go-entered w logu), zle halsy przy halsowaniu, szerokie oplywanie znakow, zbedne zwroty, spadki predkosci
- Nie podawaj kata martwego liczba stopni i nie zalecaj konkretnego kata do wiatru: radz trzymac sie sugerowanego kursu ze wskazowek, to najlepszy kat do wiatru dla tej lodzi
- TYPOGRAFIA: nigdy nie uzywaj dlugiej pauzy (U+2014) ani polpauzy (U+2013). Uzywaj zwyklego dywizu "-".`,

  es: `Eres un entrenador experimentado de vela. Recibes un log de regata: posiciones del barco del jugador cada 0.5 segundos, mas eventos (viradas, redondeos de boya, meta). El recorrido es windward/leeward: rodea la boya de barlovento y vuelve a la meta. El viento sopla desde arriba (norte, rumbo 0°).

Tu tarea: analizar la regata y dar consejos concretos. Responde SOLO con JSON valido con esta forma:

{
  "overall": "Evaluacion breve de la regata (1-2 frases en espanol)",
  "score": 0..100,
  "mistakes": [
    {
      "timeStart": numero (segundos desde la salida),
      "timeEnd": numero,
      "severity": "minor" | "major",
      "kind": "no-go" | "tacks" | "close-hauled" | "other",
      "titleRu": "Nombre breve del error (3-6 palabras, en espanol)",
      "explanationRu": "Que salio mal y por que (2-3 frases, en espanol)",
      "fixRu": "Como deberia haberse hecho (1-2 frases, en espanol)"
    }
  ],
  "strengths": ["Elogio breve 1", "Elogio breve 2"],
  "nextGoalRu": "Un objetivo concreto para la proxima regata (en espanol)"
}

(Nota: los nombres de los campos JSON se mantienen con sufijo ruso por compatibilidad con el cliente. Los valores dentro deben estar en espanol.)

Reglas:
- mistakes: maximo 3, los mas importantes
- kind: "no-go" para la zona muerta, "tacks" para las viradas, "close-hauled" para la velocidad en ceñida, si no "other"
- Se concreto, con numeros del log (angulos, tiempos, distancias)
- Tono amistoso pero profesional
- Si el jugador navego bien, dilo directamente, no inventes errores
- Analiza: entradas en zona muerta (eventos no-go-entered del registro), viradas malas al cenir, redondeos anchos, viradas innecesarias, caidas de velocidad
- No des la zona muerta como un numero de grados ni recomiendes un angulo concreto al viento: aconseja seguir el rumbo recomendado de las indicaciones, el mejor angulo al viento de este barco
- TIPOGRAFIA: nunca uses raya larga (U+2014) ni raya media (U+2013). Usa guion simple "-".`,

  fr: `Tu es un entraineur experimente de voile. Tu recois un log de regate : positions du voilier du joueur toutes les 0.5 secondes, plus les evenements (virements, contournages de bouee, arrivee). Le parcours est windward/leeward : contourne la bouee au vent et reviens a l'arrivee. Le vent souffle d'en haut (nord, direction 0°).

Ta tache : analyser la regate et donner des conseils concrets. Reponds UNIQUEMENT en JSON valide avec cette forme :

{
  "overall": "Evaluation breve de la regate (1-2 phrases en francais)",
  "score": 0..100,
  "mistakes": [
    {
      "timeStart": nombre (secondes depuis le depart),
      "timeEnd": nombre,
      "severity": "minor" | "major",
      "kind": "no-go" | "tacks" | "close-hauled" | "other",
      "titleRu": "Nom court de l'erreur (3-6 mots, en francais)",
      "explanationRu": "Ce qui n'a pas marche et pourquoi (2-3 phrases, en francais)",
      "fixRu": "Ce qu'il aurait fallu faire (1-2 phrases, en francais)"
    }
  ],
  "strengths": ["Compliment court 1", "Compliment court 2"],
  "nextGoalRu": "Un objectif concret pour la prochaine regate (en francais)"
}

(Note : les noms des champs JSON gardent le suffixe russe pour la compatibilite client. Les valeurs a l'interieur doivent etre en francais.)

Regles :
- mistakes : 3 maximum, les plus importants
- kind : "no-go" pour la zone morte, "tacks" pour les virements de bord, "close-hauled" pour la vitesse au près, sinon "other"
- Sois concret, avec les chiffres du log (angles, temps, distances)
- Ton amical mais professionnel
- Si le joueur a bien navigue, dis-le directement, n'invente pas d'erreurs
- Analyse : entrees en zone morte (evenements no-go-entered du journal), mauvais virements au pres, contournages larges, virements inutiles, chutes de vitesse
- N'indique jamais la zone morte en degres et ne prescris pas d'angle au vent : conseille de suivre le cap conseille des indications, le meilleur angle au vent de ce bateau
- TYPOGRAPHIE : n'utilise jamais le tiret cadratin (U+2014) ni le tiret demi-cadratin (U+2013). Utilise un trait d'union simple "-".`,

  de: `Du bist ein erfahrener Segeltrainer. Du bekommst ein Regattalog: die Positionen des Spielerbootes alle 0.5 Sekunden plus Ereignisse (Wenden, Tonnenrundungen, Ziel). Der Kurs ist windward/leeward: runde die Luvtonne und kehre zum Ziel zurueck. Der Wind weht von oben (Nord, Richtung 0°).

Deine Aufgabe: die Regatta analysieren und konkrete Ratschlaege geben. Antworte AUSSCHLIESSLICH mit gueltigem JSON in dieser Form:

{
  "overall": "Kurze Bewertung der Regatta (1-2 Saetze auf Deutsch)",
  "score": 0..100,
  "mistakes": [
    {
      "timeStart": Zahl (Sekunden ab Start),
      "timeEnd": Zahl,
      "severity": "minor" | "major",
      "kind": "no-go" | "tacks" | "close-hauled" | "other",
      "titleRu": "Kurzer Name des Fehlers (3-6 Worte, auf Deutsch)",
      "explanationRu": "Was schiefging und warum (2-3 Saetze, auf Deutsch)",
      "fixRu": "Wie man es haette machen sollen (1-2 Saetze, auf Deutsch)"
    }
  ],
  "strengths": ["Kurzes Lob 1", "Kurzes Lob 2"],
  "nextGoalRu": "Ein konkretes Ziel fuer die naechste Regatta (auf Deutsch)"
}

(Hinweis: Die JSON-Feldnamen bleiben mit russischem Suffix aus Gruenden der Client-Kompatibilitaet. Die Werte darin muessen auf Deutsch sein.)

Regeln:
- mistakes: maximal 3, die wichtigsten
- kind: "no-go" für die Totzone, "tacks" für Wenden, "close-hauled" für die Fahrt hoch am Wind, sonst "other"
- Sei konkret, mit Zahlen aus dem Log (Winkel, Zeiten, Entfernungen)
- Freundlicher, aber professioneller Ton
- Wenn der Spieler gut gesegelt ist, sag das direkt, erfinde keine Fehler
- Analysiere: Eindringen in die Totzone (Ereignisse no-go-entered im Protokoll), schlechte Wenden beim Kreuzen, weite Tonnenrundungen, unnoetige Wenden, Geschwindigkeitsverluste
- Nenne den toten Winkel nie als Gradzahl und schreibe keinen Windwinkel vor: rate, dem empfohlenen Kurs der Hinweise zu folgen, dem besten Winkel zum Wind fuer dieses Boot
- TYPOGRAFIE: niemals Geviertstrich (U+2014) oder Halbgeviertstrich (U+2013) verwenden. Nutze den einfachen Bindestrich "-".`,

  it: `Sei un allenatore esperto di vela. Ricevi un log di regata: le posizioni della barca del giocatore ogni 0.5 secondi, piu gli eventi (virate, abbattute, arrivo). Il percorso e windward/leeward: aggira la boa di bolina e torna all'arrivo. Il vento soffia dall'alto (nord, direzione 0°).

Il tuo compito: analizzare la regata e dare consigli concreti. Rispondi SOLO con JSON valido in questa forma:

{
  "overall": "Valutazione breve della regata (1-2 frasi in italiano)",
  "score": 0..100,
  "mistakes": [
    {
      "timeStart": numero (secondi dalla partenza),
      "timeEnd": numero,
      "severity": "minor" | "major",
      "kind": "no-go" | "tacks" | "close-hauled" | "other",
      "titleRu": "Nome breve dell'errore (3-6 parole, in italiano)",
      "explanationRu": "Cosa e andato storto e perche (2-3 frasi, in italiano)",
      "fixRu": "Cosa si sarebbe dovuto fare (1-2 frasi, in italiano)"
    }
  ],
  "strengths": ["Elogio breve 1", "Elogio breve 2"],
  "nextGoalRu": "Un obiettivo concreto per la prossima regata (in italiano)"
}

(Nota: i nomi dei campi JSON mantengono il suffisso russo per compatibilita con il client. I valori al loro interno devono essere in italiano.)

Regole:
- mistakes: massimo 3, i piu importanti
- kind: "no-go" per la zona morta, "tacks" per le virate, "close-hauled" per la velocità di bolina, altrimenti "other"
- Sii concreto, con numeri dal log (angoli, tempi, distanze)
- Tono amichevole ma professionale
- Se il giocatore ha navigato bene, dillo direttamente, non inventare errori
- Analizza: ingressi nella zona morta (eventi no-go-entered nel log), virate sbagliate in bolina, aggiramenti boe troppo larghi, virate inutili, cali di velocita
- Non indicare l'angolo morto con un numero di gradi e non prescrivere un angolo al vento: consiglia di seguire la rotta consigliata dei suggerimenti, il miglior angolo al vento di questa barca
- TIPOGRAFIA: non usare mai trattino lungo (U+2014) o trattino medio (U+2013). Usa il trattino semplice "-".`,
};

export async function POST(req: Request) {
  const started = Date.now();
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    logWarn('coach.no-api-key');
    return NextResponse.json(
      { error: 'API key not configured', fallback: true },
      { status: 200 },
    );
  }

  const jar = await cookies();
  const sid = jar.get('regatta_sid')?.value;
  const client = clientKeys(req, sid); // sid AND last-hop IP, both must pass

  // Hourly per-user, per-IP and global limits plus the site-wide daily AI
  // budget, in one atomic check: a refused request spends none of them.
  const rl = rateLimitWithGlobal({
    key: 'coach',
    client,
    perKeyLimit: COACH_LIMIT,
    perKeyWindowMs: COACH_WINDOW_MS,
    globalKey: 'coach',
    globalLimit: COACH_GLOBAL_LIMIT,
    globalWindowMs: COACH_GLOBAL_WINDOW_MS,
    dailyBudget: true,
  });
  if (!rl.ok) {
    const retryAfterSec = Math.ceil(rl.resetMs / 1000);
    if (isDailyRejection(rl)) {
      logWarn('coach.daily-cap', { resetMs: rl.resetMs, by: rl.rejectedBy });
      return NextResponse.json(
        {
          error: rl.rejectedBy === 'daily-ip'
            ? `Daily AI limit for your network (${USER_DAILY_AI_IP_LIMIT}, shared by everyone on it) reached. Try again tomorrow.`
            : `Daily AI limit (${USER_DAILY_AI_LIMIT}) reached. Try again tomorrow.`,
          fallback: true,
          retryAfterSec,
        },
        { status: 429, headers: { 'Retry-After': String(retryAfterSec) } },
      );
    }
    logWarn('coach.rate-limited', { resetMs: rl.resetMs, by: rl.rejectedBy });
    return NextResponse.json(
      {
        error: rl.rejectedBy === 'per-ip'
          ? 'Too many coach requests from your network (shared network limit)'
          : 'Too many coach requests',
        fallback: true,
        retryAfterSec,
      },
      { status: 429, headers: { ...rateLimitHeaders(rl, COACH_LIMIT), 'Retry-After': String(retryAfterSec) } },
    );
  }

  let raw: unknown;
  try {
    raw = await req.json();
  } catch (err) {
    logError('coach.invalid-json', { err: err instanceof Error ? err.message : 'unknown' });
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  // Validate and coerce before anything touches the log: shape check, size
  // caps (MAX_SAMPLES / MAX_EVENTS bound token-burn against the wallet), and
  // every field that reaches the prompt forced to a finite number, an enum or
  // a clipped string. A malformed body gets a clean 400/413 instead of a
  // throw into the generic 500 handler, and free text can only enter the
  // prompt through the 80-char event note.
  const sanitized = sanitizeRaceLog(raw);
  if (!sanitized.ok) {
    if (sanitized.status === 413) {
      logWarn('coach.input-too-large');
      return NextResponse.json({ error: 'Race log too large', fallback: true }, { status: 413 });
    }
    logWarn('coach.bad-request');
    return NextResponse.json({ error: 'bad request' }, { status: 400 });
  }
  const log: RaceLog = sanitized.log;

  // All 7 langs (ru/en/pl/es/fr/de/it) have native system prompts above, so
  // the coach output now matches the user's UI lang directly. Unknown values
  // (legacy clients, malformed payloads) fall back to English.
  const lang: CoachLang =
    log.lang === 'ru' ? 'ru'
    : log.lang === 'pl' ? 'pl'
    : log.lang === 'es' ? 'es'
    : log.lang === 'fr' ? 'fr'
    : log.lang === 'de' ? 'de'
    : log.lang === 'it' ? 'it'
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

  // Custom event for /stats: coach.requested. One row per AI coach call;
  // surfaces the lang split so we know if the new ES/FR/DE/IT prompts are
  // actually being hit. Fire-and-forget; failures don't block the request.
  insertEvent({
    evt: 'coach.requested',
    path: '/api/coach',
    sessionId: sid,
    ua: req.headers.get('user-agent') ?? undefined,
    ip: req.headers.get('x-forwarded-for')?.split(',')[0] ?? undefined,
    language: lang,
    meta: {
      difficulty: log.difficulty,
      position: log.position,
      totalBoats: log.totalBoats,
      finishTime: log.finishTime,
      finished: log.finishTime !== null,
    },
  });

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 28_000);
  try {
    // Built inside the try: sanitizeRaceLog() makes it throw-free, and any
    // surprise still lands in the logged 500 path, not an unhandled reject.
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

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: OPENAI_MODEL,
        // GPT-5 needs max_completion_tokens (not max_tokens); leave headroom for
        // reasoning tokens. Low effort keeps coach latency + cost reasonable.
        max_completion_tokens: 3000,
        reasoning_effort: 'low',
        response_format: { type: 'json_object' },
        messages: [
          { role: 'system', content: SYSTEM_BY_LANG[lang] },
          { role: 'user', content: userMsg },
        ],
      }),
      signal: controller.signal,
    });
    clearTimeout(timer);

    if (!response.ok) {
      const detail = await response.text().catch(() => '');
      logError('coach.upstream-error', {
        ms: Date.now() - started,
        status: response.status,
        detail: detail.slice(0, 300),
      });
      return NextResponse.json({ error: 'AI service unavailable', fallback: true }, { status: 502 });
    }

    const data = await response.json();
    const content = data?.choices?.[0]?.message?.content;
    if (!content || typeof content !== 'string') {
      logError('coach.no-text-response', { ms: Date.now() - started });
      return NextResponse.json({ error: 'No response', fallback: true }, { status: 500 });
    }

    // json_object mode returns clean JSON; keep the fence-strip as a safety net.
    let jsonText = content.trim();
    const fence = jsonText.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
    if (fence) jsonText = fence[1];

    let parsed;
    try {
      parsed = JSON.parse(jsonText);
    } catch (err) {
      logError('coach.non-json', {
        ms: Date.now() - started,
        err: err instanceof Error ? err.message : 'unknown',
        rawPreview: content.slice(0, 200),
      });
      return NextResponse.json({ error: 'Model returned non-JSON', fallback: true }, { status: 500 });
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

    // Mirror legacy `*Ru` field names into clean aliases (`title`,
    // `explanation`, `fix`, `nextGoal`). Each fresh response now has
    // BOTH name forms, so old clients keep reading `titleRu` and new
    // clients can read the cleaner `title`. Old replays / cached coach
    // responses keep working - the legacy `*Ru` fields remain required
    // and are still emitted by the model.
    const coaching: Coaching = mirrorCoachKeys(parsed as Coaching);

    const usage = data?.usage ?? {};
    logInfo('coach.success', {
      ms: Date.now() - started,
      score: coaching.score,
      mistakes: coaching.mistakes?.length ?? 0,
      inputTokens: usage.prompt_tokens ?? 0,
      outputTokens: usage.completion_tokens ?? 0,
    });

    return NextResponse.json({
      coaching,
      usage: {
        input: usage.prompt_tokens ?? 0,
        output: usage.completion_tokens ?? 0,
        cacheRead: usage.prompt_tokens_details?.cached_tokens ?? 0,
      },
    });
  } catch (err) {
    clearTimeout(timer);
    const msg = err instanceof Error ? err.message : 'Unknown error';
    logError('coach.exception', {
      ms: Date.now() - started,
      err: msg,
      stack: err instanceof Error ? err.stack?.split('\n').slice(0, 3).join(' | ') : undefined,
    });
    return NextResponse.json({ error: 'AI service unavailable', fallback: true }, { status: 500 });
  }
}
