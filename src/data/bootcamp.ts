// ============================================================================
// Bootcamp — guided learning path. 8 lessons, ~5 minutes each.
// Each lesson points to an existing section on the site + adds a short
// "focus this time" description.
// ============================================================================

export interface BootcampLesson {
  id: string;
  order: number;
  emoji: string;
  titleRu: string;
  titleEn: string;
  summaryRu: string;
  summaryEn: string;
  estMinutes: number;
  /** Route to open for this lesson */
  route: string;
  /** What to focus on when visiting that route */
  focusRu: string;
  focusEn: string;
}

export const bootcampLessons: BootcampLesson[] = [
  {
    id: 'wind-direction',
    order: 1,
    emoji: '🌬',
    titleRu: 'Ветер и направление',
    titleEn: 'Wind & direction',
    summaryRu: 'Откуда дует, куда направлен. «Неходовая зона» — почему нельзя в лоб.',
    summaryEn: 'Where the wind comes from and where it goes. The no-go zone — why you can\'t sail straight at it.',
    estMinutes: 5,
    route: '/simulator',
    focusRu: 'Покрути ветер (потяни метку по кольцу). Посмотри где красный сектор — туда яхта идти не может.',
    focusEn: 'Rotate the wind (drag the marker on the outer ring). See the red sector — the boat can\'t sail there.',
  },
  {
    id: 'points-of-sail',
    order: 2,
    emoji: '🧭',
    titleRu: 'Курсы относительно ветра',
    titleEn: 'Points of sail',
    summaryRu: 'Левентик, бейдевинд, галфвинд, бакштаг, фордевинд. Твои 5 рабочих курсов.',
    summaryEn: 'In irons, close-hauled, beam reach, broad reach, running. Your 5 working points of sail.',
    estMinutes: 8,
    route: '/courses',
    focusRu: 'Нажми на каждый сектор диаграммы. Запомни соответствие русских и английских названий.',
    focusEn: 'Click each sector of the diagram. Note the Russian/English name pairs.',
  },
  {
    id: 'how-sail-works',
    order: 3,
    emoji: '⛵',
    titleRu: 'Как работает парус',
    titleEn: 'How a sail works',
    summaryRu: 'На острых курсах парус — крыло (аэродинамическая тяга). На полных — парашют (давление).',
    summaryEn: 'On close courses the sail is a wing (lift). On downwind it\'s a parachute (pressure).',
    estMinutes: 4,
    route: '/simulator',
    focusRu: 'Крути яхту на разные курсы. Смотри как меняется угол паруса автоматически.',
    focusEn: 'Rotate the boat through different points of sail. Watch the sail angle change automatically.',
  },
  {
    id: 'tacking',
    order: 4,
    emoji: '↰',
    titleRu: 'Поворот оверштаг',
    titleEn: 'Tacking',
    summaryRu: 'Поворот через нос: нос проходит через линию ветра. Безопасный, но медленный.',
    summaryEn: 'Turn through the bow: the bow crosses the wind line. Safe but slow.',
    estMinutes: 5,
    route: '/glossary',
    focusRu: 'Найди термин «Оверштаг» и прочитай объяснение. Потом посмотри как выглядит на диаграмме курсов.',
    focusEn: 'Find "Tacking" in the glossary and read the explanation. Then visualize it on the points-of-sail diagram.',
  },
  {
    id: 'jibing',
    order: 5,
    emoji: '↱',
    titleRu: 'Поворот фордевинд',
    titleEn: 'Jibing (gybing)',
    summaryRu: 'Поворот через корму: гик резко перелетает. Быстрый, но опасный.',
    summaryEn: 'Turn through the stern: the boom swings across violently. Fast but dangerous.',
    estMinutes: 5,
    route: '/glossary',
    focusRu: 'Найди «Поворот фордевинд» в глоссарии. Пойми почему команда кричит «gybe-ho» заранее.',
    focusEn: 'Find "Jibing" in the glossary. Understand why the crew shouts "jibe-ho" in advance.',
  },
  {
    id: 'vmg-beating',
    order: 6,
    emoji: '🎯',
    titleRu: 'Лавировка и VMG',
    titleEn: 'Beating and VMG',
    summaryRu: 'Чтобы дойти против ветра — идёшь галсами под ~45°. VMG = скорость в нужную сторону, а не просто скорость по воде.',
    summaryEn: 'To go upwind you zigzag at ~45°. VMG = speed toward your goal, not speed through water.',
    estMinutes: 7,
    route: '/racing',
    focusRu: 'Посмотри раздел «Upwind strategy» и блок VMG. Это объясняет почему прямо к ветру не самая быстрая дорога.',
    focusEn: 'Check the "Upwind strategy" section and the VMG block. Explains why straight up isn\'t fastest.',
  },
  {
    id: 'simple-rules',
    order: 7,
    emoji: '📖',
    titleRu: 'Простые правила',
    titleEn: 'Simple rules',
    summaryRu: '8 базовых ситуаций: галсы, обгон, знаки, пересечение, столкновение.',
    summaryEn: '8 core situations: tacks, overtaking, marks, crossings, collisions.',
    estMinutes: 10,
    route: '/rules',
    focusRu: 'Прочитай все 8 карточек. После каждой — попытайся мысленно пересказать «кто кому уступает и почему».',
    focusEn: 'Read all 8 cards. After each, try to mentally restate "who gives way, why".',
  },
  {
    id: 'mini-race',
    order: 8,
    emoji: '🏁',
    titleRu: 'Мини-гонка',
    titleEn: 'Mini race',
    summaryRu: 'Всё вместе на практике. Попробуй на «Лёгком» уровне.',
    summaryEn: 'Everything together in practice. Try it on "Easy" level.',
    estMinutes: 10,
    route: '/game',
    focusRu: 'Выбери Лёгкий, пройди одну гонку. Прочитай разбор AI-тренера в конце.',
    focusEn: 'Pick Easy, run one race. Read the AI coach\'s analysis at the end.',
  },
];

export const BOOTCAMP_TOTAL_MINUTES = bootcampLessons.reduce((sum, l) => sum + l.estMinutes, 0);
