'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useI18n } from '@/lib/i18n';
import { SRC_BANK, SRC_PARTS, type SrcQuestion } from '@/data/src-radio';
import {
  loadQuestionProgress,
  saveQuestionProgress,
  withQuestionAnswer,
  type QuestionProgress,
} from '../questionProgress';
import { record as recordWeak } from '../weakSpots';
import { THEORY_CHAPTERS } from '../teoria/courseData';
import { CHAPTER_QUESTION_IDS, theoryHrefForQuestion, type TheoryChapterId } from '../teoria/courseMap';
import { radioRuntimeSearch } from '../runtimeSearch';

// ============================================================================
// /radio/test - trainer over the OFFICIAL UKE SRC question base (324 A/B/C
// questions from materialy_do_testu_src.pdf). UKE publishes no answer key;
// ours was authored + cross-verified by a multi-agent workflow and is clearly
// labeled as a study aid. Progress persists on-device.
// ============================================================================

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

type PartFilter = 'all' | 1 | 2;
type TrainingMode = 'adaptive' | 'exam' | 'weak';

export default function SrcTrainerPage() {
  const { tp, lang } = useI18n();
  const [progress, setProgress] = useState<QuestionProgress>({});
  const [part, setPart] = useState<PartFilter>('all');
  const [mode, setMode] = useState<TrainingMode>('adaptive');
  const [chapterId, setChapterId] = useState<TheoryChapterId | null>(null);
  const [queue, setQueue] = useState<SrcQuestion[]>([]);
  const [idx, setIdx] = useState(0);
  const [picked, setPicked] = useState<number | null>(null);
  const [sessionOk, setSessionOk] = useState(0);
  const [sessionN, setSessionN] = useState(0);

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      setProgress(loadQuestionProgress());
      const search = new URLSearchParams(radioRuntimeSearch());
      const requestedChapter = search.get('chapter');
      if (requestedChapter && requestedChapter in CHAPTER_QUESTION_IDS) {
        setChapterId(requestedChapter as TheoryChapterId);
      }
      if (search.get('mode') === 'weak') setMode('weak');
      if (search.get('mode') === 'exam') setMode('exam');
    });
    return () => window.cancelAnimationFrame(frame);
  }, []);

  const chapter = chapterId
    ? THEORY_CHAPTERS.find((item) => item.id === chapterId) ?? null
    : null;

  const pool = useMemo(() => {
    let selected = chapterId
      ? SRC_BANK.filter((question) => CHAPTER_QUESTION_IDS[chapterId].includes(question.id))
      : SRC_BANK.filter((question) => part === 'all' || question.part === part);
    if (mode === 'weak') {
      selected = selected.filter((question) => {
        const stat = progress[question.id];
        return Boolean(stat && stat.seen > 0 && stat.streak < 2);
      });
    }
    return selected;
  }, [chapterId, mode, part, progress]);

  const start = useCallback(() => {
    const scored = mode === 'exam' && !chapterId
      ? shuffle([
          ...shuffle(SRC_BANK.filter((question) => question.part === 1)).slice(0, 5),
          ...shuffle(SRC_BANK.filter((question) => question.part === 2)).slice(0, 5),
        ])
      : shuffle(pool).sort((a, b) => {
          const sa = progress[a.id]?.streak ?? -1;
          const sb = progress[b.id]?.streak ?? -1;
          return sa - sb;
        });
    setQueue(scored);
    setIdx(0);
    setPicked(null);
    setSessionOk(0);
    setSessionN(0);
  }, [chapterId, mode, pool, progress]);

  const current = queue[idx];

  const answer = useCallback((i: number) => {
    if (!current || picked !== null) return;
    setPicked(i);
    const ok = i === current.correct;
    setSessionOk((v) => v + (ok ? 1 : 0));
    setSessionN((v) => v + 1);
    setProgress((p) => {
      const next = withQuestionAnswer(p, current.id, ok);
      saveQuestionProgress(next);
      return next;
    });
    recordWeak(
      'theory',
      ok ? [] : [{ id: current.id, label: current.q }],
      ok ? [{ id: current.id }] : [],
    );
  }, [current, picked]);

  const next = useCallback(() => {
    setPicked(null);
    setIdx((v) => v + 1);
  }, []);

  // aggregate stats
  const seenIds = pool.filter((q) => (progress[q.id]?.seen ?? 0) > 0).length;
  const mastered = pool.filter((q) => (progress[q.id]?.streak ?? 0) >= 2).length;

  const letters = ['A', 'B', 'C'];

  return (
    <div id="radio-src-trainer">
      <h1 className="mb-1 text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>
        ✅ {tp('Тренажёр: официальная база UKE (SRC)', 'Trainer: official UKE SRC base', 'Trening: oficjalna baza UKE (SRC)')}
      </h1>
      <p className="mb-3 text-sm" style={{ color: 'var(--text-secondary)' }}>
        {tp(
          '324 вопроса из официальных материалов UKE к тесту SRC (по 5 из каждого раздела попадут на экзамен). Ответил - сразу видишь верно/нет и почему.',
          'All 324 questions from the official UKE SRC study materials. Instant right/wrong feedback with explanations.',
          '324 pytania z oficjalnych materialow UKE do testu SRC. Odpowiadasz - od razu widzisz dobrze/zle i dlaczego.',
        )}
      </p>

      <div className="mb-4 rounded-xl px-4 py-3 text-xs leading-relaxed" style={{ background: 'rgba(255,210,74,0.08)', border: '1px solid rgba(255,210,74,0.3)', color: 'var(--text-secondary)' }}>
        ⚠️ {tp(
          'UKE не публикует ключа ответов. Наш ключ составлен и перекрёстно проверен автоматически (по ITU/SOLAS/GMDSS-источникам); спорные вопросы помечены. Это учебное пособие, а не официальный ключ.',
          'UKE publishes no answer key. Ours was authored and cross-verified automatically against ITU/SOLAS/GMDSS sources; uncertain items are flagged. A study aid, not an official key.',
          'UKE nie publikuje klucza odpowiedzi. Nasz klucz powstal i zostal niezaleznie zweryfikowany automatycznie (zrodla ITU/SOLAS/GMDSS); watpliwe pytania sa oznaczone. To pomoc naukowa, nie oficjalny klucz.',
        )}
      </div>

      <div className="mb-4 flex flex-wrap gap-2" role="group" aria-label={tp('Режим тренировки', 'Training mode', 'Tryb treningu')}>
        {([
          ['adaptive', tp('Учить', 'Learn', 'Nauka')],
          ['exam', tp('Пробный экзамен', 'Mock exam', 'Egzamin probny')],
          ['weak', tp('Слабые места', 'Weak spots', 'Slabe punkty')],
        ] as const).map(([value, label]) => (
          <button
            key={value}
            type="button"
            aria-pressed={mode === value}
            onClick={() => { setMode(value); setQueue([]); }}
            className="min-h-[44px] rounded-xl px-4 text-sm font-semibold"
            style={mode === value
              ? { background: 'var(--accent-cyan)', color: 'var(--accent-ink)' }
              : { background: 'var(--bg-card)', color: 'var(--text-secondary)', border: '1px solid var(--border-subtle)' }}
          >
            {label}
          </button>
        ))}
      </div>

      {chapter && (
        <div className="mb-4 flex flex-wrap items-center gap-3 rounded-xl border px-4 py-3" style={{ borderColor: 'var(--border-subtle)', background: 'var(--bg-secondary)' }}>
          <span className="text-sm" style={{ color: 'var(--text-primary)' }}>
            {tp('Тема', 'Topic', 'Temat')}: {lang === 'ru' ? chapter.title.ru : chapter.title.pl}
          </span>
          <button
            type="button"
            onClick={() => { setChapterId(null); setQueue([]); }}
            className="ml-auto min-h-[44px] rounded-lg px-3 text-xs font-semibold"
            style={{ color: 'var(--text-secondary)' }}
          >
            {tp('Вся база', 'Full bank', 'Cala baza')}
          </button>
        </div>
      )}

      <div className="mb-4 flex flex-wrap items-center gap-2">
        {!chapterId && mode !== 'exam' && (['all', 1, 2] as PartFilter[]).map((p) => (
          <button
            key={String(p)}
            type="button"
            onClick={() => { setPart(p); setQueue([]); }}
            className="min-h-[44px] rounded-full px-4 text-sm font-medium"
            style={part === p
              ? { background: 'var(--accent-cyan)', color: 'var(--accent-ink, #04222e)' }
              : { background: 'var(--bg-card)', color: 'var(--text-secondary)', border: '1px solid var(--border-subtle)' }}
          >
            {p === 'all' ? tp('Все', 'All', 'Wszystkie') : `${tp('Раздел', 'Part', 'Dzial')} ${p}`}
            {' '}
            <span className="opacity-60">{p === 'all' ? SRC_BANK.length : SRC_BANK.filter((q) => q.part === p).length}</span>
          </button>
        ))}
        <span className="ml-auto text-xs" style={{ color: 'var(--text-muted)' }}>
          {tp('пройдено', 'seen', 'przerobione')} {seenIds}/{pool.length} · {tp('закреплено', 'mastered', 'utrwalone')} {mastered}
        </span>
      </div>

      {/* session */}
      {!current ? (
        <div className="rounded-2xl p-6 text-center" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)' }}>
          {queue.length > 0 && idx >= queue.length ? (
            <>
              <div className="text-3xl">🏁</div>
              <div className="mt-2 font-semibold" style={{ color: 'var(--text-primary)' }}>
                {tp('Серия пройдена', 'Round finished', 'Runda zakonczona')}: {sessionOk}/{sessionN}
              </div>
            </>
          ) : (
            <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
              {mode === 'exam'
                ? tp('10 вопросов: 5 из каждого раздела, как на теоретическом экзамене UKE.', '10 questions: 5 from each section, matching the UKE theory format.', '10 pytan: po 5 z kazdego dzialu, jak na egzaminie teoretycznym UKE.')
                : pool.length === 0 && mode === 'weak'
                  ? tp('Пока нет вопросов для повторения. Ошибки из курса и банка появятся здесь.', 'There are no questions to review yet. Mistakes from the course and bank will appear here.', 'Nie ma jeszcze pytan do powtorki. Bledy z kursu i banku pojawia sie tutaj.')
                  : chapter
                    ? `${lang === 'ru' ? chapter.title.ru : chapter.title.pl}: ${pool.length}`
                    : part === 'all'
                ? tp('Вся база: сначала пойдут вопросы, которые ты ещё не видел или путаешь.', 'Full base: unseen and shaky questions come first.', 'Cala baza: najpierw pytania nowe i te, ktore mylisz.')
                : SRC_PARTS[part]}
            </p>
          )}
          <button
            type="button"
            data-testid="start-training"
            onClick={start}
            className="mt-4 min-h-[44px] rounded-xl px-6 text-sm font-semibold"
            style={{ background: 'var(--accent-cyan)', color: 'var(--accent-ink, #04222e)' }}
          >
            {queue.length > 0 && idx >= queue.length ? tp('Ещё раз', 'Again', 'Jeszcze raz') : tp('Начать', 'Start', 'Start')}
          </button>
        </div>
      ) : (
        <div className="rounded-2xl p-5" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)' }}>
          <div className="mb-2 flex items-center gap-2 text-xs" style={{ color: 'var(--text-muted)' }}>
            <span className="rounded-full px-2 py-0.5" style={{ background: 'var(--hover-bg)', color: 'var(--accent-cyan)' }}>
              {tp('Раздел', 'Part', 'Dzial')} {current.part}
            </span>
            <span>{idx + 1}/{queue.length}</span>
            {current.confidence === 'unsure' && (
              <span title={tp('Ответ спорный - проверь в источниках', 'Uncertain key - double-check', 'Klucz watpliwy - sprawdz w zrodlach')} style={{ color: 'var(--warning)' }}>
                ⚠️ {tp('спорный ключ', 'uncertain key', 'watpliwy klucz')}
              </span>
            )}
            <span className="ml-auto">{sessionOk}/{sessionN} ✓</span>
          </div>

          <div className="mb-4 text-base font-medium leading-snug" style={{ color: 'var(--text-primary)' }}>
            {current.q}
          </div>

          <div className="space-y-2">
            {current.options.map((opt, i) => {
              const isPicked = picked === i;
              const isCorrect = i === current.correct;
              const show = picked !== null;
              return (
                <button
                  key={i}
                  type="button"
                  onClick={() => answer(i)}
                  disabled={picked !== null}
                  className="flex w-full items-start gap-2 rounded-xl px-4 py-3 text-left text-sm transition disabled:cursor-default"
                  style={{
                    background: show && isCorrect ? 'rgba(68,255,136,0.10)' : show && isPicked ? 'rgba(255,85,102,0.10)' : 'var(--bg-secondary)',
                    border: `1px solid ${show && isCorrect ? 'var(--success)' : show && isPicked ? 'var(--danger, #ff6a5a)' : 'var(--border-subtle)'}`,
                    color: 'var(--text-primary)',
                  }}
                >
                  <span className="font-bold" style={{ color: 'var(--accent-cyan)' }}>{letters[i]}</span>
                  <span>{opt}</span>
                  {show && isCorrect && <span className="ml-auto shrink-0" style={{ color: 'var(--success)' }}>✓</span>}
                  {show && isPicked && !isCorrect && <span className="ml-auto shrink-0" style={{ color: 'var(--danger, #ff6a5a)' }}>✗</span>}
                </button>
              );
            })}
          </div>

          {picked !== null && (
            <>
              <div role="status" aria-live="polite" className="mt-3 rounded-xl px-4 py-3 text-sm leading-relaxed" style={{ background: 'rgba(0,212,255,0.06)', border: '1px solid rgba(0,212,255,0.2)', color: 'var(--text-secondary)' }}>
                {picked === current.correct ? '✅ ' : '❌ '}{current.whyPl}
                {lang === 'ru' && (
                  <span className="mt-2 block text-xs" style={{ color: 'var(--text-muted)' }}>
                    Официальная база вопросов UKE и пояснения к ней доступны только на польском.
                  </span>
                )}
                <Link
                  href={theoryHrefForQuestion(current.id)}
                  className="mt-3 flex min-h-[44px] items-center font-semibold underline underline-offset-4"
                  style={{ color: 'var(--accent-cyan)' }}
                >
                  {tp('Открыть связанную главу теории', 'Open the related theory chapter', 'Otworz powiazany rozdzial teorii')}
                </Link>
              </div>
              <button
                type="button"
                data-testid="next-question"
                onClick={next}
                className="mt-3 min-h-[44px] w-full rounded-xl text-sm font-semibold"
                style={{ background: 'var(--accent-cyan)', color: 'var(--accent-ink, #04222e)' }}
              >
                {tp('Дальше', 'Next', 'Dalej')} →
              </button>
            </>
          )}
        </div>
      )}

      <div className="mt-6 flex flex-wrap gap-2">
        <Link href="/radio/teoria" className="flex min-h-[44px] items-center rounded-xl px-4 text-sm" style={{ background: 'var(--bg-card)', color: 'var(--text-primary)', border: '1px solid var(--border-subtle)' }}>
          📻 {tp('Теория рации', 'Radio theory', 'Teoria radia')}
        </Link>
        <Link href="/radio/symulator" className="flex min-h-[44px] items-center rounded-xl px-4 text-sm" style={{ background: 'var(--bg-card)', color: 'var(--text-primary)', border: '1px solid var(--border-subtle)' }}>
          🎙️ {tp('Симулятор', 'Simulator', 'Symulator')}
        </Link>
      </div>
    </div>
  );
}
