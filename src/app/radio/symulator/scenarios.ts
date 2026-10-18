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
    | 'mayday-fire' | 'mayday-mob' | 'panpan-mob' | 'panpan-engine' | 'securite-hazard'
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
  todo: { pl: 'Włącz radiostację (przytrzymaj pokrętło [DIAL] 1 s)', ru: 'Включи рацию (удержи ручку [DIAL] 1 с)' },
  why: {
    pl: 'Włącz radio i wybierz kanał 16 do nasłuchu głosowego. Oddzielny odbiornik DSC nasłuchuje kanału 70; samo włączenie radia na innym kanale nie zapewnia nasłuchu głosowego na 16. Bez zasilania nie ma ani nasłuchu, ani możliwości nadania alarmu.',
    ru: 'Включи рацию и выбери канал 16 для голосовой вахты. Отдельный приёмник DSC слушает канал 70; включение рации на другом канале само по себе не обеспечивает голосовую вахту на 16. Без питания нет ни вахты, ни возможности подать сигнал.',
  },
  check: (e, prev, next) => e.type === 'dial-hold' && !prev.power && next.power,
});

const stepDistressCompose = (): ScenarioStep => ({
  id: 'compose',
  todo: { pl: 'M330: [DISTRESS] lub Menu > Distress. M323: Menu > DSC Calls > Distress Call', ru: 'M330: [DISTRESS] или Menu > Distress. M323: Menu > DSC Calls > Distress Call' },
  why: {
    pl: 'Alarm "designated" (z podanym rodzajem zagrożenia) mówi ratownikom, CO się dzieje, zanim usłyszą głos. Ekran Distress pozwala wybrać rodzaj przed nadaniem.',
    ru: 'Алерт «designated» (с указанным родом бедствия) сообщает спасателям, ЧТО случилось, ещё до голосовой связи. Экран Distress позволяет выбрать род до отправки.',
  },
  check: (e, prev, next) => prev.screen !== 'distress-compose' && next.screen === 'distress-compose',
});

const stepNature = (nature: string): ScenarioStep => ({
  id: 'nature',
  todo: { pl: `Ustaw Nature: ${nature} ([ENT] na wierszu Nature, wybierz, [ENT])`, ru: `Выбери род бедствия: ${nature} ([ENT] на строке Nature, выбор, [ENT])` },
  why: {
    pl: 'Rodzaj zagrożenia idzie w cyfrowym alercie (ITU-R M.493). Służby SAR od razu wiedzą, jaki sprzęt i procedury przygotować. Bez wyboru poleci "Undesignated" - działa, ale mówi mniej.',
    ru: 'Род бедствия передаётся в цифровом алерте (ITU-R M.493). Службы SAR сразу знают, какое оборудование и процедуры готовить. Без выбора уйдёт «Undesignated» - работает, но информации меньше.',
  },
  check: (e, prev, next) => e.type === 'ent' && prev.screen === 'distress-nature' && NATURES[next.natureIndex] === nature,
});

const stepHold = (): ScenarioStep => ({
  id: 'hold',
  todo: { pl: 'Podnieś osłonę i PRZYTRZYMAJ czerwony [DISTRESS] przez 3 sekundy', ru: 'Подними крышку и УДЕРЖИ красную [DISTRESS] 3 секунды' },
  why: {
    pl: 'Osłona i wymóg 3 sekund chronią przed przypadkowym alarmem (fałszywe alerty to realny problem GMDSS). Radio odlicza sygnałami i nadaje alert DSC na kanale 70: MMSI + pozycja z GPS + rodzaj zagrożenia.',
    ru: 'Крышка и удержание 3 секунды защищают от случайного алерта (ложные тревоги - реальная проблема GMDSS). Рация отсчитывает бипами и передаёт DSC-алерт на 70 канале: MMSI + позиция GPS + род бедствия.',
  },
  check: (e) => e.type === 'distress-held',
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
  title: { pl: 'Pożar na jachcie - MAYDAY', ru: 'Пожар на яхте - MAYDAY' },
  brief: {
    pl: 'Płyniesz swoim jachtem po Zatoce Gdańskiej (dane jednostki - w karcie wariantu obok). W komorze silnika wybuchł pożar, gaśnica nie wystarcza, dym gęstnieje. Życie załogi jest bezpośrednio zagrożone - to sytuacja DISTRESS.',
    ru: 'Ты идёшь на своей яхте по Гданьскому заливу (данные судна - в карточке варианта рядом). В моторном отсеке пожар, огнетушителя не хватает, дым густеет. Жизнь экипажа под прямой угрозой - это DISTRESS.',
  },
  steps: [
    stepPower(),
    stepDistressCompose(),
    stepNature('Fire,Explosion'),
    stepHold(),
    {
      id: 'mayday-voice',
      todo: { pl: 'Po ACK: ALARM OFF, potem MAYDAY na 16. Bez ACK po ok. 15 s: 16/C i MAYDAY (PTT)', ru: 'После ACK: ALARM OFF и MAYDAY на 16. Если ACK нет около 15 с: 16/C и MAYDAY (PTT)' },
      why: {
        pl: 'Po ACK wybierz ALARM OFF. Jeżeli ACK nie przychodzi po około 15 sekundach, wybierz 16/C i nadaj MAYDAY bez dalszego czekania; cyfrowe powtarzanie alarmu pozostaje aktywne. Cyfrowy alert to tylko nagłówek; głosem podajesz to, czego DSC nie przenosi: liczbę osób, rozwój sytuacji i potrzebną pomoc. Kolejność (MIPDANIO): MAYDAY x3 -> THIS IS + nazwa x3 -> znak/MMSI -> MAYDAY + nazwa -> pozycja -> rodzaj zagrożenia -> potrzebna pomoc -> liczba osób -> OVER.',
        ru: 'После ACK выбери ALARM OFF. Если ACK нет примерно 15 секунд, выбери 16/C и передай MAYDAY без дальнейшего ожидания; цифровые повторы алерта продолжаются. Цифровой алерт - только заголовок; голосом передаёшь то, чего нет в DSC: число людей, развитие ситуации и нужную помощь. Порядок (MIPDANIO): MAYDAY x3 -> THIS IS + название x3 -> позывной/MMSI -> MAYDAY + название -> позиция -> род бедствия -> нужная помощь -> число людей -> OVER.',
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
        pl: 'PTT przed nadaniem alertu DSC - najpierw alert (kanał 70), potem głos.',
        ru: 'PTT до отправки DSC-алерта - сначала алерт (канал 70), потом голос.',
      },
      detect: (e, prev, next, done) => e.type === 'ptt-down' && !done.has('hold') && !prev.distressActive,
    },
    {
      id: 'undesignated',
      text: {
        pl: 'Alert poszedł bez rodzaju zagrożenia (Undesignated) - działa, ale ratownicy wiedzą mniej.',
        ru: 'Алерт ушёл без рода бедствия (Undesignated) - работает, но спасатели знают меньше.',
      },
      detect: (e, prev, next) => e.type === 'distress-held' && NATURES[next.natureIndex] === 'Undesignated',
    },
  ],
  debrief: {
    pl: 'Gdy ACK nie przyjdzie w ok. 15 sekund, wciśnij 16/C i nadaj MAYDAY głosem na 16. Nie wyłączaj alertu i nie czekaj bez końca: radio nadal powtarza DSC co 3,5-4,5 minuty.',
    ru: 'Если ACK не пришёл примерно за 15 секунд, нажми 16/C и передай MAYDAY голосом на 16. Не отменяй алерт и не жди бесконечно: рация продолжает повторять DSC каждые 3,5-4,5 минуты.',
  },
};

// MOB uses the same distress procedure as fire. Visual contact does not
// remove the danger to life; the former PAN-PAN exercise taught the wrong default.
const mobScenario: Scenario = {
  ...fireScenario,
  id: "mob-mayday",
  icon: "🛟",
  title: { pl: "Człowiek za burtą - MAYDAY", ru: "Человек за бортом - MAYDAY" },
  brief: {
    pl: "Członek załogi wypadł za burtę i pozostaje w wodzie. Widzisz go, ale nie możesz bezpiecznie podjąć go na pokład i potrzebujesz natychmiastowej pomocy. Nadaj alarm DSC Man Overboard i MAYDAY na kanale 16.",
    ru: "Член экипажа упал за борт и остаётся в воде. Ты его видишь, но не можешь безопасно поднять на борт и нужна немедленная помощь. Передай DSC Man Overboard и MAYDAY на канале 16.",
  },
  steps: fireScenario.steps.map((step) => {
    if (step.id === "nature") return stepNature("Man Overboard");
    if (!step.voice) return step;
    return {
      ...step,
      voice: {
        kind: "mayday-mob",
        lines: (v: VariantData) => [
          "MAYDAY MAYDAY MAYDAY",
          `THIS IS ${v.vessel.name}, ${v.vessel.name}, ${v.vessel.name}`,
          `CALL SIGN ${v.vessel.call}, MMSI ${v.vessel.mmsi}`,
          `MAYDAY ${v.vessel.name}`,
          `POSITION ${v.posSpoken}`,
          "MAN OVERBOARD, ONE PERSON IN THE WATER, UNABLE TO RECOVER",
          "REQUIRE IMMEDIATE ASSISTANCE",
          `${v.pobWord} PERSONS IN TOTAL, INCLUDING THE PERSON IN THE WATER`,
          "OVER",
        ],
      },
    };
  }),
  debrief: {
    pl: "Widoczność osoby i kamizelka nie usuwają zagrożenia życia. Ćwicz MAYDAY także do zadania 10 UKE. Po podjęciu osoby powiadom stację ratowniczą o zmianie sytuacji. Rzeczywistego, zakończonego zdarzenia nie odwołuj jako fałszywego alarmu.",
    ru: "Видимость человека и спасжилет не устраняют угрозу жизни. Отрабатывай MAYDAY также для задания 10 UKE. После подъёма сообщи спасательной станции об изменении ситуации. Настоящее завершившееся происшествие не отменяют как ложную тревогу.",
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
    pl: 'Silnik zgasł i nie odpala, kotwica nie trzyma, jacht dryfuje w stronę brzegu. Nikt nie tonie, ale potrzebujesz holowania, zanim zrobi się niebezpiecznie. To klasyczna PILNOŚĆ: PAN-PAN.',
    ru: 'Двигатель заглох и не заводится, якорь не держит, яхту сносит к берегу. Никто не тонет, но нужна буксировка, пока не стало опасно. Классическая СРОЧНОСТЬ: PAN-PAN.',
  },
  steps: [
    stepPower(),
    {
      id: 'otherdsc',
      todo: { pl: 'M330: [OTHER DSC]. M323: Menu > DSC Calls > All Ships Call', ru: 'M330: [OTHER DSC]. M323: Menu > DSC Calls > All Ships Call' },
      why: {
        pl: 'Awaria bez zagrożenia życia = pilność, nie distress. Składamy wywołanie z menu DSC, nie czerwonym klawiszem.',
        ru: 'Поломка без угрозы жизни = срочность, не бедствие. Вызов собирается в меню DSC, не красной кнопкой.',
      },
      check: (e, prev, next) => prev.screen !== 'otherdsc-compose' && next.screen === 'otherdsc-compose',
    },
    {
      id: 'urgency-sent',
      todo: { pl: 'All Ships / Urgency -> Send', ru: 'All Ships / Urgency -> Send' },
      why: {
        pl: 'Zapowiedź DSC dociera też do stacji brzegowej - to często najszybsza droga do zorganizowania holowania.',
        ru: 'DSC-объявление доходит и до береговой станции - часто это самый быстрый путь организовать буксировку.',
      },
      check: (e, prev, next) =>
        e.type === 'ent' && next.screen === 'otherdsc-sent'
        && next.odSent?.type === 'All Ships' && next.odSent?.category === 'Urgency',
    },
    {
      id: 'panpan-voice',
      todo: { pl: 'Nadaj PAN-PAN głosem na 16', ru: 'Передай PAN-PAN голосом на 16' },
      why: {
        pl: 'W treści podaj: pozycję, co się stało (awaria, dryf), czego potrzebujesz (holowanie), ile osób. Zakończ OVER - czekasz na odpowiedź.',
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
        pl: 'DISTRESS przy zwykłej awarii = fałszywy alarm. Życie nie jest bezpośrednio zagrożone.',
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
    pl: 'Mijasz na wpół zatopiony kontener dryfujący przy torze wodnym. Tobie nic nie grozi, ale to realne niebezpieczeństwo nawigacyjne dla innych. Kategoria BEZPIECZEŃSTWO: SECURITE.',
    ru: 'Ты прошёл мимо полузатопленного контейнера у фарватера. Тебе ничего не грозит, но для других это реальная навигационная опасность. Категория БЕЗОПАСНОСТЬ: SECURITE.',
  },
  steps: [
    stepPower(),
    {
      id: 'safety-sent',
      todo: { pl: 'M330: [OTHER DSC]. M323: DSC Calls > All Ships. Ustaw Safety -> Send', ru: 'M330: [OTHER DSC]. M323: DSC Calls > All Ships. Выбери Safety -> Send' },
      why: {
        pl: 'Zapowiedź Safety na kanale 70 uprzedza wszystkich, że zaraz na 16 poleci komunikat o bezpieczeństwie. Jak przy pilności - bez potwierdzenia DSC.',
        ru: 'Объявление Safety на 70 канале предупреждает всех, что сейчас на 16 будет сообщение о безопасности. Как и срочность - без подтверждения по DSC.',
      },
      check: (e, prev, next) =>
        e.type === 'ent' && next.screen === 'otherdsc-sent'
        && next.odSent?.type === 'All Ships' && next.odSent?.category === 'Safety',
    },
    {
      id: 'securite-announce',
      todo: { pl: 'Na kanale 16 zapowiedź SECURITE i wskaż kanał roboczy 72', ru: 'На канале 16 объяви SECURITE и укажи рабочий канал 72' },
      why: {
        pl: 'Format egzaminacyjny UKE: na 16 idzie krótka zapowiedź SECURITE z informacją, gdzie słuchać treści. Kanał 16 pozostaje wolny dla wywołań i distress.',
        ru: 'Экзаменационный формат UKE: на 16 передается короткое объявление SECURITE с указанием канала сообщения. Канал 16 остается свободным для вызовов и distress.',
      },
      check: (e, prev, next) => e.type === 'ptt-down' && ch(next) === '16' && next.ptt,
    },
    {
      id: 'securite-working',
      todo: { pl: 'Przejdź na kanał roboczy 72', ru: 'Перейди на рабочий канал 72' },
      why: {
        pl: 'Pełna treść ostrzeżenia jest dłuższa niż zapowiedź. Przeniesienie jej chroni kanał 16 przed blokowaniem.',
        ru: 'Полный текст предупреждения длиннее объявления. Перенос защищает канал 16 от блокировки.',
      },
      check: (_e, prev, next) => ch(next) === '72' && ch(prev) !== '72',
    },
    {
      id: 'securite-voice',
      todo: { pl: 'Nadaj pełną treść SECURITE na 72 i zakończ OUT', ru: 'Передай полный текст SECURITE на 72 и закончи OUT' },
      why: {
        pl: 'Powtórz SECURITE, ALL STATIONS i identyfikację, potem podaj co, gdzie i jakie działanie zalecasz. OUT oznacza, że nie oczekujesz odpowiedzi.',
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
        pl: 'Kategoria Urgency zamiast Safety - ostrzeżenie nawigacyjne to kategoria bezpieczeństwa.',
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
    pl: 'Wychodzisz z Mariny Gdynia i chcesz sprawdzić, czy radio nadaje i odbiera. Do tego radio check użyj znanego kanału roboczego mariny Gdynia: 12. Kanał 16 służy również do krótkiego wywołania, ale nie do rutynowej rozmowy ani testowania radia.',
    ru: 'Выходишь из марины Гдыня и хочешь проверить, что рация передаёт и принимает. Для этой проверки используй известный рабочий канал марины Гдыня: 12. Канал 16 также служит для короткого первоначального вызова, но не для обычной беседы или проверки рации.',
  },
  steps: [
    stepPower(),
    {
      id: 'ch12',
      todo: { pl: 'Ustaw kanał 12 (pokrętło albo [^]/[v])', ru: 'Выставь канал 12 (ручка или [^]/[v])' },
      why: {
        pl: 'Kanał 16 jest zarezerwowany dla niebezpieczeństwa i wywołań - nie wolno go blokować testami. W Polsce porty/mariny pracują na 10/12/14 (Gdynia - 12). Kanał 9 to konwencja amerykańska, nie polska.',
        ru: 'Канал 16 зарезервирован для бедствия и вызовов - занимать его проверками нельзя. В Польше порты/марины работают на 10/12/14 (Гдыня - 12). Канал 9 - американская конвенция, не польская.',
      },
      check: (e, prev, next) => ch(next) === '12' && ch(prev) !== '12',
    },
    {
      id: 'lowpower',
      todo: { pl: 'Przełącz moc na 1W ([HI/LO])', ru: 'Переключи мощность на 1 Вт ([HI/LO])' },
      why: {
        pl: 'Do bliskiej łączności użyj najmniejszej skutecznej mocy, tutaj 1 W. Ograniczasz zakłócenia i pobór prądu. Przejdź na 25 W, gdy sygnał jest za słaby lub sytuacja jest alarmowa.',
        ru: 'Для близкой связи используй минимальную достаточную мощность, здесь 1 Вт. Так меньше помех и расход энергии. Перейди на 25 Вт при слабой связи или аварии.',
      },
      check: (e, prev, next) => e.type === 'soft' && prev.hiPower && !next.hiPower,
    },
    {
      id: 'check-voice',
      todo: { pl: 'Nadaj wywołanie radio check (PTT)', ru: 'Передай вызов radio check (PTT)' },
      why: {
        pl: 'Schemat: [stacja wywoływana] x2 -> THIS IS + nazwa x2 -> RADIO CHECK -> OVER. Odpowiedź oceni słyszalność w skali 1-5 ("READABILITY FIVE" = doskonale) albo "LOUD AND CLEAR".',
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
        pl: 'Radio check na kanale 16 - kanał alarmowy nie służy do testów. Użyj kanału roboczego mariny.',
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
  title: { pl: 'Fałszywy alert DSC - odwołanie', ru: 'Ложный DSC-алерт - отмена' },
  brief: {
    pl: 'Podczas sprzątania kokpitu ktoś oparł się o radio i alert DISTRESS poszedł w eter (nature: Undesignated). Nic się nie dzieje, wszyscy cali. Fałszywy alert trzeba NATYCHMIAST odwołać - cyfrowo i głosem - inaczej ruszy akcja ratownicza.',
    ru: 'Во время уборки кокпита кто-то опёрся на рацию - и алерт DISTRESS ушёл в эфир (род: Undesignated). Ничего не происходит, все целы. Ложный алерт нужно НЕМЕДЛЕННО отменить - цифро и голосом - иначе начнётся спасательная операция.',
  },
  steps: [
    {
      id: 'cancel-open',
      todo: { pl: 'Wciśnij [CANCEL] na ekranie oczekiwania na ACK', ru: 'Нажми [CANCEL] на экране ожидания ACK' },
      why: {
        pl: 'Samo wyłączenie radia NIE zatrzymuje procedury - alert już poszedł, a po włączeniu radio może dalej powtarzać. Radio z funkcją cancel wysyła cyfrowe odwołanie (ITU-R M.493).',
        ru: 'Просто выключить рацию НЕ отменяет процедуру - алерт уже ушёл, а после включения рация может продолжить повторы. Рация с функцией cancel шлёт цифровую отмену (ITU-R M.493).',
      },
      check: (e, prev, next) => next.screen === 'cancel-confirm',
    },
    {
      id: 'cancel-continue',
      todo: { pl: 'Potwierdź [CONTINUE] - poleci DSC cancel, radio ustawi kanał 16', ru: 'Подтверди [CONTINUE] - уйдёт DSC cancel, рация встанет на 16' },
      why: {
        pl: 'Cyfrowe odwołanie zatrzymuje automatyczne powtórki alertu u wszystkich odbiorców. Ale procedura IMO wymaga też odwołania GŁOSEM.',
        ru: 'Цифровая отмена останавливает автоповторы алерта у всех получателей. Но процедура IMO требует ещё и ГОЛОСОВОЙ отмены.',
      },
      check: (e, prev, next) => prev.screen === 'cancel-confirm' && (next.screen === 'cancel-tx' || next.screen === 'cancel-voice'),
    },
    {
      id: 'cancel-voice',
      todo: { pl: 'Nadaj odwołanie głosem na 16 (PTT): "ALL STATIONS... CANCEL MY DISTRESS ALERT..."', ru: 'Передай отмену голосом на 16 (PTT): «ALL STATIONS... CANCEL MY DISTRESS ALERT...»' },
      why: {
        pl: 'Formuła IMO: ALL STATIONS x3 -> THIS IS + nazwa x3, znak, MMSI, pozycja -> CANCEL MY DISTRESS ALERT OF [data, czas UTC]. Potem nasłuch na 16 i odpowiadanie na pytania stacji brzegowej. Za szybko odwołany fałszywy alert nie grozi kara.',
        ru: 'Формула IMO: ALL STATIONS x3 -> THIS IS + название x3, позывной, MMSI, позиция -> CANCEL MY DISTRESS ALERT OF [дата, время UTC]. Потом вахта на 16 и ответы на вопросы береговой станции. За быстро отменённый ложный алерт наказания нет.',
      },
      check: (e, prev, next) => e.type === 'ptt-down' && ch(next) === '16' && next.ptt,
      voice: { kind: 'cancel-false', lines: CANCEL_LINES },
    },
    {
      id: 'finish',
      todo: { pl: 'M330: [FINISH], potem [STBY]. M323: [FINISH]', ru: 'M330: [FINISH], затем [STBY]. M323: [FINISH]' },
      why: {
        pl: 'Na M330 FINISH zamyka część głosową, a STBY kończy całą procedurę. Na M323 FINISH od razu wraca do pracy. Zostań na nasłuchu 16.',
        ru: 'На M330 FINISH закрывает голосовую часть, а STBY завершает процедуру. На M323 FINISH сразу возвращает к работе. Останься на вахте 16.',
      },
      // Durable: reaching standby with the distress mode closed counts, even
      // if the user pressed [FINISH] earlier than scripted.
      check: (e, prev, next) => next.screen === 'standby' && !next.distressActive,
    },
  ],
  mistakes: [],
  debrief: {
    pl: 'Ten scenariusz zaczyna się JUŻ PO fałszywym nadaniu (radio czeka na ACK). W realu: nie panikuj, nie wyłączaj radia "żeby było cicho" - odwołaj cyfrowo i głosem.',
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
  todo: { pl: 'Czekaj na cyfrowe potwierdzenie (ACK) wywoływanej stacji', ru: 'Жди цифровое подтверждение (ACK) вызываемой станции' },
  why: {
    pl: 'Wywołania Individual i Test potwierdza cyfrowo stacja wywoływana. Po ACK radio wskaże uzgodniony kanał roboczy - kanały 16 i 70 zostają wolne.',
    ru: 'Вызовы Individual и Test подтверждаются цифро вызываемой станцией. После ACK рация укажет согласованный рабочий канал - каналы 16 и 70 остаются свободными.',
  },
  check: (_e, _prev, next) => next.screen === 'otherdsc-ack',
});

const stepDscAlarmOff = (): ScenarioStep => ({
  id: 'dsc-alarmoff',
  todo: { pl: 'Wyłącz sygnał ([ALARM OFF]) - radio przejdzie na kanał roboczy', ru: 'Отключи сигнал ([ALARM OFF]) - рация перейдёт на рабочий канал' },
  why: {
    pl: 'Po ACK obie stacje są na uzgodnionym kanale roboczym i można zacząć rozmowę głosem.',
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
  title: { pl: 'Wywołanie mariny - miejsce w porcie', ru: 'Вызов марины - место в порту' },
  brief: {
    pl: 'Podchodzisz do Mariny Gdynia i chcesz zarezerwować miejsce na noc. To zwykła korespondencja - na kanale roboczym mariny (12), nie na 16.',
    ru: 'Подходишь к марине Гдыня и хочешь место на ночь. Это обычная корреспонденция - на рабочем канале марины (12), не на 16.',
  },
  steps: [
    stepPower(),
    {
      id: 'ch12',
      todo: { pl: 'Ustaw kanał roboczy mariny - 12', ru: 'Выставь рабочий канал марины - 12' },
      why: {
        pl: 'Sprawy portowe załatwia się na kanale roboczym mariny. W Trójmieście: Gdynia 12, Gdańsk 14. Kanał 16 zostaje wolny dla wywołań i niebezpieczeństwa.',
        ru: 'Портовые дела решают на рабочем канале марины. В Труймясте: Гдыня 12, Гданьск 14. Канал 16 остаётся свободным для вызовов и бедствия.',
      },
      check: (_e, prev, next) => ch(next) === '12' && ch(prev) !== '12',
    },
    {
      id: 'marina-voice',
      todo: { pl: 'Wywołaj marinę i poproś o miejsce (PTT)', ru: 'Вызови марину и попроси место (PTT)' },
      why: {
        pl: 'Schemat: [stacja] x2 -> THIS IS + nazwa x2 -> treść (prośba) -> OVER. Krótko i konkretnie: czego potrzebujesz, jaka jednostka, ile osób.',
        ru: 'Схема: [станция] x2 -> THIS IS + название x2 -> суть (просьба) -> OVER. Коротко и по делу: что нужно, какое судно, сколько людей.',
      },
      check: (e, _prev, next) => e.type === 'ptt-down' && ch(next) === '12' && next.ptt,
      voice: { kind: 'routine-marina', lines: MARINA_LINES },
    },
  ],
  mistakes: [
    {
      id: 'marina-on-16',
      text: { pl: 'Wywołanie portowe na kanale 16 - użyj kanału roboczego mariny (12).', ru: 'Портовый вызов на 16 - используй рабочий канал марины (12).' },
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
  title: { pl: 'Meldunek do VTS Zatoka Gdańska', ru: 'Доклад в VTS Гданьский залив' },
  brief: {
    pl: 'Wchodzisz w rejon ruchu Zatoki Gdańskiej. Służba VTS Zatoka Gdańska (kanał 71) porządkuje ruch - zgłoś się z pozycją i zamiarem. To korespondencja rutynowa.',
    ru: 'Входишь в зону движения Гданьского залива. Служба VTS (канал 71) управляет трафиком - доложись с позицией и намерением. Рутинная корреспонденция.',
  },
  steps: [
    stepPower(),
    {
      id: 'ch71',
      todo: { pl: 'Ustaw kanał VTS - 71', ru: 'Выставь канал VTS - 71' },
      why: {
        pl: 'VTS Zatoka Gdańska pracuje na kanale 71. Meldujesz się tam, nie na 16 - 16 zostaje dla wywołań i niebezpieczeństwa.',
        ru: 'VTS Гданьского залива работает на 71 канале. Докладываешься там, не на 16 - 16 остаётся для вызовов и бедствия.',
      },
      check: (_e, prev, next) => ch(next) === '71' && ch(prev) !== '71',
    },
    {
      id: 'vts-voice',
      todo: { pl: 'Zgłoś się do VTS z pozycją i zamiarem (PTT)', ru: 'Доложись в VTS с позицией и намерением (PTT)' },
      why: {
        pl: 'Podaj: kogo wołasz, twoja nazwa i znak, pozycja, zamiar (wejście/wyjście, dokąd). VTS potrzebuje pozycji i intencji, żeby rozdzielić ruch.',
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
  title: { pl: 'Kontuzja załogi - PAN-PAN medyczny', ru: 'Травма экипажа - PAN-PAN медицинский' },
  brief: {
    pl: 'Członek załogi mocno rozciął dłoń, krwawienie trudno opanować. Życie nie jest jeszcze bezpośrednio zagrożone, ale potrzebujesz porady medycznej. To PILNOŚĆ medyczna: PAN-PAN.',
    ru: 'Член экипажа сильно порезал руку, кровотечение трудно остановить. Жизнь пока не под прямой угрозой, но нужна медицинская консультация. Это медицинская СРОЧНОСТЬ: PAN-PAN.',
  },
  steps: [
    stepPower(),
    {
      id: 'otherdsc',
      todo: { pl: 'M330: [OTHER DSC]. M323: Menu > DSC Calls > All Ships Call', ru: 'M330: [OTHER DSC]. M323: Menu > DSC Calls > All Ships Call' },
      why: {
        pl: 'Zapowiedź pilności składa się jako All Ships - jak przy każdym PAN-PAN. Czerwony DISTRESS to tylko bezpośrednie zagrożenie życia.',
        ru: 'Объявление срочности собирается как All Ships - как при любом PAN-PAN. Красная DISTRESS - только прямая угроза жизни.',
      },
      check: (_e, prev, next) => prev.screen !== 'otherdsc-compose' && next.screen === 'otherdsc-compose',
    },
    {
      id: 'urgency-sent',
      todo: { pl: 'All Ships / Urgency -> Send', ru: 'All Ships / Urgency -> Send' },
      why: {
        pl: 'Kategoria Urgency obejmuje także sprawy medyczne. Zapowiedź na 70 kieruje wszystkich na 16 - odpowiedzieć może lekarz przez stację brzegową (RADIO MEDICO).',
        ru: 'Категория Urgency включает и медицинские дела. Объявление на 70 направляет всех на 16 - ответить может врач через береговую станцию (RADIO MEDICO).',
      },
      check: (e, _prev, next) => e.type === 'ent' && next.screen === 'otherdsc-sent' && next.odSent?.type === 'All Ships' && next.odSent?.category === 'Urgency',
    },
    {
      id: 'medico-voice',
      todo: { pl: 'Nadaj PAN-PAN medyczny głosem na 16', ru: 'Передай PAN-PAN медицинский голосом на 16' },
      why: {
        pl: 'Struktura jak PAN-PAN: PAN PAN x3 -> ALL STATIONS x3 -> THIS IS + nazwa -> pozycja -> uraz -> REQUEST MEDICAL ADVICE -> liczba osób -> OVER.',
        ru: 'Структура как PAN-PAN: PAN PAN x3 -> ALL STATIONS x3 -> THIS IS + название -> позиция -> травма -> REQUEST MEDICAL ADVICE -> число людей -> OVER.',
      },
      check: (e, _prev, next) => e.type === 'ptt-down' && ch(next) === '16' && next.ptt,
      voice: { kind: 'panpan-medico', lines: MEDICO_LINES },
    },
  ],
  mistakes: [
    {
      id: 'red-button-medico',
      text: { pl: 'Czerwony DISTRESS przy kontuzji bez zagrożenia życia = fałszywy alarm. Gdyby życie było zagrożone (zawał, utrata przytomności) - wtedy MAYDAY.', ru: 'Красная DISTRESS при травме без угрозы жизни = ложная тревога. Если жизнь под угрозой (инфаркт, потеря сознания) - тогда MAYDAY.' },
      detect: (e) => e.type === 'distress-held',
    },
  ],
  debrief: {
    pl: 'Sprawy medyczne to Urgency, dopóki życie nie jest bezpośrednio zagrożone. Zawał, utrata przytomności, masywny krwotok - to już MAYDAY. Porady medycznej udziela stacja brzegowa (RADIO MEDICO / służba SAR).',
    ru: 'Медицинские дела - это Urgency, пока жизнь не под прямой угрозой. Инфаркт, потеря сознания, массивное кровотечение - это уже MAYDAY. Медконсультацию даёт береговая станция (RADIO MEDICO / служба SAR).',
  },
};

// --- scenario 10: DSC test call (no voice) ----------------------------------

const dscTestScenario: Scenario = {
  id: 'dsc-test',
  icon: '🧪',
  title: { pl: 'Test DSC do stacji brzegowej', ru: 'DSC-тест на береговую станцию' },
  brief: {
    pl: 'Chcesz sprawdzić, czy cały łańcuch DSC działa (MMSI, GPS, nadawanie na 70). Służy do tego wywołanie Test do stacji brzegowej - bez alarmowania kogokolwiek głosem.',
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
      todo: { pl: 'Wyślij wywołanie Test (Send)', ru: 'Отправь Test-вызов (Send)' },
      why: {
        pl: 'Radio nadaje krótką ramkę testową na kanale 70. Nie idzie żaden głos - to czysto cyfrowa kontrola.',
        ru: 'Рация шлёт короткий тестовый кадр на 70 канале. Голоса нет - это чисто цифровая проверка.',
      },
      check: (e, _prev, next) => e.type === 'ent' && next.screen === 'otherdsc-sent' && next.odSent?.type === 'Test',
    },
    stepDscAck(),
    {
      id: 'test-done',
      todo: { pl: 'Potwierdź ([ALARM OFF]) - test zaliczony', ru: 'Подтверди ([ALARM OFF]) - тест засчитан' },
      why: {
        pl: 'ACK potwierdza, że twój MMSI i tor nadawczo-odbiorczy działają. To najlepszy sposób sprawdzenia DSC bez fałszywego alarmu - nie ma części głosowej.',
        ru: 'ACK подтверждает, что твой MMSI и приёмо-передающий тракт работают. Лучший способ проверить DSC без ложной тревоги - голосовой части нет.',
      },
      check: (e, prev) => e.type === 'soft' && prev.screen === 'otherdsc-ack',
    },
  ],
  mistakes: [
    {
      id: 'test-all-ships',
      text: { pl: 'Test wysłany jako All Ships - test kieruje się do konkretnej stacji brzegowej, która odpowie ACK.', ru: 'Test отправлен как All Ships - тест адресуют конкретной береговой станции, которая ответит ACK.' },
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
  title: { pl: 'Wywołanie innej jednostki przez DSC', ru: 'Вызов другого судна через DSC' },
  brief: {
    pl: 'Chcesz porozmawiać z jednostką szkolną (TRAINING SHIP). Nowocześnie robi się to wywołaniem Individual DSC: radio "dzwoni" do konkretnego MMSI i proponuje kanał roboczy, a rozmowa idzie głosem - nie zajmujesz 16.',
    ru: 'Хочешь связаться с учебным судном (TRAINING SHIP). Современно это делают вызовом Individual DSC: рация «звонит» на конкретный MMSI и предлагает рабочий канал, а разговор идёт голосом - ты не занимаешь 16.',
  },
  steps: [
    stepPower(),
    stepChooseType('Individual',
      { pl: 'Wybierz Individual Call (M330: [OTHER DSC] > Type: Individual; M323: DSC Calls > Individual Call)', ru: 'Выбери Individual Call (M330: [OTHER DSC] > Type: Individual; M323: DSC Calls > Individual Call)' },
      { pl: 'Individual to wywołanie do jednego, konkretnego MMSI - jak telefon. Grupowe i All Ships to inne typy.', ru: 'Individual - вызов одного конкретного MMSI, как телефон. Групповой и All Ships - другие типы.' },
    ),
    {
      id: 'ship-sent',
      todo: { pl: 'Ustaw adresata (TRAINING SHIP) i kanał roboczy (np. 72), potem Send', ru: 'Выставь адресата (TRAINING SHIP) и рабочий канал (напр. 72), затем Send' },
      why: {
        pl: 'W wywołaniu Individual wskazujesz MMSI odbiorcy i proponowany kanał roboczy. Nigdy nie proponuj 16 do rozmowy - to kanał wywołań i niebezpieczeństwa.',
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
        pl: 'Po ACK obie stacje są na kanale roboczym. Wywołanie głosem: [jednostka] x2 -> THIS IS + nazwa x2 -> treść -> OVER.',
        ru: 'После ACK обе станции на рабочем канале. Голосовой вызов: [судно] x2 -> THIS IS + название x2 -> суть -> OVER.',
      },
      check: (e, _prev, next) => e.type === 'ptt-down' && next.ptt && ch(next) !== '70',
      voice: { kind: 'routine-ship', lines: SHIP_LINES },
    },
  ],
  mistakes: [
    {
      id: 'routine-designate-16',
      text: { pl: 'Wywołanie rutynowe wskazało kanał 16 do rozmowy - wybierz kanał roboczy (np. 72).', ru: 'Рутинный вызов назначил канал 16 для разговора - выбери рабочий канал (напр. 72).' },
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
    pl: 'Słyszysz na 16 słaby MAYDAY jachtu NEPTUN (tonie, 3 osoby), ale stacja brzegowa nie odpowiada - twój sygnał sięga dalej. Twoim obowiązkiem jest retransmitować ten alarm: MAYDAY RELAY. NIE nadajesz własnego MAYDAY (tobie nic nie grozi) ani nie używasz czerwonego przycisku.',
    ru: 'Слышишь на 16 слабый MAYDAY яхты NEPTUN (тонет, 3 человека), но береговая станция не отвечает - твой сигнал добивает дальше. Твоя обязанность - ретранслировать: MAYDAY RELAY. НЕ передаёшь свой MAYDAY (тебе ничего не грозит) и не жмёшь красную кнопку.',
  },
  steps: [
    stepPower(),
    {
      id: 'ch16-relay',
      todo: { pl: 'Upewnij się, że jesteś na kanale 16 (krótko [16/C])', ru: 'Убедись, что ты на 16 канале (коротко [16/C])' },
      why: {
        pl: 'Retransmisja MAYDAY idzie głosem na 16 - tam słychać ruch w niebezpieczeństwie. Krótkie [16/C] zawsze wraca na 16.',
        ru: 'Ретрансляция MAYDAY идёт голосом на 16 - там слышен обмен по бедствию. Короткое [16/C] всегда возвращает на 16.',
      },
      check: (e, _prev, next) => e.type === 'key-16c' && ch(next) === '16',
    },
    {
      id: 'relay-voice',
      todo: { pl: 'Nadaj MAYDAY RELAY głosem na 16', ru: 'Передай MAYDAY RELAY голосом на 16' },
      why: {
        pl: 'Formuła: MAYDAY RELAY x3 -> ALL STATIONS x3 -> THIS IS + TWOJA nazwa x3 -> "RECEIVED FOLLOWING MAYDAY FROM..." -> nazwa, pozycja, rodzaj zagrożenia i liczba osób jednostki w niebezpieczeństwie -> OVER. Retransmitujesz CUDZE dane, nie swoje.',
        ru: 'Формула: MAYDAY RELAY x3 -> ALL STATIONS x3 -> THIS IS + ТВОЁ название x3 -> "RECEIVED FOLLOWING MAYDAY FROM..." -> название, позиция, род бедствия и число людей судна в беде -> OVER. Ретранслируешь ЧУЖИЕ данные, не свои.',
      },
      check: (e, _prev, next) => e.type === 'ptt-down' && ch(next) === '16' && next.ptt,
      voice: { kind: 'mayday-relay', lines: RELAY_LINES },
    },
  ],
  mistakes: [
    {
      id: 'relay-red-button',
      text: { pl: 'Czerwony DISTRESS przy retransmisji = nadanie WŁASNEGO alarmu. Tobie nic nie grozi - MAYDAY RELAY idzie tylko głosem.', ru: 'Красная DISTRESS при ретрансляции = отправка СВОЕГО алерта. Тебе ничего не грозит - MAYDAY RELAY идёт только голосом.' },
      detect: (e) => e.type === 'distress-held',
    },
  ],
  debrief: {
    pl: 'MAYDAY RELAY nadaje stacja, która ODEBRAŁA cudzy MAYDAY i widzi, że nikt go nie potwierdza - typowo stacja brzegowa, ale także statek z lepszym zasięgiem. Nie mylić z własnym MAYDAY.',
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
  title: { pl: 'Wywołanie grupowe - flota regatowa', ru: 'Групповой вызов - гоночная флотилия' },
  brief: {
    pl: 'Przed startem chcesz przekazać komunikat całej swojej grupie regatowej naraz. Służy do tego wywołanie grupowe DSC (Group) - dociera do jednostek z tym samym numerem grupowym, a treść podajesz głosem na kanale roboczym.',
    ru: 'Перед стартом хочешь передать сообщение всей гоночной группе сразу. Для этого есть групповой вызов DSC (Group) - доходит до судов с тем же групповым номером, а текст передаёшь голосом на рабочем канале.',
  },
  steps: [
    stepPower(),
    stepChooseType('Group',
      { pl: 'Wybierz Group Call (M330: [OTHER DSC] > Type: Group; M323: DSC Calls > Group Call)', ru: 'Выбери Group Call (M330: [OTHER DSC] > Type: Group; M323: DSC Calls > Group Call)' },
      { pl: 'Group to wywołanie do zaprogramowanej grupy jednostek (wspólny numer grupowy MMSI). Nie jest potwierdzane ACK - jak All Ships.', ru: 'Group - вызов запрограммированной группы судов (общий групповой MMSI). Не подтверждается ACK - как All Ships.' },
    ),
    {
      id: 'group-sent',
      todo: { pl: 'Ustaw kanał roboczy i wyślij wywołanie grupowe (Send)', ru: 'Выставь рабочий канал и отправь групповой вызов (Send)' },
      why: {
        pl: 'Zapowiedź grupowa na kanale 70 kieruje całą grupę na wskazany kanał roboczy. Grupa nie odpowiada cyfrowo - od razu przechodzisz do głosu.',
        ru: 'Групповое объявление на 70 канале направляет всю группу на указанный рабочий канал. Группа не отвечает цифро - сразу переходишь к голосу.',
      },
      check: (e, _prev, next) => e.type === 'ent' && next.screen === 'otherdsc-sent' && next.odSent?.type === 'Group',
    },
    {
      id: 'group-voice',
      todo: { pl: 'Nadaj komunikat do floty głosem (PTT)', ru: 'Передай сообщение флотилии голосом (PTT)' },
      why: {
        pl: 'Schemat: [nazwa grupy] x2 -> THIS IS + nazwa x2 -> treść komunikatu -> OVER.',
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
  title: { pl: 'Odbiór cudzego MAYDAY', ru: 'Приём чужого MAYDAY' },
  brief: {
    pl: 'Radio odebrało DSC DISTRESS z jachtu NEPTUN. Wycisz alarm, przejdź na 16 i słuchaj przez 5 minut. Sprawdź, czy brzeg lub RCC potwierdziły alarm i prowadzą ruch. Gdy nie ma odpowiedzi, potwierdź głosem i poinformuj brzeg lub RCC. DSC ACK ze statku nie jest pierwszym krokiem.',
    ru: 'Рация приняла DSC DISTRESS с яхты NEPTUN. Заглуши сигнал, перейди на 16 и слушай 5 минут. Проверь, подтвердили ли берег или RCC сигнал и ведут ли обмен. Если ответа нет, подтверди голосом и сообщи берегу или RCC. DSC ACK с судна не является первым действием.',
  },
  steps: [
    {
      id: 'alarm-off',
      todo: { pl: 'Wycisz alarm ([ALARM OFF]) - radio ustawi kanał 16 do nasłuchu', ru: 'Заглуши сигнал ([ALARM OFF]) - рация встанет на 16 для прослушивания' },
      why: {
        pl: 'Przedwczesny DSC ACK ze statku może zatrzymać powtórki, zanim RCC przejmie alarm. Aktualna procedura IMO wymaga 5 minut nasłuchu na 16 i oceny odpowiedzi brzegu.',
        ru: 'Преждевременный DSC ACK с судна может остановить повторы до того, как RCC примет сигнал. Актуальная процедура IMO требует 5 минут слушать канал 16 и оценить ответ берега.',
      },
      check: (e, prev, next) => e.type === 'soft' && prev.screen === 'rx-distress-alert' && next.screen === 'standby' && ch(next) === '16',
    },
    {
      id: 'ack-voice',
      todo: { pl: 'Brak odpowiedzi stacji brzegowej - potwierdź odbiór GŁOSEM na 16', ru: 'Береговая станция молчит - подтверди приём ГОЛОСОМ на 16' },
      why: {
        pl: 'Gdy nikt nie potwierdza, a jesteś w zasięgu: MAYDAY + nazwa jednostki w niebezpieczeństwie x3 -> THIS IS + TWOJA nazwa x3 -> RECEIVED MAYDAY. Potem rozważ retransmisję i pomoc.',
        ru: 'Когда никто не подтверждает, а ты в зоне: MAYDAY + название судна в беде x3 -> THIS IS + ТВОЁ название x3 -> RECEIVED MAYDAY. Затем рассмотри ретрансляцию и помощь.',
      },
      check: (e, _prev, next) => e.type === 'ptt-down' && ch(next) === '16' && next.ptt,
      voice: { kind: 'mayday-ack', lines: MAYDAY_ACK_LINES },
    },
  ],
  mistakes: [
    {
      id: 'own-distress-on-receive',
      text: { pl: 'Nadałeś WŁASNY alarm DISTRESS - tobie nic nie grozi. Cudzy MAYDAY się potwierdza/retransmituje, nie dubluje własnym alarmem.', ru: 'Ты подал СВОЙ DISTRESS - тебе ничего не грозит. Чужой MAYDAY подтверждают/ретранслируют, а не дублируют своим алертом.' },
      detect: (e) => e.type === 'distress-held',
    },
  ],
  debrief: {
    pl: 'Procedura IMO MSC.1/Circ.1657: 1) słuchaj 16 przez 5 minut; 2) sprawdź ACK i ruch brzegu lub RCC; 3) gdy ich brak, potwierdź fonią, poinformuj brzeg lub RCC i oceń pomoc. Wyjątek: jeżeli kolejne alerty nadal przychodzą, statek jest bez wątpienia blisko i skonsultowałeś się z RCC lub stacją brzegową, DSC ACK może zakończyć powtórki.',
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
  title: { pl: 'Odbiór wywołania indywidualnego DSC', ru: 'Приём индивидуального вызова DSC' },
  brief: {
    pl: 'Radio "dzwoni": jednostka szkolna (TRAINING SHIP) wywołuje cię indywidualnie przez DSC i proponuje kanał roboczy 72. Przyjmij wywołanie i odpowiedz głosem na uzgodnionym kanale.',
    ru: 'Рация «звонит»: учебное судно (TRAINING SHIP) вызывает тебя индивидуально по DSC и предлагает рабочий канал 72. Прими вызов и ответь голосом на согласованном канале.',
  },
  steps: [
    {
      id: 'accept',
      todo: { pl: 'Przyjmij wywołanie ([ACCEPT]) - radio przejdzie na proponowany kanał 72', ru: 'Прими вызов ([ACCEPT]) - рация перейдёт на предложенный канал 72' },
      why: {
        pl: 'ACCEPT potwierdza przyjęcie i automatycznie przełącza na kanał roboczy zaproponowany przez wywołującego - nie trzeba szukać kanału ręcznie.',
        ru: 'ACCEPT подтверждает приём и автоматически переключает на рабочий канал, предложенный вызывающим - искать канал вручную не нужно.',
      },
      check: (e, prev, next) => e.type === 'soft' && prev.screen === 'rx-individual-call' && next.screen === 'standby' && ch(next) === RX_CALLER.channel,
    },
    {
      id: 'answer-voice',
      todo: { pl: 'Odpowiedz głosem na kanale roboczym (PTT)', ru: 'Ответь голосом на рабочем канале (PTT)' },
      why: {
        pl: 'Odpowiadasz na kanale roboczym: [wywołujący] x2 -> THIS IS + nazwa x2 -> treść (GO AHEAD / odpowiedź) -> OVER.',
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
  title: { pl: 'Pamięć skanowania: sprawdź i dodaj kanały', ru: 'Память сканирования: проверка и добавление каналов' },
  brief: {
    pl: 'Wykonaj zadania 6 i 7 UKE. Najpierw rozpoznaj kanał już oznaczony gwiazdką FAV, potem dodaj 06, 13 i 16 do listy skanowania.',
    ru: 'Выполни задания 6 и 7 UKE. Сначала найди канал, уже отмеченный звёздочкой FAV, затем добавь 06, 13 и 16 в список сканирования.',
  },
  steps: [
    stepPower(),
    {
      id: 'scan-review',
      todo: { pl: 'Przewijaj kanały i znajdź oznaczony kanał 12', ru: 'Листай каналы и найди отмеченный канал 12' },
      why: {
        pl: 'Gwiazdka na ekranie oznacza kanał należący do listy skanowania. Samo włączenie SCAN nie pokazuje pełnej listy.',
        ru: 'Звёздочка на экране означает канал из списка сканирования. Само включение SCAN не показывает полный список.',
      },
      check: (e, _prev, next) => (e.type === 'up' || e.type === 'down') && ch(next) === '12' && next.favoriteChannels.includes('12'),
    },
    {
      id: 'scan-add-06',
      todo: { pl: 'Ustaw kanał 06, pokaż [FAV] i naciśnij go', ru: 'Выставь канал 06, открой [FAV] и нажми его' },
      why: {
        pl: 'FAV działa jak przełącznik: pierwsze naciśnięcie dodaje gwiazdkę, drugie usuwa kanał z listy.',
        ru: 'FAV работает как переключатель: первое нажатие добавляет звёздочку, второе удаляет канал из списка.',
      },
      check: (e, prev, next) => e.type === 'soft' && ch(prev) === '06' && !prev.favoriteChannels.includes('06') && next.favoriteChannels.includes('06'),
    },
    {
      id: 'scan-add-13',
      todo: { pl: 'Ustaw kanał 13 i dodaj go [FAV]', ru: 'Выставь канал 13 и добавь его [FAV]' },
      why: {
        pl: 'Lista jest pamięcią kanałów, które SCAN będzie kolejno sprawdzał po zamknięciu blokady szumów.',
        ru: 'Это список каналов, которые SCAN будет последовательно проверять при закрытом шумоподавителе.',
      },
      check: (e, prev, next) => e.type === 'soft' && ch(prev) === '13' && !prev.favoriteChannels.includes('13') && next.favoriteChannels.includes('13'),
    },
    {
      id: 'scan-add-16',
      todo: { pl: 'Ustaw kanał 16 i dodaj go [FAV]', ru: 'Выставь канал 16 и добавь его [FAV]' },
      why: {
        pl: 'Po zadaniu lista ma zawierać 06, 13 i 16. Przed rozpoczęciem SCAN ustaw SQL powyżej OPEN.',
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
  title: { pl: 'Ręczne wprowadzenie pozycji i czasu', ru: 'Ручной ввод позиции и времени' },
  brief: {
    pl: 'Odbiornik GPS jest odłączony. Wprowadź ręcznie szerokość, długość i czas UTC ścieżką wymaganą w zadaniu 14 UKE. Dane ręczne są ważne tylko 23,5 godziny albo do wyłączenia radia.',
    ru: 'Приёмник GPS отключён. Введи вручную широту, долготу и UTC по пути из задания 14 UKE. Ручные данные действуют только 23,5 часа или до выключения рации.',
  },
  steps: [
    stepPower(),
    {
      id: 'settings-menu',
      todo: { pl: 'Wejdź: MENU > DSC Settings', ru: 'Открой: MENU > DSC Settings' },
      why: {
        pl: 'Pozycja do DSC jest ustawieniem systemu DSC, nie ustawieniem kanału ani przesunięcia strefy czasowej.',
        ru: 'Позиция для DSC относится к настройкам DSC, а не к настройкам канала или часового пояса.',
      },
      check: (_e, prev, next) => prev.screen !== 'dsc-settings' && next.screen === 'dsc-settings',
    },
    {
      id: 'position-open',
      todo: { pl: 'Wybierz Position Input i wciśnij [ENT]', ru: 'Выбери Position Input и нажми [ENT]' },
      why: {
        pl: 'Ręczny wpis jest dostępny tylko bez prawidłowych danych GPS. Przy aktywnym GPS radio blokuje ten ekran przed przypadkowym nadpisaniem pozycji.',
        ru: 'Ручной ввод доступен только без валидных данных GPS. При активном GPS рация блокирует случайную перезапись позиции.',
      },
      check: (_e, prev, next) => prev.screen === 'dsc-settings' && next.screen === 'position-input',
    },
    {
      id: 'position-lat',
      todo: { pl: 'Sprawdź szerokość geograficzną i zatwierdź [FIN]', ru: 'Проверь широту и подтверди [FIN]' },
      why: {
        pl: 'Najpierw szerokość: stopnie, minuty dziesiętne i N albo S. Zły znak półkuli przenosi pozycję na drugi koniec świata.',
        ru: 'Сначала широта: градусы, десятичные минуты и N либо S. Ошибка полушария переносит позицию на другой конец света.',
      },
      check: (_e, prev, next) => prev.screen === 'position-input' && prev.positionInputStage === 0 && next.positionInputStage === 1,
    },
    {
      id: 'position-lon',
      todo: { pl: 'Sprawdź długość geograficzną i zatwierdź [FIN]', ru: 'Проверь долготу и подтверди [FIN]' },
      why: {
        pl: 'Długość ma trzy cyfry stopni i znak E albo W. Zachowuj zera wiodące, np. 018 stopni.',
        ru: 'У долготы три цифры градусов и знак E либо W. Сохраняй ведущие нули, например 018 градусов.',
      },
      check: (_e, prev, next) => prev.screen === 'position-input' && prev.positionInputStage === 1 && next.positionInputStage === 2,
    },
    {
      id: 'position-save',
      todo: { pl: 'Sprawdź czas UTC i zapisz [FIN]', ru: 'Проверь время UTC и сохрани [FIN]' },
      why: {
        pl: 'DSC wysyła pozycję razem z czasem jej ustalenia. Stara pozycja bez czasu może skierować ratowników w złe miejsce.',
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
    pl: 'Wykonaj zadanie 15 UKE: zapisz duńską stację brzegową LYNGBY pod prawidłowym MMSI 002191000.',
    ru: 'Выполни задание 15 UKE: сохрани датскую береговую станцию LYNGBY с правильным MMSI 002191000.',
  },
  steps: [
    stepPower(),
    {
      id: 'id-list',
      todo: { pl: 'Wejdź: MENU > DSC Settings > Individual ID', ru: 'Открой: MENU > DSC Settings > Individual ID' },
      why: {
        pl: 'Rejestr Individual ID jest książką adresową DSC. Nie wysyłasz jeszcze wywołania.',
        ru: 'Реестр Individual ID является адресной книгой DSC. Сам вызов пока не передаётся.',
      },
      check: (_e, prev, next) => prev.screen !== 'individual-id-list' && next.screen === 'individual-id-list',
    },
    {
      id: 'id-add',
      todo: { pl: 'Naciśnij [ADD]', ru: 'Нажми [ADD]' },
      why: {
        pl: 'Numer stacji brzegowej ma dziewięć cyfr i zaczyna się od 00. Te dwie cyfry radio blokuje.',
        ru: 'Номер береговой станции состоит из девяти цифр и начинается с 00. Эти две цифры рация фиксирует.',
      },
      check: (_e, prev, next) => prev.screen === 'individual-id-list' && next.screen === 'individual-id-add-mmsi',
    },
    {
      id: 'id-number',
      todo: { pl: 'Strzałkami i [ENT] wprowadź 002191000', ru: 'Стрелками и [ENT] введи 002191000' },
      why: {
        pl: 'MMSI musi być dokładny. Jedna zła cyfra oznacza innego adresata albo brak odpowiedzi.',
        ru: 'MMSI должен быть точным. Одна неверная цифра означает другого адресата или отсутствие ответа.',
      },
      check: (_e, prev, next) => prev.screen === 'individual-id-add-mmsi' && next.screen === 'individual-id-add-name' && next.idEntryMmsi === '002191000',
    },
    {
      id: 'id-save',
      todo: { pl: 'Nazwa LYNGBY jest gotowa. Naciśnij [FIN]', ru: 'Имя LYNGBY готово. Нажми [FIN]' },
      why: {
        pl: 'Nazwa jest etykietą dla operatora, ale wywołanie jest adresowane dziewięciocyfrowym MMSI.',
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
  title: { pl: 'Usunięcie Lyngby z Individual ID', ru: 'Удаление Lyngby из Individual ID' },
  brief: {
    pl: 'Wykonaj zadanie 16 UKE: znajdź LYNGBY, użyj DEL i potwierdź OK. CANCEL ma zostawić wpis bez zmian.',
    ru: 'Выполни задание 16 UKE: найди LYNGBY, используй DEL и подтверди OK. CANCEL должен оставить запись без изменений.',
  },
  steps: [
    stepPower(),
    {
      id: 'id-list',
      todo: { pl: 'Wejdź: MENU > DSC Settings > Individual ID', ru: 'Открой: MENU > DSC Settings > Individual ID' },
      why: {
        pl: 'Usuwasz wpis z książki adresowej, nie z historii połączeń DSC.',
        ru: 'Удаляется запись из адресной книги, а не из журнала вызовов DSC.',
      },
      check: (_e, prev, next) => prev.screen !== 'individual-id-list' && next.screen === 'individual-id-list',
    },
    {
      id: 'id-delete',
      todo: { pl: 'Zaznacz LYNGBY i naciśnij [DEL]', ru: 'Выбери LYNGBY и нажми [DEL]' },
      why: {
        pl: 'Najpierw sprawdź nazwę i pełny MMSI 002191000. DEL otwiera potwierdzenie, jeszcze niczego nie usuwa.',
        ru: 'Сначала проверь имя и полный MMSI 002191000. DEL открывает подтверждение и пока ничего не удаляет.',
      },
      check: (_e, prev, next) => prev.screen === 'individual-id-list' && prev.individualIds[prev.idCursor]?.mmsi === '002191000' && next.screen === 'individual-id-delete',
    },
    {
      id: 'id-delete-ok',
      todo: { pl: 'Potwierdź usunięcie [OK]', ru: 'Подтверди удаление [OK]' },
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
