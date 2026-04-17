// ===== POINTS OF SAIL =====
export interface PointOfSail {
  id: string;
  nameRu: string;
  nameEn: string;
  angleMin: number;
  angleMax: number;
  sailAngle: number; // degrees from centerline
  speedFactor: number; // 0-1, relative speed
  description: string;
  descriptionEn: string;
  color: string;
  sailWork: string;
  sailWorkEn: string;
}

export const pointsOfSail: PointOfSail[] = [
  {
    id: 'in-irons',
    nameRu: 'Левентик',
    nameEn: 'In Irons / Head to Wind',
    angleMin: 0,
    angleMax: 30,
    sailAngle: 0,
    speedFactor: 0,
    description: 'Яхта стоит носом прямо против ветра. Паруса полощутся (заполаскивают), тяга отсутствует. Это "мёртвая зона" - яхта не может двигаться в этом направлении.',
    descriptionEn: 'Boat is pointed directly into the wind. Sails luff (flap) with no drive. This is the "no-go zone" - the boat cannot sail in this direction.',
    color: '#ff4444',
    sailWork: 'Паруса не работают - заполаскивают',
    sailWorkEn: 'Sails not working - luffing',
  },
  {
    id: 'close-hauled',
    nameRu: 'Бейдевинд',
    nameEn: 'Close-hauled',
    angleMin: 30,
    angleMax: 60,
    sailAngle: 12,
    speedFactor: 0.65,
    description: 'Курс под острым углом к ветру (30-60°). Паруса максимально выбраны (подтянуты к ДП). Парус работает как крыло самолёта, создавая аэродинамическую тягу. Самый "тесный" рабочий курс.',
    descriptionEn: 'Sailing at a sharp angle to the wind (30-60°). Sails trimmed tight to centerline. The sail works like an airplane wing, generating aerodynamic lift. The closest working angle to the wind.',
    color: '#ff8844',
    sailWork: 'Парус как крыло - аэродинамическая тяга',
    sailWorkEn: 'Sail as wing - aerodynamic lift',
  },
  {
    id: 'beam-reach',
    nameRu: 'Галфвинд',
    nameEn: 'Beam Reach',
    angleMin: 60,
    angleMax: 110,
    sailAngle: 45,
    speedFactor: 1.0,
    description: 'Ветер дует перпендикулярно борту (~90°). Самый быстрый и комфортный курс. Паруса выставлены на ~45° от ДП. Сочетание аэродинамической тяги и давления ветра.',
    descriptionEn: 'Wind blows perpendicular to the beam (~90°). The fastest and most comfortable point of sail. Sails set at ~45° from centerline. Combination of lift and push.',
    color: '#44ff88',
    sailWork: 'Баланс тяги и давления - максимальная скорость',
    sailWorkEn: 'Balance of lift and push - maximum speed',
  },
  {
    id: 'broad-reach',
    nameRu: 'Бакштаг',
    nameEn: 'Broad Reach',
    angleMin: 110,
    angleMax: 160,
    sailAngle: 70,
    speedFactor: 0.85,
    description: 'Ветер дует сзади-сбоку (110-160°). Паруса сильно потравлены. Быстрый курс, но требует внимания к возможному непроизвольному повороту фордевинд.',
    descriptionEn: 'Wind from behind and to the side (110-160°). Sails eased out significantly. Fast course, but requires attention to accidental jibes.',
    color: '#44aaff',
    sailWork: 'Парус как препятствие - давление ветра',
    sailWorkEn: 'Sail as obstacle - wind pressure',
  },
  {
    id: 'running',
    nameRu: 'Фордевинд',
    nameEn: 'Running / Dead Run',
    angleMin: 160,
    angleMax: 180,
    sailAngle: 85,
    speedFactor: 0.6,
    description: 'Ветер дует прямо в корму (170-180°). Паруса полностью потравлены перпендикулярно ДП. Парус работает только как парашют. Кажется простым, но опасен непроизвольным поворотом фордевинд.',
    descriptionEn: 'Wind directly from behind (170-180°). Sails fully eased perpendicular to hull. Sail works only as a parachute. Seems easy but dangerous due to accidental jibes.',
    color: '#8844ff',
    sailWork: 'Парус как парашют - только давление',
    sailWorkEn: 'Sail as parachute - pressure only',
  },
];

// ===== TACK TYPES =====
export interface Tack {
  nameRu: string;
  nameEn: string;
  description: string;
  descriptionEn: string;
}

export const tacks: Record<string, Tack> = {
  port: {
    nameRu: 'Левый галс',
    nameEn: 'Port Tack',
    description: 'Ветер дует в левый борт. Паруса на правом борту.',
    descriptionEn: 'Wind from port (left) side. Sails on starboard (right) side.',
  },
  starboard: {
    nameRu: 'Правый галс',
    nameEn: 'Starboard Tack',
    description: 'Ветер дует в правый борт. Паруса на левом борту.',
    descriptionEn: 'Wind from starboard (right) side. Sails on port (left) side.',
  },
};

// ===== MANEUVERS =====
export interface Maneuver {
  id: string;
  nameRu: string;
  nameEn: string;
  description: string;
  descriptionEn: string;
  category: 'basic' | 'racing';
}

export const maneuvers: Maneuver[] = [
  {
    id: 'tacking',
    nameRu: 'Оверштаг (поворот оверштаг)',
    nameEn: 'Tacking',
    description: 'Поворот, при котором нос яхты пересекает линию ветра. Яхта переходит с одного галса на другой через левентик. Безопасный, но медленный поворот.',
    descriptionEn: 'Turn where the bow crosses the wind line. Boat changes tack through head-to-wind. Safe but slow turn.',
    category: 'basic',
  },
  {
    id: 'jibing',
    nameRu: 'Поворот фордевинд',
    nameEn: 'Jibing / Gybing',
    description: 'Поворот, при котором корма яхты пересекает линию ветра. Гик резко перебрасывается на другой борт. Быстрый, но потенциально опасный поворот - гик может травмировать экипаж.',
    descriptionEn: 'Turn where the stern crosses the wind line. The boom swings violently to the other side. Fast but potentially dangerous - the boom can injure the crew.',
    category: 'basic',
  },
  {
    id: 'luffing',
    nameRu: 'Приведение к ветру',
    nameEn: 'Luffing Up / Heading Up',
    description: 'Изменение курса ближе к ветру (уменьшение угла к ветру). Паруса нужно добирать (подтягивать).',
    descriptionEn: 'Turning the bow closer to the wind (decreasing angle to wind). Sails need to be trimmed in (tightened).',
    category: 'basic',
  },
  {
    id: 'bearing-away',
    nameRu: 'Уваливание',
    nameEn: 'Bearing Away / Heading Down',
    description: 'Изменение курса дальше от ветра (увеличение угла к ветру). Паруса нужно потравливать (отпускать).',
    descriptionEn: 'Turning the bow away from the wind (increasing angle to wind). Sails need to be eased out (loosened).',
    category: 'basic',
  },
  {
    id: 'beating',
    nameRu: 'Лавировка (хождение галсами)',
    nameEn: 'Beating / Tacking Upwind',
    description: 'Серия зигзагообразных манёвров (галсов) для движения к точке, находящейся против ветра. Яхта идёт курсом бейдевинд, меняя галсы поворотами оверштаг.',
    descriptionEn: 'A series of zigzag maneuvers (tacks) to reach a point upwind. Boat sails close-hauled, changing tacks via tacking turns.',
    category: 'racing',
  },
  {
    id: 'mark-rounding',
    nameRu: 'Огибание знака',
    nameEn: 'Mark Rounding',
    description: 'Прохождение яхтой вокруг буя (знака) на гоночной дистанции. Требует точного расчёта траектории и настройки парусов.',
    descriptionEn: 'Sailing around a buoy (mark) on the racecourse. Requires precise trajectory calculation and sail trim adjustment.',
    category: 'racing',
  },
];

// ===== GLOSSARY TERMS =====
export interface GlossaryTerm {
  id: string;
  termRu: string;
  termEn: string;
  definition: string;
  definitionEn: string;
  category: 'boat' | 'sail' | 'course' | 'maneuver' | 'racing' | 'wind' | 'crew';
}

export const glossaryTerms: GlossaryTerm[] = [
  // Части яхты / Boat Parts
  { id: 'bow', termRu: 'Нос', termEn: 'Bow', definition: 'Передняя часть яхты', definitionEn: 'Front of the boat', category: 'boat' },
  { id: 'stern', termRu: 'Корма', termEn: 'Stern', definition: 'Задняя часть яхты', definitionEn: 'Back of the boat', category: 'boat' },
  { id: 'port', termRu: 'Левый борт', termEn: 'Port', definition: 'Левая сторона яхты (если смотреть на нос)', definitionEn: 'Left side of the boat (facing forward)', category: 'boat' },
  { id: 'starboard', termRu: 'Правый борт', termEn: 'Starboard', definition: 'Правая сторона яхты (если смотреть на нос)', definitionEn: 'Right side of the boat (facing forward)', category: 'boat' },
  { id: 'hull', termRu: 'Корпус', termEn: 'Hull', definition: 'Основная часть яхты - тело лодки', definitionEn: 'Main body of the boat', category: 'boat' },
  { id: 'keel', termRu: 'Киль', termEn: 'Keel', definition: 'Подводный плавник под корпусом для остойчивости и противодействия дрейфу', definitionEn: 'Underwater fin for stability and lateral resistance', category: 'boat' },
  { id: 'rudder', termRu: 'Руль (перо руля)', termEn: 'Rudder', definition: 'Подводный элемент для управления направлением', definitionEn: 'Underwater blade for steering', category: 'boat' },
  { id: 'tiller', termRu: 'Румпель', termEn: 'Tiller', definition: 'Рукоятка, соединённая с рулём, для управления яхтой', definitionEn: 'Handle connected to the rudder for steering', category: 'boat' },
  { id: 'cockpit', termRu: 'Кокпит', termEn: 'Cockpit', definition: 'Открытая рабочая область в корме, где находится экипаж', definitionEn: 'Open working area in the stern where crew sits', category: 'boat' },
  { id: 'deck', termRu: 'Палуба', termEn: 'Deck', definition: 'Верхняя горизонтальная поверхность яхты', definitionEn: 'Upper horizontal surface of the boat', category: 'boat' },
  { id: 'centerline', termRu: 'Диаметральная плоскость (ДП)', termEn: 'Centerline', definition: 'Воображаемая линия от носа до кормы, делящая яхту пополам', definitionEn: 'Imaginary line from bow to stern dividing the boat in half', category: 'boat' },

  // Паруса / Sails
  { id: 'mainsail', termRu: 'Грот (грот-парус)', termEn: 'Mainsail', definition: 'Главный парус, крепится к мачте и гику', definitionEn: 'Main sail attached to the mast and boom', category: 'sail' },
  { id: 'jib', termRu: 'Стаксель (передний парус)', termEn: 'Jib / Headsail', definition: 'Передний парус перед мачтой', definitionEn: 'Front sail ahead of the mast', category: 'sail' },
  { id: 'spinnaker', termRu: 'Спинакер', termEn: 'Spinnaker', definition: 'Большой лёгкий парус-баллон для полных курсов', definitionEn: 'Large lightweight balloon sail for downwind sailing', category: 'sail' },
  { id: 'boom', termRu: 'Гик', termEn: 'Boom', definition: 'Горизонтальная балка у основания грота, крепится к мачте', definitionEn: 'Horizontal pole at the base of the mainsail, attached to mast', category: 'sail' },
  { id: 'mast', termRu: 'Мачта', termEn: 'Mast', definition: 'Вертикальная опора для парусов', definitionEn: 'Vertical pole supporting the sails', category: 'sail' },
  { id: 'sheet', termRu: 'Шкот', termEn: 'Sheet', definition: 'Верёвка (снасть) для управления углом паруса', definitionEn: 'Rope (line) for controlling sail angle', category: 'sail' },
  { id: 'halyard', termRu: 'Фал', termEn: 'Halyard', definition: 'Верёвка для подъёма паруса', definitionEn: 'Rope for hoisting (raising) a sail', category: 'sail' },
  { id: 'trim', termRu: 'Настройка парусов', termEn: 'Sail Trim', definition: 'Регулировка угла и формы паруса для оптимальной тяги', definitionEn: 'Adjusting sail angle and shape for optimal performance', category: 'sail' },
  { id: 'luff-sail', termRu: 'Передняя шкаторина', termEn: 'Luff (sail edge)', definition: 'Передний край паруса (ближе к ветру)', definitionEn: 'Leading edge of the sail (closest to wind)', category: 'sail' },
  { id: 'leech', termRu: 'Задняя шкаторина', termEn: 'Leech', definition: 'Задний край паруса', definitionEn: 'Trailing edge of the sail', category: 'sail' },

  // Курсы / Points of Sail
  { id: 'course-in-irons', termRu: 'Левентик', termEn: 'In Irons / Head to Wind', definition: 'Нос прямо против ветра, яхта не движется', definitionEn: 'Bow pointed directly into wind, boat stalled', category: 'course' },
  { id: 'course-close-hauled', termRu: 'Бейдевинд', termEn: 'Close-hauled', definition: 'Курс под острым углом к ветру (30-60°)', definitionEn: 'Sailing at a sharp angle to wind (30-60°)', category: 'course' },
  { id: 'course-beam-reach', termRu: 'Галфвинд', termEn: 'Beam Reach', definition: 'Ветер перпендикулярно борту (~90°)', definitionEn: 'Wind perpendicular to beam (~90°)', category: 'course' },
  { id: 'course-broad-reach', termRu: 'Бакштаг', termEn: 'Broad Reach', definition: 'Ветер сзади-сбоку (110-160°)', definitionEn: 'Wind from behind and to the side (110-160°)', category: 'course' },
  { id: 'course-running', termRu: 'Фордевинд', termEn: 'Running / Dead Run', definition: 'Ветер прямо в корму (170-180°)', definitionEn: 'Wind directly from behind (170-180°)', category: 'course' },
  { id: 'no-go-zone', termRu: 'Неходовая зона (мёртвая зона)', termEn: 'No-Go Zone', definition: 'Сектор ±30-45° к ветру, где яхта не может идти', definitionEn: 'Sector ±30-45° from wind where boat cannot sail', category: 'course' },

  // Маневры / Maneuvers
  { id: 'man-tacking', termRu: 'Оверштаг', termEn: 'Tacking', definition: 'Поворот через нос (через линию ветра)', definitionEn: 'Turn through the bow (across the wind line)', category: 'maneuver' },
  { id: 'man-jibing', termRu: 'Поворот фордевинд', termEn: 'Jibing / Gybing', definition: 'Поворот через корму (через линию ветра)', definitionEn: 'Turn through the stern (across the wind line)', category: 'maneuver' },
  { id: 'man-luffing', termRu: 'Приведение (к ветру)', termEn: 'Luffing Up', definition: 'Поворот ближе к ветру', definitionEn: 'Turning closer to the wind', category: 'maneuver' },
  { id: 'man-bearing-away', termRu: 'Уваливание', termEn: 'Bearing Away', definition: 'Поворот дальше от ветра', definitionEn: 'Turning away from the wind', category: 'maneuver' },
  { id: 'man-heaving-to', termRu: 'Дрейф (лечь в дрейф)', termEn: 'Heaving To', definition: 'Остановка яхты стаксель выбран на ветер, руль на ветер', definitionEn: 'Stopping the boat: jib backed, tiller to windward', category: 'maneuver' },

  // Ветер / Wind
  { id: 'true-wind', termRu: 'Истинный ветер', termEn: 'True Wind', definition: 'Ветер, который дует независимо от движения яхты', definitionEn: 'Wind that blows regardless of boat movement', category: 'wind' },
  { id: 'apparent-wind', termRu: 'Вымпельный (кажущийся) ветер', termEn: 'Apparent Wind', definition: 'Ветер, который ощущает экипаж - сумма истинного ветра и ветра от движения яхты', definitionEn: 'Wind felt by crew - sum of true wind and wind from boat movement', category: 'wind' },
  { id: 'windward', termRu: 'Наветренная сторона', termEn: 'Windward', definition: 'Сторона, откуда дует ветер', definitionEn: 'Side from which the wind blows', category: 'wind' },
  { id: 'leeward', termRu: 'Подветренная сторона', termEn: 'Leeward (Lee)', definition: 'Сторона, противоположная ветру (защищённая от ветра)', definitionEn: 'Side sheltered from the wind', category: 'wind' },
  { id: 'gust', termRu: 'Порыв', termEn: 'Gust', definition: 'Кратковременное усиление ветра', definitionEn: 'Short burst of increased wind speed', category: 'wind' },
  { id: 'lull', termRu: 'Затишье', termEn: 'Lull', definition: 'Кратковременное ослабление ветра', definitionEn: 'Short period of decreased wind speed', category: 'wind' },
  { id: 'wind-shift', termRu: 'Заход/отход ветра', termEn: 'Wind Shift', definition: 'Изменение направления ветра', definitionEn: 'Change in wind direction', category: 'wind' },

  // Гонки / Racing
  { id: 'race-start-line', termRu: 'Стартовая линия', termEn: 'Start Line', definition: 'Линия между двумя буями, от которой начинается гонка', definitionEn: 'Line between two marks where race begins', category: 'racing' },
  { id: 'race-mark', termRu: 'Знак дистанции (буй)', termEn: 'Course Mark / Buoy', definition: 'Буй на воде, вокруг которого нужно пройти', definitionEn: 'Buoy on water to sail around', category: 'racing' },
  { id: 'race-windward-mark', termRu: 'Верхний знак (наветренный)', termEn: 'Windward Mark', definition: 'Знак, расположенный против ветра', definitionEn: 'Mark located upwind', category: 'racing' },
  { id: 'race-leeward-mark', termRu: 'Нижний знак (подветренный)', termEn: 'Leeward Mark', definition: 'Знак, расположенный по ветру', definitionEn: 'Mark located downwind', category: 'racing' },
  { id: 'race-layline', termRu: 'Лейлайн', termEn: 'Layline', definition: 'Курс, при котором яхта может достичь знака без дополнительных поворотов', definitionEn: 'Course allowing boat to reach mark without additional tacks', category: 'racing' },
  { id: 'race-protest', termRu: 'Протест', termEn: 'Protest', definition: 'Официальная жалоба на нарушение правил другой яхтой', definitionEn: 'Formal complaint about rule violation by another boat', category: 'racing' },
  { id: 'race-right-of-way', termRu: 'Право дороги', termEn: 'Right of Way', definition: 'Приоритет прохода одной яхты над другой при сближении', definitionEn: 'Priority of one boat over another when converging', category: 'racing' },
  { id: 'race-overlap', termRu: 'Связка (overlap)', termEn: 'Overlap', definition: 'Когда корпуса двух яхт частично перекрываются по курсу', definitionEn: 'When hulls of two boats partially overlap along the course', category: 'racing' },

  // Экипаж / Crew
  { id: 'skipper', termRu: 'Шкипер (рулевой)', termEn: 'Skipper / Helmsman', definition: 'Капитан или рулевой, управляющий яхтой', definitionEn: 'Captain or helmsman controlling the boat', category: 'crew' },
  { id: 'crew', termRu: 'Экипаж (матросы)', termEn: 'Crew', definition: 'Команда яхты, работающая с парусами и оснасткой', definitionEn: 'Team working with sails and rigging', category: 'crew' },
  { id: 'hiking', termRu: 'Откренивание', termEn: 'Hiking / Hiking Out', definition: 'Вывешивание тела за борт для противодействия крену', definitionEn: 'Leaning body overboard to counteract heeling', category: 'crew' },
  { id: 'heeling', termRu: 'Крен', termEn: 'Heeling', definition: 'Наклон яхты под действием ветра', definitionEn: 'Tilting of the boat caused by wind pressure', category: 'crew' },
];

export const glossaryCategories: Record<string, { nameRu: string; nameEn: string }> = {
  boat: { nameRu: 'Части яхты', nameEn: 'Boat Parts' },
  sail: { nameRu: 'Паруса и оснастка', nameEn: 'Sails & Rigging' },
  course: { nameRu: 'Курсы', nameEn: 'Points of Sail' },
  maneuver: { nameRu: 'Манёвры', nameEn: 'Maneuvers' },
  wind: { nameRu: 'Ветер', nameEn: 'Wind' },
  racing: { nameRu: 'Гонки', nameEn: 'Racing' },
  crew: { nameRu: 'Экипаж', nameEn: 'Crew' },
};

// ===== RACING RULES =====
export interface RacingRule {
  id: string;
  titleRu: string;
  titleEn: string;
  descriptionRu: string;
  descriptionEn: string;
  priority: number;
}

export const racingRules: RacingRule[] = [
  {
    id: 'starboard-over-port',
    titleRu: 'Правый галс имеет преимущество',
    titleEn: 'Starboard over Port',
    descriptionRu: 'Яхта на правом галсе имеет право дороги. Яхта на левом галсе должна уступить.',
    descriptionEn: 'Starboard tack boat has right of way. Port tack boat must give way.',
    priority: 1,
  },
  {
    id: 'leeward-over-windward',
    titleRu: 'Подветренная над наветренной',
    titleEn: 'Leeward over Windward',
    descriptionRu: 'На одном галсе подветренная яхта имеет преимущество. Наветренная должна уступить.',
    descriptionEn: 'On the same tack, leeward boat has right of way. Windward boat must keep clear.',
    priority: 2,
  },
  {
    id: 'overtaking',
    titleRu: 'Обгоняющая уступает',
    titleEn: 'Overtaking Boat Keeps Clear',
    descriptionRu: 'Яхта, обгоняющая другую, должна держаться в стороне от обгоняемой яхты.',
    descriptionEn: 'A boat overtaking another must keep clear of the boat being overtaken.',
    priority: 3,
  },
  {
    id: 'mark-room',
    titleRu: 'Место у знака',
    titleEn: 'Mark Room',
    descriptionRu: 'Яхта с внутренней стороны имеет право на место для огибания знака, если связка установлена в зоне 3 корпусов.',
    descriptionEn: 'Inside boat is entitled to room to round mark if overlap established within 3 boat-lengths zone.',
    priority: 4,
  },
];

// ===== RACING STRATEGIES =====
export interface RacingStrategy {
  id: string;
  titleRu: string;
  titleEn: string;
  descriptionRu: string;
  descriptionEn: string;
  tips: { ru: string; en: string }[];
}

export const racingStrategies: RacingStrategy[] = [
  {
    id: 'upwind',
    titleRu: 'Лавировка (движение против ветра)',
    titleEn: 'Upwind Strategy (Beating)',
    descriptionRu: 'Для достижения точки, расположенной против ветра, нужно идти зигзагом - галсами - под углом ~45° к ветру.',
    descriptionEn: 'To reach a point upwind, sail in a zigzag pattern - tacking - at ~45° angle to the wind.',
    tips: [
      { ru: 'Старайся держать оптимальный угол бейдевинда (~40-45°)', en: 'Maintain optimal close-hauled angle (~40-45°)' },
      { ru: 'Делай повороты оверштаг при заходе ветра (wind shift) в твою пользу', en: 'Tack on favorable wind shifts' },
      { ru: 'Минимизируй количество поворотов - каждый поворот теряет скорость', en: 'Minimize tacks - each tack loses speed' },
      { ru: 'Держи "свободную воду" - не иди в тень другой яхты', en: 'Keep clear air - don\'t sail in another boat\'s wind shadow' },
    ],
  },
  {
    id: 'downwind',
    titleRu: 'Полные курсы (движение по ветру)',
    titleEn: 'Downwind Strategy',
    descriptionRu: 'На полных курсах (бакштаг, фордевинд) яхта набирает скорость за счёт давления ветра на паруса.',
    descriptionEn: 'On downwind courses (broad reach, running), the boat gains speed from wind pressure on sails.',
    tips: [
      { ru: 'Часто выгоднее идти бакштагом (VMG) чем чистым фордевинд', en: 'Often better to sail broad reach (VMG) than dead run' },
      { ru: 'Используй спинакер на полных курсах', en: 'Use spinnaker on downwind legs' },
      { ru: 'Следи за непроизвольным поворотом фордевинд', en: 'Watch for accidental jibes' },
      { ru: 'Сёрфинг на волнах может значительно увеличить скорость', en: 'Wave surfing can significantly increase speed' },
    ],
  },
  {
    id: 'start',
    titleRu: 'Стартовая стратегия',
    titleEn: 'Start Strategy',
    descriptionRu: 'Хороший старт - залог успеха в гонке. Нужно пересечь стартовую линию в момент сигнала на максимальной скорости.',
    descriptionEn: 'A good start is key to race success. Cross the start line at signal with maximum speed.',
    tips: [
      { ru: 'Определи "выгодный конец" стартовой линии (тот, что ближе к ветру)', en: 'Identify the favored end of the line (closest to wind)' },
      { ru: 'Рассчитай время подхода к линии, чтобы набрать скорость', en: 'Time your approach to build speed before crossing' },
      { ru: 'Имей запасной план на случай столкновения или фальстарта', en: 'Have a backup plan for collisions or premature start' },
      { ru: 'Защищай свою "свободную воду" после старта', en: 'Protect your clear air after start' },
    ],
  },
  {
    id: 'mark-rounding',
    titleRu: 'Огибание знаков',
    titleEn: 'Mark Rounding',
    descriptionRu: 'Эффективное огибание знаков дистанции может выиграть или проиграть позиции в гонке.',
    descriptionEn: 'Efficient mark rounding can gain or lose positions in a race.',
    tips: [
      { ru: 'Подходи широко, выходи узко - для оптимальной траектории', en: 'Approach wide, exit tight - for optimal trajectory' },
      { ru: 'Перестрой паруса заранее, до знака', en: 'Adjust sails before reaching the mark' },
      { ru: 'При сближении с другими яхтами - устанавливай связку заранее', en: 'When approaching with other boats - establish overlap early' },
      { ru: 'Помни о правиле "места у знака" (3 корпуса)', en: 'Remember the mark room rule (3 boat-lengths)' },
    ],
  },
];
