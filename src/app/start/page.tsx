'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { bootcampLessons, BOOTCAMP_TOTAL_MINUTES } from '@/data/bootcamp';
import { getBootcampProgress, markLessonComplete, setCurrentLesson, resetBootcamp, type BootcampProgress } from '@/lib/storage';
import { useI18n } from '@/lib/i18n';

export default function StartHerePage() {
  const { tp } = useI18n();
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
    if (confirm(tp('Сбросить весь прогресс?', 'Reset all progress?', 'Wyzerowac caly postep?'))) {
      resetBootcamp();
      setProgress(getBootcampProgress());
    }
  };

  return (
    <div className="page-enter max-w-4xl mx-auto px-4 sm:px-6 py-6 sm:py-10">
      {/* Track picker hub */}
      <div className="mb-8">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full mb-3 text-xs font-medium"
             style={{ background: 'rgba(0, 212, 255, 0.1)', border: '1px solid rgba(0, 212, 255, 0.25)', color: 'var(--accent-cyan)' }}>
          🎓 {tp('Выбери трек', 'Pick your track', 'Wybierz sciezke')}
        </div>
        <h1 className="text-3xl sm:text-4xl font-bold mb-2">
          {tp('С чего начнёшь?', 'Where do you start?', 'Od czego zaczynasz?')}
        </h1>
        <p className="text-[var(--text-secondary)] leading-relaxed max-w-2xl mb-5">
          {tp(
            'Три пути к старту. Выбери свой по времени и опыту.',
            'Three tracks to starting line. Pick one by time and experience.',
            'Trzy sciezki do startu. Wybierz swoja wedlug czasu i doswiadczenia.',
          )}
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-2">
          <div className="card p-4 ring-2" style={{ borderColor: 'var(--accent-cyan)', outlineColor: 'var(--accent-cyan)', background: 'rgba(0, 212, 255, 0.06)' }}>
            <div className="text-2xl mb-1">📚</div>
            <div className="font-semibold text-[var(--accent-cyan)]">{tp('Полный курс', 'Full course', 'Pelny kurs')}</div>
            <div className="text-[10px] text-[var(--text-muted)] mb-2">{BOOTCAMP_TOTAL_MINUTES} {tp('мин', 'min', 'min')} · 8 {tp('уроков', 'lessons', 'lekcji')}</div>
            <p className="text-xs text-[var(--text-secondary)]">{tp('Ты - совсем с нуля. Разберёшь всё по шагам.', 'From zero. Step by step.', 'Od zera. Krok po kroku.')}</p>
            <div className="text-[10px] text-[var(--text-muted)] mt-2">↓ {tp('ниже на странице', 'below on this page', 'ponizej na stronie')}</div>
          </div>
          <Link href="/quick" className="card p-4 hover:border-[var(--success)] transition">
            <div className="text-2xl mb-1">⚡</div>
            <div className="font-semibold" style={{ color: 'var(--success)' }}>{tp('Освежить', 'Refresh', 'Odswiezyc')}</div>
            <div className="text-[10px] text-[var(--text-muted)] mb-2">15 {tp('мин', 'min', 'min')} · 6 {tp('тем', 'topics', 'tematow')}</div>
            <p className="text-xs text-[var(--text-secondary)]">{tp('Опыт есть, регата - завтра. Только ключевое.', 'Got experience, race tomorrow. Key points only.', 'Masz doswiadczenie, regata jutro. Tylko kluczowe.')}</p>
          </Link>
          <Link href="/onboard" className="card p-4 hover:border-[var(--warning)] transition">
            <div className="text-2xl mb-1">⚓</div>
            <div className="font-semibold" style={{ color: 'var(--warning)' }}>{tp('На яхте', 'On board', 'Na pokladzie')}</div>
            <div className="text-[10px] text-[var(--text-muted)] mb-2">{tp('Как вести себя', 'How to behave', 'Jak sie zachowac')}</div>
            <p className="text-xs text-[var(--text-secondary)]">{tp('Команды, что опасно, что брать. Для первого выхода.', 'Commands, dangers, what to pack. For your first day aboard.', 'Komendy, co niebezpieczne, co zabrac. Na pierwsze wyjscie.')}</p>
          </Link>
        </div>
      </div>

      {/* Bootcamp section header */}
      <div className="mb-4 flex items-center gap-2">
        <span className="text-xl">📚</span>
        <h2 className="text-xl font-semibold">
          {tp('Полный курс:', 'Full course:', 'Pelny kurs:')} <span style={{ color: 'var(--accent-cyan)' }}>{BOOTCAMP_TOTAL_MINUTES} {tp('минут', 'min', 'minut')}</span>
        </h2>
      </div>

      {/* Progress bar */}
      <div className="card p-4 mb-6">
        <div className="flex items-center justify-between mb-2">
          <div className="text-sm font-semibold">
            {completedCount}/{bootcampLessons.length} {tp('пройдено', 'completed', 'ukonczono')}
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
            {tp('Сбросить прогресс', 'Reset progress', 'Wyzeruj postep')}
          </button>
        )}
      </div>

      {/* Lessons - accordion style, collapsed by default */}
      <div className="space-y-2">
        {bootcampLessons.map((lesson) => (
          <LessonAccordion
            key={lesson.id}
            lesson={lesson}
            done={progress.completed.includes(lesson.id)}
            current={progress.current === lesson.id}
            onToggle={() => handleToggleComplete(lesson.id)}
            onStart={() => handleStartLesson(lesson.id)}
          />
        ))}
      </div>

      {/* Completion card */}
      {allDone && (
        <div
          className="mt-8 p-6 card text-center"
          style={{ background: 'linear-gradient(135deg, rgba(68, 255, 136, 0.1), rgba(0, 212, 255, 0.1))', borderColor: 'rgba(68, 255, 136, 0.3)' }}
        >
          <div className="text-4xl mb-3">🎉</div>
          <h3 className="text-xl font-bold mb-2">{tp('База пройдена!', 'Basics complete!', 'Podstawy ukonczone!')}</h3>
          <p className="text-sm text-[var(--text-secondary)] mb-4">
            {tp(
              'Ты освоил основы парусного дела. На воде пригодится всё - ветер, курсы, правила, тактика.',
              'You\'ve got the basics of sailing. Wind, courses, rules, tactics - all of it useful on the water.',
              'Masz juz podstawy zeglarstwa. Na wodzie przyda sie wszystko - wiatr, kursy, zasady, taktyka.',
            )}
          </p>
          <div className="flex flex-wrap gap-2 justify-center">
            <Link
              href="/game"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg font-semibold text-sm"
              style={{ background: 'var(--accent-cyan)', color: '#0a1628' }}
            >
              {tp('Гонка с AI', 'Race vs AI', 'Wyscig z AI')}
            </Link>
            <Link
              href="/onboard"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg font-semibold text-sm border"
              style={{ borderColor: 'rgba(0, 212, 255, 0.3)', color: 'var(--accent-cyan)' }}
            >
              {tp('Первая неделя на яхте', 'First week on board', 'Pierwszy tydzien na jachcie')}
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================================================
// LessonAccordion - collapsible lesson card with inline summary
// ============================================================================

interface LessonLike {
  id: string;
  order: number;
  emoji: string;
  route: string;
  estMinutes: number;
  titleRu: string; titleEn: string; titlePl: string;
  summaryRu: string; summaryEn: string; summaryPl: string;
  focusRu: string; focusEn: string; focusPl: string;
}

function LessonAccordion({
  lesson, done, current, onToggle, onStart,
}: {
  lesson: LessonLike;
  done: boolean;
  current: boolean;
  onToggle: () => void;
  onStart: () => void;
}) {
  const { lang, tp } = useI18n();
  const [open, setOpen] = useState(current);
  const title = lang === 'pl' ? lesson.titlePl : lang === 'en' ? lesson.titleEn : lesson.titleRu;
  const summary = lang === 'pl' ? lesson.summaryPl : lang === 'en' ? lesson.summaryEn : lesson.summaryRu;
  const focus = lang === 'pl' ? lesson.focusPl : lang === 'en' ? lesson.focusEn : lesson.focusRu;

  return (
    <div
      className="card overflow-hidden transition-all"
      style={{
        borderColor: done ? 'rgba(68, 255, 136, 0.3)' : current ? 'rgba(0, 212, 255, 0.3)' : undefined,
        background: done ? 'rgba(68, 255, 136, 0.04)' : undefined,
      }}
    >
      <div className="flex items-center gap-3 p-3 sm:p-4">
        <button
          onClick={onToggle}
          aria-label={done ? 'Mark incomplete' : 'Mark complete'}
          className="w-6 h-6 rounded-full shrink-0 flex items-center justify-center transition"
          style={{
            background: done ? 'var(--success)' : 'transparent',
            border: `2px solid ${done ? 'var(--success)' : 'rgba(139, 167, 184, 0.4)'}`,
          }}
        >
          {done && (
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#0a1628" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="20 6 9 17 4 12"/>
            </svg>
          )}
        </button>

        <button
          onClick={() => setOpen(!open)}
          className="flex-1 text-left flex items-center gap-2 min-w-0"
        >
          <span className="text-xs font-mono text-[var(--text-muted)] shrink-0">#{lesson.order}</span>
          <span className="text-lg shrink-0">{lesson.emoji}</span>
          <span className={`text-sm sm:text-base font-semibold truncate ${done ? 'line-through opacity-70' : ''}`}>
            {title}
          </span>
          <span className="text-[10px] px-1.5 py-0.5 rounded-full shrink-0" style={{ background: 'rgba(0, 212, 255, 0.1)', color: 'var(--accent-cyan)' }}>
            {lesson.estMinutes} {tp('мин', 'min', 'min')}
          </span>
        </button>

        <svg
          width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
          className="shrink-0 text-[var(--text-muted)]"
          style={{ transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}
          onClick={() => setOpen(!open)}
        >
          <polyline points="6 9 12 15 18 9"/>
        </svg>
      </div>

      {open && (
        <div className="px-4 pb-4 pl-12">
          <p className="text-sm text-[var(--text-secondary)] mb-2">{summary}</p>
          <p className="text-xs text-[var(--text-muted)] italic mb-3">💡 {focus}</p>
          <Link
            href={lesson.route}
            onClick={onStart}
            className="inline-flex items-center gap-1 text-sm font-medium"
            style={{ color: done ? 'var(--success)' : 'var(--accent-cyan)' }}
          >
            <span>{done ? tp('Повторить', 'Review', 'Powtorz') : current ? tp('Продолжить', 'Continue', 'Kontynuuj') : tp('Открыть раздел', 'Open section', 'Otworz lekcje')}</span>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="9 18 15 12 9 6"/>
            </svg>
          </Link>
        </div>
      )}
    </div>
  );
}
