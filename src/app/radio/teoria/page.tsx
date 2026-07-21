'use client';

import type { ReactNode } from 'react';
import Link from 'next/link';
import { useI18n } from '@/lib/i18n';
import { usePlOnly } from '../../sternik/plOnly';

// ============================================================================
// /radio/teoria - the SRC theory konspekt, distilled from the full UKE question
// bank (src/data/src-radio.ts, 324 questions). Concrete facts only: channels,
// procedures, DSC, GMDSS devices, wave physics, batteries. Content language is
// PL-primary + RU commentary (same policy as /radio and /sternik/teoria).
// ASCII Polish (no diacritics), no em/en-dash.
// ============================================================================

const TOC: [string, string, string][] = [
  ['priorytety', '1. Priorytety i rodzaje lacznosci', 'Приоритеты и виды связи'],
  ['pasmo', '2. Fale i pasmo VHF', 'Волны и диапазон VHF'],
  ['kanaly', '3. Kanaly VHF', 'Каналы VHF'],
  ['tryby', '4. Simplex, duplex, semidupleks', 'Симплекс, дуплекс'],
  ['id', '5. Identyfikacja: znak i MMSI', 'Позывной и MMSI'],
  ['procedura', '6. Procedura, prowords, czytelnosc', 'Процедура и prowords'],
  ['alarm', '7. MAYDAY / PAN PAN / SECURITE', 'Аварийные вызовы'],
  ['dsc', '8. DSC: alarm, potwierdzanie, testy', 'DSC: алярм и тесты'],
  ['sar', '9. SAR i obszary morza', 'SAR и морские районы'],
  ['prawo', '10. Dokumenty i prawo', 'Документы и право'],
  ['smcp', '11. SMCP: kluczowe zwroty', 'SMCP: ключевые фразы'],
  ['gmdss', '12. GMDSS i obszar A1', 'GMDSS и район A1'],
  ['navtex', '13. NAVTEX', 'NAVTEX'],
  ['epirb', '14. EPIRB / COSPAS-SARSAT', 'EPIRB / COSPAS-SARSAT'],
  ['sart', '15. SART i AIS-SART', 'SART и AIS-SART'],
  ['fizyka', '16. Moc, antena, zasieg, squelch', 'Мощность, антенна, дальность'],
  ['zasilanie', '17. Akumulatory i zasilanie', 'Аккумуляторы'],
];

function Section({ id, num, pl, ru, children }: { id: string; num: number; pl: string; ru: string; children: ReactNode }) {
  const { lang } = useI18n();
  return (
    <section id={id} className="mb-9 scroll-mt-24">
      <h2 className="mb-1 text-lg font-bold" style={{ color: 'var(--text-primary)' }}>
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

function Fact({ q, a, ru }: { q: string; a: string; ru: string }) {
  const { lang } = useI18n();
  return (
    <div className="border-b py-2 last:border-b-0" style={{ borderColor: 'var(--border-subtle)' }}>
      <div className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{q}</div>
      <div className="text-sm" style={{ color: 'var(--success)' }}>{'✓'} {a}</div>
      {lang === 'ru' && <div className="text-xs" style={{ color: 'var(--text-muted)' }}>{ru}</div>}
    </div>
  );
}

function ChannelTable({ rows }: { rows: [string, string, string][] }) {
  const { lang } = useI18n();
  return (
    <div className="mb-4 overflow-x-auto rounded-2xl" style={{ border: '1px solid var(--border-subtle)' }}>
      <table className="w-full text-sm" style={{ color: 'var(--text-secondary)' }}>
        <thead>
          <tr style={{ background: 'var(--bg-card)' }}>
            <th className="px-3 py-2 text-left">{lang === 'ru' ? 'Канал' : 'Kanal'}</th>
            <th className="px-3 py-2 text-left">MHz</th>
            <th className="px-3 py-2 text-left">{lang === 'ru' ? 'Назначение' : 'Do czego'}</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r[0]} style={{ borderTop: '1px solid var(--border-subtle)' }}>
              <td className="px-3 py-2 font-semibold" style={{ color: 'var(--text-primary)' }}>{r[0]}</td>
              <td className="px-3 py-2 whitespace-nowrap">{r[1]}</td>
              <td className="px-3 py-2">{r[2]}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Tip({ children }: { children: ReactNode }) {
  return (
    <div className="mb-4 rounded-xl px-4 py-3 text-sm leading-relaxed" style={{ background: 'rgba(0,212,255,0.07)', border: '1px solid rgba(0,212,255,0.25)', color: 'var(--text-secondary)' }}>
      {children}
    </div>
  );
}

function PartHeading({ children }: { children: ReactNode }) {
  return (
    <div className="mb-5 mt-2 rounded-xl px-4 py-3 text-sm font-semibold" style={{ background: 'var(--bg-secondary)', color: 'var(--accent-cyan)', border: '1px solid var(--border-subtle)' }}>
      {children}
    </div>
  );
}

export default function RadioTheory() {
  const { tp } = useI18n();
  return (
    <main className="mx-auto max-w-3xl px-4 py-8" style={{ color: 'var(--text-primary)' }}>
      <Link href="/radio" className="mb-4 inline-block text-sm" style={{ color: 'var(--accent-cyan)' }}>
        {'<-'} {tp('Радио и SRC', 'Radio and SRC', 'Radio i SRC')}
      </Link>

      <h1 className="mb-2 text-2xl font-bold">{tp('Теория SRC - конспект', 'SRC theory - konspekt', 'Teoria SRC - konspekt')}</h1>
      <p className="mb-4 text-sm" style={{ color: 'var(--text-secondary)' }}>
        {tp(
          'Коротко и по делу: вся теория SRC, выжатая из полного банка вопросов UKE (324 вопроса). Только конкретика - каналы, частоты, процедуры, приборы GMDSS. Экзамен теории: 15 вопросов A/B/C (3 предмета по 5), порог - 60% в каждом.',
          'Short and concrete: the whole SRC theory distilled from the full UKE question bank (324 questions). Facts only - channels, frequencies, procedures, GMDSS devices. Theory exam: 15 A/B/C questions (3 subjects x 5), pass 60% in each.',
          'Krotko i konkretnie: cala teoria SRC wyciagnieta z pelnego banku pytan UKE (324 pytania). Tylko fakty - kanaly, czestotliwosci, procedury, urzadzenia GMDSS. Egzamin teorii: 15 pytan A/B/C (3 dzialy po 5), prog 60% w kazdym.',
        )}
      </p>

      <nav className="mb-8 grid gap-1 rounded-2xl p-4 sm:grid-cols-2" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)' }}>
        {TOC.map(([id, pl, ru]) => (
          <TocLink key={id} id={id} pl={pl} ru={ru} />
        ))}
      </nav>

      <PartHeading>{tp('Часть I. Регламенты, процедуры, английский (SMCP)', 'Part I. Regulations, procedures, English (SMCP)', 'Czesc I. Regulaminy, procedury, angielski (SMCP)')}</PartHeading>

      <Section id="priorytety" num={1} pl="Priorytety i rodzaje lacznosci" ru="Приоритеты и виды связи">
        <Card>
          <Fact q="Kolejnosc pierwszenstwa" a="1) niebezpieczenstwo (distress) 2) pilnosc (urgency) 3) ostrzezenie/bezpieczenstwo (safety) 4) lacznosc publiczna" ru="Очередь приоритета: бедствие > срочность > безопасность > публичная связь." />
          <Fact q="Lacznosc publiczna" a="korespondencja statek <-> stacja nadbrzezna <-> siec ladowa (rozmowy prywatne); najnizszy priorytet (ROUTINE)" ru="Публичная связь: судно - береговая станция - наземная сеть; низший приоритет (ROUTINE)." />
          <Fact q="Tajemnica korespondencji" a="obejmuje informacje przychodzace ORAZ wychodzace ze stacji" ru="Тайна переписки: и входящая, и исходящая информация." />
        </Card>
      </Section>

      <Section id="pasmo" num={2} pl="Fale i pasmo VHF" ru="Волны и диапазон VHF">
        <Card>
          <Fact q="VHF = Very High Frequency" a="pasmo 30-300 MHz, fale metrowe (dlugosc 1-10 m)" ru="VHF (УКВ): 30-300 МГц, метровые волны (длина 1-10 м)." />
          <Fact q="Morski zakres VHF" a="156-174 MHz (Regulamin Radiokomunikacyjny ITU)" ru="Морской диапазон: 156-174 МГц (Регламент радиосвязи ITU)." />
          <Fact q="Predkosc i dlugosc fali" a="fale radiowe biegna z predkoscia swiatla (~300 000 km/s); lambda[m] = 300 / f[MHz], wiec 156 MHz to ok. 1,9 m" ru="Скорость света ~300 000 км/с; длина волны lambda[м] = 300 / f[МГц]: 156 МГц ~ 1,9 м." />
          <Fact q="Modulacja" a="fala nosna sinusoidalna modulowana sygnalem akustycznym; morski VHF to emisja G3E (modulacja czestotliwosci/fazy, nie amplitudy)" ru="Несущая - синусоида; морской VHF - эмиссия G3E (частотная/фазовая модуляция)." />
        </Card>
      </Section>

      <Section id="kanaly" num={3} pl="Kanaly VHF" ru="Каналы VHF">
        <ChannelTable
          rows={[
            ['16', '156,800', 'wywolawczy + niebezpieczenstwo; ciagly nasluch; wywolanie max 1 min'],
            ['70', '156,525', 'DSC - wszystkie wywolania cyfrowe; ZAKAZ fonii'],
            ['06', '156,300', 'statek-statek; SAR (statek - statek powietrzny)'],
            ['13', '156,650', 'mostek-mostek, bezpieczenstwo zeglugi'],
            ['15 / 17', '156,750', 'lacznosc wewnatrzstatkowa (pokladowa), moc 1 W'],
            ['25 / 26', 'dupleks', 'korespondencja publiczna (stacje nadbrzezne)'],
            ['75 / 76', '-', 'pasmo ochronne kanalu 16 - zabronione'],
          ]}
        />
        <Card>
          <Fact q="Uklad kanalow" a="w Europie uzywaj miedzynarodowego ukladu INT; kanaly US nie sa formalnie zabronione, ale nie stosuj ich w UE" ru="В Европе - международный набор INT; каналы US формально не запрещены, но не используй." />
          <Fact q="Tryb amerykanski" a="czesc miedzynarodowych kanalow dupleksowych pracuje tam jako simpleksowe (np. z litera A)" ru="В US-режиме часть дуплексных каналов работает как симплексные (буква A)." />
        </Card>
      </Section>

      <Section id="tryby" num={4} pl="Simplex, duplex, semidupleks" ru="Симплекс, дуплекс, полудуплекс">
        <Card>
          <Fact q="Kanal simpleksowy" a="jedna czestotliwosc - nadajesz i odbierasz na tej samej, na zmiane (OVER)" ru="Симплекс: одна частота, по очереди (OVER)." />
          <Fact q="Kanal dupleksowy" a="dwie czestotliwosci (inna do nadawania, inna do odbioru) - jednoczesnie, jak telefon" ru="Дуплекс: две частоты, одновременно (как телефон)." />
          <Fact q="Semidupleks" a="jedna stacja pracuje simpleksem, druga dupleksem (zwykle statek simplex, stacja brzegowa duplex)" ru="Полудуплекс: судно - симплекс, берег - дуплекс." />
        </Card>
      </Section>

      <Section id="id" num={5} pl="Identyfikacja: znak wywolawczy i MMSI" ru="Позывной и MMSI">
        <Card>
          <Fact q="Radiotelefonia vs DSC" a="fonia: znak wywolawczy lub nazwa jednostki; DSC: numer MMSI (9 cyfr)" ru="Фония - позывной/название; DSC - номер MMSI (9 цифр)." />
          <Fact q="Znak wywolawczy" a="przydziela UKE z serii ITU; polskie prefiksy: HF, SN, SO, SP, SQ, SR, 3Z" ru="Позывной выдаёт UKE; польские префиксы: HF, SN, SO, SP, SQ, SR, 3Z." />
          <Fact q="Przenosne DSC" a="dziewieciocyfrowy numer w formacie 8MIDXXXXX (MID = kod kraju)" ru="Носимые DSC: номер 8MIDXXXXX (MID - код страны)." />
        </Card>
      </Section>

      <Section id="procedura" num={6} pl="Procedura, prowords, czytelnosc" ru="Процедура, prowords, разборчивость">
        <Card>
          <Fact q="Wywolanie" a="nazwa stacji wywolywanej x1, THIS IS, nazwa wywolujacej x2" ru="Вызов: имя вызываемого x1, THIS IS, имя вызывающего x2." />
          <Fact q="Odpowiedz" a="nazwa stacji wywolujacej x1, THIS IS, nazwa wywolywanej x2" ru="Ответ: имя вызывающего x1, THIS IS, имя вызываемого x2." />
          <Fact q="OVER / OUT" a="OVER = koniec wypowiedzi, czekam na odpowiedz; OUT = koniec lacznosci; NIGDY 'over and out'" ru="OVER - конец реплики, жду ответа; OUT - конец связи; никогда 'over and out'." />
          <Fact q="SAY AGAIN / CORRECTION" a="SAY AGAIN = powtorz (nie 'repeat'); CORRECTION = poprawka bledu" ru="SAY AGAIN - повторите (не 'repeat'); CORRECTION - исправление." />
          <Fact q="Skala czytelnosci 1-5" a="good = 4 (dobrze), poor = slabo; pytanie: How do you read me?" ru="Разборчивость 1-5: good = 4, poor = плохо; вопрос How do you read me?" />
        </Card>
      </Section>

      <Section id="alarm" num={7} pl="MAYDAY / PAN PAN / SECURITE / SEELONCE" ru="Аварийные, срочные, предупреждающие вызовы">
        <Card>
          <Fact q="MAYDAY (niebezpieczenstwo)" a="MAYDAY x3, na kanale 16 - zagrozenie zycia lub statku; dalsza korespondencja poprzedzana MAYDAY x1" ru="MAYDAY x3 на канале 16 - угроза жизни/судну; далее MAYDAY x1." />
          <Fact q="RECEIVED MAYDAY / RELAY" a="potwierdzenie odbioru: MAYDAY x1; MAYDAY RELAY x3 = przekaz cudzego wezwania (gdy zagrozony sam nie moze nadac)" ru="Подтверждение: MAYDAY x1; MAYDAY RELAY x3 - ретрансляция чужого вызова." />
          <Fact q="PAN PAN (pilnosc)" a="PAN PAN x3 - pilne, bez bezposredniego zagrozenia zycia (np. porada medyczna). Uwaga: czlowiek za burta = MAYDAY" ru="PAN PAN x3 - срочно, без прямой угрозы жизни (напр. медконсультация). Человек за бортом = MAYDAY." />
          <Fact q="SECURITE (ostrzezenie)" a="SECURITE x3 - ostrzezenie nawigacyjne/meteo; zapowiedz na 16, tresc na kanale roboczym" ru="SECURITE x3 - навигационное/метео предупреждение; анонс на 16, текст на рабочем." />
          <Fact q="Cisza radiowa" a="SEELONCE MAYDAY = uciszenie stacji zaklocajacej; SEELONCE FEENEE = koniec ciszy, nadaje kierujacy akcja (RCC)" ru="SEELONCE MAYDAY - заглушить мешающего; SEELONCE FEENEE - конец тишины (даёт RCC)." />
        </Card>
      </Section>

      <Section id="dsc" num={8} pl="DSC: alarmowanie, potwierdzanie, testy" ru="DSC: алярм, подтверждение, тесты">
        <Card>
          <Fact q="Alarm DSC (distress)" a="do All Ships, na kanale 70; zawiera MMSI + pozycje + czas jej aktualnosci; rodzaj pomocy i liczba osob - pozniej, fonia MAYDAY" ru="Алярм DSC: All Ships, канал 70; MMSI + позиция + время; вид помощи/число людей - позже голосом." />
          <Fact q="Pozycja bez GPS" a="gdy DSC nie jest podlaczone do odbiornika nawigacyjnego, pozycje wprowadzaj recznie min. co 4 godziny" ru="Без GPS вводить позицию вручную минимум каждые 4 часа." />
          <Fact q="Kto jak potwierdza" a="statek potwierdza alarm DSC FONIA na 16 (nie retransmituje DSC); DSC moze potwierdzic dopiero po ok. 5 min, gdy zadna stacja nadbrzezna nie potwierdzila" ru="Судно подтверждает алярм голосом на 16; по DSC - только через ~5 мин, если берег молчит." />
          <Fact q="Stacja nadbrzezna" a="potwierdza alarm wylacznie DSC - to zatrzymuje automatyczne powtarzanie alarmu" ru="Береговая станция подтверждает только по DSC - это останавливает автоповтор." />
          <Fact q="Kategorie DSC" a="distress / urgency / safety / routine; wszystkie wywolania na kanale 70, rozmowa na kanale roboczym" ru="Категории: distress/urgency/safety/routine; все вызовы на 70, разговор на рабочем." />
          <Fact q="Powtorzenia" a="DSC do 1 stacji bez potw.: po 5 min, kolejne po 15 min (ITU-R M.541); rutynowe: po 5 min. Fonia: po 2 min, potem po 3 min" ru="Повтор DSC: через 5 мин, далее 15 мин; рутинный 5 мин. Голос: 2 мин, потом 3 мин." />
          <Fact q="Testy DSC" a="wewnetrzny CODZIENNIE (elektronika, bez emisji); zewnetrzny RAZ W TYGODNIU (nadanie sygnalu w eter)" ru="Тест DSC: внутренний ежедневно (без эфира); внешний раз в неделю (с эфиром)." />
          <Fact q="Falszywy alarm - ODWOLAC" a="DSC: fonia na 16 do ALL SHIPS (pozycja, rodzaj alarmu, czas nadania i odwolania); EPIRB: przez najblizsze RCC" ru="Ложный алярм отменить: DSC - голосом на 16 (ALL SHIPS); EPIRB - через ближайший RCC." />
        </Card>
      </Section>

      <Section id="sar" num={9} pl="SAR i obszary morza" ru="SAR и морские районы">
        <Card>
          <Fact q="Obszar A1" a="akwen w zasiegu min. jednej brzegowej stacji VHF z ciagla lacznoscia DSC; zasieg VHF ~30 mil morskich" ru="Район A1: зона хотя бы одной береговой VHF с непрерывным DSC; дальность ~30 миль." />
          <Fact q="RCC / RSC" a="RCC = Ratowniczy Osrodek Koordynacyjny (kieruje akcja SAR); RSC = podcentrum, podlegle RCC" ru="RCC - спасательный координационный центр; RSC - подцентр." />
          <Fact q="CRS / OSC" a="CRS = Coast Radio Station (stacja nadbrzezna w akcji); OSC = On-Scene Coordinator (koordynator na miejscu, wyznaczony przez RCC)" ru="CRS - береговая радиостанция; OSC - координатор на месте (назначает RCC)." />
          <Fact q="Lacznosc na miejscu akcji" a="kanal 16 (156,8 MHz) oraz 2182 kHz; do koordynacji zaleca sie simpleksowy kanal 6" ru="Связь на месте: канал 16 + 2182 кГц; для координации - канал 6." />
        </Card>
      </Section>

      <Section id="prawo" num={10} pl="Dokumenty i prawo" ru="Документы и право">
        <Card>
          <Fact q="Uprawnienia SRC" a="obsluga urzadzen GMDSS (VHF + DSC) na statkach niepodlegajacych SOLAS, w obszarze morza A1; wazne bezterminowo" ru="SRC: работа с GMDSS (VHF+DSC) на не-SOLAS судах в районе A1; бессрочно." />
          <Fact q="Kto co wydaje" a="pozwolenie radiowe: Prezes UKE (zgodnosc z Regulaminem ITU); karta bezpieczenstwa: dyrektor Urzedu Morskiego" ru="Радиоразрешение - глава UKE; карта безопасности - директор Морского управления." />
          <Fact q="Dziennik radiowy" a="pozycje jednostki odnotowuje sie przynajmniej raz dziennie" ru="В радиожурнале позицию отмечать минимум раз в сутки." />
          <Fact q="Traffic list" a="wykaz korespondencji oczekujacej na statki - nadaja stacje nadbrzezne w ustalonych terminach" ru="Traffic list (список ждущей корреспонденции) передают береговые станции." />
        </Card>
      </Section>

      <Section id="smcp" num={11} pl="SMCP: kluczowe zwroty" ru="SMCP: ключевые фразы">
        <Card title="Niebezpieczenstwo / Бедствие">
          <Fact q="I require assistance" a="potrzebuje pomocy (I require escort = potrzebuje asysty/eskorty)" ru="Нужна помощь (escort = сопровождение)." />
          <Fact q="I am making water" a="nabieram wody (przeciek kadluba); I have a leak below water line = przeciek pod linia wodna" ru="Набираю воду; leak below water line - течь ниже ватерлинии." />
          <Fact q="I must abandon vessel" a="musze opuscic statek; I have lost person overboard = czlowiek za burta" ru="Вынужден покинуть судно; person overboard - человек за бортом." />
          <Fact q="Fire is under control / spreading" a="pozar opanowany / rozprzestrzenia sie" ru="Пожар под контролем / распространяется." />
        </Card>
        <Card title="Procedura i manewry / Процедура и манёвры">
          <Fact q="Say again / Stand by" a="powtorz / badz w gotowosci; acknowledge = potwierdz odbior; received = odebrano" ru="Повтори / будь наготове; acknowledge - подтверди; received - принято." />
          <Fact q="Are you under way?" a="czy jestes w drodze (under way = w ruchu); I am manoeuvring with difficulty = manewruje z trudnoscia" ru="Are you under way - ты на ходу; manoeuvring with difficulty - маневрирую с трудом." />
          <Fact q="I am not under command" a="statek nieodpowiadajacy za swoje ruchy (COLREG/SMCP)" ru="Судно, лишённое возможности управляться." />
          <Fact q="Correction / Mistake" a="slowo proceduralne na poprawke bledu w nadawanej tresci" ru="Correction - исправление ошибки в передаче." />
        </Card>
        <Card title="Terminy jednostki / Термины судна">
          <Fact q="draft / air draft / freeboard" a="zanurzenie / wysokosc nadwodna / wolna burta" ru="Осадка / надводный габарит / надводный борт." />
          <Fact q="list to port / starboard" a="niebezpieczny przechyl na lewa / prawa burte" ru="Крен на левый / правый борт." />
          <Fact q="steering gear / propeller" a="urzadzenie sterowe / smiga (I have problems with steering gear)" ru="Рулевое устройство / винт." />
        </Card>
        <Card title="Widocznosc i pogoda / Видимость и погода">
          <Fact q="Visibility is reduced by fog / mist" a="widzialnosc ograniczona przez mgle / rzadka mgle (mist)" ru="Видимость снижена туманом / дымкой (mist)." />
          <Fact q="Visibility is expected to decrease" a="przewidywane pogorszenie widzialnosci (expected = spodziewane)" ru="Ожидается ухудшение видимости." />
        </Card>
      </Section>

      <PartHeading>{tp('Часть II. Подсистемы и приборы GMDSS (район A1)', 'Part II. GMDSS subsystems and devices (area A1)', 'Czesc II. Podsystemy i urzadzenia GMDSS (obszar A1)')}</PartHeading>

      <Section id="gmdss" num={12} pl="GMDSS i obszar A1" ru="GMDSS и район A1">
        <Card>
          <Fact q="Cel GMDSS" a="skuteczne alarmowanie sluzb ratowniczych (przede wszystkim statek -> brzeg); system NIE wykrywa katastrof automatycznie" ru="Цель GMDSS: надёжный алярм спасателей (судно -> берег); система не обнаруживает бедствие сама." />
          <Fact q="Alarmowanie" a="cyfrowe selektywne wywolanie DSC (w VHF - kanal 70), a nie radiotelegrafia" ru="Алярм - цифровой избирательный вызов DSC (в VHF канал 70)." />
          <Fact q="Obszar A1 (SOLAS)" a="zasieg VHF stacji brzegowej z ciagla lacznoscia alarmowa DSC (~30 Mm); w A1 NAVTEX/EGC sluza tylko do odbioru" ru="Район A1: зона береговой VHF с непрерывным DSC (~30 миль); NAVTEX/EGC - только приём." />
          <Fact q="Wyposazenie w A1" a="nadajnik-odbiornik VHF z DSC na kanale 70 (2187,5 kHz to MF/A2, a 406 MHz to EPIRB)" ru="В A1: VHF с DSC на 70 (2187,5 кГц - MF/A2, 406 МГц - EPIRB)." />
        </Card>
      </Section>

      <Section id="navtex" num={13} pl="NAVTEX" ru="NAVTEX">
        <Card>
          <Fact q="Charakter" a="urzadzenie WYLACZNIE ODBIORCZE (bez pozwolenia radiowego); waskopasmowa telegrafia NBDP w trybie FEC z korekcja bledow" ru="NAVTEX - только приёмник (без разрешения); узкополосная NBDP, режим FEC." />
          <Fact q="Czestotliwosci" a="518 kHz (miedzynarodowy, jezyk ANGIELSKI), 490 kHz (krajowy, jezyk lokalny), 4209,5 kHz" ru="Частоты: 518 кГц (межд., англ.), 490 кГц (нац., местный язык), 4209,5 кГц." />
          <Fact q="Zasieg i pora doby" a="typowo ~200-400 Mm; NOCA dalej (fala jonosferyczna na falach srednich); okno nadawania 10 min co 4 h" ru="Дальность ~200-400 миль; ночью дальше (ионосфера); окно 10 мин каждые 4 ч." />
          <Fact q="Naglowek ZCZC B1 B2 nn" a="B1 = stacja nadajaca, B2 = rodzaj: A nawigacyjne, B meteo (ostrzezenie), D SAR - NIEwylaczalne; E prognoza pogody" ru="Заголовок ZCZC B1B2: B1 - станция, B2 - тип (A навиг., B метео, D SAR - не отключить; E прогноз)." />
          <Fact q="Numer 00 i grupa koncowa" a="numer 00 = alarm (kazdy odbiornik drukuje); NNNN = odebrano poprawnie (bledy <4%), NNN = blad/przerwany wydruk" ru="Номер 00 - тревога (печатают все); NNNN - принято ок (<4% ошибок), NNN - сбой." />
          <Fact q="Koordynator MSI w PL" a="Biuro Hydrograficzne Marynarki Wojennej; wykaz stacji: ITU List of Coast Stations (List IV)" ru="Координатор MSI в Польше - Гидрографическое бюро ВМФ; список - ITU List IV." />
        </Card>
      </Section>

      <Section id="epirb" num={14} pl="EPIRB / COSPAS-SARSAT" ru="EPIRB / COSPAS-SARSAT">
        <Card>
          <Fact q="Czestotliwosci radioplawy" a="406 MHz (alarmowanie satelitarne) + 121,5 MHz (naprowadzanie/homing dla SAR); od 2009 satelity NIE przetwarzaja 121,5" ru="EPIRB: 406 МГц (алярм) + 121,5 МГц (наведение SAR); с 2009 спутники 121,5 не обрабатывают." />
          <Fact q="LEOSAR vs GEOSAR" a="LEOSAR biegunowe 850-1000 km, okres ~100-105 min, okno widocznosci 12-16 min, pozycja z dopplera; GEOSAR geostacjonarne (4-6 sat.), powiadomienie ~5 min, BEZ pozycji" ru="LEOSAR (полярные) - позиция по Доплеру; GEOSAR (геостац.) - оповещение ~5 мин, без позиции." />
          <Fact q="Dokladnosc i bateria" a="406 MHz ~5 km (dawne 121,5 ~20 km); bateria min. 48 h; impulsy ~0,5 s co 50 s" ru="Точность 406 МГц ~5 км (121,5 ~20 км); батарея >=48 ч; импульс ~0,5 с каждые 50 с." />
          <Fact q="Uruchomienie i rejestracja" a="zwalniak hydrostatyczny (auto po zatonieciu) lub recznie; rejestracja w UKE; kod MID/MMSI; test raz w miesiacu (samotest)" ru="Гидростат (авто после затопления) или вручную; регистрация в UKE; тест раз в месяц." />
          <Fact q="Schemat alarmowania" a="radioplawa -> satelita biegunowy -> stacja LUT (liczy pozycje) -> centrum MCC -> RCC -> jednostki SAR" ru="Цепочка: EPIRB -> спутник -> LUT (расчёт позиции) -> MCC -> RCC -> силы SAR." />
        </Card>
      </Section>

      <Section id="sart" num={15} pl="SART i AIS-SART" ru="SART и AIS-SART">
        <Card>
          <Fact q="SART - transponder radarowy" a="pasmo X 9 GHz (przemiata 9,2-9,5 GHz); na radarze: 12 kropek -> luki (<1 Mm) -> okregi (<0,1 Mm)" ru="SART - радарный ответчик, X-диапазон 9 ГГц; на радаре 12 точек -> дуги (<1 мили) -> кольца (<0,1)." />
          <Fact q="Pozycja i montaz" a="pozycja rozbitkow = pierwsze (najblizsze) echo; montowac JAK NAJWYZEJ" ru="Позиция - первое (ближайшее) эхо; ставить как можно выше." />
          <Fact q="Zasieg SART" a="statek ~5-7 Mm (SART 1 m, radar 10-15 m); samolot 3000 ft ~30-40 Mm; bateria 96 h czuwania + 8 h nadawania" ru="Дальность: судно ~5-7 миль, самолёт 3000 футов ~30-40; батарея 96 ч + 8 ч передачи." />
          <Fact q="AIS-SART" a="nadaje komunikaty AIS (odbierany transponderami AIS, NIE radarem); numer 970YYXXXX; zasieg >=5 NM (antena 15 m), samolot 1000 m >=30 NM; symbol: czerwony okrag ze skrzyzowanymi liniami" ru="AIS-SART: шлёт AIS (принимают AIS, не радар); номер 970YYXXXX; символ - красный круг с крестом." />
        </Card>
      </Section>

      <Section id="fizyka" num={16} pl="Moc, antena, zasieg, squelch" ru="Мощность, антенна, дальность, шумоподавление">
        <Card>
          <Fact q="Moc nadawania" a="statkowy VHF: max 25 W, redukcja do 1 W (port, bliska odleglosc); moc decyduje o zasiegu nadawania, nie o odbiorze dalekich stacji" ru="Мощность VHF: макс. 25 Вт, снижение до 1 Вт; влияет на дальность передачи, не приёма." />
          <Fact q="Zasieg (radiogoryzont)" a="quasi-optyczny (line of sight), zalezy od WYSOKOSCI anten (nie mocy/pory doby); d[km] ~ 4·sqrt(h[m]); dwie anteny 4·(sqrt h1 + sqrt h2); 100 m -> 40 km, 64 m -> 32 km" ru="Дальность квазиоптическая, зависит от высоты антенн; d[км] ~ 4·корень(h); 100 м -> 40 км." />
          <Fact q="Antena" a="VHF: pionowy dipol cwiercfalowy (0,25 dlugosci fali), montaz najwyzej i z dala od metalu (strefy cienia); NAVTEX: antena pretowa 2-4 m, dookolna" ru="Антенна VHF - четвертьволновый диполь (0,25λ), выше и от металла; NAVTEX - штырь 2-4 м." />
          <Fact q="Dual watch / squelch" a="dual watch = jednoczesny nasluch 16 + jeden kanal roboczy; squelch (blokada szumow) wylacza wzmacniacz akustyczny, gdy sygnal za slaby" ru="Dual watch - слушать 16 + рабочий; squelch - гасит шум при слабом сигнале." />
        </Card>
      </Section>

      <Section id="zasilanie" num={17} pl="Akumulatory i zasilanie" ru="Аккумуляторы и питание">
        <Card>
          <Fact q="Elektrolit i wentylacja" a="akumulator kwasowy: elektrolit = wodny roztwor kwasu siarkowego; ladowanie wydziela WODOR - pomieszczenie musi byc wentylowane" ru="Кислотный акб: электролит - водный раствор H2SO4; при заряде выделяется водород - вентиляция." />
          <Fact q="Napiecie i gestosc" a="napiecie koncowe rozladowania 1,75 V/ogniwo; gestosc 1,28 g/cm3 (naladowany), 1,10 (rozladowany), tropik ~1,23" ru="Конечное напряжение 1,75 В/элемент; плотность 1,28 (заряжен), 1,10 (разряжен), тропики ~1,23." />
          <Fact q="Temperatura i przechowywanie" a="pojemnosc spada ok. 0,5-1 % na kazdy stopien C; przechowuj NALADOWANY (rozladowany ulega zasiarczeniu)" ru="Ёмкость падает ~0,5-1%/градус; хранить заряженным (иначе сульфатация)." />
          <Fact q="Uzupelnianie" a="odparowuje tylko woda - uzupelniaj WYLACZNIE wode destylowana, nigdy kwas" ru="Испаряется только вода - доливать только дистиллят, никогда кислоту." />
        </Card>
      </Section>

      <Tip>
        {tp(
          'Дальше: закрепи практикой - Тренинг UKE (полный банк с объяснениями), Шпаргалка и Симулятор рации на страницах раздела Радио.',
          'Next: drill it - the UKE trainer (full bank with explanations), the cheat sheet and the radio simulator, all in the Radio section.',
          'Dalej: przecwicz - Trening UKE (pelny bank z wyjasnieniami), Sciaga i Symulator radia w dziale Radio.',
        )}
      </Tip>

      <div className="mt-6 flex flex-wrap gap-3">
        <Link href="/radio/test" className="flex min-h-[44px] items-center rounded-xl px-4 text-sm font-medium" style={{ background: 'var(--bg-card)', color: 'var(--text-primary)', border: '1px solid var(--border-subtle)' }}>
          {tp('Тренинг UKE', 'UKE trainer', 'Trening UKE')} {'->'}
        </Link>
        <Link href="/radio/sciaga" className="flex min-h-[44px] items-center rounded-xl px-4 text-sm font-medium" style={{ background: 'var(--bg-card)', color: 'var(--text-primary)', border: '1px solid var(--border-subtle)' }}>
          {tp('Шпаргалка', 'Cheat sheet', 'Sciaga')} {'->'}
        </Link>
      </div>
    </main>
  );
}

function TocLink({ id, pl, ru }: { id: string; pl: string; ru: string }) {
  const { lang } = useI18n();
  return (
    <a href={`#${id}`} className="flex min-h-[40px] items-center rounded-lg px-2 py-1 text-sm transition hover:opacity-80" style={{ color: 'var(--text-secondary)' }}>
      {lang === 'ru' ? ru : pl}
    </a>
  );
}
