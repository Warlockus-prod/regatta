'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { useI18n } from '@/lib/i18n';
import {
  STERNIK_BASE_COUNTS,
  STERNIK_CATEGORY_BY_ID,
  STERNIK_EXAM,
  STERNIK_EXAM_POOL,
  filterByBase,
} from '@/data/sternik';
import {
  loadSternikProgress,
  recordSternikAnswer,
  recordSternikExam,
  type SternikExamAttempt,
} from '@/lib/sternik-progress';
import { OPTION_LETTERS, formatClock, prepareQuestion, shuffled, type PreparedQuestion } from '../quiz-utils';
import QuestionFigure, { QuestionPhoto } from '../QuestionFigure';
import { BaseToggle, Explanation, useSternikPrefs } from '../prefs';
import PersonalReport from '../PersonalReport';
import { useFocusTrap } from '../useFocusTrap';

// ============================================================================
// /sternik/egzamin - mock exam in real format: 75 questions, 90 minutes,
// pass mark 65. No instant feedback; navigator with flags; pause stops the
// clock; timeout auto-submits; full review afterwards.
// ============================================================================

type Phase = 'intro' | 'exam' | 'result';

export default function SternikExamPage() {
  const { tp } = useI18n();
  const { examBase } = useSternikPrefs();
  const [phase, setPhase] = useState<Phase>('intro');
  const [questions, setQuestions] = useState<PreparedQuestion[]>([]);
  const [answers, setAnswers] = useState<(number | null)[]>([]);
  const [flags, setFlags] = useState<Set<number>>(new Set());
  const [pos, setPos] = useState(0);
  const [secondsLeft, setSecondsLeft] = useState(STERNIK_EXAM.minutes * 60);
  const [paused, setPaused] = useState(false);
  const [confirmFinish, setConfirmFinish] = useState(false);
  const [showNav, setShowNav] = useState(false); // question grid collapsed by default (mobile-friendly)
  const [attempts, setAttempts] = useState<SternikExamAttempt[]>([]);
  const [lastAttempt, setLastAttempt] = useState<SternikExamAttempt | null>(null);
  const timedOutRef = useRef(false);
  const pauseTrapRef = useFocusTrap<HTMLDivElement>(paused, () => setPaused(false));
  const confirmTrapRef = useFocusTrap<HTMLDivElement>(confirmFinish, () => setConfirmFinish(false));

  useEffect(() => {
    setAttempts(loadSternikProgress().exams.slice().reverse());
  }, [phase]);

  // Countdown - only while exam runs and not paused.
  useEffect(() => {
    if (phase !== 'exam' || paused) return;
    const t = setInterval(() => {
      setSecondsLeft((s) => {
        if (s <= 1) {
          timedOutRef.current = true;
          return 0;
        }
        return s - 1;
      });
    }, 1000);
    return () => clearInterval(t);
  }, [phase, paused]);

  // Auto-submit on timeout.
  useEffect(() => {
    if (phase === 'exam' && secondsLeft === 0 && timedOutRef.current) {
      finish(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [secondsLeft, phase]);

  const start = () => {
    const pool = filterByBase(STERNIK_EXAM_POOL, examBase);
    const qs = shuffled(pool).slice(0, STERNIK_EXAM.questions).map(prepareQuestion);
    setQuestions(qs);
    setAnswers(new Array(qs.length).fill(null));
    setFlags(new Set());
    setPos(0);
    setSecondsLeft(STERNIK_EXAM.minutes * 60);
    setPaused(false);
    setConfirmFinish(false);
    timedOutRef.current = false;
    setPhase('exam');
  };

  const finish = (timedOut = false) => {
    const wrongIds: string[] = [];
    let correct = 0;
    questions.forEach((q, i) => {
      const picked = answers[i];
      const ok = picked !== null && q.options[picked].ok;
      if (ok) correct += 1;
      else wrongIds.push(q.id);
      // Feed per-question stats: unanswered counts as wrong.
      recordSternikAnswer(q.id, ok);
    });
    const attempt: SternikExamAttempt = {
      ts: Date.now(),
      correct,
      total: questions.length,
      passed: correct >= STERNIK_EXAM.passCorrect,
      durationSec: STERNIK_EXAM.minutes * 60 - secondsLeft,
      wrongIds,
      timedOut,
    };
    recordSternikExam(attempt);
    setLastAttempt(attempt);
    setConfirmFinish(false);
    setPhase('result');
  };

  const unansweredCount = answers.filter((a) => a === null).length;

  // --------------------------------------------------------------- intro ---
  if (phase === 'intro') {
    return (
      <main>
        <h1 className="mb-1 text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>
          ⏱️ {tp('Пробный экзамен', 'Mock exam', 'Probny egzamin')}
        </h1>
        <p className="mb-5 max-w-2xl text-sm" style={{ color: 'var(--text-secondary)' }}>
          {tp(
            `${STERNIK_EXAM.questions} случайных вопросов формата экзамена (3 варианта A/B/C), ${STERNIK_EXAM.minutes} минут, порог ${STERNIK_EXAM.passCorrect}. Без мгновенной проверки - результат и разбор в конце, как на настоящем экзамене. Можно ставить флажки и возвращаться к вопросам. Пауза останавливает таймер (на реальном экзамене её нет).`,
            `${STERNIK_EXAM.questions} random exam-format questions (3 options A/B/C), ${STERNIK_EXAM.minutes} minutes, pass mark ${STERNIK_EXAM.passCorrect}. No instant feedback - score and review at the end, like the real exam. Flag questions and come back. Pause stops the clock (the real exam has none).`,
            `${STERNIK_EXAM.questions} losowych pytan w formacie egzaminu (3 warianty A/B/C), ${STERNIK_EXAM.minutes} minut, prog ${STERNIK_EXAM.passCorrect}. Bez natychmiastowej odpowiedzi - wynik i powtorka na koncu. Mozna flagowac pytania i wracac.`,
          )}
        </p>
        <div className="mb-5">
          <BaseToggle counts={STERNIK_BASE_COUNTS} />
          <p className="mt-1.5 text-xs" style={{ color: 'var(--text-muted)' }}>
            {tp(
              'Материалы - оригинальные 77 вопросов из конспекта; Интернет - собранные из открытых источников; Общая - всё вместе.',
              'Materials - the original 77 konspekt questions; Internet - harvested from open sources; All - everything.',
              'Materialy - oryginalne 77 pytan z konspektu; Internet - zebrane ze zrodel otwartych; Wszystkie - razem.',
            )}
          </p>
        </div>
        <button
          type="button"
          onClick={start}
          className="rounded-2xl px-6 py-3 text-base font-bold transition hover:opacity-90"
          style={{ background: 'var(--accent-cyan)', color: '#04222e' }}
        >
          ▶ {tp('Начать экзамен', 'Start exam', 'Rozpocznij egzamin')}
        </button>

        {attempts.length > 0 && (
          <section className="mt-8">
            <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>
              {tp('История попыток', 'Attempt history', 'Historia podejsc')}
            </h2>
            <div className="space-y-2">
              {attempts.slice(0, 10).map((a, i) => (
                <div
                  key={a.ts + '-' + i}
                  className="flex items-center justify-between rounded-xl px-4 py-2 text-sm"
                  style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)' }}
                >
                  <span style={{ color: 'var(--text-muted)' }}>
                    {new Date(a.ts).toLocaleDateString()} {new Date(a.ts).toLocaleTimeString().slice(0, 5)}
                  </span>
                  <span className="tabular-nums" style={{ color: 'var(--text-secondary)' }}>
                    {formatClock(a.durationSec)}
                    {a.timedOut ? ' ⏰' : ''}
                  </span>
                  <span className="font-semibold" style={{ color: a.passed ? 'var(--success)' : 'var(--danger)' }}>
                    {a.correct}/{a.total} {a.passed ? tp('сдан', 'passed', 'zdany') : tp('не сдан', 'failed', 'niezdany')}
                  </span>
                </div>
              ))}
            </div>
          </section>
        )}
      </main>
    );
  }

  // -------------------------------------------------------------- result ---
  if (phase === 'result' && lastAttempt) {
    const a = lastAttempt;
    const wrongQuestions = questions
      .map((q, i) => ({ q, picked: answers[i] }))
      .filter(({ q, picked }) => !(picked !== null && q.options[picked].ok));

    return (
      <main>
        <div
          className="mb-6 rounded-2xl p-6 text-center"
          style={{
            background: 'var(--bg-card)',
            border: `1px solid ${a.passed ? 'rgba(68,255,136,0.5)' : 'rgba(255,68,68,0.5)'}`,
          }}
        >
          <div className="text-5xl">{a.passed ? '🎉' : '📚'}</div>
          <div className="mt-2 text-3xl font-bold" style={{ color: a.passed ? 'var(--success)' : 'var(--danger)' }}>
            {a.correct} / {a.total}
          </div>
          <div className="mt-1 font-semibold" style={{ color: a.passed ? 'var(--success)' : 'var(--danger)' }}>
            {a.passed
              ? tp('Экзамен сдан!', 'Exam passed!', 'Egzamin zdany!')
              : tp(`Не сдан - нужно ${STERNIK_EXAM.passCorrect}`, `Failed - you need ${STERNIK_EXAM.passCorrect}`, `Niezdany - potrzeba ${STERNIK_EXAM.passCorrect}`)}
          </div>
          <div className="mt-1 text-sm" style={{ color: 'var(--text-muted)' }}>
            {tp('Время', 'Time', 'Czas')}: {formatClock(a.durationSec)}
            {a.timedOut ? ` · ${tp('время вышло', 'time ran out', 'czas minal')} ⏰` : ''}
            {' · '}
            {tp('ошибок', 'mistakes', 'bledow')}: {a.total - a.correct}
          </div>
          <div className="mt-4 flex flex-wrap justify-center gap-2">
            <button
              type="button"
              onClick={start}
              className="rounded-xl px-4 py-2 text-sm font-semibold"
              style={{ background: 'var(--accent-cyan)', color: '#04222e' }}
            >
              🔄 {tp('Ещё попытка', 'Try again', 'Jeszcze raz')}
            </button>
            {wrongQuestions.length > 0 && (
              <Link
                href="/sternik/test?mode=errors"
                className="rounded-xl px-4 py-2 text-sm font-semibold"
                style={{ background: 'var(--warning)', color: '#221a04' }}
              >
                🔁 {tp('Тренировать ошибки', 'Train mistakes', 'Trenuj bledy')}
              </Link>
            )}
            <Link
              href="/sternik"
              className="rounded-xl px-4 py-2 text-sm"
              style={{ background: 'var(--bg-secondary)', color: 'var(--text-primary)', border: '1px solid var(--border-subtle)' }}
            >
              {tp('На главную раздела', 'Section home', 'Strona glowna')}
            </Link>
          </div>
        </div>

        <div className="mb-6">
          <PersonalReport progress={loadSternikProgress()} />
        </div>

        {wrongQuestions.length > 0 && (
          <section>
            <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>
              {tp('Разбор ошибок', 'Error review', 'Powtorka bledow')} ({wrongQuestions.length})
            </h2>
            <div className="space-y-3">
              {wrongQuestions.map(({ q, picked }, i) => {
                const cat = STERNIK_CATEGORY_BY_ID[q.cat];
                return (
                  <div
                    key={q.id + '-' + i}
                    className="rounded-xl p-4"
                    style={{ background: 'var(--bg-card)', border: '1px solid rgba(255,68,68,0.35)' }}
                  >
                    <div className="mb-1 text-xs" style={{ color: cat.color }}>
                      {cat.icon} {cat.pl}
                    </div>
                    <div className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                      {q.q}
                    </div>
                    <div className="mt-1 text-sm" style={{ color: 'var(--danger)' }}>
                      ✗{' '}
                      {picked === null
                        ? tp('Без ответа', 'No answer', 'Brak odpowiedzi')
                        : `${tp('Твой ответ', 'Your answer', 'Twoja odpowiedz')}: ${q.options[picked].text}`}
                    </div>
                    <div className="text-sm" style={{ color: 'var(--success)' }}>
                      ✓ {q.options.find((o) => o.ok)?.text}
                    </div>
                    <Explanation whyPl={q.whyPl} whyRu={q.whyRu} />
                  </div>
                );
              })}
            </div>
          </section>
        )}
      </main>
    );
  }

  // ---------------------------------------------------------------- exam ---
  const current = questions[pos];
  if (!current) return null;
  const picked = answers[pos];
  const lowTime = secondsLeft <= 5 * 60;

  return (
    <main className="relative">
      {/* Top bar: timer + finish (sticky so the clock stays visible on mobile) */}
      <div
        className="sticky z-30 -mx-4 mb-3 flex items-center justify-between gap-3 px-4 py-2 text-sm"
        style={{ top: 56, background: 'var(--bg-primary)', borderBottom: '1px solid var(--border-subtle)' }}
      >
        <div className="flex items-center gap-2">
          <span
            className="rounded-lg px-3 py-1 font-mono text-base font-bold tabular-nums"
            style={{
              background: lowTime ? 'rgba(255,68,68,0.15)' : 'var(--bg-card)',
              color: lowTime ? 'var(--danger)' : 'var(--accent-cyan)',
              border: '1px solid var(--border-subtle)',
            }}
          >
            {formatClock(secondsLeft)}
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
        <div style={{ color: 'var(--text-secondary)' }}>
          {tp('Отвечено', 'Answered', 'Odpowiedziano')}: {answers.length - unansweredCount}/{questions.length}
        </div>
        <button
          type="button"
          onClick={() => setConfirmFinish(true)}
          className="rounded-lg px-3 py-1 font-semibold"
          style={{ background: 'var(--success)', color: '#042e14' }}
        >
          {tp('Завершить', 'Finish', 'Zakoncz')}
        </button>
      </div>

      {/* Navigator - collapsed by default so it does not eat the first screen */}
      <div className="mb-4">
        <button
          type="button"
          onClick={() => setShowNav((v) => !v)}
          className="flex min-h-[40px] w-full items-center justify-between rounded-xl px-3 text-sm"
          style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)', color: 'var(--text-secondary)' }}
        >
          <span>🧭 {tp('Все вопросы', 'All questions', 'Wszystkie pytania')} ({answers.length - unansweredCount}/{questions.length})</span>
          <span>{showNav ? '▲' : '▼'}</span>
        </button>
        {showNav && (
          <div className="mt-2 grid grid-cols-8 gap-1.5 sm:grid-cols-12">
            {questions.map((_, i) => {
              const isCurrent = i === pos;
              const done = answers[i] !== null;
              const flagged = flags.has(i);
              return (
                <button
                  key={i}
                  type="button"
                  onClick={() => { setPos(i); setShowNav(false); }}
                  className="flex aspect-square min-h-[36px] items-center justify-center rounded text-xs font-semibold transition"
                  style={{
                    background: isCurrent
                      ? 'var(--accent-cyan)'
                      : flagged
                        ? 'rgba(255,170,0,0.25)'
                        : done
                          ? 'rgba(68,255,136,0.18)'
                          : 'var(--bg-card)',
                    color: isCurrent ? '#04222e' : flagged ? 'var(--warning)' : done ? 'var(--success)' : 'var(--text-muted)',
                    border: '1px solid var(--border-subtle)',
                  }}
                  aria-label={`${tp('Вопрос', 'Question', 'Pytanie')} ${i + 1}`}
                >
                  {i + 1}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Question card */}
      <div
        className="rounded-2xl p-5"
        style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)' }}
      >
        <div className="mb-2 flex items-center justify-between text-xs" style={{ color: 'var(--text-muted)' }}>
          <span>
            {tp('Вопрос', 'Question', 'Pytanie')} {pos + 1} / {questions.length}
          </span>
          <button
            type="button"
            onClick={() =>
              setFlags((f) => {
                const nf = new Set(f);
                if (nf.has(pos)) nf.delete(pos);
                else nf.add(pos);
                return nf;
              })
            }
            className="rounded-lg px-2 py-1"
            style={{
              background: flags.has(pos) ? 'rgba(255,170,0,0.2)' : 'var(--hover-bg)',
              color: flags.has(pos) ? 'var(--warning)' : 'var(--text-muted)',
            }}
          >
            🚩 {flags.has(pos) ? tp('Помечен', 'Flagged', 'Oznaczone') : tp('Пометить', 'Flag', 'Oznacz')}
          </button>
        </div>

        <div className="mb-4 text-lg font-medium leading-snug" style={{ color: 'var(--text-primary)' }}>
          {current.q}
        </div>

        {current.figure && <QuestionFigure id={current.figure} />}
        {current.photo && <QuestionPhoto photo={current.photo} alt={current.q} />}

        <div className="space-y-2">
          {current.options.map((o, i) => {
            const selected = picked === i;
            return (
              <button
                key={i}
                type="button"
                onClick={() =>
                  setAnswers((a) => {
                    const na = a.slice();
                    na[pos] = i;
                    return na;
                  })
                }
                className="flex w-full items-start gap-3 rounded-xl px-4 py-3 text-left text-sm transition"
                style={{
                  background: selected ? 'rgba(0,212,255,0.14)' : 'var(--bg-secondary)',
                  border: `1px solid ${selected ? 'var(--accent-cyan)' : 'var(--border-subtle)'}`,
                  color: selected ? 'var(--accent-cyan)' : 'var(--text-primary)',
                }}
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

        <div className="mt-4 flex items-center justify-between">
          <button
            type="button"
            disabled={pos === 0}
            onClick={() => setPos((p) => Math.max(0, p - 1))}
            className="rounded-xl px-4 py-2 text-sm disabled:opacity-30"
            style={{ background: 'var(--bg-secondary)', color: 'var(--text-primary)', border: '1px solid var(--border-subtle)' }}
          >
            ← {tp('Назад', 'Back', 'Wstecz')}
          </button>
          <button
            type="button"
            disabled={pos + 1 >= questions.length}
            onClick={() => setPos((p) => Math.min(questions.length - 1, p + 1))}
            className="rounded-xl px-5 py-2 text-sm font-semibold disabled:opacity-30"
            style={{ background: 'var(--accent-cyan)', color: '#04222e' }}
          >
            {tp('Дальше', 'Next', 'Dalej')} →
          </button>
        </div>
      </div>

      {/* Pause overlay */}
      {paused && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={tp('Экзамен на паузе', 'Exam paused', 'Egzamin wstrzymany')}
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: 'rgba(4,12,22,0.92)', backdropFilter: 'blur(6px)' }}
        >
          <div
            ref={pauseTrapRef}
            tabIndex={-1}
            className="w-full max-w-sm rounded-2xl p-6 text-center outline-none"
            style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)' }}
          >
            <div className="text-4xl">⏸</div>
            <div className="mt-2 text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>
              {tp('Экзамен на паузе', 'Exam paused', 'Egzamin wstrzymany')}
            </div>
            <p className="mt-1 text-sm" style={{ color: 'var(--text-muted)' }}>
              {tp('Вопросы скрыты, таймер остановлен.', 'Questions hidden, timer stopped.', 'Pytania ukryte, czas zatrzymany.')}
              {' '}
              {formatClock(secondsLeft)}
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

      {/* Finish confirmation */}
      {confirmFinish && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={tp('Завершить экзамен?', 'Finish the exam?', 'Zakonczyc egzamin?')}
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: 'rgba(4,12,22,0.85)', backdropFilter: 'blur(4px)' }}
        >
          <div
            ref={confirmTrapRef}
            tabIndex={-1}
            className="w-full max-w-sm rounded-2xl p-6 text-center outline-none"
            style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)' }}
          >
            <div className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>
              {tp('Завершить экзамен?', 'Finish the exam?', 'Zakonczyc egzamin?')}
            </div>
            {unansweredCount > 0 && (
              <p className="mt-1 text-sm" style={{ color: 'var(--warning)' }}>
                {tp(
                  `Осталось ${unansweredCount} вопросов без ответа - они засчитаются как ошибки.`,
                  `${unansweredCount} questions unanswered - they count as mistakes.`,
                  `${unansweredCount} pytan bez odpowiedzi - beda liczone jako bledy.`,
                )}
              </p>
            )}
            <div className="mt-4 flex gap-2">
              <button
                type="button"
                onClick={() => setConfirmFinish(false)}
                className="flex-1 rounded-xl px-4 py-2 text-sm"
                style={{ background: 'var(--bg-secondary)', color: 'var(--text-primary)', border: '1px solid var(--border-subtle)' }}
              >
                {tp('Вернуться', 'Go back', 'Wroc')}
              </button>
              <button
                type="button"
                onClick={() => finish(false)}
                className="flex-1 rounded-xl px-4 py-2 text-sm font-semibold"
                style={{ background: 'var(--success)', color: '#042e14' }}
              >
                {tp('Завершить', 'Finish', 'Zakoncz')}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
