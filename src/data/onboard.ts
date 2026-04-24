// ============================================================================
// "First week on board" content - trilingual RU / EN / PL
// Focus: reducing stress before first yacht trip or regatta
// ============================================================================

import type { LegacyLocalized } from '@/lib/languages';

// `items*` arrays are kept as parallel fields (not via LegacyLocalized)
// because the per-language suffix is needed for array-typed picks.
export type OnboardSection =
  & LegacyLocalized<'title'>
  & {
    id: string;
    icon: string;
    itemsRu: string[];
    itemsEn: string[];
    itemsPl: string[];
    itemsEs?: string[];
    itemsFr?: string[];
    itemsDe?: string[];
    itemsIt?: string[];
    warningRu?: string;
    warningEn?: string;
    warningPl?: string;
    warningEs?: string;
    warningFr?: string;
    warningDe?: string;
    warningIt?: string;
  };

export const onboardSections: OnboardSection[] = [
  {
    id: 'hierarchy',
    icon: '👤',
    titleRu: 'Кто главный на борту',
    titleEn: 'Who\'s in charge',
    titlePl: 'Kto rzadzi na pokladzie',
    itemsRu: [
      'Шкипер - главный. Его слово последнее, особенно в опасных ситуациях.',
      'Помощник шкипера или опытный член экипажа - второй в иерархии. Может отдавать команды от имени шкипера.',
      'Остальной экипаж - выполняет команды. В хорошей команде ты знаешь свою роль и не лезешь в чужую.',
      'На учебных регатах часто есть тренер - его слушают всегда, он приоритет над шкипером по обучению.',
    ],
    itemsEn: [
      'Skipper is in charge. Their word is final, especially in dangerous situations.',
      'First mate or experienced crew - second in command. Can relay orders on the skipper\'s behalf.',
      'Rest of the crew - executes commands. In a good team you know your role and don\'t step on others.',
      'On training regattas there\'s often a coach - always listen to them; they have teaching priority.',
    ],
    itemsPl: [
      'Szyper jest glownodowodzacy. Jego slowo jest ostateczne, szczegolnie w niebezpiecznych sytuacjach.',
      'Zastepca szypra lub doswiadczony czlonek zalogi - drugi w hierarchii. Moze przekazywac rozkazy w imieniu szypra.',
      'Reszta zalogi - wykonuje polecenia. W dobrej zalodze znasz swoja role i nie wchodzisz w czyjas.',
      'Na regatach szkoleniowych czesto jest trener - jego sluchaj zawsze, ma priorytet nauczania nad szyprem.',
    ],
    warningRu: 'Не спорь на ходу. Если не согласен - обсуди после маневра, не во время.',
    warningEn: 'Don\'t argue mid-maneuver. Discuss after, not during.',
    warningPl: 'Nie dyskutuj w trakcie manewru. Omow po, nie podczas.',
  },
  {
    id: 'commands',
    icon: '📣',
    titleRu: 'Команды на борту',
    titleEn: 'Commands on board',
    titlePl: 'Komendy na pokladzie',
    itemsRu: [
      '«Приготовиться к повороту» / «Ready about» - займи позицию, приготовь руки к шкотам, крикни «готов» когда готов.',
      '«Поворот» / «Tacking» / «Lee-ho» - момент поворота. Шкот рабочего борта травится, второй выбирается.',
      '«Трави» / «Ease» - отпустить шкот, парус уходит дальше от ДП.',
      '«Выбирай» / «Trim» или «Sheet in» - подтянуть шкот, парус ближе к ДП.',
      '«Отдать/принять швартов» / «Cast off / make fast» - швартовка и отшвартовка.',
      '«Кранец на борт/за борт» / «Fender in / out» - кранцы убрать или достать.',
      '«Фордевинд» / «Jibe-ho» - поворот через корму, ГИК перебрасывается.',
    ],
    itemsEn: [
      '"Ready about" - get in position, hands on sheets, respond "ready" when set.',
      '"Tacking" / "Lee-ho" - the turn begins. Release working sheet, trim the other.',
      '"Ease" - let out the sheet, sail moves away from centerline.',
      '"Trim" or "Sheet in" - pull the sheet in, sail closer to centerline.',
      '"Cast off" / "Make fast" - docking and undocking lines.',
      '"Fender in / out" - deploy or stow fenders.',
      '"Jibe-ho" - turn through stern, BOOM swings across.',
    ],
    itemsPl: [
      '"Gotowi do zwrotu" / "Ready about" - zajmij pozycje, rece na szotach, krzyknij "gotowy" gdy gotowy.',
      '"Zwrot" / "Tacking" / "Lee-ho" - moment zwrotu. Szot pracujacej burty luzowany, drugi wybierany.',
      '"Luzuj" / "Ease" - puszczaj szot, zagiel idzie dalej od osi.',
      '"Wybieraj" / "Trim" - dociagnij szot, zagiel blizej osi.',
      '"Rzuc / zabierz cume" / "Cast off / make fast" - cumowanie i odcumowanie.',
      '"Odbijacz do srodka / na zewnatrz" / "Fender in / out" - schowaj lub wystaw odbijacze.',
      '"Zwrot przez rufe" / "Jibe-ho" - zwrot przez rufe, BOM przeskakuje.',
    ],
    warningRu: 'Если не понял команду - кричи «не понял» / «say again», не угадывай. Тишина при «jibe-ho» = сломанные кости.',
    warningEn: 'If you didn\'t catch a command - shout "say again". Don\'t guess. Silence on "jibe-ho" = broken bones.',
    warningPl: 'Jesli nie zrozumiales komendy - krzycz "say again", nie zgaduj. Cisza przy "jibe-ho" = zlamane kosci.',
  },
  {
    id: 'danger-zones',
    icon: '⚠️',
    titleRu: 'Что опасно и куда не лезть',
    titleEn: 'What\'s dangerous and where NOT to put your hands',
    titlePl: 'Co jest niebezpieczne i gdzie NIE wkladac rak',
    itemsRu: [
      'ГИК - главная опасность. При фордевинде перелетает через лодку на уровне головы. Всегда следи глазами, где он.',
      'Шкоты под нагрузкой - могут содрать кожу, заломать пальцы. Никогда не держи шкот намоткой на руке.',
      'Лебёдка (winch) - работает как мясорубка. Пальцы внутрь не попадают. Перед работой убери кольца и браслеты.',
      'Якорная цепь - при постановке якоря стой в стороне. Якорь уходит быстро, цепь может сорвать с палубы.',
      'Форштаг и ванты - ими держится мачта. Не нагружай, не виси, не пристёгивай к ним страховку если не сказали.',
      'Откидная плита ванной / носовой туалет / камбуз на качке - держись двумя точками.',
    ],
    itemsEn: [
      'The BOOM - main hazard. On jibes it flies across at head level. Always know where it is.',
      'Loaded sheets - can flay skin, break fingers. Never wrap a sheet around your hand.',
      'Winch - works like a meat grinder. Keep fingers clear. Remove rings and bracelets before working one.',
      'Anchor chain - stand clear during anchor drop. Anchor goes fast, chain can rip off deck.',
      'Forestay and shrouds - they hold up the mast. Don\'t load them, don\'t hang on them, don\'t clip safety tethers to them unless told.',
      'Heads, galley, open hatches in waves - two points of contact always.',
    ],
    itemsPl: [
      'BOM - glowne zagrozenie. Przy zwrocie przez rufe przeskakuje nad lodzia na wysokosci glowy. Zawsze wiedz gdzie jest.',
      'Szoty pod obciazeniem - moga obedrzec skore, zlamac palce. Nigdy nie owijaj szota wokol reki.',
      'Kabestan (winch) - dziala jak maszynka do mielenia miesa. Palce z dala. Przed praca zdejm pierscionki i bransoletki.',
      'Lancuch kotwicy - podczas rzucania kotwicy stoj z boku. Kotwica idzie szybko, lancuch moze zerwac z pokladu.',
      'Sztag i wanty - trzymaja maszt. Nie obciazaj, nie wis, nie przypinaj sie do nich asekuracja jesli nie kazano.',
      'Toalety, kambuz, otwarte luki przy fali - zawsze dwa punkty kontaktu.',
    ],
    warningRu: 'Правило "one hand for yourself, one for the boat" - всегда одна рука должна держаться за что-то надёжное.',
    warningEn: 'Rule: "one hand for yourself, one for the boat" - always one hand on something solid.',
    warningPl: 'Zasada "one hand for yourself, one for the boat" - zawsze jedna reka na czyms solidnym.',
  },
  {
    id: 'rigging',
    icon: '⚓',
    titleRu: 'Что такое шкоты, фалы, лебёдка',
    titleEn: 'Sheets, halyards, winches - what\'s what',
    titlePl: 'Szoty, faly, kabestany - co jest co',
    itemsRu: [
      'Фал (halyard) - идёт вертикально, поднимает парус вверх по мачте.',
      'Шкот (sheet) - идёт к тебе в кокпит, управляет углом паруса. Гротшкот = mainsheet, стаксель-шкоты = jib sheets (их два, по одному на каждый галс).',
      'Лебёдка (winch) - круглый барабан. Шкот на ней в 3-4 оборота по часовой, рукояткой (handle) тянешь.',
      'Утка (cleat) - зажимает конец. Восьмёркой, потом хвост.',
      'Стопор (clutch) - рычаг, держит фал или шкот, чтобы не тянуть лебёдкой постоянно.',
      'Гик (boom) - горизонтальный шест у основания грота. На него крепится мейншит.',
    ],
    itemsEn: [
      'Halyard - runs vertically, hoists a sail up the mast.',
      'Sheet - runs into the cockpit, controls sail angle. Mainsheet, jib sheets (two - one per tack).',
      'Winch - circular drum. Wrap sheet 3-4 turns clockwise, crank with handle.',
      'Cleat - clamps a line. Figure-eight, then tail.',
      'Clutch - lever that holds a halyard or sheet so you\'re not loaded on the winch forever.',
      'Boom - horizontal spar at the foot of the mainsail. Mainsheet attaches to it.',
    ],
    itemsPl: [
      'Fal (halyard) - idzie pionowo, podnosi zagiel po maszcie.',
      'Szot (sheet) - idzie do ciebie do kokpitu, kontroluje kat zagla. Szot grota = mainsheet, szoty foka = jib sheets (dwa - po jednym na kazdy hals).',
      'Kabestan (winch) - okragly beben. Szot 3-4 zwoje zgodnie ze wskazowkami zegara, korba ciagniesz.',
      'Knaga (cleat) - zaciska line. Osemka, potem ogon.',
      'Stoper (clutch) - dzwignia, trzyma fal lub szot zebys nie byl wiecznie obciazony na kabestanie.',
      'Bom (boom) - poziomy drag u podstawy grota. Mocuje sie do niego mainsheet.',
    ],
  },
  {
    id: 'start-routine',
    icon: '🏁',
    titleRu: 'Что происходит на старте регаты',
    titleEn: 'What happens at the race start',
    titlePl: 'Co dzieje sie na starcie regat',
    itemsRu: [
      'Стартовая процедура по RRS Rule 26 - это 5-4-1-0: 5, 4, 1 минуты до старта и сам старт.',
      '5 минут до старта - ПРЕДУПРЕДИТЕЛЬНЫЙ сигнал (warning). Поднимается класс-флаг, 1 звуковой сигнал. С этого момента ты официально в стартовой процедуре.',
      '4 минуты - ПОДГОТОВИТЕЛЬНЫЙ сигнал (preparatory). Поднимается флаг P (или I/Z/U/чёрный в зависимости от правил стартового контроля), 1 звуковой сигнал. Активно маневрируешь у линии.',
      '1 минута - OMS (one-minute signal). Подготовительный флаг спускается, 1 длинный звуковой сигнал.',
      'Старт - 0 минут. Класс-флаг спускается, 1 звуковой сигнал. Пересёкший раньше обязан вернуться за линию и пересечь её снова.',
      'Твоя роль как новичка: не мешать, держаться в стороне от зон, где шкипер маневрирует.',
    ],
    itemsEn: [
      'Start sequence per RRS Rule 26 is 5-4-1-0: 5, 4, 1 minutes to start and the start itself.',
      '5 minutes to start - WARNING signal. Class flag goes up, 1 sound. You are now officially in the start sequence.',
      '4 minutes - PREPARATORY signal. Flag P (or I/Z/U/black depending on start control regime) goes up, 1 sound. Active manoeuvring near the line.',
      '1 minute - OMS (one-minute signal). Preparatory flag down, 1 long sound.',
      'Start - 0 minutes. Class flag down, 1 sound. Anyone who crossed early must return behind the line and cross again.',
      'Your role as a beginner: don\'t get in the way, stay clear of where the skipper is manoeuvring.',
    ],
    itemsPl: [
      'Procedura startu wedlug RRS zasada 26 to 5-4-1-0: 5, 4, 1 minut do startu i sam start.',
      '5 minut do startu - sygnal OSTRZEGAWCZY (warning). Podnosi sie flaga klasy, 1 sygnal dzwiekowy. Od tego momentu jestes oficjalnie w procedurze startu.',
      '4 minuty - sygnal PRZYGOTOWAWCZY (preparatory). Podnosi sie flaga P (lub I/Z/U/czarna w zaleznosci od regimu startu), 1 sygnal dzwiekowy. Aktywnie manewrujesz przy linii.',
      '1 minuta - OMS (one-minute signal). Flaga przygotowawcza opuszczana, 1 dlugi sygnal dzwiekowy.',
      'Start - 0 minut. Flaga klasy opuszczana, 1 sygnal dzwiekowy. Kto przekroczyl wczesniej musi wrocic za linie i przekroczyc ja ponownie.',
      'Twoja rola jako poczatkujacego: nie przeszkadzaj, trzymaj sie z dala od stref gdzie szyper manewruje.',
    ],
  },
  {
    id: 'docking',
    icon: '⚓',
    titleRu: 'Швартовка - что делать',
    titleEn: 'Docking - what to do',
    titlePl: 'Cumowanie - co robic',
    itemsRu: [
      'Кранцы наружу заранее. С того борта, которым подойдёте к причалу.',
      'Приготовь швартовы (линии) на носу и корме. Узнай заранее - какой у тебя узел (обычно бочка на утку).',
      'На причал сходи ТОЛЬКО когда шкипер скажет или когда борт яхты уже у стенки. Не прыгай.',
      'Первым подаётся носовой или кормовой конец - шкипер скажет.',
      'После швартовки - шпринги (диагональные линии) против движения вперёд-назад.',
    ],
    itemsEn: [
      'Fenders out beforehand, on the side you\'re approaching the dock from.',
      'Prepare bow and stern lines. Know your knot in advance (usually bowline onto a cleat).',
      'Step onto the dock ONLY when the skipper says or the hull is already touching. Don\'t jump.',
      'First line ashore is bow or stern - skipper decides.',
      'After docking - springs (diagonal lines) to prevent fore-aft drift.',
    ],
    itemsPl: [
      'Odbijacze na zewnatrz wczesniej. Z tej burty, ktora podejdziecie do nabrzeza.',
      'Przygotuj cumy dziobowa i rufowa. Wiedz wczesniej jaki masz wezel (zwykle bowlinka na knage).',
      'Na nabrzeze schodz TYLKO gdy szyper powie lub gdy burta jachtu juz dotyka. Nie skacz.',
      'Pierwsza cuma na lad to dziobowa lub rufowa - szyper decyduje.',
      'Po cumowaniu - szpringi (ukosne cumy) przeciw ruchowi do przodu / do tylu.',
    ],
    warningRu: 'Никогда не суй руку между бортом и причалом. Любая волна - и пальцы.',
    warningEn: 'Never put your hand between hull and dock. One wave - and goodbye fingers.',
    warningPl: 'Nigdy nie wkladaj reki miedzy kadlub a nabrzeze. Jedna fala - i zegnaj palce.',
  },
  {
    id: 'pack-list',
    icon: '🎒',
    titleRu: 'Что взять с собой',
    titleEn: 'What to bring',
    titlePl: 'Co zabrac ze soba',
    itemsRu: [
      'Непромокаемая куртка и штаны (oilskins / foulies) - если дождь или брызги.',
      'Обувь с белой подошвой, нескользящей - чтобы не царапать палубу.',
      'Солнцезащитные очки с ремешком, крем SPF 50+.',
      'Шапка / кепка - обязательно, на воде солнце бьёт с двух сторон.',
      'Перчатки с открытыми пальцами - для шкотов.',
      'Вода и лёгкие перекусы - морская болезнь усиливается на голодный желудок, но переедать тоже нельзя.',
      'Таблетки от морской болезни (Dramamine, Bonine) - принять ЗА час до выхода.',
      'Тёплый слой - на воде всегда холоднее чем на берегу.',
      'Маленький сухой мешок для телефона/документов.',
    ],
    itemsEn: [
      'Waterproof jacket and pants (foulies) - for rain or spray.',
      'Shoes with white non-marking soles - to not scratch the deck.',
      'Sunglasses with retainer strap, SPF 50+ sunscreen.',
      'Hat - mandatory, sun hits from two sides on water.',
      'Fingerless gloves - for sheets.',
      'Water and light snacks - seasickness worsens on empty stomach, but don\'t overeat.',
      'Motion sickness tablets (Dramamine, Bonine) - take ONE HOUR before departure.',
      'Warm layer - always colder on water than ashore.',
      'Small dry bag for phone and documents.',
    ],
    itemsPl: [
      'Nieprzemakalna kurtka i spodnie (sztormiak / foulies) - na deszcz lub bryzgi.',
      'Buty z biala, nieslizga podeszwa - zeby nie rysowac pokladu.',
      'Okulary przeciwsloneczne z paskiem, krem SPF 50+.',
      'Czapka - obowiazkowo, na wodzie slonce bije z dwoch stron.',
      'Rekawiczki bez palcow - do szotow.',
      'Woda i lekkie przekaski - choroba morska nasila sie na czczo, ale przejesc tez nie mozna.',
      'Tabletki na chorobe morska (Dramamine, Bonine) - wziasc GODZINE przed wyjsciem.',
      'Cieplsza warstwa - na wodzie zawsze chlodniej niz na ladzie.',
      'Maly suchy worek na telefon i dokumenty.',
    ],
  },
  {
    id: 'quiet-crew',
    icon: '🤐',
    titleRu: 'Как быть полезным, а не мешать',
    titleEn: 'How to be helpful, not in the way',
    titlePl: 'Jak byc pomocnym, a nie przeszkadzac',
    itemsRu: [
      'Молчание - золото. На старте и поворотах не болтай.',
      'Предвосхищай. Если видишь что скоро поворот - сам переходи на другой борт (ballast).',
      'Без команды не делай большие вещи. Но мелочи - кранцы, вода экипажу - можно.',
      'Если не знаешь - спроси ОДИН раз, запомни ответ. Не переспрашивай каждые 5 минут.',
      'Держи палубу чистой. Шкот на колёсах = поворот провален.',
      'Если тебя укачало - не герой. Скажи шкиперу, сядь на подветренный борт, смотри на горизонт.',
    ],
    itemsEn: [
      'Silence is golden. Don\'t chatter during start or tacks.',
      'Anticipate. See a tack coming - cross to the other side (ballast) yourself.',
      'Don\'t do big things without a command. Small things - fenders, water for crew - fine.',
      'If you don\'t know - ask ONCE, remember the answer. Don\'t re-ask every 5 minutes.',
      'Keep the deck clear. A sheet under a foot = a blown tack.',
      'If you\'re seasick - not a hero. Tell the skipper, sit on the leeward side, look at the horizon.',
    ],
    itemsPl: [
      'Milczenie jest zlotem. Przy starcie i zwrotach nie gadaj.',
      'Przewiduj. Jesli widzisz ze zaraz zwrot - sam przejdz na druga burte (balast).',
      'Bez polecenia nie rob duzych rzeczy. Ale drobiazgi - odbijacze, woda dla zalogi - mozna.',
      'Jesli nie wiesz - pytaj RAZ, zapamietaj odpowiedz. Nie pytaj ponownie co 5 minut.',
      'Utrzymuj poklad czysty. Szot pod noga = spalony zwrot.',
      'Jesli masz morska chorobe - nie bohateruj. Powiedz szyprowi, usiadz po zawietrznej, patrz na horyzont.',
    ],
  },
];
