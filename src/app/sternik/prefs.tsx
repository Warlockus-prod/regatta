'use client';

import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import { I18nScope, useI18n } from '@/lib/i18n';
import type { RadioModel } from '../radio/symulator/radioModel';

// ============================================================================
// Sternik section preferences: which language the answer explanations are
// shown in (Polish exam language / Russian / both). Persisted in localStorage,
// shared across the subnav toggle, trainer, exam review and the AI chat.
//
// Language policy (2026-07): Russian commentary is an OPT-IN aid for the
// Russian site version only. On every other site language (PL/EN/...) the
// explanations are forced to Polish and the RU toggle is hidden - the exam
// itself is in Polish, and the Polish site must never show Russian text.
// ============================================================================

export type ExplLang = 'pl' | 'ru' | 'both';
/** Which question base the trainer/exam draws from. */
export type ExamBase = 'all' | 'materialy' | 'internet';
const KEY = 'sternik.explLang.v1';
const BASE_KEY = 'sternik.examBase.v1';
const REAL_KEY = 'sternik.radio.realistic.v1';

interface Ctx {
  explLang: ExplLang;
  setExplLang: (v: ExplLang) => void;
  examBase: ExamBase;
  setExamBase: (v: ExamBase) => void;
  /** Realistic hardware faceplate (amber IC-M330GE, like the real set) vs the
   *  green trainer look. Persisted, shared across all radio surfaces. */
  radioRealistic: boolean;
  setRadioRealistic: (v: boolean) => void;
}

// Polish is the BASE, not one of two equal options: it is the language of the
// exam. Russian commentary is something a Russian speaker turns ON to understand
// the context better - so the default is 'pl', and 'both' is one tap away.
const DEFAULT_EXPL: ExplLang = 'pl';

const PrefsContext = createContext<Ctx>({
  explLang: DEFAULT_EXPL, setExplLang: () => {},
  examBase: 'all', setExamBase: () => {},
  radioRealistic: false, setRadioRealistic: () => {},
});

export function SternikPrefsProvider({ children }: { children: ReactNode }) {
  const { lang } = useI18n();
  const [explLang, setExplLangState] = useState<ExplLang>(DEFAULT_EXPL);
  const [examBase, setExamBaseState] = useState<ExamBase>('all');
  const [radioRealistic, setRadioRealisticState] = useState(false);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(KEY);
      if (raw === 'pl' || raw === 'ru' || raw === 'both') setExplLangState(raw);
      const b = window.localStorage.getItem(BASE_KEY);
      if (b === 'all' || b === 'materialy' || b === 'internet') setExamBaseState(b);
      if (window.localStorage.getItem(REAL_KEY) === '1') setRadioRealisticState(true);
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

  const setRadioRealistic = useCallback((v: boolean) => {
    setRadioRealisticState(v);
    try { window.localStorage.setItem(REAL_KEY, v ? '1' : '0'); } catch { /* ignore */ }
  }, []);

  // Policy: RU commentary is available only on the Russian site version.
  // The stored preference is kept intact so switching the site back to RU
  // restores the user's choice.
  const effectiveExplLang: ExplLang = lang === 'ru' ? explLang : 'pl';

  return (
    <PrefsContext.Provider value={{ explLang: effectiveExplLang, setExplLang, examBase, setExamBase, radioRealistic, setRadioRealistic }}>
      {children}
    </PrefsContext.Provider>
  );
}

export function useSternikPrefs(): Ctx {
  return useContext(PrefsContext);
}

/**
 * The motorowodny section (sternik + radio) exists only in Polish (the exam
 * language, and the default) and Russian (an opt-in aid). Any other site
 * language is rendered in Polish rather than a half-translated mix - there is
 * no EN/ES/FR/DE/IT version of a Polish licence exam. This forces the section's
 * effective language to PL for every non-RU visitor; the global language picker
 * (outside the section) still switches the real site language.
 */
export function SternikLangScope({ children }: { children: ReactNode }) {
  const { lang } = useI18n();
  return <I18nScope lang={lang === 'ru' ? 'ru' : 'pl'}>{children}</I18nScope>;
}

/** Segmented toggle: PL / RU / Oba. Compact, fits the subnav.
 *  Rendered only on the Russian site version - everywhere else the
 *  explanations are locked to Polish (see SternikPrefsProvider). */
export function ExplLangToggle() {
  const { explLang, setExplLang } = useSternikPrefs();
  const { tp, lang } = useI18n();
  if (lang !== 'ru') return null;
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
                ? { background: 'var(--accent-cyan)', color: 'var(--accent-ink, #04222e)' }
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

/** Segmented 3-way for the radio: the two exam models (IC-M330 / IC-M323, in the
 *  green trainer look) plus a third "Realna" that repaints the set as the real
 *  amber IC-M330GE hardware, grille and all. The realistic choice is a persisted
 *  section pref, so it follows the learner across every radio surface; the model
 *  itself stays owned by the page (each surface resets its own radio on switch).
 *  The two model buttons clear realistic; the third turns it on. */
export function RadioVariantToggle({ model, onModel }: { model: RadioModel; onModel: (m: RadioModel) => void }) {
  const { radioRealistic, setRadioRealistic } = useSternikPrefs();
  const { tp } = useI18n();
  const on = { background: 'var(--accent-cyan)', color: 'var(--accent-ink, #04222e)' } as const;
  const off = { background: 'var(--bg-card)', color: 'var(--text-secondary)' } as const;
  const cls = 'flex min-h-[44px] items-center gap-1.5 px-3 text-sm font-semibold transition';
  const pickModel = (m: RadioModel) => { setRadioRealistic(false); onModel(m); };
  const m330On = model === 'M330' && !radioRealistic;
  const m323On = model === 'M323' && !radioRealistic;
  return (
    <div
      className="inline-flex overflow-hidden rounded-lg"
      role="group"
      aria-label={tp('Рация', 'Radio', 'Radio')}
      style={{ border: '1px solid var(--border-subtle)' }}
    >
      <button type="button" data-testid="radio-variant-m330" onClick={() => pickModel('M330')} aria-pressed={m330On} className={cls} style={m330On ? on : off}>
        IC-M330
      </button>
      <button type="button" data-testid="radio-variant-m323" onClick={() => pickModel('M323')} aria-pressed={m323On} className={cls} style={m323On ? on : off}>
        IC-M323
      </button>
      <button
        type="button"
        data-testid="radio-variant-real"
        onClick={() => setRadioRealistic(true)}
        aria-pressed={radioRealistic}
        className={cls}
        style={radioRealistic ? on : off}
        title={tp('Как настоящая рация ICOM', 'Like the real ICOM set', 'Jak prawdziwe radio ICOM')}
      >
        <span aria-hidden style={{ width: 9, height: 9, borderRadius: 2, background: '#ffb638', boxShadow: '0 0 5px #ffb638' }} />
        {tp('Реальная', 'Real', 'Realna')}
      </button>
    </div>
  );
}

const HINT_KEY = 'sternik.explHint.v1';

/**
 * A one-line, dismissible note that tells a Russian speaker the course is in
 * Polish ON PURPOSE - and that Russian commentary is one tap away.
 *
 * It exists because the policy is not obvious: a visitor who switched the site
 * to Russian and then found a Polish course could reasonably think the
 * translation is simply missing. It is not - Polish is the exam language, and
 * a half-translated licence course would be worse than none.
 *
 * Shown only on the Russian site version, and only until it is dismissed.
 */
export function ExplLangHint() {
  const { lang } = useI18n();
  const { explLang, setExplLang } = useSternikPrefs();
  const [hidden, setHidden] = useState(true);

  useEffect(() => {
    try { setHidden(window.localStorage.getItem(HINT_KEY) === '1'); } catch { setHidden(false); }
  }, []);

  if (lang !== 'ru' || hidden || explLang !== 'pl') return null;

  const dismiss = () => {
    setHidden(true);
    try { window.localStorage.setItem(HINT_KEY, '1'); } catch { /* ignore */ }
  };

  return (
    <div
      data-testid="expl-lang-hint"
      className="mb-4 flex flex-wrap items-center gap-2 rounded-xl px-3 py-2 text-xs leading-relaxed"
      style={{ background: 'rgba(0,212,255,0.07)', border: '1px solid rgba(0,212,255,0.22)', color: 'var(--text-secondary)' }}
    >
      <span>
        💬 Курс идёт на польском - это язык экзамена. Нужен контекст по-русски? Добавь русские комментарии.
      </span>
      <button
        type="button"
        data-testid="expl-lang-hint-on"
        onClick={() => { setExplLang('both'); dismiss(); }}
        className="min-h-[36px] rounded-full px-3 text-xs font-semibold"
        style={{ background: 'var(--accent-cyan)', color: 'var(--accent-ink, #04222e)' }}
      >
        Включить RU
      </button>
      <button
        type="button"
        onClick={dismiss}
        className="min-h-[36px] rounded-full px-2 text-xs"
        style={{ color: 'var(--text-muted)' }}
      >
        Не надо
      </button>
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
              className="flex min-h-[44px] items-center gap-1.5 rounded-full px-3 py-2 text-sm font-medium transition"
              style={
                active
                  ? { background: 'var(--accent-cyan)', color: 'var(--accent-ink, #04222e)' }
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
