'use client';

import Link from 'next/link';
import { useI18n } from '@/lib/i18n';
import { useSternikPrefs } from './prefs';
import {
  analyzeSternik,
  buildTutorContext,
  CAT_THEORY_ANCHOR,
  type CatAnalysis,
  type SternikAnalysis,
} from './analysis';
import type { SternikProgress } from '@/lib/sternik-progress';

// ============================================================================
// Personalized error analysis block: shows weak topics, stubborn questions and
// concrete next steps, and hands the whole picture to the AI instructor so it
// can start a targeted lesson. Rendered at the end of the trainer / exam and
// (compact) on the hub.
// ============================================================================

const LEVEL_COLOR: Record<string, string> = {
  critical: 'var(--danger)',
  weak: 'var(--warning)',
  ok: 'var(--accent-cyan)',
  strong: 'var(--success)',
  untouched: 'var(--text-muted)',
};

function Bar({ pct, color }: { pct: number; color: string }) {
  return (
    <span className="mt-1 block h-1.5 overflow-hidden rounded-full" style={{ background: 'var(--hover-bg)' }}>
      <span className="block h-full rounded-full" style={{ width: `${pct}%`, background: color }} />
    </span>
  );
}

function CatRow({ c, onAskAI }: { c: CatAnalysis; onAskAI: (catId: string) => void }) {
  const { tp, lang } = useI18n();
  const pct = Math.round(c.accuracy * 100);
  return (
    <div className="rounded-xl p-3" style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-subtle)' }}>
      <div className="flex items-center justify-between gap-2">
        <span className="min-w-0 text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
          {c.cat.icon} {c.cat.pl}
        </span>
        <span className="shrink-0 text-sm font-semibold" style={{ color: LEVEL_COLOR[c.level] }}>
          {pct}%
        </span>
      </div>
      {lang === 'ru' && <div className="text-xs" style={{ color: 'var(--text-muted)' }}>{c.cat.ru}</div>}
      <Bar pct={pct} color={LEVEL_COLOR[c.level]} />
      <div className="mt-2 flex flex-wrap gap-1.5">
        <Link
          href={`/sternik/test?cat=${c.cat.id}`}
          className="rounded-lg px-2.5 py-1 text-xs font-medium"
          style={{ background: 'var(--accent-cyan)', color: 'var(--accent-ink, #04222e)' }}
        >
          🎯 {tp('Тренировать', 'Train', 'Trenuj')}
        </Link>
        <a
          href={`/sternik/teoria#${CAT_THEORY_ANCHOR[c.cat.id]}`}
          target="_blank"
          rel="noopener noreferrer"
          className="rounded-lg px-2.5 py-1 text-xs"
          style={{ background: 'var(--hover-bg)', color: 'var(--text-secondary)', border: '1px solid var(--border-subtle)' }}
        >
          📖 {tp('Теория ↗', 'Theory ↗', 'Teoria ↗')}
        </a>
        <button
          type="button"
          onClick={() => onAskAI(c.cat.id)}
          className="rounded-lg px-2.5 py-1 text-xs"
          style={{ background: 'var(--hover-bg)', color: 'var(--accent-cyan)', border: '1px solid var(--border-subtle)' }}
        >
          🎓 {tp('Объяснить', 'Explain', 'Wyjasnij')}
        </button>
      </div>
    </div>
  );
}

export default function PersonalReport({
  progress,
  compact = false,
}: {
  progress: SternikProgress;
  compact?: boolean;
}) {
  const { tp } = useI18n();
  const { explLang } = useSternikPrefs();
  const a: SternikAnalysis = analyzeSternik(progress);

  if (a.answered < 3) {
    return null; // not enough data yet
  }

  const startLesson = (focusCatId?: string) => {
    const ctx = buildTutorContext(a, explLang);
    const focusLine = focusCatId
      ? `Zacznij od tematu o kodzie kategorii "${focusCatId}".`
      : 'Zacznij od najslabszego tematu.';
    const question =
      explLang === 'pl'
        ? `Przeanalizuj moje bledy i zacznij mnie uczyc jak korepetytor. ${focusLine} Wyjasnij regule prosto, daj mnemotechnike i na koncu zadaj mi 1 pytanie sprawdzajace.`
        : explLang === 'ru'
          ? `Разбери мои ошибки и начни учить меня как репетитор. ${focusLine} Объясни правило просто, дай мнемонику и в конце задай 1 проверочный вопрос. Отвечай по-русски, польские термины давай в скобках.`
          : `Przeanalizuj moje bledy i zacznij mnie uczyc. ${focusLine} Wyjasnij po polsku i po rosyjsku, daj mnemotechnike i zadaj 1 pytanie sprawdzajace.`;
    window.dispatchEvent(new CustomEvent('sternik:ask', { detail: { question, context: ctx, explLang } }));
  };

  const focusCats = a.weakest.length > 0 ? a.weakest : a.categories.filter((c) => c.level === 'ok').slice(0, 3);
  const shown = compact ? focusCats.slice(0, 3) : focusCats.slice(0, 6);

  return (
    <section
      className="rounded-2xl p-5"
      style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)' }}
    >
      <div className="mb-1 flex items-center justify-between gap-2">
        <h2 className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>
          🧭 {tp('Персональный разбор', 'Personal analysis', 'Analiza osobista')}
        </h2>
        <span className="text-sm font-semibold" style={{ color: a.accuracy >= 0.87 ? 'var(--success)' : 'var(--warning)' }}>
          {Math.round(a.accuracy * 100)}%
        </span>
      </div>

      {a.ready ? (
        <p className="mb-3 text-sm" style={{ color: 'var(--success)' }}>
          {tp(
            'Ты близок к готовности: слабых тем нет, точность выше порога. Прогони 2-3 пробных экзамена для уверенности.',
            'You look close to ready: no weak topics, accuracy above the pass mark. Run 2-3 mock exams for confidence.',
            'Jestes blisko gotowosci: brak slabych tematow, skutecznosc powyzej progu. Zrob 2-3 probne egzaminy.',
          )}
        </p>
      ) : a.weakest.length > 0 ? (
        <p className="mb-3 text-sm" style={{ color: 'var(--text-secondary)' }}>
          {tp(
            'Вот где чаще всего ошибаешься. Начни с верхних тем: повтори теорию, добей тренажёром, попроси AI объяснить.',
            'Here is where you slip most. Start from the top topics: review the theory, drill the trainer, ask the AI to explain.',
            'Tu najczesciej sie mylisz. Zacznij od gornych tematow: powtorz teorie, dobij trening, popros AI o wyjasnienie.',
          )}
        </p>
      ) : (
        <p className="mb-3 text-sm" style={{ color: 'var(--text-secondary)' }}>
          {tp('Пока данных мало - прорешай больше вопросов, и разбор станет точнее.', 'Not much data yet - answer more questions for a sharper analysis.', 'Za malo danych - odpowiedz na wiecej pytan.')}
        </p>
      )}

      {/* Weak / focus categories */}
      <div className="grid gap-2 sm:grid-cols-2">
        {shown.map((c) => (
          <CatRow key={c.cat.id} c={c} onAskAI={(id) => startLesson(id)} />
        ))}
      </div>

      {/* Stubborn questions */}
      {!compact && a.stubborn.length > 0 && (
        <div className="mt-4">
          <div className="mb-1 text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
            🔁 {tp('Упорные ошибки (мимо 2+ раз)', 'Stubborn mistakes (missed 2+ times)', 'Uporczywe bledy (2+ razy)')}
          </div>
          <ul className="space-y-1 text-sm" style={{ color: 'var(--text-secondary)' }}>
            {a.stubborn.slice(0, 5).map((s) => (
              <li key={s.id} className="leading-snug">
                <span style={{ color: 'var(--text-primary)' }}>{s.q}</span>{' '}
                <span style={{ color: 'var(--success)' }}>- {s.correctText}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Primary actions */}
      <div className="mt-4 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => startLesson()}
          className="rounded-xl px-4 py-2.5 text-sm font-semibold"
          style={{ background: 'linear-gradient(135deg, var(--accent-cyan), var(--accent-teal))', color: 'var(--accent-ink, #04222e)' }}
        >
          🎓 {tp('Начать разбор с AI', 'Start AI lesson', 'Lekcja z AI')}
        </button>
        {a.weakIdCount > 0 && (
          <Link
            href="/sternik/test?mode=errors"
            className="rounded-xl px-4 py-2.5 text-sm font-semibold"
            style={{ background: 'var(--warning)', color: '#221a04' }}
          >
            🔁 {tp('Тренировать ошибки', 'Train mistakes', 'Trenuj bledy')} ({a.weakIdCount})
          </Link>
        )}
      </div>
    </section>
  );
}
