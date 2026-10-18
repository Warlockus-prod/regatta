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
// Content PL (full diacritics) + RU commentary, per the sternik language policy.
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
    <div id="radio-guide">
      <h1 className="mb-1 text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>
        🛠️ {tp('Путеводитель по рации: что, зачем и как обслуживать', 'Radio guide: what, why and how to maintain it', 'Poradnik radia: co, po co i jak obsługiwać')}
      </h1>
      <p className="mb-5 text-sm" style={{ color: 'var(--text-secondary)' }}>
        {tp(
          'Полная инструкция по морской УКВ-рации: что делает каждая кнопка и зачем, как выйти в эфир, как настроить шумоподавитель, что такое DSC/MMSI, почему антенна решает дальность и как рацию обслуживать. Плюс проверка микрофона для голосового режима симулятора.',
          'A full guide to a marine VHF set: what each control does and why, how to get on air, squelch, DSC/MMSI, why the antenna decides your range, and how to service the radio. Plus a mic check for the simulator voice mode.',
          'Pełny poradnik do radia VHF: co robi każdy przycisk i po co, jak nadawać, squelch, DSC/MMSI, dlaczego antena decyduje o zasięgu i jak radio konserwować. Plus sprawdzenie mikrofonu do trybu głosowego symulatora.',
        )}
      </p>

      <InteractiveRadioCourse />

      {/* TOC */}
      <nav className="mb-8 grid gap-1 rounded-2xl p-4 sm:grid-cols-2" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)' }}>
        {[
          ['interaktywny-kurs', 'Kurs interaktywny', 'Интерактивный курс'],
          ['mikrofon', '0. Sprawdź mikrofon', 'Проверка микрофона'],
          ['budowa', '1. Budowa radia - co i po co', 'Устройство рации'],
          ['squelch', '2. Squelch (blokada szumów)', 'Шумоподавитель'],
          ['lacznosc', '3. Jak nadawać i odbierać', 'Как вести связь'],
          ['dsc', '4. DSC i numer MMSI', 'DSC и MMSI'],
          ['antena', '5. Antena i zasięg', 'Антенна и дальность'],
          ['konserwacja', '6. Konserwacja i obsługa', 'Обслуживание'],
          ['problemy', '7. Rozwiązywanie problemów', 'Поиск неисправностей'],
          ['sciaga', '8. Szybka ściąga', 'Шпаргалка'],
        ].map(([id, pl, ru]) => (
          <a key={id} href={`#${id}`} className="flex min-h-[44px] items-center rounded-lg px-2 py-1 text-sm transition hover:opacity-80" style={{ color: 'var(--text-secondary)' }}>
            <span style={{ color: CYAN }}>{pl}</span>
            {lang === 'ru' && <span className="text-xs" style={{ color: 'var(--text-muted)' }}>&nbsp;· {ru}</span>}
          </a>
        ))}
      </nav>

      {/* 0. MIC CHECK */}
      <Section id="mikrofon" num={0} pl="Sprawdź mikrofon" ru="Проверка микрофона (для голосового режима)">
        <Tip>
          {tp(
            'Голосовой режим симулятора записывает твой MAYDAY через микрофон браузера и оценивает его. Чтобы это работало: страница должна быть по HTTPS (weektoregatta.com - да) и браузер должен получить разрешение на микрофон. Проверь прямо сейчас - скажи «раз-два» и убедись, что индикатор двигается.',
            'The simulator voice mode records your MAYDAY through the browser microphone and grades it. For this to work the page must be HTTPS (weektoregatta.com is) and the browser must be granted mic permission. Test it now - say "one-two" and check the meter moves.',
            'Tryb głosowy symulatora nagrywa Twój MAYDAY przez mikrofon przeglądarki i ocenia go. Aby działał: strona musi być na HTTPS (weektoregatta.com jest) i przeglądarka musi dostać dostęp do mikrofonu. Sprawdź teraz - powiedz "raz-dwa" i zobacz, czy wskaźnik się rusza.',
          )}
        </Tip>
        <MicCheck />
        <div className="mt-3">
          <Link href="/radio/symulator" className="inline-flex min-h-[44px] items-center rounded-xl px-4 text-sm font-semibold" style={{ background: 'var(--accent-cyan)', color: 'var(--accent-ink, #04222e)' }}>
            🎙️ {tp('Микрофон работает - в симулятор', 'Mic works - open the simulator', 'Mikrofon działa - do symulatora')}
          </Link>
        </div>
      </Section>

      {/* 1. ANATOMY */}
      <Section id="budowa" num={1} pl="Budowa radia - co robi każdy element i po co" ru="Устройство рации: что делает каждый орган и зачем">
        <Table
          head={['Element', 'Co robi', 'Po co / dlaczego']}
          rows={[
            ['PWR / VOL / SQL (pokrętło)', 'włącza radio (przytrzymanie), reguluje głośność i squelch', 'jedno pokrętło, kilka funkcji - przytrzymaj = ON/OFF, kręć = głośność / выкл-вкл и громкость'],
            ['[16/C]', 'natychmiast kanał 16 (przytrzymanie = kanał wywoławczy)', 'kanał 16 to alarmowy/wywoławczy - musi być pod ręką / мгновенно на аварийный 16'],
            ['[^]/[v] (CH)', 'zmiana kanału w górę/dół', 'wybór kanału roboczego / переключение каналов'],
            ['DSC / MENU', 'cyfrowe wywołania i ustawienia', 'stąd wysyłasz PAN-PAN/SECURITE i konfigurujesz radio / меню DSC и настройки'],
            ['[ENT]/[CLR]/strzałki', 'nawigacja po menu, zatwierdzanie/cofanie', 'obsługa menu DSC / навигация по меню'],
            ['Softkeys (4 klawisze)', 'funkcje zmienne pod wyświetlaczem (SCAN, DW, HI/LO...)', 'skróty do najczęstszych funkcji / контекстные кнопки'],
            ['HI / LO', 'moc nadawania 25 W lub 1 W', 'najmniejsza skuteczna moc, pełna przy słabym sygnale i alarmie / минимальная достаточная мощность, полная при слабом сигнале и аварии'],
            ['DW / TRI / SCAN', 'nasłuch kilku kanałów naraz / przeszukiwanie', 'słyszysz 16 i swój roboczy jednocześnie / двойная вахта и скан'],
            ['DISTRESS (pod osłoną)', 'czerwony klawisz alarmu w niebezpieczeństwie', 'osłona chroni przed przypadkowym alarmem - przytrzymaj 3 s / красная кнопка бедствия'],
            ['PTT (na mikrofonie)', 'naciśnij = nadajesz, puścisz = słuchasz', 'radio to simplex - nie da się mówić i słuchać naraz / нажал - говоришь, отпустил - слушаешь'],
            ['Antena', 'wypromieniowuje i odbiera fale', 'decyduje o zasięgu bardziej niż moc - patrz sekcja 5 / антенна решает дальность'],
          ]}
        />
        <Tip>
          {tp(
            'Главное правило simplex-связи: пока держишь PTT - ты только передаёшь и НЕ слышишь других. Сказал фразу - отпусти кнопку и слушай. Поэтому в конце говорят OVER (жду ответа) или OUT (конец).',
            'The core simplex rule: while you hold PTT you only transmit and cannot hear anyone. Say your bit, release, listen. That is why you end with OVER (expecting a reply) or OUT (finished).',
            'Podstawowa zasada simpleksu: trzymając PTT tylko nadajesz i NIE słyszysz innych. Powiedz swoje, puść, słuchaj. Dlatego kończysz OVER (czekam na odpowiedź) albo OUT (koniec).',
          )}
        </Tip>
      </Section>

      {/* 2. SQUELCH */}
      <Section id="squelch" num={2} pl="Squelch - blokada szumów (najczęściej źle ustawiana)" ru="Squelch (шумоподавитель) - чаще всего настраивают неправильно">
        <Card title="Co to jest / Что это">
          <p className="text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
            {tp(
              'Squelch (шумоподавитель) заглушает шипение, когда на канале нет сигнала. Ставишь слишком высоко - не услышишь слабые/далёкие станции (можешь пропустить вызов). Ставишь слишком низко - постоянное шипение утомляет и глушит вахту.',
              'Squelch mutes the hiss when there is no signal on the channel. Set it too high and you miss weak/distant stations (you can miss a call). Too low and constant hiss tires you and drowns the watch.',
              'Squelch wycisza szum, gdy na kanale nie ma sygnału. Za wysoko - nie usłyszysz słabych/dalekich stacji (możesz przegapić wywołanie). Za nisko - ciągły szum męczy i zagłusza nasłuch.',
            )}
          </p>
        </Card>
        <Tip>
          {tp(
            'Как настроить правильно: 1) убавь squelch до появления шипения; 2) медленно прибавляй ровно до момента, когда шипение ПРОПАДАЕТ; 3) остановись здесь (или чуть-чуть дальше). Это самый чувствительный порог - слабые сигналы всё ещё проходят.',
            'How to set it: 1) lower squelch until you hear hiss; 2) slowly raise it just until the hiss disappears; 3) stop there (or a hair beyond). That is the most sensitive threshold - weak signals still get through.',
            'Jak ustawić: 1) zejdź squelchem aż usłyszysz szum; 2) powoli podnoś dokładnie do momentu, gdy szum ZNIKA; 3) zatrzymaj się tu (lub odrobinę dalej). To najczulszy próg - słabe sygnały nadal przejdą.',
          )}
        </Tip>
      </Section>

      {/* 3. OPERATION */}
      <Section id="lacznosc" num={3} pl="Jak nadawać i odbierać (zwykła łączność)" ru="Как вести обычную связь">
        <Card title="Zwykłe wywołanie krok po kroku / Обычный вызов по шагам">
          <ol className="list-decimal space-y-1 pl-5 text-sm" style={{ color: 'var(--text-secondary)' }}>
            <li>{tp('Послушай канал - не занят ли (не перебивай чужой разговор).', 'Listen first - is the channel busy (do not talk over others).', 'Najpierw posłuchaj - czy kanał wolny (nie wchodź w cudzą rozmowę).')}</li>
            <li>{tp('Вызови на канале 16 или на рабочем канале марины: «[кого], [кого], THIS IS [ты], OVER».', 'Call on 16 or the marina working channel: "[them], [them], THIS IS [you], OVER".', 'Wywołaj na 16 lub na kanale mariny: "[oni], [oni], THIS IS [ty], OVER".')}</li>
            <li>{tp('Договорись перейти на рабочий канал: «go to channel 12». Уйди с 16.', 'Agree a working channel: "go to channel 12". Leave 16.', 'Umówcie się na kanał roboczy: "go to channel 12". Zejdź z 16.')}</li>
            <li>{tp('Веди разговор по очереди: держишь PTT - говоришь, отпустил - слушаешь. В конце фразы OVER.', 'Talk in turns: hold PTT to speak, release to listen. End each turn with OVER.', 'Rozmawiaj na zmianę: PTT = mówisz, puszczasz = słuchasz. Kończysz OVER.')}</li>
            <li>{tp('Конец связи - OUT (ответа не ждёшь). Не говорят «OVER AND OUT».', 'End with OUT (no reply expected). Never say "OVER AND OUT".', 'Koniec - OUT (nie czekasz na odpowiedź). Nigdy "OVER AND OUT".')}</li>
          </ol>
        </Card>
        <Table
          head={['Zasada', 'Szczegół', 'По-русски']}
          rows={[
            ['Moc', 'najmniejsza skuteczna: zwykle 1 W blisko, 25 W przy słabym sygnale i alarmie', 'минимальная достаточная: обычно 1 Вт вблизи, 25 Вт при слабом сигнале и аварии'],
            ['Kanał 16', 'tylko wywołanie i alarm, nie rozmowy', 'канал 16 не занимать болтовнёй'],
            ['Kanały robocze PL', 'mariny/porty 10/12/14 (Gdynia 12, Gdańsk 14)', 'рабочие каналы марин Польши'],
            ['Kanał 70', 'tylko DSC - nie mów głosem', 'канал 70 - только цифра, не голос'],
            ['Alfabet', 'literuj nazwy: Alfa Bravo Charlie...', 'сложные слова - по буквам (фонетика)'],
          ]}
        />
      </Section>

      {/* 4. DSC + MMSI */}
      <Section id="dsc" num={4} pl="DSC i numer MMSI - cyfrowa część radia" ru="DSC и номер MMSI - цифровая часть рации">
        <Card title="Co to daje / Что это даёт">
          <p className="text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
            {tp(
              'DSC (Digital Selective Calling) - это цифровой слой поверх голоса. Красная кнопка DISTRESS одним нажатием шлёт на канале 70 твой MMSI, позицию (из GPS) и род бедствия - и всё это ещё до того, как ты возьмёшь микрофон. MMSI - это 9-значный «телефонный номер» судна, прошитый в рацию.',
              'DSC (Digital Selective Calling) is a digital layer on top of voice. One press of the red DISTRESS key sends your MMSI, position (from GPS) and nature of distress on channel 70 - before you even pick up the mic. MMSI is a 9-digit "phone number" of the vessel programmed into the radio.',
              'DSC (Digital Selective Calling) to cyfrowa warstwa nad głosem. Jedno wciśnięcie czerwonego DISTRESS wysyła na kanale 70 Twój MMSI, pozycję (z GPS) i rodzaj zagrożenia - zanim weźmiesz mikrofon. MMSI to 9-cyfrowy "numer telefonu" jednostki zaprogramowany w radiu.',
            )}
          </p>
        </Card>
        <Tip tone="warn">
          {tp(
            'MMSI программируется в рацию обычно ОДИН раз (на многих аппаратах его нельзя переписать без сервиса) - не вбивай наугад. Для своей рации на борту нужен MMSI/позывной из разрешения на судовую радиостанцию (в Польше - UKE). Без введённого MMSI функции DSC заблокированы.',
            'The MMSI is usually programmed ONCE (many sets cannot be re-entered without service) - do not guess it. Your own set needs an MMSI/call sign from a ship-station radio licence (in Poland: UKE). Without an MMSI the DSC functions are locked.',
            'MMSI programuje się zwykle RAZ (w wielu radiach nie da się zmienić bez serwisu) - nie wpisuj na oślep. Własne radio potrzebuje MMSI/znaku z pozwolenia radiowego na stację statkową (w Polsce: UKE). Bez MMSI funkcje DSC są zablokowane.',
          )}
        </Tip>
        <div className="mb-4">
          <Link href="/radio/symulator" className="text-sm" style={{ color: CYAN }}>
            {tp('Отработать DSC-бедствие в симуляторе', 'Practise a DSC distress in the simulator', 'Przećwicz alarm DSC w symulatorze')} {'->'}
          </Link>
        </div>
      </Section>

      {/* 5. ANTENNA */}
      <Section id="antena" num={5} pl="Antena i zasięg - dlaczego to ważniejsze niż moc" ru="Антенна и дальность - почему это важнее мощности">
        <Card title="Zasada / Принцип">
          <p className="text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
            {tp(
              'VHF идёт «по прямой видимости»: дальность зависит в первую очередь от ВЫСОТЫ и качества антенны, а не от ватт. Мачтовая антенна повыше добьёт дальше, чем ручная рация с той же мощностью. Ориентир: судно-судно ~5-10 миль, до береговой станции с высокой антенной - больше.',
              'VHF is "line of sight": range depends first on the HEIGHT and quality of the antenna, not on watts. A masthead antenna reaches far further than a handheld at the same power. Rule of thumb: boat-to-boat ~5-10 NM, to a coast station with a tall antenna - more.',
              'VHF idzie "na widoczność": zasięg zależy przede wszystkim od WYSOKOŚCI i jakości anteny, nie od watów. Antena na maszcie sięgnie dużo dalej niż ręczne radio o tej samej mocy. Orientacyjnie: statek-statek ~5-10 Mm, do stacji brzegowej z wysoką anteną - więcej.',
            )}
          </p>
        </Card>
        <Tip tone="warn">
          {tp(
            'НИКОГДА не нажимай передачу без подключённой антенны (или с оборванным кабелем) - отражённая мощность может сжечь выходной каскад рации. Проверяй разъёмы: окисленный/влажный контакт = слабый сигнал.',
            'NEVER transmit without a connected antenna (or with a broken cable) - reflected power can burn out the radio final stage. Check the connectors: a corroded/wet contact = weak signal.',
            'NIGDY nie nadawaj bez podłączonej anteny (lub z urwanym kablem) - odbita moc może spalić stopień końcowy radia. Sprawdzaj złącza: skorodowany/wilgotny styk = słaby sygnał.',
          )}
        </Tip>
      </Section>

      {/* 6. MAINTENANCE */}
      <Section id="konserwacja" num={6} pl="Konserwacja i obsługa - żeby działało, gdy trzeba" ru="Обслуживание - чтобы работало, когда нужно">
        <div className="grid gap-3 sm:grid-cols-2">
          <Checklist
            title="Przed każdym rejsem / Перед каждым выходом"
            items={[
              'Włącz radio, ustaw kanał 16, sprawdź głośność i squelch. / Включи, канал 16, проверь громкость и squelch.',
              'Zrób radio check (na kanale roboczym mariny, nie na 16). / Сделай radio check на рабочем канале.',
              'Ręczne: sprawdź naładowanie baterii, weź zapasową. / Ручная: заряд батареи, возьми запасную.',
              'Sprawdź, czy GPS ma pozycję (ikona na wyświetlaczu). / Проверь, что GPS даёт позицию.',
              'Upewnij się, że antena jest podłączona i złącze suche. / Убедись: антенна подключена, разъём сухой.',
            ]}
          />
          <Checklist
            title="Regularnie / Регулярно"
            items={[
              'Dokręć i oczyść złącza antenowe, sprawdź kabel. / Подтяни и очисти антенные разъёмы, проверь кабель.',
              'Po morzu przepłucz ręczne słodką wodą i wysusz. / После моря промой ручную пресной водой и высуши.',
              'Wytrząśnij wodę z głośnika ręczniaka (AquaQuake). / Вытряхни воду из динамика (AquaQuake).',
              'Bateria: ładuj, nie rozładowuj do zera, przechowuj naładowaną. / Батарея: заряжай, не в ноль, храни заряженной.',
              'Stały montaż: sprawdź bezpiecznik i zasilanie 12 V, styki masy. / Стационар: проверь предохранитель, питание 12 В, массу.',
              'Raz na jakiś czas: test DSC (test call) do stacji lub znajomego. / Изредка: тестовый DSC-вызов.',
              'Pilnuj aktualnego MMSI i ważnego pozwolenia radiowego. / Держи актуальный MMSI и действующее разрешение.',
            ]}
          />
        </div>
        <Tip>
          {tp(
            'Ложные срабатывания DSC - частая проблема из-за коррозии кнопок и влаги. Держи аппарат сухим, а если случайно ушёл сигнал бедствия - немедленно отмени его голосом на 16 (это отрабатывается в симуляторе, сценарий «ложный алерт»).',
            'False DSC alerts are a common problem from button corrosion and moisture. Keep the set dry, and if a distress alert goes out by accident, cancel it at once by voice on 16 (the simulator drills this in the "false alert" scenario).',
            'Fałszywe alarmy DSC to częsty problem od korozji przycisków i wilgoci. Trzymaj radio suche, a jeśli alarm poszedł przypadkiem - natychmiast odwołaj go głosem na 16 (ćwiczy to symulator, scenariusz "fałszywy alert").',
          )}
        </Tip>
      </Section>

      {/* 7. TROUBLESHOOTING */}
      <Section id="problemy" num={7} pl="Rozwiązywanie problemów" ru="Поиск неисправностей">
        <Table
          head={['Objaw', 'Sprawdź', 'По-русски']}
          rows={[
            ['Nie nadaje', 'PTT wciśnięte? moc HI? antena podłączona? bezpiecznik?', 'не передаёт: PTT? мощность HI? антенна? предохранитель?'],
            ['Nic nie słychać', 'squelch za wysoko? głośność? dobry kanał? DW włączone?', 'ничего не слышно: squelch высок? громкость? канал? DW?'],
            ['Słaby zasięg', 'antena (wysokość, złącza, kabel), moc na LO?, przeszkody', 'слабая дальность: антенна, разъёмы, мощность на LO?'],
            ['DSC nie działa', 'czy MMSI wpisany? GPS ma pozycję?', 'DSC не работает: введён MMSI? есть GPS?'],
            ['Ręczne nie ładuje', 'styki ładowarki, inny kabel/zasilacz, bateria zużyta', 'ручная не заряжается: контакты, кабель, износ батареи'],
            ['Przypadkowy alarm', 'odwołaj głosem na 16, nie wyłączaj radia', 'случайный алерт: отмени голосом на 16, не выключай'],
          ]}
        />
      </Section>

      {/* 8. CHEAT SHEET */}
      <Section id="sciaga" num={8} pl="Szybka ściąga" ru="Шпаргалка">
        <div className="grid gap-3 sm:grid-cols-2">
          <Card title="Zapamiętaj / Запомни">
            <ul className="space-y-1 pl-4 text-sm" style={{ color: 'var(--text-secondary)', listStyle: 'disc' }}>
              <li>{tp('16 - вызов и бедствие, 70 - только DSC', '16 - calling/distress, 70 - DSC only', '16 - wywołanie/alarm, 70 - tylko DSC')}</li>
              <li>{tp('PTT держишь - говоришь, отпустил - слушаешь', 'hold PTT to talk, release to listen', 'PTT - mówisz, puszczasz - słuchasz')}</li>
              <li>{tp('OVER - жду ответа, OUT - конец', 'OVER - expecting reply, OUT - finished', 'OVER - czekam, OUT - koniec')}</li>
              <li>{tp('минимальная достаточная мощность: 1 Вт вблизи, 25 Вт при слабой связи и бедствии', 'minimum effective power: 1 W nearby, 25 W for weak links and distress', 'najmniejsza skuteczna moc: 1 W blisko, 25 W przy słabym sygnale i w niebezpieczeństwie')}</li>
              <li>{tp('squelch - до исчезновения шипения', 'squelch - up to where hiss stops', 'squelch - do zaniku szumu')}</li>
              <li>{tp('не нажимай PTT без антенны', 'never key PTT without an antenna', 'nie nadawaj bez anteny')}</li>
            </ul>
          </Card>
          <Card title="Dokąd dalej / Куда дальше">
            <div className="flex flex-col gap-2">
              <Link href="/radio" className="text-sm" style={{ color: CYAN }}>📻 {tp('Сертификат SRC и экзамен UKE', 'SRC certificate and UKE exam', 'Świadectwo SRC i egzamin UKE')}</Link>
              <Link href="/radio/symulator" className="text-sm" style={{ color: CYAN }}>🎙️ {tp('Симулятор ICOM (голос, DSC, MAYDAY)', 'ICOM simulator (voice, DSC, MAYDAY)', 'Symulator ICOM (głos, DSC, MAYDAY)')}</Link>
              <Link href="/radio/test" className="text-sm" style={{ color: CYAN }}>✅ {tp('Тренажёр по базе вопросов UKE', 'UKE question trainer', 'Trening po bazie pytań UKE')}</Link>
            </div>
          </Card>
        </div>
      </Section>
    </div>
  );
}
