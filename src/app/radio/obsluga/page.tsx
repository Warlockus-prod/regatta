'use client';

import type { ReactNode } from 'react';
import Link from 'next/link';
import { useI18n } from '@/lib/i18n';
import { CYRILLIC_RE, usePlOnly } from '../../sternik/plOnly';
import MicCheck from '../MicCheck';
import InteractiveRadioCourse from './InteractiveRadioCourse';

// ============================================================================
// /radio/obsluga - a full operating + maintenance guide to a marine VHF set:
// what every control does and WHY, how to make a call, squelch, DSC/MMSI,
// antenna and range, how to service/maintain the radio, and troubleshooting.
// Includes the browser microphone check (voice grading needs mic permission).
// Content PL (ASCII) + RU commentary, per the sternik language policy.
// ============================================================================

const CYAN = 'var(--accent-cyan)';

function Section({ id, num, pl, ru, children }: { id: string; num: number; pl: string; ru: string; children: ReactNode }) {
  const { lang } = useI18n();
  return (
    <section id={id} className="mb-10 scroll-mt-24">
      <h2 className="mb-1 text-xl font-bold" style={{ color: 'var(--text-primary)' }}>{num}. {pl}</h2>
      {lang === 'ru' && <div className="mb-3 text-sm" style={{ color: 'var(--text-muted)' }}>{ru}</div>}
      {children}
    </section>
  );
}

function Card({ children, title }: { children: ReactNode; title?: string }) {
  const plOnly = usePlOnly();
  return (
    <div className="mb-4 rounded-2xl p-4" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)' }}>
      {title && <div className="mb-2 text-sm font-semibold" style={{ color: CYAN }}>{plOnly(title)}</div>}
      {children}
    </div>
  );
}

function Tip({ children, tone = 'info' }: { children: ReactNode; tone?: 'info' | 'warn' }) {
  const warn = tone === 'warn';
  return (
    <div
      className="mb-4 rounded-xl px-4 py-3 text-sm leading-relaxed"
      style={{
        background: warn ? 'rgba(255,85,102,0.08)' : 'rgba(0,212,255,0.07)',
        border: `1px solid ${warn ? 'rgba(255,85,102,0.3)' : 'rgba(0,212,255,0.25)'}`,
        color: 'var(--text-secondary)',
      }}
    >
      {children}
    </div>
  );
}

function Table({ head, rows }: { head: string[]; rows: string[][] }) {
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
            {fHead.map((h) => <th key={h} className="px-3 py-2 text-left font-semibold" style={{ color: CYAN }}>{h}</th>)}
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

/** A checklist card: title + list of PL/RU bullet strings (RU dropped off-RU). */
function Checklist({ title, items }: { title: string; items: string[] }) {
  const plOnly = usePlOnly();
  return (
    <Card title={title}>
      <ul className="space-y-1.5 pl-1 text-sm" style={{ color: 'var(--text-secondary)' }}>
        {items.map((it, i) => (
          <li key={i} className="flex gap-2">
            <span style={{ color: CYAN }}>▢</span>
            <span>{plOnly(it)}</span>
          </li>
        ))}
      </ul>
    </Card>
  );
}

export default function RadioGuidePage() {
  const { tp, lang } = useI18n();

  return (
    <main id="radio-guide">
      <h1 className="mb-1 text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>
        🛠️ {tp('Путеводитель по рации: что, зачем и как обслуживать', 'Radio guide: what, why and how to maintain it', 'Poradnik radia: co, po co i jak obslugiwac')}
      </h1>
      <p className="mb-5 text-sm" style={{ color: 'var(--text-secondary)' }}>
        {tp(
          'Полная инструкция по морской УКВ-рации: что делает каждая кнопка и зачем, как выйти в эфир, как настроить шумоподавитель, что такое DSC/MMSI, почему антенна решает дальность и как рацию обслуживать. Плюс проверка микрофона для голосового режима симулятора.',
          'A full guide to a marine VHF set: what each control does and why, how to get on air, squelch, DSC/MMSI, why the antenna decides your range, and how to service the radio. Plus a mic check for the simulator voice mode.',
          'Pelny poradnik do radia VHF: co robi kazdy przycisk i po co, jak nadawac, squelch, DSC/MMSI, dlaczego antena decyduje o zasiegu i jak radio konserwowac. Plus sprawdzenie mikrofonu do trybu glosowego symulatora.',
        )}
      </p>

      <InteractiveRadioCourse />

      {/* TOC */}
      <nav className="mb-8 grid gap-1 rounded-2xl p-4 sm:grid-cols-2" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)' }}>
        {[
          ['interaktywny-kurs', 'Kurs interaktywny', 'Интерактивный курс'],
          ['mikrofon', '0. Sprawdz mikrofon', 'Проверка микрофона'],
          ['budowa', '1. Budowa radia - co i po co', 'Устройство рации'],
          ['squelch', '2. Squelch (blokada szumow)', 'Шумоподавитель'],
          ['lacznosc', '3. Jak nadawac i odbierac', 'Как вести связь'],
          ['dsc', '4. DSC i numer MMSI', 'DSC и MMSI'],
          ['antena', '5. Antena i zasieg', 'Антенна и дальность'],
          ['konserwacja', '6. Konserwacja i obsluga', 'Обслуживание'],
          ['problemy', '7. Rozwiazywanie problemow', 'Поиск неисправностей'],
          ['sciaga', '8. Szybka sciaga', 'Шпаргалка'],
        ].map(([id, pl, ru]) => (
          <a key={id} href={`#${id}`} className="flex min-h-[40px] items-center rounded-lg px-2 py-1 text-sm transition hover:opacity-80" style={{ color: 'var(--text-secondary)' }}>
            <span style={{ color: CYAN }}>{pl}</span>
            {lang === 'ru' && <span className="text-xs" style={{ color: 'var(--text-muted)' }}>&nbsp;· {ru}</span>}
          </a>
        ))}
      </nav>

      {/* 0. MIC CHECK */}
      <Section id="mikrofon" num={0} pl="Sprawdz mikrofon" ru="Проверка микрофона (для голосового режима)">
        <Tip>
          {tp(
            'Голосовой режим симулятора записывает твой MAYDAY через микрофон браузера и оценивает его. Чтобы это работало: страница должна быть по HTTPS (weektoregatta.com - да) и браузер должен получить разрешение на микрофон. Проверь прямо сейчас - скажи «раз-два» и убедись, что индикатор двигается.',
            'The simulator voice mode records your MAYDAY through the browser microphone and grades it. For this to work the page must be HTTPS (weektoregatta.com is) and the browser must be granted mic permission. Test it now - say "one-two" and check the meter moves.',
            'Tryb glosowy symulatora nagrywa Twoj MAYDAY przez mikrofon przegladarki i ocenia go. Aby dzialal: strona musi byc na HTTPS (weektoregatta.com jest) i przegladarka musi dostac dostep do mikrofonu. Sprawdz teraz - powiedz "raz-dwa" i zobacz, czy wskaznik sie rusza.',
          )}
        </Tip>
        <MicCheck />
        <div className="mt-3">
          <Link href="/radio/symulator" className="inline-flex min-h-[44px] items-center rounded-xl px-4 text-sm font-semibold" style={{ background: 'var(--accent-cyan)', color: 'var(--accent-ink, #04222e)' }}>
            🎙️ {tp('Микрофон работает - в симулятор', 'Mic works - open the simulator', 'Mikrofon dziala - do symulatora')}
          </Link>
        </div>
      </Section>

      {/* 1. ANATOMY */}
      <Section id="budowa" num={1} pl="Budowa radia - co robi kazdy element i po co" ru="Устройство рации: что делает каждый орган и зачем">
        <Table
          head={['Element', 'Co robi', 'Po co / dlaczego']}
          rows={[
            ['PWR / VOL / SQL (pokretlo)', 'wlacza radio (przytrzymanie), reguluje glosnosc i squelch', 'jedno pokretlo, kilka funkcji - przytrzymaj = ON/OFF, krec = glosnosc / выкл-вкл и громкость'],
            ['[16/C]', 'natychmiast kanal 16 (przytrzymanie = kanal wywolawczy)', 'kanal 16 to alarmowy/wywolawczy - musi byc pod reka / мгновенно на аварийный 16'],
            ['[^]/[v] (CH)', 'zmiana kanalu w gore/dol', 'wybor kanalu roboczego / переключение каналов'],
            ['DSC / MENU', 'cyfrowe wywolania i ustawienia', 'stad wysylasz PAN-PAN/SECURITE i konfigurujesz radio / меню DSC и настройки'],
            ['[ENT]/[CLR]/strzalki', 'nawigacja po menu, zatwierdzanie/cofanie', 'obsluga menu DSC / навигация по меню'],
            ['Softkeys (4 klawisze)', 'funkcje zmienne pod wyswietlaczem (SCAN, DW, HI/LO...)', 'skroty do najczestszych funkcji / контекстные кнопки'],
            ['HI / LO', 'moc nadawania 25 W lub 1 W', 'w porcie 1 W, na wodzie 25 W - patrz sekcja antena / мощность 25/1 Вт'],
            ['DW / TRI / SCAN', 'nasluch kilku kanalow naraz / przeszukiwanie', 'slyszysz 16 i swoj roboczy jednoczesnie / двойная вахта и скан'],
            ['DISTRESS (pod oslona)', 'czerwony klawisz alarmu w niebezpieczenstwie', 'oslona chroni przed przypadkowym alarmem - przytrzymaj 3 s / красная кнопка бедствия'],
            ['PTT (na mikrofonie)', 'nacisnij = nadajesz, puscisz = sluchasz', 'radio to simplex - nie da sie mowic i sluchac naraz / нажал - говоришь, отпустил - слушаешь'],
            ['Antena', 'wypromieniowuje i odbiera fale', 'decyduje o zasiegu bardziej niz moc - patrz sekcja 5 / антенна решает дальность'],
          ]}
        />
        <Tip>
          {tp(
            'Главное правило simplex-связи: пока держишь PTT - ты только передаёшь и НЕ слышишь других. Сказал фразу - отпусти кнопку и слушай. Поэтому в конце говорят OVER (жду ответа) или OUT (конец).',
            'The core simplex rule: while you hold PTT you only transmit and cannot hear anyone. Say your bit, release, listen. That is why you end with OVER (expecting a reply) or OUT (finished).',
            'Podstawowa zasada simpleksu: trzymajac PTT tylko nadajesz i NIE slyszysz innych. Powiedz swoje, pusc, sluchaj. Dlatego konczysz OVER (czekam na odpowiedz) albo OUT (koniec).',
          )}
        </Tip>
      </Section>

      {/* 2. SQUELCH */}
      <Section id="squelch" num={2} pl="Squelch - blokada szumow (najczesciej zle ustawiana)" ru="Squelch (шумоподавитель) - чаще всего настраивают неправильно">
        <Card title="Co to jest / Что это">
          <p className="text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
            {tp(
              'Squelch (шумоподавитель) заглушает шипение, когда на канале нет сигнала. Ставишь слишком высоко - не услышишь слабые/далёкие станции (можешь пропустить вызов). Ставишь слишком низко - постоянное шипение утомляет и глушит вахту.',
              'Squelch mutes the hiss when there is no signal on the channel. Set it too high and you miss weak/distant stations (you can miss a call). Too low and constant hiss tires you and drowns the watch.',
              'Squelch wycisza szum, gdy na kanale nie ma sygnalu. Za wysoko - nie uslyszysz slabych/dalekich stacji (mozesz przegapic wywolanie). Za nisko - ciagly szum meczy i zaglusza nasluch.',
            )}
          </p>
        </Card>
        <Tip>
          {tp(
            'Как настроить правильно: 1) убавь squelch до появления шипения; 2) медленно прибавляй ровно до момента, когда шипение ПРОПАДАЕТ; 3) остановись здесь (или чуть-чуть дальше). Это самый чувствительный порог - слабые сигналы всё ещё проходят.',
            'How to set it: 1) lower squelch until you hear hiss; 2) slowly raise it just until the hiss disappears; 3) stop there (or a hair beyond). That is the most sensitive threshold - weak signals still get through.',
            'Jak ustawic: 1) zejdz squelchem az uslyszysz szum; 2) powoli podnos dokladnie do momentu, gdy szum ZNIKA; 3) zatrzymaj sie tu (lub odrobine dalej). To najczulszy prog - slabe sygnaly nadal przejda.',
          )}
        </Tip>
      </Section>

      {/* 3. OPERATION */}
      <Section id="lacznosc" num={3} pl="Jak nadawac i odbierac (zwykla lacznosc)" ru="Как вести обычную связь">
        <Card title="Zwykle wywolanie krok po kroku / Обычный вызов по шагам">
          <ol className="list-decimal space-y-1 pl-5 text-sm" style={{ color: 'var(--text-secondary)' }}>
            <li>{tp('Послушай канал - не занят ли (не перебивай чужой разговор).', 'Listen first - is the channel busy (do not talk over others).', 'Najpierw posluchaj - czy kanal wolny (nie wchodz w cudza rozmowe).')}</li>
            <li>{tp('Вызови на канале 16 или на рабочем канале марины: «[кого], [кого], THIS IS [ты], OVER».', 'Call on 16 or the marina working channel: "[them], [them], THIS IS [you], OVER".', 'Wywolaj na 16 lub na kanale mariny: "[oni], [oni], THIS IS [ty], OVER".')}</li>
            <li>{tp('Договорись перейти на рабочий канал: «go to channel 12». Уйди с 16.', 'Agree a working channel: "go to channel 12". Leave 16.', 'Umowcie sie na kanal roboczy: "go to channel 12". Zejdz z 16.')}</li>
            <li>{tp('Веди разговор по очереди: держишь PTT - говоришь, отпустил - слушаешь. В конце фразы OVER.', 'Talk in turns: hold PTT to speak, release to listen. End each turn with OVER.', 'Rozmawiaj na zmiane: PTT = mowisz, puszczasz = sluchasz. Konczysz OVER.')}</li>
            <li>{tp('Конец связи - OUT (ответа не ждёшь). Не говорят «OVER AND OUT».', 'End with OUT (no reply expected). Never say "OVER AND OUT".', 'Koniec - OUT (nie czekasz na odpowiedz). Nigdy "OVER AND OUT".')}</li>
          </ol>
        </Card>
        <Table
          head={['Zasada', 'Szczegol', 'По-русски']}
          rows={[
            ['Moc', 'w porcie/blisko 1 W, na otwartej wodzie 25 W', 'малая мощность вблизи, полная - на воде'],
            ['Kanal 16', 'tylko wywolanie i alarm, nie rozmowy', 'канал 16 не занимать болтовнёй'],
            ['Kanaly robocze PL', 'mariny/porty 10/12/14 (Gdynia 12, Gdansk 14)', 'рабочие каналы марин Польши'],
            ['Kanal 70', 'tylko DSC - nie mow glosem', 'канал 70 - только цифра, не голос'],
            ['Alfabet', 'literuj nazwy: Alfa Bravo Charlie...', 'сложные слова - по буквам (фонетика)'],
          ]}
        />
      </Section>

      {/* 4. DSC + MMSI */}
      <Section id="dsc" num={4} pl="DSC i numer MMSI - cyfrowa czesc radia" ru="DSC и номер MMSI - цифровая часть рации">
        <Card title="Co to daje / Что это даёт">
          <p className="text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
            {tp(
              'DSC (Digital Selective Calling) - это цифровой слой поверх голоса. Красная кнопка DISTRESS одним нажатием шлёт на канале 70 твой MMSI, позицию (из GPS) и род бедствия - и всё это ещё до того, как ты возьмёшь микрофон. MMSI - это 9-значный «телефонный номер» судна, прошитый в рацию.',
              'DSC (Digital Selective Calling) is a digital layer on top of voice. One press of the red DISTRESS key sends your MMSI, position (from GPS) and nature of distress on channel 70 - before you even pick up the mic. MMSI is a 9-digit "phone number" of the vessel programmed into the radio.',
              'DSC (Digital Selective Calling) to cyfrowa warstwa nad glosem. Jedno wcisniecie czerwonego DISTRESS wysyla na kanale 70 Twoj MMSI, pozycje (z GPS) i rodzaj zagrozenia - zanim wezmiesz mikrofon. MMSI to 9-cyfrowy "numer telefonu" jednostki zaprogramowany w radiu.',
            )}
          </p>
        </Card>
        <Tip tone="warn">
          {tp(
            'MMSI программируется в рацию обычно ОДИН раз (на многих аппаратах его нельзя переписать без сервиса) - не вбивай наугад. Для своей рации на борту нужен MMSI/позывной из разрешения на судовую радиостанцию (в Польше - UKE). Без введённого MMSI функции DSC заблокированы.',
            'The MMSI is usually programmed ONCE (many sets cannot be re-entered without service) - do not guess it. Your own set needs an MMSI/call sign from a ship-station radio licence (in Poland: UKE). Without an MMSI the DSC functions are locked.',
            'MMSI programuje sie zwykle RAZ (w wielu radiach nie da sie zmienic bez serwisu) - nie wpisuj na oslep. Wlasne radio potrzebuje MMSI/znaku z pozwolenia radiowego na stacje statkowa (w Polsce: UKE). Bez MMSI funkcje DSC sa zablokowane.',
          )}
        </Tip>
        <div className="mb-4">
          <Link href="/radio/symulator" className="text-sm" style={{ color: CYAN }}>
            {tp('Отработать DSC-бедствие в симуляторе', 'Practise a DSC distress in the simulator', 'Przecwicz alarm DSC w symulatorze')} {'->'}
          </Link>
        </div>
      </Section>

      {/* 5. ANTENNA */}
      <Section id="antena" num={5} pl="Antena i zasieg - dlaczego to wazniejsze niz moc" ru="Антенна и дальность - почему это важнее мощности">
        <Card title="Zasada / Принцип">
          <p className="text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
            {tp(
              'VHF идёт «по прямой видимости»: дальность зависит в первую очередь от ВЫСОТЫ и качества антенны, а не от ватт. Мачтовая антенна повыше добьёт дальше, чем ручная рация с той же мощностью. Ориентир: судно-судно ~5-10 миль, до береговой станции с высокой антенной - больше.',
              'VHF is "line of sight": range depends first on the HEIGHT and quality of the antenna, not on watts. A masthead antenna reaches far further than a handheld at the same power. Rule of thumb: boat-to-boat ~5-10 NM, to a coast station with a tall antenna - more.',
              'VHF idzie "na widocznosc": zasieg zalezy przede wszystkim od WYSOKOSCI i jakosci anteny, nie od watow. Antena na maszcie signie duzo dalej niz reczne radio o tej samej mocy. Orientacyjnie: statek-statek ~5-10 Mm, do stacji brzegowej z wysoka antena - wiecej.',
            )}
          </p>
        </Card>
        <Tip tone="warn">
          {tp(
            'НИКОГДА не нажимай передачу без подключённой антенны (или с оборванным кабелем) - отражённая мощность может сжечь выходной каскад рации. Проверяй разъёмы: окисленный/влажный контакт = слабый сигнал.',
            'NEVER transmit without a connected antenna (or with a broken cable) - reflected power can burn out the radio final stage. Check the connectors: a corroded/wet contact = weak signal.',
            'NIGDY nie nadawaj bez podlaczonej anteny (lub z urwanym kablem) - odbita moc moze spalic stopien koncowy radia. Sprawdzaj zlacza: skorodowany/wilgotny styk = slaby sygnal.',
          )}
        </Tip>
      </Section>

      {/* 6. MAINTENANCE */}
      <Section id="konserwacja" num={6} pl="Konserwacja i obsluga - zeby dzialalo, gdy trzeba" ru="Обслуживание - чтобы работало, когда нужно">
        <div className="grid gap-3 sm:grid-cols-2">
          <Checklist
            title="Przed kazdym rejsem / Перед каждым выходом"
            items={[
              'Wlacz radio, ustaw kanal 16, sprawdz glosnosc i squelch. / Включи, канал 16, проверь громкость и squelch.',
              'Zrob radio check (na kanale roboczym mariny, nie na 16). / Сделай radio check на рабочем канале.',
              'Reczne: sprawdz naladowanie baterii, wez zapasowa. / Ручная: заряд батареи, возьми запасную.',
              'Sprawdz, czy GPS ma pozycje (ikona na wyswietlaczu). / Проверь, что GPS даёт позицию.',
              'Upewnij sie, ze antena jest podlaczona i zlacze suche. / Убедись: антенна подключена, разъём сухой.',
            ]}
          />
          <Checklist
            title="Regularnie / Регулярно"
            items={[
              'Dokrec i oczysc zlacza antenowe, sprawdz kabel. / Подтяни и очисти антенные разъёмы, проверь кабель.',
              'Po morzu przeplucz reczne slodka woda i wysusz. / После моря промой ручную пресной водой и высуши.',
              'Wytrzasnij wode z glosnika reczniaka (AquaQuake). / Вытряхни воду из динамика (AquaQuake).',
              'Bateria: laduj, nie rozladowuj do zera, przechowuj naladowana. / Батарея: заряжай, не в ноль, храни заряженной.',
              'Staly montaz: sprawdz bezpiecznik i zasilanie 12 V, styki masy. / Стационар: проверь предохранитель, питание 12 В, массу.',
              'Raz na jakis czas: test DSC (test call) do stacji lub znajomego. / Изредка: тестовый DSC-вызов.',
              'Pilnuj aktualnego MMSI i waznego pozwolenia radiowego. / Держи актуальный MMSI и действующее разрешение.',
            ]}
          />
        </div>
        <Tip>
          {tp(
            'Ложные срабатывания DSC - частая проблема из-за коррозии кнопок и влаги. Держи аппарат сухим, а если случайно ушёл сигнал бедствия - немедленно отмени его голосом на 16 (это отрабатывается в симуляторе, сценарий «ложный алерт»).',
            'False DSC alerts are a common problem from button corrosion and moisture. Keep the set dry, and if a distress alert goes out by accident, cancel it at once by voice on 16 (the simulator drills this in the "false alert" scenario).',
            'Falszywe alarmy DSC to czesty problem od korozji przyciskow i wilgoci. Trzymaj radio suche, a jesli alarm poszedl przypadkiem - natychmiast odwolaj go glosem na 16 (cwiczy to symulator, scenariusz "falszywy alert").',
          )}
        </Tip>
      </Section>

      {/* 7. TROUBLESHOOTING */}
      <Section id="problemy" num={7} pl="Rozwiazywanie problemow" ru="Поиск неисправностей">
        <Table
          head={['Objaw', 'Sprawdz', 'По-русски']}
          rows={[
            ['Nie nadaje', 'PTT wcisniete? moc HI? antena podlaczona? bezpiecznik?', 'не передаёт: PTT? мощность HI? антенна? предохранитель?'],
            ['Nic nie slychac', 'squelch za wysoko? glosnosc? dobry kanal? DW wlaczone?', 'ничего не слышно: squelch высок? громкость? канал? DW?'],
            ['Slaby zasieg', 'antena (wysokosc, zlacza, kabel), moc na LO?, przeszkody', 'слабая дальность: антенна, разъёмы, мощность на LO?'],
            ['DSC nie dziala', 'czy MMSI wpisany? GPS ma pozycje?', 'DSC не работает: введён MMSI? есть GPS?'],
            ['Reczne nie laduje', 'styki ladowarki, inny kabel/zasilacz, bateria zuzyta', 'ручная не заряжается: контакты, кабель, износ батареи'],
            ['Przypadkowy alarm', 'odwolaj glosem na 16, nie wylaczaj radia', 'случайный алерт: отмени голосом на 16, не выключай'],
          ]}
        />
      </Section>

      {/* 8. CHEAT SHEET */}
      <Section id="sciaga" num={8} pl="Szybka sciaga" ru="Шпаргалка">
        <div className="grid gap-3 sm:grid-cols-2">
          <Card title="Zapamietaj / Запомни">
            <ul className="space-y-1 pl-4 text-sm" style={{ color: 'var(--text-secondary)', listStyle: 'disc' }}>
              <li>{tp('16 - вызов и бедствие, 70 - только DSC', '16 - calling/distress, 70 - DSC only', '16 - wywolanie/alarm, 70 - tylko DSC')}</li>
              <li>{tp('PTT держишь - говоришь, отпустил - слушаешь', 'hold PTT to talk, release to listen', 'PTT - mowisz, puszczasz - sluchasz')}</li>
              <li>{tp('OVER - жду ответа, OUT - конец', 'OVER - expecting reply, OUT - finished', 'OVER - czekam, OUT - koniec')}</li>
              <li>{tp('в порту 1 Вт, на воде 25 Вт', 'port 1 W, open water 25 W', 'port 1 W, woda 25 W')}</li>
              <li>{tp('squelch - до исчезновения шипения', 'squelch - up to where hiss stops', 'squelch - do zaniku szumu')}</li>
              <li>{tp('не нажимай PTT без антенны', 'never key PTT without an antenna', 'nie nadawaj bez anteny')}</li>
            </ul>
          </Card>
          <Card title="Dokad dalej / Куда дальше">
            <div className="flex flex-col gap-2">
              <Link href="/radio" className="text-sm" style={{ color: CYAN }}>📻 {tp('Сертификат SRC и экзамен UKE', 'SRC certificate and UKE exam', 'Swiadectwo SRC i egzamin UKE')}</Link>
              <Link href="/radio/symulator" className="text-sm" style={{ color: CYAN }}>🎙️ {tp('Симулятор ICOM (голос, DSC, MAYDAY)', 'ICOM simulator (voice, DSC, MAYDAY)', 'Symulator ICOM (glos, DSC, MAYDAY)')}</Link>
              <Link href="/radio/test" className="text-sm" style={{ color: CYAN }}>✅ {tp('Тренажёр по базе вопросов UKE', 'UKE question trainer', 'Trening po bazie pytan UKE')}</Link>
            </div>
          </Card>
        </div>
      </Section>
    </main>
  );
}
