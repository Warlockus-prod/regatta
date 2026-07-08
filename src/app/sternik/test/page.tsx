'use client';

import Link from 'next/link';
import { Suspense, useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { useI18n } from '@/lib/i18n';
import {
  STERNIK_BANK,
  STERNIK_BANK_BY_ID,
  STERNIK_CATEGORIES,
  STERNIK_CATEGORY_BY_ID,
  type SternikCatId,
} from '@/data/sternik';
import {
  addSternikPracticeTime,
  loadSternikProgress,
  recordSternikAnswer,
  sternikWeakIds,
} from '@/lib/sternik-progress';
import { OPTION_LETTERS, formatClock, prepareQuestion, shuffled, type PreparedQuestion } from '../quiz-utils';
import QuestionFigure from '../QuestionFigure';
import { Explanation, useSternikPrefs } from '../prefs';

/** teoria section anchor per category - "read the theory" deep links. */
const THEORY_ANCHOR: Record<string, string> = {
  przepisy: 'przepisy', sygnaly: 'sygnaly', znaki: 'znaki', budowa: 'budowa',
  silniki: 'silniki', manewry: 'manewry', locja: 'locja', meteo: 'meteo',
  ratownictwo: 'ratownictwo', srodowisko: 'srodowisko', prawo: 'patent',
};

// ============================================================================
// /sternik/test - driving-school style trainer: answer, instantly see
// right/wrong + why, with pause, session timer and stats.
// ============================================================================

type Phase = 'menu' | 'quiz' | 'done';

interface SessionResult {
  q: PreparedQuestion;
  pickedIndex: number;
  ok: boolean;
}

function TrainerInner() {
  const { tp } = useI18n();
  const { explLang } = useSternikPrefs();
  const params = useSearchParams();
  const catParam = params.get('cat');
  const modeParam = params.get('mode');

  const [phase, setPhase] = useState<Phase>('menu');
  const [queue, setQueue] = useState<PreparedQuestion[]>([]);
  const [pos, setPos] = useState(0);
  const [picked, setPicked] = useState<number | null>(null);
  const [results, setResults] = useState<SessionResult[]>([]);
  const [paused, setPaused] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [weakCount, setWeakCount] = useState(0);
  const [sessionLabel, setSessionLabel] = useState('');
  const savedTimeRef = useRef(0);

  useEffect(() => {
    setWeakCount(sternikWeakIds(loadSternikProgress()).length);
  }, [phase]);

  // Session timer: ticks only while quiz is active and not paused.
  useEffect(() => {
    if (phase !== 'quiz' || paused) return;
    const t = setInterval(() => setElapsed((s) => s + 1), 1000);
    return () => clearInterval(t);
  }, [phase, paused]);

  // Persist practice time when the session ends or the page unmounts.
  useEffect(() => {
    if (phase === 'done' && elapsed > savedTimeRef.current) {
      addSternikPracticeTime(elapsed - savedTimeRef.current);
      savedTimeRef.current = elapsed;
    }
  }, [phase, elapsed]);

  const begin = (questions: typeof STERNIK_BANK, label: string) => {
    if (questions.length === 0) return;
    setQueue(shuffled(questions).map(prepareQuestion));
    setPos(0);
    setPicked(null);
    setResults([]);
    setElapsed(0);
    savedTimeRef.current = 0;
    setSessionLabel(label);
    setPaused(false);
    setPhase('quiz');
  };

  const startAll = () => begin(STERNIK_BANK, tp('Все вопросы', 'All questions', 'Wszystkie pytania'));
  const startQuick = () =>
    begin(shuffled(STERNIK_BANK).slice(0, 20), tp('Быстрые 20', 'Quick 20', 'Szybkie 20'));
  const startCat = (cat: SternikCatId) =>
    begin(
      STERNIK_BANK.filter((q) => q.cat === cat),
      STERNIK_CATEGORY_BY_ID[cat].pl,
    );
  const startErrors = () => {
    const ids = sternikWeakIds(loadSternikProgress());
    const qs = ids.map((id) => STERNIK_BANK_BY_ID[id]).filter(Boolean);
    begin(qs, tp('Работа над ошибками', 'Error review', 'Powtorka bledow'));
  };
  // Adaptive session: weak questions first, then unseen, then extra questions
  // from categories where accuracy is below the exam pass mark.
  const startSmart = () => {
    const p = loadSternikProgress();
    const weakSet = new Set(sternikWeakIds(p));
    const weak = STERNIK_BANK.filter((q) => weakSet.has(q.id));
    const unseen = STERNIK_BANK.filter((q) => !p.q[q.id]);
    const catAcc: Record<string, { c: number; t: number }> = {};
    for (const q of STERNIK_BANK) {
      const s = p.q[q.id];
      if (s && s.seen > 0) {
        const a = (catAcc[q.cat] ??= { c: 0, t: 0 });
        a.c += s.correct;
        a.t += s.seen;
      }
    }
    const weakCats = new Set(
      Object.entries(catAcc)
        .filter(([, a]) => a.t >= 3 && a.c / a.t < 0.87)
        .map(([c]) => c),
    );
    const fromWeakCats = STERNIK_BANK.filter(
      (q) => weakCats.has(q.cat) && !weakSet.has(q.id) && p.q[q.id],
    );
    const seen = new Set<string>();
    const pick = (qs: typeof STERNIK_BANK, n: number) =>
      shuffled(qs).filter((q) => !seen.has(q.id)).slice(0, n).map((q) => {
        seen.add(q.id);
        return q;
      });
    let pool = [...pick(weak, 10), ...pick(unseen, 6), ...pick(fromWeakCats, 4)];
    if (pool.length < 20) pool = [...pool, ...pick(STERNIK_BANK, 20 - pool.length)];
    begin(shuffled(pool), tp('Умная тренировка', 'Smart session', 'Inteligentny trening'));
  };

  // Auto-start from URL (?cat=..., ?mode=errors) once.
  const autoStarted = useRef(false);
  useEffect(() => {
    if (autoStarted.current || phase !== 'menu') return;
    if (modeParam === 'errors') {
      autoStarted.current = true;
      startErrors();
    } else if (catParam && STERNIK_CATEGORY_BY_ID[catParam as SternikCatId]) {
      autoStarted.current = true;
      startCat(catParam as SternikCatId);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [catParam, modeParam, phase]);

  const current = queue[pos];
  const answered = picked !== null;
  const correctCount = results.filter((r) => r.ok).length;
  const answeredCount = results.length;
  const pct = answeredCount > 0 ? Math.round((correctCount / answeredCount) * 100) : 0;

  const answer = (i: number) => {
    if (answered || !current) return;
    const ok = current.options[i].ok;
    setPicked(i);
    setResults((r) => [...r, { q: current, pickedIndex: i, ok }]);
    recordSternikAnswer(current.id, ok);
  };

  const next = () => {
    if (pos + 1 >= queue.length) {
      setPhase('done');
    } else {
      setPos((p) => p + 1);
      setPicked(null);
    }
  };

  const askAI = () => {
    if (!current) return;
    const correctText = current.options.find((o) => o.ok)?.text ?? '';
    const question =
      explLang === 'pl'
        ? 'Wyjasnij to pytanie egzaminacyjne po polsku.'
        : explLang === 'ru'
          ? 'Объясни этот вопрос экзамена по-русски (переведи вопрос и варианты).'
          : tp(
              'Объясни этот вопрос экзамена. Дай ответ и по-польски, и по-русски.',
              'Explain this exam question in both Polish and Russian.',
              'Wyjasnij to pytanie egzaminacyjne po polsku i po rosyjsku.',
            );
    window.dispatchEvent(
      new CustomEvent('sternik:ask', {
        detail: {
          question,
          explLang,
          context: `Pytanie: ${current.q}\nOdpowiedzi: ${current.options.map((o, i) => `${OPTION_LETTERS[i]}) ${o.text}`).join(' ')}\nPoprawna: ${correctText}`,
        },
      }),
    );
  };

  const wrongResults = results.filter((r) => !r.ok);

  // ---------------------------------------------------------------- menu ---
  if (phase === 'menu') {
    return (
      <main>
        <h1 className="mb-1 text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>
          🎯 {tp('Тренажёр вопросов', 'Question trainer', 'Trening pytan')}
        </h1>
        <p className="mb-6 text-sm" style={{ color: 'var(--text-secondary)' }}>
          {tp(
            'Как при подготовке на автоправа: ответил - сразу видишь, верно или нет, и почему. Ошибки попадают в «повтор», пока не ответишь верно 2 раза подряд.',
            'Driving-school style: answer and instantly see right/wrong and why. Mistakes stay in review until answered correctly twice in a row.',
            'Jak na prawo jazdy: odpowiadasz i od razu widzisz dobrze/zle + wyjasnienie. Bledy wracaja, az odpowiesz dobrze 2 razy z rzedu.',
          )}
        </p>

        <div className="mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <button
            type="button"
            onClick={startSmart}
            className="rounded-2xl p-4 text-left transition hover:-translate-y-0.5"
            style={{
              background: 'linear-gradient(140deg, var(--bg-card), rgba(0,212,255,0.10))',
              border: '1px solid var(--border-subtle)',
            }}
          >
            <div className="text-2xl">🧠</div>
            <div className="mt-1 font-semibold" style={{ color: 'var(--text-primary)' }}>
              {tp('Умная тренировка', 'Smart session', 'Inteligentny trening')}
            </div>
            <div className="text-xs" style={{ color: 'var(--text-muted)' }}>
              {tp('20 вопросов: ошибки + новые + слабые темы', '20 questions: mistakes + unseen + weak topics', '20 pytan: bledy + nowe + slabe tematy')}
            </div>
          </button>
          <button
            type="button"
            onClick={startQuick}
            className="rounded-2xl p-4 text-left transition hover:-translate-y-0.5"
            style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)' }}
          >
            <div className="text-2xl">⚡</div>
            <div className="mt-1 font-semibold" style={{ color: 'var(--text-primary)' }}>
              {tp('Быстрые 20', 'Quick 20', 'Szybkie 20')}
            </div>
            <div className="text-xs" style={{ color: 'var(--text-muted)' }}>
              {tp('Случайные 20 вопросов, ~7 минут', 'Random 20 questions, ~7 min', 'Losowe 20 pytan, ~7 minut')}
            </div>
          </button>
          <button
            type="button"
            onClick={startAll}
            className="rounded-2xl p-4 text-left transition hover:-translate-y-0.5"
            style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)' }}
          >
            <div className="text-2xl">📚</div>
            <div className="mt-1 font-semibold" style={{ color: 'var(--text-primary)' }}>
              {tp('Вся база', 'Full bank', 'Cala baza')} ({STERNIK_BANK.length})
            </div>
            <div className="text-xs" style={{ color: 'var(--text-muted)' }}>
              {tp('Все вопросы вперемешку', 'All questions shuffled', 'Wszystkie pytania wymieszane')}
            </div>
          </button>
          <button
            type="button"
            onClick={startErrors}
            disabled={weakCount === 0}
            className="rounded-2xl p-4 text-left transition hover:-translate-y-0.5 disabled:opacity-40"
            style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)' }}
          >
            <div className="text-2xl">🔁</div>
            <div className="mt-1 font-semibold" style={{ color: 'var(--text-primary)' }}>
              {tp('Мои ошибки', 'My mistakes', 'Moje bledy')} ({weakCount})
            </div>
            <div className="text-xs" style={{ color: 'var(--text-muted)' }}>
              {weakCount > 0
                ? tp('Повтори, пока не закрепишь', 'Repeat until mastered', 'Powtarzaj do skutku')
                : tp('Пока пусто - отличный знак', 'Empty so far - great sign', 'Na razie pusto')}
            </div>
          </button>
        </div>

        <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>
          {tp('По категориям', 'By category', 'Wedlug kategorii')}
        </h2>
        <div className="grid gap-2 sm:grid-cols-2">
          {STERNIK_CATEGORIES.map((cat) => {
            const count = STERNIK_BANK.filter((q) => q.cat === cat.id).length;
            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => startCat(cat.id)}
                className="flex items-center gap-3 rounded-xl px-4 py-3 text-left transition hover:opacity-90"
                style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)' }}
              >
                <span className="text-lg">{cat.icon}</span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                    {cat.pl}
                  </span>
                  <span className="block text-xs" style={{ color: 'var(--text-muted)' }}>
                    {cat.ru}
                  </span>
                </span>
                <span
                  className="rounded-full px-2 py-0.5 text-xs"
                  style={{ background: 'var(--hover-bg)', color: cat.color }}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      </main>
    );
  }

  // ---------------------------------------------------------------- done ---
  if (phase === 'done') {
    const total = results.length;
    const catBreakdown = STERNIK_CATEGORIES.map((cat) => {
      const inCat = results.filter((r) => r.q.cat === cat.id);
      return { cat, total: inCat.length, ok: inCat.filter((r) => r.ok).length };
    }).filter((c) => c.total > 0);

    return (
      <main>
        <div
          className="mb-6 rounded-2xl p-6 text-center"
          style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)' }}
        >
          <div className="text-sm" style={{ color: 'var(--text-muted)' }}>
            {sessionLabel} · {formatClock(elapsed)}
          </div>
          <div
            className="my-2 text-5xl font-bold"
            style={{ color: pct >= 87 ? 'var(--success)' : pct >= 70 ? 'var(--warning)' : 'var(--danger)' }}
          >
            {pct}%
          </div>
          <div style={{ color: 'var(--text-secondary)' }}>
            {tp('Верно', 'Correct', 'Poprawnie')}: {correctCount} / {total}
          </div>
          <p className="mt-2 text-sm" style={{ color: 'var(--text-muted)' }}>
            {pct >= 87
              ? tp('Уровень экзамена! Так держать.', 'Exam level! Keep it up.', 'Poziom egzaminu! Tak trzymac.')
              : tp('На экзамене нужно 87%. Разбери ошибки ниже и повтори.', 'The exam needs 87%. Review the mistakes below.', 'Na egzaminie trzeba 87%. Przejrzyj bledy ponizej.')}
          </p>
          <div className="mt-4 flex flex-wrap justify-center gap-2">
            {wrongResults.length > 0 && (
              <button
                type="button"
                onClick={() => begin(wrongResults.map((r) => STERNIK_BANK_BY_ID[r.q.id]).filter(Boolean), tp('Повтор ошибок', 'Retry mistakes', 'Powtorka bledow'))}
                className="rounded-xl px-4 py-2 text-sm font-semibold"
                style={{ background: 'var(--warning)', color: '#221a04' }}
              >
                🔁 {tp('Повторить ошибки', 'Retry mistakes', 'Powtorz bledy')} ({wrongResults.length})
              </button>
            )}
            <button
              type="button"
              onClick={() => setPhase('menu')}
              className="rounded-xl px-4 py-2 text-sm font-semibold"
              style={{ background: 'var(--accent-cyan)', color: '#04222e' }}
            >
              {tp('Новая тренировка', 'New session', 'Nowy trening')}
            </button>
            <Link
              href="/sternik/egzamin"
              className="rounded-xl px-4 py-2 text-sm font-semibold"
              style={{ background: 'var(--bg-secondary)', color: 'var(--text-primary)', border: '1px solid var(--border-subtle)' }}
            >
              ⏱️ {tp('Пробный экзамен', 'Mock exam', 'Probny egzamin')}
            </Link>
          </div>
        </div>

        {catBreakdown.length > 1 && (
          <section className="mb-6">
            <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>
              {tp('По категориям', 'By category', 'Wedlug kategorii')}
            </h2>
            <div className="grid gap-2 sm:grid-cols-2">
              {catBreakdown.map(({ cat, total: t, ok }) => (
                <div
                  key={cat.id}
                  className="flex items-center justify-between rounded-xl px-4 py-2 text-sm"
                  style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)' }}
                >
                  <span style={{ color: 'var(--text-primary)' }}>
                    {cat.icon} {cat.pl}
                  </span>
                  <span style={{ color: ok === t ? 'var(--success)' : 'var(--warning)' }}>
                    {ok}/{t}
                  </span>
                </div>
              ))}
            </div>
          </section>
        )}

        {wrongResults.length > 0 && (
          <section>
            <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>
              {tp('Разбор ошибок', 'Error review', 'Do powtorki')}
            </h2>
            <div className="space-y-3">
              {wrongResults.map((r, i) => (
                <div
                  key={`${r.q.id}-${i}`}
                  className="rounded-xl p-4"
                  style={{ background: 'var(--bg-card)', border: '1px solid rgba(255,68,68,0.35)' }}
                >
                  <div className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                    {r.q.q}
                  </div>
                  <div className="mt-1 text-sm" style={{ color: 'var(--danger)' }}>
                    ✗ {tp('Твой ответ', 'Your answer', 'Twoja odpowiedz')}: {r.q.options[r.pickedIndex].text}
                  </div>
                  <div className="text-sm" style={{ color: 'var(--success)' }}>
                    ✓ {r.q.options.find((o) => o.ok)?.text}
                  </div>
                  <Explanation whyPl={r.q.whyPl} whyRu={r.q.whyRu} size="sm" />
                </div>
              ))}
            </div>
          </section>
        )}
      </main>
    );
  }

  // ---------------------------------------------------------------- quiz ---
  if (!current) return null;
  const cat = STERNIK_CATEGORY_BY_ID[current.cat];

  return (
    <main className="relative">
      {/* Top bar (sticky so score + timer stay visible while scrolling on mobile) */}
      <div
        className="sticky z-30 -mx-4 mb-3 flex items-center justify-between gap-3 px-4 py-2 text-sm"
        style={{ top: 56, background: 'var(--bg-primary)', borderBottom: '1px solid var(--border-subtle)' }}
      >
        <button
          type="button"
          onClick={() => setPhase('menu')}
          style={{ color: 'var(--text-muted)' }}
        >
          ← {tp('Выйти', 'Exit', 'Wyjdz')}
        </button>
        <div className="flex items-center gap-3" style={{ color: 'var(--text-secondary)' }}>
          <span>
            {pos + 1} / {queue.length}
          </span>
          <span style={{ color: 'var(--success)' }}>✓ {correctCount}</span>
          <span style={{ color: 'var(--danger)' }}>✗ {answeredCount - correctCount}</span>
          <span className="tabular-nums" style={{ color: 'var(--accent-cyan)' }}>
            {formatClock(elapsed)}
          </span>
          <button
            type="button"
            onClick={() => setPaused(true)}
            aria-label={tp('Пауза', 'Pause', 'Pauza')}
            className="rounded-lg px-2 py-1"
            style={{ background: 'var(--hover-bg)', color: 'var(--text-primary)' }}
          >
            ⏸
          </button>
        </div>
      </div>

      {/* Progress bar */}
      <div className="mb-4 h-1.5 overflow-hidden rounded-full" style={{ background: 'var(--hover-bg)' }}>
        <div
          className="h-full rounded-full transition-all"
          style={{ width: `${((pos + (answered ? 1 : 0)) / queue.length) * 100}%`, background: 'var(--accent-cyan)' }}
        />
      </div>

      {/* Question card */}
      <div
        className="rounded-2xl p-5"
        style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)' }}
      >
        <div className="mb-2 flex items-center gap-2 text-xs">
          <span className="rounded-full px-2 py-0.5" style={{ background: 'var(--hover-bg)', color: cat.color }}>
            {cat.icon} {cat.pl}
          </span>
          <span style={{ color: 'var(--text-muted)' }}>{cat.ru}</span>
        </div>
        <div className="mb-4 text-lg font-medium leading-snug" style={{ color: 'var(--text-primary)' }}>
          {current.q}
        </div>

        {current.figure && <QuestionFigure id={current.figure} />}

        <div className="space-y-2">
          {current.options.map((o, i) => {
            let bg = 'var(--bg-secondary)';
            let border = '1px solid var(--border-subtle)';
            let color = 'var(--text-primary)';
            if (answered) {
              if (o.ok) {
                bg = 'rgba(68,255,136,0.14)';
                border = '1px solid var(--success)';
                color = 'var(--success)';
              } else if (picked === i) {
                bg = 'rgba(255,68,68,0.12)';
                border = '1px solid var(--danger)';
                color = 'var(--danger)';
              }
            }
            return (
              <button
                key={i}
                type="button"
                disabled={answered}
                onClick={() => answer(i)}
                className="flex w-full items-start gap-3 rounded-xl px-4 py-3 text-left text-sm transition disabled:cursor-default"
                style={{ background: bg, border, color }}
              >
                <span
                  className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold"
                  style={{ background: 'var(--hover-bg)', color: 'var(--accent-cyan)' }}
                >
                  {OPTION_LETTERS[i]}
                </span>
                <span className="leading-snug">{o.text}</span>
              </button>
            );
          })}
        </div>

        {answered && (
          <div
            className="mt-4 rounded-xl p-4 text-sm"
            style={{
              background: current.options[picked!].ok ? 'rgba(68,255,136,0.08)' : 'rgba(255,68,68,0.08)',
              border: `1px solid ${current.options[picked!].ok ? 'rgba(68,255,136,0.4)' : 'rgba(255,68,68,0.35)'}`,
            }}
          >
            <div className="font-semibold" style={{ color: current.options[picked!].ok ? 'var(--success)' : 'var(--danger)' }}>
              {current.options[picked!].ok
                ? `✓ ${tp('Верно!', 'Correct!', 'Dobrze!')}`
                : `✗ ${tp('Неверно.', 'Wrong.', 'Zle.')} ${tp('Правильно', 'Correct', 'Poprawna')}: ${current.options.find((o) => o.ok)?.text}`}
            </div>
            <Explanation whyPl={current.whyPl} whyRu={current.whyRu} />
            <div className="mt-3 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={next}
                className="rounded-xl px-5 py-2 text-sm font-semibold"
                style={{ background: 'var(--accent-cyan)', color: '#04222e' }}
              >
                {pos + 1 >= queue.length
                  ? tp('Результаты', 'Results', 'Wyniki')
                  : `${tp('Дальше', 'Next', 'Dalej')} →`}
              </button>
              <button
                type="button"
                onClick={askAI}
                className="rounded-xl px-4 py-2 text-sm"
                style={{ background: 'var(--hover-bg)', color: 'var(--accent-cyan)', border: '1px solid var(--border-subtle)' }}
              >
                🎓 {tp('Спросить AI', 'Ask AI', 'Zapytaj AI')}
              </button>
              <a
                href={`/sternik/teoria#${THEORY_ANCHOR[current.cat] ?? ''}`}
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-xl px-4 py-2 text-sm"
                style={{ background: 'var(--hover-bg)', color: 'var(--text-secondary)', border: '1px solid var(--border-subtle)' }}
              >
                📖 {tp('Теория по теме ↗', 'Topic theory ↗', 'Teoria tematu ↗')}
              </a>
            </div>
          </div>
        )}

        {!answered && (
          <div className="mt-4 flex justify-end">
            <button
              type="button"
              onClick={askAI}
              className="text-xs"
              style={{ color: 'var(--text-muted)' }}
            >
              🎓 {tp('Перевести / объяснить (AI)', 'Translate / explain (AI)', 'Przetlumacz / wyjasnij (AI)')}
            </button>
          </div>
        )}
      </div>

      {/* Pause overlay */}
      {paused && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: 'rgba(4,12,22,0.85)', backdropFilter: 'blur(4px)' }}
        >
          <div
            className="w-full max-w-sm rounded-2xl p-6 text-center"
            style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)' }}
          >
            <div className="text-4xl">⏸</div>
            <div className="mt-2 text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>
              {tp('Пауза', 'Paused', 'Pauza')}
            </div>
            <p className="mt-1 text-sm" style={{ color: 'var(--text-muted)' }}>
              {tp('Таймер остановлен', 'Timer stopped', 'Czas zatrzymany')} · {formatClock(elapsed)}
            </p>
            <button
              type="button"
              onClick={() => setPaused(false)}
              className="mt-4 w-full rounded-xl px-4 py-2 font-semibold"
              style={{ background: 'var(--accent-cyan)', color: '#04222e' }}
            >
              ▶ {tp('Продолжить', 'Resume', 'Wznow')}
            </button>
          </div>
        </div>
      )}
    </main>
  );
}

export default function SternikTestPage() {
  return (
    <Suspense fallback={null}>
      <TrainerInner />
    </Suspense>
  );
}
