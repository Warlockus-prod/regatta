'use client';

import Link from 'next/link';
import { legacyPick } from '@/lib/languages';
import { useEffect, useRef, useState } from 'react';
import { bootcampLessons, BOOTCAMP_TOTAL_MINUTES } from '@/data/bootcamp';
import { getBootcampProgress, markLessonComplete, setCurrentLesson, resetBootcamp, type BootcampProgress } from '@/lib/storage';
import { useI18n } from '@/lib/i18n';

export default function StartHerePage() {
  const { tp } = useI18n();
  const [progress, setProgress] = useState<BootcampProgress | null>(null);
  const bootcampSectionRef = useRef<HTMLDivElement>(null);
  const [highlightBootcamp, setHighlightBootcamp] = useState(false);

  useEffect(() => {
    const p = getBootcampProgress();
    setProgress(p);

    // Auto-scroll to the next unstarted lesson on page load, not just the
    // one the user last opened. After "Mark done" + back-to-course, the user
    // expects to see what comes next - not the lesson they already finished.
    // Priority chain: next-unstarted -> current -> top.
    const nextUnstarted = bootcampLessons.find(
      (l) => !(p?.completed ?? []).includes(l.id),
    );
    const targetId = nextUnstarted?.id ?? p?.current;
    if (targetId) {
      const t = setTimeout(() => {
        const el = document.getElementById(`lesson-${targetId}`);
        if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 250);
      return () => clearTimeout(t);
    }
  }, []);

  const scrollToBootcamp = () => {
    bootcampSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    // Brief highlight so the user notices what we scrolled to.
    setHighlightBootcamp(true);
    setTimeout(() => setHighlightBootcamp(false), 1400);
  };

  if (!progress) {
    return <div className="max-w-3xl mx-auto px-4 py-10 text-center text-[var(--text-muted)]">...</div>;
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
    if (confirm(tp('Сбросить весь прогресс?', 'Reset all progress?', 'Wyzerować cały postęp?', {
      es: '¿Reiniciar todo el progreso?',
      fr: 'Réinitialiser toute la progression ?',
      de: 'Gesamten Fortschritt zurücksetzen?',
      it: 'Azzerare tutti i progressi?',
    }))) {
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
          🎓 {tp('Выбери трек', 'Pick your track', 'Wybierz ścieżkę', {
            es: 'Elige tu ruta',
            fr: 'Choisis ton parcours',
            de: 'Wähle deinen Weg',
            it: 'Scegli il tuo percorso',
          })}
        </div>
        <h1 className="text-3xl sm:text-4xl font-bold mb-2">
          {tp('С чего начнёшь?', 'Where will you start?', 'Od czego zaczynasz?', {
            es: '¿Por dónde empiezas?',
            fr: 'Par où commences-tu ?',
            de: 'Wo fängst du an?',
            it: 'Da dove inizi?',
          })}
        </h1>
        <p className="text-[var(--text-secondary)] leading-relaxed max-w-2xl mb-5">
          {tp(
            'Три пути к старту. Выбери свой по времени и опыту.',
            'Three tracks to the start line. Pick yours by time and experience.',
            'Trzy ścieżki do startu. Wybierz swoją według czasu i doświadczenia.',
            {
              es: 'Tres rutas hacia la salida. Elige la tuya según tu tiempo y tu experiencia.',
              fr: 'Trois parcours vers la ligne de départ. Choisis le tien selon ton temps et ton expérience.',
              de: 'Drei Wege zur Startlinie. Wähle deinen nach Zeit und Erfahrung.',
              it: 'Tre percorsi verso la partenza. Scegli il tuo in base a tempo ed esperienza.',
            },
          )}
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-2">
          <button
            type="button"
            onClick={scrollToBootcamp}
            className="card p-4 ring-2 text-left transition hover:scale-[1.01]"
            style={{ borderColor: 'var(--accent-cyan)', outlineColor: 'var(--accent-cyan)', background: 'rgba(0, 212, 255, 0.06)' }}
            aria-label={tp('Открыть полный курс ниже', 'Open full course below', 'Otwórz pełny kurs poniżej', {
              es: 'Abrir el curso completo abajo',
              fr: 'Ouvrir le cours complet ci-dessous',
              de: 'Kompletten Kurs unten öffnen',
              it: 'Apri il corso completo qui sotto',
            })}
          >
            <div className="text-2xl mb-1">📚</div>
            <div className="font-semibold text-[var(--accent-cyan)]">{tp('Полный курс', 'Full course', 'Pełny kurs', {
              es: 'Curso completo',
              fr: 'Cours complet',
              de: 'Kompletter Kurs',
              it: 'Corso completo',
            })}</div>
            <div className="text-[10px] text-[var(--text-muted)] mb-2">{BOOTCAMP_TOTAL_MINUTES} {tp('мин', 'min', 'min', { es: 'min', fr: 'min', de: 'Min.', it: 'min' })} · 8 {tp('уроков', 'lessons', 'lekcji', { es: 'lecciones', fr: 'leçons', de: 'Lektionen', it: 'lezioni' })}</div>
            <p className="text-xs text-[var(--text-secondary)]">{tp('Ты - совсем с нуля. Разберёшь всё по шагам.', 'From zero. Step by step.', 'Zaczynasz od zera. Przejdziesz wszystko krok po kroku.', {
              es: 'Empiezas de cero. Lo verás todo paso a paso.',
              fr: 'Tu pars de zéro. Tu verras tout pas à pas.',
              de: 'Du fängst bei null an. Alles Schritt für Schritt.',
              it: 'Parti da zero. Vedrai tutto passo dopo passo.',
            })}</p>
            <div className="text-[10px] font-semibold mt-2" style={{ color: 'var(--accent-cyan)' }}>
              {tp('Открыть курс', 'Open course', 'Otwórz kurs', {
                es: 'Abrir curso',
                fr: 'Ouvrir le cours',
                de: 'Kurs öffnen',
                it: 'Apri il corso',
              })} ↓
            </div>
          </button>
          <Link href="/quick" className="card p-4 hover:border-[var(--success)] transition">
            <div className="text-2xl mb-1">⚡</div>
            <div className="font-semibold" style={{ color: 'var(--success)' }}>{tp('Освежить', 'Refresh', 'Powtórka', {
              es: 'Repasar',
              fr: 'Réviser',
              de: 'Auffrischen',
              it: 'Ripassare',
            })}</div>
            <div className="text-[10px] text-[var(--text-muted)] mb-2">15 {tp('мин', 'min', 'min', { es: 'min', fr: 'min', de: 'Min.', it: 'min' })} · 6 {tp('тем', 'topics', 'tematów', { es: 'temas', fr: 'sujets', de: 'Themen', it: 'argomenti' })}</div>
            <p className="text-xs text-[var(--text-secondary)]">{tp('Опыт есть, регата - завтра. Только ключевое.', 'Got experience, race tomorrow. Key points only.', 'Masz doświadczenie, a regaty jutro? Tylko najważniejsze.', {
              es: 'Tienes experiencia y la regata es mañana. Solo lo esencial.',
              fr: "Tu as de l'expérience et la régate est demain ? L'essentiel seulement.",
              de: 'Erfahrung da, Regatta morgen? Nur das Wichtigste.',
              it: 'Hai esperienza, regata domani. Solo l\'essenziale.',
            })}</p>
          </Link>
          <Link href="/onboard" className="card p-4 hover:border-[var(--warning)] transition">
            <div className="text-2xl mb-1">⚓</div>
            <div className="font-semibold" style={{ color: 'var(--warning)' }}>{tp('На яхте', 'On board', 'Na pokładzie', {
              es: 'A bordo',
              fr: 'À bord',
              de: 'An Bord',
              it: 'A bordo',
            })}</div>
            <div className="text-[10px] text-[var(--text-muted)] mb-2">{tp('Как вести себя', 'How to behave', 'Jak się zachować', {
              es: 'Cómo comportarse',
              fr: 'Comment se comporter',
              de: 'Wie du dich verhältst',
              it: 'Come comportarsi',
            })}</div>
            <p className="text-xs text-[var(--text-secondary)]">{tp('Команды, что опасно, что брать. Для первого выхода.', 'Commands, dangers, what to pack. For your first day aboard.', 'Komendy, co jest niebezpieczne, co zabrać. Na pierwsze wyjście w morze.', {
              es: 'Órdenes, peligros, qué llevar. Para tu primer día a bordo.',
              fr: 'Ordres, dangers, quoi emporter. Pour ton premier jour à bord.',
              de: 'Kommandos, Gefahren, was du mitnimmst. Für deinen ersten Tag an Bord.',
              it: 'Comandi, pericoli, cosa portare. Per il tuo primo giorno a bordo.',
            })}</p>
          </Link>
        </div>
      </div>

      {/* Bootcamp section header */}
      <div
        ref={bootcampSectionRef}
        id="bootcamp-section"
        className="mb-4 flex items-center gap-2 rounded-lg p-2 -mx-2 transition-all"
        style={{
          background: highlightBootcamp ? 'rgba(0, 212, 255, 0.15)' : 'transparent',
          boxShadow: highlightBootcamp ? '0 0 0 1px rgba(0, 212, 255, 0.4)' : 'none',
          scrollMarginTop: '4rem',
        }}
      >
        <span className="text-xl">📚</span>
        <h2 className="text-xl font-semibold">
          {tp('Полный курс:', 'Full course:', 'Pełny kurs:', {
            es: 'Curso completo:',
            fr: 'Cours complet :',
            de: 'Kompletter Kurs:',
            it: 'Corso completo:',
          })} <span style={{ color: 'var(--accent-cyan)' }}>{BOOTCAMP_TOTAL_MINUTES} {tp('минут', 'min', 'minut', { es: 'min', fr: 'min', de: 'Min.', it: 'min' })}</span>
        </h2>
      </div>

      {/* Progress bar */}
      <div className="card p-4 mb-6">
        <div className="flex items-center justify-between mb-2">
          <div className="text-sm font-semibold">
            {completedCount}/{bootcampLessons.length} {tp('пройдено', 'completed', 'ukończono', {
              es: 'completadas',
              fr: 'terminées',
              de: 'abgeschlossen',
              it: 'completate',
            })}
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
            {tp('Сбросить прогресс', 'Reset progress', 'Wyzeruj postęp', {
              es: 'Reiniciar progreso',
              fr: 'Réinitialiser la progression',
              de: 'Fortschritt zurücksetzen',
              it: 'Azzera i progressi',
            })}
          </button>
        )}
      </div>

      {/* Lessons - accordion style, collapsed by default */}
      <div className="space-y-2">
        {bootcampLessons.map((lesson, i) => (
          <LessonAccordion
            key={lesson.id}
            lesson={lesson}
            done={progress.completed.includes(lesson.id)}
            current={progress.current === lesson.id}
            prevLesson={i > 0 ? bootcampLessons[i - 1] : null}
            nextLesson={i < bootcampLessons.length - 1 ? bootcampLessons[i + 1] : null}
            onToggle={() => handleToggleComplete(lesson.id)}
            onStart={() => handleStartLesson(lesson.id)}
          />
        ))}
      </div>

      {/* Completion card - rich "where to next" grid shown when all 8 lessons are done */}
      {allDone && (
        <div
          className="mt-8 p-6 card"
          style={{ background: 'linear-gradient(135deg, rgba(68, 255, 136, 0.1), rgba(0, 212, 255, 0.1))', borderColor: 'rgba(68, 255, 136, 0.3)' }}
        >
          <div className="text-center mb-5">
            <div className="text-5xl mb-3">🎉</div>
            <div
              className="inline-flex items-center gap-2 px-3 py-1 rounded-full mb-3 text-xs font-bold"
              style={{ background: 'rgba(68, 255, 136, 0.2)', border: '1px solid rgba(68, 255, 136, 0.5)', color: 'var(--success)' }}
            >
              🎓 {tp('Базовый курс пройден', 'Bootcamp complete', 'Kurs podstawowy ukończony', {
                es: 'Curso básico completado',
                fr: 'Cours de base terminé',
                de: 'Grundkurs abgeschlossen',
                it: 'Corso base completato',
              })}
            </div>
            <h3 className="text-2xl font-bold mb-2">{tp('База пройдена!', 'Basics complete!', 'Podstawy ukończone!', {
              es: '¡Fundamentos completados!',
              fr: 'Les bases sont acquises !',
              de: 'Grundlagen geschafft!',
              it: 'Basi completate!',
            })}</h3>
            <p className="text-sm text-[var(--text-secondary)] max-w-xl mx-auto">
              {tp(
                'Ты освоил основы парусного дела. Что дальше - выбирай по вкусу:',
                'You\'ve got the basics of sailing. What next - pick your path:',
                'Masz już podstawy żeglarstwa. Co dalej? Wybierz, co ci pasuje:',
                {
                  es: 'Ya tienes las bases de la vela. ¿Y ahora? Elige tu camino:',
                  fr: 'Tu maîtrises les bases de la voile. Et maintenant ? Choisis ta voie :',
                  de: 'Du beherrschst die Grundlagen des Segelns. Wie geht es weiter? Wähle deinen Weg:',
                  it: 'Hai le basi della vela. E ora? Scegli il tuo percorso:',
                },
              )}
            </p>
          </div>

          {/* Primary CTAs - race + simulator */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
            <Link
              href="/game"
              className="card p-4 text-center hover:scale-[1.02] transition"
              style={{ borderColor: 'rgba(0, 212, 255, 0.4)', background: 'rgba(0, 212, 255, 0.08)' }}
            >
              <div className="text-3xl mb-1">🏁</div>
              <div className="font-semibold" style={{ color: 'var(--accent-cyan)' }}>{tp('Гонка с AI', 'Race vs AI', 'Wyścig z AI', {
                es: 'Regata contra la IA',
                fr: 'Course contre l\'IA',
                de: 'Rennen gegen die KI',
                it: "Regata contro l'IA",
              })}</div>
              <p className="text-xs text-[var(--text-secondary)] mt-1">
                {tp('Соперники + AI-тренер разберёт ошибки', 'Opponents + AI coach reviews mistakes', 'Rywale + trener AI omówi błędy', {
                  es: 'Rivales + el entrenador IA analiza los errores',
                  fr: 'Adversaires + le coach IA analyse les erreurs',
                  de: 'Gegner + der KI-Trainer analysiert Fehler',
                  it: 'Avversari + il coach IA analizza gli errori',
                })}
              </p>
            </Link>
            <Link
              href="/multiplayer"
              className="card p-4 text-center hover:scale-[1.02] transition"
              style={{ borderColor: 'rgba(255, 170, 0, 0.4)', background: 'rgba(255, 170, 0, 0.06)' }}
            >
              <div className="text-3xl mb-1">🚣</div>
              <div className="font-semibold" style={{ color: 'var(--warning)' }}>{tp('Мультиплеер', 'Multiplayer', 'Multiplayer', {
                es: 'Multijugador',
                fr: 'Multijoueur',
                de: 'Mehrspieler',
                it: 'Multigiocatore',
              })}</div>
              <p className="text-xs text-[var(--text-secondary)] mt-1">
                {tp('Пригласи друзей в лобби по коду', 'Invite friends to a lobby by code', 'Zaproś znajomych do lobby kodem', {
                  es: 'Invita a tus amigos a una sala con un código',
                  fr: 'Invite tes amis dans un salon avec un code',
                  de: 'Lade Freunde per Code in eine Lobby ein',
                  it: 'Invita gli amici nella lobby con un codice',
                })}
              </p>
            </Link>
          </div>

          {/* Secondary CTAs - practice + reference */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            <Link
              href="/simulator"
              className="card p-3 text-center hover:border-[var(--accent-cyan)] transition"
            >
              <div className="text-xl mb-0.5">🎮</div>
              <div className="text-xs font-semibold">{tp('Симулятор', 'Simulator', 'Symulator', {
                es: 'Simulador',
                fr: 'Simulateur',
                de: 'Simulator',
                it: 'Simulatore',
              })}</div>
            </Link>
            <Link
              href="/onboard"
              className="card p-3 text-center hover:border-[var(--accent-cyan)] transition"
            >
              <div className="text-xl mb-0.5">⚓</div>
              <div className="text-xs font-semibold">{tp('На борту', 'On board', 'Na pokładzie', {
                es: 'A bordo',
                fr: 'À bord',
                de: 'An Bord',
                it: 'A bordo',
              })}</div>
            </Link>
            <Link
              href="/checklist"
              className="card p-3 text-center hover:border-[var(--accent-cyan)] transition"
            >
              <div className="text-xl mb-0.5">✅</div>
              <div className="text-xs font-semibold">{tp('Чек-лист', 'Checklist', 'Lista kontrolna', {
                es: 'Checklist',
                fr: 'Checklist',
                de: 'Checkliste',
                it: 'Checklist',
              })}</div>
            </Link>
            <Link
              href="/glossary"
              className="card p-3 text-center hover:border-[var(--accent-cyan)] transition"
            >
              <div className="text-xl mb-0.5">📖</div>
              <div className="text-xs font-semibold">{tp('Глоссарий', 'Glossary', 'Słownik', {
                es: 'Glosario',
                fr: 'Glossaire',
                de: 'Glossar',
                it: 'Glossario',
              })}</div>
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
  lesson, done, current, prevLesson, nextLesson, onToggle, onStart,
}: {
  lesson: LessonLike;
  done: boolean;
  current: boolean;
  prevLesson: LessonLike | null;
  nextLesson: LessonLike | null;
  onToggle: () => void;
  onStart: () => void;
}) {
  const { lang, tp } = useI18n();
  const [open, setOpen] = useState(current);
  const title = legacyPick(lesson, 'title', lang);
  const summary = legacyPick(lesson, 'summary', lang);
  const focus = legacyPick(lesson, 'focus', lang);

  const scrollToLesson = (id: string) => {
    const el = document.getElementById(`lesson-${id}`);
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
  };

  return (
    <div
      id={`lesson-${lesson.id}`}
      className="card overflow-hidden transition-all"
      style={{
        borderColor: done ? 'rgba(68, 255, 136, 0.3)' : current ? 'rgba(0, 212, 255, 0.3)' : undefined,
        background: done ? 'rgba(68, 255, 136, 0.04)' : undefined,
        scrollMarginTop: '4rem',
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
          <span className={`text-sm sm:text-base font-semibold break-words ${done ? 'line-through opacity-70' : ''}`}>
            {title}
          </span>
          <span className="text-[10px] px-1.5 py-0.5 rounded-full shrink-0" style={{ background: 'rgba(0, 212, 255, 0.1)', color: 'var(--accent-cyan)' }}>
            {lesson.estMinutes} {tp('мин', 'min', 'min', { es: 'min', fr: 'min', de: 'Min.', it: 'min' })}
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

          {/* Main CTA: open the destination page */}
          <Link
            href={lesson.route}
            onClick={onStart}
            className="inline-flex items-center gap-1 text-sm font-medium mb-3"
            style={{ color: done ? 'var(--success)' : 'var(--accent-cyan)' }}
          >
            <span>{done ? tp('Повторить', 'Review', 'Powtórz', { es: 'Repasar', fr: 'Revoir', de: 'Wiederholen', it: 'Ripassare' }) : current ? tp('Продолжить', 'Continue', 'Kontynuuj', { es: 'Continuar', fr: 'Continuer', de: 'Weiter', it: 'Continua' }) : tp('Открыть раздел', 'Open section', 'Otwórz lekcję', { es: 'Abrir sección', fr: 'Ouvrir la section', de: 'Abschnitt öffnen', it: 'Apri la sezione' })}</span>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="9 18 15 12 9 6"/>
            </svg>
          </Link>

          {/* Prev/next chips for in-course browsing without visiting destination pages */}
          {(prevLesson || nextLesson) && (
            <div className="flex gap-2 flex-wrap text-[11px] pt-2 border-t border-[rgba(139,167,184,0.12)]">
              {prevLesson && (
                <button
                  type="button"
                  onClick={() => scrollToLesson(prevLesson.id)}
                  className="px-2 py-1 rounded-md border transition hover:text-[var(--accent-cyan)]"
                  style={{ borderColor: 'rgba(139, 167, 184, 0.25)', color: 'var(--text-muted)' }}
                >
                  ← {tp('Пред.', 'Prev', 'Poprz.', { es: 'Ant.', fr: 'Préc.', de: 'Zurück', it: 'Prec.' })}: #{prevLesson.order}
                </button>
              )}
              {nextLesson && (
                <button
                  type="button"
                  onClick={() => scrollToLesson(nextLesson.id)}
                  className="px-2 py-1 rounded-md border transition hover:text-[var(--accent-cyan)]"
                  style={{ borderColor: 'rgba(139, 167, 184, 0.25)', color: 'var(--text-muted)' }}
                >
                  {tp('След.', 'Next', 'Nast.', { es: 'Sig.', fr: 'Suiv.', de: 'Weiter', it: 'Succ.' })}: #{nextLesson.order} →
                </button>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
