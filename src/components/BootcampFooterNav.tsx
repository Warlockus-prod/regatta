'use client';

// ============================================================================
// BootcampFooterNav
//
// Sticky bottom bar that appears on lesson-destination pages (/courses,
// /simulator, /rules, /racing, /glossary) whenever the user has an active
// bootcamp lesson. Shows progress, offers a quick "mark done" action, and a
// "next lesson" shortcut so the flow doesn't dead-end.
//
// Mounts only client-side (reads localStorage). Invisible when there is no
// current bootcamp lesson, or when the visible route doesn't belong to the
// lesson the user started (= they navigated away manually).
// ============================================================================

import Link from 'next/link';
import { legacyPick } from '@/lib/languages';
import { usePathname, useRouter } from 'next/navigation';
import { useCallback, useEffect, useRef, useState } from 'react';
import { bootcampLessons } from '@/data/bootcamp';
import {
  getBootcampProgress,
  markLessonComplete,
  setCurrentLesson,
  type BootcampProgress,
} from '@/lib/storage';
import { useI18n } from '@/lib/i18n';

export default function BootcampFooterNav() {
  const { lang, tp } = useI18n();
  const pathname = usePathname();
  const router = useRouter();
  // `progress === null` doubles as the "not mounted yet" signal. On first
  // client render we have null (matches SSR output -> no hydration mismatch),
  // then the mount effect reads localStorage and populates state. No separate
  // `mounted` boolean needed - avoids the cascade-render lint.
  const [progress, setProgress] = useState<BootcampProgress | null>(null);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setProgress(getBootcampProgress());
    // Refresh from storage on focus in case user marked completion elsewhere
    const onFocus = () => setProgress(getBootcampProgress());
    window.addEventListener('focus', onFocus);
    return () => window.removeEventListener('focus', onFocus);
  }, []);

  const currentLesson = progress?.current
    ? bootcampLessons.find((l) => l.id === progress.current)
    : null;

  const refresh = useCallback(() => setProgress(getBootcampProgress()), []);

  // Match check moved up before the early `return null` so we can use the
  // visibility flag in the ResizeObserver effect below (hooks must run in
  // the same order on every render).
  const matchesRoute = !!(
    currentLesson && pathname && (
      pathname === currentLesson.route ||
      pathname.startsWith(currentLesson.route + '/') ||
      pathname.startsWith(currentLesson.route + '?')
    )
  );
  const isVisible = !!(currentLesson && progress && matchesRoute);

  // Publish the rendered height of the sticky bar to a CSS custom property
  // on <body>. The root layout's <main> consumes it as padding-bottom so
  // that on mobile, where the bar is fairly tall (two text lines + 3
  // buttons + safe-area inset), the last items in the page content are
  // never trapped behind the bar. ResizeObserver covers Mark-done -> Next
  // transitions (button count changes height) and locale-driven text
  // reflow.
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!isVisible || !el) {
      document.body.style.removeProperty('--bootcamp-footer-h');
      return;
    }
    const update = () => {
      document.body.style.setProperty('--bootcamp-footer-h', `${el.offsetHeight}px`);
    };
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => {
      ro.disconnect();
      document.body.style.removeProperty('--bootcamp-footer-h');
    };
  }, [isVisible]);

  if (!isVisible) return null;
  // From here on TypeScript needs the non-null assertions because the
  // visibility flag isn't a type predicate.
  if (!currentLesson || !progress) return null;

  const idx = bootcampLessons.findIndex((l) => l.id === currentLesson.id);
  const nextLesson = idx >= 0 && idx < bootcampLessons.length - 1
    ? bootcampLessons[idx + 1]
    : null;
  const isDone = progress.completed.includes(currentLesson.id);
  const totalCompleted = progress.completed.length;

  const title = legacyPick(currentLesson, 'title', lang);

  const nextTitle = nextLesson
    ? (legacyPick(nextLesson, 'title', lang))
    : null;

  const handleMarkDone = () => {
    markLessonComplete(currentLesson.id);
    refresh();
  };

  const handleOpenNext = () => {
    if (!nextLesson) return;
    // Mark current as complete (if not already) + set next as current.
    if (!isDone) markLessonComplete(currentLesson.id);
    setCurrentLesson(nextLesson.id);
    router.push(nextLesson.route);
  };

  const handleFinish = () => {
    if (!isDone) markLessonComplete(currentLesson.id);
    router.push('/start');
  };

  return (
    <div
      ref={ref}
      className="fixed inset-x-0 bottom-0 z-40 border-t backdrop-blur-md"
      style={{
        background: 'rgba(10, 22, 40, 0.92)',
        borderColor: 'rgba(0, 212, 255, 0.25)',
        paddingBottom: 'env(safe-area-inset-bottom, 0px)',
      }}
      role="region"
      aria-label={tp('Навигация по курсу', 'Course navigation', 'Nawigacja kursu',
        { es: 'Navegacion del curso', fr: 'Navigation du cours', de: 'Kurs-Navigation', it: 'Navigazione del corso' })}
    >
      <div className="max-w-5xl mx-auto px-3 sm:px-5 py-2 sm:py-3 flex items-center gap-2 sm:gap-3 flex-wrap">
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <span className="text-xl shrink-0">{currentLesson.emoji}</span>
          <div className="min-w-0">
            <div className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: 'var(--accent-cyan)' }}>
              {tp('Урок', 'Lesson', 'Lekcja',
                { es: 'Leccion', fr: 'Lecon', de: 'Lektion', it: 'Lezione' })} {currentLesson.order}/{bootcampLessons.length}
              {' · '}
              <span className="text-[var(--text-muted)] font-normal">
                {totalCompleted}/{bootcampLessons.length} {tp('пройдено', 'done', 'ukonczono',
                  { es: 'hecho', fr: 'fait', de: 'erledigt', it: 'fatto' })}
              </span>
            </div>
            <div className="text-sm font-semibold truncate">{title}</div>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <Link
            href="/start"
            className="text-xs px-3 py-1.5 rounded-md border transition hover:bg-[rgba(0,212,255,0.08)]"
            style={{ borderColor: 'rgba(139, 167, 184, 0.3)', color: 'var(--text-secondary)' }}
          >
            ← {tp('К курсу', 'Course', 'Kurs',
              { es: 'Al curso', fr: 'Au cours', de: 'Zum Kurs', it: 'Al corso' })}
          </Link>

          {!isDone && (
            <button
              type="button"
              onClick={handleMarkDone}
              className="text-xs px-3 py-1.5 rounded-md border transition"
              style={{
                borderColor: 'rgba(68, 255, 136, 0.4)',
                color: 'var(--success)',
                background: 'rgba(68, 255, 136, 0.08)',
              }}
            >
              ✓ {tp('Отметить пройденным', 'Mark done', 'Oznacz jako zrobione',
                { es: 'Marcar hecho', fr: 'Marquer fait', de: 'Als erledigt markieren', it: 'Segna come fatto' })}
            </button>
          )}

          {nextLesson ? (
            <button
              type="button"
              onClick={handleOpenNext}
              className="text-xs px-3 py-1.5 rounded-md font-semibold transition"
              style={{
                background: 'var(--accent-cyan)',
                color: '#0a1628',
              }}
              title={nextTitle ?? ''}
            >
              {tp('Следующий', 'Next', 'Nastepna',
                { es: 'Siguiente', fr: 'Suivant', de: 'Weiter', it: 'Avanti' })} →
            </button>
          ) : (
            <button
              type="button"
              onClick={handleFinish}
              className="text-xs px-3 py-1.5 rounded-md font-semibold transition"
              style={{
                background: 'linear-gradient(135deg, var(--success), var(--accent-cyan))',
                color: '#0a1628',
              }}
            >
              🎉 {tp('Завершить', 'Finish', 'Zakoncz',
                { es: 'Terminar', fr: 'Terminer', de: 'Abschliessen', it: 'Concludi' })}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
