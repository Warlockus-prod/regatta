// ============================================================================
// Training scenarios for the VHF/DSC simulator. Data-driven: each step
// declares (a) what the user must do, (b) a `check` observing the radio
// state machine, (c) a WHY explanation (PL + RU - shown per language policy),
// and optional mistake detectors. Procedures follow ITU-R M.493 / IMO / SRC
// teaching, verified 2026 (see docs/design/sternik-radio.md).
// ============================================================================

import {
  CHANNELS, INITIAL_RADIO, NATURES, OTHERDSC_CATEGORIES, OTHERDSC_TYPES,
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
  kind: 'mayday-fire' | 'panpan-mob' | 'panpan-engine' | 'securite-hazard' | 'radio-check' | 'cancel-false';
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
      todo: { pl: 'Otworz [OTHER DSC] (albo Menu > Other DSC)', ru: 'Открой [OTHER DSC] (или Menu > Other DSC)' },
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
      todo: { pl: 'Otworz [OTHER DSC]', ru: 'Открой [OTHER DSC]' },
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
      todo: { pl: '[OTHER DSC]: All Ships / Safety -> Send', ru: '[OTHER DSC]: All Ships / Safety -> Send' },
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
      todo: { pl: 'Zakoncz procedure: [FINISH], potem [STBY]', ru: 'Заверши процедуру: [FINISH], затем [STBY]' },
      why: {
        pl: 'Jak w instrukcji ICOM: FINISH zamyka czesc glosowa, a STBY konczy cala procedure Distress Cancel i wraca do normalnej pracy. Zostan na nasluchu 16 - stacja brzegowa moze miec pytania.',
        ru: 'Как в инструкции ICOM: FINISH закрывает голосовую часть, а STBY завершает всю процедуру Distress Cancel и возвращает к обычной работе. Останься на вахте 16 - у береговой станции могут быть вопросы.',
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

export const SCENARIOS: Scenario[] = [
  fireScenario,
  mobScenario,
  engineScenario,
  securiteScenario,
  radioCheckScenario,
  cancelScenario,
];

