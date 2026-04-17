'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { bootcampLessons, BOOTCAMP_TOTAL_MINUTES } from '@/data/bootcamp';
import { getBootcampProgress, markLessonComplete, setCurrentLesson, resetBootcamp, type BootcampProgress } from '@/lib/storage';
import { useI18n } from '@/lib/i18n';

export default function StartHerePage() {
  const { lang, t } = useI18n();
  const [progress, setProgress] = useState<BootcampProgress | null>(null);

  useEffect(() => {
    setProgress(getBootcampProgress());
  }, []);

  if (!progress) {
    return <div className="max-w-3xl mx-auto px-4 py-10 text-center text-[var(--text-muted)]">…</div>;
  }

  const completedCount = progress.completed.length;
  const percentage = Math.round((completedCount / bootcampLessons.length) * 100);
  const allDone = completedCount === bootcampLessons.length;

  const handleToggleComplete = (lessonId: string) => {
    if (progress.completed.includes(lessonId)) {
      // Unmark
      const updated = { ...progress, completed: progress.completed.filter((id) => id !== lessonId) };
      setProgress(updated);
      // Persist by calling storage directly
      import('@/lib/storage').then((s) => s.setBootcampProgress(updated));
    } else {
      markLessonComplete(lessonId);
      setProgress(getBootcampProgress());
    }
  };

  const handleStartLesson = (lessonId: string) => {
    setCurrentLesson(lessonId);
  };

  const handleReset = () => {
    if (confirm(t('Сбросить весь прогресс?', 'Reset all progress?'))) {
      resetBootcamp();
      setProgress(getBootcampProgress());
    }
  };

  return (
    <div className="page-enter max-w-4xl mx-auto px-4 sm:px-6 py-6 sm:py-10">
      {/* Hero */}
      <div className="mb-8">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full mb-3 text-xs font-medium"
             style={{ background: 'rgba(0, 212, 255, 0.1)', border: '1px solid rgba(0, 212, 255, 0.25)', color: 'var(--accent-cyan)' }}>
          🎓 {t('Bootcamp', 'Bootcamp')}
        </div>
        <h1 className="text-3xl sm:text-4xl font-bold mb-2">
          {t('База за', 'Basics in')} <span style={{ color: 'var(--accent-cyan)' }}>{BOOTCAMP_TOTAL_MINUTES} {t('минут', 'min')}</span>
        </h1>
        <p className="text-[var(--text-secondary)] leading-relaxed max-w-2xl">
          {t(
            '8 уроков по 5 минут. От ветра до мини-гонки. Каждый урок - короткий визит в соответствующий раздел с конкретным заданием.',
            '8 lessons of 5 min each. From wind to mini-race. Each lesson is a short visit to the relevant section with a specific task.',
          )}
        </p>
      </div>

      {/* Progress bar */}
      <div className="card p-4 mb-6">
        <div className="flex items-center justify-between mb-2">
          <div className="text-sm font-semibold">
            {completedCount}/{bootcampLessons.length} {t('пройдено', 'completed')}
          </div>
          <div className="text-sm text-[var(--text-muted)]">{percentage}%</div>
        </div>
        <div className="h-2 rounded-full overflow-hidden" style={{ background: 'rgba(0,0,0,0.3)' }}>
          <div
            className="h-full transition-all"
            style={{ width: `${percentage}%`, background: allDone ? 'var(--success)' : 'linear-gradient(90deg, var(--accent-cyan), var(--success))' }}
          />
        </div>
        {completedCount > 0 && (
          <button
            onClick={handleReset}
            className="text-xs text-[var(--text-muted)] hover:text-[var(--text-secondary)] mt-3 transition"
          >
            {t('Сбросить прогресс', 'Reset progress')}
          </button>
        )}
      </div>

      {/* Lessons */}
      <div className="space-y-3">
        {bootcampLessons.map((lesson) => {
          const isDone = progress.completed.includes(lesson.id);
          const isCurrent = progress.current === lesson.id;
          const title = lang === 'ru' ? lesson.titleRu : lesson.titleEn;
          const summary = lang === 'ru' ? lesson.summaryRu : lesson.summaryEn;
          const focus = lang === 'ru' ? lesson.focusRu : lesson.focusEn;
          return (
            <div
              key={lesson.id}
              className="card p-4 sm:p-5 transition-all"
              style={{
                borderColor: isDone ? 'rgba(68, 255, 136, 0.3)' : isCurrent ? 'rgba(0, 212, 255, 0.3)' : undefined,
                background: isDone ? 'rgba(68, 255, 136, 0.04)' : undefined,
              }}
            >
              <div className="flex items-start gap-3 sm:gap-4">
                {/* Checkbox */}
                <button
                  onClick={() => handleToggleComplete(lesson.id)}
                  aria-label={isDone ? 'Mark incomplete' : 'Mark complete'}
                  className="w-6 h-6 rounded-full shrink-0 flex items-center justify-center transition mt-0.5"
                  style={{
                    background: isDone ? 'var(--success)' : 'transparent',
                    border: `2px solid ${isDone ? 'var(--success)' : 'rgba(139, 167, 184, 0.4)'}`,
                  }}
                >
                  {isDone && (
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#0a1628" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="20 6 9 17 4 12"/>
                    </svg>
                  )}
                </button>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <span className="text-xs font-mono text-[var(--text-muted)]">#{lesson.order}</span>
                    <span className="text-xl">{lesson.emoji}</span>
                    <h3 className={`text-base sm:text-lg font-semibold ${isDone ? 'line-through opacity-70' : ''}`}>
                      {title}
                    </h3>
                    <span className="text-[10px] px-2 py-0.5 rounded-full" style={{ background: 'rgba(0, 212, 255, 0.1)', color: 'var(--accent-cyan)' }}>
                      {lesson.estMinutes} {t('мин', 'min')}
                    </span>
                  </div>
                  <p className="text-sm text-[var(--text-secondary)] mb-2">{summary}</p>
                  <p className="text-xs text-[var(--text-muted)] italic mb-3">💡 {focus}</p>

                  <Link
                    href={lesson.route}
                    onClick={() => handleStartLesson(lesson.id)}
                    className="inline-flex items-center gap-1 text-sm font-medium"
                    style={{ color: isDone ? 'var(--success)' : 'var(--accent-cyan)' }}
                  >
                    <span>{isDone ? t('Повторить', 'Review') : isCurrent ? t('Продолжить', 'Continue') : t('Открыть', 'Open')}</span>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <polyline points="9 18 15 12 9 6"/>
                    </svg>
                  </Link>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Completion card */}
      {allDone && (
        <div
          className="mt-8 p-6 card text-center"
          style={{ background: 'linear-gradient(135deg, rgba(68, 255, 136, 0.1), rgba(0, 212, 255, 0.1))', borderColor: 'rgba(68, 255, 136, 0.3)' }}
        >
          <div className="text-4xl mb-3">🎉</div>
          <h3 className="text-xl font-bold mb-2">{t('База пройдена!', 'Basics complete!')}</h3>
          <p className="text-sm text-[var(--text-secondary)] mb-4">
            {t(
              'Ты освоил основы парусного дела. На воде пригодится всё - ветер, курсы, правила, тактика.',
              'You\'ve got the basics of sailing. Wind, courses, rules, tactics - all of it useful on the water.',
            )}
          </p>
          <div className="flex flex-wrap gap-2 justify-center">
            <Link
              href="/game"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg font-semibold text-sm"
              style={{ background: 'var(--accent-cyan)', color: '#0a1628' }}
            >
              {t('Гонка с AI', 'Race vs AI')}
            </Link>
            <Link
              href="/onboard"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg font-semibold text-sm border"
              style={{ borderColor: 'rgba(0, 212, 255, 0.3)', color: 'var(--accent-cyan)' }}
            >
              {t('Первая неделя на яхте', 'First week on board')}
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
