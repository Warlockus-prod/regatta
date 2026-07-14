import type { MustItem } from './dialogueGrading';

// ============================================================================
// Six real VHF conversations. Not monologues: you transmit, the station answers
// OUT LOUD, and you answer back. That is what a radio actually is, and it is
// the half of the exam a text trainer never touches.
//
// Written against IMO SMCP and Polish practice, then adversarially reviewed by
// three independent lenses (procedure / speech-to-text / typography). The
// reviewers caught real errors, and they are fixed here:
//
//  - a medical consultation was being held on channel 16. A coast station moves
//    urgency traffic to a working channel; a doctor talking on 16 would block the
//    distress channel for the whole coast.
//  - the coast station never imposed SEELONCE MAYDAY - the single most
//    examinable thing a station does after RECEIVED MAYDAY.
//  - "STAND BY. OVER." is a contradiction: OVER means "answer me now". A station
//    that tells you to stand by closes with OUT.
//  - GDYNIA RADIO does not exist. Distress and urgency in Polish waters are
//    answered by the MRCC, which calls itself GDYNIA RESCUE RADIO. Teaching an
//    invented name means calling a station that never answers.
//  - the learner said OUT and the station then transmitted again. After OUT
//    nobody answers - that is what OUT MEANS, and it is the lesson of the very
//    first dialogue.
//  - the crossing rule (COLREGS 15) applies to power-driven vessels, so the
//    brief now says both yachts are under engine. Under sail the give-way vessel
//    is decided by tack, and the scenario would have taught the wrong rule.
//
// The `anyOf` lists are deliberately wide. They are matched after normalization
// (see dialogueGrading.ts), but a Polish speaker's "Wind Dancer" still comes back
// as "Vind Dancer" or "Windancer", and a call sign as "S.P. 9012" or as loose
// digits. An element that a CORRECT transmission can fail is worse than no
// element at all.
// ============================================================================

export interface Bi { pl: string; ru: string }

export interface DialogueTurn {
  /** the model transmission - a script in learning mode, hidden in the exam */
  youSay: string;
  must: MustItem[];
  /** who answers. Empty stationSays = nobody answers, and that is correct. */
  stationName: string;
  stationSays: string;
  hint: Bi;
}

export interface Dialogue {
  id: string;
  icon: string;
  title: Bi;
  brief: Bi;
  /** the channel the conversation starts on */
  channel: string;
  why: Bi;
  turns: DialogueTurn[];
}

// --- shared required elements ------------------------------------------------
// Every turn needs the learner's own name, so one bad render must not zero a
// whole conversation. A Polish speaker pronounces "w" as /v/.

const IDENTITY: MustItem = {
  id: 'identity',
  label: 'Wlasna nazwa WIND DANCER',
  anyOf: [
    'wind dancer', 'winddancer', 'windancer', 'wind dance', 'wind dancers',
    'wind danser', 'wind dancher', 'vind dancer', 'vind danser',
  ],
};

const CALLSIGN: MustItem = {
  id: 'callsign',
  label: 'Znak wywolawczy SP 9012',
  anyOf: [
    'sierra papa nine zero one two', 'sierra papa 9012', 'sierra papa 9 0 1 2',
    'sp 9012', 'sp9012', 's p 9012', 's p 9 0 1 2', 's p nine zero one two',
    '9012', '9 0 1 2', 'sierra papa',
  ],
};

const THIS_IS: MustItem = { id: 'thisis', label: 'Zwrot THIS IS przed wlasna nazwa', anyOf: ['this is'] };
const OVER: MustItem = { id: 'over', label: 'OVER na koncu', anyOf: ['over'] };
const OUT: MustItem = { id: 'out', label: 'OUT na koncu (rozmowa skonczona, nie OVER)', anyOf: ['out'] };

const marina = (id = 'station'): MustItem => ({
  id,
  label: 'Nazwa stacji (MARINA GDYNIA)',
  anyOf: ['marina gdynia', 'marina gdinia', 'marina gdynya', 'marina gdinya', 'marina gdania', 'marina gdyni', 'marina', 'gdynia'],
});

const ORKA: MustItem = {
  id: 'station',
  label: 'Nazwa wywolywanego jachtu (ORKA)',
  anyOf: ['orka', 'orca', 'arka', 'orkan', 'orga', 'olka', 'urka', 'or ka', 'orkha'],
};

const VTS: MustItem = {
  id: 'station',
  label: 'Nazwa stacji (VTS ZATOKA GDANSKA)',
  anyOf: ['vts', 'v t s', 'vts zatoka gdanska', 'zatoka gdanska', 'zatoka', 'gdanska', 'vts zatoka', 'vts gdansk', 'gdansk vts', 'bay of gdansk', 'gulf of gdansk'],
};

const RESCUE: MustItem = {
  id: 'station',
  label: 'Nazwa stacji (GDYNIA RESCUE RADIO)',
  anyOf: ['gdynia rescue radio', 'rescue radio', 'gdynia rescue', 'gdinia rescue', 'gdynia radio', 'rescue'],
};

/** the spoken position, in every form the transcriber actually produces */
const POSITION: MustItem = {
  id: 'position',
  label: 'Wlasna pozycja',
  anyOf: [
    'five four degrees', '54 degrees', 'fifty four degrees', '5 4 degrees', '54 30 5',
    'three zero decimal five', 'thirty decimal five', 'three zero point five',
    'thirty point five', '30 decimal 5', '30 point 5', '30 5', '30 5 minutes',
    'zero one eight degrees', '018 degrees', '18 degrees', '0 1 8 degrees',
    'four five decimal two', '45 2', '45 2 minutes',
  ],
};

const POB: MustItem = {
  id: 'pob',
  label: 'Liczba osob na pokladzie (3)',
  anyOf: ['three persons on board', '3 persons on board', 'three persons', '3 persons', 'three people', 'three on board', '3 on board'],
};

const STANDBY_16: MustItem = {
  id: 'standby',
  label: 'Nasluch na 16 (STANDING BY ON CHANNEL ONE SIX)',
  anyOf: [
    'standing by', 'stand by', 'standing by on channel one six', 'standing by on channel 16',
    'standing by on 16', 'standing by channel 16', 'stand by on one six', 'stand by on channel 16',
    'on channel one six', 'on channel 16', 'listening on 16', 'watch on channel 16',
  ],
};

// --- the six conversations ---------------------------------------------------

export const DIALOGUES: Dialogue[] = [
  {
    id: 'radio-check',
    icon: '📻',
    channel: '12',
    title: { pl: 'Proba lacznosci z marina', ru: 'Проверка связи с мариной' },
    brief: {
      pl: 'Stoisz w porcie i chcesz sprawdzic, czy radio dziala. Wywolujesz MARINA GDYNIA na jej kanale roboczym 12 i prosisz o probe lacznosci.',
      ru: 'Вы в порту и хотите убедиться, что рация работает. Вызываете MARINA GDYNIA на её рабочем канале 12 и просите проверку связи.',
    },
    why: {
      pl: 'Uczy szkieletu kazdego wywolania: kogo wolam, THIS IS, kim jestem, o co prosze, OVER. Klasyczny blad: konczenie proby lacznosci slowem OVER zamiast OUT, oraz robienie proby na kanale 16 zamiast na kanale roboczym mariny.',
      ru: 'Учит скелету любого вызова: кого вызываю, THIS IS, кто я, что прошу, OVER. Классическая ошибка: закрывать проверку словом OVER вместо OUT, а также делать проверку на 16 канале вместо рабочего канала марины.',
    },
    turns: [
      {
        youSay: 'MARINA GDYNIA, MARINA GDYNIA, THIS IS WIND DANCER, WIND DANCER, CALL SIGN SIERRA PAPA NINE ZERO ONE TWO. RADIO CHECK ON CHANNEL ONE TWO. OVER.',
        must: [
          marina(), THIS_IS, IDENTITY, CALLSIGN,
          { id: 'request', label: 'Prosba o probe lacznosci (RADIO CHECK)', anyOf: ['radio check', 'radiocheck', 'how do you read'] },
          OVER,
        ],
        stationName: 'MARINA GDYNIA',
        stationSays: 'WIND DANCER, THIS IS MARINA GDYNIA. YOU ARE LOUD AND CLEAR, STRENGTH FIVE. OVER.',
        hint: {
          pl: 'Najpierw kogo wywolujesz, potem THIS IS i kim jestes. Znak wywolawczy literuj alfabetem fonetycznym. Na koncu OVER.',
          ru: 'Сначала кого вызываете, потом THIS IS и кто вы. Позывной по фонетическому алфавиту. В конце OVER.',
        },
      },
      {
        youSay: 'MARINA GDYNIA, THIS IS WIND DANCER. THANK YOU. YOU ARE ALSO LOUD AND CLEAR, STRENGTH FIVE. OUT.',
        must: [
          marina(), IDENTITY,
          { id: 'readback', label: 'Ocena odbioru zwrotna (LOUD AND CLEAR / STRENGTH)', anyOf: ['loud and clear', 'strength five', 'strength 5', 'strength 5 5'] },
          OUT,
        ],
        stationName: 'MARINA GDYNIA',
        // Nothing. After OUT nobody answers - that IS what OUT means, and this
        // dialogue exists to teach exactly that.
        stationSays: '',
        hint: {
          pl: 'Odpowiedz tez ocena odbioru i zamknij rozmowe slowem OUT, nie OVER. Po OUT nikt sie juz nie odzywa - wlasnie na tym polega OUT.',
          ru: 'Ответьте своей оценкой приёма и закройте разговор словом OUT, а не OVER. После OUT никто уже не отвечает - в этом и смысл OUT.',
        },
      },
    ],
  },

  {
    id: 'marina-berth',
    icon: '⚓',
    channel: '16',
    title: { pl: 'Miejsce przy kei: z 16 na kanal roboczy', ru: 'Место у причала: с 16 на рабочий канал' },
    brief: {
      pl: 'Podchodzisz do Gdyni i potrzebujesz miejsca. Wywolujesz MARINA GDYNIA na 16, przechodzisz na kanal roboczy i dopiero tam podajesz dlugosc, zanurzenie i ETA.',
      ru: 'Подходите к Гдыне, нужно место. Вызываете MARINA GDYNIA на 16, переходите на рабочий канал и только там даёте длину, осадку и ETA.',
    },
    why: {
      pl: 'Uczy najczestszej rozmowy jachtu w ogole i ruchu 16 -> kanal roboczy. Klasyczny blad: wywalanie calej tresci (dlugosc, zanurzenie, ETA) juz na kanale 16, ktory ma zostac wolny.',
      ru: 'Учит самому частому разговору яхты и переходу 16 -> рабочий канал. Классическая ошибка: вывалить всё содержание (длина, осадка, ETA) прямо на 16 канале, который должен оставаться свободным.',
    },
    turns: [
      {
        youSay: 'MARINA GDYNIA, MARINA GDYNIA, THIS IS WIND DANCER, WIND DANCER, CALL SIGN SIERRA PAPA NINE ZERO ONE TWO. OVER.',
        must: [marina(), THIS_IS, IDENTITY, CALLSIGN, OVER],
        stationName: 'MARINA GDYNIA',
        stationSays: 'WIND DANCER, THIS IS MARINA GDYNIA. CHANGE TO CHANNEL ONE TWO. OVER.',
        hint: {
          pl: 'Na 16 tylko sie przedstaw. Zadnych szczegolow - 16 to kanal wywolawczy i bezpieczenstwa.',
          ru: 'На 16 только представьтесь. Никаких деталей: 16 - канал вызова и безопасности.',
        },
      },
      {
        youSay: 'MARINA GDYNIA, THIS IS WIND DANCER. CHANGING TO CHANNEL ONE TWO. OVER.',
        must: [
          IDENTITY,
          { id: 'agree', label: 'Potwierdzenie zmiany kanalu (CHANGING TO)', anyOf: ['changing to', 'going to channel', 'switching to', 'change to channel'] },
          { id: 'channel', label: 'Numer kanalu (ONE TWO / 12)', anyOf: ['one two', 'channel 12', 'channel 1 2', '12', 'twelve'] },
          OVER,
        ],
        stationName: 'MARINA GDYNIA',
        stationSays: 'WIND DANCER, THIS IS MARINA GDYNIA ON CHANNEL ONE TWO. PASS YOUR MESSAGE. OVER.',
        hint: {
          pl: 'Powtorz numer kanalu, na ktory przechodzisz. To dowod, ze oboje idziecie na ten sam kanal.',
          ru: 'Повторите номер канала, на который переходите. Это доказательство, что вы оба идёте на один и тот же канал.',
        },
      },
      {
        youSay: 'MARINA GDYNIA, THIS IS WIND DANCER. I REQUEST A BERTH FOR TONIGHT. MY LENGTH IS ELEVEN METRES, MY DRAUGHT IS ONE DECIMAL EIGHT METRES, THREE PERSONS ON BOARD. MY ETA IS ONE SIX THREE ZERO LOCAL TIME. OVER.',
        must: [
          IDENTITY,
          { id: 'request', label: 'Prosba o miejsce (BERTH)', anyOf: ['request a berth', 'request berth', 'berth for tonight', 'i need a berth', 'a berth', 'request a place'] },
          { id: 'length', label: 'Dlugosc jachtu', anyOf: ['eleven metres', 'eleven meters', '11 metres', '11 meters', 'length is eleven', 'my length'] },
          { id: 'draught', label: 'Zanurzenie', anyOf: ['draught', 'draft', 'drought', 'one decimal eight', 'one point eight', '1 8', '1 8 metres', '1 8 meters'] },
          { id: 'eta', label: 'ETA', anyOf: ['eta', 'e t a', 'one six three zero', '1630', '16 30', '16 3 0', 'sixteen thirty'] },
          OVER,
        ],
        stationName: 'MARINA GDYNIA',
        stationSays: 'WIND DANCER, THIS IS MARINA GDYNIA. BERTH DELTA ONE FOUR IS RESERVED FOR YOU, PORT SIDE TO. CALL ME AGAIN AT THE ENTRANCE. OVER.',
        hint: {
          pl: 'Teraz cala tresc: czego chcesz, dlugosc, zanurzenie, ile osob, ETA. Liczby czytaj cyfra po cyfrze.',
          ru: 'Теперь вся суть: что нужно, длина, осадка, сколько человек, ETA. Числа читайте по цифрам.',
        },
      },
      {
        youSay: 'MARINA GDYNIA, THIS IS WIND DANCER. BERTH DELTA ONE FOUR, PORT SIDE TO. I WILL CALL YOU AT THE ENTRANCE. THANK YOU. OUT.',
        must: [
          IDENTITY,
          { id: 'readback', label: 'Powtorzenie numeru miejsca (DELTA ONE FOUR)', anyOf: ['delta one four', 'delta 14', 'delta 1 4', 'd14', 'delta fourteen', 'berth delta'] },
          { id: 'side', label: 'Powtorzenie burty (PORT SIDE TO)', anyOf: ['port side', 'portside', 'port side to'] },
          OUT,
        ],
        stationName: 'MARINA GDYNIA',
        stationSays: '',
        hint: {
          pl: 'Powtorz numer miejsca i burte. Powtorzenie to jedyny dowod, ze dobrze uslyszales. Konczysz slowem OUT.',
          ru: 'Повторите номер места и борт. Повтор - единственное доказательство, что вы правильно услышали. Заканчиваете словом OUT.',
        },
      },
    ],
  },

  {
    id: 'ship-to-ship',
    icon: '🚢',
    channel: '16',
    title: { pl: 'Statek-statek: kurs kolizyjny z ORKA', ru: 'Судно-судно: курс на столкновение с ORKA' },
    brief: {
      // Rule 15 (crossing) applies to POWER-DRIVEN vessels. Under sail the
      // give-way vessel is decided by tack, so the brief has to say this.
      pl: 'Jacht ORKA idzie kursem kolizyjnym z prawej burty. Oba jachty ida na silniku, wiec obowiazuje regula kursow krzyzujacych: ustepujesz ty. Wywolujesz go na 16, przechodzicie na kanal roboczy i umawiacie sie jasnymi slowami, jak sie miniecie.',
      ru: 'Яхта ORKA идёт пересекающимся курсом справа. Обе яхты идут под мотором, поэтому действует правило пересекающихся курсов: уступаете вы. Вызываете её на 16, переходите на рабочий канал и ясными словами договариваетесь, как разойдётесь.',
    },
    why: {
      pl: 'Uczy lacznosci statek-statek i tego, ze uzgodnienie manewru musi byc jednoznaczne i powtorzone przez obie strony. Klasyczny blad: mgliste I WILL TRY TO GO AROUND YOU zamiast konkretu, i uzgadnianie manewru na kanale 16.',
      ru: 'Учит связи судно-судно и тому, что договорённость о манёвре должна быть однозначной и повторённой обеими сторонами. Классическая ошибка: расплывчатое I WILL TRY TO GO AROUND YOU вместо конкретики и согласование манёвра прямо на 16 канале.',
    },
    turns: [
      {
        youSay: 'ORKA, ORKA, THIS IS WIND DANCER, WIND DANCER, CALL SIGN SIERRA PAPA NINE ZERO ONE TWO. OVER.',
        must: [ORKA, THIS_IS, IDENTITY, CALLSIGN, OVER],
        stationName: 'ORKA',
        stationSays: 'WIND DANCER, THIS IS ORKA. CHANGE TO CHANNEL SIX. OVER.',
        hint: {
          pl: 'Wywolanie statek-statek wyglada tak samo jak do stacji brzegowej. Na 16 tylko nazwy, bez tresci.',
          ru: 'Вызов судно-судно выглядит так же, как вызов береговой станции. На 16 только имена, без содержания.',
        },
      },
      {
        youSay: 'ORKA, THIS IS WIND DANCER. CHANGING TO CHANNEL SIX. OVER.',
        must: [
          ORKA, IDENTITY,
          { id: 'channel', label: 'Numer kanalu roboczego (SIX / 6)', anyOf: ['channel six', 'channel 6', 'six', '6', 'zero six', '06'] },
          OVER,
        ],
        stationName: 'ORKA',
        stationSays: 'WIND DANCER, THIS IS ORKA ON CHANNEL SIX. PASS YOUR MESSAGE. OVER.',
        hint: {
          pl: 'Kanal 6 to miedzynarodowy kanal statek-statek dla bezpieczenstwa zeglugi. Potwierdz numer, zanim przelaczysz.',
          ru: 'Канал 6 - международный канал судно-судно для безопасности мореплавания. Подтвердите номер, прежде чем переключиться.',
        },
      },
      {
        youSay: 'ORKA, THIS IS WIND DANCER. MY POSITION IS FIVE FOUR DEGREES THREE ZERO DECIMAL FIVE MINUTES NORTH, ZERO ONE EIGHT DEGREES FOUR FIVE DECIMAL TWO MINUTES EAST. YOU ARE CROSSING FROM MY STARBOARD SIDE. I INTEND TO ALTER COURSE TO STARBOARD AND PASS ASTERN OF YOU. OVER.',
        must: [
          IDENTITY, POSITION,
          { id: 'situation', label: 'Opis sytuacji (kurs kolizyjny, prawa burta)', anyOf: ['crossing', 'starboard side', 'from my starboard', 'collision course'] },
          { id: 'intention', label: 'Twoj zamiar, jednoznacznie (ALTER COURSE TO STARBOARD / PASS ASTERN)', anyOf: ['alter course to starboard', 'altering to starboard', 'pass astern', 'passing astern', 'turn to starboard', 'i will pass astern'] },
          OVER,
        ],
        stationName: 'ORKA',
        stationSays: 'WIND DANCER, THIS IS ORKA. AGREED. YOU PASS ASTERN OF ME. I KEEP MY COURSE AND SPEED. OVER.',
        hint: {
          pl: 'Mow, co ZROBISZ, a nie co czujesz. ALTER COURSE TO STARBOARD, PASS ASTERN OF YOU. Zero slow wieloznacznych.',
          ru: 'Говорите, что вы СДЕЛАЕТЕ, а не что чувствуете. ALTER COURSE TO STARBOARD, PASS ASTERN OF YOU. Никаких двусмысленных слов.',
        },
      },
      {
        youSay: 'ORKA, THIS IS WIND DANCER. AGREED. I ALTER COURSE TO STARBOARD AND PASS ASTERN OF YOU. OUT.',
        must: [
          IDENTITY,
          { id: 'agree', label: 'Potwierdzenie ustalenia (AGREED)', anyOf: ['agreed', 'agree', 'understood', 'roger'] },
          { id: 'readback', label: 'Powtorzenie manewru (ALTER COURSE TO STARBOARD / PASS ASTERN)', anyOf: ['alter course to starboard', 'altering to starboard', 'pass astern', 'passing astern', 'turn to starboard'] },
          OUT,
        ],
        stationName: 'ORKA',
        stationSays: '',
        hint: {
          pl: 'Powtorz uzgodniony manewr wlasnymi ustami. Umowa o mijaniu istnieje dopiero wtedy, gdy obie strony ja wypowiedza.',
          ru: 'Повторите согласованный манёвр своими словами. Договорённость о расхождении существует только тогда, когда её произнесли обе стороны.',
        },
      },
    ],
  },

  {
    id: 'vts-report',
    icon: '🗼',
    channel: '71',
    title: { pl: 'Meldunek do VTS ZATOKA GDANSKA', ru: 'Доклад в VTS ZATOKA GDANSKA' },
    brief: {
      pl: 'Wchodzisz w obszar ruchu Zatoki Gdanskiej. Meldujesz sie do VTS na kanale 71: nazwa, pozycja, port docelowy, ETA.',
      ru: 'Входите в зону регулирования движения Гданьского залива. Докладываете VTS на 71 канале: название, позиция, порт назначения, ETA.',
    },
    why: {
      pl: 'Uczy stalego formatu meldunku i tego, ze polecenie VTS trzeba powtorzyc. Klasyczny blad: meldunek bez ETA albo bez pozycji, i odpowiedz samym ROGER zamiast powtorzenia polecenia.',
      ru: 'Учит постоянному формату доклада и тому, что указание VTS надо повторить. Классическая ошибка: доклад без ETA или без позиции и ответ одним ROGER вместо повтора указания.',
    },
    turns: [
      {
        youSay: 'VTS ZATOKA GDANSKA, THIS IS WIND DANCER, WIND DANCER, CALL SIGN SIERRA PAPA NINE ZERO ONE TWO. OVER.',
        must: [VTS, THIS_IS, IDENTITY, CALLSIGN, OVER],
        stationName: 'VTS ZATOKA GDANSKA',
        stationSays: 'WIND DANCER, THIS IS VTS ZATOKA GDANSKA. PASS YOUR MESSAGE. OVER.',
        hint: {
          pl: 'Kanal 71 jest kanalem roboczym VTS, wiec wywolujesz od razu na nim. Najpierw sam kontakt, tresc dopiero po PASS YOUR MESSAGE.',
          ru: 'Канал 71 - рабочий канал VTS, поэтому вызываете сразу на нём. Сначала контакт, содержание только после PASS YOUR MESSAGE.',
        },
      },
      {
        youSay: 'VTS ZATOKA GDANSKA, THIS IS WIND DANCER. ENTRY REPORT. MY POSITION IS FIVE FOUR DEGREES THREE ZERO DECIMAL FIVE MINUTES NORTH, ZERO ONE EIGHT DEGREES FOUR FIVE DECIMAL TWO MINUTES EAST. MY COURSE IS TWO ONE ZERO DEGREES, MY SPEED IS SIX KNOTS. MY DESTINATION IS GDYNIA, ETA ONE SIX THREE ZERO. THREE PERSONS ON BOARD. OVER.',
        must: [
          IDENTITY, POSITION,
          { id: 'destination', label: 'Port docelowy (GDYNIA)', anyOf: ['destination', 'gdynia', 'gdinia', 'bound for'] },
          { id: 'eta', label: 'ETA', anyOf: ['eta', 'e t a', 'one six three zero', '1630', '16 30', 'sixteen thirty'] },
          POB, OVER,
        ],
        stationName: 'VTS ZATOKA GDANSKA',
        stationSays: 'WIND DANCER, THIS IS VTS ZATOKA GDANSKA. YOUR REPORT IS RECEIVED. KEEP CLEAR OF THE APPROACH FAIRWAY. MAINTAIN LISTENING WATCH ON CHANNEL SEVEN ONE. OVER.',
        hint: {
          pl: 'Meldunek do VTS ma staly szyk: kim jestem, gdzie jestem, dokad ide, kiedy tam bede, ile osob. Nic wiecej.',
          ru: 'Доклад в VTS имеет постоянный порядок: кто я, где я, куда иду, когда там буду, сколько человек. Ничего лишнего.',
        },
      },
      {
        youSay: 'VTS ZATOKA GDANSKA, THIS IS WIND DANCER. I WILL KEEP CLEAR OF THE APPROACH FAIRWAY AND MAINTAIN LISTENING WATCH ON CHANNEL SEVEN ONE. OUT.',
        must: [
          IDENTITY,
          { id: 'readback1', label: 'Powtorzenie polecenia (KEEP CLEAR OF THE FAIRWAY)', anyOf: ['keep clear', 'keeping clear', 'clear of the fairway', 'clear of the approach'] },
          { id: 'readback2', label: 'Powtorzenie nasluchu (CHANNEL SEVEN ONE)', anyOf: ['channel seven one', 'channel 71', '71', 'seven one', 'listening watch'] },
          OUT,
        ],
        stationName: 'VTS ZATOKA GDANSKA',
        stationSays: '',
        hint: {
          pl: 'Polecenie VTS zawsze powtarzasz. Nie mow samego ROGER - powiedz, co konkretnie zrobisz.',
          ru: 'Указание VTS всегда повторяется. Не говорите просто ROGER - скажите, что именно вы сделаете.',
        },
      },
    ],
  },

  {
    id: 'panpan-medico',
    icon: '🩹',
    channel: '16',
    title: { pl: 'PAN-PAN: porada medyczna', ru: 'PAN-PAN: медицинская консультация' },
    brief: {
      pl: 'Czlonek zalogi gleboko rozcial dlon o winch. Zycie nie jest zagrozone, ale krwawi mocno. Nadajesz PAN-PAN na 16 i prosisz o porade medyczna. Stacja brzegowa potwierdzi, przeniesie rozmowe na kanal roboczy i bedzie dopytywac.',
      ru: 'Член экипажа глубоко разрезал ладонь о лебёдку. Жизни угрозы нет, но кровотечение сильное. Даёте PAN-PAN на 16 и просите медицинскую консультацию. Береговая станция подтвердит, переведёт разговор на рабочий канал и будет задавать вопросы.',
    },
    why: {
      pl: 'Uczy, ze ruch pilny to ROZMOWA, a nie monolog: stacja brzegowa dopytuje, a ty musisz odpowiadac. Samo wywolanie PAN-PAN idzie na 16, ale dluga konsultacja z lekarzem schodzi na kanal roboczy - 16 to kanal wywolawczy i bezpieczenstwa i musi zostac wolny. Klasyczny blad: nadanie PAN-PAN i zamilkniecie, albo prowadzenie calej konsultacji na 16.',
      ru: 'Учит тому, что срочный трафик - это РАЗГОВОР, а не монолог: береговая станция задаёт вопросы, и надо отвечать. Сам вызов PAN-PAN идёт на 16, но длинная консультация с врачом уходит на рабочий канал: 16 - канал вызова и безопасности, он должен оставаться свободным. Классическая ошибка: передать PAN-PAN и замолчать или вести всю консультацию на 16.',
    },
    turns: [
      {
        youSay: 'PAN-PAN, PAN-PAN, PAN-PAN. ALL STATIONS, ALL STATIONS, ALL STATIONS. THIS IS WIND DANCER, WIND DANCER, WIND DANCER, CALL SIGN SIERRA PAPA NINE ZERO ONE TWO. MY POSITION IS FIVE FOUR DEGREES THREE ZERO DECIMAL FIVE MINUTES NORTH, ZERO ONE EIGHT DEGREES FOUR FIVE DECIMAL TWO MINUTES EAST. I HAVE A CREW MEMBER WITH A DEEP CUT TO THE HAND AND HEAVY BLEEDING. I REQUEST MEDICAL ADVICE. THREE PERSONS ON BOARD. OVER.',
        must: [
          // "Pan-pan, pan-pan, pan-pan." and "Pan pan. Pan pan. Pan pan." both
          // normalize to "pan pan pan pan pan pan" - the naive three-word match
          // would have failed a perfect call.
          { id: 'panpan', label: 'PAN-PAN trzy razy', anyOf: ['pan pan pan pan pan pan', 'panpan panpan panpan', 'pan pan pan', 'pon pon pon', 'pan pan pan pan'] },
          { id: 'allstations', label: 'ALL STATIONS', anyOf: ['all stations', 'all ships'] },
          IDENTITY, POSITION,
          { id: 'nature', label: 'Rodzaj problemu (rana, krwawienie)', anyOf: ['cut', 'bleeding', 'injured', 'injury', 'wound', 'hand'] },
          { id: 'request', label: 'Prosba o porade medyczna (MEDICAL ADVICE)', anyOf: ['medical advice', 'medical assistance', 'medico', 'doctor'] },
        ],
        stationName: 'GDYNIA RESCUE RADIO',
        stationSays: 'WIND DANCER, THIS IS GDYNIA RESCUE RADIO. PAN-PAN RECEIVED. WHAT HAPPENED, AND IS THE PERSON CONSCIOUS. OVER.',
        hint: {
          pl: 'PAN-PAN trzy razy, ALL STATIONS trzy razy, nazwa trzy razy. Potem pozycja, co sie stalo i czego prosisz.',
          ru: 'PAN-PAN трижды, ALL STATIONS трижды, название трижды. Потом позиция, что случилось и о чём просите.',
        },
      },
      {
        youSay: 'GDYNIA RESCUE RADIO, THIS IS WIND DANCER. THE CREW MEMBER CUT HIS HAND ON A WINCH ABOUT TEN MINUTES AGO. HE IS CONSCIOUS AND BREATHING NORMALLY. THE BLEEDING IS UNDER A PRESSURE DRESSING. OVER.',
        must: [
          RESCUE, IDENTITY,
          { id: 'what', label: 'Co sie stalo (skaleczenie o winch)', anyOf: ['cut his hand', 'cut', 'winch', 'wound'] },
          { id: 'conscious', label: 'Czy przytomny (CONSCIOUS)', anyOf: ['conscious', 'awake', 'breathing'] },
          OVER,
        ],
        stationName: 'GDYNIA RESCUE RADIO',
        stationSays: 'WIND DANCER, THIS IS GDYNIA RESCUE RADIO. HOW MANY PERSONS ON BOARD, AND DO YOU HAVE A FIRST AID KIT. OVER.',
        hint: {
          pl: 'Odpowiadaj na to, o co pytali, i tylko na to. Krotko, konkretnie, bez opowiadania historii.',
          ru: 'Отвечайте на то, о чём спросили, и только на это. Коротко, конкретно, без историй.',
        },
      },
      {
        youSay: 'GDYNIA RESCUE RADIO, THIS IS WIND DANCER. THREE PERSONS ON BOARD. YES, I HAVE A FIRST AID KIT ON BOARD. OVER.',
        must: [
          RESCUE, IDENTITY, POB,
          { id: 'kit', label: 'Odpowiedz o apteczce (FIRST AID KIT)', anyOf: ['first aid kit', 'first aid', 'medical kit', 'yes i have'] },
          OVER,
        ],
        stationName: 'GDYNIA RESCUE RADIO',
        // Urgency traffic moves OFF 16. A doctor holding a consultation on the
        // calling and distress channel would block it for the whole coast.
        stationSays: 'WIND DANCER, THIS IS GDYNIA RESCUE RADIO. KEEP THE HAND RAISED AND KEEP PRESSURE ON. DO NOT REMOVE THE DRESSING. CHANGE TO CHANNEL SIX SEVEN FOR MEDICAL ADVICE. A DOCTOR WILL SPEAK TO YOU ON CHANNEL SIX SEVEN. OVER.',
        hint: {
          pl: 'Kazda odpowiedz zaczyna sie od nazwy stacji i THIS IS WIND DANCER. W eterze moze byc kilka jachtow.',
          ru: 'Каждый ответ начинается с названия станции и THIS IS WIND DANCER. В эфире может быть несколько яхт.',
        },
      },
      {
        youSay: 'GDYNIA RESCUE RADIO, THIS IS WIND DANCER. I KEEP THE HAND RAISED, I KEEP PRESSURE ON, I DO NOT REMOVE THE DRESSING. CHANGING TO CHANNEL SIX SEVEN. OVER.',
        must: [
          RESCUE, IDENTITY,
          { id: 'readback', label: 'Powtorzenie zalecen (pressure, dressing)', anyOf: ['pressure', 'dressing', 'hand raised', 'keep the hand'] },
          { id: 'channel', label: 'Potwierdzenie zmiany kanalu (CHANNEL SIX SEVEN)', anyOf: ['changing to channel six seven', 'channel six seven', 'channel 67', 'six seven', '67'] },
          OVER,
        ],
        stationName: 'GDYNIA RESCUE RADIO',
        stationSays: 'WIND DANCER, THIS IS GDYNIA RESCUE RADIO. UNDERSTOOD. STAND BY ON CHANNEL SIX SEVEN. OUT.',
        hint: {
          pl: 'Powtorz zalecenia lekarskie i potwierdz kanal roboczy. Konczysz slowem OVER, bo rozmowa trwa - lekarz sie odezwie.',
          ru: 'Повторите медицинские указания и подтвердите рабочий канал. Заканчиваете словом OVER: разговор продолжается, врач ещё выйдет на связь.',
        },
      },
    ],
  },

  {
    id: 'mayday-dialogue',
    icon: '🔥',
    channel: '16',
    title: { pl: 'MAYDAY: pozar w komorze silnika', ru: 'MAYDAY: пожар в моторном отсеке' },
    brief: {
      pl: 'Po alercie DSC nadajesz MAYDAY glosem na 16. Pozar w komorze silnika, trzy osoby na pokladzie. Stacja brzegowa potwierdza, oglasza cisze radiowa i zaczyna pytac - musisz odpowiedziec na kazde pytanie.',
      ru: 'После DSC-оповещения передаёте MAYDAY голосом на 16. Пожар в моторном отсеке, три человека на борту. Береговая станция подтверждает, объявляет радиомолчание и начинает задавать вопросы: ответить надо на каждый.',
    },
    why: {
      pl: 'Uczy najtrudniejszej czesci prawdziwego MAYDAY: tego, co dzieje sie PO komunikacie. Stacja brzegowa potwierdza (RECEIVED MAYDAY), oglasza SEELONCE MAYDAY, przejmuje kierowanie i pyta o liczbe osob, opuszczanie jachtu i kolor kadluba. Klasyczny blad: nadanie MAYDAY i cisza, konczenie slowem OUT albo proba przejscia na inny kanal - ruch w niebezpieczenstwie zostaje na 16, a kieruje nim stacja brzegowa, nie poszkodowany.',
      ru: 'Учит самой трудной части настоящего MAYDAY: тому, что происходит ПОСЛЕ сообщения. Береговая станция подтверждает (RECEIVED MAYDAY), объявляет SEELONCE MAYDAY, берёт управление на себя и спрашивает число людей, покидаете ли судно и цвет корпуса. Классическая ошибка: передать MAYDAY и замолчать, закончить словом OUT или уйти на другой канал: трафик бедствия остаётся на 16, и управляет им береговая станция, а не терпящий бедствие.',
    },
    turns: [
      {
        youSay: 'MAYDAY, MAYDAY, MAYDAY. THIS IS WIND DANCER, WIND DANCER, WIND DANCER, CALL SIGN SIERRA PAPA NINE ZERO ONE TWO. MAYDAY WIND DANCER. MY POSITION IS FIVE FOUR DEGREES THREE ZERO DECIMAL FIVE MINUTES NORTH, ZERO ONE EIGHT DEGREES FOUR FIVE DECIMAL TWO MINUTES EAST. I AM ON FIRE IN THE ENGINE COMPARTMENT. I REQUIRE IMMEDIATE ASSISTANCE. THREE PERSONS ON BOARD. OVER.',
        must: [
          // "Mayday! Mayday! Mayday!" is what the transcriber actually returns.
          { id: 'mayday', label: 'MAYDAY trzy razy', anyOf: ['mayday mayday mayday', 'may day may day may day', 'mayday mayday', 'maiday maiday'] },
          IDENTITY, POSITION,
          { id: 'nature', label: 'Rodzaj niebezpieczenstwa (POZAR)', anyOf: ['fire', 'on fire', 'burning', 'engine compartment'] },
          { id: 'assistance', label: 'Prosba o natychmiastowa pomoc', anyOf: ['immediate assistance', 'require assistance', 'need assistance', 'require immediate'] },
          POB,
        ],
        stationName: 'GDYNIA RESCUE RADIO',
        stationSays: 'MAYDAY. WIND DANCER, WIND DANCER, WIND DANCER, THIS IS GDYNIA RESCUE RADIO. RECEIVED MAYDAY. ALL STATIONS, ALL STATIONS, THIS IS GDYNIA RESCUE RADIO. SEELONCE MAYDAY. WIND DANCER, HOW MANY PERSONS ON BOARD, AND ARE YOU ABANDONING YOUR VESSEL. OVER.',
        hint: {
          pl: 'MAYDAY trzy razy, nazwa trzy razy, potem MAYDAY plus nazwa raz. Pozycja, rodzaj niebezpieczenstwa, jaka pomoc, ile osob. To wszystko w jednej transmisji.',
          ru: 'MAYDAY трижды, название трижды, потом MAYDAY плюс название один раз. Позиция, характер бедствия, какая помощь, сколько человек. Всё это в одной передаче.',
        },
      },
      {
        youSay: 'GDYNIA RESCUE RADIO, THIS IS WIND DANCER. THREE PERSONS ON BOARD. I AM NOT ABANDONING. I AM FIGHTING THE FIRE. THE LIFERAFT IS READY. OVER.',
        must: [
          RESCUE, IDENTITY, POB,
          { id: 'abandon', label: 'Odpowiedz o opuszczeniu jachtu (NOT ABANDONING)', anyOf: ['not abandoning', 'i am not abandoning', 'we are not abandoning', 'not leaving', 'abandoning'] },
          OVER,
        ],
        stationName: 'GDYNIA RESCUE RADIO',
        stationSays: 'WIND DANCER, THIS IS GDYNIA RESCUE RADIO. WHAT IS THE COLOUR OF YOUR HULL, AND HAVE YOU STOPPED YOUR ENGINE. OVER.',
        hint: {
          pl: 'Odpowiadaj krotko i dokladnie na oba pytania. Stacja brzegowa prowadzi ruch w niebezpieczenstwie, ty tylko odpowiadasz.',
          ru: 'Отвечайте коротко и точно на оба вопроса. Береговая станция управляет трафиком бедствия, вы только отвечаете.',
        },
      },
      {
        youSay: 'GDYNIA RESCUE RADIO, THIS IS WIND DANCER. MY HULL IS WHITE WITH A BLUE STRIPE. THE ENGINE IS STOPPED AND THE FUEL IS SHUT OFF. OVER.',
        must: [
          RESCUE, IDENTITY,
          { id: 'colour', label: 'Kolor kadluba', anyOf: ['white', 'blue stripe', 'hull is white', 'white hull'] },
          { id: 'engine', label: 'Odpowiedz o silniku (ENGINE STOPPED)', anyOf: ['engine is stopped', 'engine stopped', 'stopped the engine', 'fuel is shut off', 'engine off'] },
          OVER,
        ],
        stationName: 'GDYNIA RESCUE RADIO',
        stationSays: 'WIND DANCER, THIS IS GDYNIA RESCUE RADIO. LIFEBOAT IS ON THE WAY, ETA TWO ZERO MINUTES. PUT ON LIFEJACKETS. STAY ON CHANNEL ONE SIX. OVER.',
        hint: {
          pl: 'Kolor kadluba to nie ciekawostka: po tym znajdzie cie smiglowiec. Podaj go bez wahania.',
          ru: 'Цвет корпуса - не мелочь: по нему вас найдёт вертолёт. Называйте без колебаний.',
        },
      },
      {
        youSay: 'GDYNIA RESCUE RADIO, THIS IS WIND DANCER. LIFEBOAT ETA TWO ZERO MINUTES, UNDERSTOOD. LIFEJACKETS ON. I AM STANDING BY ON CHANNEL ONE SIX. OVER.',
        must: [
          RESCUE, IDENTITY,
          { id: 'readback', label: 'Powtorzenie ETA lodzi ratunkowej', anyOf: ['two zero minutes', '20 minutes', 'twenty minutes', 'eta two zero', 'eta 20'] },
          { id: 'lifejackets', label: 'Potwierdzenie kamizelek', anyOf: ['lifejackets', 'life jackets', 'lifejackets on'] },
          STANDBY_16, OVER,
        ],
        stationName: 'GDYNIA RESCUE RADIO',
        // "STAND BY. OVER." is a contradiction: OVER means "answer me now".
        stationSays: 'WIND DANCER, THIS IS GDYNIA RESCUE RADIO. UNDERSTOOD. REPORT ANY CHANGE IMMEDIATELY. STAND BY ON CHANNEL ONE SIX. OUT.',
        hint: {
          pl: 'Nigdy nie konczysz MAYDAY slowem OUT. Ruch w niebezpieczenstwie zamyka stacja brzegowa, nie ty.',
          ru: 'Никогда не заканчивайте MAYDAY словом OUT. Трафик бедствия закрывает береговая станция, а не вы.',
        },
      },
    ],
  },
];
