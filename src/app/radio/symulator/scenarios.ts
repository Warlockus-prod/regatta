// ============================================================================
// Training scenarios for the VHF/DSC simulator. Data-driven: each step
// declares (a) what the user must do, (b) a `check` observing the radio
// state machine, (c) a WHY explanation (PL + RU - shown per language policy),
// and optional mistake detectors. Procedures follow ITU-R M.493 / IMO / SRC
// teaching, verified 2026 (see docs/design/sternik-radio.md).
// ============================================================================

import {
  CHANNELS, INITIAL_RADIO, NATURES, OTHERDSC_TYPES,
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
  todo: { pl: 'Poczekaj na cyfrowe potwierdzenie stacji brzegowej (DSC ACK)', ru: 'Дождись цифрового подтверждения береговой станции (DSC ACK)' },
  why: {
    pl: 'W normalnym zasiegu A1 stacja brzegowa potwierdza alert przez DSC. Do czasu ACK radio samo powtarza alert w losowych odstepach 3,5-4,5 minuty. Jezeli ACK nie przychodzi po ok. 15 sekundach, wybierz 16/C i nadaj MAYDAY glosem, nie czekaj bez konca. W Polsce dyzur trzyma POLISH RESCUE RADIO (MMSI 002618102) i MRCK Gdynia.',
    ru: 'В обычной зоне A1 береговая станция подтверждает алерт по DSC. До ACK рация сама повторяет алерт через случайные интервалы 3,5-4,5 минуты. Если ACK не приходит примерно 15 секунд, выбери 16/C и передай MAYDAY голосом, не жди бесконечно. В Польше вахту несёт POLISH RESCUE RADIO (MMSI 002618102) и MRCK Gdynia.',
  },
  // The ACK is on a timer from distress-wait and may land during OR after the
  // voice MAYDAY, so accept the fresh event or the already-acknowledged state.
  // A one-shot `=== coast-ack` here would soft-lock if it fired while speaking.
  check: (e, prev, next) => e.type === 'coast-ack' || next.ackReceived,
});

const stepAlarmOff = (): ScenarioStep => ({
  id: 'alarmoff',
  todo: { pl: 'Wylacz alarm ([ALARM OFF]) - radio zostaje na kanale 16', ru: 'Отключи сигнал ([ALARM OFF]) - рация остаётся на 16 канале' },
  why: {
    pl: 'Alarm ACK ucichl - wylaczasz go, radio zostaje na kanale 16. Glosowy MAYDAY juz nadany; teraz sluchasz stacji brzegowej i odpowiadasz na jej pytania na 16 (to ona kieruje ruchem w niebezpieczenstwie).',
    ru: 'Сигнал ACK смолк - выключаешь его, рация остаётся на 16 канале. Голосовой MAYDAY уже передан; теперь слушаешь береговую станцию и отвечаешь на её вопросы на 16 (движением по бедствию управляет она).',
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
        pl: 'Po ACK i ALARM OFF radio automatycznie wybiera kanal 16. Cyfrowy alert to tylko naglowek; glosem podajesz to, czego DSC nie przenosi: liczbe osob, rozwoj sytuacji i potrzebna pomoc. Kolejnosc (MIPDANIO): MAYDAY x3 -> THIS IS + nazwa x3 -> znak/MMSI -> MAYDAY + nazwa -> pozycja -> rodzaj zagrozenia -> potrzebna pomoc -> liczba osob -> OVER.',
        ru: 'После ACK и ALARM OFF рация автоматически выбирает канал 16. Цифровой алерт - только заголовок; голосом передаёшь то, чего нет в DSC: число людей, развитие ситуации и нужную помощь. Порядок (MIPDANIO): MAYDAY x3 -> THIS IS + название x3 -> позывной/MMSI -> MAYDAY + название -> позиция -> род бедствия -> нужная помощь -> число людей -> OVER.',
      },
      // Durable check: only requires PTT keyed on the associated voice channel.
      check: (e, _prev, next) => e.type === 'ptt-down' && ch(next) === '16' && next.ptt,
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
      detect: (e, prev, next) => e.type === 'distress-held' && NATURES[next.natureIndex] === 'Undesignated',
    },
  ],
  debrief: {
    pl: 'Gdy ACK nie przyjdzie w ok. 15 sekund, wcisnij 16/C i nadaj MAYDAY glosem na 16. Nie wylaczaj alertu i nie czekaj bez konca: radio nadal powtarza DSC co 3,5-4,5 minuty.',
    ru: 'Если ACK не пришёл примерно за 15 секунд, нажми 16/C и передай MAYDAY голосом на 16. Не отменяй алерт и не жди бесконечно: рация продолжает повторять DSC каждые 3,5-4,5 минуты.',
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
  title: { pl: 'MOB widoczny, pomoc lokalna - PAN-PAN', ru: 'MOB виден, локальная помощь - PAN-PAN' },
  brief: {
    pl: 'To scenariusz operacyjny, nie odpowiedz do zadania nr 10 UKE. Widzisz osobe w kamizelce, manewr podjecia trwa i prosisz pobliskie jednostki o ograniczenie fali. Cwiczysz PAN-PAN. W zadaniu praktycznym UKE "czlowiek za burta" odpowiadaj MAYDAY. W realu MAYDAY jest wlasciwe zawsze, gdy potrzebna jest natychmiastowa pomoc z zewnatrz.',
    ru: 'Это операционный сценарий, а не ответ к заданию UKE номер 10. Человек виден, он в жилете, маневр подъема уже идет, а соседние суда просят уменьшить волну. Здесь тренируется PAN-PAN. В практическом задании UKE «человек за бортом» отвечай MAYDAY. В море MAYDAY нужен всегда, когда требуется немедленная внешняя помощь.',
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
    pl: 'Egzamin UKE: zadanie "czlowiek za burta" = MAYDAY. Ten wariant PAN-PAN dotyczy tylko sytuacji, w ktorej odzyskanie osoby juz trwa, pomoc ratownicza nie jest potrzebna, a komunikat ma pilnie uporzadkowac ruch wokol. Jesli masz watpliwosc co do zycia, widocznosci osoby lub skutecznosci podjecia, uzyj MAYDAY.',
    ru: 'Экзамен UKE: задание «человек за бортом» = MAYDAY. Этот вариант PAN-PAN относится только к ситуации, когда подъем уже идет, спасательная помощь не требуется, а сообщение должно срочно упорядочить движение рядом. Если есть сомнение в угрозе жизни, видимости человека или успехе подъема, используй MAYDAY.',
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
      id: 'securite-announce',
      todo: { pl: 'Na kanale 16 zapowiedz SECURITE i wskaz kanal roboczy 72', ru: 'На канале 16 объяви SECURITE и укажи рабочий канал 72' },
      why: {
        pl: 'Format egzaminacyjny UKE: na 16 idzie krotka zapowiedz SECURITE z informacja, gdzie sluchac tresci. Kanal 16 pozostaje wolny dla wywolan i distress.',
        ru: 'Экзаменационный формат UKE: на 16 передается короткое объявление SECURITE с указанием канала сообщения. Канал 16 остается свободным для вызовов и distress.',
      },
      check: (e, prev, next) => e.type === 'ptt-down' && ch(next) === '16' && next.ptt,
    },
    {
      id: 'securite-working',
      todo: { pl: 'Przejdz na kanal roboczy 72', ru: 'Перейди на рабочий канал 72' },
      why: {
        pl: 'Pelna tresc ostrzezenia jest dluzsza niz zapowiedz. Przeniesienie jej chroni kanal 16 przed blokowaniem.',
        ru: 'Полный текст предупреждения длиннее объявления. Перенос защищает канал 16 от блокировки.',
      },
      check: (_e, prev, next) => ch(next) === '72' && ch(prev) !== '72',
    },
    {
      id: 'securite-voice',
      todo: { pl: 'Nadaj pelna tresc SECURITE na 72 i zakoncz OUT', ru: 'Передай полный текст SECURITE на 72 и закончи OUT' },
      why: {
        pl: 'Powtorz SECURITE, ALL STATIONS i identyfikacje, potem podaj co, gdzie i jakie dzialanie zalecasz. OUT oznacza, ze nie oczekujesz odpowiedzi.',
        ru: 'Повтори SECURITE, ALL STATIONS и идентификацию, затем сообщи что, где и что рекомендуешь. OUT означает, что ответа не ждут.',
      },
      check: (e, _prev, next) => e.type === 'ptt-down' && ch(next) === '72' && next.ptt,
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
        pl: 'Do bliskiej lacznosci uzyj najmniejszej skutecznej mocy, tutaj 1 W. Ograniczasz zaklocenia i pobor pradu. Przejdz na 25 W, gdy sygnal jest za slaby lub sytuacja jest alarmowa.',
        ru: 'Для близкой связи используй минимальную достаточную мощность, здесь 1 Вт. Так меньше помех и расход энергии. Перейди на 25 Вт при слабой связи или аварии.',
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
  init: () => ({
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
    pl: 'Radio odebralo DSC DISTRESS z jachtu NEPTUN. Wycisz alarm, przejdz na 16 i sluchaj przez 5 minut. Sprawdz, czy brzeg lub RCC potwierdzily alarm i prowadza ruch. Gdy nie ma odpowiedzi, potwierdz glosem i poinformuj brzeg lub RCC. DSC ACK ze statku nie jest pierwszym krokiem.',
    ru: 'Рация приняла DSC DISTRESS с яхты NEPTUN. Заглуши сигнал, перейди на 16 и слушай 5 минут. Проверь, подтвердили ли берег или RCC сигнал и ведут ли обмен. Если ответа нет, подтверди голосом и сообщи берегу или RCC. DSC ACK с судна не является первым действием.',
  },
  steps: [
    {
      id: 'alarm-off',
      todo: { pl: 'Wycisz alarm ([ALARM OFF]) - radio ustawi kanal 16 do nasluchu', ru: 'Заглуши сигнал ([ALARM OFF]) - рация встанет на 16 для прослушивания' },
      why: {
        pl: 'Przedwczesny DSC ACK ze statku moze zatrzymac powtorki, zanim RCC przejmie alarm. Aktualna procedura IMO wymaga 5 minut nasluchu na 16 i oceny odpowiedzi brzegu.',
        ru: 'Преждевременный DSC ACK с судна может остановить повторы до того, как RCC примет сигнал. Актуальная процедура IMO требует 5 минут слушать канал 16 и оценить ответ берега.',
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
    pl: 'Procedura IMO MSC.1/Circ.1657: 1) sluchaj 16 przez 5 minut; 2) sprawdz ACK i ruch brzegu lub RCC; 3) gdy ich brak, potwierdz fonia, poinformuj brzeg lub RCC i ocen pomoc. Wyjatek: jezeli kolejne alerty nadal przychodza, statek jest bez watpienia blisko i skonsultowales sie z RCC lub stacja brzegowa, DSC ACK moze zakonczyc powtorki.',
    ru: 'Процедура IMO MSC.1/Circ.1657: 1) слушай 16 канал 5 минут; 2) проверь ACK и обмен берега или RCC; 3) если их нет, подтверди голосом, сообщи берегу или RCC и оцени помощь. Исключение: если сигналы продолжаются, судно точно находится рядом и состоялась консультация с RCC или берегом, DSC ACK может остановить повторы.',
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
  init: () => ({
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

// --- UKE device tasks 6-7 and 14-16: settings that used to be text-only ------

const scanMemoryScenario: Scenario = {
  id: 'scan-memory',
  icon: '⭐',
  init: () => ({ ...INITIAL_RADIO, favoriteChannels: ['12'] }),
  title: { pl: 'Pamiec skanowania: sprawdz i dodaj kanaly', ru: 'Память сканирования: проверка и добавление каналов' },
  brief: {
    pl: 'Wykonaj zadania 6 i 7 UKE. Najpierw rozpoznaj kanal juz oznaczony gwiazdka FAV, potem dodaj 06, 13 i 16 do listy skanowania.',
    ru: 'Выполни задания 6 и 7 UKE. Сначала найди канал, уже отмеченный звёздочкой FAV, затем добавь 06, 13 и 16 в список сканирования.',
  },
  steps: [
    stepPower(),
    {
      id: 'scan-review',
      todo: { pl: 'Przewijaj kanaly i znajdz oznaczony kanal 12', ru: 'Листай каналы и найди отмеченный канал 12' },
      why: {
        pl: 'Gwiazdka na ekranie oznacza kanal nalezacy do listy skanowania. Samo wlaczenie SCAN nie pokazuje pelnej listy.',
        ru: 'Звёздочка на экране означает канал из списка сканирования. Само включение SCAN не показывает полный список.',
      },
      check: (e, _prev, next) => (e.type === 'up' || e.type === 'down') && ch(next) === '12' && next.favoriteChannels.includes('12'),
    },
    {
      id: 'scan-add-06',
      todo: { pl: 'Ustaw kanal 06, pokaz [FAV] i nacisnij go', ru: 'Выставь канал 06, открой [FAV] и нажми его' },
      why: {
        pl: 'FAV dziala jak przelacznik: pierwsze nacisniecie dodaje gwiazdke, drugie usuwa kanal z listy.',
        ru: 'FAV работает как переключатель: первое нажатие добавляет звёздочку, второе удаляет канал из списка.',
      },
      check: (e, prev, next) => e.type === 'soft' && ch(prev) === '06' && !prev.favoriteChannels.includes('06') && next.favoriteChannels.includes('06'),
    },
    {
      id: 'scan-add-13',
      todo: { pl: 'Ustaw kanal 13 i dodaj go [FAV]', ru: 'Выставь канал 13 и добавь его [FAV]' },
      why: {
        pl: 'Lista jest pamiecia kanalow, ktore SCAN bedzie kolejno sprawdzal po zamknieciu blokady szumow.',
        ru: 'Это список каналов, которые SCAN будет последовательно проверять при закрытом шумоподавителе.',
      },
      check: (e, prev, next) => e.type === 'soft' && ch(prev) === '13' && !prev.favoriteChannels.includes('13') && next.favoriteChannels.includes('13'),
    },
    {
      id: 'scan-add-16',
      todo: { pl: 'Ustaw kanal 16 i dodaj go [FAV]', ru: 'Выставь канал 16 и добавь его [FAV]' },
      why: {
        pl: 'Po zadaniu lista ma zawierac 06, 13 i 16. Przed rozpoczeciem SCAN ustaw SQL powyzej OPEN.',
        ru: 'После задания список должен содержать 06, 13 и 16. Перед запуском SCAN выставь SQL выше OPEN.',
      },
      check: (e, prev, next) => e.type === 'soft' && ch(prev) === '16' && !prev.favoriteChannels.includes('16') && next.favoriteChannels.includes('16'),
    },
  ],
  mistakes: [],
};

const positionInputScenario: Scenario = {
  id: 'position-input',
  icon: '🧭',
  init: () => ({ ...INITIAL_RADIO, gpsValid: false }),
  title: { pl: 'Reczne wprowadzenie pozycji i czasu', ru: 'Ручной ввод позиции и времени' },
  brief: {
    pl: 'Odbiornik GPS jest odlaczony. Wprowadz recznie szerokosc, dlugosc i czas UTC sciezka wymagana w zadaniu 14 UKE. Dane reczne sa wazne tylko 23,5 godziny albo do wylaczenia radia.',
    ru: 'Приёмник GPS отключён. Введи вручную широту, долготу и UTC по пути из задания 14 UKE. Ручные данные действуют только 23,5 часа или до выключения рации.',
  },
  steps: [
    stepPower(),
    {
      id: 'settings-menu',
      todo: { pl: 'Wejdz: MENU > DSC Settings', ru: 'Открой: MENU > DSC Settings' },
      why: {
        pl: 'Pozycja do DSC jest ustawieniem systemu DSC, nie ustawieniem kanalu ani przesuniecia strefy czasowej.',
        ru: 'Позиция для DSC относится к настройкам DSC, а не к настройкам канала или часового пояса.',
      },
      check: (_e, prev, next) => prev.screen !== 'dsc-settings' && next.screen === 'dsc-settings',
    },
    {
      id: 'position-open',
      todo: { pl: 'Wybierz Position Input i wcisnij [ENT]', ru: 'Выбери Position Input и нажми [ENT]' },
      why: {
        pl: 'Reczny wpis jest dostepny tylko bez prawidlowych danych GPS. Przy aktywnym GPS radio blokuje ten ekran przed przypadkowym nadpisaniem pozycji.',
        ru: 'Ручной ввод доступен только без валидных данных GPS. При активном GPS рация блокирует случайную перезапись позиции.',
      },
      check: (_e, prev, next) => prev.screen === 'dsc-settings' && next.screen === 'position-input',
    },
    {
      id: 'position-lat',
      todo: { pl: 'Sprawdz szerokosc geograficzna i zatwierdz [FIN]', ru: 'Проверь широту и подтверди [FIN]' },
      why: {
        pl: 'Najpierw szerokosc: stopnie, minuty dziesietne i N albo S. Zly znak polkuli przenosi pozycje na drugi koniec swiata.',
        ru: 'Сначала широта: градусы, десятичные минуты и N либо S. Ошибка полушария переносит позицию на другой конец света.',
      },
      check: (_e, prev, next) => prev.screen === 'position-input' && prev.positionInputStage === 0 && next.positionInputStage === 1,
    },
    {
      id: 'position-lon',
      todo: { pl: 'Sprawdz dlugosc geograficzna i zatwierdz [FIN]', ru: 'Проверь долготу и подтверди [FIN]' },
      why: {
        pl: 'Dlugosc ma trzy cyfry stopni i znak E albo W. Zachowuj zera wiodace, np. 018 stopni.',
        ru: 'У долготы три цифры градусов и знак E либо W. Сохраняй ведущие нули, например 018 градусов.',
      },
      check: (_e, prev, next) => prev.screen === 'position-input' && prev.positionInputStage === 1 && next.positionInputStage === 2,
    },
    {
      id: 'position-save',
      todo: { pl: 'Sprawdz czas UTC i zapisz [FIN]', ru: 'Проверь время UTC и сохрани [FIN]' },
      why: {
        pl: 'DSC wysyla pozycje razem z czasem jej ustalenia. Stara pozycja bez czasu moze skierowac ratownikow w zle miejsce.',
        ru: 'DSC передаёт позицию вместе со временем её определения. Старая позиция без времени может направить спасателей не туда.',
      },
      check: (_e, prev, next) => prev.screen === 'position-input' && next.screen === 'dsc-settings' && next.deviceLog.length > prev.deviceLog.length,
    },
  ],
  mistakes: [],
};

const idAddScenario: Scenario = {
  id: 'id-add-lyngby',
  icon: '➕',
  init: () => ({
    ...INITIAL_RADIO,
    individualIds: INITIAL_RADIO.individualIds.filter((item) => item.mmsi !== '002191000'),
  }),
  title: { pl: 'Dodanie Lyngby do Individual ID', ru: 'Добавление Lyngby в Individual ID' },
  brief: {
    pl: 'Wykonaj zadanie 15 UKE: zapisz dunska stacje brzegowa LYNGBY pod prawidlowym MMSI 002191000.',
    ru: 'Выполни задание 15 UKE: сохрани датскую береговую станцию LYNGBY с правильным MMSI 002191000.',
  },
  steps: [
    stepPower(),
    {
      id: 'id-list',
      todo: { pl: 'Wejdz: MENU > DSC Settings > Individual ID', ru: 'Открой: MENU > DSC Settings > Individual ID' },
      why: {
        pl: 'Rejestr Individual ID jest ksiazka adresowa DSC. Nie wysylasz jeszcze wywolania.',
        ru: 'Реестр Individual ID является адресной книгой DSC. Сам вызов пока не передаётся.',
      },
      check: (_e, prev, next) => prev.screen !== 'individual-id-list' && next.screen === 'individual-id-list',
    },
    {
      id: 'id-add',
      todo: { pl: 'Nacisnij [ADD]', ru: 'Нажми [ADD]' },
      why: {
        pl: 'Numer stacji brzegowej ma dziewiec cyfr i zaczyna sie od 00. Te dwie cyfry radio blokuje.',
        ru: 'Номер береговой станции состоит из девяти цифр и начинается с 00. Эти две цифры рация фиксирует.',
      },
      check: (_e, prev, next) => prev.screen === 'individual-id-list' && next.screen === 'individual-id-add-mmsi',
    },
    {
      id: 'id-number',
      todo: { pl: 'Strzalkami i [ENT] wprowadz 002191000', ru: 'Стрелками и [ENT] введи 002191000' },
      why: {
        pl: 'MMSI musi byc dokladny. Jedna zla cyfra oznacza innego adresata albo brak odpowiedzi.',
        ru: 'MMSI должен быть точным. Одна неверная цифра означает другого адресата или отсутствие ответа.',
      },
      check: (_e, prev, next) => prev.screen === 'individual-id-add-mmsi' && next.screen === 'individual-id-add-name' && next.idEntryMmsi === '002191000',
    },
    {
      id: 'id-save',
      todo: { pl: 'Nazwa LYNGBY jest gotowa. Nacisnij [FIN]', ru: 'Имя LYNGBY готово. Нажми [FIN]' },
      why: {
        pl: 'Nazwa jest etykieta dla operatora, ale wywolanie jest adresowane dziewieciocyfrowym MMSI.',
        ru: 'Имя служит подписью для оператора, но вызов адресуется девятизначным MMSI.',
      },
      check: (_e, prev, next) => prev.screen === 'individual-id-add-name' && next.individualIds.some((item) => item.label === 'LYNGBY' && item.mmsi === '002191000'),
    },
  ],
  mistakes: [],
};

const idDeleteScenario: Scenario = {
  id: 'id-delete-lyngby',
  icon: '🗑️',
  title: { pl: 'Usuniecie Lyngby z Individual ID', ru: 'Удаление Lyngby из Individual ID' },
  brief: {
    pl: 'Wykonaj zadanie 16 UKE: znajdz LYNGBY, uzyj DEL i potwierdz OK. CANCEL ma zostawic wpis bez zmian.',
    ru: 'Выполни задание 16 UKE: найди LYNGBY, используй DEL и подтверди OK. CANCEL должен оставить запись без изменений.',
  },
  steps: [
    stepPower(),
    {
      id: 'id-list',
      todo: { pl: 'Wejdz: MENU > DSC Settings > Individual ID', ru: 'Открой: MENU > DSC Settings > Individual ID' },
      why: {
        pl: 'Usuwasz wpis z ksiazki adresowej, nie z historii polaczen DSC.',
        ru: 'Удаляется запись из адресной книги, а не из журнала вызовов DSC.',
      },
      check: (_e, prev, next) => prev.screen !== 'individual-id-list' && next.screen === 'individual-id-list',
    },
    {
      id: 'id-delete',
      todo: { pl: 'Zaznacz LYNGBY i nacisnij [DEL]', ru: 'Выбери LYNGBY и нажми [DEL]' },
      why: {
        pl: 'Najpierw sprawdz nazwe i pelny MMSI 002191000. DEL otwiera potwierdzenie, jeszcze niczego nie usuwa.',
        ru: 'Сначала проверь имя и полный MMSI 002191000. DEL открывает подтверждение и пока ничего не удаляет.',
      },
      check: (_e, prev, next) => prev.screen === 'individual-id-list' && prev.individualIds[prev.idCursor]?.mmsi === '002191000' && next.screen === 'individual-id-delete',
    },
    {
      id: 'id-delete-ok',
      todo: { pl: 'Potwierdz usuniecie [OK]', ru: 'Подтверди удаление [OK]' },
      why: {
        pl: 'OK usuwa wpis trwale. CANCEL wraca do listy bez zmiany.',
        ru: 'OK удаляет запись окончательно. CANCEL возвращает к списку без изменений.',
      },
      check: (_e, prev, next) => prev.screen === 'individual-id-delete' && !next.individualIds.some((item) => item.mmsi === '002191000'),
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
  scanMemoryScenario,
  positionInputScenario,
  idAddScenario,
  idDeleteScenario,
];
