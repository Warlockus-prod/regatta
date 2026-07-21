'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useI18n } from '@/lib/i18n';
import { useSternikPrefs } from '../../sternik/prefs';
import { SCENARIOS } from '../symulator/scenarios';
import { SpeakButton } from '../audio/SpeakButton';
import {
  CHANNELS, PHONETIC, DIGITS, PROWORDS, SMCP, DSC_STEPS, MISTAKES, EXAM_FACTS,
  MAYDAY_TEMPLATE, PANPAN_TEMPLATE, SECURITE_TEMPLATE, CANCEL_TEMPLATE,
} from '../cheatData';

// ============================================================================
// Printable SRC crib + training certificate.
//
// Two print targets on one page. Whichever the user asks for gets the
// `printable` class; the @media print block in globals.css blanks everything
// else on the sheet (site nav, subnav, footer, feedback bubble) and prints that
// subtree from the top of the paper - so no separate print-only route is
// needed, and no shared component had to learn about printing.
//
// The colors inside `printable` come from CSS vars that the print block pins to
// an ink-on-white palette, so the output is the same whether the reader is
// browsing the site in the dark or the light theme.
// ============================================================================

/** matches the simulator's storage */
const PROGRESS_KEY = 'sternik.radio.progress.v1';
const NAME_KEY = 'sternik.radio.cert-name.v1';
/** the UKE practical passes at 60% - use the same bar for a scenario. */
const PASS = 60;

interface ScenarioProgress { attempts: number; best: number; lastScore: number; bestTimeSec: number | null }

export default function CheatSheet() {
  const { tp, lang } = useI18n();
  const { explLang } = useSternikPrefs();
  const showRu = lang === 'ru' && explLang !== 'pl';
  const showPl = explLang !== 'ru' || lang !== 'ru';

  const [printing, setPrinting] = useState<'sheet' | 'cert' | null>(null);
  const [passed, setPassed] = useState<{ id: string; title: string; best: number }[]>([]);
  const [name, setName] = useState('');
  const [today, setToday] = useState('');

  // localStorage + date only after mount: they differ per device, and reading
  // them during render would break hydration.
  useEffect(() => {
    try {
      const raw = JSON.parse(window.localStorage.getItem(PROGRESS_KEY) ?? '{}') as Record<string, ScenarioProgress>;
      setPassed(
        SCENARIOS
          .filter((s) => (raw[s.id]?.best ?? 0) >= PASS)
          .map((s) => ({ id: s.id, title: s.title.pl, best: raw[s.id].best })),
      );
      setName(window.localStorage.getItem(NAME_KEY) ?? '');
    } catch { /* private browsing */ }
    setToday(new Date().toLocaleDateString('pl-PL', { day: '2-digit', month: '2-digit', year: 'numeric' }));
  }, []);

  const onName = useCallback((v: string) => {
    setName(v);
    try { window.localStorage.setItem(NAME_KEY, v); } catch { /* ignore */ }
  }, []);

  // Flip the class on, let React paint, then open the print dialog. window.print
  // blocks, so it has to run after the commit - hence the timeout.
  const print = useCallback((what: 'sheet' | 'cert') => {
    setPrinting(what);
    window.setTimeout(() => {
      try { window.print(); } finally { setPrinting(null); }
    }, 60);
  }, []);

  const total = SCENARIOS.length;
  const done = passed.length;
  const complete = done >= total;
  const bi = useCallback((pl: string, ru: string) => {
    if (showPl && showRu) return `${pl} · ${ru}`;
    return showRu ? ru : pl;
  }, [showPl, showRu]);

  const listen = tp('Прослушать', 'Listen', 'Posluchaj', {
    es: 'Escuchar', fr: 'Ecouter', de: 'Anhoren', it: 'Ascolta',
  });
  // Prowords are shown "ENGLISH / ENGLISH" (e.g. ROGER / RECEIVED); speak the
  // clean spoken form (matches the pregen manifest key).
  const say = (proword: string) => proword.replace(/\s*\/\s*/g, ', ');

  const grade = useMemo(() => {
    if (!done) return null;
    const avg = Math.round(passed.reduce((a, p) => a + p.best, 0) / done);
    return avg;
  }, [passed, done]);

  return (
    <main>
      <div className="no-print">
        <Link href="/radio" className="text-sm" style={{ color: 'var(--accent-cyan)' }}>
          {tp('< Раздел радио', '< Radio section', '< Dzial radio')}
        </Link>
        <h1 className="mb-1 mt-2 text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>
          📄 {tp('Шпаргалка и сертификат', 'Cheat sheet and certificate', 'Sciaga i certyfikat')}
        </h1>
        <p className="mb-5 text-sm" style={{ color: 'var(--text-secondary)' }}>
          {tp(
            'Одна страница со всем, что спрашивают на SRC: каналы, MAYDAY/PAN-PAN/SECURITE, DSC, фонетика, типовые ошибки. Печатай и бери с собой.',
            'Everything the SRC exam asks for on one page: channels, MAYDAY/PAN-PAN/SECURITE, DSC, phonetics, common mistakes. Print it and take it along.',
            'Wszystko, o co pyta egzamin SRC, na jednej stronie: kanaly, MAYDAY/PAN-PAN/SECURITE, DSC, fonetyka, typowe bledy. Wydrukuj i miej przy sobie.',
          )}
        </p>
        <div className="mb-6 flex flex-wrap gap-2">
          <button
            type="button"
            data-testid="print-sheet"
            onClick={() => print('sheet')}
            className="min-h-[44px] rounded-xl px-4 text-sm font-semibold"
            style={{ background: 'var(--accent-cyan)', color: 'var(--accent-ink, #04222e)' }}
          >
            🖨 {tp('Печать шпаргалки', 'Print the cheat sheet', 'Drukuj sciage')}
          </button>
          <button
            type="button"
            data-testid="print-cert"
            onClick={() => print('cert')}
            disabled={!done}
            className="min-h-[44px] rounded-xl px-4 text-sm font-semibold disabled:opacity-40"
            style={{ background: 'var(--bg-card)', color: 'var(--text-primary)', border: '1px solid var(--border-subtle)' }}
          >
            🏅 {tp('Печать сертификата', 'Print the certificate', 'Drukuj certyfikat')}
          </button>
        </div>
      </div>

      {/* ------------------------------------------------------------- SHEET */}
      <section data-testid="cheat-sheet" className={printing === 'sheet' ? 'printable' : undefined}>
        <SheetHead
          title={bi('Sciaga SRC / VHF-DSC', 'Шпаргалка SRC / VHF-DSC')}
          sub="Week to Regatta · weektoregatta.com/radio"
        />

        <div className="grid gap-3 sm:grid-cols-2">
          <Box title={bi('Kanaly', 'Каналы')}>
            <Rows rows={CHANNELS.map((c) => [c[0], bi(c[1], c[2])] as const)} />
            <Note>{bi('1 W w porcie i marinie, 25 W na otwartej wodzie.', '1 Вт в порту и марине, 25 Вт на открытой воде.')}</Note>
          </Box>

          <Box title={bi('Priorytet wywolan', 'Приоритет вызовов')}>
            <ul className="space-y-1 text-sm" style={{ color: 'var(--text-secondary)' }}>
              <li><b style={{ color: 'var(--danger)' }}>MAYDAY</b> - {bi('zagrozenie zycia lub jednostki', 'угроза жизни или судну')}</li>
              <li><b style={{ color: 'var(--cat-orange)' }}>PAN-PAN</b> - {bi('pilne, bez zagrozenia zycia', 'срочно, без угрозы жизни')}</li>
              <li><b style={{ color: 'var(--accent-cyan)' }}>SECURITE</b> - {bi('ostrzezenie nawigacyjne lub meteo', 'навигационное или метео предупреждение')}</li>
              <li>{bi('kazde slowo powtarzane 3 razy na poczatku', 'каждое слово в начале повторяется 3 раза')}</li>
            </ul>
          </Box>

          <Box title="MAYDAY">
            <Pre>{MAYDAY_TEMPLATE}</Pre>
          </Box>

          <Box title="PAN-PAN">
            <Pre>{PANPAN_TEMPLATE}</Pre>
          </Box>

          <Box title="SECURITE">
            <Pre>{SECURITE_TEMPLATE}</Pre>
          </Box>

          <Box title={bi('Odwolanie falszywego alertu', 'Отмена ложного алерта')}>
            <Pre>{CANCEL_TEMPLATE}</Pre>
            <Note>{bi('Nie wylaczaj radia. Odwolaj cyfrowo i glosem na 16.', 'Не выключай рацию. Отмени цифрой и голосом на 16.')}</Note>
          </Box>

          <Box title={bi('DSC DISTRESS na ICOM', 'DSC DISTRESS на ICOM')} wide>
            <Rows rows={DSC_STEPS.map((s) => [s[0], bi(s[1], s[2])] as const)} />
          </Box>

          <Box title={bi('Alfabet fonetyczny', 'Фонетический алфавит')} wide>
            <div className="grid grid-cols-3 gap-x-4 gap-y-1 text-sm sm:grid-cols-6" style={{ color: 'var(--text-secondary)' }}>
              {PHONETIC.map(([l, w]) => (
                <div key={l} className="flex items-center gap-1.5">
                  <span className="font-bold" style={{ color: 'var(--accent-cyan)' }}>{l}</span>
                  <span>{w}</span>
                  <span className="no-print ml-auto"><SpeakButton text={w} label={listen} size={20} /></span>
                </div>
              ))}
            </div>
            <div className="mt-2 grid grid-cols-3 gap-x-4 gap-y-1 text-sm sm:grid-cols-5" style={{ color: 'var(--text-secondary)' }}>
              {DIGITS.map(([d, w]) => (
                <div key={d} className="flex items-center gap-1.5">
                  <span className="font-bold" style={{ color: 'var(--accent-cyan)' }}>{d}</span>
                  <span>{w}</span>
                  <span className="no-print ml-auto"><SpeakButton text={w} label={listen} size={20} /></span>
                </div>
              ))}
            </div>
          </Box>

          <Box title="Prowords" wide>
            <div className="space-y-1 text-sm">
              {PROWORDS.map((p) => (
                <div key={p[0]} className="flex items-center gap-2">
                  <span className="no-print"><SpeakButton text={say(p[0])} label={listen} size={20} /></span>
                  <span className="min-w-[92px] shrink-0 font-bold" style={{ color: 'var(--accent-cyan)' }}>{p[0]}</span>
                  <span style={{ color: 'var(--text-secondary)' }}>{bi(p[1], p[2])}</span>
                </div>
              ))}
            </div>
          </Box>

          <Box title={bi('Zwroty SMCP (morski angielski)', 'Фразы SMCP (морской английский)')} wide>
            <div className="space-y-1 text-sm">
              {SMCP.map((p) => (
                <div key={p[0]} className="flex items-center gap-2">
                  <span className="no-print"><SpeakButton text={p[0]} label={listen} size={20} /></span>
                  <span className="min-w-[210px] shrink-0 font-semibold" style={{ color: 'var(--accent-cyan)' }}>{p[0]}</span>
                  <span style={{ color: 'var(--text-secondary)' }}>{bi(p[1], p[2])}</span>
                </div>
              ))}
            </div>
          </Box>

          <Box title={bi('Typowe bledy - tu oblewa sie egzamin', 'Типовые ошибки - на них валят экзамен')}>
            <ul className="space-y-1 text-sm" style={{ color: 'var(--text-secondary)' }}>
              {MISTAKES.map(([pl, ru]) => (
                <li key={pl}>✗ {bi(pl, ru)}</li>
              ))}
            </ul>
          </Box>

          <Box title={bi('Egzamin UKE', 'Экзамен UKE')}>
            <ul className="space-y-1 text-sm" style={{ color: 'var(--text-secondary)' }}>
              {EXAM_FACTS.map(([pl, ru]) => (
                <li key={pl}>· {bi(pl, ru)}</li>
              ))}
            </ul>
          </Box>
        </div>
      </section>

      {/* -------------------------------------------------------- CERTIFICATE */}
      <section
        data-testid="cert"
        className={`mt-8 ${printing === 'cert' ? 'printable' : ''}`}
      >
        <h2 className="mb-3 text-lg font-bold no-print" style={{ color: 'var(--text-primary)' }}>
          🏅 {tp('Сертификат тренировки', 'Training certificate', 'Certyfikat treningu')}
        </h2>

        <div
          className="rounded-2xl p-6 text-center"
          style={{ background: 'var(--bg-card)', border: `2px solid ${complete ? 'var(--accent-cyan)' : 'var(--border-subtle)'}` }}
        >
          <div className="text-xs font-bold uppercase tracking-[0.2em]" style={{ color: 'var(--accent-cyan)' }}>
            Week to Regatta · SRC / VHF-DSC
          </div>
          <div className="mt-3 text-xl font-bold" style={{ color: 'var(--text-primary)' }}>
            {bi('Certyfikat treningu symulatora', 'Сертификат тренировки на симуляторе')}
          </div>
          <div className="mx-auto mt-1 max-w-md text-xs" style={{ color: 'var(--text-muted)' }}>
            {bi(
              'Dokument treningowy. Nie jest swiadectwem operatora - swiadectwo SRC wydaje wylacznie UKE.',
              'Тренировочный документ. Не является свидетельством оператора: SRC выдаёт только UKE.',
            )}
          </div>

          <input
            data-testid="cert-name"
            value={name}
            onChange={(e) => onName(e.target.value)}
            placeholder={bi('Imie i nazwisko', 'Имя и фамилия')}
            className="mx-auto mt-5 block w-full max-w-sm rounded-xl px-4 py-2 text-center text-lg font-bold"
            style={{ background: 'var(--bg-secondary)', color: 'var(--text-primary)', border: '1px solid var(--border-subtle)' }}
          />

          <div className="mt-5 text-sm" style={{ color: 'var(--text-secondary)' }}>
            {bi('Zaliczone scenariusze', 'Пройдено сценариев')}:{' '}
            <b data-testid="cert-count" style={{ color: complete ? 'var(--success)' : 'var(--text-primary)' }}>
              {done} / {total}
            </b>
            {grade !== null && (
              <>
                {' · '}
                {bi('srednia', 'средний балл')}: <b style={{ color: 'var(--text-primary)' }}>{grade}%</b>
              </>
            )}
          </div>

          {done > 0 && (
            <div className="mx-auto mt-3 flex max-w-lg flex-wrap justify-center gap-1 text-xs" style={{ color: 'var(--text-muted)' }}>
              {passed.map((p) => (
                <span key={p.id} className="rounded-full px-2 py-1" style={{ background: 'var(--bg-secondary)' }}>
                  {p.title} {p.best}%
                </span>
              ))}
            </div>
          )}

          <div className="mt-5 text-xs" style={{ color: 'var(--text-muted)' }}>
            {today && <>{bi('Data', 'Дата')}: {today}</>}
          </div>

          {!done && (
            <div className="mt-4 text-sm no-print" style={{ color: 'var(--text-muted)' }}>
              {bi(
                'Zalicz co najmniej jeden scenariusz w symulatorze (min. 60%), zeby wydrukowac certyfikat.',
                'Пройди хотя бы один сценарий в симуляторе (минимум 60%), чтобы напечатать сертификат.',
              )}{' '}
              <Link href="/radio/symulator" style={{ color: 'var(--accent-cyan)' }}>
                {bi('Otworz symulator', 'Открыть симулятор')}
              </Link>
            </div>
          )}
        </div>
      </section>
    </main>
  );
}

// ------------------------------------------------------------------ pieces ---

/** Only shows up on paper: the sheet needs a title, the site page already has one. */
function SheetHead({ title, sub }: { title: string; sub: string }) {
  return (
    <div className="print-only mb-4">
      <div className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>{title}</div>
      <div className="text-xs" style={{ color: 'var(--text-muted)' }}>{sub}</div>
    </div>
  );
}

function Box({ title, children, wide }: { title: string; children: React.ReactNode; wide?: boolean }) {
  return (
    <div
      className={`break-inside-avoid rounded-2xl p-4 ${wide ? 'sm:col-span-2' : ''}`}
      style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)' }}
    >
      <div className="mb-2 text-sm font-bold" style={{ color: 'var(--text-primary)' }}>{title}</div>
      {children}
    </div>
  );
}

function Rows({ rows }: { rows: (readonly [string, string])[] }) {
  return (
    <div className="space-y-1 text-sm">
      {rows.map(([k, v]) => (
        <div key={k} className="flex gap-2">
          <span className="min-w-[92px] shrink-0 font-bold" style={{ color: 'var(--accent-cyan)' }}>{k}</span>
          <span style={{ color: 'var(--text-secondary)' }}>{v}</span>
        </div>
      ))}
    </div>
  );
}

function Pre({ children }: { children: string }) {
  return (
    <pre
      className="overflow-x-auto rounded-xl p-3 text-xs leading-relaxed"
      style={{ background: 'var(--bg-secondary)', color: 'var(--text-primary)', border: '1px solid var(--border-subtle)' }}
    >
      {children}
    </pre>
  );
}

function Note({ children }: { children: React.ReactNode }) {
  return <div className="mt-2 text-xs" style={{ color: 'var(--text-muted)' }}>{children}</div>;
}
