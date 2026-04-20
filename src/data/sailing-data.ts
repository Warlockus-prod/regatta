// ===== POINTS OF SAIL =====
export interface PointOfSail {
  id: string;
  nameRu: string;
  nameEn: string;
  namePl: string;
  angleMin: number;
  angleMax: number;
  sailAngle: number; // degrees from centerline
  speedFactor: number; // 0-1, relative speed
  description: string;
  descriptionEn: string;
  descriptionPl: string;
  color: string;
  sailWork: string;
  sailWorkEn: string;
  sailWorkPl: string;
}

export const pointsOfSail: PointOfSail[] = [
  {
    id: 'in-irons',
    nameRu: 'Левентик',
    nameEn: 'In Irons / Head to Wind',
    namePl: 'Lewentik',
    angleMin: 0,
    angleMax: 30,
    sailAngle: 0,
    speedFactor: 0,
    description: 'Яхта стоит носом прямо против ветра. Паруса полощутся (заполаскивают), тяга отсутствует. Это "мёртвая зона" - яхта не может двигаться в этом направлении.',
    descriptionEn: 'Boat is pointed directly into the wind. Sails luff (flap) with no drive. This is the "no-go zone" - the boat cannot sail in this direction.',
    descriptionPl: 'Jacht stoi dziobem prosto pod wiatr. Zagle lopocza (lewa), brak sily ciagu. To strefa martwa - jacht nie moze plynac w tym kierunku.',
    color: '#ff4444',
    sailWork: 'Паруса не работают - заполаскивают',
    sailWorkEn: 'Sails not working - luffing',
    sailWorkPl: 'Zagle nie pracuja - lopocza',
  },
  {
    id: 'close-hauled',
    nameRu: 'Бейдевинд',
    nameEn: 'Close-hauled',
    namePl: 'Bajdewind',
    angleMin: 30,
    angleMax: 60,
    sailAngle: 12,
    speedFactor: 0.65,
    description: 'Курс под острым углом к ветру (30-60°). Паруса максимально выбраны (подтянуты к ДП). Парус работает как крыло самолёта, создавая аэродинамическую тягу. Самый "тесный" рабочий курс.',
    descriptionEn: 'Sailing at a sharp angle to the wind (30-60°). Sails trimmed tight to centerline. The sail works like an airplane wing, generating aerodynamic lift. The closest working angle to the wind.',
    descriptionPl: 'Kurs pod ostrym katem do wiatru (30-60°). Zagle maksymalnie wybrane (dociagniete do osi symetrii). Zagiel dziala jak skrzydlo samolotu, generujac sile aerodynamiczna. Najbardziej "ciasny" kurs roboczy.',
    color: '#ff8844',
    sailWork: 'Парус как крыло - аэродинамическая тяга',
    sailWorkEn: 'Sail as wing - aerodynamic lift',
    sailWorkPl: 'Zagiel jak skrzydlo - sila aerodynamiczna',
  },
  {
    id: 'beam-reach',
    nameRu: 'Галфвинд',
    nameEn: 'Beam Reach',
    namePl: 'Polwiatr',
    angleMin: 60,
    angleMax: 110,
    sailAngle: 45,
    speedFactor: 1.0,
    description: 'Ветер дует перпендикулярно борту (~90°). Самый быстрый и комфортный курс. Паруса выставлены на ~45° от ДП. Сочетание аэродинамической тяги и давления ветра.',
    descriptionEn: 'Wind blows perpendicular to the beam (~90°). The fastest and most comfortable point of sail. Sails set at ~45° from centerline. Combination of lift and push.',
    descriptionPl: 'Wiatr wieje prostopadle do burty (~90°). Najszybszy i najbardziej komfortowy kurs. Zagle ustawione pod katem ~45° od osi. Polaczenie sily aerodynamicznej i naporu wiatru.',
    color: '#44ff88',
    sailWork: 'Баланс тяги и давления - максимальная скорость',
    sailWorkEn: 'Balance of lift and push - maximum speed',
    sailWorkPl: 'Balans sily i naporu - maksymalna predkosc',
  },
  {
    id: 'broad-reach',
    nameRu: 'Бакштаг',
    nameEn: 'Broad Reach',
    namePl: 'Baksztag',
    angleMin: 110,
    angleMax: 160,
    sailAngle: 70,
    speedFactor: 0.85,
    description: 'Ветер дует сзади-сбоку (110-160°). Паруса сильно потравлены. Быстрый курс, но требует внимания к возможному непроизвольному повороту фордевинд.',
    descriptionEn: 'Wind from behind and to the side (110-160°). Sails eased out significantly. Fast course, but requires attention to accidental jibes.',
    descriptionPl: 'Wiatr wieje z tylu-boku (110-160°). Zagle mocno wyluzowane. Szybki kurs, ale wymaga uwagi ze wzgledu na mozliwosc nieoczekiwanego zwrotu przez rufe.',
    color: '#44aaff',
    sailWork: 'Парус как препятствие - давление ветра',
    sailWorkEn: 'Sail as obstacle - wind pressure',
    sailWorkPl: 'Zagiel jako przeszkoda - napor wiatru',
  },
  {
    id: 'running',
    nameRu: 'Фордевинд',
    nameEn: 'Running / Dead Run',
    namePl: 'Fordewind',
    angleMin: 160,
    angleMax: 180,
    sailAngle: 85,
    speedFactor: 0.6,
    description: 'Ветер дует прямо в корму (170-180°). Паруса полностью потравлены перпендикулярно ДП. Парус работает только как парашют. Кажется простым, но опасен непроизвольным поворотом фордевинд.',
    descriptionEn: 'Wind directly from behind (170-180°). Sails fully eased perpendicular to hull. Sail works only as a parachute. Seems easy but dangerous due to accidental jibes.',
    descriptionPl: 'Wiatr wieje prosto w rufe (170-180°). Zagle calkowicie wyluzowane prostopadle do osi kadluba. Zagiel dziala tylko jak spadochron. Wydaje sie proste, ale niebezpieczne ze wzgledu na nieoczekiwany zwrot przez rufe.',
    color: '#8844ff',
    sailWork: 'Парус как парашют - только давление',
    sailWorkEn: 'Sail as parachute - pressure only',
    sailWorkPl: 'Zagiel jak spadochron - tylko napor',
  },
];

// ===== TACK TYPES =====
export interface Tack {
  nameRu: string;
  nameEn: string;
  namePl: string;
  description: string;
  descriptionEn: string;
  descriptionPl: string;
}

export const tacks: Record<string, Tack> = {
  port: {
    nameRu: 'Левый галс',
    nameEn: 'Port Tack',
    namePl: 'Lewy hals',
    description: 'Ветер дует в левый борт. Паруса на правом борту.',
    descriptionEn: 'Wind from port (left) side. Sails on starboard (right) side.',
    descriptionPl: 'Wiatr wieje w lewa burte. Zagle po prawej burcie.',
  },
  starboard: {
    nameRu: 'Правый галс',
    nameEn: 'Starboard Tack',
    namePl: 'Prawy hals',
    description: 'Ветер дует в правый борт. Паруса на левом борту.',
    descriptionEn: 'Wind from starboard (right) side. Sails on port (left) side.',
    descriptionPl: 'Wiatr wieje w prawa burte. Zagle po lewej burcie.',
  },
};

// ===== MANEUVERS =====
export interface Maneuver {
  id: string;
  nameRu: string;
  nameEn: string;
  namePl: string;
  description: string;
  descriptionEn: string;
  descriptionPl: string;
  category: 'basic' | 'racing';
}

export const maneuvers: Maneuver[] = [
  {
    id: 'tacking',
    nameRu: 'Оверштаг (поворот оverштаг)',
    nameEn: 'Tacking',
    namePl: 'Zwrot przez sztag',
    description: 'Поворот, при котором нос яхты пересекает линию ветра. Яхта переходит с одного галса на другой через левентик. Безопасный, но медленный поворот.',
    descriptionEn: 'Turn where the bow crosses the wind line. Boat changes tack through head-to-wind. Safe but slow turn.',
    descriptionPl: 'Zwrot, w ktorym dziob jachtu przecina linie wiatru. Jacht przechodzi z jednego halsu na drugi przez wiatr. Bezpieczny, ale wolny zwrot.',
    category: 'basic',
  },
  {
    id: 'jibing',
    nameRu: 'Поворот фордевинд',
    nameEn: 'Jibing / Gybing',
    namePl: 'Zwrot przez rufe',
    description: 'Поворот, при котором корма яхты пересекает линию ветра. Гик резко перебрасывается на другой борт. Быстрый, но потенциально опасный поворот - гик может травмировать экипаж.',
    descriptionEn: 'Turn where the stern crosses the wind line. The boom swings violently to the other side. Fast but potentially dangerous - the boom can injure the crew.',
    descriptionPl: 'Zwrot, w ktorym rufa jachtu przecina linie wiatru. Bom gwaltownie przerzuca sie na druga burte. Szybki, ale potencjalnie niebezpieczny - bom moze zranic zaloge.',
    category: 'basic',
  },
  {
    id: 'luffing',
    nameRu: 'Приведение к ветру',
    nameEn: 'Luffing Up / Heading Up',
    namePl: 'Ostrzenie kursu',
    description: 'Изменение курса ближе к ветру (уменьшение угла к ветру). Паруса нужно добирать (подтягивать).',
    descriptionEn: 'Turning the bow closer to the wind (decreasing angle to wind). Sails need to be trimmed in (tightened).',
    descriptionPl: 'Zmiana kursu blizej wiatru (zmniejszenie kata do wiatru). Zagle nalezy wybierac (dociagac).',
    category: 'basic',
  },
  {
    id: 'bearing-away',
    nameRu: 'Уваливание',
    nameEn: 'Bearing Away / Heading Down',
    namePl: 'Odpadanie od wiatru',
    description: 'Изменение курса дальше от ветра (увеличение угла к ветру). Паруса нужно потравливать (отпускать).',
    descriptionEn: 'Turning the bow away from the wind (increasing angle to wind). Sails need to be eased out (loosened).',
    descriptionPl: 'Zmiana kursu dalej od wiatru (zwiekszenie kata do wiatru). Zagle nalezy wyluzowac (popuszczac).',
    category: 'basic',
  },
  {
    id: 'beating',
    nameRu: 'Лавировка (хождение галсами)',
    nameEn: 'Beating / Tacking Upwind',
    namePl: 'Halsowanie pod wiatr',
    description: 'Серия зигзагообразных манёвров (галсов) для движения к точке, находящейся против ветра. Яхта идёт курсом бейдевинд, меняя галсы поворотами оверштаг.',
    descriptionEn: 'A series of zigzag maneuvers (tacks) to reach a point upwind. Boat sails close-hauled, changing tacks via tacking turns.',
    descriptionPl: 'Seria zygzakowych manewrow (halsow) w celu dotarcia do punktu lezacego pod wiatr. Jacht plynie kursem bajdewind, zmieniajac halsy przez zwroty przez sztag.',
    category: 'racing',
  },
  {
    id: 'mark-rounding',
    nameRu: 'Огибание знака',
    nameEn: 'Mark Rounding',
    namePl: 'Opływanie znaku',
    description: 'Прохождение яхтой вокруг буя (знака) на гоночной дистанции. Требует точного расчёта траектории и настройки парусов.',
    descriptionEn: 'Sailing around a buoy (mark) on the racecourse. Requires precise trajectory calculation and sail trim adjustment.',
    descriptionPl: 'Okrazanie boi (znaku) na trasie regatowej. Wymaga precyzyjnego obliczenia trajektorii i ustawienia zagli.',
    category: 'racing',
  },
];

// ===== GLOSSARY TERMS =====
export interface GlossaryTerm {
  id: string;
  termRu: string;
  termEn: string;
  termPl: string;
  definition: string;
  definitionEn: string;
  definitionPl: string;
  category: 'boat' | 'sail' | 'course' | 'maneuver' | 'racing' | 'wind' | 'crew';
}

export const glossaryTerms: GlossaryTerm[] = [
  // Части яхты / Boat Parts / Czesci jachtu
  { id: 'bow', termRu: 'Нос', termEn: 'Bow', termPl: 'Dziob', definition: 'Передняя часть яхты', definitionEn: 'Front of the boat', definitionPl: 'Przednia czesc jachtu', category: 'boat' },
  { id: 'stern', termRu: 'Корма', termEn: 'Stern', termPl: 'Rufa', definition: 'Задняя часть яхты', definitionEn: 'Back of the boat', definitionPl: 'Tylna czesc jachtu', category: 'boat' },
  { id: 'port', termRu: 'Левый борт', termEn: 'Port', termPl: 'Lewa burta', definition: 'Левая сторона яхты (если смотреть на нос)', definitionEn: 'Left side of the boat (facing forward)', definitionPl: 'Lewa strona jachtu (patrzac w kierunku dziobu)', category: 'boat' },
  { id: 'starboard', termRu: 'Правый борт', termEn: 'Starboard', termPl: 'Prawa burta', definition: 'Правая сторона яхты (если смотреть на нос)', definitionEn: 'Right side of the boat (facing forward)', definitionPl: 'Prawa strona jachtu (patrzac w kierunku dziobu)', category: 'boat' },
  { id: 'hull', termRu: 'Корпус', termEn: 'Hull', termPl: 'Kadlub', definition: 'Основная часть яхты - тело лодки', definitionEn: 'Main body of the boat', definitionPl: 'Glowna czesc jachtu - cialo lodzi', category: 'boat' },
  { id: 'keel', termRu: 'Киль', termEn: 'Keel', termPl: 'Kil', definition: 'Подводный плавник под корпусом для остойчивости и противодействия дрейфу', definitionEn: 'Underwater fin for stability and lateral resistance', definitionPl: 'Podwodna pletwa pod kadlubem zapewniajaca statecznosc i przeciwdzialajaca dryfowi', category: 'boat' },
  { id: 'rudder', termRu: 'Руль (перо руля)', termEn: 'Rudder', termPl: 'Ster (pletwa sterowa)', definition: 'Подводный элемент для управления направлением', definitionEn: 'Underwater blade for steering', definitionPl: 'Podwodny element sluzacy do sterowania kierunkiem', category: 'boat' },
  { id: 'tiller', termRu: 'Румпель', termEn: 'Tiller', termPl: 'Rumpel', definition: 'Рукоятка, соединённая с рулём, для управления яхтой', definitionEn: 'Handle connected to the rudder for steering', definitionPl: 'Raczka polaczona ze sterem, sluzaca do sterowania jachtem', category: 'boat' },
  { id: 'cockpit', termRu: 'Кокпит', termEn: 'Cockpit', termPl: 'Kokpit', definition: 'Открытая рабочая область в корме, где находится экипаж', definitionEn: 'Open working area in the stern where crew sits', definitionPl: 'Otwarta przestrzen robocza w rufie, gdzie przebywa zaloga', category: 'boat' },
  { id: 'deck', termRu: 'Палуба', termEn: 'Deck', termPl: 'Poklad', definition: 'Верхняя горизонтальная поверхность яхты', definitionEn: 'Upper horizontal surface of the boat', definitionPl: 'Gorna pozioma powierzchnia jachtu', category: 'boat' },
  { id: 'centerline', termRu: 'Диаметральная плоскость (ДП)', termEn: 'Centerline', termPl: 'Plaszczyzna symetrii', definition: 'Воображаемая линия от носа до кормы, делящая яхту пополам', definitionEn: 'Imaginary line from bow to stern dividing the boat in half', definitionPl: 'Wyobrazona linia od dziobu do rufy dzielaca jacht na polowy', category: 'boat' },

  // Паруса / Sails / Zagle
  { id: 'mainsail', termRu: 'Грот (грот-парус)', termEn: 'Mainsail', termPl: 'Grot', definition: 'Главный парус, крепится к мачте и гику', definitionEn: 'Main sail attached to the mast and boom', definitionPl: 'Glowny zagiel, mocowany do masztu i bomu', category: 'sail' },
  { id: 'jib', termRu: 'Стаксель (передний парус)', termEn: 'Jib / Headsail', termPl: 'Fok (przedni zagiel)', definition: 'Передний парус перед мачтой', definitionEn: 'Front sail ahead of the mast', definitionPl: 'Przedni zagiel przed masztem', category: 'sail' },
  { id: 'spinnaker', termRu: 'Спинакер', termEn: 'Spinnaker', termPl: 'Spinaker', definition: 'Большой лёгкий парус-баллон для полных курсов', definitionEn: 'Large lightweight balloon sail for downwind sailing', definitionPl: 'Duzy lekki zagiel-balon do kursow z wiatrem', category: 'sail' },
  { id: 'boom', termRu: 'Гик', termEn: 'Boom', termPl: 'Bom', definition: 'Горизонтальная балка у основания грота, крепится к мачте', definitionEn: 'Horizontal pole at the base of the mainsail, attached to mast', definitionPl: 'Pozioma belka u podstawy grota, mocowana do masztu', category: 'sail' },
  { id: 'mast', termRu: 'Мачта', termEn: 'Mast', termPl: 'Maszt', definition: 'Вертикальная опора для парусов', definitionEn: 'Vertical pole supporting the sails', definitionPl: 'Pionowe podparcie dla zagli', category: 'sail' },
  { id: 'sheet', termRu: 'Шкот', termEn: 'Sheet', termPl: 'Szot', definition: 'Верёвка (снасть) для управления углом паруса', definitionEn: 'Rope (line) for controlling sail angle', definitionPl: 'Lina sluzaca do regulacji kata zagla', category: 'sail' },
  { id: 'halyard', termRu: 'Фал', termEn: 'Halyard', termPl: 'Fal', definition: 'Верёвка для подъёма паруса', definitionEn: 'Rope for hoisting (raising) a sail', definitionPl: 'Lina do podnoszenia zagla', category: 'sail' },
  { id: 'trim', termRu: 'Настройка парусов', termEn: 'Sail Trim', termPl: 'Trymowanie zagli', definition: 'Регулировка угла и формы паруса для оптимальной тяги', definitionEn: 'Adjusting sail angle and shape for optimal performance', definitionPl: 'Regulacja kata i ksztaltu zagla dla optymalnej wydajnosci', category: 'sail' },
  { id: 'luff-sail', termRu: 'Передняя шкаторина', termEn: 'Luff (sail edge)', termPl: 'Lik przedni', definition: 'Передний край паруса (ближе к ветру)', definitionEn: 'Leading edge of the sail (closest to wind)', definitionPl: 'Przednia krawedz zagla (najblizej wiatru)', category: 'sail' },
  { id: 'leech', termRu: 'Задняя шкаторина', termEn: 'Leech', termPl: 'Lik tylny', definition: 'Задний край паруса', definitionEn: 'Trailing edge of the sail', definitionPl: 'Tylna krawedz zagla', category: 'sail' },

  // Курсы / Points of Sail / Kursy wzgledem wiatru
  { id: 'course-in-irons', termRu: 'Левентик', termEn: 'In Irons / Head to Wind', termPl: 'Pod wiatr (lewentik)', definition: 'Нос прямо против ветра, яхта не движется', definitionEn: 'Bow pointed directly into wind, boat stalled', definitionPl: 'Dziob skierowany prosto pod wiatr, jacht nie plynie', category: 'course' },
  { id: 'course-close-hauled', termRu: 'Бейдевинд', termEn: 'Close-hauled', termPl: 'Bajdewind', definition: 'Курс под острым углом к ветру (30-60°)', definitionEn: 'Sailing at a sharp angle to wind (30-60°)', definitionPl: 'Kurs pod ostrym katem do wiatru (30-60°)', category: 'course' },
  { id: 'course-beam-reach', termRu: 'Галфвинд', termEn: 'Beam Reach', termPl: 'Polwiatr', definition: 'Ветер перпендикулярно борту (~90°)', definitionEn: 'Wind perpendicular to beam (~90°)', definitionPl: 'Wiatr prostopadle do burty (~90°)', category: 'course' },
  { id: 'course-broad-reach', termRu: 'Бакштаг', termEn: 'Broad Reach', termPl: 'Baksztag', definition: 'Ветер сзади-сбоку (110-160°)', definitionEn: 'Wind from behind and to the side (110-160°)', definitionPl: 'Wiatr z tylu-boku (110-160°)', category: 'course' },
  { id: 'course-running', termRu: 'Фордевинд', termEn: 'Running / Dead Run', termPl: 'Fordewind', definition: 'Ветер прямо в корму (170-180°)', definitionEn: 'Wind directly from behind (170-180°)', definitionPl: 'Wiatr prosto w rufe (170-180°)', category: 'course' },
  { id: 'no-go-zone', termRu: 'Неходовая зона (мёртвая зона)', termEn: 'No-Go Zone', termPl: 'Strefa martwa', definition: 'Сектор ±30-45° к ветру, где яхта не может идти', definitionEn: 'Sector ±30-45° from wind where boat cannot sail', definitionPl: 'Sektor ±30-45° od wiatru, w ktorym jacht nie moze plynac', category: 'course' },

  // Маневры / Maneuvers / Manewry
  { id: 'man-tacking', termRu: 'Оверштаг', termEn: 'Tacking', termPl: 'Zwrot przez sztag', definition: 'Поворот через нос (через линию ветра)', definitionEn: 'Turn through the bow (across the wind line)', definitionPl: 'Zwrot przez dziob (przez linie wiatru)', category: 'maneuver' },
  { id: 'man-jibing', termRu: 'Поворот фордевинд', termEn: 'Jibing / Gybing', termPl: 'Zwrot przez rufe', definition: 'Поворот через корму (через линию ветра)', definitionEn: 'Turn through the stern (across the wind line)', definitionPl: 'Zwrot przez rufe (przez linie wiatru)', category: 'maneuver' },
  { id: 'man-luffing', termRu: 'Приведение (к ветру)', termEn: 'Luffing Up', termPl: 'Ostrzenie', definition: 'Поворот ближе к ветру', definitionEn: 'Turning closer to the wind', definitionPl: 'Zwrot blizej wiatru', category: 'maneuver' },
  { id: 'man-bearing-away', termRu: 'Уваливание', termEn: 'Bearing Away', termPl: 'Odpadanie', definition: 'Поворот дальше от ветра', definitionEn: 'Turning away from the wind', definitionPl: 'Zwrot dalej od wiatru', category: 'maneuver' },
  { id: 'man-heaving-to', termRu: 'Дрейф (лечь в дрейф)', termEn: 'Heaving To', termPl: 'Dryfowanie (pozycja dryfu)', definition: 'Остановка яхты стаксель выбран на ветер, руль на ветер', definitionEn: 'Stopping the boat: jib backed, tiller to windward', definitionPl: 'Zatrzymanie jachtu: fok wybrany na wiatr, ster na wiatr', category: 'maneuver' },

  // Ветер / Wind / Wiatr
  { id: 'true-wind', termRu: 'Истинный ветер', termEn: 'True Wind', termPl: 'Wiatr rzeczywisty', definition: 'Ветер, который дует независимо от движения яхты', definitionEn: 'Wind that blows regardless of boat movement', definitionPl: 'Wiatr wiejacy niezaleznie od ruchu jachtu', category: 'wind' },
  { id: 'apparent-wind', termRu: 'Вымпельный (кажущийся) ветер', termEn: 'Apparent Wind', termPl: 'Wiatr pozorny', definition: 'Ветер, который ощущает экипаж - сумма истинного ветра и ветра от движения яхты', definitionEn: 'Wind felt by crew - sum of true wind and wind from boat movement', definitionPl: 'Wiatr odczuwany przez zaloge - suma wiatru rzeczywistego i wiatru z ruchu jachtu', category: 'wind' },
  { id: 'windward', termRu: 'Наветренная сторона', termEn: 'Windward', termPl: 'Strona nawietrzna', definition: 'Сторона, откуда дует ветер', definitionEn: 'Side from which the wind blows', definitionPl: 'Strona, z ktorej wieje wiatr', category: 'wind' },
  { id: 'leeward', termRu: 'Подветренная сторона', termEn: 'Leeward (Lee)', termPl: 'Strona zawietrzna', definition: 'Сторона, противоположная ветру (защищённая от ветра)', definitionEn: 'Side sheltered from the wind', definitionPl: 'Strona osloniete od wiatru', category: 'wind' },
  { id: 'gust', termRu: 'Порыв', termEn: 'Gust', termPl: 'Poryw wiatru', definition: 'Кратковременное усиление ветра', definitionEn: 'Short burst of increased wind speed', definitionPl: 'Krotkotrwale nasilenie wiatru', category: 'wind' },
  { id: 'lull', termRu: 'Затишье', termEn: 'Lull', termPl: 'Cisza wiatru', definition: 'Кратковременное ослабление ветра', definitionEn: 'Short period of decreased wind speed', definitionPl: 'Krotkotrwale oslabienie wiatru', category: 'wind' },
  { id: 'wind-shift', termRu: 'Заход/отход ветра', termEn: 'Wind Shift', termPl: 'Skret wiatru', definition: 'Изменение направления ветра', definitionEn: 'Change in wind direction', definitionPl: 'Zmiana kierunku wiatru', category: 'wind' },

  // Гонки / Racing / Regaty
  { id: 'race-start-line', termRu: 'Стартовая линия', termEn: 'Start Line', termPl: 'Linia startowa', definition: 'Линия между двумя буями, от которой начинается гонка', definitionEn: 'Line between two marks where race begins', definitionPl: 'Linia miedzy dwoma boja, od ktorej rozpoczyna sie regata', category: 'racing' },
  { id: 'race-mark', termRu: 'Знак дистанции (буй)', termEn: 'Course Mark / Buoy', termPl: 'Znak trasy (boja)', definition: 'Буй на воде, вокруг которого нужно пройти', definitionEn: 'Buoy on water to sail around', definitionPl: 'Boja na wodzie, ktora nalezy oplynac', category: 'racing' },
  { id: 'race-windward-mark', termRu: 'Верхний знак (наветренный)', termEn: 'Windward Mark', termPl: 'Znak nawietrzny (gorny)', definition: 'Знак, расположенный против ветра', definitionEn: 'Mark located upwind', definitionPl: 'Znak polozony pod wiatr', category: 'racing' },
  { id: 'race-leeward-mark', termRu: 'Нижний знак (подветренный)', termEn: 'Leeward Mark', termPl: 'Znak zawietrzny (dolny)', definition: 'Знак, расположенный по ветру', definitionEn: 'Mark located downwind', definitionPl: 'Znak polozony z wiatrem', category: 'racing' },
  { id: 'race-layline', termRu: 'Лейлайн', termEn: 'Layline', termPl: 'Layline (linia dojscia)', definition: 'Курс, при котором яхта может достичь знака без дополнительных поворотов', definitionEn: 'Course allowing boat to reach mark without additional tacks', definitionPl: 'Kurs pozwalajacy jachtowi osiagnac znak bez dodatkowych zwrotow', category: 'racing' },
  { id: 'race-protest', termRu: 'Протест', termEn: 'Protest', termPl: 'Protest', definition: 'Официальная жалоба на нарушение правил другой яхтой', definitionEn: 'Formal complaint about rule violation by another boat', definitionPl: 'Oficjalna skarga na naruszenie przepisow przez inny jacht', category: 'racing' },
  { id: 'race-right-of-way', termRu: 'Право дороги', termEn: 'Right of Way', termPl: 'Prawo drogi', definition: 'Приоритет прохода одной яхты над другой при сближении', definitionEn: 'Priority of one boat over another when converging', definitionPl: 'Priorytet jednego jachtu nad drugim przy zblizaniu', category: 'racing' },
  { id: 'race-overlap', termRu: 'Связка (overlap)', termEn: 'Overlap', termPl: 'Overlap (nakladanie)', definition: 'Когда корпуса двух яхт частично перекрываются по курсу', definitionEn: 'When hulls of two boats partially overlap along the course', definitionPl: 'Sytuacja, gdy kadluby dwoch jachtow czesciowo zachodza na siebie wzdluz kursu', category: 'racing' },

  // Экипаж / Crew / Zaloga
  { id: 'skipper', termRu: 'Шкипер (рулевой)', termEn: 'Skipper / Helmsman', termPl: 'Szyper (sternik)', definition: 'Капитан или рулевой, управляющий яхтой', definitionEn: 'Captain or helmsman controlling the boat', definitionPl: 'Kapitan lub sternik kierujacy jachtem', category: 'crew' },
  { id: 'crew', termRu: 'Экипаж (матросы)', termEn: 'Crew', termPl: 'Zaloga', definition: 'Команда яхты, работающая с парусами и оснасткой', definitionEn: 'Team working with sails and rigging', definitionPl: 'Druzyna jachtu pracujaca z zaglami i olinowaniem', category: 'crew' },
  { id: 'hiking', termRu: 'Откренивание', termEn: 'Hiking / Hiking Out', termPl: 'Balastowanie cialem', definition: 'Вывешивание тела за борт для противодействия крену', definitionEn: 'Leaning body overboard to counteract heeling', definitionPl: 'Wychylanie ciala za burte w celu przeciwdzialania przechylowi', category: 'crew' },
  { id: 'heeling', termRu: 'Крен', termEn: 'Heeling', termPl: 'Przechyl', definition: 'Наклон яхты под действием ветра', definitionEn: 'Tilting of the boat caused by wind pressure', definitionPl: 'Nachylenie jachtu pod wplywem wiatru', category: 'crew' },
];

export const glossaryCategories: Record<string, { nameRu: string; nameEn: string; namePl: string }> = {
  boat:     { nameRu: 'Части яхты', nameEn: 'Boat Parts', namePl: 'Czesci jachtu' },
  sail:     { nameRu: 'Паруса и оснастка', nameEn: 'Sails & Rigging', namePl: 'Zagle i olinowanie' },
  course:   { nameRu: 'Курсы', nameEn: 'Points of Sail', namePl: 'Kursy wzgledem wiatru' },
  maneuver: { nameRu: 'Манёвры', nameEn: 'Maneuvers', namePl: 'Manewry' },
  wind:     { nameRu: 'Ветер', nameEn: 'Wind', namePl: 'Wiatr' },
  racing:   { nameRu: 'Гонки', nameEn: 'Racing', namePl: 'Regaty' },
  crew:     { nameRu: 'Экипаж', nameEn: 'Crew', namePl: 'Zaloga' },
};

// ===== RACING RULES =====
export interface RacingRule {
  id: string;
  titleRu: string;
  titleEn: string;
  titlePl: string;
  descriptionRu: string;
  descriptionEn: string;
  descriptionPl: string;
  priority: number;
}

export const racingRules: RacingRule[] = [
  {
    id: 'starboard-over-port',
    titleRu: 'Правый галс имеет преимущество',
    titleEn: 'Starboard over Port',
    titlePl: 'Prawy hals ma pierwszenstwo',
    descriptionRu: 'Яхта на правом галсе имеет право дороги. Яхта на левом галсе должна уступить.',
    descriptionEn: 'Starboard tack boat has right of way. Port tack boat must give way.',
    descriptionPl: 'Jacht na prawym halsie ma prawo drogi. Jacht na lewym halsie musi ustapic.',
    priority: 1,
  },
  {
    id: 'leeward-over-windward',
    titleRu: 'Подветренная над наветренной',
    titleEn: 'Leeward over Windward',
    titlePl: 'Zawietrzny ma pierwszenstwo nad nawietrznym',
    descriptionRu: 'На одном галсе подветренная яхта имеет преимущество. Наветренная должна уступить.',
    descriptionEn: 'On the same tack, leeward boat has right of way. Windward boat must keep clear.',
    descriptionPl: 'Na tym samym halsie jacht zawietrzny ma pierwszenstwo. Nawietrzny musi ustapic.',
    priority: 2,
  },
  {
    id: 'overtaking',
    titleRu: 'Обгоняющая уступает',
    titleEn: 'Overtaking Boat Keeps Clear',
    titlePl: 'Wyprzedzajacy ustepuje',
    descriptionRu: 'Яхта, обгоняющая другую, должна держаться в стороне от обгоняемой яхты.',
    descriptionEn: 'A boat overtaking another must keep clear of the boat being overtaken.',
    descriptionPl: 'Jacht wyprzedzajacy inny musi trzymac sie z dala od wyprzedzanego jachtu.',
    priority: 3,
  },
  {
    id: 'mark-room',
    titleRu: 'Место у знака',
    titleEn: 'Mark Room',
    titlePl: 'Miejsce przy znaku',
    descriptionRu: 'Яхта с внутренней стороны имеет право на место для огибания знака, если связка установлена в зоне 3 корпусов.',
    descriptionEn: 'Inside boat is entitled to room to round mark if overlap established within 3 boat-lengths zone.',
    descriptionPl: 'Jacht po wewnetrznej stronie ma prawo do miejsca na opłyniecie znaku, jesli overlap zostal ustanowiony w strefie 3 dlugosci kadluba.',
    priority: 4,
  },
];

// ===== RACING STRATEGIES =====
export interface RacingStrategy {
  id: string;
  titleRu: string;
  titleEn: string;
  titlePl: string;
  descriptionRu: string;
  descriptionEn: string;
  descriptionPl: string;
  tips: { ru: string; en: string; pl: string }[];
}

export const racingStrategies: RacingStrategy[] = [
  {
    id: 'upwind',
    titleRu: 'Лавировка (движение против ветра)',
    titleEn: 'Upwind Strategy (Beating)',
    titlePl: 'Halsowanie (plyniecie pod wiatr)',
    descriptionRu: 'Для достижения точки, расположенной против ветра, нужно идти зигзагом - галсами - под углом ~45° к ветру.',
    descriptionEn: 'To reach a point upwind, sail in a zigzag pattern - tacking - at ~45° angle to the wind.',
    descriptionPl: 'Aby dotrzec do punktu polozonego pod wiatr, trzeba plynac zygzakiem - halsami - pod katem ~45° do wiatru.',
    tips: [
      { ru: 'Старайся держать оптимальный угол бейдевинда (~40-45°)', en: 'Maintain optimal close-hauled angle (~40-45°)', pl: 'Staraj sie utrzymywac optymalny kat bajdewindu (~40-45°)' },
      { ru: 'Делай повороты оверштаг при заходе ветра (wind shift) в твою пользу', en: 'Tack on favorable wind shifts', pl: 'Wykonuj zwroty przez sztag przy korzystnych skretach wiatru' },
      { ru: 'Минимизируй количество поворотов - каждый поворот теряет скорость', en: 'Minimize tacks - each tack loses speed', pl: 'Minimalizuj liczbe zwrotow - kazdy zwrot traci predkosc' },
      { ru: 'Держи "свободную воду" - не иди в тень другой яхты', en: 'Keep clear air - don\'t sail in another boat\'s wind shadow', pl: 'Trzymaj czyste powietrze - nie plyń w cieniu wiatru innego jachtu' },
    ],
  },
  {
    id: 'downwind',
    titleRu: 'Полные курсы (движение по ветру)',
    titleEn: 'Downwind Strategy',
    titlePl: 'Kursy pelne (plyniecie z wiatrem)',
    descriptionRu: 'На полных курсах (бакштаг, фордевинд) яхта набирает скорость за счёт давления ветра на паруса.',
    descriptionEn: 'On downwind courses (broad reach, running), the boat gains speed from wind pressure on sails.',
    descriptionPl: 'Na kursach pelnych (baksztag, fordewind) jacht nabiera predkosci dzieki naporowi wiatru na zagle.',
    tips: [
      { ru: 'Часто выгоднее идти бакштагом (VMG) чем чистым фордевинд', en: 'Often better to sail broad reach (VMG) than dead run', pl: 'Czesto oplaca sie plynac baksztagiem (VMG) niz czystym fordewindem' },
      { ru: 'Используй спинакер на полных курсах', en: 'Use spinnaker on downwind legs', pl: 'Uzywaj spinakera na kursach pelnych' },
      { ru: 'Следи за непроизвольным поворотом фордевинд', en: 'Watch for accidental jibes', pl: 'Uwazaj na nieoczekiwany zwrot przez rufe' },
      { ru: 'Сёрфинг на волнах может значительно увеличить скорость', en: 'Wave surfing can significantly increase speed', pl: 'Surfowanie na falach moze znacznie zwiekszyc predkosc' },
    ],
  },
  {
    id: 'start',
    titleRu: 'Стартовая стратегия',
    titleEn: 'Start Strategy',
    titlePl: 'Strategia startu',
    descriptionRu: 'Хороший старт - залог успеха в гонке. Нужно пересечь стартовую линию в момент сигнала на максимальной скорости.',
    descriptionEn: 'A good start is key to race success. Cross the start line at signal with maximum speed.',
    descriptionPl: 'Dobry start to klucz do sukcesu w regatach. Trzeba przekroczyc linie startu w momencie sygnalu z maksymalna predkoscia.',
    tips: [
      { ru: 'Определи "выгодный конец" стартовой линии (тот, что ближе к ветру)', en: 'Identify the favored end of the line (closest to wind)', pl: 'Okresl "korzystny koniec" linii startu (ten blizej wiatru)' },
      { ru: 'Рассчитай время подхода к линии, чтобы набрать скорость', en: 'Time your approach to build speed before crossing', pl: 'Oblicz czas podejscia do linii, aby nabrac predkosci' },
      { ru: 'Имей запасной план на случай столкновения или фальстарта', en: 'Have a backup plan for collisions or premature start', pl: 'Miej plan awaryjny na wypadek kolizji lub falszywego startu' },
      { ru: 'Защищай свою "свободную воду" после старта', en: 'Protect your clear air after start', pl: 'Chron swoje czyste powietrze po starcie' },
    ],
  },
  {
    id: 'mark-rounding',
    titleRu: 'Огибание знаков',
    titleEn: 'Mark Rounding',
    titlePl: 'Opływanie znakow',
    descriptionRu: 'Эффективное огибание знаков дистанции может выиграть или проиграть позиции в гонке.',
    descriptionEn: 'Efficient mark rounding can gain or lose positions in a race.',
    descriptionPl: 'Efektywne oplywanie znakow trasy moze wygrac lub przegrac pozycje w regatach.',
    tips: [
      { ru: 'Подходи широко, выходи узко - для оптимальной траектории', en: 'Approach wide, exit tight - for optimal trajectory', pl: 'Podchodz szeroko, wychodz waski - dla optymalnej trajektorii' },
      { ru: 'Перестрой паруса заранее, до знака', en: 'Adjust sails before reaching the mark', pl: 'Ustaw zagle wczesniej, przed dojsciem do znaku' },
      { ru: 'При сближении с другими яхтами - устанавливай связку заранее', en: 'When approaching with other boats - establish overlap early', pl: 'Przy zblizaniu z innymi jachtami - ustanawiaj overlap wczesniej' },
      { ru: 'Помни о правиле "места у знака" (3 корпуса)', en: 'Remember the mark room rule (3 boat-lengths)', pl: 'Pamietaj o zasadzie "miejsca przy znaku" (3 dlugosci kadluba)' },
    ],
  },
];
