// ============================================================================
// "First week on board" content — bilingual
// Focus: reducing stress before first yacht trip or regatta
// ============================================================================

export interface OnboardSection {
  id: string;
  icon: string;
  titleRu: string;
  titleEn: string;
  itemsRu: string[];
  itemsEn: string[];
  warningRu?: string;
  warningEn?: string;
}

export const onboardSections: OnboardSection[] = [
  {
    id: 'hierarchy',
    icon: '👤',
    titleRu: 'Кто главный на борту',
    titleEn: 'Who\'s in charge',
    itemsRu: [
      'Шкипер — главный. Его слово последнее, особенно в опасных ситуациях.',
      'Помощник шкипера или опытный член экипажа — второй в иерархии. Может отдавать команды от имени шкипера.',
      'Остальной экипаж — выполняет команды. В хорошей команде ты знаешь свою роль и не лезешь в чужую.',
      'На учебных регатах часто есть тренер — его слушают всегда, он приоритет над шкипером по обучению.',
    ],
    itemsEn: [
      'Skipper is in charge. Their word is final, especially in dangerous situations.',
      'First mate or experienced crew — second in command. Can relay orders on the skipper\'s behalf.',
      'Rest of the crew — executes commands. In a good team you know your role and don\'t step on others.',
      'On training regattas there\'s often a coach — always listen to them; they have teaching priority.',
    ],
    warningRu: 'Не спорь на ходу. Если не согласен — обсуди после маневра, не во время.',
    warningEn: 'Don\'t argue mid-maneuver. Discuss after, not during.',
  },
  {
    id: 'commands',
    icon: '📣',
    titleRu: 'Команды на борту',
    titleEn: 'Commands on board',
    itemsRu: [
      '«Приготовиться к повороту» / «Ready about» — займи позицию, приготовь руки к шкотам, крикни «готов» когда готов.',
      '«Поворот» / «Tacking» / «Lee-ho» — момент поворота. Шкот рабочего борта травится, второй выбирается.',
      '«Трави» / «Ease» — отпустить шкот, парус уходит дальше от ДП.',
      '«Выбирай» / «Trim» или «Sheet in» — подтянуть шкот, парус ближе к ДП.',
      '«Отдать/принять швартов» / «Cast off / make fast» — швартовка и отшвартовка.',
      '«Кранец на борт/за борт» / «Fender in / out» — кранцы убрать или достать.',
      '«Фордевинд» / «Jibe-ho» — поворот через корму, ГИК перебрасывается.',
    ],
    itemsEn: [
      '"Ready about" — get in position, hands on sheets, respond "ready" when set.',
      '"Tacking" / "Lee-ho" — the turn begins. Release working sheet, trim the other.',
      '"Ease" — let out the sheet, sail moves away from centerline.',
      '"Trim" or "Sheet in" — pull the sheet in, sail closer to centerline.',
      '"Cast off" / "Make fast" — docking and undocking lines.',
      '"Fender in / out" — deploy or stow fenders.',
      '"Jibe-ho" — turn through stern, BOOM swings across.',
    ],
    warningRu: 'Если не понял команду — кричи «не понял» / «say again», не угадывай. Тишина при «jibe-ho» = сломанные кости.',
    warningEn: 'If you didn\'t catch a command — shout "say again". Don\'t guess. Silence on "jibe-ho" = broken bones.',
  },
  {
    id: 'danger-zones',
    icon: '⚠️',
    titleRu: 'Что опасно и куда не лезть',
    titleEn: 'What\'s dangerous and where NOT to put your hands',
    itemsRu: [
      'ГИК — главная опасность. При фордевинде перелетает через лодку на уровне головы. Всегда следи глазами, где он.',
      'Шкоты под нагрузкой — могут содрать кожу, заломать пальцы. Никогда не держи шкот намоткой на руке.',
      'Лебёдка (winch) — работает как мясорубка. Пальцы внутрь не попадают. Перед работой убери кольца и браслеты.',
      'Якорная цепь — при постановке якоря стой в стороне. Якорь уходит быстро, цепь может сорвать с палубы.',
      'Форштаг и ванты — ими держится мачта. Не нагружай, не виси, не пристёгивай к ним страховку если не сказали.',
      'Откидная плита ванной / носовой туалет / камбуз на качке — держись двумя точками.',
    ],
    itemsEn: [
      'The BOOM — main hazard. On jibes it flies across at head level. Always know where it is.',
      'Loaded sheets — can flay skin, break fingers. Never wrap a sheet around your hand.',
      'Winch — works like a meat grinder. Keep fingers clear. Remove rings and bracelets before working one.',
      'Anchor chain — stand clear during anchor drop. Anchor goes fast, chain can rip off deck.',
      'Forestay and shrouds — they hold up the mast. Don\'t load them, don\'t hang on them, don\'t clip safety tethers to them unless told.',
      'Heads, galley, open hatches in waves — two points of contact always.',
    ],
    warningRu: 'Правило "one hand for yourself, one for the boat" — всегда одна рука должна держаться за что-то надёжное.',
    warningEn: 'Rule: "one hand for yourself, one for the boat" — always one hand on something solid.',
  },
  {
    id: 'rigging',
    icon: '⚓',
    titleRu: 'Что такое шкоты, фалы, лебёдка',
    titleEn: 'Sheets, halyards, winches — what\'s what',
    itemsRu: [
      'Фал (halyard) — идёт вертикально, поднимает парус вверх по мачте.',
      'Шкот (sheet) — идёт к тебе в кокпит, управляет углом паруса. Гротшкот = mainsheet, стаксель-шкоты = jib sheets (их два, по одному на каждый галс).',
      'Лебёдка (winch) — круглый барабан. Шкот на ней в 3-4 оборота по часовой, рукояткой (handle) тянешь.',
      'Утка (cleat) — зажимает конец. Восьмёркой, потом хвост.',
      'Стопор (clutch) — рычаг, держит фал или шкот, чтобы не тянуть лебёдкой постоянно.',
      'Гик (boom) — горизонтальный шест у основания грота. На него крепится мейншит.',
    ],
    itemsEn: [
      'Halyard — runs vertically, hoists a sail up the mast.',
      'Sheet — runs into the cockpit, controls sail angle. Mainsheet, jib sheets (two — one per tack).',
      'Winch — circular drum. Wrap sheet 3-4 turns clockwise, crank with handle.',
      'Cleat — clamps a line. Figure-eight, then tail.',
      'Clutch — lever that holds a halyard or sheet so you\'re not loaded on the winch forever.',
      'Boom — horizontal spar at the foot of the mainsail. Mainsheet attaches to it.',
    ],
  },
  {
    id: 'start-routine',
    icon: '🏁',
    titleRu: 'Что происходит на старте регаты',
    titleEn: 'What happens at the race start',
    itemsRu: [
      'Стартовая процедура — 5 минут до старта (визуальные и звуковые сигналы).',
      '5-минутный сигнал — подготовительный флаг вверх, гудок.',
      '4 минуты — предупредительный флаг, второй гудок. Начинаешь маневрировать у линии.',
      '1 минута — флаг спускается, короткий гудок.',
      'Старт — длинный гудок. Тот, кто раньше пересёк линию, возвращается.',
      'Твоя роль как новичка: не мешать, держаться в стороне от зон, где шкипер маневрирует.',
    ],
    itemsEn: [
      'Start sequence — 5 minutes before start (visual and audio signals).',
      '5-min signal — preparatory flag up, horn.',
      '4-min — warning flag, second horn. Start maneuvering near the line.',
      '1-min — flag down, short horn.',
      'Start — long horn. Anyone crossing early has to come back.',
      'Your role as a beginner: don\'t get in the way, stay clear of where the skipper is maneuvering.',
    ],
  },
  {
    id: 'docking',
    icon: '⚓',
    titleRu: 'Швартовка — что делать',
    titleEn: 'Docking — what to do',
    itemsRu: [
      'Кранцы наружу заранее. С того борта, которым подойдёте к причалу.',
      'Приготовь швартовы (линии) на носу и корме. Узнай заранее — какой у тебя узел (обычно бочка на утку).',
      'На причал сходи ТОЛЬКО когда шкипер скажет или когда борт яхты уже у стенки. Не прыгай.',
      'Первым подаётся носовой или кормовой конец — шкипер скажет.',
      'После швартовки — шпринги (диагональные линии) против движения вперёд-назад.',
    ],
    itemsEn: [
      'Fenders out beforehand, on the side you\'re approaching the dock from.',
      'Prepare bow and stern lines. Know your knot in advance (usually bowline onto a cleat).',
      'Step onto the dock ONLY when the skipper says or the hull is already touching. Don\'t jump.',
      'First line ashore is bow or stern — skipper decides.',
      'After docking — springs (diagonal lines) to prevent fore-aft drift.',
    ],
    warningRu: 'Никогда не суй руку между бортом и причалом. Любая волна — и пальцы.',
    warningEn: 'Never put your hand between hull and dock. One wave — and goodbye fingers.',
  },
  {
    id: 'pack-list',
    icon: '🎒',
    titleRu: 'Что взять с собой',
    titleEn: 'What to bring',
    itemsRu: [
      'Непромокаемая куртка и штаны (oilskins / foulies) — если дождь или брызги.',
      'Обувь с белой подошвой, нескользящей — чтобы не царапать палубу.',
      'Солнцезащитные очки с ремешком, крем SPF 50+.',
      'Шапка / кепка — обязательно, на воде солнце бьёт с двух сторон.',
      'Перчатки с открытыми пальцами — для шкотов.',
      'Вода и лёгкие перекусы — морская болезнь усиливается на голодный желудок, но переедать тоже нельзя.',
      'Таблетки от морской болезни (Dramamine, Bonine) — принять ЗА час до выхода.',
      'Тёплый слой — на воде всегда холоднее чем на берегу.',
      'Маленький сухой мешок для телефона/документов.',
    ],
    itemsEn: [
      'Waterproof jacket and pants (foulies) — for rain or spray.',
      'Shoes with white non-marking soles — to not scratch the deck.',
      'Sunglasses with retainer strap, SPF 50+ sunscreen.',
      'Hat — mandatory, sun hits from two sides on water.',
      'Fingerless gloves — for sheets.',
      'Water and light snacks — seasickness worsens on empty stomach, but don\'t overeat.',
      'Motion sickness tablets (Dramamine, Bonine) — take ONE HOUR before departure.',
      'Warm layer — always colder on water than ashore.',
      'Small dry bag for phone and documents.',
    ],
  },
  {
    id: 'quiet-crew',
    icon: '🤐',
    titleRu: 'Как быть полезным, а не мешать',
    titleEn: 'How to be helpful, not in the way',
    itemsRu: [
      'Молчание — золото. На старте и поворотах не болтай.',
      'Предвосхищай. Если видишь что скоро поворот — сам переходи на другой борт (ballast).',
      'Без команды не делай большие вещи. Но мелочи — кранцы, вода экипажу — можно.',
      'Если не знаешь — спроси ОДИН раз, запомни ответ. Не переспрашивай каждые 5 минут.',
      'Держи палубу чистой. Шкот на колёсах = поворот провален.',
      'Если тебя укачало — не герой. Скажи шкиперу, сядь на подветренный борт, смотри на горизонт.',
    ],
    itemsEn: [
      'Silence is golden. Don\'t chatter during start or tacks.',
      'Anticipate. See a tack coming — cross to the other side (ballast) yourself.',
      'Don\'t do big things without a command. Small things — fenders, water for crew — fine.',
      'If you don\'t know — ask ONCE, remember the answer. Don\'t re-ask every 5 minutes.',
      'Keep the deck clear. A sheet under a foot = a blown tack.',
      'If you\'re seasick — not a hero. Tell the skipper, sit on the leeward side, look at the horizon.',
    ],
  },
];
