import type { LegacyLocalized } from '@/lib/languages';

// ===== POINTS OF SAIL =====
export type PointOfSail =
  & LegacyLocalized<'name'>
  & {
    id: string;
    angleMin: number;
    angleMax: number;
    sailAngle: number; // degrees from centerline
    speedFactor: number; // 0-1, relative speed
    description: string;
    descriptionEn: string;
    descriptionPl: string;
    descriptionEs?: string;
    descriptionFr?: string;
    descriptionDe?: string;
    descriptionIt?: string;
    color: string;
    sailWork: string;
    sailWorkEn: string;
    sailWorkPl: string;
    sailWorkEs?: string;
    sailWorkFr?: string;
    sailWorkDe?: string;
    sailWorkIt?: string;
  };

export const pointsOfSail: PointOfSail[] = [
  {
    id: 'in-irons',
    nameRu: 'Левентик',
    nameEn: 'In Irons / Head to Wind',
    namePl: 'Lewentik',
    nameEs: 'en facha',
    nameFr: 'vent debout',
    nameDe: 'im Wind',
    nameIt: 'in panna',
    angleMin: 0,
    angleMax: 30,
    sailAngle: 0,
    speedFactor: 0,
    description: 'Яхта стоит носом прямо против ветра. Паруса полощутся (заполаскивают), тяга отсутствует. Это "мёртвая зона" - яхта не может двигаться в этом направлении.',
    descriptionEn: 'Boat is pointed directly into the wind. Sails luff (flap) with no drive. This is the "no-go zone" - the boat cannot sail in this direction.',
    descriptionPl: 'Jacht stoi dziobem prosto pod wiatr. Zagle lopocza (powietrze nie tworzy ciagu), brak sily napedowej. To strefa martwa - jacht nie moze plynac w tym kierunku.',
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
    nameEs: 'Cenida',
    nameFr: 'au près',
    nameDe: 'Am Wind',
    nameIt: 'bolina',
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
    nameEs: 'a un largo',
    nameFr: 'vent de travers',
    nameDe: 'Halbwind',
    nameIt: 'traverso',
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
    nameEs: 'largo',
    nameFr: 'grand largue',
    nameDe: 'Raumwind',
    nameIt: 'lasco',
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
    nameEs: 'a popa',
    nameFr: 'vent arriere',
    nameDe: 'vor dem Wind',
    nameIt: 'fil di ruota',
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
export type Tack =
  & LegacyLocalized<'name'>
  & {
    description: string;
    descriptionEn: string;
    descriptionPl: string;
    descriptionEs?: string;
    descriptionFr?: string;
    descriptionDe?: string;
    descriptionIt?: string;
  };

export const tacks: Record<string, Tack> = {
  port: {
    nameRu: 'Левый галс',
    nameEn: 'Port Tack',
    namePl: 'Lewy hals',
    nameEs: 'amura a babor',
    nameFr: 'babord amures',
    nameDe: 'Backbordbug',
    nameIt: 'mure a sinistra',
    description: 'Ветер дует в левый борт. Паруса на правом борту.',
    descriptionEn: 'Wind from port (left) side. Sails on starboard (right) side.',
    descriptionPl: 'Wiatr wieje w lewa burte. Zagle po prawej burcie.',
  },
  starboard: {
    nameRu: 'Правый галс',
    nameEn: 'Starboard Tack',
    namePl: 'Prawy hals',
    nameEs: 'Amura a estribor',
    nameFr: 'Tribord amures',
    nameDe: 'Steuerbordbug',
    nameIt: 'Mure a dritta',
    description: 'Ветер дует в правый борт. Паруса на левом борту.',
    descriptionEn: 'Wind from starboard (right) side. Sails on port (left) side.',
    descriptionPl: 'Wiatr wieje w prawa burte. Zagle po lewej burcie.',
  },
};

// ===== MANEUVERS =====
export type Maneuver =
  & LegacyLocalized<'name'>
  & {
    id: string;
    description: string;
    descriptionEn: string;
    descriptionPl: string;
    descriptionEs?: string;
    descriptionFr?: string;
    descriptionDe?: string;
    descriptionIt?: string;
    category: 'basic' | 'racing';
  };

export const maneuvers: Maneuver[] = [
  {
    id: 'tacking',
    nameRu: 'Оверштаг (поворот оverштаг)',
    nameEn: 'Tacking',
    namePl: 'Zwrot przez sztag',
    nameEs: 'Virar por avante (povorta virar por avante)',
    nameFr: 'Virer de bord (poavorot par virement de bord)',
    nameDe: 'Wenden (Wendemanöver)',
    nameIt: 'Virare (di bordo)',
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
    nameEs: 'Trasluchar',
    nameFr: 'Empanner',
    nameDe: 'Halsen',
    nameIt: 'Strambare',
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
    nameEs: 'Acercarse al viento',
    nameFr: 'Vent debout',
    nameDe: 'Im Wind',
    nameIt: 'in panna',
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
    nameEs: 'Trasluchar',
    nameFr: 'empannage',
    nameDe: 'Halsen',
    nameIt: 'Strambare',
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
    nameEs: 'Ceñir (navegación en zigzag)',
    nameFr: 'Louvoyer (croisement des amures)',
    nameDe: 'Kreuzen (Wenden)',
    nameIt: 'Bolinare (ceñir a prueba)',
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
    nameEs: 'Redondeando la boya',
    nameFr: 'Contournement de la bouée',
    nameDe: 'Rund um die Tonne',
    nameIt: 'Girare attorno alla boa',
    description: 'Прохождение яхтой вокруг буя (знака) на гоночной дистанции. Требует точного расчёта траектории и настройки парусов.',
    descriptionEn: 'Sailing around a buoy (mark) on the racecourse. Requires precise trajectory calculation and sail trim adjustment.',
    descriptionPl: 'Okrazanie boi (znaku) na trasie regatowej. Wymaga precyzyjnego obliczenia trajektorii i ustawienia zagli.',
    category: 'racing',
  },
];

// ===== GLOSSARY TERMS =====
export type GlossaryTerm =
  & LegacyLocalized<'term'>
  & {
    id: string;
    definition: string;
    definitionEn: string;
    definitionPl: string;
    definitionEs?: string;
    definitionFr?: string;
    definitionDe?: string;
    definitionIt?: string;
    category: 'boat' | 'sail' | 'course' | 'maneuver' | 'racing' | 'wind' | 'crew';
  };

export const glossaryTerms: GlossaryTerm[] = [
  // Части яхты / Boat Parts / Czesci jachtu
  { id: 'bow', termRu: 'Нос', termEn: 'Bow', termPl: 'Dziob', definition: 'Передняя часть яхты', definitionEn: 'Front of the boat', definitionPl: 'Przednia czesc jachtu', category: 'boat', termEs: 'Proa', termFr: 'Etrave', termDe: 'Bug', termIt: 'Prua', },
  { id: 'stern', termRu: 'Корма', termEn: 'Stern', termPl: 'Rufa', definition: 'Задняя часть яхты', definitionEn: 'Back of the boat', definitionPl: 'Tylna czesc jachtu', category: 'boat', termEs: 'Popa', termFr: 'Poupe', termDe: 'Heck', termIt: 'poppa', },
  { id: 'port', termRu: 'Левый борт', termEn: 'Port', termPl: 'Lewa burta', definition: 'Левая сторона яхты (если смотреть на нос)', definitionEn: 'Left side of the boat (facing forward)', definitionPl: 'Lewa strona jachtu (patrzac w kierunku dziobu)', category: 'boat', termEs: 'Babor', termFr: 'Babord', termDe: 'Backbord', termIt: 'Babordo', },
  { id: 'starboard', termRu: 'Правый борт', termEn: 'Starboard', termPl: 'Prawa burta', definition: 'Правая сторона яхты (если смотреть на нос)', definitionEn: 'Right side of the boat (facing forward)', definitionPl: 'Prawa strona jachtu (patrzac w kierunku dziobu)', category: 'boat', termEs: 'Estribor', termFr: 'Tribord', termDe: 'Steuerbord', termIt: 'Tribordo', },
  { id: 'hull', termRu: 'Корпус', termEn: 'Hull', termPl: 'Kadlub', definition: 'Основная часть яхты - тело лодки', definitionEn: 'Main body of the boat', definitionPl: 'Glowna czesc jachtu - cialo lodzi', category: 'boat', termEs: 'casco', termFr: 'Coque', termDe: 'Rumpf', termIt: 'scafo', },
  { id: 'keel', termRu: 'Киль', termEn: 'Keel', termPl: 'Kil', definition: 'Подводный плавник под корпусом для остойчивости и противодействия дрейфу', definitionEn: 'Underwater fin for stability and lateral resistance', definitionPl: 'Podwodna pletwa pod kadlubem zapewniajaca statecznosc i przeciwdzialajaca dryfowi', category: 'boat', termEs: 'Quilla', termFr: 'quille', termDe: 'Kiel', termIt: 'chiglia', },
  { id: 'rudder', termRu: 'Руль (перо руля)', termEn: 'Rudder', termPl: 'Ster (pletwa sterowa)', definition: 'Подводный элемент для управления направлением', definitionEn: 'Underwater blade for steering', definitionPl: 'Podwodny element sluzacy do sterowania kierunkiem', category: 'boat', termEs: 'Timón (pala del timón)', termFr: 'Gouvernail (pale de gouvernail)', termDe: 'Ruder (Ruderblatt)', termIt: 'Timone (pala del timone)', },
  { id: 'tiller', termRu: 'Румпель', termEn: 'Tiller', termPl: 'Rumpel', definition: 'Рукоятка, соединённая с рулём, для управления яхтой', definitionEn: 'Handle connected to the rudder for steering', definitionPl: 'Raczka polaczona ze sterem, sluzaca do sterowania jachtem', category: 'boat', termEs: 'Timón', termFr: 'Gouvernail', termDe: 'Ruder', termIt: 'Timone', },
  { id: 'cockpit', termRu: 'Кокпит', termEn: 'Cockpit', termPl: 'Kokpit', definition: 'Открытая рабочая область в корме, где находится экипаж', definitionEn: 'Open working area in the stern where crew sits', definitionPl: 'Otwarta przestrzen robocza w rufie, gdzie przebywa zaloga', category: 'boat', termEs: 'Cockpit', termFr: 'Cockpit', termDe: 'Cockpit', termIt: 'Cockpit', },
  { id: 'deck', termRu: 'Палуба', termEn: 'Deck', termPl: 'Poklad', definition: 'Верхняя горизонтальная поверхность яхты', definitionEn: 'Upper horizontal surface of the boat', definitionPl: 'Gorna pozioma powierzchnia jachtu', category: 'boat', termEs: 'Cubierta', termFr: 'pont', termDe: 'Deck', termIt: 'Coperta', },
  { id: 'centerline', termRu: 'Диаметральная плоскость (ДП)', termEn: 'Centerline', termPl: 'Plaszczyzna symetrii', definition: 'Воображаемая линия от носа до кормы, делящая яхту пополам', definitionEn: 'Imaginary line from bow to stern dividing the boat in half', definitionPl: 'Wyobrazona linia od dziobu do rufy dzielaca jacht na polowy', category: 'boat', termEs: 'Plano diametral (PD)', termFr: 'Plan de symétrie longitudinale (PSL)', termDe: 'Diametrale Ebene (DE)', termIt: 'Piano di simmetria longitudinale (PSL)', },

  // Паруса / Sails / Zagle
  { id: 'mainsail', termRu: 'Грот (грот-парус)', termEn: 'Mainsail', termPl: 'Grot', definition: 'Главный парус, крепится к мачте и гику', definitionEn: 'Main sail attached to the mast and boom', definitionPl: 'Glowny zagiel, mocowany do masztu i bomu', category: 'sail', termEs: 'Vela mayor (mayor)', termFr: 'Grand-voile (voile de grand-mât)', termDe: 'Grossegel (Grosssegel)', termIt: 'Randa (grand-voile)', },
  { id: 'jib', termRu: 'Стаксель (передний парус)', termEn: 'Jib / Headsail', termPl: 'Fok (przedni zagiel)', definition: 'Передний парус перед мачтой', definitionEn: 'Front sail ahead of the mast', definitionPl: 'Przedni zagiel przed masztem', category: 'sail', termEs: 'Foque (vela delantera)', termFr: 'Foc (voile d\'avant)', termDe: 'Fock (Vorsegel)', termIt: 'Fiocco (vela di prua)', },
  { id: 'spinnaker', termRu: 'Спинакер', termEn: 'Spinnaker', termPl: 'Spinaker', definition: 'Большой лёгкий парус-баллон для полных курсов', definitionEn: 'Large lightweight balloon sail for downwind sailing', definitionPl: 'Duzy lekki zagiel-balon do kursow z wiatrem', category: 'sail', termEs: 'Spinnaker', termFr: 'spi', termDe: 'Spinnaker', termIt: 'Spinnaker', },
  { id: 'boom', termRu: 'Гик', termEn: 'Boom', termPl: 'Bom', definition: 'Горизонтальная балка у основания грота, крепится к мачте', definitionEn: 'Horizontal pole at the base of the mainsail, attached to mast', definitionPl: 'Pozioma belka u podstawy grota, mocowana do masztu', category: 'sail', termEs: 'Botón', termFr: 'bome', termDe: 'Baum', termIt: 'boma', },
  { id: 'mast', termRu: 'Мачта', termEn: 'Mast', termPl: 'Maszt', definition: 'Вертикальная опора для парусов', definitionEn: 'Vertical pole supporting the sails', definitionPl: 'Pionowe podparcie dla zagli', category: 'sail', termEs: 'Mastil', termFr: 'Mat', termDe: 'Mast', termIt: 'Albero', },
  { id: 'sheet', termRu: 'Шкот', termEn: 'Sheet', termPl: 'Szot', definition: 'Верёвка (снасть) для управления углом паруса', definitionEn: 'Rope (line) for controlling sail angle', definitionPl: 'Lina sluzaca do regulacji kata zagla', category: 'sail', termEs: 'escota', termFr: 'ecoute', termDe: 'Schot', termIt: 'scotta', },
  { id: 'halyard', termRu: 'Фал', termEn: 'Halyard', termPl: 'Fal', definition: 'Верёвка для подъёма паруса', definitionEn: 'Rope for hoisting (raising) a sail', definitionPl: 'Lina do podnoszenia zagla', category: 'sail', termEs: 'Driza', termFr: 'drisse', termDe: 'Fall', termIt: 'drizza', },
  { id: 'trim', termRu: 'Настройка парусов', termEn: 'Sail Trim', termPl: 'Trymowanie zagli', definition: 'Регулировка угла и формы паруса для оптимальной тяги', definitionEn: 'Adjusting sail angle and shape for optimal performance', definitionPl: 'Regulacja kata i ksztaltu zagla dla optymalnej wydajnosci', category: 'sail', termEs: 'Trimado de velas', termFr: 'Trimmer les voiles', termDe: 'Trimmen der Segel', termIt: 'Trimming delle vele', },
  { id: 'luff-sail', termRu: 'Передняя шкаторина', termEn: 'Luff (sail edge)', termPl: 'Lik przedni', definition: 'Передний край паруса (ближе к ветру)', definitionEn: 'Leading edge of the sail (closest to wind)', definitionPl: 'Przednia krawedz zagla (najblizej wiatru)', category: 'sail', termEs: 'Baluma delantera', termFr: 'Guindant avant', termDe: 'Vorliekseite', termIt: 'Inferitura anteriore', },
  { id: 'leech', termRu: 'Задняя шкаторина', termEn: 'Leech', termPl: 'Lik tylny', definition: 'Задний край паруса', definitionEn: 'Trailing edge of the sail', definitionPl: 'Tylna krawedz zagla', category: 'sail', termEs: 'Baluma de popa', termFr: 'Grand-voile arrière', termDe: 'Achterliek', termIt: 'Bugna della randa', },

  // Курсы / Points of Sail / Kursy wzgledem wiatru
  { id: 'course-in-irons', termRu: 'Левентик', termEn: 'In Irons / Head to Wind', termPl: 'Pod wiatr (lewentyk)', definition: 'Нос прямо против ветра, яхта не движется', definitionEn: 'Bow pointed directly into wind, boat stalled', definitionPl: 'Dziob skierowany prosto pod wiatr, jacht nie plynie', category: 'course', termEs: 'en facha', termFr: 'vent debout', termDe: 'im Wind', termIt: 'in panna', },
  { id: 'course-close-hauled', termRu: 'Бейдевинд', termEn: 'Close-hauled', termPl: 'Bajdewind', definition: 'Курс под острым углом к ветру (30-60°)', definitionEn: 'Sailing at a sharp angle to wind (30-60°)', definitionPl: 'Kurs pod ostrym katem do wiatru (30-60°)', category: 'course', termEs: 'cenida', termFr: 'au pres', termDe: 'Am Wind', termIt: 'bolina', },
  { id: 'course-beam-reach', termRu: 'Галфвинд', termEn: 'Beam Reach', termPl: 'Polwiatr', definition: 'Ветер перпендикулярно борту (~90°)', definitionEn: 'Wind perpendicular to beam (~90°)', definitionPl: 'Wiatr prostopadle do burty (~90°)', category: 'course', termEs: 'a un largo', termFr: 'vent de travers', termDe: 'Halbwind', termIt: 'Halbwind', },
  { id: 'course-broad-reach', termRu: 'Бакштаг', termEn: 'Broad Reach', termPl: 'Baksztag', definition: 'Ветер сзади-сбоку (110-160°)', definitionEn: 'Wind from behind and to the side (110-160°)', definitionPl: 'Wiatr z tylu-boku (110-160°)', category: 'course', termEs: 'largo', termFr: 'grand largue', termDe: 'Raumwind', termIt: 'lasco', },
  { id: 'course-running', termRu: 'Фордевинд', termEn: 'Running / Dead Run', termPl: 'Fordewind', definition: 'Ветер прямо в корму (170-180°)', definitionEn: 'Wind directly from behind (170-180°)', definitionPl: 'Wiatr prosto w rufe (170-180°)', category: 'course', termEs: 'popa', termFr: 'vent arriere', termDe: 'vor dem Wind', termIt: 'fil di ruota', },
  { id: 'no-go-zone', termRu: 'Неходовая зона (мёртвая зона)', termEn: 'No-Go Zone', termPl: 'Strefa martwa', definition: 'Сектор ±30-45° к ветру, где яхта не может идти', definitionEn: 'Sector ±30-45° from wind where boat cannot sail', definitionPl: 'Sektor ±30-45° od wiatru, w ktorym jacht nie moze plynac', category: 'course', termEs: 'Zona muerta (no-go zone)', termFr: 'Zone morte (zone morte)', termDe: 'Totzone (Totzone)', termIt: 'Zona morta (no-go zone)', },

  // Маневры / Maneuvers / Manewry
  { id: 'man-tacking', termRu: 'Оверштаг', termEn: 'Tacking', termPl: 'Zwrot przez sztag', definition: 'Поворот через нос (через линию ветра)', definitionEn: 'Turn through the bow (across the wind line)', definitionPl: 'Zwrot przez dziob (przez linie wiatru)', category: 'maneuver', termEs: 'Tacking', termFr: 'Virer', termDe: 'Wenden', termIt: 'Virare', },
  { id: 'man-jibing', termRu: 'Поворот фордевинд', termEn: 'Jibing / Gybing', termPl: 'Zwrot przez rufe', definition: 'Поворот через корму (через линию ветра)', definitionEn: 'Turn through the stern (across the wind line)', definitionPl: 'Zwrot przez rufe (przez linie wiatru)', category: 'maneuver', termEs: 'gybe', termFr: 'Empanner', termDe: 'Halsen', termIt: 'Strambare', },
  { id: 'man-luffing', termRu: 'Приведение (к ветру)', termEn: 'Luffing Up', termPl: 'Ostrzenie', definition: 'Поворот ближе к ветру', definitionEn: 'Turning closer to the wind', definitionPl: 'Zwrot blizej wiatru', category: 'maneuver', termEs: 'Ceñida (hacia el viento)', termFr: 'Remontée (au vent)', termDe: 'Anluven (zum Wind)', termIt: 'Portanza (dall\'orza)', },
  { id: 'man-bearing-away', termRu: 'Уваливание', termEn: 'Bearing Away', termPl: 'Odpadanie', definition: 'Поворот дальше от ветра', definitionEn: 'Turning away from the wind', definitionPl: 'Zwrot dalej od wiatru', category: 'maneuver', termEs: 'Trasluche', termFr: 'Empannage', termDe: 'Halsen', termIt: 'Strambare', },
  { id: 'man-heaving-to', termRu: 'Дрейф (лечь в дрейф)', termEn: 'Heaving To', termPl: 'Dryfowanie (pozycja dryfu)', definition: 'Остановка яхты стаксель выбран на ветер, руль на ветер', definitionEn: 'Stopping the boat: jib backed, tiller to windward', definitionPl: 'Zatrzymanie jachtu: fok wybrany na wiatr, ster na wiatr', category: 'maneuver', termEs: 'Abatimiento (ponerse a la deriva)', termFr: 'Dérive (mettre à la dérive)', termDe: 'Abdrift (abdriften)', termIt: 'Scarroccio (andare alla deriva)', },

  // Ветер / Wind / Wiatr
  { id: 'true-wind', termRu: 'Истинный ветер', termEn: 'True Wind', termPl: 'Wiatr rzeczywisty', definition: 'Ветер, который дует независимо от движения яхты', definitionEn: 'Wind that blows regardless of boat movement', definitionPl: 'Wiatr wiejacy niezaleznie od ruchu jachtu', category: 'wind', termEs: 'Viento real', termFr: 'vent réel', termDe: 'wahrer Wind', termIt: 'vento reale', },
  { id: 'apparent-wind', termRu: 'Вымпельный (кажущийся) ветер', termEn: 'Apparent Wind', termPl: 'Wiatr pozorny', definition: 'Ветер, который ощущает экипаж - сумма истинного ветра и ветра от движения яхты', definitionEn: 'Wind felt by crew - sum of true wind and wind from boat movement', definitionPl: 'Wiatr odczuwany przez zaloge - suma wiatru rzeczywistego i wiatru z ruchu jachtu', category: 'wind', termEs: 'Viento aparente (AWS)', termFr: 'vent apparent (cense)', termDe: 'Scheinbarer (scheinhafter) Wind', termIt: 'Vento apparente (AWS)', },
  { id: 'windward', termRu: 'Наветренная сторона', termEn: 'Windward', termPl: 'Strona nawietrzna', definition: 'Сторона, откуда дует ветер', definitionEn: 'Side from which the wind blows', definitionPl: 'Strona, z ktorej wieje wiatr', category: 'wind', termEs: 'Barlovento', termFr: 'côté au vent', termDe: 'Luvseite', termIt: 'Sopravvento', },
  { id: 'leeward', termRu: 'Подветренная сторона', termEn: 'Leeward (Lee)', termPl: 'Strona zawietrzna', definition: 'Сторона, противоположная ветру (защищённая от ветра)', definitionEn: 'Side sheltered from the wind', definitionPl: 'Strona osloniete od wiatru', category: 'wind', termEs: 'sotavento', termFr: 'côté sous le vent', termDe: 'Leeseite', termIt: 'sottovento', },
  { id: 'gust', termRu: 'Порыв', termEn: 'Gust', termPl: 'Poryw wiatru', definition: 'Кратковременное усиление ветра', definitionEn: 'Short burst of increased wind speed', definitionPl: 'Krotkotrwale nasilenie wiatru', category: 'wind', termEs: 'Racha', termFr: 'Rafale', termDe: 'Windstöße', termIt: 'Raffica', },
  { id: 'lull', termRu: 'Затишье', termEn: 'Lull', termPl: 'Cisza wiatru', definition: 'Кратковременное ослабление ветра', definitionEn: 'Short period of decreased wind speed', definitionPl: 'Krotkotrwale oslabienie wiatru', category: 'wind', termEs: 'Calma', termFr: 'Bonace', termDe: 'Flaute', termIt: 'Bonaccia', },
  { id: 'wind-shift', termRu: 'Заход/отход ветра', termEn: 'Wind Shift', termPl: 'Skret wiatru', definition: 'Изменение направления ветра', definitionEn: 'Change in wind direction', definitionPl: 'Zmiana kierunku wiatru', category: 'wind', termEs: 'Cambio/giro del viento', termFr: 'Variation/augmentation du vent', termDe: 'Winddrehung', termIt: 'Portata/scarico del vento', },

  // Гонки / Racing / Regaty
  { id: 'race-start-line', termRu: 'Стартовая линия', termEn: 'Start Line', termPl: 'Linia startowa', definition: 'Линия между двумя буями, от которой начинается гонка', definitionEn: 'Line between two marks where race begins', definitionPl: 'Linia miedzy dwoma boja, od ktorej rozpoczyna sie regata', category: 'racing', termEs: 'Linea de salida', termFr: 'Ligne de départ', termDe: 'Startlinie', termIt: 'linea di partenza', },
  { id: 'race-mark', termRu: 'Знак дистанции (буй)', termEn: 'Course Mark / Buoy', termPl: 'Znak trasy (boja)', definition: 'Буй на воде, вокруг которого нужно пройти', definitionEn: 'Buoy on water to sail around', definitionPl: 'Boja na wodzie, ktora nalezy oplynac', category: 'racing', termEs: 'Boya de distancia (boya)', termFr: 'Bouée de distance', termDe: 'Bahnmarke (Boje)', termIt: 'Boa di distanza (gavitello)', },
  { id: 'race-windward-mark', termRu: 'Верхний знак (наветренный)', termEn: 'Windward Mark', termPl: 'Znak nawietrzny (gorny)', definition: 'Знак, расположенный против ветра', definitionEn: 'Mark located upwind', definitionPl: 'Znak polozony pod wiatr', category: 'racing', termEs: 'Boya de barlovento', termFr: 'Bouée au vent (luvtonne)', termDe: 'Luvtonne (luv)', termIt: 'boa di bolina (sopravvento)', },
  { id: 'race-leeward-mark', termRu: 'Нижний знак (подветренный)', termEn: 'Leeward Mark', termPl: 'Znak zawietrzny (dolny)', definition: 'Знак, расположенный по ветру', definitionEn: 'Mark located downwind', definitionPl: 'Znak polozony z wiatrem', category: 'racing', termEs: 'boya de sotavento (sotavento)', termFr: 'bouee sous le vent (leeward mark)', termDe: 'Leetonne (lee)', termIt: 'Boa di poppa (sottovento)', },
  { id: 'race-layline', termRu: 'Лейлайн', termEn: 'Layline', termPl: 'Layline (linia dojscia)', definition: 'Курс, при котором яхта может достичь знака без дополнительных поворотов', definitionEn: 'Course allowing boat to reach mark without additional tacks', definitionPl: 'Kurs pozwalajacy jachtowi osiagnac znak bez dodatkowych zwrotow', category: 'racing', termEs: 'Layline', termFr: 'Layline', termDe: 'Layline', termIt: 'Layline', },
  { id: 'race-protest', termRu: 'Протест', termEn: 'Protest', termPl: 'Protest', definition: 'Официальная жалоба на нарушение правил другой яхтой', definitionEn: 'Formal complaint about rule violation by another boat', definitionPl: 'Oficjalna skarga na naruszenie przepisow przez inny jacht', category: 'racing', termEs: 'Protesta', termFr: 'Protestation', termDe: 'Protest', termIt: 'Protesta', },
  { id: 'race-right-of-way', termRu: 'Право дороги', termEn: 'Right of Way', termPl: 'Prawo drogi', definition: 'Приоритет прохода одной яхты над другой при сближении', definitionEn: 'Priority of one boat over another when converging', definitionPl: 'Priorytet jednego jachtu nad drugim przy zblizaniu', category: 'racing', termEs: 'Derecho de paso', termFr: 'Priorité', termDe: 'Wegerecht', termIt: 'Diritto di rotta', },
  { id: 'race-overlap', termRu: 'Связка (overlap)', termEn: 'Overlap', termPl: 'Overlap (nakladanie)', definition: 'Когда корпуса двух яхт частично перекрываются по курсу', definitionEn: 'When hulls of two boats partially overlap along the course', definitionPl: 'Sytuacja, gdy kadluby dwoch jachtow czesciowo zachodza na siebie wzdluz kursu', category: 'racing', termEs: 'Superposición', termFr: 'Chevauchement (overlap)', termDe: 'Überlappung (Overlap)', termIt: 'Sovrapposizione (overlap)', },

  // Экипаж / Crew / Zaloga
  { id: 'skipper', termRu: 'Шкипер (рулевой)', termEn: 'Skipper / Helmsman', termPl: 'Szyper (sternik)', definition: 'Капитан или рулевой, управляющий яхтой', definitionEn: 'Captain or helmsman controlling the boat', definitionPl: 'Kapitan lub sternik kierujacy jachtem', category: 'crew', termEs: 'Patrón (timonel)', termFr: 'Skipper (barreur)', termDe: 'Skipper (Steuermann)', termIt: 'Timoniere (rullino)', },
  { id: 'crew', termRu: 'Экипаж (матросы)', termEn: 'Crew', termPl: 'Zaloga', definition: 'Команда яхты, работающая с парусами и оснасткой', definitionEn: 'Team working with sails and rigging', definitionPl: 'Druzyna jachtu pracujaca z zaglami i olinowaniem', category: 'crew', termEs: 'Tripulación (marineros)', termFr: 'Équipage (matelots)', termDe: 'Mannschaft (Matrosen)', termIt: 'Equipaggio (membri dell\'equipaggio)', },
  { id: 'hiking', termRu: 'Откренивание', termEn: 'Hiking / Hiking Out', termPl: 'Balastowanie cialem', definition: 'Вывешивание тела за борт для противодействия крену', definitionEn: 'Leaning body overboard to counteract heeling', definitionPl: 'Wychylanie ciala za burte w celu przeciwdzialania przechylowi', category: 'crew', termEs: 'Desorquillamiento', termFr: 'Décrengaison', termDe: 'Entkränkung', termIt: 'Raddrizzamento', },
  { id: 'heeling', termRu: 'Крен', termEn: 'Heeling', termPl: 'Przechyl', definition: 'Наклон яхты под действием ветра', definitionEn: 'Tilting of the boat caused by wind pressure', definitionPl: 'Nachylenie jachtu pod wplywem wiatru', category: 'crew', termEs: 'Escora', termFr: 'Gîte', termDe: 'Krängung', termIt: 'Sbandamento', },
];

export const glossaryCategories: Record<string, LegacyLocalized<'name'>> = {
  boat:     { nameRu: 'Части яхты', nameEn: 'Boat Parts', namePl: 'Czesci jachtu', nameEs: 'Partes de la vela', nameFr: 'Parties de la voile', nameDe: 'Teile der Yacht', nameIt: 'Parti della barca', },
  sail:     { nameRu: 'Паруса и оснастка', nameEn: 'Sails & Rigging', namePl: 'Zagle i olinowanie', nameEs: 'Velas y aparejo', nameFr: 'Voiles et gréement', nameDe: 'Segel und Takelage', nameIt: 'Vele e attrezzatura', },
  course:   { nameRu: 'Курсы', nameEn: 'Points of Sail', namePl: 'Kursy wzgledem wiatru', nameEs: 'Cursos', nameFr: 'Cours', nameDe: 'Kurse', nameIt: 'Corsi', },
  maneuver: { nameRu: 'Манёвры', nameEn: 'Maneuvers', namePl: 'Manewry', nameEs: 'Maniobras', nameFr: 'Manœuvres', nameDe: 'Manöver', nameIt: 'Manovre', },
  wind:     { nameRu: 'Ветер', nameEn: 'Wind', namePl: 'Wiatr', nameEs: 'Viento', nameFr: 'vent', nameDe: 'Wind', nameIt: 'Vento', },
  racing:   { nameRu: 'Гонки', nameEn: 'Racing', namePl: 'Regaty', nameEs: 'Carreras', nameFr: 'Courses', nameDe: 'Rennen', nameIt: 'Regate', },
  crew:     { nameRu: 'Экипаж', nameEn: 'Crew', namePl: 'Zaloga', nameEs: 'Tripulación', nameFr: 'Équipage', nameDe: 'Besatzung', nameIt: 'Equipaggio', },
};

// ===== RACING RULES =====
export type RacingRule =
  & LegacyLocalized<'title'>
  & LegacyLocalized<'description'>
  & {
    id: string;
    priority: number;
  };

export const racingRules: RacingRule[] = [
  {
    id: 'starboard-over-port',
    titleRu: 'Правый галс имеет преимущество',
    titleEn: 'Starboard over Port',
    titlePl: 'Prawy hals ma pierwszenstwo',
    titleEs: 'Estribor amures tiene derecho de paso',
    titleFr: 'Tribord amures a la priorite',
    titleDe: 'Steuerbordbug hat Vorfahrt',
    titleIt: 'Starboard tack ha diritto di rotta.',
    descriptionRu: 'Яхта на правом галсе имеет право дороги. Яхта на левом галсе должна уступить.',
    descriptionEn: 'Starboard tack boat has right of way. Port tack boat must give way.',
    descriptionPl: 'Jacht na prawym halsie ma prawo drogi. Jacht na lewym halsie musi ustapic.',
    descriptionEs: 'Yate en amura a estribor tiene derecho de paso. Yate en amura a babor debe ceder paso.',
    descriptionFr: 'Un bateau tribord amures a priorite. Un bateau babord amures doit ceder la priorite.',
    descriptionDe: 'Yacht auf Steuerbordbug hat Wegerecht. Yacht auf Backbordbug muss ausweichen.',
    descriptionIt: 'La barca sulla mure a dritta ha diritto di rotta. La barca sulla mure a sinistra deve ceder precedenza.',
    priority: 1,
  },
  {
    id: 'leeward-over-windward',
    titleRu: 'Подветренная над наветренной',
    titleEn: 'Leeward over Windward',
    titlePl: 'Zawietrzny ma pierwszenstwo nad nawietrznym',
    titleEs: 'sotavento sobre barlovento',
    titleFr: 'Sous le vent au-dessus du vent',
    titleDe: 'Lee uber Luf',
    titleIt: 'Sottovento sopra luv',
    descriptionRu: 'На одном галсе подветренная яхта имеет преимущество. Наветренная должна уступить.',
    descriptionEn: 'On the same tack, leeward boat has right of way. Windward boat must keep clear.',
    descriptionPl: 'Na tym samym halsie jacht zawietrzny ma pierwszenstwo. Nawietrzny musi ustapic.',
    descriptionEs: 'En el mismo amura, la yate de sotavento tiene prioridad. La de barlovento debe ceder paso.',
    descriptionFr: 'Lorsque deux bateaux sont sur le même bord amures, le bateau sous le vent a la priorite. Le bateau au vent doit ceder la priorite.',
    descriptionDe: 'Auf demselben Kurs hat die Lee-Yacht Vorfahrt. Die Luvyacht muss ausweichen.',
    descriptionIt: 'Su uno stesso bordo la barca sottovento ha diritto di rotta. La barca sopravvento deve dare precedenza.',
    priority: 2,
  },
  {
    id: 'overtaking',
    titleRu: 'Обгоняющая уступает',
    titleEn: 'Overtaking Boat Keeps Clear',
    titlePl: 'Wyprzedzajacy ustepuje',
    titleEs: 'El barco en popa cede el paso',
    titleFr: 'L\'embarcation qui dépasse cède la priorité',
    titleDe: 'Der Überholende weicht aus',
    titleIt: 'La barca che sorpassa cede il diritto di rotta',
    descriptionRu: 'Яхта, обгоняющая другую, должна держаться в стороне от обгоняемой яхты.',
    descriptionEn: 'A boat overtaking another must keep clear of the boat being overtaken.',
    descriptionPl: 'Jacht wyprzedzajacy inny musi trzymac sie z dala od wyprzedzanego jachtu.',
    descriptionEs: 'La yate que adelanta debe mantenerse apartada de la yate adelantada.',
    descriptionFr: 'Le yacht qui dépasse doit rester à l\'écart du yacht dépassé.',
    descriptionDe: 'Eine überholende Yacht muss sich von der überholten Yacht fernhalten.',
    descriptionIt: 'Lo yacht che sorpassa deve mantenersi a distanza dallo yacht sorpassato.',
    priority: 3,
  },
  {
    id: 'mark-room',
    titleRu: 'Место у знака',
    titleEn: 'Mark Room',
    titlePl: 'Miejsce przy znaku',
    titleEs: 'Espacio en la boya',
    titleFr: 'place a la marque',
    titleDe: 'Platz an der Tonne',
    titleIt: 'spazio alla boa',
    descriptionRu: 'Яхта с внутренней стороны имеет право на место для огибания знака, если связка установлена в зоне 3 корпусов.',
    descriptionEn: 'Inside boat is entitled to room to round mark if overlap established within 3 boat-lengths zone.',
    descriptionPl: 'Jacht po wewnetrznej stronie ma prawo do miejsca na opłyniecie znaku, jesli overlap zostal ustanowiony w strefie 3 dlugosci kadluba.',
    descriptionEs: 'El yate en la parte interior tiene derecho a espacio en la boya si la proxima conexión se establece en la zona de 3 cascos.',
    descriptionFr: 'Un bateau à l\'intérieur a droit à la place à la marque si l\'attache est établie dans la zone de 3 coques.',
    descriptionDe: 'Die Jacht an der inneren Seite hat Anrecht auf Platz an der Tonne, wenn die Verbindungslinie in der Zone von 3 Rumpflängen etabliert ist.',
    descriptionIt: 'Uno yacht al lato interno ha diritto allo spazio alla boa se l\'accoppiata è stabilita nella zona 3 scafi.',
    priority: 4,
  },
];

// ===== RACING STRATEGIES =====
export type RacingStrategy =
  & LegacyLocalized<'title'>
  & LegacyLocalized<'description'>
  & {
    id: string;
    tips: { ru: string; en: string; pl: string; es?: string; fr?: string; de?: string; it?: string }[];
  };

export const racingStrategies: RacingStrategy[] = [
  {
    id: 'upwind',
    titleRu: 'Лавировка (движение против ветра)',
    titleEn: 'Upwind Strategy (Beating)',
    titlePl: 'Halsowanie (plyniecie pod wiatr)',
    titleEs: 'Ceñir (movimiento contra el viento)',
    titleFr: 'Louvoyer (remontée au vent)',
    titleDe: 'Kreuzen (Aufwindkurs)',
    titleIt: 'Bolinare (movimento controvento)',
    descriptionRu: 'Для достижения точки, расположенной против ветра, нужно идти зигзагом - галсами - под углом ~45° к ветру.',
    descriptionEn: 'To reach a point upwind, sail in a zigzag pattern - tacking - at ~45° angle to the wind.',
    descriptionPl: 'Aby dotrzec do punktu polozonego pod wiatr, trzeba plynac zygzakiem - halsami - pod katem ~45° do wiatru.',
    descriptionEs: 'Para alcanzar un punto contra el viento, hay que navegar en zigzag - ceñir - bajo un ángulo de ~45° al viento.',
    descriptionFr: 'Pour atteindre un point situé au vent, il faut louvoyer - faire des bordees - a un angle d\'environ 45° par rapport au vent.',
    descriptionDe: 'Um einen Punkt gegen den Wind zu erreichen, musst du im Zickzack kreuzen - in Halsen - unter einem Winkel von etwa 45° zum Wind.',
    descriptionIt: 'Per raggiungere un punto controvento, devi navigare in zigzag - bolinare - con un angolo di circa 45° rispetto al vento.',
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
    titleEs: 'Cursos completos (movimiento a favor del viento)',
    titleFr: 'Cours complets (vent arriere)',
    titleDe: 'Vollständige Kurse (vor dem Wind)',
    titleIt: 'Corsi pieni (movimento sottovento)',
    descriptionRu: 'На полных курсах (бакштаг, фордевинд) яхта набирает скорость за счёт давления ветра на паруса.',
    descriptionEn: 'On downwind courses (broad reach, running), the boat gains speed from wind pressure on sails.',
    descriptionPl: 'Na kursach pelnych (baksztag, fordewind) jacht nabiera predkosci dzieki naporowi wiatru na zagle.',
    descriptionEs: 'En los cursos portantes (largo, popa) el velero gana velocidad gracias a la presión del viento sobre las velas.',
    descriptionFr: 'Sur les allures portantes (grand largue, vent arriere) le yacht gagne de la vitesse grace a la pression du vent sur les voiles.',
    descriptionDe: 'Bei Raumkurs und vor dem Wind baut die Yacht durch den Winddruck auf die Segel Geschwindigkeit auf.',
    descriptionIt: 'Sui corsi pieni (lasco, fil di ruota) lo yacht acquista velocita grazie alla pressione del vento sulle vele.',
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
    titleEs: 'Estrategia de salida',
    titleFr: 'Stratégie de départ',
    titleDe: 'Startstrategie',
    titleIt: 'Strategia di partenza',
    descriptionRu: 'Хороший старт - залог успеха в гонке. Нужно пересечь стартовую линию в момент сигнала на максимальной скорости.',
    descriptionEn: 'A good start is key to race success. Cross the start line at signal with maximum speed.',
    descriptionPl: 'Dobry start to klucz do sukcesu w regatach. Trzeba przekroczyc linie startu w momencie sygnalu z maksymalna predkoscia.',
    descriptionEs: 'Un buen comienzo es la clave del éxito en la regata. Debes cruzar la línea de salida en el momento de la señal a velocidad máxima.',
    descriptionFr: 'Un bon départ est la clé du succès en course. Il faut franchir la ligne de départ au signal à la vitesse maximale.',
    descriptionDe: 'Ein guter Start ist der Schlüssel zum Erfolg im Rennen. Du musst die Startlinie im Moment des Signals bei maximaler Geschwindigkeit überqueren.',
    descriptionIt: 'Un buon inizio è la chiave del successo in regata. Devi attraversare la linea di partenza al momento del segnale alla massima velocità.',
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
    titleEs: 'Circunnavegación de boyas',
    titleFr: 'Contournage des marques',
    titleDe: 'Markendurchfahrt',
    titleIt: 'Aggirare le boe',
    descriptionRu: 'Эффективное огибание знаков дистанции может выиграть или проиграть позиции в гонке.',
    descriptionEn: 'Efficient mark rounding can gain or lose positions in a race.',
    descriptionPl: 'Efektywne oplywanie znakow trasy moze wygrac lub przegrac pozycje w regatach.',
    descriptionEs: 'El redondeado eficiente de las boyas de distancia puede ganar o perder posiciones en la regata.',
    descriptionFr: 'L\'approche efficace des bouees de parcours peut gagner ou perdre des positions dans la course.',
    descriptionDe: 'Effizientes Runden der Bahnmarken kann in einem Rennen Positionen gewinnen oder verlieren.',
    descriptionIt: 'L\'aggancio efficace delle boe di percorso può guadagnare o perdere posizioni in regata.',
    tips: [
      { ru: 'Подходи широко, выходи узко - для оптимальной траектории', en: 'Approach wide, exit tight - for optimal trajectory', pl: 'Podchodz szeroko, wychodz waski - dla optymalnej trajektorii' },
      { ru: 'Перестрой паруса заранее, до знака', en: 'Adjust sails before reaching the mark', pl: 'Ustaw zagle wczesniej, przed dojsciem do znaku' },
      { ru: 'При сближении с другими яхтами - устанавливай связку заранее', en: 'When approaching with other boats - establish overlap early', pl: 'Przy zblizaniu z innymi jachtami - ustanawiaj overlap wczesniej' },
      { ru: 'Помни о правиле "места у знака" (3 корпуса)', en: 'Remember the mark room rule (3 boat-lengths)', pl: 'Pamietaj o zasadzie "miejsca przy znaku" (3 dlugosci kadluba)' },
    ],
  },
];
