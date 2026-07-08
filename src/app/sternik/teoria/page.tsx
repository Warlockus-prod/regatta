'use client';

import type { ReactNode } from 'react';
import Link from 'next/link';
import { useI18n } from '@/lib/i18n';
import {
  BoatSideDiagram,
  BoatTopDiagram,
  CardinalClockDiagram,
  CrossingDiagram,
  HeadOnDiagram,
  LateralMarksDiagram,
  LightSectorsDiagram,
  MobDiagram,
  NabieznikDiagram,
  OpenWaterDiagram,
  OvertakingDiagram,
  PortEntryDiagram,
  PropWalkDiagram,
  RiverDiagram,
} from './diagrams';
import {
  BreezeGallery,
  CloudPhotos,
  CloudsGallery,
  FrontsPressureGallery,
  IalaGallery,
  InlandSignsGallery,
} from './SignsWeather';

// ============================================================================
// /sternik/teoria - the full theory konspekt: Polish exam terms + Russian
// commentary, SVG schematics, tables, mnemonics and a last-minute cheat sheet.
// Content language is PL/RU by design (see src/data/sternik.ts header).
// ============================================================================

const SECTIONS = [
  { id: 'patent', num: 1, pl: 'Patent i uprawnienia', ru: 'Патент и права' },
  { id: 'przepisy', num: 2, pl: 'Przepisy i prawo drogi', ru: 'Правила расхождения' },
  { id: 'sygnaly', num: 3, pl: 'Sygnaly dzwiekowe i swiatla', ru: 'Сигналы и огни' },
  { id: 'znaki', num: 4, pl: 'Znaki nawigacyjne', ru: 'Навигационные знаки' },
  { id: 'nawigacja', num: 5, pl: 'Nawigacja w praktyce', ru: 'Навигация на практике' },
  { id: 'budowa', num: 6, pl: 'Budowa jachtu', ru: 'Устройство лодки' },
  { id: 'silniki', num: 7, pl: 'Silniki', ru: 'Двигатели' },
  { id: 'manewry', num: 8, pl: 'Manewrowanie i cumowanie', ru: 'Манёвры и швартовка' },
  { id: 'locja', num: 9, pl: 'Locja i nawigacja', ru: 'Лоция' },
  { id: 'meteo', num: 10, pl: 'Meteorologia', ru: 'Метеорология' },
  { id: 'ratownictwo', num: 11, pl: 'Ratownictwo', ru: 'Спасание и первая помощь' },
  { id: 'srodowisko', num: 12, pl: 'Ochrona srodowiska', ru: 'Экология' },
  { id: 'praktyka', num: 13, pl: 'Czesc praktyczna + wezly', ru: 'Практика и узлы' },
  { id: 'sciaga', num: 14, pl: 'Sciaga na ostatnia chwile', ru: 'Шпаргалка' },
];

function Section({ id, num, pl, ru, children }: { id: string; num: number; pl: string; ru: string; children: ReactNode }) {
  return (
    <section id={id} className="mb-10 scroll-mt-24">
      <h2 className="mb-1 text-xl font-bold" style={{ color: 'var(--text-primary)' }}>
        {num}. {pl}
      </h2>
      <div className="mb-3 text-sm" style={{ color: 'var(--text-muted)' }}>{ru}</div>
      {children}
    </section>
  );
}

function Card({ children, title }: { children: ReactNode; title?: string }) {
  return (
    <div className="mb-4 rounded-2xl p-4" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)' }}>
      {title && (
        <div className="mb-2 text-sm font-semibold" style={{ color: 'var(--accent-cyan)' }}>{title}</div>
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
  return (
    <div className="border-b py-2 last:border-b-0" style={{ borderColor: 'var(--border-subtle)' }}>
      <div className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{q}</div>
      <div className="text-sm" style={{ color: 'var(--success)' }}>✓ {a}</div>
      <div className="text-xs" style={{ color: 'var(--text-muted)' }}>{ru}</div>
    </div>
  );
}

function Table({ head, rows }: { head: string[]; rows: string[][] }) {
  return (
    <div className="mb-4 overflow-x-auto rounded-xl" style={{ border: '1px solid var(--border-subtle)' }}>
      <table className="w-full text-sm">
        <thead>
          <tr style={{ background: 'var(--bg-secondary)' }}>
            {head.map((h) => (
              <th key={h} className="px-3 py-2 text-left font-semibold" style={{ color: 'var(--accent-cyan)' }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
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
  return <div className="mt-1 text-center text-xs" style={{ color: 'var(--text-muted)' }}>{children}</div>;
}

export default function SternikTheoryPage() {
  const { tp } = useI18n();

  return (
    <main>
      <h1 className="mb-1 text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>
        📖 {tp('Теория', 'Theory', 'Teoria')}: sternik motorowodny
      </h1>
      <p className="mb-5 text-sm" style={{ color: 'var(--text-secondary)' }}>
        {tp(
          'Конспект по всем разделам экзамена: польские термины (как в тесте) + пояснения по-русски + схемы. Прочитал раздел - закрепи его в тренажёре.',
          'Full konspekt for every exam section: Polish terms (as on the test) + Russian commentary + diagrams.',
          'Konspekt wszystkich dzialow egzaminu: terminy po polsku + komentarz po rosyjsku + schematy.',
        )}
      </p>

      {/* Last-minute quick access */}
      <div className="mb-5 flex flex-wrap gap-2">
        <a
          href="#sciaga"
          className="flex min-h-[44px] items-center rounded-xl px-4 text-sm font-semibold"
          style={{ background: 'linear-gradient(135deg, var(--accent-cyan), var(--accent-teal))', color: '#04222e' }}
        >
          ⚡ {tp('Шпаргалка на завтра', 'Last-minute cheat sheet', 'Sciaga na ostatnia chwile')}
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
        aria-label={tp('Содержание', 'Contents', 'Spis tresci')}
      >
        {SECTIONS.map((s) => (
          <a key={s.id} href={`#${s.id}`} className="flex min-h-[40px] items-center rounded-lg px-2 py-1 text-sm transition hover:opacity-80" style={{ color: 'var(--text-secondary)' }}>
            <span style={{ color: 'var(--accent-cyan)' }}>{s.num}.</span>&nbsp;{s.pl}{' '}
            <span className="text-xs" style={{ color: 'var(--text-muted)' }}>&nbsp;· {s.ru}</span>
          </a>
        ))}
      </nav>

      {/* 1. PATENT ---------------------------------------------------------- */}
      <Section {...SECTIONS[0]}>
        <Table
          head={['Uprawnienie / warunek', 'Szczegol']}
          rows={[
            ['Srodladzie', 'jachty motorowe bez ograniczenia mocy (ponizej 16 lat: do 60 kW)'],
            ['Morze', 'jachty do 12 m dlugosci kadluba, do 2 Mm od brzegu, w porze dziennej'],
            ['Minimalny wiek', '14 lat (ponizej 18 - pisemna zgoda opiekuna)'],
            ['Egzamin', 'test 75 pytan / 90 minut / prog 65 + czesc praktyczna (manewry)'],
            ['Bez patentu', 'silnik do 10 kW (13,6 KM); na srodladziu takze do 75 kW przy dlugosci do 13 m i predkosci ograniczonej konstrukcyjnie do 15 km/h (houseboaty)'],
            ['Rejestracja jachtu (REJA24)', 'obowiazkowa: dlugosc powyzej 7,5 m LUB moc napedu wieksza niz 15 kW'],
            ['Holowanie narciarza', 'osobna licencja (od 18 lat) - sam patent nie wystarcza'],
            ['Oplaty (2026)', 'egzamin 250 zl + patent 50 zl; uczniowie i studenci do 26 lat: 50% znizki'],
          ]}
        />
        <Tip>
          По-русски: патент даёт право водить моторные лодки на внутренних водах без лимита мощности (до 16 лет - до 60 кВт),
          на море - корпус до 12 м, до 2 миль от берега, днём. Без патента можно до 10 кВт, а также хаусботы до 75 кВт
          (корпус до 13 м, скорость конструктивно до 15 км/ч). Гидроцикл - только с патентом. Буксировка лыжника - отдельная лицензия.
        </Tip>
        <Card title="Na pokladzie / Что на борту и по закону">
          <Fact q="Dokumenty na pokladzie" a="patent, dokument rejestracyjny (jesli jednostka podlega rejestracji), dowod tozsamosci" ru="Держи на борту: патент, регистрационный документ (если судно подлежит регистрации) и удостоверение личности." />
          <Fact q="Obowiazkowe wyposazenie" a="kamizelka dla kazdej osoby, kolo/pas ratunkowy, gasnica (silnik spalinowy), apteczka, kotwica, cumy, czerpak" ru="Спассредство на каждого, круг/пояс, огнетушитель (для ДВС), аптечка, якорь, швартовы, черпак." />
          <Fact q="Skuter wodny" a="wymaga patentu (co najmniej SM), kamizelki i linki zrywkowej (kill switch)" ru="Гидроцикл - только с патентом, в жилете и с аварийным шнуром (зрывка)." />
          <Fact q="Holowanie narciarza / obiektow" a="osobna licencja (od 18 lat), na pokladzie obserwator" ru="Буксировка лыжника или «банана» - отдельная лицензия (с 18 лет), на борту нужен наблюдатель." />
          <Fact q="Alkohol" a="0,2-0,5 promila = stan po uzyciu (wykroczenie); powyzej 0,5 = nietrzezwosc (przestepstwo)" ru="0,2-0,5 промилле - «состояние после употребления» (правонарушение); свыше 0,5 - опьянение (уголовно)." />
          <Fact q="Kto kontroluje na wodzie" a="Policja, Straz Graniczna, inspektorzy zeglugi srodladowej, w portach kapitanat" ru="Контролируют полиция, погранслужба, инспекторы внутреннего судоходства; в портах - капитанат." />
        </Card>
      </Section>

      {/* 2. PRZEPISY -------------------------------------------------------- */}
      <Section {...SECTIONS[1]}>
        <Tip>
          Логика приоритета: кто маневреннее - тот уступает. Моторная лодка уступает парусным, вёсельным, рыболовным за ловом
          и неманевроспособным. Малые суда (до 20 м) уступают большим коммерческим. На встречных курсах моторные расходятся
          левыми бортами (оба отворачивают вправо). При пересечении курсов уступает тот, у кого встречный СПРАВА.
        </Tip>
        <div className="mb-2 grid gap-3 sm:grid-cols-3">
          <Card><CrossingDiagram /></Card>
          <Card><HeadOnDiagram /></Card>
          <Card><OvertakingDiagram /></Card>
        </div>
        <DiagramCaption>Prawo drogi: czerwony ustepuje, zielony ma pierwszenstwo / красный уступает, зелёный - приоритет</DiagramCaption>
        <Card title="Najczesciej na tescie / Чаще всего в тесте">
          <Fact q="Statek o napedzie mechanicznym ustepuje..." a="zaglowym, wioslowym, rybackim w trakcie polowu, bez mozliwosci manewru" ru="Моторка уступает парусным, вёсельным, рыбакам за ловом, неманевроспособным." />
          <Fact q="Zagle + silnik jednoczesnie = statek..." a="o napedzie mechanicznym" ru="Работает мотор - судно моторное, даже под парусами." />
          <Fact q="Wejscie/wyjscie z portu - pierwszenstwo ma..." a="wychodzacy z portu" ru="Выходящий из порта имеет приоритет." />
          <Fact q="Na rzece pierwszenstwo ma..." a="plynacy z pradem (w dol)" ru="Идущему по течению труднее тормозить - у него приоритет." />
          <Fact q="Za bezpieczenstwo odpowiada..." a="kapitan / kierownik statku" ru="Капитан, а не судовладелец." />
          <Fact q="Prom linowy..." a="przepusc, uwazaj na line pod woda" ru="Не проходи над тросом канатного парома." />
        </Card>
      </Section>

      {/* 3. SYGNALY --------------------------------------------------------- */}
      <Section {...SECTIONS[2]}>
        <Table
          head={['Sygnal', 'Znaczenie', 'По-русски']}
          rows={[
            ['1 krotki (~1 s)', 'zmieniam kurs w PRAWO', 'поворачиваю вправо'],
            ['2 krotkie', 'zmieniam kurs w LEWO', 'поворачиваю влево'],
            ['3 krotkie', 'pracuje wstecz', 'даю задний ход'],
            ['4 krotkie', 'nie moge manewrowac', 'не могу маневрировать'],
            ['5+ krotkich (seria)', 'niebezpieczenstwo / nie rozumiem', 'опасность / не понимаю намерений'],
            ['2 dlugie + 1 krotki', 'wyprzedzam po twojej PRAWEJ', 'обгоняю по твоему правому борту'],
            ['2 dlugie + 2 krotkie', 'wyprzedzam po twojej LEWEJ', 'обгоняю по левому борту'],
            ['1 dlugi + 1 krotki', 'zawracam w PRAWO', 'разворачиваюсь вправо'],
            ['1 dlugi + 2 krotkie', 'zawracam w LEWO', 'разворачиваюсь влево'],
            ['Seria podwojnych krotkich', 'czlowiek za burta', 'человек за бортом'],
            ['Dlugi, powtarzany (lub dzwon)', 'wzywanie pomocy', 'сигнал бедствия'],
            ['SOS', '. . . - - - . . .', 'три коротких, три длинных, три коротких'],
          ]}
        />
        <Tip>
          Длительности: короткий - около 1 с; длинный - на внутренних водах около 4 с, на море (COLREG) 4-6 с.
          В тестовом банке правильный вариант «4-6 sekund». Серия «опасность» на внутренних водах - минимум 6 очень
          коротких (по 0,25 с).
        </Tip>
        <Card>
          <LightSectorsDiagram />
          <DiagramCaption>Sektory swiatel - widok z gory / секторы огней, вид сверху (нос вверху)</DiagramCaption>
        </Card>
        <Card title="Swiatla / Огни">
          <Fact q="Kiedy swiatla nawigacyjne wlaczone?" a="od zachodu do wschodu slonca + przy ograniczonej widzialnosci" ru="От заката до рассвета И в тумане/ливне." />
          <Fact q="Burtowe: lewe / prawe" a="czerwone 112,5 / zielone 112,5" ru="Левый борт красный, правый зелёный. «Red port wine left»." />
          <Fact q="Masztowe (topowe) / rufowe" a="biale 225 / biale 135" ru="Мачтовый 225 = 2 x 112,5 спереди; кормовой 135. Сумма 360." />
          <Fact q="Na kotwicy w nocy" a="biale swiatlo widoczne dookola (360)" ru="Белый круговой якорный огонь." />
          <Fact q="Maly statek do 7 m" a="moze pokazywac jedno biale swiatlo dookola" ru="Малое судно до 7 м - один белый круговой огонь." />
        </Card>
        <Card title="Znaki dzienne (czarne ksztalty) / Дневные знаки">
          <Fact q="Kula (czarna)" a="statek na kotwicy / na postoju" ru="Чёрный шар - судно на якоре (днём). На носу." />
          <Fact q="Stozek wierzcholkiem w dol" a="jacht zaglowy plynacy takze na silniku" ru="Конус вершиной вниз - парусник, идущий ещё и под мотором (считается моторным)." />
          <Fact q="Niebieski stozek w dol / niebieskie swiatlo" a="material niebezpieczny palny" ru="Синий конус вершиной вниз (ночью синий огонь) - опасный груз." />
          <Fact q="Dwie czarne kule" a="statek bez mozliwosci manewru" ru="Два чёрных шара - судно, лишённое возможности управляться." />
          <Fact q="Walec (cylinder) czarny" a="pierwszenstwo przejazdu (duza jednostka)" ru="Чёрный цилиндр - судно с преимуществом прохода (обычно крупное)." />
        </Card>
      </Section>

      {/* 4. ZNAKI ------------------------------------------------------------ */}
      <Section {...SECTIONS[3]}>
        <Card>
          <LateralMarksDiagram />
          <DiagramCaption>Znaki boczne (IALA region A): czerwony walec po LEWEJ, zielony stozek po PRAWEJ - wchodzac od morza</DiagramCaption>
        </Card>
        <Tip>
          В Европе (регион A) при входе с моря красный - СЛЕВА, зелёный - СПРАВА. В США (регион B) наоборот («Red Right
          Returning») - любимая ловушка теста. «Лево/право» считается по направлению знакования (с моря вверх по реке).
        </Tip>
        <Card>
          <CardinalClockDiagram />
          <DiagramCaption>«Часы» кардинальных знаков: обходи со стороны названия; вспышки = час (E=3, S=6+длинная, W=9, N=непрерывно)</DiagramCaption>
        </Card>
        <Table
          head={['Znak', 'Topmark', 'Swiatlo (biale)', 'Mijaj od']}
          rows={[
            ['N (polnoc)', 'oba stozki w GORE', 'Q/VQ ciagle', 'polnocy (12:00)'],
            ['E (wschod)', 'podstawami razem («jajko»)', 'VQ(3) / Q(3)', 'wschodu (3:00)'],
            ['S (poludnie)', 'oba stozki w DOL', 'VQ(6)+LFl / Q(6)+LFl', 'poludnia (6:00)'],
            ['W (zachod)', 'wierzcholkami razem («kieliszek»)', 'VQ(9) / Q(9)', 'zachodu (9:00)'],
          ]}
        />
        <Tip>
          Мнемоника: конусы «смотрят» на чёрную полосу: N - чёрный сверху (конусы вверх), S - снизу (вниз), E - сверху и снизу
          («яйцо»), W - в середине («бокал», W = wine). Юг получил дополнительную длинную вспышку, чтобы в тумане не спутать с W.
        </Tip>
        <Card title="Inne znaki / Другие знаки">
          <Fact q="Znak odosobnionego niebezpieczenstwa" a="czarno-czerwony, 2 czarne kule, swiatlo Fl(2)" ru="Отдельная опасность: обходить с любой стороны на расстоянии." />
          <Fact q="Znak bezpiecznej wody (srodek toru)" a="czerwono-biale pasy pionowe, czerwona kula" ru="Осевой знак: вода чиста со всех сторон." />
          <Fact q="Tablice srodladowe" a="czerwona obwodka = zakaz/nakaz/ograniczenie; niebieska = informacja" ru="Красный кант - запрет/предписание; синие - информация." />
          <Fact q="Grupy znakow zeglugowych" a="A = zakazu, B = nakazu, C = ograniczenia, D = zalecenia, E = informacyjne" ru="Группы: A запрет, B предписание, C ограничение, D рекомендация, E информация." />
          <Fact q="Mijanie poglebiarki / przeszkody" a="po stronie z DWOMA zielonymi swiatlami/rombami" ru="Земснаряд обходят со стороны двух зелёных огней/ромбов; красный/шар = сторона закрыта." />
          <Fact q="Przekreslona kotwica" a="zakaz kotwiczenia" ru="Якорь запрещён (кабели на дне)." />
          <Fact q="Znak «zakaz fali»" a="plyn tak wolno, by nie wytwarzac falowania" ru="Сбрось скорость до отсутствия волны." />
          <Fact q="Sluza - wjazd" a="tylko na zielone swiatlo" ru="В шлюз - только на зелёный." />
        </Card>

        <h3 className="mb-2 mt-6 text-base font-semibold" style={{ color: 'var(--text-primary)' }}>
          🚦 {tp('Как выглядят знаки (IALA, регион A)', 'What the marks look like (IALA region A)', 'Jak wygladaja znaki (IALA region A)')}
        </h3>
        <IalaGallery />
        <DiagramCaption>
          {tp(
            'Боковые (красный цилиндр слева / зелёный конус справа при входе с моря), кардинальные N/E/S/W, отдельная опасность, чистая вода, специальный.',
            'Lateral (red can to port / green cone to starboard entering from sea), cardinal N/E/S/W, isolated danger, safe water, special.',
            'Boczne (czerwony walec po lewej / zielony stozek po prawej od morza), kardynalne N/E/S/W, odosobnione niebezpieczenstwo, bezpieczna woda, specjalny.',
          )}
        </DiagramCaption>

        <h3 className="mb-2 mt-6 text-base font-semibold" style={{ color: 'var(--text-primary)' }}>
          🪧 {tp('Береговые таблички (внутренние воды)', 'Inland shore signs', 'Tablice srodladowe')}
        </h3>
        <InlandSignsGallery />
        <DiagramCaption>
          {tp(
            'Красный кант = запрет/предписание/ограничение; синий фон = информация. Форму и символ надо узнавать на экзамене.',
            'Red border = prohibition/mandatory/restriction; blue ground = information. You must recognize shape + symbol on the exam.',
            'Czerwona obwodka = zakaz/nakaz/ograniczenie; niebieskie tlo = informacja.',
          )}
        </DiagramCaption>
      </Section>

      {/* 5. NAWIGACJA W PRAKTYCE --------------------------------------------- */}
      <Section {...SECTIONS[4]}>
        <div className="grid gap-3 sm:grid-cols-2">
          <Card>
            <NabieznikDiagram />
            <DiagramCaption>Nabieznik (створ): wyzszy znak nad nizszym = jestes na osi</DiagramCaption>
          </Card>
          <Card>
            <RiverDiagram />
            <DiagramCaption>Rzeka: trzymaj prawej strony; z pradem = pierwszenstwo</DiagramCaption>
          </Card>
          <Card>
            <OpenWaterDiagram />
            <DiagramCaption>Otwarta woda: znak N mijaj od polnocy, S od poludnia</DiagramCaption>
          </Card>
          <Card>
            <PortEntryDiagram />
            <DiagramCaption>Wejscie do portu (region A): czerwony po lewej, wolno, trzymaj prawej</DiagramCaption>
          </Card>
        </div>
        <Tip>
          Частые ошибки: 1) путают регион A и B; 2) считают «лево/право» по своему курсу, а не по направлению знакования;
          3) срезают над мелью у кардинального знака - обходи со стороны его названия; 4) на повороте реки уходят на левую
          сторону - держись правой кромки фарватера.
        </Tip>
        <Card title="Sluzowanie krok po kroku / Шлюзование по шагам">
          <ol className="list-decimal space-y-1 pl-5 text-sm" style={{ color: 'var(--text-secondary)' }}>
            <li>Подойди к шлюзу медленно, жди перед воротами (czekaj przed sluza).</li>
            <li>Входи только на зелёный сигнал (zielone swiatlo). Красный - стоп.</li>
            <li>В камере пришвартуйся к стенке (cumowanie), заглуши двигатель, надень жилет.</li>
            <li>При изменении уровня воды подбирай/потравливай концы (trzymaj cumy), не крепи наглухо.</li>
            <li>Якорь в шлюзе запрещён. Выходи по сигналу, по очереди прибытия (уступая уполномоченным).</li>
          </ol>
        </Card>
      </Section>

      {/* 6. BUDOWA ------------------------------------------------------------ */}
      <Section {...SECTIONS[5]}>
        <div className="grid gap-3 sm:grid-cols-2">
          <Card>
            <BoatTopDiagram />
            <DiagramCaption>Widok z gory: bakburta = лево (красный), sterburta = право (зелёный)</DiagramCaption>
          </Card>
          <Card>
            <BoatSideDiagram />
            <DiagramCaption>Przekroj: forpik na dziobie, achterpik na rufie, zeza najnizej</DiagramCaption>
          </Card>
        </div>
        <Table
          head={['Termin PL', 'По-русски', 'Przyklad']}
          rows={[
            ['Dziob / Rufa', 'нос / корма', 'Idz na dziob rzucic cume'],
            ['Sterburta / Bakburta', 'правый / левый борт', 'Mijamy sie bakburtami'],
            ['Kadlub', 'корпус', 'Kadlub z laminatu'],
            ['Pawez', 'транец', 'Silnik zaburtowy wisi na pawezy'],
            ['Kil / Stepka', 'киль', 'Stepka chroni dno'],
            ['Zeza', 'льяло (самое низкое место)', 'Wypompuj wode z zezy'],
            ['Forpik / Achterpik', 'носовой / кормовой отсек', 'Kotwica lezy w forpiku'],
            ['Denniki', 'флоры (киль-шпангоуты)', 'Denniki wzmacniaja dno'],
            ['Pokladniki', 'бимсы (палуба-шпангоуты)', 'Pokladniki podtrzymuja poklad'],
            ['Nadburcie', 'фальшборт', 'Nadburcie chroni przed zalaniem'],
            ['Kluza', 'клюз', 'Cuma przechodzi przez kluze'],
            ['Knaga / Poler', 'утка / пал', 'Zawiaz cume na knadze'],
            ['Handreling', 'поручень', 'Trzymaj sie handrelingu na fali'],
            ['Koja / Keja', 'койка / причал (ловушка!)', 'Spisz w koi, cumujesz przy kei'],
            ['Mesa / Kambuz', 'кают-компания / камбуз', 'Obiad w mesie, gotujesz w kambuzie'],
            ['Wolna burta', 'надводный борт', 'Wysokosc od wody do pokladu'],
            ['Zanurzenie', 'осадка', 'Od linii wody do najnizszego punktu'],
          ]}
        />
        <Tip>
          Пары-ловушки, которые любит экзамен: koja (койка) ≠ keja (причал); zeza (льяло) ≠ stewa (штевень);
          denniki (киль-шпангоуты) ≠ pokladniki (палуба-шпангоуты). Выучи именно эти пары.
        </Tip>
      </Section>

      {/* 7. SILNIKI ------------------------------------------------------------ */}
      <Section {...SECTIONS[6]}>
        <Card title="Fakty / Факты">
          <Fact q="1 kW = ?" a="1,36 KM (konia mechanicznego)" ru="1 кВт = 1,36 л.с.; обратно 1 л.с. = 0,735 кВт." />
          <Fact q="Four stroke / two stroke" a="czterosuwowy (czysta benzyna) / dwusuwowy (mieszanka)" ru="4-тактный - чистый бензин; 2-тактный - смесь бензина с маслом, нет масляного поддона (miski olejowej)." />
          <Fact q="Otwor kontrolny przy pracy" a="delikatnie sika ciepla woda" ru="Струйка воды = охлаждение работает. Нет струйки - глуши!" />
          <Fact q="Chlodzenie silnika zaburtowego" a="woda zaburtowa (pompa z wirnikiem)" ru="Охлаждение забортной водой." />
          <Fact q="Naprzod -> wstecz od razu" a="zabronione - najpierw luz (neutral)" ru="Резкий реверс ломает редуктор: нейтраль, пауза, назад." />
          <Fact q="Przed wylaczeniem silnika" a="obroty na minimum + bieg jalowy" ru="Сбрось обороты, нейтраль, потом глуши." />
          <Fact q="Trym silnika" a="kat silnika wzgledem pawezy" ru="Трим - угол мотора к транцу; влияет на ход и расход." />
          <Fact q="Kill switch (linka)" a="zatrzymuje silnik po wypadnieciu sternika" ru="Шнур на запястье глушит мотор, если рулевой выпал. Всегда пристёгнут!" />
          <Fact q="Przed startem (zbiornik przenosny)" a="otworz odpowietrznik, podpompuj gruszka, luz, sruba w wodzie" ru="Открыть сапун, подкачать грушей, нейтраль, винт в воде." />
          <Fact q="Przegrzanie" a="obroty w dol / stop, sprawdz pobor wody" ru="Сбрось обороты, проверь забор воды (водоросли, пакет)." />
        </Card>
      </Section>

      {/* 8. MANEWRY ------------------------------------------------------------ */}
      <Section {...SECTIONS[7]}>
        <Card>
          <PropWalkDiagram />
          <DiagramCaption>Efekt sruby (prop walk) na biegu wstecznym - widok od rufy</DiagramCaption>
        </Card>
        <Table
          head={['Lina', 'Co robi', 'По-русски']}
          rows={[
            ['Cuma dziobowa / rufowa', 'trzyma dziob/rufe przy kei', 'носовой / кормовой швартов'],
            ['Szpring', 'wzdluz burty - blokuje przesuwanie wzdluz kei', 'шпринг - от продольного смещения'],
            ['Brest', 'prostopadle do burty - dociska do kei', 'прижимной конец'],
          ]}
        />
        <Card title="Fakty / Факты">
          <Fact q="Predkosc manewrow w porcie" a="minimalna zapewniajaca sterownosc" ru="Минимальная, при которой лодка слушается руля." />
          <Fact q="Silny wiatr w porcie" a="manewruj zdecydowanie - wieksza predkosc = mniejszy dryf" ru="Решительнее: выше скорость - меньше снос." />
          <Fact q="Sruba prawoskretna wstecz" a="rufa idzie w LEWO" ru="Правый винт назад - корма влево. Используй при швартовке." />
          <Fact q="Lancuch kotwiczny" a="3-5 glebokosci (3 m -> 9-15 m)" ru="Цепь = 3-5 глубин." />
          <Fact q="Podejscie do boi / kei" a="pod wiatr lub pod prad (silniejszy czynnik)" ru="Подходи против ветра или течения - что сильнее." />
          <Fact q="Sztrandowanie" a="celowe osadzenie na mieliznie" ru="Намеренная посадка на мель (авария)." />
          <Fact q="Holowanie - predkosc ustala" a="kapitan holujacego" ru="Скорость задаёт буксировщик." />
          <Fact q="Ster strumieniowy" a="pednik poprzeczny na dziobie" ru="Носовая подрулька для порта." />
          <Fact q="Kotwiczenie zabronione" a="na szlaku zeglownym, przy kablach, w sluzach" ru="Не якорись на фарватере и у кабелей." />
        </Card>
      </Section>

      {/* 9. LOCJA ---------------------------------------------------------------- */}
      <Section {...SECTIONS[8]}>
        <Tip>
          Mila morska = 1852 m = 1 minuta szerokosci. 1 stopien = 60 minut. Wezel = 1 Mm/h.
          По-русски: миля 1852 м; узел = миля в час; 1 градус = 60 минут; 1 минута широты = 1 миля.
        </Tip>
        <Table
          head={['Termin / przyrzad', 'Znaczenie', 'По-русски']}
          rows={[
            ['Echosonda', 'mierzy glebokosc', 'эхолот - глубина'],
            ['Log', 'mierzy predkosc po wodzie', 'лаг - скорость по воде'],
            ['Namiar', 'kierunek NA obiekt', 'пеленг - направление на объект'],
            ['Kurs', 'kierunek ruchu statku', 'курс - направление движения'],
            ['GPS', 'wspolrzedne + COG + SOG (nad dnem)', 'координаты, путевой угол и скорость ОТНОСИТЕЛЬНО ДНА'],
            ['Sluza', 'pokonuje roznice poziomow wody', 'шлюз - разные уровни воды'],
            ['Locja', 'opis drog wodnych i oznakowania', 'лоция - описание вод и знаков'],
            ['Charakterystyki swiatel', 'Fl = blaskowe, Oc = przeslonowe, Iso = izofazowe, Q = migajace; Fl(2) 10s = 2 blyski co 10 s', 'Fl проблесковый, Oc затмевающийся, Iso изофазный, Q частый'],
          ]}
        />
        <Tip>
          GPS не заменяет глаза и карту: позиция может врать, COG/SOG - относительно дна, а не воды. На тесте:
          «Czy nawigacje mozna oprzec wylacznie na GPS?» - NIE.
        </Tip>
      </Section>

      {/* 10. METEO ----------------------------------------------------------------- */}
      <Section {...SECTIONS[9]}>
        <Card title="Fakty / Факты">
          <Fact q="Barometr / anemometr" a="cisnienie / predkosc wiatru" ru="Барометр - давление; анемометр - ветер." />
          <Fact q="Nagly spadek cisnienia" a="nadchodzi sztorm" ru="Резкое падение давления = шторм близко." />
          <Fact q="Wiatr wieje" a="od wyzu do nizu" ru="Из высокого давления в низкое." />
          <Fact q="6 B (Beaufort)" a="22-27 wezlow" ru="6 баллов = 22-27 узлов; для малых лодок уже опасно." />
          <Fact q="Flauta (sztil)" a="zupelny brak wiatru" ru="Штиль - 0 баллов." />
          <Fact q="Szkwal" a="nagly silny poryw wiatru" ru="Шквал - резкое усиление, часто перед грозой." />
          <Fact q="Bryza dzienna / nocna" a="dniem od wody na lad, noca od ladu na wode" ru="Днём с воды на сушу, ночью наоборот." />
          <Fact q="Cumulonimbus (Cb)" a="szkwaly, burza, ulewa" ru="Кучево-дождевое: увидел «наковальню» - к берегу." />
        </Card>

        <h3 className="mb-2 mt-6 text-base font-semibold" style={{ color: 'var(--text-primary)' }}>
          📷 {tp('Как читать небо (реальные фото)', 'Read the sky (real photos)', 'Jak czytac niebo (zdjecia)')}
        </h3>
        <CloudPhotos />
        <DiagramCaption>
          {tp(
            'Слева направо - от хорошей погоды к опасной. Cumulonimbus и вал шквала (shelf cloud) = уходи к берегу; туман = включай огни и сигналы.',
            'Left to right - from fair to dangerous. Cumulonimbus and a shelf cloud mean head to shore; fog means lights and signals on.',
            'Od lewej do prawej - od ladnej do groznej pogody. Cumulonimbus i shelf cloud = wracaj do brzegu; mgla = swiatla i sygnaly.',
          )}
        </DiagramCaption>

        <h3 className="mb-2 mt-6 text-base font-semibold" style={{ color: 'var(--text-primary)' }}>
          ☁️ {tp('Схемы облаков', 'Cloud diagrams', 'Schematy chmur')}
        </h3>
        <CloudsGallery />
        <DiagramCaption>
          {tp(
            'Cumulus - хорошая погода; Cumulonimbus («наковальня») - гроза и шквалы, уходи к берегу; Cirrus - приближается тёплый фронт; Stratus/Nimbostratus - обложной дождь.',
            'Cumulus - fair weather; Cumulonimbus (anvil) - storm and squalls, head to shore; Cirrus - warm front approaching; Stratus/Nimbostratus - steady rain.',
            'Cumulus - ladna pogoda; Cumulonimbus (kowadlo) - burza i szkwaly, wracaj do brzegu; Cirrus - nadchodzi front cieply; Stratus/Nimbostratus - opady ciagle.',
          )}
        </DiagramCaption>

        <h3 className="mb-2 mt-6 text-base font-semibold" style={{ color: 'var(--text-primary)' }}>
          🌡️ {tp('Фронты и давление', 'Fronts and pressure', 'Fronty i cisnienie')}
        </h3>
        <FrontsPressureGallery />
        <DiagramCaption>
          {tp(
            'Тёплый фронт (красные полукруги) - медленное потепление; холодный (синие треугольники) - шквалы; W (wyz) = высокое давление, ясно; N (niz) = низкое, ветер и осадки. Ветер дует из W в N.',
            'Warm front (red semicircles) slow warming; cold (blue triangles) squalls; W (high) clear; N (low) wind and rain. Wind blows from high to low.',
            'Front cieply (czerwone polkola) - powolne ocieplenie; chlodny (niebieskie trojkaty) - szkwaly; W (wyz) - wysokie cisnienie, pogodnie; N (niz) - niskie, wiatr i opady. Wiatr wieje od wyzu do nizu.',
          )}
        </DiagramCaption>

        <h3 className="mb-2 mt-6 text-base font-semibold" style={{ color: 'var(--text-primary)' }}>
          🌬️ {tp('Бризы', 'Breezes', 'Bryzy')}
        </h3>
        <BreezeGallery />
        <DiagramCaption>
          {tp('Днём суша теплее - бриз с воды на сушу; ночью наоборот - с суши на воду.', 'By day land is warmer - breeze from water to land; by night the reverse.', 'W dzien lad cieplejszy - bryza od wody na lad; noca odwrotnie.')}
        </DiagramCaption>

        <h3 className="mb-2 mt-6 text-base font-semibold" style={{ color: 'var(--text-primary)' }}>
          🌪️ {tp('Шкала Бофорта (0-12)', 'Beaufort scale (0-12)', 'Skala Beauforta (0-12)')}
        </h3>
        <p className="mb-2 text-sm" style={{ color: 'var(--text-secondary)' }}>
          {tp(
            'Skala Beauforta (0-12) opisuje siłę wiatru. Шкала Бофорта (0-12) описывает силу ветра по его действию на воду. Для малых лодок 6 баллов - уже предел, при 8+ на воду не выходят.',
            'The Beaufort scale (0-12) describes wind force by its effect on the water. For small boats 6 is already the limit; at 8+ you do not go out.',
            'Skala Beauforta (0-12) opisuje sile wiatru wg jego dzialania na wode. Dla malych lodzi 6 to juz granica, przy 8+ nie wyplywa sie.',
          )}
        </p>
        <Table
          head={['B', 'Nazwa (PL / RU)', 'Wezly / m/s', 'Morze / Море']}
          rows={[
            ['0', 'Cisza / штиль', '< 1 kn', 'lustro wody / гладь'],
            ['1', 'Powiew / тихий', '1-3 kn', 'zmarszczki / рябь'],
            ['2', 'Slaby / лёгкий', '4-6 kn', 'male fale / мелкие волны'],
            ['3', 'Lagodny / слабый', '7-10 kn', 'grzywacze zaczynaja sie lamac / барашки'],
            ['4', 'Umiarkowany / умеренный', '11-16 kn', 'male fale, biale grzywy / белые гребни'],
            ['5', 'Dosc silny / свежий', '17-21 kn', 'umiarkowane fale / умеренные волны'],
            ['6', 'Silny / сильный', '22-27 kn', 'duze fale, piana / крупные волны, пена'],
            ['7', 'Bardzo silny / крепкий', '28-33 kn', 'morze się piętrzy / волны громоздятся'],
            ['8', 'Sztormowy / очень крепкий', '34-40 kn', 'wichura, wysokie fale / шторм'],
            ['9', 'Silnie sztormowy / шторм', '41-47 kn', 'bardzo wysokie fale / очень высокие'],
            ['10', 'Sztorm / сильный шторм', '48-55 kn', 'ogromne fale / огромные волны'],
            ['11', 'Gwaltowny sztorm / жестокий', '56-63 kn', 'wyjatkowo wysokie fale / исключит.'],
            ['12', 'Huragan / ураган', '> 64 kn', 'powietrze pelne piany / всё в пене'],
          ]}
        />
        <Tip>
          Запомни ключевое для теста: 6°B = 22-27 узлов (сильный ветер, для малой лодки уже опасно). Резкий рост
          силы ветра + Cumulonimbus/вал шквала = немедленно к берегу.
        </Tip>
      </Section>

      {/* 11. RATOWNICTWO ------------------------------------------------------------ */}
      <Section {...SECTIONS[10]}>
        <Card>
          <MobDiagram />
          <DiagramCaption>Manewr «czlowiek za burta» (MOB): alarm, kolo, obserwator, podejscie pod wiatr, silnik na luz przy osobie</DiagramCaption>
        </Card>
        <Card title="Pierwsza pomoc / Первая помощь">
          <Fact q="RKO (resuscytacja)" a="30 ucisniec (100-120/min) + 2 wdechy" ru="СЛР 30:2, темп 100-120 в минуту." />
          <Fact q="Nieprzytomny - najpierw" a="sprawdz oddech i droznosc drog oddechowych" ru="Сначала дыхание; дышит - боковое положение." />
          <Fact q="Nieprzytomny, oddycha" a="pozycja boczna ustalona" ru="Устойчивое боковое положение." />
          <Fact q="Przedmiot w ranie" a="NIE usuwac - ustabilizowac, do lekarza" ru="Нож/предмет не вынимать!" />
          <Fact q="Krwotok tetniczy" a="jasna, pulsujaca krew - mocny ucisk" ru="Яркая пульсирующая кровь - прямое прижатие." />
          <Fact q="Wychlodzony z wody" a="bez alkoholu; suche ubranie, cieply napoj" ru="Алкоголь запрещён; сухое, тёплое, постепенно." />
          <Fact q="Oparzenie" a="chlodzic woda, jalowy opatrunek" ru="Охлаждать водой, стерильная повязка." />
          <Fact q="Kolo ratunkowe" a="przez glowe, pod ramiona" ru="Через голову под мышки." />
        </Card>
        <Table
          head={['Sluzba / sygnal', 'Znaczenie']}
          rows={[
            ['SAR', 'morska sluzba poszukiwania i ratownictwa / морское спасание'],
            ['WOPR', 'ratownictwo na wodach srodladowych / внутренние воды'],
            ['601 100 100', 'numer ratunkowy nad woda (oraz 112) / номер спасения на воде'],
            ['Kanal 16 VHF', 'wywolawczy i alarmowy / вызов и бедствие'],
            ['MAYDAY', 'bezposrednie zagrozenie zycia lub statku / прямая угроза жизни'],
            ['PAN-PAN', 'pilnosc, ale bez zagrozenia zycia / срочность без угрозы жизни'],
            ['SECURITE', 'komunikat o bezpieczenstwie (pogoda, przeszkoda) / сообщение о безопасности'],
            ['SOS', '. . . - - - . . . (swietlny/dzwiekowy)'],
            ['Ratowanie zycia na wodzie', 'bezplatne / бесплатно'],
          ]}
        />
        <Tip>
          MAYDAY - три раза на 16 канале, затем название судна, позиция, характер опасности, число людей, нужна ли помощь.
          PAN-PAN - когда срочно, но жизни ничто не угрожает (поломка, буксировка). SECURITE - предупреждение (погода, препятствие).
        </Tip>
      </Section>

      {/* 12. SRODOWISKO --------------------------------------------------------------- */}
      <Section {...SECTIONS[11]}>
        <Card title="Zasada: nic za burte / Принцип: ничего за борт">
          <Fact q="Tankowanie" a="tylko przy wylaczonym silniku, bez rozlewania" ru="Заправка - только с заглушенным мотором." />
          <Fact q="Zeza silnikowa w porcie" a="nie wypompowywac za burte" ru="Льяльные воды - не за борт (нефтепродукты)." />
          <Fact q="WC chemiczne" a="oprozniac tylko w punktach w portach" ru="Химтуалет - только в спецточки." />
          <Fact q="Smieci" a="selektywna zbiorka na ladzie" ru="Мусор - в раздельный сбор на берегу." />
          <Fact q="Srodki czystosci" a="biodegradowalne" ru="Только биоразлагаемая химия." />
          <Fact q="Strefa ciszy" a="zakaz silnikow spalinowych" ru="Зона тишины: ДВС запрещены." />
        </Card>
      </Section>

      {/* 13. PRAKTYKA ------------------------------------------------------------------- */}
      <Section {...SECTIONS[12]}>
        <Card title="Co sprawdza egzaminator / Что проверяет экзаменатор">
          <ul className="list-disc space-y-1 pl-5 text-sm" style={{ color: 'var(--text-secondary)' }}>
            <li>Manewrowanie: spotkanie z innym jachtem i wyprzedzanie, odejscie od nadbrzeza i dojscie, plywanie kursem prostym i cyrkulacja (zalacznik nr 4 do rozporzadzenia).</li>
            <li>Alarm «czlowiek za burta» - najwazniejszy manewr: alarm, kolo, obserwator, podejscie pod wiatr, silnik na luz przy osobie.</li>
            <li>Kotwiczenie i cumowanie w roznych warunkach (praca cumami: brest, szpring).</li>
            <li>Kierowanie zaloga: wydawanie komend, praca w charakterze czlonka zalogi, podstawowe prace bosmanskie.</li>
            <li>Przygotowanie lodzi: paliwo, kamizelki, kill switch, srodki ratunkowe.</li>
          </ul>
          <p className="mt-2 text-xs" style={{ color: 'var(--text-muted)' }}>
            Zle wykonany element mozna powtorzyc JEDEN raz (par. 17 ust. 11). Nie ma ustawowego minimum mocy/dlugosci lodzi
            egzaminacyjnej - to zalezy od osrodka. / Неудавшийся манёвр можно повторить один раз; параметры лодки закон не задаёт.
          </p>
        </Card>
        <Table
          head={['Wezel', 'Zastosowanie / По-русски']}
          rows={[
            ['Osemka', 'stoper na koncu liny / восьмёрка - стопорный узел'],
            ['Ratowniczy (bulina, skrajny tatrzanski)', 'niezaciskajaca sie petla / булинь - незатягивающаяся петля'],
            ['Knagowy', 'mocowanie cumy na knadze / крепление на утке'],
            ['Plaski (refowy)', 'laczenie dwoch lin / прямой - связать два конца'],
            ['Wyblinka', 'mocowanie do pala/relingu / выбленочный'],
          ]}
        />
        <Tip>
          На практике безопасность важнее красоты: малый газ в порту, kill switch пристёгнут, жилет надет,
          у человека в воде - мотор на нейтраль. Экзаменатор прощает кривую швартовку, но не винт у пловца.
        </Tip>
      </Section>

      {/* 14. SCIAGA ------------------------------------------------------------------------ */}
      <Section {...SECTIONS[13]}>
        <Card>
          <ul className="list-disc space-y-1.5 pl-5 text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
            <li>Расхождение: моторка уступает всем; встречные - вправо, левыми бортами; при пересечении уступаешь тому, кто справа.</li>
            <li>Огни: левый красный, правый зелёный (112,5); мачтовый 225; кормовой белый 135; на якоре - белый круговой.</li>
            <li>Сигналы: 1 короткий - вправо, 2 - влево, 3 - задний ход, 5+ - опасность; длинные повторяющиеся - бедствие.</li>
            <li>Кардинальные: обходи со стороны названия; N ▲▲ (непрерывные), E «яйцо» (3), S ▼▼ (6+длинная), W «бокал» (9).</li>
            <li>Боковые (регион A): красный цилиндр - слева, зелёный конус - справа (вход с моря). В США наоборот.</li>
            <li>Меры: 1 миля = 1852 м; узел = миля/час; 1 градус = 60 минут; 1 кВт = 1,36 л.с.</li>
            <li>Винт назад: правый - корма влево. Река: вниз по течению - приоритет; держись правой стороны.</li>
            <li>Порт: выходящий имеет приоритет; манёвры на минимальной скорости со сохранением управляемости.</li>
            <li>СЛР 30:2 (100-120/мин); предмет в ране не вынимать; алкоголь переохлаждённому нельзя; 601 100 100 / 112.</li>
            <li>Экология: ничего за борт; заправка при выключенном моторе; химтуалет - в спецточки.</li>
            <li>Патент: internal без лимита (до 16 лет - 60 кВт); море - 12 м / 2 Mm / день. Без патента: до 10 кВт (или хаусбот до 75 кВт / 13 м / 15 км/ч).</li>
          </ul>
        </Card>
        <Tip>
          На экзамене: читай вопрос до конца - часто решает слово «nie / zabronione». Сомневаешься - выбирай более
          осторожный, безопасный вариант. Помечай сложные вопросы и возвращайся: 90 минут на 75 вопросов - времени хватает.
          Powodzenia! 🍀
        </Tip>
        <div className="mt-4 flex flex-wrap gap-2">
          <Link
            href="/sternik/test"
            className="rounded-xl px-5 py-2.5 text-sm font-semibold"
            style={{ background: 'var(--accent-cyan)', color: '#04222e' }}
          >
            🎯 {tp('Закрепить в тренажёре', 'Drill it in the trainer', 'Utrwal w treningu')}
          </Link>
          <Link
            href="/sternik/egzamin"
            className="rounded-xl px-5 py-2.5 text-sm font-semibold"
            style={{ background: 'var(--bg-card)', color: 'var(--text-primary)', border: '1px solid var(--border-subtle)' }}
          >
            ⏱️ {tp('Пробный экзамен', 'Mock exam', 'Probny egzamin')}
          </Link>
        </div>
      </Section>

      <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
        Material przygotowany na podstawie tematow bazy pytan PZMWiNW (sternik motorowodny), rozporzadzenia MSiT z 9.04.2013
        i przepisow zeglugowych. Konspekt pomocniczy - aktualne wymagania sprawdz u organizatora egzaminu.
      </p>
    </main>
  );
}
