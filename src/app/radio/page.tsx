'use client';

import type { ReactNode } from 'react';
import Link from 'next/link';
import { useI18n } from '@/lib/i18n';
import { CYRILLIC_RE, usePlOnly } from '../sternik/plOnly';
import WeakSpotsPanel from './WeakSpotsPanel';
import { PHONETIC, PROWORDS } from './cheatData';

// ============================================================================
// /radio - dedicated section on the marine VHF radio + the Polish
// SRC operator certificate (Swiadectwo operatora lacznosci bliskiego zasiegu).
// Content language is PL (ASCII, per repo typography rule) + RU commentary,
// matching /sternik/teoria. Facts verified 2026 against UKE (egzaminy.uke.gov.pl,
// BIP UKE) and sailing-school guides. See the "Zrodla" block at the bottom.
// ============================================================================

// Semantic colors come from the CSS vars so the page stays readable in the
// light theme too (the neon originals only worked on dark navy).
const GREEN = 'var(--success)';
const RED = 'var(--danger)';
const ORANGE = 'var(--cat-orange)';
const YELLOW = 'var(--warning)';
const CYAN = 'var(--accent-cyan)';
const TXT = 'var(--text-secondary)';
const TXT2 = 'var(--text-muted)';

// --------------------------------------------------------------- helpers ---

function Section({ id, num, pl, ru, children }: { id: string; num: number; pl: string; ru: string; children: ReactNode }) {
  const { lang } = useI18n();
  return (
    <section id={id} className="mb-10 scroll-mt-24">
      <h2 className="mb-1 text-xl font-bold" style={{ color: 'var(--text-primary)' }}>
        {num}. {pl}
      </h2>
      {lang === 'ru' && <div className="mb-3 text-sm" style={{ color: 'var(--text-muted)' }}>{ru}</div>}
      {children}
    </section>
  );
}

function Card({ children, title }: { children: ReactNode; title?: string }) {
  const plOnly = usePlOnly();
  return (
    <div className="mb-4 rounded-2xl p-4" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)' }}>
      {title && <div className="mb-2 text-sm font-semibold" style={{ color: 'var(--accent-cyan)' }}>{plOnly(title)}</div>}
      {children}
    </div>
  );
}

function Tip({ children }: { children: ReactNode }) {
  return (
    <div
      className="mb-4 rounded-xl px-4 py-3 text-sm leading-relaxed"
      style={{ background: 'rgba(0,212,255,0.07)', border: '1px solid rgba(0,212,255,0.25)', color: 'var(--text-secondary)' }}
    >
      {children}
    </div>
  );
}

function Warn({ children }: { children: ReactNode }) {
  return (
    <div
      className="mb-4 rounded-xl px-4 py-3 text-sm leading-relaxed"
      style={{ background: 'rgba(255,85,102,0.08)', border: '1px solid rgba(255,85,102,0.3)', color: 'var(--text-secondary)' }}
    >
      {children}
    </div>
  );
}

function Fact({ q, a, ru }: { q: string; a: string; ru: string }) {
  // RU commentary only on the Russian site version (language policy).
  const { lang } = useI18n();
  return (
    <div className="border-b py-2 last:border-b-0" style={{ borderColor: 'var(--border-subtle)' }}>
      <div className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{q}</div>
      <div className="text-sm" style={{ color: 'var(--success)' }}>✓ {a}</div>
      {lang === 'ru' && <div className="text-xs" style={{ color: 'var(--text-muted)' }}>{ru}</div>}
    </div>
  );
}

function Table({ head, rows }: { head: string[]; rows: ReactNode[][] }) {
  // Language policy: drop Russian-headed columns + strip "PL / RU" tails in
  // string cells on non-RU site versions.
  const { lang } = useI18n();
  const plOnly = usePlOnly();
  const keep = head.map((h) => (lang === 'ru' ? true : !CYRILLIC_RE.test(h)));
  const fHead = head.filter((_, i) => keep[i]);
  const fRows = rows.map((r) => r.filter((_, i) => keep[i]).map((c) => (typeof c === 'string' ? plOnly(c) : c)));
  return (
    <div className="mb-4 overflow-x-auto rounded-xl" style={{ border: '1px solid var(--border-subtle)' }}>
      <table className="w-full text-sm">
        <thead>
          <tr style={{ background: 'var(--bg-secondary)' }}>
            {fHead.map((h) => (
              <th key={h} className="px-3 py-2 text-left font-semibold" style={{ color: 'var(--accent-cyan)' }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {fRows.map((r, i) => (
            <tr key={i} style={{ background: i % 2 ? 'var(--bg-secondary)' : 'transparent' }}>
              {r.map((c, j) => (
                <td key={j} className="px-3 py-2 align-top" style={{ color: j === 0 ? 'var(--text-primary)' : 'var(--text-secondary)' }}>{c}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function DiagramCaption({ children }: { children: ReactNode }) {
  const plOnly = usePlOnly();
  const content = typeof children === 'string' ? plOnly(children) : children;
  return <div className="mt-1 text-center text-xs" style={{ color: 'var(--text-muted)' }}>{content}</div>;
}

// --------------------------------------------------------------- diagrams ---

/** Priority pyramid of radio calls: distress > urgency > safety > routine.
 *  Labels honor the language policy: RU halves only on the RU site version. */
function PriorityPyramidDiagram() {
  const { lang } = useI18n();
  const ruOn = lang === 'ru';
  const tiers = [
    { w: 120, fill: RED, top: 'MAYDAY', sub: ruOn ? 'niebezpieczenstwo / бедствие' : 'niebezpieczenstwo' },
    { w: 180, fill: ORANGE, top: 'PAN-PAN', sub: ruOn ? 'pilnosc / срочность' : 'pilnosc' },
    { w: 240, fill: CYAN, top: 'SECURITE', sub: ruOn ? 'bezpieczenstwo / безопасность' : 'bezpieczenstwo' },
    { w: 300, fill: 'var(--border-subtle)', top: 'Routine', sub: ruOn ? 'zwykla lacznosc / обычная связь' : 'zwykla lacznosc' },
  ];
  const cx = 170;
  let y = 26;
  return (
    <svg viewBox="0 0 340 210" className="h-auto w-full">
      <text x={cx} y="14" textAnchor="middle" fontSize="10" fontWeight="700" fill={CYAN}>{ruOn ? 'Priorytet wywolan / приоритет вызовов' : 'Priorytet wywolan'}</text>
      {tiers.map((t, i) => {
        const wTop = i === 0 ? t.w : tiers[i - 1].w;
        const h = 40;
        const x0t = cx - wTop / 2;
        const x1t = cx + wTop / 2;
        const x0b = cx - t.w / 2;
        const x1b = cx + t.w / 2;
        const yy = y;
        y += h + 2;
        const dark = t.fill === CYAN || t.fill === 'var(--border-subtle)';
        return (
          <g key={t.top}>
            <polygon points={`${x0t},${yy} ${x1t},${yy} ${x1b},${yy + h} ${x0b},${yy + h}`} fill={t.fill} opacity={i === 3 ? 0.4 : 0.85} stroke="rgba(0,0,0,0.25)" strokeWidth="0.6" />
            <text x={cx} y={yy + h / 2 - 1} textAnchor="middle" fontSize="11" fontWeight="700" fill={dark ? 'var(--text-primary)' : '#08222b'}>{t.top}</text>
            <text x={cx} y={yy + h / 2 + 11} textAnchor="middle" fontSize="7.5" fill={dark ? TXT2 : 'rgba(8,34,43,0.8)'}>{t.sub}</text>
          </g>
        );
      })}
      <text x={cx} y="206" textAnchor="middle" fontSize="7.5" fill={TXT2}>{lang === 'ru' ? 'wyzej = wazniejsze, ma pierwszenstwo na kanale / выше = важнее' : 'wyzej = wazniejsze, ma pierwszenstwo na kanale'}</text>
    </svg>
  );
}

/** DSC distress sequence: red button -> Ch70 digital alert -> Ch16 voice MAYDAY.
 *  Hold time = 3 s per the ICOM IC-M330 manual and ITU-R M.493. */
function DscDistressDiagram() {
  const { lang } = useI18n();
  const ruOn = lang === 'ru';
  const steps = [
    { t: 'Czerwony przycisk', s: '3 s pod oslona', ru: 'красная кнопка, 3 сек', fill: RED },
    { t: 'Kanal 70 (DSC)', s: 'MMSI + pozycja GPS', ru: 'цифровой алерт: MMSI + координаты', fill: CYAN },
    { t: 'Kanal 16 (glos)', s: 'nadaj MAYDAY', ru: 'голосом MAYDAY на 16', fill: GREEN },
  ];
  return (
    <svg viewBox="0 0 340 172" className="h-auto w-full">
      <defs>
        <marker id="dsc-arr" markerWidth="7" markerHeight="7" refX="5.5" refY="3.5" orient="auto">
          <polygon points="0,0 7,3.5 0,7" fill={TXT2} />
        </marker>
      </defs>
      <text x="170" y="14" textAnchor="middle" fontSize="10" fontWeight="700" fill={CYAN}>{ruOn ? 'Alarm DSC krok po kroku / сигнал бедствия DSC' : 'Alarm DSC krok po kroku'}</text>
      {steps.map((st, i) => {
        const x = 12 + i * 112;
        return (
          <g key={st.t}>
            <rect x={x} y="28" width="98" height="82" rx="8" fill="var(--bg-secondary)" stroke={st.fill} strokeWidth="1.4" />
            <circle cx={x + 49} cy="45" r="10" fill={st.fill} opacity="0.92" />
            <text x={x + 49} y="49" textAnchor="middle" fontSize="11" fontWeight="700" fill="#06202a">{i + 1}</text>
            <text x={x + 49} y="70" textAnchor="middle" fontSize="8.5" fontWeight="700" fill="var(--text-primary)">{st.t}</text>
            <text x={x + 49} y="83" textAnchor="middle" fontSize="7.5" fill={TXT}>{st.s}</text>
            {ruOn && (
              <foreignObject x={x + 4} y="87" width="90" height="22">
                <div style={{ fontSize: 7.5, lineHeight: 1.15, color: 'var(--text-muted)', textAlign: 'center' }}>{st.ru}</div>
              </foreignObject>
            )}
            {i < steps.length - 1 && (
              <line x1={x + 100} y1="69" x2={x + 112} y2="69" stroke={TXT2} strokeWidth="1.4" markerEnd="url(#dsc-arr)" />
            )}
          </g>
        );
      })}
      <text x="170" y="134" textAnchor="middle" fontSize="8" fill={TXT2}>{ruOn ? 'potem: sluchaj ACK, nie wylaczaj radia / слушай подтверждение, не выключай' : 'potem: sluchaj ACK, nie wylaczaj radia'}</text>
      <text x="170" y="148" textAnchor="middle" fontSize="8" fill={TXT2}>{ruOn ? 'MMSI = 9-cyfrowy numer statku w radiu / номер судна в рации' : 'MMSI = 9-cyfrowy numer statku w radiu'}</text>
    </svg>
  );
}

// ------------------------------------------------------------------ data ---

// PHONETIC / PROWORDS live in cheatData so this page and the printable sheet
// (/radio/sciaga) can never drift apart.

// --------------------------------------------------------------- page ---

export default function SternikRadioPage() {
  const { tp, lang } = useI18n();

  return (
    <main id="sternik-radio">
      <h1 className="mb-1 text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>
        📻 {tp('Рация и сертификат SRC', 'Radio and the SRC certificate', 'Radio i swiadectwo SRC')}
      </h1>
      <p className="mb-5 text-sm" style={{ color: 'var(--text-secondary)' }}>
        {tp(
          'Всё про морскую УКВ-рацию (VHF) и польский сертификат оператора SRC: зачем он нужен, как сдать экзамен в UKE, каналы, аварийные вызовы и фонетика. Термины по-польски (как в тесте) + пояснения по-русски.',
          'Everything about the marine VHF radio and the Polish SRC operator certificate: why you need it, how to pass the UKE exam, channels, distress calls and phonetics.',
          'Wszystko o radiu VHF i swiadectwie operatora SRC: po co, jak zdac egzamin w UKE, kanaly, wywolania alarmowe i alfabet fonetyczny.',
        )}
      </p>

      {/* What you keep getting wrong, across every trainer. Only appears once
          there is actually a pattern. */}
      <WeakSpotsPanel />

      <Warn>
        {tp(
          'Держать и пользоваться морской рацией без сертификата оператора - нельзя. Для яхтсмена стандартный документ - SRC (ближний радиус, VHF + DSC). Ниже - как его получить и как работать в эфире.',
          'You may not operate a marine radio without an operator certificate. For a yachtsman the standard one is the SRC (short range, VHF + DSC). Below: how to get it and how to work on air.',
          'Uzywanie radia morskiego bez swiadectwa operatora jest niedozwolone. Dla zeglarza standardem jest SRC (bliski zasieg, VHF + DSC).',
        )}
      </Warn>

      {/* Simulator CTA */}
      <Link
        href="/radio/symulator"
        className="mb-6 flex items-center gap-4 rounded-2xl p-4 transition hover:-translate-y-0.5"
        style={{ background: 'linear-gradient(140deg, var(--bg-card), rgba(0,212,255,0.12))', border: '1px solid var(--border-subtle)' }}
      >
        <div className="text-3xl">🎙️</div>
        <div className="flex-1">
          <div className="font-semibold" style={{ color: 'var(--text-primary)' }}>
            {tp('Симулятор рации (ICOM)', 'Radio simulator (ICOM)', 'Symulator radia (ICOM)')}
          </div>
          <p className="mt-0.5 text-sm" style={{ color: 'var(--text-secondary)' }}>
            {tp(
              'Отработай сигнал бедствия DSC и MAYDAY на интерактивной модели, как на практике UKE.',
              'Practise the DSC distress and MAYDAY on an interactive set, like the UKE practical.',
              'Przecwicz alarm DSC i MAYDAY na interaktywnym radiu, jak na praktyce UKE.',
            )}
          </p>
        </div>
        <div className="text-sm font-medium" style={{ color: 'var(--accent-cyan)' }}>{tp('Открыть', 'Open', 'Otworz')} {'->'}</div>
      </Link>

      {/* Guide CTA */}
      <Link
        href="/radio/obsluga"
        className="mb-6 flex items-center gap-4 rounded-2xl p-4 transition hover:-translate-y-0.5"
        style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)' }}
      >
        <div className="text-3xl">🛠️</div>
        <div className="flex-1">
          <div className="font-semibold" style={{ color: 'var(--text-primary)' }}>
            {tp('Путеводитель по рации', 'Radio guide', 'Poradnik radia')}
          </div>
          <p className="mt-0.5 text-sm" style={{ color: 'var(--text-secondary)' }}>
            {tp(
              'Что делает каждая кнопка и зачем, как выйти в эфир, как обслуживать рацию. Плюс проверка микрофона для голосового режима.',
              'What each control does and why, how to get on air, how to maintain the radio. Plus a microphone check for voice mode.',
              'Co robi kazdy przycisk i po co, jak nadawac, jak konserwowac radio. Plus sprawdzenie mikrofonu do trybu glosowego.',
            )}
          </p>
        </div>
        <div className="text-sm font-medium" style={{ color: 'var(--accent-cyan)' }}>{tp('Открыть', 'Open', 'Otworz')} {'->'}</div>
      </Link>

      {/* TOC */}
      <nav className="mb-8 grid gap-1 rounded-2xl p-4 sm:grid-cols-2" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)' }}>
        {[
          ['co', '1. Po co i jaki certyfikat', 'Зачем и какой сертификат'],
          ['egzamin', '2. Egzamin SRC w UKE', 'Экзамен SRC в UKE'],
          ['kanaly', '3. Kanaly i podstawy VHF', 'Каналы и основы VHF'],
          ['alarm', '4. Wywolania alarmowe', 'Аварийные вызовы'],
          ['alfabet', '5. Alfabet fonetyczny i prowords', 'Фонетика и служебные слова'],
          ['sciaga', '6. Sciaga', 'Шпаргалка'],
          ['zrodla', '7. Zrodla i linki', 'Источники и ссылки'],
        ].map(([id, pl, ru]) => (
          <a key={id} href={`#${id}`} className="flex min-h-[40px] items-center rounded-lg px-2 py-1 text-sm transition hover:opacity-80" style={{ color: 'var(--text-secondary)' }}>
            <span style={{ color: 'var(--accent-cyan)' }}>{pl}</span>
            {lang === 'ru' && <span className="text-xs" style={{ color: 'var(--text-muted)' }}>&nbsp;· {ru}</span>}
          </a>
        ))}
      </nav>

      {/* 1. WHY / WHICH ------------------------------------------------------ */}
      <Section id="co" num={1} pl="Po co i jaki certyfikat" ru="Зачем нужен и какой выбрать">
        <Card title="Co daje SRC / Что даёт SRC">
          <Fact q="Swiadectwo operatora lacznosci bliskiego zasiegu (SRC)" a="obsluga radia VHF + DSC w systemie GMDSS na akwenie A1" ru="Право работать на морской УКВ-рации с DSC (цифровой вызов) в системе GMDSS на прибрежной акватории A1." />
          <Fact q="Akwen A1" a="wody, gdzie stacja brzegowa prowadzi ciagly nasluch VHF/DSC" ru="Прибрежные воды, где хотя бы одна береговая станция ведёт непрерывное слушание на VHF/DSC (обычно до ~20-30 миль от берега)." />
          <Fact q="Wazny bezterminowo" a="raz zdany - na cale zycie, bez odnawiania" ru="Сертификат бессрочный: сдал один раз - навсегда." />
          <Fact q="Uznawany za granica" a="miedzynarodowy, przyda sie na czarterze" ru="Международный документ, нужен при аренде яхты за рубежом." />
        </Card>

        <Tip>
          {tp(
            'Рация и патент - разные документы. Патент sternik motorowodny даёт право управлять лодкой, а SRC - право выходить в радиоэфир. На чартер за границей часто требуют оба.',
            'The radio certificate and the helm licence are separate. The sternik patent lets you drive the boat; the SRC lets you transmit. Charters abroad often ask for both.',
            'Patent i swiadectwo radiowe to dwa osobne dokumenty. Patent pozwala prowadzic lodz, SRC - nadawac przez radio.',
          )}
        </Tip>

        <h3 className="mb-2 mt-6 text-base font-semibold" style={{ color: 'var(--text-primary)' }}>
          {tp('Какой сертификат под какие воды', 'Which certificate for which waters', 'Ktore swiadectwo na jakie wody')}
        </h3>
        <Table
          head={['Swiadectwo', 'Zakres', 'DSC', 'Akwen', 'Wiek']}
          rows={[
            [<b key="s" style={{ color: 'var(--accent-cyan)' }}>SRC</b>, 'Morski VHF, GMDSS', 'tak', 'przybrzezny A1', '15+'],
            ['VHF', 'Morski VHF, tylko glos', 'nie', 'przybrzezny', '15+'],
            ['IWC', 'VHF + UHF, zegluga srodladowa, ATIS', 'tak', 'rzeki/kanaly (PL)', '18+'],
            ['LRC', 'VHF + MF/HF + satelita', 'tak', 'oceaniczny A2-A4', '18+'],
          ]}
        />
        <DiagramCaption>
          {tp(
            'Тип свидетельства зависит НЕ от рации на борту, а от акватории плавания. Для большинства яхтсменов - SRC.',
            'The certificate type depends on the sailing area, not on the radio hardware. For most sailors it is SRC.',
            'Rodzaj swiadectwa zalezy od akwenu, nie od sprzetu. Dla wiekszosci - SRC.',
          )}
        </DiagramCaption>
      </Section>

      {/* 2. EXAM ------------------------------------------------------------- */}
      <Section id="egzamin" num={2} pl="Egzamin SRC w UKE" ru="Экзамен SRC в UKE">
        <Card title="Fakty / Факты">
          <Fact q="Kto egzaminuje i wydaje" a="Urzad Komunikacji Elektronicznej (UKE)" ru="Экзамен и выдачу проводит UKE (Urzad Komunikacji Elektronicznej)." />
          <Fact q="Wiek" a="ukonczone 15 lat" ru="Допуск с 15 лет." />
          <Fact q="Czy kurs jest obowiazkowy" a="nie - mozna zdawac eksternistycznie" ru="Курс НЕ обязателен, можно сдавать экстерном. Но курс помогает с практикой на симуляторе." />
          <Fact q="Koszt" a="150 zl egzamin + 25 zl swiadectwo = 175 zl (jeden przelew, PRZED zapisem)" ru="150 zl за экзамен + 25 zl за свидетельство = 175 zl. Один перевод на счёт UKE, оплата ДО записи. Пересдача 150 zl." />
          <Fact q="Waznosc" a="bezterminowo" ru="Бессрочно." />
          <Fact q="Jezyk egzaminu" a="tylko polski (obwieszczenie z 18.12.2025)" ru="Экзамен ТОЛЬКО на польском. Английский нужен пассивно: термины IMO SMCP в тесте и англоязычное меню рации." />
          <Fact q="Baza pytan" a="jawna: oficjalny PDF UKE - 324 pytania A/B/C + 26 zadan praktycznych" ru="База открытая: 174 вопроса (регуляминя + англ. термины) + 150 (GMDSS) + 26 практических заданий. Ключа ответов в PDF нет." />
          <Fact q="Poprawka" a="1 raz w ciagu 12 miesiecy, tylko niezdane dzialy (150 zl)" ru="Если сдал хотя бы один предмет - одна пересдача в течение 12 месяцев, только по несданным предметам." />
        </Card>

        <h3 className="mb-2 mt-6 text-base font-semibold" style={{ color: 'var(--text-primary)' }}>
          {tp('Структура экзамена', 'Exam structure', 'Struktura egzaminu')}
        </h3>
        <Table
          head={['Czesc', 'Format', 'Prog zaliczenia']}
          rows={[
            ['Teoria', '15 pytan A/B/C (3 dzialy x 5, test papierowy)', 'min. 60% w KAZDYM dziale (3/5)'],
            ['Praktyka', 'zadania na radiu ICOM (relacje zdajacych: 4-5 zadan), 0-5 pkt za zadanie', 'min. 60% punktow'],
          ]}
        />
        <Tip>
          {tp(
            'Практику сдают на реальной рации (обычно ICOM IC-M323/M330) и муляжах аварийных устройств. Задания: подать DSC-вызов бедствия, голосовой MAYDAY, PAN-PAN, рутинный вызов и т.п. Провалил один блок теории (меньше 3/5) - весь экзамен не сдан.',
            'The practical is on a real radio (usually ICOM IC-M323/M330) and dummy alarm units. Tasks: send a DSC distress, voice MAYDAY, PAN-PAN, a routine call, etc. Fail one theory module (under 3/5) and the whole exam fails.',
            'Praktyka na prawdziwym radiu (zwykle ICOM IC-M323/M330). Zadania: alarm DSC, MAYDAY glosem, PAN-PAN, wywolanie zwykle. Jeden dzial ponizej 3/5 = caly egzamin niezdany.',
          )}
        </Tip>

        <Card title="Jak sie zapisac / Как записаться">
          <ol className="list-decimal space-y-1 pl-5 text-sm" style={{ color: 'var(--text-secondary)' }}>
            <li>{tp('Оплати 150 zl (экзамен) + 25 zl (свидетельство) ОДНИМ переводом на счёт UKE - оплата нужна ДО записи. Бумажных заявлений UKE не принимает.', 'Pay 150 zl exam + 25 zl certificate in ONE transfer to the UKE account - payment comes BEFORE registration. No paper applications.', 'Zaplac 150 zl egzamin + 25 zl swiadectwo JEDNYM przelewem na konto UKE - oplata PRZED zapisem. Papierowych wnioskow UKE nie przyjmuje.')}</li>
            <li>{tp('Зарегистрируйся на портале egzaminy.uke.gov.pl (запись на SRC только онлайн).', 'Register at egzaminy.uke.gov.pl (SRC sign-up is online only).', 'Zarejestruj sie na egzaminy.uke.gov.pl (zapis na SRC tylko online).')}</li>
            <li>{tp('Выбери сессию и город - минимум за 14 дней. Если сессии не видно, лимит мест исчерпан. Подтверждение квалификации приходит на почту обычно за несколько рабочих дней.', 'Pick a session and city at least 14 days ahead. If a session is not listed, seats are full. The qualification email usually arrives within a few working days.', 'Wybierz sesje i miasto - min. 14 dni wczesniej. Jesli sesji nie widac, limit miejsc wyczerpany. E-mail kwalifikacyjny zwykle w ciagu kilku dni roboczych.')}</li>
            <li>{tp('Приди с документом (dowod/паспорт), сдай теорию и практику - результат узнаёшь сразу.', 'Bring an ID, pass theory + practical - you learn the result the same day.', 'Przyjdz z dokumentem tozsamosci, zdaj teorie i praktyke - wynik znasz od razu.')}</li>
          </ol>
        </Card>

        <h3 className="mb-2 mt-6 text-base font-semibold" style={{ color: 'var(--text-primary)' }}>
          {tp('Где сдают (harmonogram 2026: 205 сессий, 13 городов)', 'Where you can take it (2026: 205 sessions, 13 cities)', 'Gdzie zdawac (harmonogram 2026: 205 sesji, 13 miast)')}
        </h3>
        <Card>
          <p className="text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
            Warszawa (UKE, ul. Gieldowa 7/9) · Gdynia (4 miejsca, m.in. Delegatura UKE i Uniwersytet Morski) · Szczecin (3 miejsca) ·
            Kolobrzeg · Wroclaw · Krakow · Poznan · Rzeszow · Siemianowice Slaskie · Bydgoszcz · Lublin · Olsztyn · Opole
          </p>
          <div className="mt-2 text-xs" style={{ color: 'var(--text-muted)' }}>
            {tp(
              'Чаще всего сессии в Гдыне и Щецине (морские города). Актуальные даты и адреса - на egzaminy.uke.gov.pl.',
              'Gdynia and Szczecin host sessions most often. Current dates and addresses: egzaminy.uke.gov.pl.',
              'Najczesciej sesje w Gdyni i Szczecinie. Aktualne terminy i adresy: egzaminy.uke.gov.pl.',
            )}
          </div>
        </Card>

        <Card title="Jak wyglada dzien egzaminu / Как выглядит день экзамена">
          <ul className="space-y-1 pl-4 text-sm" style={{ color: 'var(--text-secondary)', listStyle: 'disc' }}>
            <li>{tp('Комиссия проверяет документ, выдаёт личную karta egzaminacyjna.', 'The committee checks your ID and hands you a personal exam card.', 'Komisja sprawdza dokument i wydaje karte egzaminacyjna.')}</li>
            <li>{tp('Теория: бумажный тест, 15 вопросов A/B/C (3 предмета по 5). Порог - 60% в каждом предмете.', 'Theory: paper test, 15 A/B/C questions (3 subjects x 5). Pass: 60% in each subject.', 'Teoria: test papierowy, 15 pytan A/B/C (3 dzialy po 5). Prog - 60% w kazdym dziale.')}</li>
            <li>{tp('Практика: реальная рация ICOM (IC-M323/IC-M330GE) + муляжи EPIRB/SART. Тянешь карточку заданий: вызов DSC, MAYDAY голосом, обычный вызов и т.п.', 'Practical: a real ICOM radio (IC-M323/IC-M330GE) + EPIRB/SART dummies. You draw a task card: DSC call, voice MAYDAY, routine call etc.', 'Praktyka: prawdziwe radio ICOM (IC-M323/IC-M330GE) + atrapy EPIRB/SART. Losujesz karte zadan: wywolanie DSC, MAYDAY glosem, wywolanie zwykle itp.')}</li>
            <li>{tp('Оценки вписывают в карту сразу, ты подтверждаешь подписью. Всё занимает обычно 1-2 часа.', 'Grades go into the card immediately, you sign them. The whole thing usually takes 1-2 hours.', 'Oceny wpisywane od razu do karty, potwierdzasz podpisem. Calosc zwykle 1-2 godziny.')}</li>
            <li>{tp('Свидетельство приходит почтой (обычно 1-4 недели; официального срока нет - зависит от делегатуры).', 'The certificate arrives by post (usually 1-4 weeks; no official deadline - depends on the office).', 'Swiadectwo przychodzi poczta (zwykle 1-4 tygodnie; oficjalnego terminu brak).')}</li>
          </ul>
        </Card>

        <Card title="Oficjalna baza pytan / Официальная база вопросов">
          <p className="text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
            {tp(
              'UKE публикует официальные материалы теста SRC (PDF): 174 вопроса «регуляминя и англ. терминология» + 150 «GMDSS на акватории A1» + 26 практических заданий. Ключа ответов нет - готовься по темам.',
              'UKE publishes the official SRC test materials (PDF): 174 questions on regulations + English terms, 150 on GMDSS in sea area A1, and 26 practical tasks. No answer key - study by topic.',
              'UKE publikuje oficjalne materialy do testu SRC (PDF): 174 pytania "regulaminy i terminy anglojezyczne" + 150 "GMDSS na obszarze A1" + 26 zadan praktycznych. Klucza odpowiedzi brak.',
            )}
          </p>
          <a
            href="https://bip.uke.gov.pl/download/gfx/bip/pl/defaultaktualnosci/130/4/15/materialy_do_testu_src.pdf"
            target="_blank" rel="noopener noreferrer"
            className="mt-2 inline-block text-sm underline" style={{ color: 'var(--accent-cyan)' }}
          >
            materialy_do_testu_src.pdf (BIP UKE)
          </a>
        </Card>
      </Section>

      {/* 3. CHANNELS -------------------------------------------------------- */}
      <Section id="kanaly" num={3} pl="Kanaly i podstawy VHF" ru="Каналы и основы VHF">
        <Card>
          <PriorityPyramidDiagram />
          <DiagramCaption>MAYDAY {'>'} PAN-PAN {'>'} SECURITE {'>'} zwykla lacznosc</DiagramCaption>
        </Card>

        <Table
          head={['Kanal', 'Do czego', 'По-русски']}
          rows={[
            ['16 (156,800 MHz)', 'wywolawczy + alarmowy, ciagly nasluch', 'вызывной и аварийный, постоянное слушание'],
            ['70', 'DSC - cyfrowe wywolanie (nie glos!)', 'DSC - цифровые вызовы, голосом тут не говорят'],
            ['06, 08, 72, 77', 'robocze statek-statek', 'рабочие судно-судно'],
            ['10 / 12 / 14', 'porty i mariny PL (Gdynia 12, Gdansk 14, Hel 10)', 'порты и марины Польши - канал зависит от порта'],
          ]}
        />
        <Card title="Zasady / Основы">
          <Fact q="Moc nadawania" a="25 W (duza) lub 1 W (mala)" ru="Мощность 25 Вт или 1 Вт. В порту и на близкой дистанции - 1 Вт, чтобы не забивать эфир." />
          <Fact q="Simplex / duplex" a="simplex - jedna czestotliwosc, na zmiane; duplex - dwie" ru="Симплекс - одна частота, говорят по очереди (OVER); дуплекс - две (как телефон)." />
          <Fact q="Kanal 16" a="nie zajmuj rozmowa - to kanal wywolawczy/alarmowy" ru="Канал 16 не занимать болтовнёй: вызвал - и уходи на рабочий канал." />
          <Fact q="Kolejnosc" a="nadaje ten, kto sie zglosil; sluchaj zanim nadasz" ru="Сначала слушай (не занят ли канал), потом нажимай передачу." />
        </Card>
      </Section>

      {/* 4. DISTRESS -------------------------------------------------------- */}
      <Section id="alarm" num={4} pl="Wywolania alarmowe" ru="Аварийные вызовы">
        <Card>
          <DscDistressDiagram />
          <DiagramCaption>DSC: przycisk -{'>'} kanal 70 (MMSI + pozycja) -{'>'} glos MAYDAY na 16</DiagramCaption>
        </Card>

        <Card title="MAYDAY - niebezpieczenstwo / бедствие">
          <p className="mb-2 text-sm" style={{ color: 'var(--text-secondary)' }}>
            {tp('Прямая угроза жизни или судну (тонем, пожар, человек тонет). Схема голосового вызова на канале 16:', 'Grave and imminent danger to life or vessel. Voice call on channel 16:', 'Bezposrednie zagrozenie zycia lub jednostki. Wywolanie glosem na kanale 16:')}
          </p>
          <pre className="overflow-x-auto rounded-xl p-3 text-xs leading-relaxed" style={{ background: 'var(--bg-secondary)', color: 'var(--text-primary)', border: '1px solid var(--border-subtle)' }}>
{`MAYDAY  MAYDAY  MAYDAY
THIS IS  <nazwa x3>  <znak wywolawczy / MMSI>
MAYDAY  <nazwa>
POSITION  <wspolrzedne lub namiar + odleglosc>
<rodzaj niebezpieczenstwa>
<potrzebna pomoc>
<liczba osob na pokladzie, inne info>
OVER`}
          </pre>
          <div className="mt-2 text-xs" style={{ color: 'var(--text-muted)' }}>
            {tp('MAYDAY - 3 раза. Позиция - координаты или пеленг+расстояние до ориентира. В конце OVER (жду ответа).', 'MAYDAY three times. Position as coordinates or bearing + distance. End with OVER.', 'MAYDAY x3. Pozycja: wspolrzedne albo namiar + odleglosc. Na koncu OVER.')}
          </div>
        </Card>

        <Card title="PAN-PAN - pilnosc / срочность">
          <Fact q="Kiedy" a="PAN-PAN x3: pilne, ale bez bezposredniego zagrozenia zycia" ru="Срочно, но прямой угрозы жизни пока нет: человек за бортом, серьёзная поломка, нужна медконсультация." />
          <div className="mt-1 text-xs" style={{ color: 'var(--text-muted)' }}>PAN-PAN, PAN-PAN, PAN-PAN · ALL STATIONS (x3) · THIS IS &lt;nazwa&gt; · &lt;pozycja, sytuacja, prosba&gt; · OVER</div>
        </Card>

        <Card title="SECURITE - bezpieczenstwo / безопасность">
          <Fact q="Kiedy" a="SECURITE x3: ostrzezenie nawigacyjne lub meteo" ru="Предупреждение по безопасности плавания или погоде (препятствие, шторм). Часто передают береговые станции." />
          <div className="mt-1 text-xs" style={{ color: 'var(--text-muted)' }}>{tp('Объявляют на 16, само сообщение - на рабочем канале.', 'Announced on 16, the message goes to a working channel.', 'Zapowiedz na 16, tresc na kanale roboczym.')}</div>
        </Card>

        <Warn>
          {tp(
            'Ложный сигнал бедствия (случайно нажал DSC) - немедленно отмени голосом на 16: «ALL STATIONS, THIS IS <название>, CANCEL MY DISTRESS ALERT OF [дата, время UTC]». Не выключай рацию и жди.',
            'A false DSC alert must be cancelled at once by voice on 16: "ALL STATIONS, THIS IS <name>, CANCEL MY DISTRESS ALERT OF [date, time UTC]". Do not switch off.',
            'Falszywy alarm DSC natychmiast odwolaj glosem na 16: "ALL STATIONS, THIS IS <nazwa>, CANCEL MY DISTRESS ALERT OF [data, czas UTC]".',
          )}
        </Warn>
      </Section>

      {/* 5. PHONETIC -------------------------------------------------------- */}
      <Section id="alfabet" num={5} pl="Alfabet fonetyczny i prowords" ru="Фонетический алфавит и служебные слова">
        <Card title="Alfabet fonetyczny ICAO / NATO">
          <div className="grid grid-cols-3 gap-x-4 gap-y-1 text-sm sm:grid-cols-4" style={{ color: 'var(--text-secondary)' }}>
            {PHONETIC.map(([l, w]) => (
              <div key={l}>
                <span className="font-bold" style={{ color: 'var(--accent-cyan)' }}>{l}</span> {w}
              </div>
            ))}
          </div>
          <div className="mt-3 text-xs" style={{ color: 'var(--text-muted)' }}>
            {tp('Цифры произносят по одной: «one, two, three...». Десятичную точку - «decimal». Позывной и MMSI всегда диктуют по буквам/цифрам.', 'Numbers spoken digit by digit; decimal point as "decimal". Spell call signs and MMSI.', 'Cyfry pojedynczo; przecinek "decimal". Znak wywolawczy i MMSI literuj.')}
          </div>
        </Card>

        <Table
          head={['Proword', 'Znaczenie', 'По-русски']}
          rows={PROWORDS.map((p) => [...p])}
        />
        <Tip>
          {tp(
            'Проверка связи: «<станция>, THIS IS <моё название>, RADIO CHECK, OVER». В ответ дают оценку слышимости, напр. «LOUD AND CLEAR» (громко и чётко) или по 5-балльной шкале.',
            'Radio check: "<station>, THIS IS <me>, RADIO CHECK, OVER". Reply grades readability, e.g. "LOUD AND CLEAR".',
            'Sprawdzenie: "<stacja>, THIS IS <ja>, RADIO CHECK, OVER". Odpowiedz ocenia slyszalnosc, np. "LOUD AND CLEAR".',
          )}
        </Tip>
      </Section>

      {/* 6. CHEAT SHEET ----------------------------------------------------- */}
      <Section id="sciaga" num={6} pl="Sciaga" ru="Шпаргалка на экзамен и в рейс">
        <Link
          href="/radio/sciaga"
          className="mb-3 inline-flex min-h-[44px] items-center rounded-xl px-4 text-sm font-semibold"
          style={{ background: 'var(--accent-cyan)', color: 'var(--accent-ink, #04222e)' }}
        >
          📄 {tp('Полная шпаргалка и печать', 'Full cheat sheet and print', 'Pelna sciaga i wydruk')}
        </Link>
        <div className="grid gap-3 sm:grid-cols-2">
          <Card title="Kanaly">
            <ul className="space-y-1 pl-4 text-sm" style={{ color: 'var(--text-secondary)', listStyle: 'disc' }}>
              <li>16 - wywolawczy + alarmowy (nasluch)</li>
              <li>70 - DSC, tylko cyfrowo</li>
              <li>06/08/72/77 - robocze statek-statek</li>
              <li>1 W w porcie, 25 W na otwartej wodzie</li>
            </ul>
          </Card>
          <Card title="Priorytet">
            <ul className="space-y-1 pl-4 text-sm" style={{ color: 'var(--text-secondary)', listStyle: 'disc' }}>
              <li><b style={{ color: RED }}>MAYDAY</b> - zagrozenie zycia/statku</li>
              <li><b style={{ color: ORANGE }}>PAN-PAN</b> - pilne, bez zagrozenia zycia</li>
              <li><b style={{ color: 'var(--accent-cyan)' }}>SECURITE</b> - ostrzezenie naw./meteo</li>
              <li>kazdy x3 na poczatku</li>
            </ul>
          </Card>
          <Card title="MAYDAY - kolejnosc">
            <ol className="space-y-1 pl-4 text-sm" style={{ color: 'var(--text-secondary)', listStyle: 'decimal' }}>
              <li>MAYDAY x3 + THIS IS + nazwa/MMSI</li>
              <li>POSITION (wspolrzedne/namiar)</li>
              <li>rodzaj niebezpieczenstwa</li>
              <li>potrzebna pomoc + liczba osob</li>
              <li>OVER</li>
            </ol>
          </Card>
          <Card title="Egzamin">
            <ul className="space-y-1 pl-4 text-sm" style={{ color: 'var(--text-secondary)', listStyle: 'disc' }}>
              <li>UKE, 15+, bezterminowo, 175 zl</li>
              <li>teoria 15 pyt. (min. 3/5 w kazdym dziale)</li>
              <li>praktyka na radiu ICOM: min. 60% pkt</li>
              <li>zapis min. 14 dni przed sesja, oplata przed zapisem</li>
            </ul>
          </Card>
        </div>
      </Section>

      {/* 7. SOURCES --------------------------------------------------------- */}
      <Section id="zrodla" num={7} pl="Zrodla i linki" ru="Официальные источники">
        <Card>
          <ul className="space-y-2 text-sm" style={{ color: 'var(--text-secondary)' }}>
            <li>
              <a href="https://egzaminy.uke.gov.pl/pl" target="_blank" rel="noopener noreferrer" className="underline" style={{ color: 'var(--accent-cyan)' }}>egzaminy.uke.gov.pl</a>
              {' - '}{tp('запись на экзамен, сессии, база вопросов.', 'exam sign-up, sessions, question base.', 'zapisy, sesje, baza pytan.')}
            </li>
            <li>
              <a href="https://bip.uke.gov.pl/swiadectwa-operatora-urzadzen-radiowych-tresci/swiadectwa-morskie-i-zeglugi-srodladowej,1,36.html" target="_blank" rel="noopener noreferrer" className="underline" style={{ color: 'var(--accent-cyan)' }}>BIP UKE - swiadectwa</a>
              {' - '}{tp('официальный список сертификатов (SRC/VHF/IWC/LRC) и оплат.', 'official certificate list and fees.', 'oficjalna lista swiadectw i oplat.')}
            </li>
            <li>
              <a href="https://biznes.gov.pl/pl/opisy-procedur/-/proc/506" target="_blank" rel="noopener noreferrer" className="underline" style={{ color: 'var(--accent-cyan)' }}>biznes.gov.pl</a>
              {' - '}{tp('разрешение на судовую радиостанцию (MMSI/позывной для рации на борту).', 'ship station radio permit (MMSI/call sign).', 'pozwolenie radiowe - stacja statkowa (MMSI).')}
            </li>
          </ul>
          <div className="mt-3 text-xs" style={{ color: 'var(--text-muted)' }}>
            {tp(
              'Данные сверены в июле 2026. Цены и правила экзамена UKE могут меняться - перед записью проверь на egzaminy.uke.gov.pl.',
              'Verified July 2026. UKE fees and rules may change - check egzaminy.uke.gov.pl before signing up.',
              'Zweryfikowano lipiec 2026. Oplaty i zasady moga sie zmieniac - sprawdz na egzaminy.uke.gov.pl.',
            )}
          </div>
        </Card>

        <div className="mt-4 flex flex-wrap gap-2">
          <Link href="/sternik/teoria" className="flex min-h-[44px] items-center rounded-xl px-4 text-sm font-medium" style={{ background: 'var(--bg-card)', color: 'var(--text-primary)', border: '1px solid var(--border-subtle)' }}>
            📖 {tp('К теории патента', 'To patent theory', 'Do teorii patentu')}
          </Link>
          <Link href="/sternik" className="flex min-h-[44px] items-center rounded-xl px-4 text-sm font-medium" style={{ background: 'var(--bg-card)', color: 'var(--text-primary)', border: '1px solid var(--border-subtle)' }}>
            ⚓ {tp('Обзор раздела', 'Section overview', 'Przeglad')}
          </Link>
        </div>
      </Section>
    </main>
  );
}
