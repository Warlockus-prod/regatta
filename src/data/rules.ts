// ============================================================================
// Simple rules — 8 core racing / right-of-way situations.
// Format: scene → question → answer → why → what to do in real life.
// ============================================================================

export interface RuleScenario {
  id: string;
  icon: string;
  titleRu: string;
  titleEn: string;
  sceneRu: string;
  sceneEn: string;
  questionRu: string;
  questionEn: string;
  answerRu: string;
  answerEn: string;
  whyRu: string;
  whyEn: string;
  inPracticeRu: string;
  inPracticeEn: string;
  /** SVG for the visual illustration. Purely stylized, not to scale. */
  svg: 'port-vs-starboard' | 'windward-leeward' | 'overtaking' | 'mark-room' | 'crossing' | 'start-line' | 'collision-avoid' | 'penalty';
}

export const ruleScenarios: RuleScenario[] = [
  {
    id: 'port-vs-starboard',
    icon: '↔️',
    titleRu: 'Левый и правый галс',
    titleEn: 'Port vs Starboard Tack',
    sceneRu: 'Две яхты идут навстречу. Ветер дует им в разные борта — значит, они на разных галсах.',
    sceneEn: 'Two boats on converging courses with wind on opposite sides — they are on different tacks.',
    questionRu: 'Кто должен уступить?',
    questionEn: 'Who gives way?',
    answerRu: 'Яхта на левом галсе (ветер в левый борт) уступает яхте на правом галсе.',
    answerEn: 'The port-tack boat (wind on port side) gives way to the starboard-tack boat.',
    whyRu: 'Это правило №10 в гоночных правилах. Базовое и самое частое на воде.',
    whyEn: 'This is Rule 10 in the Racing Rules of Sailing. Most fundamental and most frequent.',
    inPracticeRu: 'Смотри на свой грот. Если шкот натянут с правого борта — ты на левом галсе, ты уступаешь. Кричи "port tack!" чтобы подтвердить.',
    inPracticeEn: 'Look at your mainsheet. If it comes from starboard side — you are on port tack, you give way. Call out "port tack!" to acknowledge.',
    svg: 'port-vs-starboard',
  },
  {
    id: 'windward-leeward',
    icon: '🔽',
    titleRu: 'Наветренный и подветренный на одном галсе',
    titleEn: 'Windward vs Leeward, Same Tack',
    sceneRu: 'Обе яхты идут в одну сторону на одном галсе. Одна выше по ветру (наветренная), другая ниже (подветренная).',
    sceneEn: 'Both boats on the same tack sailing roughly the same direction. One is upwind (windward), the other downwind (leeward).',
    questionRu: 'Кто имеет преимущество?',
    questionEn: 'Who has right of way?',
    answerRu: 'Подветренная имеет преимущество. Наветренная должна держаться в стороне.',
    answerEn: 'The leeward boat has right of way. The windward boat must keep clear.',
    whyRu: 'Подветренной сложнее увалиться в сторону — она ограничена ветром. У наветренной больше манёвра.',
    whyEn: 'The leeward boat is constrained by the wind and can\'t bear away easily. The windward boat has more options.',
    inPracticeRu: 'Если ты выше по ветру — просто увалься, не пытайся "пролезть". Подветренная может тебя поднимать к ветру (luff up) до курса на ветер.',
    inPracticeEn: 'If you\'re to windward, just bear away — don\'t try to squeeze through. The leeward boat can luff you up to head-to-wind.',
    svg: 'windward-leeward',
  },
  {
    id: 'overtaking',
    icon: '➡️',
    titleRu: 'Обгоняешь сзади',
    titleEn: 'Overtaking from Behind',
    sceneRu: 'Ты догоняешь другую яхту с кормы. Когда корпуса перекроются — будет связка (overlap).',
    sceneEn: 'You are catching up to another boat from behind. When hulls overlap — that\'s an overlap.',
    questionRu: 'Можно ли "захлопнуть" её?',
    questionEn: 'Can you just push past?',
    answerRu: 'Нет. При входе в overlap нужно дать другой лодке место, чтобы среагировать.',
    answerEn: 'No. When establishing overlap you must give the other boat room to keep clear.',
    whyRu: 'Правило 15: яхта, которая только приобрела преимущество, должна изначально дать другой возможность уступить.',
    whyEn: 'Rule 15: a boat that just acquired right of way must initially give the other a chance to keep clear.',
    inPracticeRu: 'Подходи плавно. Если обгоняешь с подветренной стороны — можешь потом поднимать её, но не сразу.',
    inPracticeEn: 'Approach smoothly. If overtaking to leeward, you can luff them up later — but not instantly.',
    svg: 'overtaking',
  },
  {
    id: 'mark-room',
    icon: '🟠',
    titleRu: 'Место у знака',
    titleEn: 'Mark Room',
    sceneRu: 'Две яхты подходят к бую (знаку). Одна с внутренней стороны, одна с внешней.',
    sceneEn: 'Two boats approaching a mark. One on the inside, one on the outside.',
    questionRu: 'У кого mark-room (место для огибания)?',
    questionEn: 'Who gets mark room?',
    answerRu: 'У внутренней яхты, ЕСЛИ overlap был установлен когда обе вошли в зону (3 корпуса до знака).',
    answerEn: 'The inside boat — IF overlap was established when both entered the zone (3 boat-lengths from mark).',
    whyRu: 'Без этого правила внешняя яхта могла бы прижать внутреннюю к знаку. Это пункт 18 правил.',
    whyEn: 'Without this, the outside boat could pin the inside one against the mark. This is Rule 18.',
    inPracticeRu: 'Если ты внутренняя — кричи "overlap!" заранее. Если внешняя — не подходи слишком близко к знаку, оставь место.',
    inPracticeEn: 'If you\'re inside — call "overlap!" early. If outside — don\'t hug the mark, leave room.',
    svg: 'mark-room',
  },
  {
    id: 'crossing',
    icon: '✖️',
    titleRu: 'Пересечение курсов',
    titleEn: 'Crossing Courses',
    sceneRu: 'Видишь яхту справа. Непонятно, пересечёмся или разойдёмся.',
    sceneEn: 'You see a boat on your right. Unclear if you\'ll cross or pass.',
    questionRu: 'Что делать?',
    questionEn: 'What do you do?',
    answerRu: 'Для новичка: не играй в героя. Даже если формально прав — оставляй место, избегай контакта.',
    answerEn: 'For beginners: don\'t be a hero. Even if you technically have right of way, leave room, avoid contact.',
    whyRu: 'Контакт на воде = пробитый корпус, травмы, дисквалификация. Правило "avoid contact" сильнее чем "я был прав".',
    whyEn: 'Contact on water = damage, injuries, disqualification. "Avoid contact" trumps "I was right".',
    inPracticeRu: 'Подними голову, оцени дистанцию. Если не уверен, что разойдёшься чисто — уступи даже с правого галса. Соревнование — не автодорога.',
    inPracticeEn: 'Look up, gauge distance. If unsure about a clean pass — give way even on starboard. Racing isn\'t a highway.',
    svg: 'crossing',
  },
  {
    id: 'start-line',
    icon: '🏁',
    titleRu: 'Стартовая линия',
    titleEn: 'Start Line',
    sceneRu: 'До сигнала секунды. Плотная группа яхт, каждый хочет стартануть первым на чистом ветру.',
    sceneEn: 'Seconds to the signal. Tight pack of boats, everyone wants a clean start with clear air.',
    questionRu: 'Что самое важное?',
    questionEn: 'What matters most?',
    answerRu: 'Не стартовать рано (раньше сигнала). Не стоять на месте. Чистый ветер. Место для манёвра.',
    answerEn: 'Don\'t start early (before signal). Don\'t stall. Clean air. Room to maneuver.',
    whyRu: 'Если пересёк линию раньше сигнала — будешь возвращаться против толпы. Обидно и медленно.',
    whyEn: 'Crossing early = return trip against the fleet. Painful and slow.',
    inPracticeRu: 'Ориентируйся на время до сигнала (обратный отсчёт у тренера или на часах). За 30 сек — разгоняйся. За 10 сек — полный ход к линии.',
    inPracticeEn: 'Watch the countdown (from coach boat or your watch). 30 sec out — build speed. 10 sec — full speed to line.',
    svg: 'start-line',
  },
  {
    id: 'collision-avoid',
    icon: '⚠️',
    titleRu: 'Всё идёт к столкновению',
    titleEn: 'Heading for Collision',
    sceneRu: 'Формально ты прав по правилам, но дистанция быстро закрывается.',
    sceneEn: 'You technically have right of way by the rules, but the gap is closing fast.',
    questionRu: 'Стоять на своём?',
    questionEn: 'Stand your ground?',
    answerRu: 'Нет. Безопасность важнее любого правила. Увалиться, затормозить, уступить — потом разобраться.',
    answerEn: 'No. Safety beats any rule. Bear away, slow down, yield — argue later.',
    whyRu: 'Правило 14 гласит: если можно разумно избежать контакта — избегай его, даже имея право дороги.',
    whyEn: 'Rule 14: if contact can reasonably be avoided, avoid it — even when you have right of way.',
    inPracticeRu: 'Признак: за 3-5 сек до возможного контакта кричи "помоги!" (в реальной гонке — "protest!" будет потом). Лучше уступить чем ремонтировать.',
    inPracticeEn: 'Signal: 3-5 sec before possible contact, shout for help. Better to yield than repair. File protest later.',
    svg: 'collision-avoid',
  },
  {
    id: 'penalty',
    icon: '🔄',
    titleRu: 'Сделал ошибку — что дальше?',
    titleEn: 'Made a Mistake — Now What?',
    sceneRu: 'Понял, что нарушил правило (задел знак, или не уступил).',
    sceneEn: 'You realized you broke a rule (touched a mark, or failed to give way).',
    questionRu: 'Что делать?',
    questionEn: 'What do you do?',
    answerRu: 'Признать ошибку, уйти из помехи, сделать штрафной разворот: 1 поворот оверштаг + 1 поворот фордевинд на 360°.',
    answerEn: 'Acknowledge, clear from the other boat, do the penalty turn: one tack + one jibe = 360°.',
    whyRu: 'Это "two-turns penalty" (правило 44.2). Делается на свободной воде, чтобы не мешать другим.',
    whyEn: 'This is the "two-turns penalty" (Rule 44.2). Done on clear water, not disrupting others.',
    inPracticeRu: 'Проверь что ты не рядом со знаком или другой яхтой. Подними на ветер, поверни оверштаг. На бакштаг — поверни фордевинд. Продолжай гонку.',
    inPracticeEn: 'Check you\'re not near a mark or another boat. Head up, tack. Then bear away, jibe. Resume racing.',
    svg: 'penalty',
  },
];
