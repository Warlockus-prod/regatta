'use client';

import type { ReactNode } from 'react';
import Link from 'next/link';
import { useI18n } from '@/lib/i18n';
import { CYRILLIC_RE, usePlOnly } from '../plOnly';
import {
  BridgeClearanceDiagram,
  BoatSideDiagram,
  BoatTopDiagram,
  CableFerryDiagram,
  CardinalClockDiagram,
  CrossingDiagram,
  DredgerPassDiagram,
  FuelSystemDiagram,
  HeadOnDiagram,
  LateralMarksDiagram,
  LightSectorsDiagram,
  LockDiagram,
  MobDiagram,
  NabieznikDiagram,
  OpenWaterDiagram,
  OvertakingDiagram,
  PortEntryDiagram,
  PropWalkDiagram,
  RiverBendDiagram,
  RiverDiagram,
} from './diagrams';
import {
  BreezeGallery,
  CloudPhotos,
  CloudTiers,
  CloudsGallery,
  FrontsPressureGallery,
  IalaGallery,
  InlandLightSignalsGallery,
  InlandSignsGallery,
} from './SignsWeather';
import TheorySearch from './TheorySearch';

// ============================================================================
// /sternik/teoria - the full theory konspekt: Polish exam terms + Russian
// commentary, SVG schematics, tables, mnemonics and a last-minute cheat sheet.
// Content language is PL/RU by design (see src/data/sternik.ts header).
// ============================================================================

const SECTIONS = [
  { id: 'patent', num: 1, pl: 'Patent i uprawnienia', ru: 'Патент и права' },
  { id: 'przepisy', num: 2, pl: 'Przepisy i prawo drogi', ru: 'Правила расхождения' },
  { id: 'sygnaly', num: 3, pl: 'Sygnały dźwiękowe i światła', ru: 'Сигналы и огни' },
  { id: 'znaki', num: 4, pl: 'Znaki nawigacyjne', ru: 'Навигационные знаки' },
  { id: 'nawigacja', num: 5, pl: 'Nawigacja w praktyce', ru: 'Навигация на практике' },
  { id: 'budowa', num: 6, pl: 'Budowa jachtu', ru: 'Устройство лодки' },
  { id: 'silniki', num: 7, pl: 'Silniki', ru: 'Двигатели' },
  { id: 'manewry', num: 8, pl: 'Manewrowanie i cumowanie', ru: 'Манёвры и швартовка' },
  { id: 'locja', num: 9, pl: 'Locja i nawigacja', ru: 'Лоция' },
  { id: 'meteo', num: 10, pl: 'Meteorologia', ru: 'Метеорология' },
  { id: 'ratownictwo', num: 11, pl: 'Ratownictwo', ru: 'Спасание и первая помощь' },
  { id: 'srodowisko', num: 12, pl: 'Ochrona środowiska', ru: 'Экология' },
  { id: 'praktyka', num: 13, pl: 'Część praktyczna + węzły', ru: 'Практика и узлы' },
  { id: 'sciaga', num: 14, pl: 'Ściąga na ostatnią chwilę', ru: 'Шпаргалка' },
];

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
      {title && (
        <div className="mb-2 text-sm font-semibold" style={{ color: 'var(--accent-cyan)' }}>{plOnly(title)}</div>
      )}
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

function Fact({ q, a, ru }: { q: string; a: string; ru: string }) {
  // Russian commentary is shown only on the Russian site version (language
  // policy: the Polish site stays fully Polish).
  const { lang } = useI18n();
  return (
    <div className="border-b py-2 last:border-b-0" style={{ borderColor: 'var(--border-subtle)' }}>
      <div className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{q}</div>
      <div className="text-sm" style={{ color: 'var(--success)' }}>✓ {a}</div>
      {lang === 'ru' && <div className="text-xs" style={{ color: 'var(--text-muted)' }}>{ru}</div>}
    </div>
  );
}

function Table({ head, rows }: { head: string[]; rows: string[][] }) {
  // Language policy: on non-RU site versions drop dictionary columns whose
  // header is Russian (e.g. "По-русски") together with their cells, and
  // strip "PL / RU" bilingual tails inside the remaining cells.
  const { lang } = useI18n();
  const plOnly = usePlOnly();
  const keep = head.map((h) => (lang === 'ru' ? true : !CYRILLIC_RE.test(h)));
  const fHead = head.filter((_, i) => keep[i]);
  const fRows = rows.map((r) => r.filter((_, i) => keep[i]).map((c) => plOnly(c)));
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
                <td key={j} className="px-3 py-2 align-top" style={{ color: j === 0 ? 'var(--text-primary)' : 'var(--text-secondary)' }}>
                  {c}
                </td>
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

export default function SternikTheoryPage() {
  const { tp, lang } = useI18n();

  return (
    <div id="sternik-theory">
      <h1 className="mb-1 text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>
        📖 {tp('Теория', 'Theory', 'Teoria')}: sternik motorowodny
      </h1>
      <p className="mb-5 text-sm" style={{ color: 'var(--text-secondary)' }}>
        {tp(
          'Конспект по всем разделам экзамена: польские термины (как в тесте) + пояснения по-русски + схемы. Прочитал раздел - закрепи его в тренажёре.',
          'Full konspekt for every exam section: Polish terms (as on the test) + Russian commentary + diagrams.',
          'Konspekt wszystkich działów egzaminu: terminy po polsku + komentarz po rosyjsku + schematy.',
        )}
      </p>

      <TheorySearch />

      {/* Last-minute quick access */}
      <div className="mb-5 flex flex-wrap gap-2">
        <a
          href="#sciaga"
          className="flex min-h-[44px] items-center rounded-xl px-4 text-sm font-semibold"
          style={{ background: 'linear-gradient(135deg, var(--accent-cyan), var(--accent-teal))', color: 'var(--accent-ink, #04222e)' }}
        >
          ⚡ {tp('Шпаргалка на завтра', 'Last-minute cheat sheet', 'Ściąga na ostatnią chwilę')}
        </a>
        <a
          href="/sternik/test"
          className="flex min-h-[44px] items-center rounded-xl px-4 text-sm font-medium"
          style={{ background: 'var(--bg-card)', color: 'var(--text-primary)', border: '1px solid var(--border-subtle)' }}
        >
          🎯 {tp('К тренажёру', 'To the trainer', 'Do treningu')}
        </a>
      </div>

      {/* TOC */}
      <nav
        className="mb-8 grid gap-1 rounded-2xl p-4 sm:grid-cols-2"
        style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)' }}
        aria-label={tp('Содержание', 'Contents', 'Spis treści')}
      >
        {SECTIONS.map((s) => (
          <a key={s.id} href={`#${s.id}`} className="flex min-h-[44px] items-center rounded-lg px-2 py-1 text-sm transition hover:opacity-80" style={{ color: 'var(--text-secondary)' }}>
            <span style={{ color: 'var(--accent-cyan)' }}>{s.num}.</span>&nbsp;{s.pl}{' '}
            {lang === 'ru' && <span className="text-xs" style={{ color: 'var(--text-muted)' }}>&nbsp;· {s.ru}</span>}
          </a>
        ))}
      </nav>

      {/* 1. PATENT ---------------------------------------------------------- */}
      <Section {...SECTIONS[0]}>
        <Table
          head={['Uprawnienie / warunek', 'Szczegół']}
          rows={[
            ['Śródlądzie', 'jachty motorowe bez ograniczenia mocy (poniżej 16 lat: do 60 kW)'],
            ['Morze', 'jachty do 12 m długości kadłuba, do 2 Mm od brzegu, w porze dziennej'],
            ['Minimalny wiek', '14 lat (poniżej 18 - pisemna zgoda opiekuna)'],
            ['Egzamin', 'test 75 pytań / 90 minut / próg 65 + część praktyczna (manewry)'],
            ['Bez patentu', 'silnik do 10 kW (13,6 KM); na śródlądziu także do 75 kW przy długości do 13 m i prędkości ograniczonej konstrukcyjnie do 15 km/h (houseboaty)'],
            ['Rejestracja jachtu (REJA24)', 'obowiązkowa: długość powyżej 7,5 m LUB moc napędu większa niż 15 kW'],
            ['Holowanie narciarza', 'osobna licencja (od 18 lat) - sam patent nie wystarcza'],
            ['Opłaty (2026)', 'egzamin 250 zł + patent 50 zł; uczniowie i studenci do 26 lat: 50% zniżki'],
          ]}
        />
        <Tip>
          {tp(
            'Патент даёт право водить моторные лодки на внутренних водах без лимита мощности (до 16 лет - до 60 кВт), на море - корпус до 12 м, до 2 миль от берега, днём. Без патента можно до 10 кВт, а также хаусботы до 75 кВт (корпус до 13 м, скорость конструктивно до 15 км/ч). Гидроцикл - только с патентом. Буксировка лыжника - отдельная лицензия.',
            'The patent lets you drive motorboats on inland waters with no power limit (under 16 - up to 60 kW); at sea - hull up to 12 m, up to 2 NM offshore, daytime. Without a patent: up to 10 kW, plus houseboats up to 75 kW (hull up to 13 m, speed limited by design to 15 km/h). Jet ski - patent only. Towing a water skier - separate licence.',
            'Patent uprawnia do prowadzenia łodzi motorowych na wodach śródlądowych bez limitu mocy (do 16 lat - do 60 kW); na morzu - kadłub do 12 m, do 2 Mm od brzegu, w dzień. Bez patentu: do 10 kW oraz houseboaty do 75 kW (kadłub do 13 m, prędkość konstrukcyjnie do 15 km/h). Skuter wodny - tylko z patentem. Holowanie narciarza - osobna licencja.',
          )}
        </Tip>
        <Card title="Na pokładzie / Что на борту и по закону">
          <Fact q="Dokumenty na pokładzie" a="patent, dokument rejestracyjny (jeśli jednostka podlega rejestracji), dowód tożsamości" ru="Держи на борту: патент, регистрационный документ (если судно подлежит регистрации) и удостоверение личности." />
          <Fact q="Obowiązkowe wyposażenie" a="kamizelka dla każdej osoby, koło/pas ratunkowy, gaśnica (silnik spalinowy), apteczka, kotwica, cumy, czerpak" ru="Спассредство на каждого, круг/пояс, огнетушитель (для ДВС), аптечка, якорь, швартовы, черпак." />
          <Fact q="Skuter wodny" a="wymaga patentu (co najmniej SM), kamizelki i linki zrywkowej (kill switch)" ru="Гидроцикл - только с патентом, в жилете и с аварийным шнуром (зрывка)." />
          <Fact q="Holowanie narciarza / obiektów" a="osobna licencja (od 18 lat), na pokładzie obserwator" ru="Буксировка лыжника или «банана» - отдельная лицензия (с 18 лет), на борту нужен наблюдатель." />
          <Fact q="Alkohol" a="0,2-0,5 promila = stan po użyciu (wykroczenie); powyżej 0,5 = nietrzeźwość (przestępstwo)" ru="0,2-0,5 промилле - «состояние после употребления» (правонарушение); свыше 0,5 - опьянение (уголовно)." />
          <Fact q="Kto kontroluje na wodzie" a="Policja, Straż Graniczna, inspektorzy żeglugi śródlądowej, w portach kapitanat" ru="Контролируют полиция, погранслужба, инспекторы внутреннего судоходства; в портах - капитанат." />
        </Card>
      </Section>

      {/* 2. PRZEPISY -------------------------------------------------------- */}
      <Section {...SECTIONS[1]}>
        <Tip>
          {tp(
            'Логика приоритета: кто маневреннее - тот уступает. Моторная лодка уступает парусным, вёсельным, рыболовным за ловом и неманевроспособным. Малые суда (до 20 м) уступают большим коммерческим. На встречных курсах моторные расходятся левыми бортами (оба отворачивают вправо). При пересечении курсов уступает тот, у кого встречный СПРАВА.',
            'Priority logic: the more manoeuvrable gives way. A motorboat gives way to sailing, rowing, fishing (engaged in fishing) and not-under-command vessels. Small craft (under 20 m) give way to large commercial ships. Head-on, power boats pass port to port (both turn right). Crossing: the one who sees the other to STARBOARD gives way.',
            'Logika pierwszeństwa: ustępuje ten, kto łatwiej manewruje. Motorówka ustępuje żaglówkom, wiosłowym, rybackim podczas połowu i jednostkom bez zdolności manewrowej. Małe statki (do 20 m) ustępują dużym handlowym. Na kursach przeciwnych motorowe mijają się lewymi burtami (oba w prawo). Przy przecinaniu kursów ustępuje ten, kto ma drugiego z PRAWEJ.',
          )}
        </Tip>
        <div className="mb-2 grid gap-3 sm:grid-cols-3">
          <Card><CrossingDiagram /></Card>
          <Card><HeadOnDiagram /></Card>
          <Card><OvertakingDiagram /></Card>
        </div>
        <DiagramCaption>Prawo drogi: czerwony ustępuje, zielony ma pierwszeństwo / красный уступает, зелёный - приоритет</DiagramCaption>
        <Card title="Najczęściej na teście / Чаще всего в тесте">
          <Fact q="Statek o napędzie mechanicznym ustępuje..." a="żaglowym, wiosłowym, rybackim w trakcie połowu, bez możliwości manewru" ru="Моторка уступает парусным, вёсельным, рыбакам за ловом, неманевроспособным." />
          <Fact q="Żagle + silnik jednocześnie = statek..." a="o napędzie mechanicznym" ru="Работает мотор - судно моторное, даже под парусами." />
          <Fact q="Wejście/wyjście z portu - pierwszeństwo ma..." a="wychodzący z portu" ru="Выходящий из порта имеет приоритет." />
          <Fact q="Na rzece pierwszeństwo ma..." a="płynący z prądem (w dół)" ru="Идущему по течению труднее тормозить - у него приоритет." />
          <Fact q="Za bezpieczeństwo odpowiada..." a="kapitan / kierownik statku" ru="Капитан, а не судовладелец." />
          <Fact q="Prom linowy..." a="przepuść, uważaj na linę pod wodą" ru="Не проходи над тросом канатного парома." />
        </Card>
      </Section>

      {/* 3. SYGNALY --------------------------------------------------------- */}
      <Section {...SECTIONS[2]}>
        <Table
          head={['Sygnał', 'Znaczenie', 'По-русски']}
          rows={[
            ['1 krótki (~1 s)', 'zmieniam kurs w PRAWO', 'поворачиваю вправо'],
            ['2 krótkie', 'zmieniam kurs w LEWO', 'поворачиваю влево'],
            ['3 krótkie', 'pracuję wstecz', 'даю задний ход'],
            ['4 krótkie', 'nie mogę manewrować', 'не могу маневрировать'],
            ['5+ krótkich (seria)', 'niebezpieczeństwo / nie rozumiem', 'опасность / не понимаю намерений'],
            ['2 długie + 1 krótki', 'wyprzedzam po twojej PRAWEJ', 'обгоняю по твоему правому борту'],
            ['2 długie + 2 krótkie', 'wyprzedzam po twojej LEWEJ', 'обгоняю по левому борту'],
            ['1 długi + 1 krótki', 'zawracam w PRAWO', 'разворачиваюсь вправо'],
            ['1 długi + 2 krótkie', 'zawracam w LEWO', 'разворачиваюсь влево'],
            ['Seria podwójnych krótkich', 'człowiek za burtą', 'человек за бортом'],
            ['Długi, powtarzany (lub dzwon)', 'wzywanie pomocy', 'сигнал бедствия'],
            ['SOS', '. . . - - - . . .', 'три коротких, три длинных, три коротких'],
          ]}
        />
        <Tip>
          {tp(
            'Длительности: короткий - около 1 с; длинный - на внутренних водах около 4 с, на море (COLREG) 4-6 с. В тестовом банке правильный вариант «4-6 sekund». Серия «опасность» на внутренних водах - минимум 6 очень коротких (по 0,25 с).',
            'Durations: short blast about 1 s; prolonged - on inland waters about 4 s, at sea (COLREG) 4-6 s. In the question bank the correct option is "4-6 sekund". The inland danger series is at least 6 very short blasts (0.25 s each).',
            'Długości: krótki - około 1 s; długi - na śródlądziu około 4 s, na morzu (COLREG) 4-6 s. W bazie pytań poprawna odpowiedź to "4-6 sekund". Seria "niebezpieczeństwo" na śródlądziu - minimum 6 bardzo krótkich (po 0,25 s).',
          )}
        </Tip>
        <Card>
          <LightSectorsDiagram />
          <DiagramCaption>Sektory świateł - widok z góry / секторы огней, вид сверху (нос вверху)</DiagramCaption>
        </Card>
        <Card title="Światła / Огни">
          <Fact q="Kiedy światła nawigacyjne włączone?" a="od zachodu do wschodu słońca + przy ograniczonej widzialności" ru="От заката до рассвета И в тумане/ливне." />
          <Fact q="Burtowe: lewe / prawe" a="czerwone 112,5 / zielone 112,5" ru="Левый борт красный, правый зелёный. «Red port wine left»." />
          <Fact q="Masztowe (topowe) / rufowe" a="białe 225 / białe 135" ru="Мачтовый 225 = 2 x 112,5 спереди; кормовой 135. Сумма 360." />
          <Fact q="Na kotwicy w nocy" a="białe światło widoczne dookoła (360)" ru="Белый круговой якорный огонь." />
          <Fact q="Mały statek do 7 m" a="może pokazywać jedno białe światło dookoła" ru="Малое судно до 7 м - один белый круговой огонь." />
        </Card>
        <Card title="Znaki dzienne (czarne kształty) / Дневные знаки">
          <Fact q="Kula (czarna)" a="statek na kotwicy / na postoju" ru="Чёрный шар - судно на якоре (днём). На носу." />
          <Fact q="Stożek wierzchołkiem w dół" a="jacht żaglowy płynący także na silniku" ru="Конус вершиной вниз - парусник, идущий ещё и под мотором (считается моторным)." />
          <Fact q="Niebieski stożek w dół / niebieskie światło" a="materiał niebezpieczny palny" ru="Синий конус вершиной вниз (ночью синий огонь) - опасный груз." />
          <Fact q="Dwie czarne kule" a="statek bez możliwości manewru" ru="Два чёрных шара - судно, лишённое возможности управляться." />
          <Fact q="Walec (cylinder) czarny" a="statek ograniczony swoim zanurzeniem (COLREG praw. 28; nocą trzy czerwone światła w pionie)" ru="Судно, стеснённое своей осадкой (МППСС пр. 28; ночью три красных огня вертикально)." />
          <Fact q="Czerwony proporzec (pionowy)" a="statek mający pierwszeństwo przejścia (śródlądzie)" ru="Красный вымпел/флаг - судно, имеющее преимущество прохода (внутренние воды)." />
        </Card>
      </Section>

      {/* 4. ZNAKI ------------------------------------------------------------ */}
      <Section {...SECTIONS[3]}>
        <Card>
          <LateralMarksDiagram />
          <DiagramCaption>Znaki boczne (IALA region A): czerwony walec po LEWEJ, zielony stożek po PRAWEJ - wchodząc od morza</DiagramCaption>
        </Card>
        <Tip>
          {tp(
            'В Европе (регион A) при входе с моря красный - СЛЕВА, зелёный - СПРАВА. В США (регион B) наоборот («Red Right Returning») - любимая ловушка теста. «Лево/право» считается по направлению знакования (с моря вверх по реке).',
            'In Europe (region A), entering from sea: red to PORT, green to STARBOARD. In the USA (region B) it is reversed ("Red Right Returning") - a favourite exam trap. Left/right follows the buoyage direction (from sea up the river).',
            'W Europie (region A) przy wejściu od morza czerwony - z LEWEJ, zielony - z PRAWEJ. W USA (region B) odwrotnie ("Red Right Returning") - ulubiona pułapka testu. "Lewa/prawa" liczy się względem kierunku oznakowania (od morza w górę rzeki).',
          )}
        </Tip>
        <Card>
          <CardinalClockDiagram />
          <DiagramCaption>{tp(
            '«Часы» кардинальных знаков: обходи со стороны названия; вспышки = час (E=3, S=6+длинная, W=9, N=непрерывно)',
            'Cardinal "clock": pass on the side of the name; flashes = clock hour (E=3, S=6+long, W=9, N=continuous)',
            '"Zegar" znaków kardynalnych: mijaj od strony nazwy; błyski = godzina (E=3, S=6+długi, W=9, N-ciągłe)',
          )}</DiagramCaption>
        </Card>
        <Table
          head={['Znak', 'Topmark', 'Światło (białe)', 'Mijaj od']}
          rows={[
            ['N (północ)', 'oba stożki w GÓRĘ', 'Q/VQ ciągłe', 'północy (12:00)'],
            ['E (wschód)', 'podstawami razem («jajko»)', 'VQ(3) / Q(3)', 'wschodu (3:00)'],
            ['S (południe)', 'oba stożki w DÓŁ', 'VQ(6)+LFl / Q(6)+LFl', 'południa (6:00)'],
            ['W (zachód)', 'wierzchołkami razem («kieliszek»)', 'VQ(9) / Q(9)', 'zachodu (9:00)'],
          ]}
        />
        <Tip>
          {tp(
            'Мнемоника: конусы «смотрят» на чёрную полосу: N - чёрный сверху (конусы вверх), S - снизу (вниз), E - сверху и снизу («яйцо»), W - в середине («бокал», W = wine). Юг получил дополнительную длинную вспышку, чтобы в тумане не спутать с W.',
            'Mnemonic: the cones "point at" the black band: N - black on top (cones up), S - bottom (down), E - top and bottom ("egg"), W - middle ("wineglass", W = wine). South got an extra long flash so it is not confused with W in fog.',
            'Mnemotechnika: stożki "patrzą" na czarny pas: N - czarny u góry (stożki w górę), S - na dole (w dół), E - u góry i u dołu ("jajko"), W - w środku ("kieliszek", W = wino). Południe ma dodatkowy długi błysk, żeby we mgle nie mylić z W.',
          )}
        </Tip>
        <Card title="Inne znaki / Другие знаки">
          <Fact q="Znak odosobnionego niebezpieczeństwa" a="czarno-czerwony, 2 czarne kule, światło Fl(2)" ru="Отдельная опасность: обходить с любой стороны на расстоянии." />
          <Fact q="Znak bezpiecznej wody (środek toru)" a="czerwono-białe pasy pionowe, czerwona kula" ru="Осевой знак: вода чиста со всех сторон." />
          <Fact q="Tablice śródlądowe" a="czerwona obwódka = zakaz/nakaz/ograniczenie; niebieska = informacja" ru="Красный кант - запрет/предписание; синие - информация." />
          <Fact q="Grupy znaków żeglugowych" a="A = zakazu, B = nakazu, C = ograniczenia, D = zalecenia, E = informacyjne" ru="Группы: A запрет, B предписание, C ограничение, D рекомендация, E информация." />
          <Fact q="Mijanie pogłębiarki / przeszkody" a="po stronie z DWOMA zielonymi światłami/rombami" ru="Земснаряд обходят со стороны двух зелёных огней/ромбов; красный/шар = сторона закрыта." />
          <Fact q="Przekreślona kotwica" a="zakaz kotwiczenia" ru="Якорь запрещён (кабели на дне)." />
          <Fact q="Znak «zakaz fali»" a="płyń tak wolno, by nie wytwarzać falowania" ru="Сбрось скорость до отсутствия волны." />
          <Fact q="Śluza - wjazd" a="tylko na zielone światło" ru="В шлюз - только на зелёный." />
        </Card>

        <h3 className="mb-2 mt-6 text-base font-semibold" style={{ color: 'var(--text-primary)' }}>
          🚦 {tp('Как выглядят знаки (IALA, регион A)', 'What the marks look like (IALA region A)', 'Jak wyglądają znaki (IALA region A)')}
        </h3>
        <IalaGallery />
        <DiagramCaption>
          {tp(
            'Боковые (красный цилиндр слева / зелёный конус справа при входе с моря), кардинальные N/E/S/W, отдельная опасность, чистая вода, специальный.',
            'Lateral (red can to port / green cone to starboard entering from sea), cardinal N/E/S/W, isolated danger, safe water, special.',
            'Boczne (czerwony walec po lewej / zielony stożek po prawej od morza), kardynalne N/E/S/W, odosobnione niebezpieczeństwo, bezpieczna woda, specjalny.',
          )}
        </DiagramCaption>

        <h3 className="mb-2 mt-6 text-base font-semibold" style={{ color: 'var(--text-primary)' }}>
          🪧 {tp('Береговые таблички (внутренние воды)', 'Inland shore signs', 'Tablice śródlądowe')}
        </h3>
        <InlandSignsGallery />
        <DiagramCaption>
          {tp(
            'Красный кант = запрет/предписание/ограничение; синий фон = информация. Форму и символ надо узнавать на экзамене.',
            'Red border = prohibition/mandatory/restriction; blue ground = information. You must recognize shape + symbol on the exam.',
            'Czerwona obwódka = zakaz/nakaz/ograniczenie; niebieskie tło = informacja.',
          )}
        </DiagramCaption>

        <h3 className="mb-2 mt-6 text-base font-semibold" style={{ color: 'var(--text-primary)' }}>
          🚥 {tp('Световые сигналы шлюза и препятствий', 'Lock and obstruction light signals', 'Światła śluz i przeszkód')}
        </h3>
        <InlandLightSignalsGallery />
        <DiagramCaption>
          {tp(
            'В шлюз входи только на зелёный. У земснаряда или препятствия проходи со стороны двух зелёных огней/ромбов; красная сторона закрыта.',
            'Enter a lock only on green. At a dredger or obstruction, pass on the side with two green lights/diamonds; the red side is closed.',
            'Do śluzy wchodź tylko na zielone. Przy pogłębiarce lub przeszkodzie mijaj stroną dwóch zielonych świateł/rombów; czerwona strona jest zamknięta.',
          )}
        </DiagramCaption>
      </Section>

      {/* 5. NAWIGACJA W PRAKTYCE --------------------------------------------- */}
      <Section {...SECTIONS[4]}>
        <div className="grid gap-3 sm:grid-cols-2">
          <Card>
            <NabieznikDiagram />
            <DiagramCaption>{tp(
              'Nabieżnik (створ): wyższy znak nad niższym = jesteś na osi',
              'Leading marks: higher mark above the lower = you are on the axis',
              'Nabieżnik: wyższy znak nad niższym = jesteś na osi',
            )}</DiagramCaption>
          </Card>
          <Card>
            <RiverDiagram />
            <DiagramCaption>Rzeka: trzymaj prawej strony; z prądem = pierwszeństwo</DiagramCaption>
          </Card>
          <Card>
            <RiverBendDiagram />
            <DiagramCaption>Zakręt: głębia i prąd przy brzegu wklęsłym, płycizna przy wypukłym</DiagramCaption>
          </Card>
          <Card>
            <BridgeClearanceDiagram />
            <DiagramCaption>Most: przed przejściem sprawdź wysokość, szerokość i aktualny stan wody</DiagramCaption>
          </Card>
          <Card>
            <DredgerPassDiagram />
            <DiagramCaption>Pogłębiarka/przeszkoda: mijaj po stronie dwóch zielonych świateł albo rombów</DiagramCaption>
          </Card>
          <Card>
            <CableFerryDiagram />
            <DiagramCaption>Prom linowy: przepuść prom, nie przechodź nad liną pod wodą</DiagramCaption>
          </Card>
          <Card>
            <OpenWaterDiagram />
            <DiagramCaption>Otwarta woda: znak N mijaj od północy, S od południa</DiagramCaption>
          </Card>
          <Card>
            <PortEntryDiagram />
            <DiagramCaption>Wejście do portu (region A): czerwony po lewej, wolno, trzymaj prawej</DiagramCaption>
          </Card>
        </div>
        <Tip>
          {tp(
            'Частые ошибки: 1) путают регион A и B; 2) считают «лево/право» по своему курсу, а не по направлению знакования; 3) срезают над мелью у кардинального знака - обходи со стороны его названия; 4) на повороте реки уходят на левую сторону - держись правой кромки фарватера; 5) у препятствия идут на красную сторону вместо двух зелёных; 6) у канатного парома забывают про трос под водой.',
            'Common mistakes: 1) mixing region A and B; 2) counting left/right by your own course instead of the buoyage direction; 3) cutting over the shoal at a cardinal mark - pass on the side of its name; 4) drifting left on a river bend - keep to the right edge of the fairway; 5) passing an obstruction on the red side instead of the two-green side; 6) forgetting the underwater rope at a cable ferry.',
            'Częste błędy: 1) mylenie regionu A i B; 2) liczenie "lewa/prawa" względem własnego kursu, a nie kierunku oznakowania; 3) ścięcie nad mielizną przy znaku kardynalnym - mijaj od strony jego nazwy; 4) na zakręcie rzeki schodzenie na lewą stronę - trzymaj się prawej krawędzi szlaku; 5) mijanie przeszkody po czerwonej stronie zamiast dwóch zielonych; 6) zapominanie o linie pod wodą przy promie linowym.',
          )}
        </Tip>
        <Card title="Śluzowanie krok po kroku / Шлюзование по шагам">
          <LockDiagram />
          <DiagramCaption>Wejście tylko na zielone; w komorze cumy trzymaj luźno, bez kotwicy</DiagramCaption>
          <ol className="mt-3 list-decimal space-y-1 pl-5 text-sm" style={{ color: 'var(--text-secondary)' }}>
            <li>{tp('Подойди к шлюзу медленно, жди перед воротами (czekaj przed śluzą).', 'Approach the lock slowly, wait before the gates.', 'Podpłyń do śluzy powoli, czekaj przed wrotami.')}</li>
            <li>{tp('Входи только на зелёный сигнал (zielone światło). Красный - стоп.', 'Enter only on the green light. Red = stop.', 'Wjeżdżaj tylko na zielone światło. Czerwone - stop.')}</li>
            <li>{tp('В камере пришвартуйся к стенке (cumowanie), заглуши двигатель, надень жилет.', 'In the chamber moor to the wall, stop the engine, put on a lifejacket.', 'W komorze zacumuj do ściany, zgaś silnik, załóż kamizelkę.')}</li>
            <li>{tp('При изменении уровня воды подбирай/потравливай концы (trzymaj cumy), не крепи наглухо.', 'As the water level changes, tend the lines - never make them fast.', 'Przy zmianie poziomu wody obsługuj cumy - nie mocuj na głucho.')}</li>
            <li>{tp('Якорь в шлюзе запрещён. Выходи по сигналу, по очереди прибытия (уступая уполномоченным).', 'Anchoring in the lock is forbidden. Leave on the signal, in order of arrival (privileged vessels first).', 'Kotwiczenie w śluzie zabronione. Wychodź na sygnał, według kolejności przybycia (uprzywilejowani pierwsi).')}</li>
          </ol>
        </Card>
      </Section>

      {/* 6. BUDOWA ------------------------------------------------------------ */}
      <Section {...SECTIONS[5]}>
        <div className="grid gap-3 sm:grid-cols-2">
          <Card>
            <BoatTopDiagram />
            <DiagramCaption>{tp(
              'Widok z góry: bakburta = лево (красный), sterburta = право (зелёный)',
              'Top view: bakburta = port (red), sterburta = starboard (green)',
              'Widok z góry: bakburta = lewa (czerwony), sterburta = prawa (zielony)',
            )}</DiagramCaption>
          </Card>
          <Card>
            <BoatSideDiagram />
            <DiagramCaption>Przekrój: forpik na dziobie, achterpik na rufie, zęza najniżej</DiagramCaption>
          </Card>
        </div>
        <Table
          head={['Termin PL', 'По-русски', 'Przykład']}
          rows={[
            ['Dziób / Rufa', 'нос / корма', 'Idź na dziób rzucić cumę'],
            ['Sterburta / Bakburta', 'правый / левый борт', 'Mijamy się bakburtami'],
            ['Kadłub', 'корпус', 'Kadłub z laminatu'],
            ['Pawęż', 'транец', 'Silnik zaburtowy wisi na pawęży'],
            ['Kil / Stępka', 'киль', 'Stępka chroni dno'],
            ['Zęza', 'льяло (самое низкое место)', 'Wypompuj wodę z zęzy'],
            ['Forpik / Achterpik', 'носовой / кормовой отсек', 'Kotwica leży w forpiku'],
            ['Denniki', 'флоры (киль-шпангоуты)', 'Denniki wzmacniają dno'],
            ['Pokładniki', 'бимсы (палуба-шпангоуты)', 'Pokładniki podtrzymują pokład'],
            ['Nadburcie', 'фальшборт', 'Nadburcie chroni przed zalaniem'],
            ['Kluza', 'клюз', 'Cuma przechodzi przez kluzę'],
            ['Knaga / Poler', 'утка / пал', 'Zawiąż cumę na knadze'],
            ['Handreling', 'поручень', 'Trzymaj się handrelingu na fali'],
            ['Koja / Keja', 'койка / причал (ловушка!)', 'Śpisz w koi, cumujesz przy kei'],
            ['Mesa / Kambuz', 'кают-компания / камбуз', 'Obiad w mesie, gotujesz w kambuzie'],
            ['Wolna burta', 'надводный борт', 'Wysokość od wody do pokładu'],
            ['Zanurzenie', 'осадка', 'Od linii wody do najniższego punktu'],
          ]}
        />
        <Tip>
          {tp(
            'Пары-ловушки, которые любит экзамен: koja (койка) ≠ keja (причал); zęza (льяло) ≠ stewa (штевень); denniki (киль-шпангоуты) ≠ pokładniki (палуба-шпангоуты). Выучи именно эти пары.',
            'Trap pairs the exam loves: koja (bunk) vs keja (quay); zęza (bilge) vs stewa (stem); denniki (floor frames) vs pokładniki (deck beams). Learn exactly these pairs.',
            'Pary-pułapki, które lubi egzamin: koja (miejsce do spania) vs keja (nabrzeże); zęza (najniższe miejsce w kadłubie) vs stewa (belka dziobowa/rufowa); denniki (wzmocnienia dna) vs pokładniki (belki pokładu). Naucz się właśnie tych par.',
          )}
        </Tip>
      </Section>

      {/* 7. SILNIKI ------------------------------------------------------------ */}
      <Section {...SECTIONS[6]}>
        <Card>
          <FuelSystemDiagram />
          <DiagramCaption>Zbiornik przenośny: odpowietrznik odkręcony, gruszka napompowana, zawór otwarty; potem luz + linka i start</DiagramCaption>
        </Card>
        <Card title="Fakty / Факты">
          <Fact q="1 kW = ?" a="1,36 KM (konia mechanicznego)" ru="1 кВт = 1,36 л.с.; обратно 1 л.с. = 0,735 кВт." />
          <Fact q="Four stroke / two stroke" a="czterosuwowy (czysta benzyna) / dwusuwowy (mieszanka)" ru="4-тактный - чистый бензин; 2-тактный - смесь бензина с маслом, нет масляного поддона (miski olejowej)." />
          <Fact q="Otwór kontrolny przy pracy" a="delikatnie sika ciepła woda" ru="Струйка воды = охлаждение работает. Нет струйки - глуши!" />
          <Fact q="Chłodzenie silnika zaburtowego" a="woda zaburtowa (pompa z wirnikiem)" ru="Охлаждение забортной водой." />
          <Fact q="Naprzód -> wstecz od razu" a="zabronione - najpierw luz (neutral)" ru="Резкий реверс ломает редуктор: нейтраль, пауза, назад." />
          <Fact q="Przed wyłączeniem silnika" a="obroty na minimum + bieg jałowy" ru="Сбрось обороты, нейтраль, потом глуши." />
          <Fact q="Trym silnika" a="kąt silnika względem pawęży" ru="Трим - угол мотора к транцу; влияет на ход и расход." />
          <Fact q="Kill switch (linka)" a="zatrzymuje silnik po wypadnięciu sternika" ru="Шнур на запястье глушит мотор, если рулевой выпал. Всегда пристёгнут!" />
          <Fact q="Przed startem (zbiornik przenośny)" a="otwórz odpowietrznik, podpompuj gruszką, luz, śruba w wodzie" ru="Открыть сапун, подкачать грушей, нейтраль, винт в воде." />
          <Fact q="Przegrzanie" a="obroty w dół / stop, sprawdź pobór wody" ru="Сбрось обороты, проверь забор воды (водоросли, пакет)." />
        </Card>
      </Section>

      {/* 8. MANEWRY ------------------------------------------------------------ */}
      <Section {...SECTIONS[7]}>
        <Card>
          <PropWalkDiagram />
          <DiagramCaption>Efekt śruby (prop walk) na biegu wstecznym - widok od rufy</DiagramCaption>
        </Card>
        <Table
          head={['Lina', 'Co robi', 'По-русски']}
          rows={[
            ['Cuma dziobowa / rufowa', 'trzyma dziób/rufę przy kei', 'носовой / кормовой швартов'],
            ['Szpring', 'wzdłuż burty - blokuje przesuwanie wzdłuż kei', 'шпринг - от продольного смещения'],
            ['Brest', 'prostopadle do burty - dociska do kei', 'прижимной конец'],
          ]}
        />
        <Card title="Fakty / Факты">
          <Fact q="Prędkość manewrów w porcie" a="minimalna zapewniająca sterowność" ru="Минимальная, при которой лодка слушается руля." />
          <Fact q="Silny wiatr w porcie" a="manewruj zdecydowanie - większa prędkość = mniejszy dryf" ru="Решительнее: выше скорость - меньше снос." />
          <Fact q="Śruba prawoskrętna wstecz" a="rufa idzie w LEWO" ru="Правый винт назад - корма влево. Используй при швартовке." />
          <Fact q="Łańcuch kotwiczny" a="3-5 głębokości (3 m -> 9-15 m)" ru="Цепь = 3-5 глубин." />
          <Fact q="Podejście do boi / kei" a="pod wiatr lub pod prąd (silniejszy czynnik)" ru="Подходи против ветра или течения - что сильнее." />
          <Fact q="Sztrandowanie" a="celowe osadzenie na mieliźnie" ru="Намеренная посадка на мель (авария)." />
          <Fact q="Holowanie - prędkość ustala" a="kapitan holującego" ru="Скорость задаёт буксировщик." />
          <Fact q="Ster strumieniowy" a="pędnik poprzeczny na dziobie" ru="Носовая подрулька для порта." />
          <Fact q="Kotwiczenie zabronione" a="na szlaku żeglownym, przy kablach, w śluzach" ru="Не якорись на фарватере и у кабелей." />
        </Card>
      </Section>

      {/* 9. LOCJA ---------------------------------------------------------------- */}
      <Section {...SECTIONS[8]}>
        <Tip>
          {tp(
            'Миля 1852 м; узел = миля в час; 1 градус = 60 минут; 1 минута широты = 1 миля. Mila morska = 1852 m = 1 minuta szerokości.',
            'Nautical mile = 1852 m = 1 minute of latitude. 1 degree = 60 minutes. Knot = 1 NM per hour.',
            'Mila morska = 1852 m = 1 minuta szerokości. 1 stopień = 60 minut. Węzeł = 1 Mm/h.',
          )}
        </Tip>
        <Table
          head={['Termin / przyrząd', 'Znaczenie', 'По-русски']}
          rows={[
            ['Echosonda', 'mierzy głębokość', 'эхолот - глубина'],
            ['Log', 'mierzy prędkość po wodzie', 'лаг - скорость по воде'],
            ['Namiar', 'kierunek NA obiekt', 'пеленг - направление на объект'],
            ['Kurs', 'kierunek ruchu statku', 'курс - направление движения'],
            ['GPS', 'współrzędne + COG + SOG (nad dnem)', 'координаты, путевой угол и скорость ОТНОСИТЕЛЬНО ДНА'],
            ['Śluza', 'pokonuje różnicę poziomów wody', 'шлюз - разные уровни воды'],
            ['Locja', 'opis dróg wodnych i oznakowania', 'лоция - описание вод и знаков'],
            ['Charakterystyki świateł', 'Fl = blaskowe, Oc = przesłonowe, Iso = izofazowe, Q = migające; Fl(2) 10s = 2 błyski co 10 s', 'Fl проблесковый, Oc затмевающийся, Iso изофазный, Q частый'],
          ]}
        />
        <Tip>
          {tp(
            'GPS не заменяет глаза и карту: позиция может врать, COG/SOG - относительно дна, а не воды. На тесте: «Czy nawigację można oprzeć wyłącznie na GPS?» - NIE.',
            'GPS does not replace eyes and chart: the fix can be wrong, COG/SOG are over ground, not through water. On the test: "Czy nawigację można oprzeć wyłącznie na GPS?" - NIE.',
            'GPS nie zastępuje oczu i mapy: pozycja może kłamać, COG/SOG są względem dna, nie wody. Na teście: "Czy nawigację można oprzeć wyłącznie na GPS?" - NIE.',
          )}
        </Tip>
      </Section>

      {/* 10. METEO ----------------------------------------------------------------- */}
      <Section {...SECTIONS[9]}>
        <Card title="Fakty / Факты">
          <Fact q="Barometr / anemometr" a="ciśnienie / prędkość wiatru" ru="Барометр - давление; анемометр - ветер." />
          <Fact q="Nagły spadek ciśnienia" a="nadchodzi sztorm" ru="Резкое падение давления = шторм близко." />
          <Fact q="Wiatr wieje" a="od wyżu do niżu" ru="Из высокого давления в низкое." />
          <Fact q="6 B (Beaufort)" a="22-27 węzłów" ru="6 баллов = 22-27 узлов; для малых лодок уже опасно." />
          <Fact q="Flauta (sztil)" a="zupełny brak wiatru" ru="Штиль - 0 баллов." />
          <Fact q="Szkwał" a="nagły silny poryw wiatru" ru="Шквал - резкое усиление, часто перед грозой." />
          <Fact q="Bryza dzienna / nocna" a="dniem od wody na ląd, nocą od lądu na wodę" ru="Днём с воды на сушу, ночью наоборот." />
          <Fact q="Cumulonimbus (Cb)" a="szkwały, burza, ulewa" ru="Кучево-дождевое: увидел «наковальню» - к берегу." />
        </Card>

        <h3 className="mb-2 mt-6 text-base font-semibold" style={{ color: 'var(--text-primary)' }}>
          🗻 {tp('Ярусы облаков', 'Cloud altitude tiers', 'Piętra chmur')}
        </h3>
        <CloudTiers />
        <DiagramCaption>
          {tp(
            'Niskie piętro (< 2 km): Stratus, Stratocumulus, Nimbostratus. Średnie (2-6 km): Altostratus, Altocumulus. Wysokie (> 6 km): Cirrus, Cirrostratus, Cirrocumulus. Pionowej rozbudowy: Cumulus, Cumulonimbus. / Низкий ярус (до 2 км): слоистые; средний (2-6 км): высоко-; высокий (свыше 6 км): перистые; вертикального развития: кучевые и кучево-дождевые.',
            'Low (< 2 km): Stratus/Stratocumulus/Nimbostratus. Mid (2-6 km): Altostratus/Altocumulus. High (> 6 km): Cirrus/Cirrostratus/Cirrocumulus. Vertical: Cumulus/Cumulonimbus.',
            'Niskie (< 2 km): Stratus, Stratocumulus, Nimbostratus. Średnie (2-6 km): Altostratus, Altocumulus. Wysokie (> 6 km): Cirrus, Cirrostratus, Cirrocumulus. Pionowe: Cumulus, Cumulonimbus.',
          )}
        </DiagramCaption>

        <h3 className="mb-2 mt-6 text-base font-semibold" style={{ color: 'var(--text-primary)' }}>
          📷 {tp('Как читать небо (реальные фото)', 'Read the sky (real photos)', 'Jak czytać niebo (zdjęcia)')}
        </h3>
        <CloudPhotos />
        <DiagramCaption>
          {tp(
            'Слева направо - от хорошей погоды к опасной. Cumulonimbus и вал шквала (shelf cloud) = уходи к берегу; туман = включай огни и сигналы.',
            'Left to right - from fair to dangerous. Cumulonimbus and a shelf cloud mean head to shore; fog means lights and signals on.',
            'Od lewej do prawej - od ładnej do groźnej pogody. Cumulonimbus i shelf cloud = wracaj do brzegu; mgła = światła i sygnały.',
          )}
        </DiagramCaption>

        <h3 className="mb-2 mt-6 text-base font-semibold" style={{ color: 'var(--text-primary)' }}>
          ☁️ {tp('Схемы облаков', 'Cloud diagrams', 'Schematy chmur')}
        </h3>
        <CloudsGallery />
        <DiagramCaption>
          {tp(
            'Cumulus - хорошая погода; Altocumulus - «барашки» и смена погоды; Cumulonimbus/Shelf cloud - гроза и шквалы, уходи к берегу; Stratus/Nimbostratus - обложной дождь; Mgła - огни и звуковые сигналы.',
            'Cumulus - fair weather; Altocumulus - mackerel sky and changing weather; Cumulonimbus/Shelf cloud - storm and squalls, head to shore; Stratus/Nimbostratus - steady rain; fog means lights and sound signals.',
            'Cumulus - ładna pogoda; Altocumulus - baranki i zmiana pogody; Cumulonimbus/Shelf cloud - burza i szkwały, wracaj do brzegu; Stratus/Nimbostratus - opady ciągłe; mgła - światła i sygnały dźwiękowe.',
          )}
        </DiagramCaption>

        <h3 className="mb-2 mt-6 text-base font-semibold" style={{ color: 'var(--text-primary)' }}>
          🌡️ {tp('Фронты и давление', 'Fronts and pressure', 'Fronty i ciśnienie')}
        </h3>
        <FrontsPressureGallery />
        <DiagramCaption>
          {tp(
            'Тёплый фронт (красные полукруги) - медленное потепление; холодный (синие треугольники) - шквалы; W (wyż) = высокое давление, ясно; N (niż) = низкое, ветер и осадки. Ветер дует из W в N.',
            'Warm front (red semicircles) slow warming; cold (blue triangles) squalls; W (high) clear; N (low) wind and rain. Wind blows from high to low.',
            'Front ciepły (czerwone półkola) - powolne ocieplenie; chłodny (niebieskie trójkąty) - szkwały; W (wyż) - wysokie ciśnienie, pogodnie; N (niż) - niskie, wiatr i opady. Wiatr wieje od wyżu do niżu.',
          )}
        </DiagramCaption>

        <h3 className="mb-2 mt-6 text-base font-semibold" style={{ color: 'var(--text-primary)' }}>
          🌬️ {tp('Бризы', 'Breezes', 'Bryzy')}
        </h3>
        <BreezeGallery />
        <DiagramCaption>
          {tp('Днём суша теплее - бриз с воды на сушу; ночью наоборот - с суши на воду.', 'By day land is warmer - breeze from water to land; by night the reverse.', 'W dzień ląd cieplejszy - bryza od wody na ląd; nocą odwrotnie.')}
        </DiagramCaption>

        <h3 className="mb-2 mt-6 text-base font-semibold" style={{ color: 'var(--text-primary)' }}>
          🌪️ {tp('Шкала Бофорта (0-12)', 'Beaufort scale (0-12)', 'Skala Beauforta (0-12)')}
        </h3>
        <p className="mb-2 text-sm" style={{ color: 'var(--text-secondary)' }}>
          {tp(
            'Шкала Бофорта (0-12) описывает силу ветра по его действию на воду. Для малых лодок 6 баллов - уже предел, при 8+ на воду не выходят.',
            'The Beaufort scale (0-12) describes wind force by its effect on the water. For small boats 6 is already the limit; at 8+ you do not go out.',
            'Skala Beauforta (0-12) opisuje siłę wiatru wg jego działania na wodę. Dla małych łodzi 6 to już granica, przy 8+ nie wypływa się.',
          )}
        </p>
        <Table
          head={['B', 'Nazwa (PL / RU)', 'Węzły', 'Morze / Море']}
          rows={[
            ['0', 'Cisza / штиль', '< 1 kn', 'lustro wody / гладь'],
            ['1', 'Powiew / тихий', '1-3 kn', 'zmarszczki / рябь'],
            ['2', 'Słaby / лёгкий', '4-6 kn', 'małe fale / мелкие волны'],
            ['3', 'Łagodny / слабый', '7-10 kn', 'grzywacze zaczynają się łamać / барашки'],
            ['4', 'Umiarkowany / умеренный', '11-16 kn', 'małe fale, białe grzywy / белые гребни'],
            ['5', 'Dość silny / свежий', '17-21 kn', 'umiarkowane fale / умеренные волны'],
            ['6', 'Silny / сильный', '22-27 kn', 'duże fale, piana / крупные волны, пена'],
            ['7', 'Bardzo silny / крепкий', '28-33 kn', 'morze się piętrzy / волны громоздятся'],
            ['8', 'Sztormowy / очень крепкий', '34-40 kn', 'wichura, wysokie fale / шторм'],
            ['9', 'Silnie sztormowy / шторм', '41-47 kn', 'bardzo wysokie fale / очень высокие'],
            ['10', 'Sztorm / сильный шторм', '48-55 kn', 'ogromne fale / огромные волны'],
            ['11', 'Gwałtowny sztorm / жестокий', '56-63 kn', 'wyjątkowo wysokie fale / исключит.'],
            ['12', 'Huragan / ураган', '> 64 kn', 'powietrze pełne piany / всё в пене'],
          ]}
        />
        <Tip>
          {tp(
            'Запомни ключевое для теста: 6°B = 22-27 узлов (сильный ветер, для малой лодки уже опасно). Резкий рост силы ветра + Cumulonimbus/вал шквала = немедленно к берегу.',
            'Key for the test: 6 Bft = 22-27 kn (strong wind, already risky for a small boat). Rapidly rising wind + Cumulonimbus / shelf cloud = head for shore immediately.',
            'Kluczowe na test: 6 B = 22-27 w (silny wiatr, dla małej łodzi już groźny). Szybki wzrost siły wiatru + Cumulonimbus / wał szkwałowy = natychmiast do brzegu.',
          )}
        </Tip>
      </Section>

      {/* 11. RATOWNICTWO ------------------------------------------------------------ */}
      <Section {...SECTIONS[10]}>
        <Card>
          <MobDiagram />
          <DiagramCaption>Manewr «człowiek za burtą» (MOB): alarm, koło, obserwator, podejście pod wiatr, silnik na luz przy osobie</DiagramCaption>
        </Card>
        <Card title="Pierwsza pomoc / Первая помощь">
          <Fact q="RKO (resuscytacja)" a="30 uciśnięć (100-120/min) + 2 wdechy" ru="СЛР 30:2, темп 100-120 в минуту." />
          <Fact q="Nieprzytomny - najpierw" a="sprawdź oddech i drożność dróg oddechowych" ru="Сначала дыхание; дышит - боковое положение." />
          <Fact q="Nieprzytomny, oddycha" a="pozycja boczna ustalona" ru="Устойчивое боковое положение." />
          <Fact q="Przedmiot w ranie" a="NIE usuwać - ustabilizować, do lekarza" ru="Нож/предмет не вынимать!" />
          <Fact q="Krwotok tętniczy" a="jasna, pulsująca krew - mocny ucisk" ru="Яркая пульсирующая кровь - прямое прижатие." />
          <Fact q="Wychłodzony z wody" a="bez alkoholu; suche ubranie, ciepły napój" ru="Алкоголь запрещён; сухое, тёплое, постепенно." />
          <Fact q="Oparzenie" a="chłodzić wodą, jałowy opatrunek" ru="Охлаждать водой, стерильная повязка." />
          <Fact q="Koło ratunkowe" a="przez głowę, pod ramiona" ru="Через голову под мышки." />
        </Card>
        <Table
          head={['Służba / sygnał', 'Znaczenie']}
          rows={[
            ['SAR', 'morska służba poszukiwania i ratownictwa / морское спасание'],
            ['WOPR', 'ratownictwo na wodach śródlądowych / внутренние воды'],
            ['601 100 100', 'numer ratunkowy nad wodą (oraz 112) / номер спасения на воде'],
            ['Kanał 16 VHF', 'wywoławczy i alarmowy / вызов и бедствие'],
            ['MAYDAY', 'bezpośrednie zagrożenie życia lub statku / прямая угроза жизни'],
            ['PAN-PAN', 'pilność, ale bez zagrożenia życia / срочность без угрозы жизни'],
            ['SECURITE', 'komunikat o bezpieczeństwie (pogoda, przeszkoda) / сообщение о безопасности'],
            ['SOS', '. . . - - - . . . (świetlny/dźwiękowy)'],
            ['Ratowanie życia na wodzie', 'bezpłatne / бесплатно'],
          ]}
        />
        <Tip>
          {tp(
            'MAYDAY - три раза на 16 канале, затем название судна, позиция, характер опасности, число людей, нужна ли помощь. PAN-PAN - когда срочно, но жизни ничто не угрожает (поломка, буксировка). SECURITE - предупреждение (погода, препятствие).',
            'MAYDAY - three times on channel 16, then vessel name, position, nature of distress, persons on board, assistance required. PAN-PAN - urgent but no danger to life (breakdown, tow). SECURITE - safety warning (weather, obstruction).',
            'MAYDAY - trzy razy na kanale 16, potem nazwa jednostki, pozycja, rodzaj zagrożenia, liczba osób, potrzebna pomoc. PAN-PAN - pilne, ale życie niezagrożone (awaria, holowanie). SECURITE - ostrzeżenie (pogoda, przeszkoda).',
          )}
        </Tip>
      </Section>

      {/* 12. SRODOWISKO --------------------------------------------------------------- */}
      <Section {...SECTIONS[11]}>
        <Card title="Zasada: nic za burtę / Принцип: ничего за борт">
          <Fact q="Tankowanie" a="tylko przy wyłączonym silniku, bez rozlewania" ru="Заправка - только с заглушенным мотором." />
          <Fact q="Zęza silnikowa w porcie" a="nie wypompowywać za burtę" ru="Льяльные воды - не за борт (нефтепродукты)." />
          <Fact q="WC chemiczne" a="opróżniać tylko w punktach w portach" ru="Химтуалет - только в спецточки." />
          <Fact q="Śmieci" a="selektywna zbiórka na lądzie" ru="Мусор - в раздельный сбор на берегу." />
          <Fact q="Środki czystości" a="biodegradowalne" ru="Только биоразлагаемая химия." />
          <Fact q="Strefa ciszy" a="zakaz silników spalinowych" ru="Зона тишины: ДВС запрещены." />
        </Card>
      </Section>

      {/* 13. PRAKTYKA ------------------------------------------------------------------- */}
      <Section {...SECTIONS[12]}>
        <Card title="Co sprawdza egzaminator / Что проверяет экзаменатор">
          <ul className="list-disc space-y-1 pl-5 text-sm" style={{ color: 'var(--text-secondary)' }}>
            <li>Manewrowanie: spotkanie z innym jachtem i wyprzedzanie, odejście od nadbrzeża i dojście, pływanie kursem prostym i cyrkulacja (załącznik nr 4 do rozporządzenia).</li>
            <li>Alarm «człowiek za burtą» - najważniejszy manewr: alarm, koło, obserwator, podejście pod wiatr, silnik na luz przy osobie.</li>
            <li>Kotwiczenie i cumowanie w różnych warunkach (praca cumami: brest, szpring).</li>
            <li>Kierowanie załogą: wydawanie komend, praca w charakterze członka załogi, podstawowe prace bosmańskie.</li>
            <li>Przygotowanie łodzi: paliwo, kamizelki, kill switch, środki ratunkowe.</li>
          </ul>
          <p className="mt-2 text-xs" style={{ color: 'var(--text-muted)' }}>
            {tp(
              'Źle wykonany element można powtórzyć JEDEN raz (par. 17 ust. 11). Неудавшийся манёвр можно повторить один раз; параметры лодки закон не задаёт.',
              'A failed element may be repeated ONCE (par. 17 sec. 11). There is no statutory minimum power/length of the exam boat - it depends on the centre.',
              'Źle wykonany element można powtórzyć JEDEN raz (par. 17 ust. 11). Nie ma ustawowego minimum mocy/długości łodzi egzaminacyjnej - to zależy od ośrodka.',
            )}
          </p>
        </Card>
        <Table
          head={['Węzeł', 'Zastosowanie / По-русски']}
          rows={[
            ['Ósemka', 'stoper na końcu liny / восьмёрка - стопорный узел'],
            ['Ratowniczy (bulina, skrajny tatrzański)', 'niezaciskająca się pętla / булинь - незатягивающаяся петля'],
            ['Knagowy', 'mocowanie cumy na knadze / крепление на утке'],
            ['Płaski (refowy)', 'łączenie dwóch lin / прямой - связать два конца'],
            ['Wyblinka', 'mocowanie do pala/relingu / выбленочный'],
          ]}
        />
        <Tip>
          {tp(
            'На практике безопасность важнее красоты: малый газ в порту, kill switch пристёгнут, жилет надет, у человека в воде - мотор на нейтраль. Экзаменатор прощает кривую швартовку, но не винт у пловца.',
            'In the practical, safety beats style: low throttle in port, kill switch clipped on, lifejacket on, engine in neutral near a person in the water. The examiner forgives clumsy mooring but not a propeller near a swimmer.',
            'Na praktyce bezpieczeństwo ważniejsze niż elegancja: mały gaz w porcie, kill switch przypięty, kamizelka założona, przy osobie w wodzie - silnik na luz. Egzaminator wybaczy krzywe cumowanie, ale nie śrubę przy pływaku.',
          )}
        </Tip>
      </Section>

      {/* 14. SCIAGA ------------------------------------------------------------------------ */}
      <Section {...SECTIONS[13]}>
        <Card>
          <ul className="list-disc space-y-1.5 pl-5 text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
            <li>{tp('Расхождение: моторка уступает всем; встречные - вправо, левыми бортами; при пересечении уступаешь тому, кто справа.', 'Right of way: a motorboat gives way to everyone; head-on - turn right, pass port to port; crossing - give way to the one on your starboard.', 'Prawo drogi: motorówka ustępuje wszystkim; kursy przeciwne - w prawo, lewymi burtami; przy przecinaniu ustępujesz temu z prawej.')}</li>
            <li>{tp('Огни: левый красный, правый зелёный (112,5); мачтовый 225; кормовой белый 135; на якоре - белый круговой.', 'Lights: port red, starboard green (112.5); masthead 225; stern white 135; at anchor - all-round white.', 'Światła: lewa czerwone, prawa zielone (112,5); masztowe 225; rufowe białe 135; na kotwicy - białe dookolne.')}</li>
            <li>{tp('Сигналы: 1 короткий - вправо, 2 - влево, 3 - задний ход, 5+ - опасность; длинные повторяющиеся - бедствие.', 'Sound signals: 1 short - right, 2 - left, 3 - astern, 5+ - danger; repeated long blasts - distress.', 'Sygnały: 1 krótki - w prawo, 2 - w lewo, 3 - wstecz, 5+ - niebezpieczeństwo; długie powtarzane - wzywanie pomocy.')}</li>
            <li>{tp('Кардинальные: обходи со стороны названия; N ▲▲ (непрерывные), E «яйцо» (3), S ▼▼ (6+длинная), W «бокал» (9).', 'Cardinals: pass on the side of the name; N ▲▲ (continuous), E "egg" (3), S ▼▼ (6+long), W "wineglass" (9).', 'Kardynalne: mijaj od strony nazwy; N ▲▲ (ciągłe), E "jajko" (3), S ▼▼ (6+długi), W "kieliszek" (9).')}</li>
            <li>{tp('Боковые (регион A): красный цилиндр - слева, зелёный конус - справа (вход с моря). В США наоборот.', 'Lateral (region A): red can to port, green cone to starboard (entering from sea). Reversed in the USA.', 'Boczne (region A): czerwony walec - z lewej, zielony stożek - z prawej (od morza). W USA odwrotnie.')}</li>
            <li>{tp('Меры: 1 миля = 1852 м; узел = миля/час; 1 градус = 60 минут; 1 кВт = 1,36 л.с.', 'Units: 1 NM = 1852 m; knot = NM/h; 1 degree = 60 minutes; 1 kW = 1.36 hp.', 'Miary: 1 Mm = 1852 m; węzeł = Mm/h; 1 stopień = 60 minut; 1 kW = 1,36 KM.')}</li>
            <li>{tp('Винт назад: правый - корма влево. Река: вниз по течению - приоритет; держись правой стороны.', 'Prop astern: right-handed - stern to port. River: downstream has priority; keep to the right side.', 'Śruba wstecz: prawoskrętna - rufa w lewo. Rzeka: z prądem - pierwszeństwo; trzymaj się prawej strony.')}</li>
            <li>{tp('Порт: выходящий имеет приоритет; манёвры на минимальной скорости со сохранением управляемости.', 'Port: the outbound vessel has priority; manoeuvre at minimum steerage speed.', 'Port: wychodzący ma pierwszeństwo; manewry z minimalną prędkością zapewniającą sterowność.')}</li>
            <li>{tp('СЛР 30:2 (100-120/мин); предмет в ране не вынимать; алкоголь переохлаждённому нельзя; 601 100 100 / 112.', 'CPR 30:2 (100-120/min); never pull an object out of a wound; no alcohol for hypothermia; 601 100 100 / 112.', 'RKO 30:2 (100-120/min); przedmiotu z rany nie wyjmuj; alkohol przy wychłodzeniu zabroniony; 601 100 100 / 112.')}</li>
            <li>{tp('Экология: ничего за борт; заправка при выключенном моторе; химтуалет - в спецточки.', 'Environment: nothing overboard; refuel with the engine off; chemical toilet - only to disposal points.', 'Środowisko: nic za burtę; tankowanie przy zgaszonym silniku; toaleta chemiczna - do punktów zlewnych.')}</li>
            <li>{tp('Патент: внутренние воды без лимита (до 16 лет - 60 кВт); море - 12 м / 2 Mm / день. Без патента: до 10 кВт (или хаусбот до 75 кВт / 13 м / 15 км/ч).', 'Patent: inland no power limit (under 16 - 60 kW); sea - 12 m / 2 NM / daytime. Without a patent: up to 10 kW (or houseboat up to 75 kW / 13 m / 15 km/h).', 'Patent: śródlądzie bez limitu (do 16 lat - 60 kW); morze - 12 m / 2 Mm / dzień. Bez patentu: do 10 kW (lub houseboat do 75 kW / 13 m / 15 km/h).')}</li>
          </ul>
        </Card>
        <Tip>
          {tp(
            'На экзамене: читай вопрос до конца - часто решает слово «nie / zabronione». Сомневаешься - выбирай более осторожный, безопасный вариант. Помечай сложные вопросы и возвращайся: 90 минут на 75 вопросов - времени хватает. Powodzenia! 🍀',
            'On the exam: read each question to the end - the word "nie / zabronione" often decides. When in doubt pick the more cautious, safer option. Flag hard questions and come back: 90 minutes for 75 questions is plenty. Powodzenia! 🍀',
            'Na egzaminie: czytaj pytanie do końca - często decyduje słowo "nie / zabronione". W razie wątpliwości wybieraj ostrożniejszą, bezpieczniejszą opcję. Zaznaczaj trudne pytania i wracaj: 90 minut na 75 pytań - czasu wystarczy. Powodzenia! 🍀',
          )}
        </Tip>
        <div className="mt-4 flex flex-wrap gap-2">
          <Link
            href="/sternik/test"
            className="rounded-xl px-5 py-2.5 text-sm font-semibold"
            style={{ background: 'var(--accent-cyan)', color: 'var(--accent-ink, #04222e)' }}
          >
            🎯 {tp('Закрепить в тренажёре', 'Drill it in the trainer', 'Utrwal w treningu')}
          </Link>
          <Link
            href="/sternik/egzamin"
            className="rounded-xl px-5 py-2.5 text-sm font-semibold"
            style={{ background: 'var(--bg-card)', color: 'var(--text-primary)', border: '1px solid var(--border-subtle)' }}
          >
            ⏱️ {tp('Пробный экзамен', 'Mock exam', 'Próbny egzamin')}
          </Link>
        </div>
      </Section>

      <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
        Materiał przygotowany na podstawie tematów bazy pytań PZMWiNW (sternik motorowodny), rozporządzenia MSiT z 9.04.2013
        i przepisów żeglugowych. Konspekt pomocniczy - aktualne wymagania sprawdź u organizatora egzaminu.
      </p>
    </div>
  );
}
