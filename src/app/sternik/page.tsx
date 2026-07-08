'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useI18n } from '@/lib/i18n';
import { STERNIK_BANK, STERNIK_CATEGORIES, STERNIK_EXAM } from '@/data/sternik';
import {
  loadSternikProgress,
  sternikWeakIds,
  type SternikProgress,
} from '@/lib/sternik-progress';
import { formatClock } from './quiz-utils';
import PersonalReport from './PersonalReport';

// ============================================================================
// /sternik - hub: exam format, live progress, entry points.
// ============================================================================

function StatTile({ value, label, accent }: { value: string; label: string; accent?: string }) {
  return (
    <div
      className="rounded-xl px-4 py-3 text-center"
      style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)' }}
    >
      <div className="text-2xl font-bold" style={{ color: accent ?? 'var(--accent-cyan)' }}>
        {value}
      </div>
      <div className="mt-0.5 text-xs" style={{ color: 'var(--text-muted)' }}>
        {label}
      </div>
    </div>
  );
}

export default function SternikHubPage() {
  const { tp } = useI18n();
  const [progress, setProgress] = useState<SternikProgress | null>(null);

  useEffect(() => {
    setProgress(loadSternikProgress());
  }, []);

  const answered = progress?.totalAnswered ?? 0;
  const accuracy = answered > 0 ? Math.round(((progress?.totalCorrect ?? 0) / answered) * 100) : 0;
  const weak = progress ? sternikWeakIds(progress).length : 0;
  const examPoolSize = STERNIK_BANK.filter((q) => q.options.length === 3).length;
  const extendedSize = STERNIK_BANK.length - examPoolSize;
  const exams = progress?.exams ?? [];
  const passedExams = exams.filter((e) => e.passed).length;
  const lastExam = exams.length > 0 ? exams[exams.length - 1] : null;

  const catStats = STERNIK_CATEGORIES.map((cat) => {
    const qs = STERNIK_BANK.filter((q) => q.cat === cat.id);
    let seen = 0;
    let mastered = 0;
    for (const q of qs) {
      const s = progress?.q[q.id];
      if (s && s.seen > 0) seen += 1;
      if (s && s.streak >= 2) mastered += 1;
    }
    return { cat, total: qs.length, seen, mastered };
  });

  return (
    <main>
      {/* Hero */}
      <header className="mb-8">
        <h1 className="text-3xl font-bold sm:text-4xl" style={{ color: 'var(--text-primary)' }}>
          ⚓ Sternik motorowodny
        </h1>
        <p className="mt-2 max-w-2xl" style={{ color: 'var(--text-secondary)' }}>
          {tp(
            'Подготовка к польскому госэкзамену на патент судоводителя моторной лодки: теория со схемами, тренажёр вопросов и пробный экзамен. Вопросы по-польски (как на экзамене), пояснения по-русски.',
            'Preparation for the Polish state exam for the motorboat helmsman licence: theory with diagrams, a question trainer and a mock exam. Questions in Polish (as on the exam), explanations in Russian.',
            'Przygotowanie do panstwowego egzaminu na patent sternika motorowodnego: teoria ze schematami, trening pytan i probny egzamin.',
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
          <StatTile value={String(STERNIK_EXAM.questions)} label={tp('вопросов (A/B/C)', 'questions (A/B/C)', 'pytan (A/B/C)')} />
          <StatTile value={`${STERNIK_EXAM.minutes} min`} label={tp('на весь тест', 'for the whole test', 'na caly test')} />
          <StatTile
            value={`${STERNIK_EXAM.passCorrect}/${STERNIK_EXAM.questions}`}
            label={tp(`порог сдачи (${STERNIK_EXAM.passPct}%)`, `pass mark (${STERNIK_EXAM.passPct}%)`, `prog zdania (${STERNIK_EXAM.passPct}%)`)}
            accent="var(--success)"
          />
          <StatTile value="10" label={tp('макс. ошибок', 'max mistakes', 'maks. bledow')} accent="var(--warning)" />
        </div>
        <p className="mt-3 text-sm" style={{ color: 'var(--text-muted)' }}>
          {tp(
            'Плюс практическая часть: манёвры на лодке (отход/подход к причалу, «человек за бортом», якорь). Минимальный возраст - 14 лет. Стоимость: экзамен 250 zl + патент 50 zl (ученикам и студентам до 26 лет - скидка 50%). Основание: rozporzadzenie MSiT z 9.04.2013 (tekst jednolity 2026).',
            'Plus a practical part: boat maneuvers (dock departure/approach, man overboard, anchoring). Minimum age 14. Fees: exam 250 zl + licence 50 zl (50% off for pupils/students under 26). Legal basis: MSiT regulation of 9.04.2013 (2026 consolidated text).',
            'Do tego czesc praktyczna: manewry (odejscie/dojscie do kei, czlowiek za burta, kotwiczenie). Minimalny wiek: 14 lat. Oplaty: egzamin 250 zl + patent 50 zl (uczniowie i studenci do 26 lat: 50%).',
          )}
        </p>
        <p className="mt-2 text-xs" style={{ color: 'var(--text-muted)' }}>
          {tp(
            `База: ${STERNIK_BANK.length} вопросов из открытых источников (моя выборка + аутентичная база akademiasternika + база Centrum Zeglarskie с ключом; сверено с Wind / motosternik / h2o), дубли убраны. У PZMWiNW нет единой публичной базы - вопросы составляет комиссия из тем экзамена; в сети циркулирует набор ~286-337 в вариантах разных школ. Реальный экзамен - 3 варианта A/B/C: пробный экзамен берёт ${examPoolSize} вопросов такого формата, тренажёр даёт все ${STERNIK_BANK.length} (включая ${extendedSize} расширенных на 4 варианта для более глубокой проработки).`,
            `Bank: ${STERNIK_BANK.length} questions from open sources (my set + the authentic akademiasternika base + Centrum Zeglarskie bank with key; cross-checked with Wind / motosternik / h2o), deduplicated. PZMWiNW has no single public bank - a commission draws questions from the exam topics; a ~286-337 set circulates in school variants. The real exam is 3-option A/B/C: the mock exam uses ${examPoolSize} such questions, the trainer offers all ${STERNIK_BANK.length} (including ${extendedSize} extended 4-option ones for deeper practice).`,
            `Baza: ${STERNIK_BANK.length} pytan ze zrodel otwartych (moj zestaw + autentyczna baza akademiasternika + baza Centrum Zeglarskie z kluczem; sprawdzone z Wind / motosternik / h2o), bez duplikatow. PZMWiNW nie ma jednej publicznej bazy - pytania uklada komisja z zakresu egzaminu; w sieci krazy zestaw ~286-337 w wariantach szkol. Prawdziwy egzamin ma 3 warianty A/B/C: probny egzamin bierze ${examPoolSize} takich pytan, trening daje wszystkie ${STERNIK_BANK.length} (w tym ${extendedSize} rozszerzonych 4-wariantowych).`,
          )}
        </p>
      </section>

      {/* Progress */}
      <section className="mb-8">
        <h2 className="mb-3 text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>
          📈 {tp('Твой прогресс', 'Your progress', 'Twoj postep')}
        </h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <StatTile value={String(answered)} label={tp('ответов дано', 'answers given', 'udzielonych odpowiedzi')} />
          <StatTile
            value={answered > 0 ? `${accuracy}%` : '-'}
            label={tp('точность', 'accuracy', 'skutecznosc')}
            accent={accuracy >= STERNIK_EXAM.passPct ? 'var(--success)' : 'var(--warning)'}
          />
          <StatTile value={String(weak)} label={tp('вопросов на повтор', 'to review', 'do powtorki')} accent={weak > 0 ? 'var(--danger)' : 'var(--success)'} />
          <StatTile
            value={exams.length > 0 ? `${passedExams}/${exams.length}` : '-'}
            label={tp('экзаменов сдано', 'exams passed', 'zdanych egzaminow')}
            accent="var(--accent-teal)"
          />
        </div>
        {lastExam && (
          <p className="mt-2 text-sm" style={{ color: 'var(--text-muted)' }}>
            {tp('Последний пробный экзамен: ', 'Last mock exam: ', 'Ostatni probny egzamin: ')}
            <span style={{ color: lastExam.passed ? 'var(--success)' : 'var(--danger)' }}>
              {lastExam.correct}/{lastExam.total} {lastExam.passed ? '✓' : '✗'}
            </span>
            {' · '}
            {formatClock(lastExam.durationSec)}
          </p>
        )}
      </section>

      {/* Personalized analysis (only once there is enough data) */}
      {progress && (
        <section className="mb-8">
          <PersonalReport progress={progress} compact />
        </section>
      )}

      {/* Entry cards */}
      <section className="mb-8 grid gap-4 sm:grid-cols-3">
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
              '14 rozdzialow ze schematami: patent, przepisy, swiatla, znaki, silniki, manewry, ratownictwo.',
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
            {tp('Тренажёр вопросов', 'Question trainer', 'Trening pytan')}
          </div>
          <p className="mt-1 text-sm" style={{ color: 'var(--text-secondary)' }}>
            {tp(
              `${STERNIK_BANK.length} вопросов. Ответил - сразу видишь верно/нет и почему. Как при подготовке на автоправа.`,
              `${STERNIK_BANK.length} questions with instant right/wrong feedback and explanations.`,
              `${STERNIK_BANK.length} pytan, od razu dobrze/zle + wyjasnienie.`,
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
            {tp('Пробный экзамен', 'Mock exam', 'Probny egzamin')}
          </div>
          <p className="mt-1 text-sm" style={{ color: 'var(--text-secondary)' }}>
            {tp(
              '75 вопросов, 90 минут, порог 65 - всё как на настоящем экзамене. С паузой и разбором ошибок.',
              '75 questions, 90 minutes, pass mark 65 - just like the real exam. With pause and error review.',
              '75 pytan, 90 minut, prog 65 - jak na prawdziwym egzaminie. Z pauza i powtorka bledow.',
            )}
          </p>
        </Link>
      </section>

      {/* Categories overview */}
      <section className="mb-8">
        <h2 className="mb-3 text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>
          🗂️ {tp('Категории вопросов', 'Question categories', 'Kategorie pytan')}
        </h2>
        <div className="grid gap-3 sm:grid-cols-2">
          {catStats.map(({ cat, total, seen, mastered }) => (
            <Link
              key={cat.id}
              href={`/sternik/test?cat=${cat.id}`}
              className="flex items-center gap-3 rounded-xl px-4 py-3 transition hover:opacity-90"
              style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)' }}
            >
              <span className="text-xl">{cat.icon}</span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                  {cat.pl}
                </span>
                <span className="block truncate text-xs" style={{ color: 'var(--text-muted)' }}>
                  {cat.ru} · {total} {tp('вопр.', 'q.', 'pyt.')}
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
              <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
                {seen}/{total}
              </span>
            </Link>
          ))}
        </div>
        <p className="mt-2 text-xs" style={{ color: 'var(--text-muted)' }}>
          {tp(
            'Полоска - доля вопросов, отвеченных верно 2+ раза подряд («выучено»).',
            'Bar = share of questions answered correctly 2+ times in a row ("mastered").',
            'Pasek = odsetek pytan opanowanych (2+ poprawne odpowiedzi z rzedu).',
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
          'Prog jest wysoki: maksymalnie 10 bledow na 75. Najwiecej punktow traci sie na przepisach i znakach. Przerob trening kategoriami, wyzeruj powtorki, potem zdaj 2-3 probne egzaminy z wynikiem 70+.',
        )}
      </section>

      <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
        {tp(
          'Учебный материал для самоподготовки. Актуальную базу вопросов и требования уточняй у организатора экзамена (PZMWiNW).',
          'Self-study material. Check the current question base and requirements with the exam organizer (PZMWiNW).',
          'Material pomocniczy do samodzielnej nauki. Aktualna baze pytan i wymagania sprawdz u organizatora egzaminu (PZMWiNW).',
        )}
      </p>
    </main>
  );
}
