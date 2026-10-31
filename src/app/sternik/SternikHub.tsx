'use client';

import Link from 'next/link';
import dynamic from 'next/dynamic';
import { useEffect, useState } from 'react';
import { useI18n } from '@/lib/i18n';
// Types only, from the bank-free module: the questions never ride in this
// chunk (page.tsx computes the counts on the server).
import type { SternikCatId, SternikCategory } from '@/data/sternik-core';
import {
  loadSternikProgress,
  sternikWeakIds,
  type SternikProgress,
} from '@/lib/sternik-progress';
import { formatClock } from './quiz-utils';

// The personal report analyses progress against the full bank (it quotes the
// questions a learner keeps missing), so it loads on its own, after the
// stored progress exists - never as part of the hub's first paint.
const PersonalReport = dynamic(() => import('./PersonalReport'), { ssr: false });

// ============================================================================
// /sternik - hub: exam format, live progress, entry points. Rendered by the
// server page with counts precomputed from the bank (see page.tsx).
// ============================================================================

export interface SternikHubData {
  bankSize: number;
  /** Questions in the real exam format (3 options), the mock exam's pool. */
  examPoolSize: number;
  categories: SternikCategory[];
  catTotals: Record<SternikCatId, number>;
  /** Question id -> category, to place the learner's progress per category. */
  idCat: Record<string, SternikCatId>;
  exam: { questions: number; minutes: number; passCorrect: number; passPct: number };
}

function StatTile({ value, label, accent }: { value: string; label: string; accent?: string }) {
  return (
    <div
      className="rounded-xl px-4 py-3 text-center"
      style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)' }}
    >
      <div className="text-2xl font-bold" style={{ color: accent ?? 'var(--text-primary)' }}>
        {value}
      </div>
      <div className="mt-0.5 text-xs" style={{ color: 'var(--text-muted)' }}>
        {label}
      </div>
    </div>
  );
}

export default function SternikHub({ data }: { data: SternikHubData }) {
  const { tp, lang } = useI18n();
  const { bankSize, examPoolSize, categories, catTotals, idCat, exam } = data;
  const [progress, setProgress] = useState<SternikProgress | null>(null);

  useEffect(() => {
    // Progress lives in localStorage: read after mount so the server HTML and
    // the first client render agree (the documented prefsLoaded pattern).
    // eslint-disable-next-line react-hooks/set-state-in-effect -- post-mount localStorage hydration
    setProgress(loadSternikProgress());
  }, []);

  const answered = progress?.totalAnswered ?? 0;
  const accuracy = answered > 0 ? Math.round(((progress?.totalCorrect ?? 0) / answered) * 100) : 0;
  const weak = progress ? sternikWeakIds(progress).length : 0;
  const extendedSize = bankSize - examPoolSize;
  const exams = progress?.exams ?? [];
  const passedExams = exams.filter((e) => e.passed).length;
  const lastExam = exams.length > 0 ? exams[exams.length - 1] : null;

  const seenByCat: Partial<Record<SternikCatId, number>> = {};
  const masteredByCat: Partial<Record<SternikCatId, number>> = {};
  if (progress) {
    for (const [id, s] of Object.entries(progress.q)) {
      const cat = idCat[id];
      if (!cat) continue;   // a question that left the bank
      if (s.seen > 0) seenByCat[cat] = (seenByCat[cat] ?? 0) + 1;
      if (s.streak >= 2) masteredByCat[cat] = (masteredByCat[cat] ?? 0) + 1;
    }
  }
  const catStats = categories.map((cat) => ({
    cat,
    total: catTotals[cat.id] ?? 0,
    seen: seenByCat[cat.id] ?? 0,
    mastered: masteredByCat[cat.id] ?? 0,
  }));

  return (
    <div>
      {/* Hero */}
      <header className="mb-8">
        <h1 className="text-3xl font-bold sm:text-4xl" style={{ color: 'var(--text-primary)' }}>
          ⚓ <span lang="pl">Sternik motorowodny</span>
        </h1>
        <p className="mt-2 max-w-2xl" style={{ color: 'var(--text-secondary)' }}>
          {tp(
            'Подготовка к польскому госэкзамену на патент судоводителя моторной лодки: теория со схемами, тренажёр вопросов и пробный экзамен. Вопросы по-польски (как на экзамене), пояснения по-русски.',
            'Preparation for the Polish state exam for the motorboat helmsman licence: theory with diagrams, a question trainer and a mock exam. Questions in Polish (as on the exam), explanations in Russian.',
            'Przygotowanie do państwowego egzaminu na patent sternika motorowodnego: teoria ze schematami, trening pytań i próbny egzamin.',
          )}
        </p>
      </header>

      {/* Exam format */}
      <section
        className="mb-8 rounded-2xl p-5"
        style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)' }}
      >
        <h2 className="mb-3 text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>
          📋 {tp('Формат экзамена', 'Exam format', 'Format egzaminu')}
        </h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <StatTile value={String(exam.questions)} label={tp('вопросов (A/B/C)', 'questions (A/B/C)', 'pytań (A/B/C)')} />
          <StatTile value={`${exam.minutes} min`} label={tp('на весь тест', 'for the whole test', 'na cały test')} />
          <StatTile
            value={`${exam.passCorrect}/${exam.questions}`}
            label={tp(`порог сдачи (${exam.passPct}%)`, `pass mark (${exam.passPct}%)`, `próg zdania (${exam.passPct}%)`)}
            accent="var(--success)"
          />
          <StatTile value="10" label={tp('макс. ошибок', 'max mistakes', 'maks. błędów')} accent="var(--warning)" />
        </div>
        <p className="mt-3 text-sm" style={{ color: 'var(--text-muted)' }}>
          {tp(
            'Плюс практическая часть: манёвры на лодке (отход/подход к причалу, «человек за бортом», якорь). Минимальный возраст - 14 лет. Стоимость: экзамен 250 zł + патент 50 zł (ученикам и студентам до 26 лет - скидка 50%). Основание: rozporządzenie MSiT z 9.04.2013 (tekst jednolity 2026).',
            'Plus a practical part: boat maneuvers (dock departure/approach, man overboard, anchoring). Minimum age 14. Fees: exam 250 zł + licence 50 zł (50% off for pupils/students under 26). Legal basis: MSiT regulation of 9.04.2013 (2026 consolidated text).',
            'Do tego część praktyczna: manewry (odejście/dojście do kei, człowiek za burtą, kotwiczenie). Minimalny wiek: 14 lat. Opłaty: egzamin 250 zł + patent 50 zł (uczniowie i studenci do 26 lat: 50%).',
          )}
        </p>
        <p className="mt-2 text-xs" style={{ color: 'var(--text-muted)' }}>
          {tp(
            `База: ${bankSize} вопросов из открытых источников (моя выборка + аутентичная база akademiasternika + база Centrum Żeglarskie с ключом; сверено с Wind / motosternik / h2o), дубли убраны. У PZMWiNW нет единой публичной базы - вопросы составляет комиссия из тем экзамена; в сети циркулирует набор ~286-337 в вариантах разных школ. Реальный экзамен - 3 варианта A/B/C: пробный экзамен берёт ${examPoolSize} вопросов такого формата, тренажёр даёт все ${bankSize} (включая ${extendedSize} расширенных на 4 варианта для более глубокой проработки).`,
            `Bank: ${bankSize} questions from open sources (my set + the authentic akademiasternika base + Centrum Żeglarskie bank with key; cross-checked with Wind / motosternik / h2o), deduplicated. PZMWiNW has no single public bank - a commission draws questions from the exam topics; a ~286-337 set circulates in school variants. The real exam is 3-option A/B/C: the mock exam uses ${examPoolSize} such questions, the trainer offers all ${bankSize} (including ${extendedSize} extended 4-option ones for deeper practice).`,
            `Baza: ${bankSize} pytań ze źródeł otwartych (mój zestaw + autentyczna baza akademiasternika + baza Centrum Żeglarskie z kluczem; sprawdzone z Wind / motosternik / h2o), bez duplikatów. PZMWiNW nie ma jednej publicznej bazy - pytania układa komisja z zakresu egzaminu; w sieci krąży zestaw ~286-337 w wariantach szkół. Prawdziwy egzamin ma 3 warianty A/B/C: próbny egzamin bierze ${examPoolSize} takich pytań, trening daje wszystkie ${bankSize} (w tym ${extendedSize} rozszerzonych 4-wariantowych).`,
          )}
        </p>
      </section>

      {/* Progress */}
      <section className="mb-8">
        <h2 className="mb-3 text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>
          📈 {tp('Твой прогресс', 'Your progress', 'Twój postęp')}
        </h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <StatTile value={String(answered)} label={tp('ответов дано', 'answers given', 'udzielonych odpowiedzi')} />
          <StatTile
            value={answered > 0 ? `${accuracy}%` : '-'}
            label={tp('точность', 'accuracy', 'skuteczność')}
            accent={accuracy >= exam.passPct ? 'var(--success)' : 'var(--warning)'}
          />
          <StatTile value={String(weak)} label={tp('вопросов на повтор', 'to review', 'do powtórki')} accent={weak > 0 ? 'var(--danger)' : 'var(--success)'} />
          <StatTile
            value={exams.length > 0 ? `${passedExams}/${exams.length}` : '-'}
            label={tp('экзаменов сдано', 'exams passed', 'zdanych egzaminów')}
            accent="var(--accent-teal)"
          />
        </div>
        {lastExam && (
          <p className="mt-2 text-sm" style={{ color: 'var(--text-muted)' }}>
            {tp('Последний пробный экзамен: ', 'Last mock exam: ', 'Ostatni próbny egzamin: ')}
            <span style={{ color: lastExam.passed ? 'var(--success)' : 'var(--danger)' }}>
              {lastExam.correct}/{lastExam.total} {lastExam.passed ? '✓' : '✗'}
            </span>
            {' · '}
            {formatClock(lastExam.durationSec)}
          </p>
        )}
      </section>

      {/* Personalized analysis (only once there is enough data) */}
      {progress && progress.totalAnswered >= 3 && (
        <section className="mb-8">
          <PersonalReport progress={progress} compact />
        </section>
      )}

      {/* Entry cards */}
      <section className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Link
          href="/sternik/teoria"
          className="rounded-2xl p-5 transition hover:-translate-y-0.5"
          style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)' }}
        >
          <div className="text-3xl">📖</div>
          <div className="mt-2 font-semibold" style={{ color: 'var(--text-primary)' }}>
            {tp('Теория', 'Theory', 'Teoria')}
          </div>
          <p className="mt-1 text-sm" style={{ color: 'var(--text-secondary)' }}>
            {tp(
              '14 разделов со схемами: патент, правила, огни, знаки, двигатели, манёвры, спасание.',
              '14 sections with diagrams: licence, rules, lights, marks, engines, maneuvers, rescue.',
              '14 rozdziałów ze schematami: patent, przepisy, światła, znaki, silniki, manewry, ratownictwo.',
            )}
          </p>
        </Link>
        <Link
          href="/sternik/test"
          className="rounded-2xl p-5 transition hover:-translate-y-0.5"
          style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)' }}
        >
          <div className="text-3xl">🎯</div>
          <div className="mt-2 font-semibold" style={{ color: 'var(--text-primary)' }}>
            {tp('Тренажёр вопросов', 'Question trainer', 'Trening pytań')}
          </div>
          <p className="mt-1 text-sm" style={{ color: 'var(--text-secondary)' }}>
            {tp(
              `${bankSize} вопросов. Ответил - сразу видишь верно/нет и почему. Как при подготовке на автоправа.`,
              `${bankSize} questions with instant right/wrong feedback and explanations.`,
              `${bankSize} pytań, od razu dobrze/źle + wyjaśnienie.`,
            )}
          </p>
        </Link>
        <Link
          href="/sternik/egzamin"
          className="rounded-2xl p-5 transition hover:-translate-y-0.5"
          style={{
            background: 'linear-gradient(140deg, var(--bg-card), rgba(0,212,255,0.10))',
            border: '1px solid var(--border-subtle)',
          }}
        >
          <div className="text-3xl">⏱️</div>
          <div className="mt-2 font-semibold" style={{ color: 'var(--text-primary)' }}>
            {tp('Пробный экзамен', 'Mock exam', 'Próbny egzamin')}
          </div>
          <p className="mt-1 text-sm" style={{ color: 'var(--text-secondary)' }}>
            {tp(
              '75 вопросов, 90 минут, порог 65 - всё как на настоящем экзамене. С паузой и разбором ошибок.',
              '75 questions, 90 minutes, pass mark 65 - just like the real exam. With pause and error review.',
              '75 pytań, 90 minut, próg 65 - jak na prawdziwym egzaminie. Z pauzą i powtórką błędów.',
            )}
          </p>
        </Link>
      </section>

      {/* Radio / SRC feature banner */}
      <section className="mb-8">
        <Link
          href="/radio"
          className="flex flex-col gap-1 rounded-2xl p-5 transition hover:-translate-y-0.5 sm:flex-row sm:items-center sm:gap-4"
          style={{ background: 'linear-gradient(140deg, var(--bg-card), rgba(0,212,255,0.10))', border: '1px solid var(--border-subtle)' }}
        >
          <div className="text-3xl">📻</div>
          <div className="flex-1">
            <div className="font-semibold" style={{ color: 'var(--text-primary)' }}>
              {tp('Рация и сертификат SRC', 'Radio and the SRC certificate', 'Radio i świadectwo SRC')}
            </div>
            <p className="mt-1 text-sm" style={{ color: 'var(--text-secondary)' }}>
              {tp(
                'Отдельный раздел про морскую УКВ-рацию: как получить SRC в UKE, каналы, MAYDAY/PAN-PAN, DSC и фонетика.',
                'A dedicated section on the marine VHF radio: how to get the SRC at UKE, channels, MAYDAY/PAN-PAN, DSC and phonetics.',
                'Osobny dział o radiu VHF: jak zdobyć SRC w UKE, kanały, MAYDAY/PAN-PAN, DSC i alfabet fonetyczny.',
              )}
            </p>
          </div>
          <div className="text-sm font-medium" style={{ color: 'var(--accent-cyan)' }}>
            {tp('Открыть', 'Open', 'Otwórz')} {'->'}
          </div>
        </Link>
      </section>

      {/* Categories overview */}
      <section className="mb-8">
        <h2 className="mb-3 text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>
          🗂️ {tp('Категории вопросов', 'Question categories', 'Kategorie pytań')}
        </h2>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {catStats.map(({ cat, total, seen, mastered }) => (
            <Link
              key={cat.id}
              href={`/sternik/test?cat=${cat.id}`}
              className="flex items-center gap-3 rounded-xl px-4 py-3 transition hover:opacity-90"
              style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)' }}
            >
              <span className="text-xl">{cat.icon}</span>
              <span className="min-w-0 flex-1">
                <span lang="pl" className="block truncate text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                  {cat.pl}
                </span>
                <span className="block truncate text-xs" style={{ color: 'var(--text-muted)' }}>
                  {lang === 'ru' ? `${cat.ru} · ` : ''}{total} {tp('вопр.', 'q.', 'pyt.')}
                </span>
                <span className="mt-1 block h-1.5 overflow-hidden rounded-full" style={{ background: 'var(--hover-bg)' }}>
                  <span
                    className="block h-full rounded-full"
                    style={{
                      width: `${total > 0 ? Math.round((mastered / total) * 100) : 0}%`,
                      background: cat.color,
                    }}
                  />
                </span>
              </span>
              <span className="shrink-0 text-xs" style={{ color: 'var(--text-muted)' }}>
                {seen}/{total}
              </span>
            </Link>
          ))}
        </div>
        <p className="mt-2 text-xs" style={{ color: 'var(--text-muted)' }}>
          {tp(
            'Полоска - доля вопросов, отвеченных верно 2+ раза подряд («выучено»).',
            'Bar = share of questions answered correctly 2+ times in a row ("mastered").',
            'Pasek = odsetek pytań opanowanych (2+ poprawne odpowiedzi z rzędu).',
          )}
        </p>
      </section>

      {/* Strategy tip */}
      <section
        className="mb-8 rounded-2xl p-5 text-sm leading-relaxed"
        style={{ background: 'var(--bg-secondary)', color: 'var(--text-secondary)', border: '1px solid var(--border-subtle)' }}
      >
        <div className="mb-1 font-semibold" style={{ color: 'var(--accent-cyan)' }}>
          💡 {tp('Стратегия подготовки', 'Study strategy', 'Strategia nauki')}
        </div>
        {tp(
          'Порог высокий: максимум 10 ошибок из 75. Больше всего баллов теряют на правилах расхождения и знаках - учи их до автоматизма. Прорешай тренажёр по категориям, добей «вопросы на повтор» до нуля, затем пройди 2-3 пробных экзамена подряд с результатом 70+.',
          'The pass mark is high: at most 10 mistakes out of 75. Most points are lost on right-of-way rules and marks - drill them until automatic. Work through the trainer by category, clear your review queue, then pass 2-3 mock exams in a row with 70+.',
          'Próg jest wysoki: maksymalnie 10 błędów na 75. Najwięcej punktów traci się na przepisach i znakach. Przerób trening kategoriami, wyzeruj powtórki, potem zdaj 2-3 próbne egzaminy z wynikiem 70+.',
        )}
      </section>

      <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
        {tp(
          'Учебный материал для самоподготовки. Актуальную базу вопросов и требования уточняй у организатора экзамена (PZMWiNW).',
          'Self-study material. Check the current question base and requirements with the exam organizer (PZMWiNW).',
          'Materiał pomocniczy do samodzielnej nauki. Aktualną bazę pytań i wymagania sprawdź u organizatora egzaminu (PZMWiNW).',
        )}
      </p>
    </div>
  );
}
