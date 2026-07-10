// ============================================================================
// Training scenarios for the VHF/DSC simulator. Data-driven: each step
// declares (a) what the user must do, (b) a `check` observing the radio
// state machine, (c) a WHY explanation (PL + RU - shown per language policy),
// and optional mistake detectors. Procedures follow ITU-R M.493 / IMO / SRC
// teaching, verified 2026 (see docs/design/sternik-radio.md).
// ============================================================================

import {
  CHANNELS, INITIAL_RADIO, NATURES, OTHERDSC_CATEGORIES, OTHERDSC_TYPES,
  RX_CALLER, RX_DISTRESS,
  type RadioEvent, type RadioState, type Vessel,
} from './radioModel';

export interface Bi { pl: string; ru: string }

/** Resolved scenario variant used to render the voice lines. */
export interface VariantData {
  vessel: Vessel;
  posSpoken: string;
  /** persons on board as a spoken English word, e.g. FOUR */
  pobWord: string;
  pob: number;
}

export interface VoiceSpec {
  /** id understood by /api/radio-voice grading. */
  kind:
    | 'mayday-fire' | 'panpan-mob' | 'panpan-engine' | 'securite-hazard'
    | 'radio-check' | 'cancel-false' | 'routine-marina' | 'routine-ship'
    | 'routine-group' | 'panpan-medico' | 'vts-report' | 'mayday-relay'
    | 'mayday-ack' | 'answer-call';
  /** lines the user "reads" when stepping through with PTT clicks. */
  lines: (v: VariantData) => string[];
}

export interface ScenarioStep {
  id: string;
  /** short instruction (always shown in nauka mode; hidden in egzamin). */
  todo: Bi;
  /** the didactic "why this step exists / why this way". */
  why: Bi;
  check: (e: RadioEvent, prev: RadioState, next: RadioState) => boolean;
  /** voice transmission attached to this step (PTT walk-through or Whisper). */
  voice?: VoiceSpec;
}

export interface MistakeDetector {
  id: string;
  text: Bi;
  detect: (e: RadioEvent, prev: RadioState, next: RadioState, done: Set<string>) => boolean;
}

export interface Scenario {
  id: string;
  icon: string;
  title: Bi;
  /** the situation briefing shown before start. */
  brief: Bi;
  steps: ScenarioStep[];
  mistakes: MistakeDetector[];
  /** debrief note shown at the end (nuances, judgment calls). */
  debrief?: Bi;
  /** optional prepared radio state (e.g. the false alert already sent). */
  init?: (vessel: Vessel) => RadioState;
}

const ch = (s: RadioState) => CHANNELS[s.channelIndex].num;

// --- shared step builders ----------------------------------------------------

const stepPower = (): ScenarioStep => ({
  id: 'power',
  todo: { pl: 'Wlacz radiostacje (przytrzymaj pokretlo [DIAL] 1 s)', ru: 'Включи рацию (удержи ручку [DIAL] 1 с)' },
  why: {
    pl: 'Wlaczone radio pelni ciagly nasluch na kanale 16 i cyfrowo na kanale 70 (DSC). Bez zasilania nie ma ani nasluchu, ani mozliwosci nadania alarmu.',
    ru: 'Включённая рация несёт непрерывную вахту на 16 канале и цифровую на 70 (DSC). Без питания нет ни вахты, ни возможности подать сигнал.',
  },
  check: (e, prev, next) => e.type === 'dial-hold' && !prev.power && next.power,
});

const stepDistressCompose = (): ScenarioStep => ({
  id: 'compose',
  todo: { pl: 'Otworz ekran DISTRESS (softkey [DISTRESS] albo Menu > Distress)', ru: 'Открой экран DISTRESS (софткей [DISTRESS] или Menu > Distress)' },
  why: {
    pl: 'Alarm "designated" (z podanym rodzajem zagrozenia) mowi ratownikom, CO sie dzieje, zanim uslysza glos. Ekran Distress pozwala wybrac rodzaj przed nadaniem.',
    ru: 'Алерт «designated» (с указанным родом бедствия) сообщает спасателям, ЧТО случилось, ещё до голосовой связи. Экран Distress позволяет выбрать род до отправки.',
  },
  check: (e, prev, next) => prev.screen !== 'distress-compose' && next.screen === 'distress-compose',
});

const stepNature = (nature: string): ScenarioStep => ({
  id: 'nature',
  todo: { pl: `Ustaw Nature: ${nature} ([ENT] na wierszu Nature, wybierz, [ENT])`, ru: `Выбери род бедствия: ${nature} ([ENT] на строке Nature, выбор, [ENT])` },
  why: {
    pl: 'Rodzaj zagrozenia idzie w cyfrowym alercie (ITU-R M.493). Sluzby SAR od razu wiedza, jaki sprzet i procedury przygotowac. Bez wyboru poleci "Undesignated" - dziala, ale mowi mniej.',
    ru: 'Род бедствия передаётся в цифровом алерте (ITU-R M.493). Службы SAR сразу знают, какое оборудование и процедуры готовить. Без выбора уйдёт «Undesignated» - работает, но информации меньше.',
  },
  check: (e, prev, next) => e.type === 'ent' && prev.screen === 'distress-nature' && NATURES[next.natureIndex] === nature,
});

const stepHold = (): ScenarioStep => ({
  id: 'hold',
  todo: { pl: 'Podnies oslone i PRZYTRZYMAJ czerwony [DISTRESS] przez 3 sekundy', ru: 'Подними крышку и УДЕРЖИ красную [DISTRESS] 3 секунды' },
  why: {
    pl: 'Oslona i wymog 3 sekund chronia przed przypadkowym alarmem (falszywe alerty to realny problem GMDSS). Radio odlicza sygnalami i nadaje alert DSC na kanale 70: MMSI + pozycja z GPS + rodzaj zagrozenia.',
    ru: 'Крышка и удержание 3 секунды защищают от случайного алерта (ложные тревоги - реальная проблема GMDSS). Рация отсчитывает бипами и передаёт DSC-алерт на 70 канале: MMSI + позиция GPS + род бедствия.',
  },
  check: (e) => e.type === 'distress-held',
});

const stepAck = (): ScenarioStep => ({
  id: 'ack',
  todo: { pl: 'Czekaj na potwierdzenie DSC (ACK) od stacji brzegowej - nie wylaczaj radia', ru: 'Жди подтверждение DSC (ACK) от береговой станции - не выключай рацию' },
  why: {
    pl: 'Do czasu ACK radio samo powtarza alert co 3,5-4,5 min. Z zasady ACK przez DSC nadaje tylko stacja brzegowa (statki potwierdzaja glosem; wyjatek M.541: gdy zadna stacja nie odbiera, statek moze zamknac powtorki przez DSC). W Polsce dyzur trzyma POLISH RESCUE RADIO (MMSI 002618102) i MRCK Gdynia.',
    ru: 'До получения ACK рация сама повторяет алерт каждые 3,5-4,5 мин. По правилу ACK по DSC даёт только береговая станция (суда подтверждают голосом; исключение M.541: если никто не принял алерт, судно может остановить повторы по DSC). В Польше вахту несёт POLISH RESCUE RADIO (MMSI 002618102) и MRCK Gdynia.',
  },
  check: (e) => e.type === 'coast-ack',
});

const stepAlarmOff = (): ScenarioStep => ({
  id: 'alarmoff',
  todo: { pl: 'Wylacz alarm ([ALARM OFF]) - radio samo ustawi kanal 16', ru: 'Отключи сигнал ([ALARM OFF]) - рация сама встанет на 16 канал' },
  why: {
    pl: 'Po ACK caly ruch w niebezpieczenstwie przenosi sie na kanal 16 (radiotelefonia). Radio robi to automatycznie - zostaje nadac komunikat glosem.',
    ru: 'После ACK весь обмен по бедствию идёт на 16 канале (голос). Рация переключается автоматически - остаётся передать сообщение голосом.',
  },
  check: (e, prev, next) => e.type === 'soft' && prev.screen === 'distress-ack' && next.screen === 'distress-ack-done',
});

// --- scenario 1: fire -> designated MAYDAY ----------------------------------

const MAYDAY_FIRE_LINES = (v: VariantData) => [
  'MAYDAY MAYDAY MAYDAY',
  `THIS IS ${v.vessel.name}, ${v.vessel.name}, ${v.vessel.name}`,
  `CALL SIGN ${v.vessel.call}, MMSI ${v.vessel.mmsi}`,
  `MAYDAY ${v.vessel.name}`,
  `POSITION ${v.posSpoken}`,
  'FIRE ON BOARD, FIRE IS NOT UNDER CONTROL',
  'REQUIRE IMMEDIATE ASSISTANCE',
  `${v.pobWord} PERSONS ON BOARD, ABANDONING TO LIFERAFT IF NEEDED`,
  'OVER',
];

const fireScenario: Scenario = {
  id: 'fire-mayday',
  icon: '🔥',
  title: { pl: 'Pozar na jachcie - MAYDAY', ru: 'Пожар на яхте - MAYDAY' },
  brief: {
    pl: 'Plyniesz swoim jachtem po Zatoce Gdanskiej (dane jednostki - w karcie wariantu obok). W komorze silnika wybuchl pozar, gasnica nie wystarcza, dym gestnieje. Zycie zalogi jest bezposrednio zagrozone - to sytuacja DISTRESS.',
    ru: 'Ты идёшь на своей яхте по Гданьскому заливу (данные судна - в карточке варианта рядом). В моторном отсеке пожар, огнетушителя не хватает, дым густеет. Жизнь экипажа под прямой угрозой - это DISTRESS.',
  },
  steps: [
    stepPower(),
    stepDistressCompose(),
    stepNature('Fire,Explosion'),
    stepHold(),
    stepAck(),
    stepAlarmOff(),
    {
      id: 'mayday-voice',
      todo: { pl: 'Nadaj MAYDAY glosem na kanale 16 (trzymaj PTT)', ru: 'Передай MAYDAY голосом на 16 канале (держи PTT)' },
      why: {
        pl: 'Cyfrowy alert to tylko naglowek. Glosem podajesz to, czego DSC nie przenosi: liczbe osob, rozwoj sytuacji, potrzebna pomoc. Kolejnosc (schemat MIPDANIO): MAYDAY x3 -> THIS IS + nazwa x3 -> znak/MMSI -> MAYDAY + nazwa -> pozycja -> rodzaj zagrozenia -> potrzebna pomoc -> liczba osob -> OVER.',
        ru: 'Цифровой алерт - только «заголовок». Голосом передаёшь то, чего нет в DSC: число людей, развитие ситуации, нужную помощь. Порядок (схема MIPDANIO): MAYDAY x3 -> THIS IS + название x3 -> позывной/MMSI -> MAYDAY + название -> позиция -> род бедствия -> нужная помощь -> число людей -> OVER.',
      },
      // Durable check: only requires PTT keyed on CH16 - the step is active
      // only after alarm-off anyway, and [STBY] must not brick the scenario.
      check: (e, prev, next) => e.type === 'ptt-down' && ch(next) === '16' && next.ptt,
      voice: { kind: 'mayday-fire', lines: MAYDAY_FIRE_LINES },
    },
  ],
  mistakes: [
    {
      id: 'voice-before-dsc',
      text: {
        pl: 'PTT przed nadaniem alertu DSC - najpierw alert (kanal 70), potem glos.',
        ru: 'PTT до отправки DSC-алерта - сначала алерт (канал 70), потом голос.',
      },
      detect: (e, prev, next, done) => e.type === 'ptt-down' && !done.has('hold') && !prev.distressActive,
    },
    {
      id: 'undesignated',
      text: {
        pl: 'Alert poszedl bez rodzaju zagrozenia (Undesignated) - dziala, ale ratownicy wiedza mniej.',
        ru: 'Алерт ушёл без рода бедствия (Undesignated) - работает, но спасатели знают меньше.',
      },
      detect: (e, prev, next, done) => e.type === 'distress-held' && NATURES[next.natureIndex] === 'Undesignated',
    },
  ],
  debrief: {
    pl: 'Gdyby ACK nie przyszlo w ok. 15 sekund, i tak nadajesz MAYDAY glosem na 16 - nie czekasz w nieskonczonosc. Radio powtarza alert DSC samo, dopoki stacja nie potwierdzi.',
    ru: 'Если ACK не пришёл за ~15 секунд - всё равно передавай MAYDAY голосом на 16, не жди бесконечно. DSC-алерт рация повторяет сама, пока станция не подтвердит.',
  },
};

// --- scenario 2: MOB in sight -> PAN-PAN ------------------------------------

const PANPAN_MOB_LINES = (v: VariantData) => [
  'PAN PAN, PAN PAN, PAN PAN',
  'ALL STATIONS, ALL STATIONS, ALL STATIONS',
  `THIS IS ${v.vessel.name}, ${v.vessel.name}, ${v.vessel.name}`,
  `CALL SIGN ${v.vessel.call}, MMSI ${v.vessel.mmsi}`,
  `POSITION ${v.posSpoken}`,
  'MAN OVERBOARD, PERSON IN SIGHT, RECOVERY IN PROGRESS',
  'ALL VESSELS IN VICINITY KEEP CLEAR AND REDUCE WAKE',
  'OVER',
];

const mobScenario: Scenario = {
  id: 'mob-panpan',
  icon: '🛟',
  title: { pl: 'Czlowiek za burta (widoczny) - PAN-PAN', ru: 'Человек за бортом (виден) - PAN-PAN' },
  brief: {
    pl: 'Podczas zwrotu kolega wypadl za burte. WIDZISZ go, ma kamizelke, manewr powrotu trwa. Wokol inne jachty. Trzeba ostrzec ruch wokol - kategoria PILNOSC (PAN-PAN). Gdyby czlowiek zniknal z oczu lub byl nieprzytomny - to bylby MAYDAY (nature: Man Overboard).',
    ru: 'На повороте товарищ выпал за борт. Ты его ВИДИШЬ, он в жилете, манёвр возврата идёт. Вокруг другие яхты. Нужно предупредить окружающий трафик - категория СРОЧНОСТЬ (PAN-PAN). Если бы человек пропал из виду или был без сознания - это был бы MAYDAY (род: Man Overboard).',
  },
  steps: [
    stepPower(),
    {
      id: 'otherdsc',
      todo: { pl: 'M330: [OTHER DSC]. M323: Menu > DSC Calls > All Ships Call', ru: 'M330: [OTHER DSC]. M323: Menu > DSC Calls > All Ships Call' },
      why: {
        pl: 'PAN-PAN to NIE czerwony przycisk - ten jest tylko dla DISTRESS. Wywolania pilnosci i bezpieczenstwa sklada sie z menu Other DSC jako "All Ships".',
        ru: 'PAN-PAN - это НЕ красная кнопка, она только для DISTRESS. Вызовы срочности и безопасности собираются в меню Other DSC как «All Ships».',
      },
      check: (e, prev, next) => prev.screen !== 'otherdsc-compose' && next.screen === 'otherdsc-compose',
    },
    {
      id: 'urgency-sent',
      todo: { pl: 'Ustaw Type: All Ships, Category: Urgency i wyslij (Send)', ru: 'Выставь Type: All Ships, Category: Urgency и отправь (Send)' },
      why: {
        pl: 'Cyfrowa zapowiedz "All Ships / Urgency" na kanale 70 podbija uwage wszystkich radiostacji w zasiegu i wskazuje kanal 16 dla tresci. Zapowiedz pilnosci NIE jest potwierdzana przez DSC.',
        ru: 'Цифровое объявление «All Ships / Urgency» на 70 канале привлекает внимание всех радиостанций в зоне и указывает 16 канал для сообщения. Объявление срочности НЕ подтверждается по DSC.',
      },
      check: (e, prev, next) =>
        e.type === 'ent' && next.screen === 'otherdsc-sent'
        && next.odSent?.type === 'All Ships' && next.odSent?.category === 'Urgency',
    },
    {
      id: 'panpan-voice',
      todo: { pl: 'Nadaj PAN-PAN glosem na kanale 16', ru: 'Передай PAN-PAN голосом на 16 канале' },
      why: {
        pl: 'Struktura: PAN PAN x3 -> ALL STATIONS x3 -> THIS IS + nazwa x3 -> pozycja -> sytuacja -> czego oczekujesz od ruchu wokol -> OVER. Prowords zostaja angielskie takze na polskim egzaminie.',
        ru: 'Структура: PAN PAN x3 -> ALL STATIONS x3 -> THIS IS + название x3 -> позиция -> ситуация -> чего ждёшь от судов вокруг -> OVER. Служебные слова остаются английскими и на польском экзамене.',
      },
      check: (e, prev, next) => e.type === 'ptt-down' && ch(next) === '16' && next.ptt,
      voice: { kind: 'panpan-mob', lines: PANPAN_MOB_LINES },
    },
  ],
  mistakes: [
    {
      id: 'red-button-for-panpan',
      text: {
        pl: 'Czerwony DISTRESS przy sytuacji pilnosci - alarm bedzie falszywy. Czerwony klawisz = tylko bezposrednie zagrozenie zycia/statku.',
        ru: 'Красная DISTRESS в ситуации срочности - алерт будет ложным. Красная кнопка = только прямая угроза жизни/судну.',
      },
      detect: (e) => e.type === 'distress-held',
    },
  ],
  debrief: {
    pl: 'Granica PAN-PAN / MAYDAY przy MOB to ocena sytuacji: osoba widoczna i podejmowana = PAN-PAN; stracona z oczu, noc, hipotermia, brak kamizelki = MAYDAY. PAN-PAN wolno "podniesc" do MAYDAY, gdy sytuacja sie pogarsza.',
    ru: 'Граница PAN-PAN / MAYDAY при MOB - оценка ситуации: человек виден и его поднимают = PAN-PAN; потерян из виду, ночь, гипотермия, без жилета = MAYDAY. PAN-PAN можно «поднять» до MAYDAY, если ситуация ухудшается.',
  },
};

// --- scenario 3: engine breakdown, drifting -> PAN-PAN ----------------------

const PANPAN_ENGINE_LINES = (v: VariantData) => [
  'PAN PAN, PAN PAN, PAN PAN',
  'ALL STATIONS, ALL STATIONS, ALL STATIONS',
  `THIS IS ${v.vessel.name}, ${v.vessel.name}, ${v.vessel.name}`,
  `CALL SIGN ${v.vessel.call}, MMSI ${v.vessel.mmsi}`,
  `POSITION ${v.posSpoken}`,
  'ENGINE BREAKDOWN, DRIFTING TOWARDS SHORE',
  'REQUIRE TOW ASSISTANCE',
  `${v.pobWord} PERSONS ON BOARD`,
  'OVER',
];

const engineScenario: Scenario = {
  id: 'engine-panpan',
  icon: '⚙️',
  title: { pl: 'Awaria silnika, dryf - PAN-PAN', ru: 'Отказ двигателя, дрейф - PAN-PAN' },
  brief: {
    pl: 'Silnik zgasl i nie odpala, kotwica nie trzyma, jacht dryfuje w strone brzegu. Nikt nie tonie, ale potrzebujesz holowania, zanim zrobi sie niebezpiecznie. To klasyczna PILNOSC: PAN-PAN.',
    ru: 'Двигатель заглох и не заводится, якорь не держит, яхту сносит к берегу. Никто не тонет, но нужна буксировка, пока не стало опасно. Классическая СРОЧНОСТЬ: PAN-PAN.',
  },
  steps: [
    stepPower(),
    {
      id: 'otherdsc',
      todo: { pl: 'M330: [OTHER DSC]. M323: Menu > DSC Calls > All Ships Call', ru: 'M330: [OTHER DSC]. M323: Menu > DSC Calls > All Ships Call' },
      why: {
        pl: 'Awaria bez zagrozenia zycia = pilnosc, nie distress. Skladamy wywolanie z menu DSC, nie czerwonym klawiszem.',
        ru: 'Поломка без угрозы жизни = срочность, не бедствие. Вызов собирается в меню DSC, не красной кнопкой.',
      },
      check: (e, prev, next) => prev.screen !== 'otherdsc-compose' && next.screen === 'otherdsc-compose',
    },
    {
      id: 'urgency-sent',
      todo: { pl: 'All Ships / Urgency -> Send', ru: 'All Ships / Urgency -> Send' },
      why: {
        pl: 'Zapowiedz DSC dociera tez do stacji brzegowej - to czesto najszybsza droga do zorganizowania holowania.',
        ru: 'DSC-объявление доходит и до береговой станции - часто это самый быстрый путь организовать буксировку.',
      },
      check: (e, prev, next) =>
        e.type === 'ent' && next.screen === 'otherdsc-sent'
        && next.odSent?.type === 'All Ships' && next.odSent?.category === 'Urgency',
    },
    {
      id: 'panpan-voice',
      todo: { pl: 'Nadaj PAN-PAN glosem na 16', ru: 'Передай PAN-PAN голосом на 16' },
      why: {
        pl: 'W tresci podaj: pozycje, co sie stalo (awaria, dryf), czego potrzebujesz (holowanie), ile osob. Zakoncz OVER - czekasz na odpowiedz.',
        ru: 'В сообщении: позиция, что случилось (поломка, дрейф), что нужно (буксировка), сколько людей. Закончи OVER - ждёшь ответ.',
      },
      check: (e, prev, next) => e.type === 'ptt-down' && ch(next) === '16' && next.ptt,
      voice: { kind: 'panpan-engine', lines: PANPAN_ENGINE_LINES },
    },
  ],
  mistakes: [
    {
      id: 'red-button',
      text: {
        pl: 'DISTRESS przy zwyklej awarii = falszywy alarm. Zycie nie jest bezposrednio zagrozone.',
        ru: 'DISTRESS при обычной поломке = ложная тревога. Жизни ничего прямо не угрожает.',
      },
      detect: (e) => e.type === 'distress-held',
    },
  ],
};

// --- scenario 4: floating hazard -> SECURITE ---------------------------------

const SECURITE_LINES = (v: VariantData) => [
  'SECURITE, SECURITE, SECURITE',
  'ALL STATIONS, ALL STATIONS, ALL STATIONS',
  `THIS IS ${v.vessel.name}, ${v.vessel.name}, ${v.vessel.name}`,
  'DRIFTING CONTAINER, PARTLY SUBMERGED',
  `POSITION ${v.posSpoken}`,
  'DANGER TO NAVIGATION, KEEP SHARP LOOKOUT',
  'OUT',
];

const securiteScenario: Scenario = {
  id: 'securite-hazard',
  icon: '⚠️',
  title: { pl: 'Kontener na torze - SECURITE', ru: 'Контейнер на фарватере - SECURITE' },
  brief: {
    pl: 'Mijasz na wpol zatopiony kontener dryfujacy przy torze wodnym. Tobie nic nie grozi, ale to realne niebezpieczenstwo nawigacyjne dla innych. Kategoria BEZPIECZENSTWO: SECURITE.',
    ru: 'Ты прошёл мимо полузатопленного контейнера у фарватера. Тебе ничего не грозит, но для других это реальная навигационная опасность. Категория БЕЗОПАСНОСТЬ: SECURITE.',
  },
  steps: [
    stepPower(),
    {
      id: 'safety-sent',
      todo: { pl: 'M330: [OTHER DSC]. M323: DSC Calls > All Ships. Ustaw Safety -> Send', ru: 'M330: [OTHER DSC]. M323: DSC Calls > All Ships. Выбери Safety -> Send' },
      why: {
        pl: 'Zapowiedz Safety na kanale 70 uprzedza wszystkich, ze zaraz na 16 poleci komunikat o bezpieczenstwie. Jak przy pilnosci - bez potwierdzenia DSC.',
        ru: 'Объявление Safety на 70 канале предупреждает всех, что сейчас на 16 будет сообщение о безопасности. Как и срочность - без подтверждения по DSC.',
      },
      check: (e, prev, next) =>
        e.type === 'ent' && next.screen === 'otherdsc-sent'
        && next.odSent?.type === 'All Ships' && next.odSent?.category === 'Safety',
    },
    {
      id: 'securite-voice',
      todo: { pl: 'Nadaj SECURITE glosem na 16, zakoncz OUT', ru: 'Передай SECURITE голосом на 16, закончи OUT' },
      why: {
        pl: 'SECURITE x3 -> ALL STATIONS x3 -> THIS IS + nazwa -> tresc ostrzezenia (co, gdzie, zalecenie) -> OUT, bo nie oczekujesz odpowiedzi. Duze stacje przenosza tresc na kanal roboczy; krotkie ostrzezenie z jachtu w praktyce idzie na 16.',
        ru: 'SECURITE x3 -> ALL STATIONS x3 -> THIS IS + название -> текст предупреждения (что, где, рекомендация) -> OUT, потому что ответа не ждёшь. Большие станции переносят текст на рабочий канал; короткое предупреждение с яхты на практике идёт на 16.',
      },
      check: (e, prev, next) => e.type === 'ptt-down' && ch(next) === '16' && next.ptt,
      voice: { kind: 'securite-hazard', lines: SECURITE_LINES },
    },
  ],
  mistakes: [
    {
      id: 'urgency-instead-safety',
      text: {
        pl: 'Kategoria Urgency zamiast Safety - ostrzezenie nawigacyjne to kategoria bezpieczenstwa.',
        ru: 'Категория Urgency вместо Safety - навигационное предупреждение относится к категории безопасности.',
      },
      detect: (e, prev, next) => e.type === 'ent' && next.screen === 'otherdsc-sent' && next.odSent?.category === 'Urgency',
    },
  ],
};

// --- scenario 5: routine radio check (NOT on 16) -----------------------------

const RADIO_CHECK_LINES = (v: VariantData) => [
  'MARINA GDYNIA, MARINA GDYNIA',
  `THIS IS ${v.vessel.name}, ${v.vessel.name}`,
  'RADIO CHECK, OVER',
];

const radioCheckScenario: Scenario = {
  id: 'radio-check',
  icon: '📞',
  title: { pl: 'Radio check w marinie', ru: 'Проверка связи с мариной' },
  brief: {
    pl: 'Wychodzisz z Mariny Gdynia i chcesz sprawdzic, czy radio nadaje i odbiera. Wywolania rutynowe NIE ida na kanale 16 - marina Gdynia pracuje na kanale 12.',
    ru: 'Выходишь из марины Гдыня и хочешь проверить, что рация передаёт и принимает. Рутинные вызовы НЕ идут на 16 канале - марина Гдыня работает на 12.',
  },
  steps: [
    stepPower(),
    {
      id: 'ch12',
      todo: { pl: 'Ustaw kanal 12 (pokretlo albo [^]/[v])', ru: 'Выставь канал 12 (ручка или [^]/[v])' },
      why: {
        pl: 'Kanal 16 jest zarezerwowany dla niebezpieczenstwa i wywolan - nie wolno go blokowac testami. W Polsce porty/mariny pracuja na 10/12/14 (Gdynia - 12). Kanal 9 to konwencja amerykanska, nie polska.',
        ru: 'Канал 16 зарезервирован для бедствия и вызовов - занимать его проверками нельзя. В Польше порты/марины работают на 10/12/14 (Гдыня - 12). Канал 9 - американская конвенция, не польская.',
      },
      check: (e, prev, next) => ch(next) === '12' && ch(prev) !== '12',
    },
    {
      id: 'lowpower',
      todo: { pl: 'Przelacz moc na 1W ([HI/LO])', ru: 'Переключи мощность на 1 Вт ([HI/LO])' },
      why: {
        pl: 'W porcie i na krotkim dystansie nadaje sie mala moca (1W), zeby nie zasmiecac eteru w promieniu 20 mil. 25W zostaw na otwarta wode.',
        ru: 'В порту и на короткой дистанции передают малой мощностью (1 Вт), чтобы не забивать эфир в радиусе 20 миль. 25 Вт - для открытой воды.',
      },
      check: (e, prev, next) => e.type === 'soft' && prev.hiPower && !next.hiPower,
    },
    {
      id: 'check-voice',
      todo: { pl: 'Nadaj wywolanie radio check (PTT)', ru: 'Передай вызов radio check (PTT)' },
      why: {
        pl: 'Schemat: [stacja wywolywana] x2 -> THIS IS + nazwa x2 -> RADIO CHECK -> OVER. Odpowiedz oceni slyszalnosc w skali 1-5 ("READABILITY FIVE" = doskonale) albo "LOUD AND CLEAR".',
        ru: 'Схема: [вызываемая станция] x2 -> THIS IS + название x2 -> RADIO CHECK -> OVER. Ответ оценит слышимость по шкале 1-5 («READABILITY FIVE» = отлично) или «LOUD AND CLEAR».',
      },
      check: (e, prev, next) => e.type === 'ptt-down' && ch(next) === '12' && next.ptt,
      voice: { kind: 'radio-check', lines: RADIO_CHECK_LINES },
    },
  ],
  mistakes: [
    {
      id: 'check-on-16',
      text: {
        pl: 'Radio check na kanale 16 - kanal alarmowy nie sluzy do testow. Uzyj kanalu roboczego mariny.',
        ru: 'Radio check на 16 канале - аварийный канал не для проверок. Используй рабочий канал марины.',
      },
      detect: (e, prev, next) => e.type === 'ptt-down' && ch(next) === '16' && next.ptt,
    },
  ],
};

// --- scenario 6: false alert -> cancel ---------------------------------------

const CANCEL_LINES = (v: VariantData) => [
  'ALL STATIONS, ALL STATIONS, ALL STATIONS',
  `THIS IS ${v.vessel.name}, ${v.vessel.name}, ${v.vessel.name}`,
  `CALL SIGN ${v.vessel.call}, MMSI ${v.vessel.mmsi}, POSITION ${v.posSpoken}`,
  'CANCEL MY DISTRESS ALERT OF TODAY, TIME 14 30 UTC',
  'OUT',
];

const cancelScenario: Scenario = {
  id: 'false-cancel',
  icon: '🚫',
  init: (vessel) => ({
    ...INITIAL_RADIO,
    power: true,
    screen: 'distress-wait',
    distressActive: true,
    natureIndex: 0,
    deviceLog: [
      { t: Date.now() - 4000, text: 'Power ON - watch on CH 16 / CH 70 (DSC)', kind: 'ui' },
      { t: Date.now() - 2000, text: `TX DSC DISTRESS on CH 70: MMSI ${vessel.mmsi}, nature Undesignated (PRZYPADKOWE nadanie!)`, kind: 'tx' },
    ],
  }),
  title: { pl: 'Falszywy alert DSC - odwolanie', ru: 'Ложный DSC-алерт - отмена' },
  brief: {
    pl: 'Podczas sprzatania kokpitu ktos oparl sie o radio i alert DISTRESS poszedl w eter (nature: Undesignated). Nic sie nie dzieje, wszyscy cali. Falszywy alert trzeba NATYCHMIAST odwolac - cyfrowo i glosem - inaczej ruszy akcja ratownicza.',
    ru: 'Во время уборки кокпита кто-то опёрся на рацию - и алерт DISTRESS ушёл в эфир (род: Undesignated). Ничего не происходит, все целы. Ложный алерт нужно НЕМЕДЛЕННО отменить - цифро и голосом - иначе начнётся спасательная операция.',
  },
  steps: [
    {
      id: 'cancel-open',
      todo: { pl: 'Wcisnij [CANCEL] na ekranie oczekiwania na ACK', ru: 'Нажми [CANCEL] на экране ожидания ACK' },
      why: {
        pl: 'Samo wylaczenie radia NIE zatrzymuje procedury - alert juz poszedl, a po wlaczeniu radio moze dalej powtarzac. Radio z funkcja cancel wysyla cyfrowe odwolanie (ITU-R M.493).',
        ru: 'Просто выключить рацию НЕ отменяет процедуру - алерт уже ушёл, а после включения рация может продолжить повторы. Рация с функцией cancel шлёт цифровую отмену (ITU-R M.493).',
      },
      check: (e, prev, next) => next.screen === 'cancel-confirm',
    },
    {
      id: 'cancel-continue',
      todo: { pl: 'Potwierdz [CONTINUE] - poleci DSC cancel, radio ustawi kanal 16', ru: 'Подтверди [CONTINUE] - уйдёт DSC cancel, рация встанет на 16' },
      why: {
        pl: 'Cyfrowe odwolanie zatrzymuje automatyczne powtorki alertu u wszystkich odbiorcow. Ale procedura IMO wymaga tez odwolania GLOSEM.',
        ru: 'Цифровая отмена останавливает автоповторы алерта у всех получателей. Но процедура IMO требует ещё и ГОЛОСОВОЙ отмены.',
      },
      check: (e, prev, next) => prev.screen === 'cancel-confirm' && (next.screen === 'cancel-tx' || next.screen === 'cancel-voice'),
    },
    {
      id: 'cancel-voice',
      todo: { pl: 'Nadaj odwolanie glosem na 16 (PTT): "ALL STATIONS... CANCEL MY DISTRESS ALERT..."', ru: 'Передай отмену голосом на 16 (PTT): «ALL STATIONS... CANCEL MY DISTRESS ALERT...»' },
      why: {
        pl: 'Formula IMO: ALL STATIONS x3 -> THIS IS + nazwa x3, znak, MMSI, pozycja -> CANCEL MY DISTRESS ALERT OF [data, czas UTC]. Potem nasluch na 16 i odpowiadanie na pytania stacji brzegowej. Za szybko odwolany falszywy alert nie grozi kara.',
        ru: 'Формула IMO: ALL STATIONS x3 -> THIS IS + название x3, позывной, MMSI, позиция -> CANCEL MY DISTRESS ALERT OF [дата, время UTC]. Потом вахта на 16 и ответы на вопросы береговой станции. За быстро отменённый ложный алерт наказания нет.',
      },
      check: (e, prev, next) => e.type === 'ptt-down' && ch(next) === '16' && next.ptt,
      voice: { kind: 'cancel-false', lines: CANCEL_LINES },
    },
    {
      id: 'finish',
      todo: { pl: 'M330: [FINISH], potem [STBY]. M323: [FINISH]', ru: 'M330: [FINISH], затем [STBY]. M323: [FINISH]' },
      why: {
        pl: 'Na M330 FINISH zamyka czesc glosowa, a STBY konczy cala procedure. Na M323 FINISH od razu wraca do pracy. Zostan na nasluchu 16.',
        ru: 'На M330 FINISH закрывает голосовую часть, а STBY завершает процедуру. На M323 FINISH сразу возвращает к работе. Останься на вахте 16.',
      },
      // Durable: reaching standby with the distress mode closed counts, even
      // if the user pressed [FINISH] earlier than scripted.
      check: (e, prev, next) => next.screen === 'standby' && !next.distressActive,
    },
  ],
  mistakes: [],
  debrief: {
    pl: 'Ten scenariusz zaczyna sie JUZ PO falszywym nadaniu (radio czeka na ACK). W realu: nie panikuj, nie wylaczaj radia "zeby bylo cicho" - odwolaj cyfrowo i glosem.',
    ru: 'Сценарий начинается УЖЕ ПОСЛЕ ложной отправки (рация ждёт ACK). В реальности: не паникуй и не выключай рацию «чтобы стало тихо» - отмени цифро и голосом.',
  },
};

// ===========================================================================
// Routine / test / medical / relay scenarios (second batch). These reuse the
// same reducer: routine correspondence on a working channel, Individual/Test
// DSC calls with ACK, an All-Ships medical urgency, and a spoken MAYDAY RELAY.
// ===========================================================================

/** Open Other DSC and land in compose with the requested call type selected.
 *  Model-agnostic: M330 opens Other DSC (All Ships) then changes Type; M323
 *  picks the type inside DSC Calls. Both end in compose with that type. */
const stepChooseType = (type: 'Individual' | 'Group' | 'Test', todo: Bi, why: Bi): ScenarioStep => ({
  id: 'type',
  todo,
  why,
  check: (_e, _prev, next) => next.screen === 'otherdsc-compose' && OTHERDSC_TYPES[next.odType] === type,
});

const stepDscAck = (): ScenarioStep => ({
  id: 'dsc-ack',
  todo: { pl: 'Czekaj na cyfrowe potwierdzenie (ACK) wywolywanej stacji', ru: 'Жди цифровое подтверждение (ACK) вызываемой станции' },
  why: {
    pl: 'Wywolania Individual i Test potwierdza cyfrowo stacja wywolywana. Po ACK radio wskaze uzgodniony kanal roboczy - kanaly 16 i 70 zostaja wolne.',
    ru: 'Вызовы Individual и Test подтверждаются цифро вызываемой станцией. После ACK рация укажет согласованный рабочий канал - каналы 16 и 70 остаются свободными.',
  },
  check: (_e, _prev, next) => next.screen === 'otherdsc-ack',
});

const stepDscAlarmOff = (): ScenarioStep => ({
  id: 'dsc-alarmoff',
  todo: { pl: 'Wylacz sygnal ([ALARM OFF]) - radio przejdzie na kanal roboczy', ru: 'Отключи сигнал ([ALARM OFF]) - рация перейдёт на рабочий канал' },
  why: {
    pl: 'Po ACK obie stacje sa na uzgodnionym kanale roboczym i mozna zaczac rozmowe glosem.',
    ru: 'После ACK обе станции на согласованном рабочем канале, и можно начинать разговор голосом.',
  },
  check: (e, prev, next) => e.type === 'soft' && prev.screen === 'otherdsc-ack' && next.screen === 'otherdsc-sent',
});

// --- scenario 7: routine call to a marina -----------------------------------

const MARINA_LINES = (v: VariantData) => [
  'MARINA GDYNIA, MARINA GDYNIA',
  `THIS IS ${v.vessel.name}, ${v.vessel.name}`,
  'REQUEST A BERTH FOR TONIGHT',
  `${v.pobWord} PERSONS ON BOARD, YACHT ELEVEN METRES`,
  'OVER',
];

const marinaScenario: Scenario = {
  id: 'routine-marina',
  icon: '⚓',
  title: { pl: 'Wywolanie mariny - miejsce w porcie', ru: 'Вызов марины - место в порту' },
  brief: {
    pl: 'Podchodzisz do Mariny Gdynia i chcesz zarezerwowac miejsce na noc. To zwykla korespondencja - na kanale roboczym mariny (12), nie na 16.',
    ru: 'Подходишь к марине Гдыня и хочешь место на ночь. Это обычная корреспонденция - на рабочем канале марины (12), не на 16.',
  },
  steps: [
    stepPower(),
    {
      id: 'ch12',
      todo: { pl: 'Ustaw kanal roboczy mariny - 12', ru: 'Выставь рабочий канал марины - 12' },
      why: {
        pl: 'Sprawy portowe zalatwia sie na kanale roboczym mariny. W Trojmiescie: Gdynia 12, Gdansk 14. Kanal 16 zostaje wolny dla wywolan i niebezpieczenstwa.',
        ru: 'Портовые дела решают на рабочем канале марины. В Труймясте: Гдыня 12, Гданьск 14. Канал 16 остаётся свободным для вызовов и бедствия.',
      },
      check: (_e, prev, next) => ch(next) === '12' && ch(prev) !== '12',
    },
    {
      id: 'marina-voice',
      todo: { pl: 'Wywolaj marine i popros o miejsce (PTT)', ru: 'Вызови марину и попроси место (PTT)' },
      why: {
        pl: 'Schemat: [stacja] x2 -> THIS IS + nazwa x2 -> tresc (prosba) -> OVER. Krotko i konkretnie: czego potrzebujesz, jaka jednostka, ile osob.',
        ru: 'Схема: [станция] x2 -> THIS IS + название x2 -> суть (просьба) -> OVER. Коротко и по делу: что нужно, какое судно, сколько людей.',
      },
      check: (e, _prev, next) => e.type === 'ptt-down' && ch(next) === '12' && next.ptt,
      voice: { kind: 'routine-marina', lines: MARINA_LINES },
    },
  ],
  mistakes: [
    {
      id: 'marina-on-16',
      text: { pl: 'Wywolanie portowe na kanale 16 - uzyj kanalu roboczego mariny (12).', ru: 'Портовый вызов на 16 - используй рабочий канал марины (12).' },
      detect: (e, _prev, next) => e.type === 'ptt-down' && ch(next) === '16' && next.ptt,
    },
  ],
};

// --- scenario 8: traffic report to VTS --------------------------------------

const VTS_LINES = (v: VariantData) => [
  'VTS ZATOKA GDANSKA, VTS ZATOKA GDANSKA',
  `THIS IS ${v.vessel.name}, ${v.vessel.name}`,
  `CALL SIGN ${v.vessel.call}`,
  `POSITION ${v.posSpoken}`,
  'INBOUND TO GDYNIA, REQUEST PERMISSION TO ENTER THE TRAFFIC ZONE',
  'OVER',
];

const vtsScenario: Scenario = {
  id: 'vts-report',
  icon: '🗼',
  title: { pl: 'Meldunek do VTS Zatoka Gdanska', ru: 'Доклад в VTS Гданьский залив' },
  brief: {
    pl: 'Wchodzisz w rejon ruchu Zatoki Gdanskiej. Sluzba VTS Zatoka Gdanska (kanal 71) porzadkuje ruch - zglos sie z pozycja i zamiarem. To korespondencja rutynowa.',
    ru: 'Входишь в зону движения Гданьского залива. Служба VTS (канал 71) управляет трафиком - доложись с позицией и намерением. Рутинная корреспонденция.',
  },
  steps: [
    stepPower(),
    {
      id: 'ch71',
      todo: { pl: 'Ustaw kanal VTS - 71', ru: 'Выставь канал VTS - 71' },
      why: {
        pl: 'VTS Zatoka Gdanska pracuje na kanale 71. Meldujesz sie tam, nie na 16 - 16 zostaje dla wywolan i niebezpieczenstwa.',
        ru: 'VTS Гданьского залива работает на 71 канале. Докладываешься там, не на 16 - 16 остаётся для вызовов и бедствия.',
      },
      check: (_e, prev, next) => ch(next) === '71' && ch(prev) !== '71',
    },
    {
      id: 'vts-voice',
      todo: { pl: 'Zglos sie do VTS z pozycja i zamiarem (PTT)', ru: 'Доложись в VTS с позицией и намерением (PTT)' },
      why: {
        pl: 'Podaj: kogo wolasz, twoja nazwa i znak, pozycja, zamiar (wejscie/wyjscie, dokad). VTS potrzebuje pozycji i intencji, zeby rozdzielic ruch.',
        ru: 'Сообщи: кого вызываешь, своё название и позывной, позицию, намерение (вход/выход, куда). VTS нужны позиция и намерение, чтобы разводить трафик.',
      },
      check: (e, _prev, next) => e.type === 'ptt-down' && ch(next) === '71' && next.ptt,
      voice: { kind: 'vts-report', lines: VTS_LINES },
    },
  ],
  mistakes: [],
};

// --- scenario 9: medical urgency (PAN-PAN medico) ---------------------------

const MEDICO_LINES = (v: VariantData) => [
  'PAN PAN, PAN PAN, PAN PAN',
  'ALL STATIONS, ALL STATIONS, ALL STATIONS',
  `THIS IS ${v.vessel.name}, ${v.vessel.name}, ${v.vessel.name}`,
  `MMSI ${v.vessel.mmsi}, CALL SIGN ${v.vessel.call}`,
  `POSITION ${v.posSpoken}`,
  'ONE CREW MEMBER INJURED, DEEP CUT TO THE HAND, HEAVY BLEEDING',
  'REQUEST MEDICAL ADVICE',
  `${v.pobWord} PERSONS ON BOARD`,
  'OVER',
];

const medicoScenario: Scenario = {
  id: 'panpan-medico',
  icon: '🩹',
  title: { pl: 'Kontuzja zalogi - PAN-PAN medyczny', ru: 'Травма экипажа - PAN-PAN медицинский' },
  brief: {
    pl: 'Czlonek zalogi mocno rozcial dlon, krwawienie trudno opanowac. Zycie nie jest jeszcze bezposrednio zagrozone, ale potrzebujesz porady medycznej. To PILNOSC medyczna: PAN-PAN.',
    ru: 'Член экипажа сильно порезал руку, кровотечение трудно остановить. Жизнь пока не под прямой угрозой, но нужна медицинская консультация. Это медицинская СРОЧНОСТЬ: PAN-PAN.',
  },
  steps: [
    stepPower(),
    {
      id: 'otherdsc',
      todo: { pl: 'M330: [OTHER DSC]. M323: Menu > DSC Calls > All Ships Call', ru: 'M330: [OTHER DSC]. M323: Menu > DSC Calls > All Ships Call' },
      why: {
        pl: 'Zapowiedz pilnosci sklada sie jako All Ships - jak przy kazdym PAN-PAN. Czerwony DISTRESS to tylko bezposrednie zagrozenie zycia.',
        ru: 'Объявление срочности собирается как All Ships - как при любом PAN-PAN. Красная DISTRESS - только прямая угроза жизни.',
      },
      check: (_e, prev, next) => prev.screen !== 'otherdsc-compose' && next.screen === 'otherdsc-compose',
    },
    {
      id: 'urgency-sent',
      todo: { pl: 'All Ships / Urgency -> Send', ru: 'All Ships / Urgency -> Send' },
      why: {
        pl: 'Kategoria Urgency obejmuje takze sprawy medyczne. Zapowiedz na 70 kieruje wszystkich na 16 - odpowiedziec moze lekarz przez stacje brzegowa (RADIO MEDICO).',
        ru: 'Категория Urgency включает и медицинские дела. Объявление на 70 направляет всех на 16 - ответить может врач через береговую станцию (RADIO MEDICO).',
      },
      check: (e, _prev, next) => e.type === 'ent' && next.screen === 'otherdsc-sent' && next.odSent?.type === 'All Ships' && next.odSent?.category === 'Urgency',
    },
    {
      id: 'medico-voice',
      todo: { pl: 'Nadaj PAN-PAN medyczny glosem na 16', ru: 'Передай PAN-PAN медицинский голосом на 16' },
      why: {
        pl: 'Struktura jak PAN-PAN: PAN PAN x3 -> ALL STATIONS x3 -> THIS IS + nazwa -> pozycja -> uraz -> REQUEST MEDICAL ADVICE -> liczba osob -> OVER.',
        ru: 'Структура как PAN-PAN: PAN PAN x3 -> ALL STATIONS x3 -> THIS IS + название -> позиция -> травма -> REQUEST MEDICAL ADVICE -> число людей -> OVER.',
      },
      check: (e, _prev, next) => e.type === 'ptt-down' && ch(next) === '16' && next.ptt,
      voice: { kind: 'panpan-medico', lines: MEDICO_LINES },
    },
  ],
  mistakes: [
    {
      id: 'red-button-medico',
      text: { pl: 'Czerwony DISTRESS przy kontuzji bez zagrozenia zycia = falszywy alarm. Gdyby zycie bylo zagrozone (zawal, utrata przytomnosci) - wtedy MAYDAY.', ru: 'Красная DISTRESS при травме без угрозы жизни = ложная тревога. Если жизнь под угрозой (инфаркт, потеря сознания) - тогда MAYDAY.' },
      detect: (e) => e.type === 'distress-held',
    },
  ],
  debrief: {
    pl: 'Sprawy medyczne to Urgency, dopoki zycie nie jest bezposrednio zagrozone. Zawal, utrata przytomnosci, masywny krwotok - to juz MAYDAY. Porady medycznej udziela stacja brzegowa (RADIO MEDICO / sluzba SAR).',
    ru: 'Медицинские дела - это Urgency, пока жизнь не под прямой угрозой. Инфаркт, потеря сознания, массивное кровотечение - это уже MAYDAY. Медконсультацию даёт береговая станция (RADIO MEDICO / служба SAR).',
  },
};

// --- scenario 10: DSC test call (no voice) ----------------------------------

const dscTestScenario: Scenario = {
  id: 'dsc-test',
  icon: '🧪',
  title: { pl: 'Test DSC do stacji brzegowej', ru: 'DSC-тест на береговую станцию' },
  brief: {
    pl: 'Chcesz sprawdzic, czy caly lancuch DSC dziala (MMSI, GPS, nadawanie na 70). Sluzy do tego wywolanie Test do stacji brzegowej - bez alarmowania kogokolwiek glosem.',
    ru: 'Хочешь проверить, что вся цепочка DSC работает (MMSI, GPS, передача на 70). Для этого есть Test-вызов на береговую станцию - без голосового беспокойства.',
  },
  steps: [
    stepPower(),
    stepChooseType('Test',
      { pl: 'Wybierz Test Call do stacji brzegowej (M330: [OTHER DSC] > Type: Test; M323: DSC Calls > Test Call)', ru: 'Выбери Test Call на береговую станцию (M330: [OTHER DSC] > Type: Test; M323: DSC Calls > Test Call)' },
      { pl: 'Test to specjalny typ DSC - stacja brzegowa odpowiada automatycznym ACK. Adresuj do stacji brzegowej (Polish Rescue Radio), nie do All Ships.', ru: 'Test - специальный тип DSC: береговая станция отвечает автоматическим ACK. Адресуй на береговую станцию (Polish Rescue Radio), не на All Ships.' },
    ),
    {
      id: 'test-sent',
      todo: { pl: 'Wyslij wywolanie Test (Send)', ru: 'Отправь Test-вызов (Send)' },
      why: {
        pl: 'Radio nadaje krotka ramke testowa na kanale 70. Nie idzie zaden glos - to czysto cyfrowa kontrola.',
        ru: 'Рация шлёт короткий тестовый кадр на 70 канале. Голоса нет - это чисто цифровая проверка.',
      },
      check: (e, _prev, next) => e.type === 'ent' && next.screen === 'otherdsc-sent' && next.odSent?.type === 'Test',
    },
    stepDscAck(),
    {
      id: 'test-done',
      todo: { pl: 'Potwierdz ([ALARM OFF]) - test zaliczony', ru: 'Подтверди ([ALARM OFF]) - тест засчитан' },
      why: {
        pl: 'ACK potwierdza, ze twoj MMSI i tor nadawczo-odbiorczy dzialaja. To najlepszy sposob sprawdzenia DSC bez falszywego alarmu - nie ma czesci glosowej.',
        ru: 'ACK подтверждает, что твой MMSI и приёмо-передающий тракт работают. Лучший способ проверить DSC без ложной тревоги - голосовой части нет.',
      },
      check: (e, prev) => e.type === 'soft' && prev.screen === 'otherdsc-ack',
    },
  ],
  mistakes: [
    {
      id: 'test-all-ships',
      text: { pl: 'Test wyslany jako All Ships - test kieruje sie do konkretnej stacji brzegowej, ktora odpowie ACK.', ru: 'Test отправлен как All Ships - тест адресуют конкретной береговой станции, которая ответит ACK.' },
      detect: (e, _prev, next) => e.type === 'ent' && next.screen === 'otherdsc-sent' && next.odSent?.type === 'All Ships',
    },
  ],
};

// --- scenario 11: routine Individual DSC call to another vessel --------------

const SHIP_LINES = (v: VariantData) => [
  'TRAINING SHIP, TRAINING SHIP',
  `THIS IS ${v.vessel.name}, ${v.vessel.name}`,
  'GOOD MORNING, WHAT IS YOUR POSITION AND E T A',
  'OVER',
];

const shipScenario: Scenario = {
  id: 'routine-ship',
  icon: '📻',
  title: { pl: 'Wywolanie innej jednostki przez DSC', ru: 'Вызов другого судна через DSC' },
  brief: {
    pl: 'Chcesz porozmawiac z jednostka szkolna (TRAINING SHIP). Nowoczesnie robi sie to wywolaniem Individual DSC: radio "dzwoni" do konkretnego MMSI i proponuje kanal roboczy, a rozmowa idzie glosem - nie zajmujesz 16.',
    ru: 'Хочешь связаться с учебным судном (TRAINING SHIP). Современно это делают вызовом Individual DSC: рация «звонит» на конкретный MMSI и предлагает рабочий канал, а разговор идёт голосом - ты не занимаешь 16.',
  },
  steps: [
    stepPower(),
    stepChooseType('Individual',
      { pl: 'Wybierz Individual Call (M330: [OTHER DSC] > Type: Individual; M323: DSC Calls > Individual Call)', ru: 'Выбери Individual Call (M330: [OTHER DSC] > Type: Individual; M323: DSC Calls > Individual Call)' },
      { pl: 'Individual to wywolanie do jednego, konkretnego MMSI - jak telefon. Grupowe i All Ships to inne typy.', ru: 'Individual - вызов одного конкретного MMSI, как телефон. Групповой и All Ships - другие типы.' },
    ),
    {
      id: 'ship-sent',
      todo: { pl: 'Ustaw adresata (TRAINING SHIP) i kanal roboczy (np. 72), potem Send', ru: 'Выставь адресата (TRAINING SHIP) и рабочий канал (напр. 72), затем Send' },
      why: {
        pl: 'W wywolaniu Individual wskazujesz MMSI odbiorcy i proponowany kanal roboczy. Nigdy nie proponuj 16 do rozmowy - to kanal wywolan i niebezpieczenstwa.',
        ru: 'В вызове Individual указываешь MMSI получателя и предлагаемый рабочий канал. Никогда не предлагай 16 для разговора - это канал вызовов и бедствия.',
      },
      check: (e, _prev, next) => e.type === 'ent' && next.screen === 'otherdsc-sent' && next.odSent?.type === 'Individual',
    },
    stepDscAck(),
    stepDscAlarmOff(),
    {
      id: 'ship-voice',
      todo: { pl: 'Rozmawiaj na uzgodnionym kanale roboczym (PTT)', ru: 'Говори на согласованном рабочем канале (PTT)' },
      why: {
        pl: 'Po ACK obie stacje sa na kanale roboczym. Wywolanie glosem: [jednostka] x2 -> THIS IS + nazwa x2 -> tresc -> OVER.',
        ru: 'После ACK обе станции на рабочем канале. Голосовой вызов: [судно] x2 -> THIS IS + название x2 -> суть -> OVER.',
      },
      check: (e, _prev, next) => e.type === 'ptt-down' && next.ptt && ch(next) !== '70',
      voice: { kind: 'routine-ship', lines: SHIP_LINES },
    },
  ],
  mistakes: [
    {
      id: 'routine-designate-16',
      text: { pl: 'Wywolanie rutynowe wskazalo kanal 16 do rozmowy - wybierz kanal roboczy (np. 72).', ru: 'Рутинный вызов назначил канал 16 для разговора - выбери рабочий канал (напр. 72).' },
      detect: (e, _prev, next) => e.type === 'ent' && next.screen === 'otherdsc-sent' && next.odSent?.type === 'Individual' && next.odSent?.channel === '16',
    },
  ],
};

// --- scenario 12: relay another vessel's MAYDAY -----------------------------

const RELAY_LINES = (v: VariantData) => [
  'MAYDAY RELAY, MAYDAY RELAY, MAYDAY RELAY',
  'ALL STATIONS, ALL STATIONS, ALL STATIONS',
  `THIS IS ${v.vessel.name}, ${v.vessel.name}, ${v.vessel.name}`,
  'RECEIVED THE FOLLOWING MAYDAY FROM YACHT NEPTUN',
  'POSITION FIVE FOUR FOUR ZERO NORTH, ZERO ONE EIGHT FIVE ZERO EAST',
  'NEPTUN IS SINKING, THREE PERSONS ON BOARD, TAKING TO THE LIFERAFT',
  'OVER',
];

const relayScenario: Scenario = {
  id: 'mayday-relay',
  icon: '📡',
  title: { pl: 'Retransmisja cudzego MAYDAY', ru: 'Ретрансляция чужого MAYDAY' },
  brief: {
    pl: 'Slyszysz na 16 slaby MAYDAY jachtu NEPTUN (tonie, 3 osoby), ale stacja brzegowa nie odpowiada - twoj sygnal siega dalej. Twoim obowiazkiem jest retransmitowac ten alarm: MAYDAY RELAY. NIE nadajesz wlasnego MAYDAY (tobie nic nie grozi) ani nie uzywasz czerwonego przycisku.',
    ru: 'Слышишь на 16 слабый MAYDAY яхты NEPTUN (тонет, 3 человека), но береговая станция не отвечает - твой сигнал добивает дальше. Твоя обязанность - ретранслировать: MAYDAY RELAY. НЕ передаёшь свой MAYDAY (тебе ничего не грозит) и не жмёшь красную кнопку.',
  },
  steps: [
    stepPower(),
    {
      id: 'ch16-relay',
      todo: { pl: 'Upewnij sie, ze jestes na kanale 16 (krotko [16/C])', ru: 'Убедись, что ты на 16 канале (коротко [16/C])' },
      why: {
        pl: 'Retransmisja MAYDAY idzie glosem na 16 - tam slychac ruch w niebezpieczenstwie. Krotkie [16/C] zawsze wraca na 16.',
        ru: 'Ретрансляция MAYDAY идёт голосом на 16 - там слышен обмен по бедствию. Короткое [16/C] всегда возвращает на 16.',
      },
      check: (e, _prev, next) => e.type === 'key-16c' && ch(next) === '16',
    },
    {
      id: 'relay-voice',
      todo: { pl: 'Nadaj MAYDAY RELAY glosem na 16', ru: 'Передай MAYDAY RELAY голосом на 16' },
      why: {
        pl: 'Formula: MAYDAY RELAY x3 -> ALL STATIONS x3 -> THIS IS + TWOJA nazwa x3 -> "RECEIVED FOLLOWING MAYDAY FROM..." -> nazwa, pozycja, rodzaj zagrozenia i liczba osob jednostki w niebezpieczenstwie -> OVER. Retransmitujesz CUDZE dane, nie swoje.',
        ru: 'Формула: MAYDAY RELAY x3 -> ALL STATIONS x3 -> THIS IS + ТВОЁ название x3 -> "RECEIVED FOLLOWING MAYDAY FROM..." -> название, позиция, род бедствия и число людей судна в беде -> OVER. Ретранслируешь ЧУЖИЕ данные, не свои.',
      },
      check: (e, _prev, next) => e.type === 'ptt-down' && ch(next) === '16' && next.ptt,
      voice: { kind: 'mayday-relay', lines: RELAY_LINES },
    },
  ],
  mistakes: [
    {
      id: 'relay-red-button',
      text: { pl: 'Czerwony DISTRESS przy retransmisji = nadanie WLASNEGO alarmu. Tobie nic nie grozi - MAYDAY RELAY idzie tylko glosem.', ru: 'Красная DISTRESS при ретрансляции = отправка СВОЕГО алерта. Тебе ничего не грозит - MAYDAY RELAY идёт только голосом.' },
      detect: (e) => e.type === 'distress-held',
    },
  ],
  debrief: {
    pl: 'MAYDAY RELAY nadaje stacja, ktora ODEBRALA cudzy MAYDAY i widzi, ze nikt go nie potwierdza - typowo stacja brzegowa, ale takze statek z lepszym zasiegiem. Nie mylic z wlasnym MAYDAY.',
    ru: 'MAYDAY RELAY передаёт станция, которая ПРИНЯЛА чужой MAYDAY и видит, что его никто не подтверждает - обычно береговая станция, но и судно с лучшей связью. Не путать со своим MAYDAY.',
  },
};

// --- scenario 15: group call to a regatta fleet -----------------------------

const GROUP_LINES = (v: VariantData) => [
  'REGATTA FLEET, REGATTA FLEET',
  `THIS IS ${v.vessel.name}, ${v.vessel.name}`,
  'ASSEMBLE AT THE START LINE, START IN TEN MINUTES',
  'OVER',
];

const groupScenario: Scenario = {
  id: 'group-call',
  icon: '⛵',
  title: { pl: 'Wywolanie grupowe - flota regatowa', ru: 'Групповой вызов - гоночная флотилия' },
  brief: {
    pl: 'Przed startem chcesz przekazac komunikat calej swojej grupie regatowej naraz. Sluzy do tego wywolanie grupowe DSC (Group) - dociera do jednostek z tym samym numerem grupowym, a tresc podajesz glosem na kanale roboczym.',
    ru: 'Перед стартом хочешь передать сообщение всей гоночной группе сразу. Для этого есть групповой вызов DSC (Group) - доходит до судов с тем же групповым номером, а текст передаёшь голосом на рабочем канале.',
  },
  steps: [
    stepPower(),
    stepChooseType('Group',
      { pl: 'Wybierz Group Call (M330: [OTHER DSC] > Type: Group; M323: DSC Calls > Group Call)', ru: 'Выбери Group Call (M330: [OTHER DSC] > Type: Group; M323: DSC Calls > Group Call)' },
      { pl: 'Group to wywolanie do zaprogramowanej grupy jednostek (wspolny numer grupowy MMSI). Nie jest potwierdzane ACK - jak All Ships.', ru: 'Group - вызов запрограммированной группы судов (общий групповой MMSI). Не подтверждается ACK - как All Ships.' },
    ),
    {
      id: 'group-sent',
      todo: { pl: 'Ustaw kanal roboczy i wyslij wywolanie grupowe (Send)', ru: 'Выставь рабочий канал и отправь групповой вызов (Send)' },
      why: {
        pl: 'Zapowiedz grupowa na kanale 70 kieruje cala grupe na wskazany kanal roboczy. Grupa nie odpowiada cyfrowo - od razu przechodzisz do glosu.',
        ru: 'Групповое объявление на 70 канале направляет всю группу на указанный рабочий канал. Группа не отвечает цифро - сразу переходишь к голосу.',
      },
      check: (e, _prev, next) => e.type === 'ent' && next.screen === 'otherdsc-sent' && next.odSent?.type === 'Group',
    },
    {
      id: 'group-voice',
      todo: { pl: 'Nadaj komunikat do floty glosem (PTT)', ru: 'Передай сообщение флотилии голосом (PTT)' },
      why: {
        pl: 'Schemat: [nazwa grupy] x2 -> THIS IS + nazwa x2 -> tresc komunikatu -> OVER.',
        ru: 'Схема: [название группы] x2 -> THIS IS + название x2 -> текст сообщения -> OVER.',
      },
      check: (e, _prev, next) => e.type === 'ptt-down' && next.ptt && ch(next) !== '70',
      voice: { kind: 'routine-group', lines: GROUP_LINES },
    },
  ],
  mistakes: [],
};

// ===========================================================================
// Receiving side: the radio starts already showing an inbound DSC call (via
// init, like false-cancel). No new events - the reducer renders the received
// call and the softkeys ([ALARM OFF] / [ACCEPT]) drive the response.
// ===========================================================================

// --- scenario 13: receive another vessel's MAYDAY ---------------------------

const MAYDAY_ACK_LINES = (v: VariantData) => [
  'MAYDAY NEPTUN, NEPTUN, NEPTUN',
  `THIS IS ${v.vessel.name}, ${v.vessel.name}, ${v.vessel.name}`,
  'RECEIVED MAYDAY',
  'OVER',
];

const receiveDistressScenario: Scenario = {
  id: 'receive-distress',
  icon: '📥',
  init: (vessel) => ({
    ...INITIAL_RADIO,
    power: true,
    screen: 'rx-distress-alert',
    rxDistress: { name: RX_DISTRESS.name, mmsi: RX_DISTRESS.mmsi, spoken: RX_DISTRESS.spoken, nature: RX_DISTRESS.nature, pob: RX_DISTRESS.pob },
    deviceLog: [
      { t: Date.now() - 3000, text: 'Power ON - watch on CH 16 / CH 70 (DSC)', kind: 'ui' },
      { t: Date.now() - 1000, text: `RX DSC DISTRESS from ${RX_DISTRESS.name} MMSI ${RX_DISTRESS.mmsi}, nature ${RX_DISTRESS.nature}`, kind: 'rx' },
    ],
  }),
  title: { pl: 'Odbior cudzego MAYDAY', ru: 'Приём чужого MAYDAY' },
  brief: {
    pl: 'Twoje radio odebralo cyfrowy alarm DISTRESS z jachtu NEPTUN (tonie, 3 osoby) - rozlega sie alarm. Jako jacht NIE potwierdzasz cudzego DISTRESS przez DSC (to rola stacji brzegowej): wyciszasz alarm, sluchasz 16 i potwierdzasz GLOSEM dopiero, gdy stacja brzegowa nie odpowiada.',
    ru: 'Твоя рация приняла цифровой DISTRESS с яхты NEPTUN (тонет, 3 человека) - звучит сигнал. Как яхта ты НЕ подтверждаешь чужой DISTRESS по DSC (это роль береговой станции): глушишь сигнал, слушаешь 16 и подтверждаешь ГОЛОСОМ только если береговая станция молчит.',
  },
  steps: [
    {
      id: 'alarm-off',
      todo: { pl: 'Wycisz alarm ([ALARM OFF]) - radio ustawi kanal 16 do nasluchu', ru: 'Заглуши сигнал ([ALARM OFF]) - рация встанет на 16 для прослушивания' },
      why: {
        pl: 'Nie potwierdzaj cudzego DISTRESS przez DSC - to zadanie stacji brzegowej, a przedwczesny ACK jachtu wstrzymuje powtorki alarmu. Wycisz i sluchaj: kto sie zglasza?',
        ru: 'Не подтверждай чужой DISTRESS по DSC - это задача береговой станции, а преждевременный ACK с яхты останавливает повторы. Заглуши и слушай: кто отвечает?',
      },
      check: (e, prev, next) => e.type === 'soft' && prev.screen === 'rx-distress-alert' && next.screen === 'standby' && ch(next) === '16',
    },
    {
      id: 'ack-voice',
      todo: { pl: 'Brak odpowiedzi stacji brzegowej - potwierdz odbior GLOSEM na 16', ru: 'Береговая станция молчит - подтверди приём ГОЛОСОМ на 16' },
      why: {
        pl: 'Gdy nikt nie potwierdza, a jestes w zasiegu: MAYDAY + nazwa jednostki w niebezpieczenstwie x3 -> THIS IS + TWOJA nazwa x3 -> RECEIVED MAYDAY. Potem rozwaz retransmisje i pomoc.',
        ru: 'Когда никто не подтверждает, а ты в зоне: MAYDAY + название судна в беде x3 -> THIS IS + ТВОЁ название x3 -> RECEIVED MAYDAY. Затем рассмотри ретрансляцию и помощь.',
      },
      check: (e, _prev, next) => e.type === 'ptt-down' && ch(next) === '16' && next.ptt,
      voice: { kind: 'mayday-ack', lines: MAYDAY_ACK_LINES },
    },
  ],
  mistakes: [
    {
      id: 'own-distress-on-receive',
      text: { pl: 'Nadales WLASNY alarm DISTRESS - tobie nic nie grozi. Cudzy MAYDAY sie potwierdza/retransmituje, nie dubluje wlasnym alarmem.', ru: 'Ты подал СВОЙ DISTRESS - тебе ничего не грозит. Чужой MAYDAY подтверждают/ретранслируют, а не дублируют своим алертом.' },
      detect: (e) => e.type === 'distress-held',
    },
  ],
  debrief: {
    pl: 'Kolejnosc przy odbiorze cudzego MAYDAY: 1) sluchaj, czy stacja brzegowa potwierdza; 2) jesli nie i jestes w zasiegu - potwierdz glosem RECEIVED MAYDAY; 3) rozwaz MAYDAY RELAY i pomoc. Jacht nie nadaje ACK przez DSC.',
    ru: 'Порядок при приёме чужого MAYDAY: 1) слушай, подтверждает ли береговая станция; 2) если нет и ты в зоне - подтверди голосом RECEIVED MAYDAY; 3) рассмотри MAYDAY RELAY и помощь. Яхта не даёт ACK по DSC.',
  },
};

// --- scenario 14: receive a routine individual DSC call ---------------------

const ANSWER_LINES = (v: VariantData) => [
  'TRAINING SHIP, TRAINING SHIP',
  `THIS IS ${v.vessel.name}, ${v.vessel.name}`,
  'GO AHEAD, OVER',
];

const receiveCallScenario: Scenario = {
  id: 'receive-call',
  icon: '📲',
  init: (vessel) => ({
    ...INITIAL_RADIO,
    power: true,
    screen: 'rx-individual-call',
    rxCall: { label: RX_CALLER.label, mmsi: RX_CALLER.mmsi, channel: RX_CALLER.channel },
    deviceLog: [
      { t: Date.now() - 2000, text: 'Power ON - watch on CH 16 / CH 70 (DSC)', kind: 'ui' },
      { t: Date.now() - 500, text: `RX DSC individual call from ${RX_CALLER.label} MMSI ${RX_CALLER.mmsi}, proposed CH ${RX_CALLER.channel}`, kind: 'rx' },
    ],
  }),
  title: { pl: 'Odbior wywolania indywidualnego DSC', ru: 'Приём индивидуального вызова DSC' },
  brief: {
    pl: 'Radio "dzwoni": jednostka szkolna (TRAINING SHIP) wywoluje cie indywidualnie przez DSC i proponuje kanal roboczy 72. Przyjmij wywolanie i odpowiedz glosem na uzgodnionym kanale.',
    ru: 'Рация «звонит»: учебное судно (TRAINING SHIP) вызывает тебя индивидуально по DSC и предлагает рабочий канал 72. Прими вызов и ответь голосом на согласованном канале.',
  },
  steps: [
    {
      id: 'accept',
      todo: { pl: 'Przyjmij wywolanie ([ACCEPT]) - radio przejdzie na proponowany kanal 72', ru: 'Прими вызов ([ACCEPT]) - рация перейдёт на предложенный канал 72' },
      why: {
        pl: 'ACCEPT potwierdza przyjecie i automatycznie przelacza na kanal roboczy zaproponowany przez wywolujacego - nie trzeba szukac kanalu recznie.',
        ru: 'ACCEPT подтверждает приём и автоматически переключает на рабочий канал, предложенный вызывающим - искать канал вручную не нужно.',
      },
      check: (e, prev, next) => e.type === 'soft' && prev.screen === 'rx-individual-call' && next.screen === 'standby' && ch(next) === RX_CALLER.channel,
    },
    {
      id: 'answer-voice',
      todo: { pl: 'Odpowiedz glosem na kanale roboczym (PTT)', ru: 'Ответь голосом на рабочем канале (PTT)' },
      why: {
        pl: 'Odpowiadasz na kanale roboczym: [wywolujacy] x2 -> THIS IS + nazwa x2 -> tresc (GO AHEAD / odpowiedz) -> OVER.',
        ru: 'Отвечаешь на рабочем канале: [вызывающий] x2 -> THIS IS + название x2 -> суть (GO AHEAD / ответ) -> OVER.',
      },
      check: (e, _prev, next) => e.type === 'ptt-down' && ch(next) === RX_CALLER.channel && next.ptt,
      voice: { kind: 'answer-call', lines: ANSWER_LINES },
    },
  ],
  mistakes: [],
};

export const SCENARIOS: Scenario[] = [
  fireScenario,
  mobScenario,
  engineScenario,
  securiteScenario,
  radioCheckScenario,
  cancelScenario,
  marinaScenario,
  vtsScenario,
  medicoScenario,
  dscTestScenario,
  shipScenario,
  groupScenario,
  relayScenario,
  receiveDistressScenario,
  receiveCallScenario,
];
