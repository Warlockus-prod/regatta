'use client';

import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import { useI18n } from '@/lib/i18n';

// ============================================================================
// Sternik section preferences: which language the answer explanations are
// shown in (Polish exam language / Russian / both). Persisted in localStorage,
// shared across the subnav toggle, trainer, exam review and the AI chat.
// ============================================================================

export type ExplLang = 'pl' | 'ru' | 'both';
/** Which question base the trainer/exam draws from. */
export type ExamBase = 'all' | 'materialy' | 'internet';
const KEY = 'sternik.explLang.v1';
const BASE_KEY = 'sternik.examBase.v1';

interface Ctx {
  explLang: ExplLang;
  setExplLang: (v: ExplLang) => void;
  examBase: ExamBase;
  setExamBase: (v: ExamBase) => void;
}

const PrefsContext = createContext<Ctx>({
  explLang: 'both', setExplLang: () => {},
  examBase: 'all', setExamBase: () => {},
});

export function SternikPrefsProvider({ children }: { children: ReactNode }) {
  const [explLang, setExplLangState] = useState<ExplLang>('both');
  const [examBase, setExamBaseState] = useState<ExamBase>('all');

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(KEY);
      if (raw === 'pl' || raw === 'ru' || raw === 'both') setExplLangState(raw);
      const b = window.localStorage.getItem(BASE_KEY);
      if (b === 'all' || b === 'materialy' || b === 'internet') setExamBaseState(b);
    } catch {
      // ignore
    }
  }, []);

  const setExplLang = useCallback((v: ExplLang) => {
    setExplLangState(v);
    try { window.localStorage.setItem(KEY, v); } catch { /* ignore */ }
  }, []);

  const setExamBase = useCallback((v: ExamBase) => {
    setExamBaseState(v);
    try { window.localStorage.setItem(BASE_KEY, v); } catch { /* ignore */ }
  }, []);

  return (
    <PrefsContext.Provider value={{ explLang, setExplLang, examBase, setExamBase }}>
      {children}
    </PrefsContext.Provider>
  );
}

export function useSternikPrefs(): Ctx {
  return useContext(PrefsContext);
}

/** Segmented toggle: PL / RU / Oba. Compact, fits the subnav. */
export function ExplLangToggle() {
  const { explLang, setExplLang } = useSternikPrefs();
  const { tp } = useI18n();
  const opts: { id: ExplLang; label: string }[] = [
    { id: 'pl', label: 'PL' },
    { id: 'ru', label: 'RU' },
    { id: 'both', label: tp('Оба', 'Both', 'Oba') },
  ];
  return (
    <div
      className="inline-flex items-center gap-0.5 rounded-full p-0.5"
      style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)' }}
      title={tp('Язык пояснений', 'Explanation language', 'Jezyk wyjasnien')}
    >
      <span className="px-1.5 text-xs" style={{ color: 'var(--text-muted)' }}>
        💬
      </span>
      {opts.map((o) => {
        const active = explLang === o.id;
        return (
          <button
            key={o.id}
            type="button"
            onClick={() => setExplLang(o.id)}
            className="flex min-h-[44px] items-center rounded-full px-3 py-1.5 text-sm font-medium transition"
            style={
              active
                ? { background: 'var(--accent-cyan)', color: '#04222e' }
                : { background: 'transparent', color: 'var(--text-secondary)' }
            }
            aria-pressed={active}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

/**
 * Exam-base selector: which question base the trainer / exam draws from.
 * Materials (original konspekt) / Internet (harvested) / All.
 */
export function BaseToggle({ counts }: { counts: { all: number; materialy: number; internet: number } }) {
  const { examBase, setExamBase } = useSternikPrefs();
  const { tp } = useI18n();
  const opts: { id: ExamBase; label: string; n: number }[] = [
    { id: 'all', label: tp('Общая', 'All', 'Wszystkie'), n: counts.all },
    { id: 'materialy', label: tp('Материалы', 'Materials', 'Materialy'), n: counts.materialy },
    { id: 'internet', label: tp('Интернет', 'Internet', 'Internet'), n: counts.internet },
  ];
  return (
    <div>
      <div className="mb-1.5 text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>
        {tp('База вопросов', 'Question base', 'Baza pytan')}
      </div>
      <div className="flex flex-wrap gap-1.5">
        {opts.map((o) => {
          const active = examBase === o.id;
          return (
            <button
              key={o.id}
              type="button"
              onClick={() => setExamBase(o.id)}
              className="flex min-h-[36px] items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-medium transition"
              style={
                active
                  ? { background: 'var(--accent-cyan)', color: '#04222e' }
                  : { background: 'var(--bg-card)', color: 'var(--text-secondary)', border: '1px solid var(--border-subtle)' }
              }
              aria-pressed={active}
            >
              {o.label}
              <span className="text-xs opacity-70">{o.n}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

/** Renders an answer explanation honoring the selected language. */
export function Explanation({
  whyPl,
  whyRu,
  size = 'md',
}: {
  whyPl?: string;
  whyRu?: string;
  size?: 'sm' | 'md';
}) {
  const { explLang } = useSternikPrefs();
  const cls = `mt-1 ${size === 'sm' ? 'text-sm' : 'text-sm leading-relaxed'}`;

  // Decide which texts to show; if the chosen single language is missing,
  // fall back to whatever text exists so the user never sees an empty block.
  let pl = explLang !== 'ru' ? whyPl : undefined;
  let ru = explLang !== 'pl' ? whyRu : undefined;
  if (!pl && !ru) {
    pl = whyPl;
    ru = whyRu;
  }
  const both = pl && ru;

  return (
    <>
      {pl && (
        <p className={cls} style={{ color: 'var(--text-primary)' }}>
          {pl}
        </p>
      )}
      {ru && (
        <p className={cls} style={{ color: both ? 'var(--text-secondary)' : 'var(--text-primary)' }}>
          {ru}
        </p>
      )}
    </>
  );
}
