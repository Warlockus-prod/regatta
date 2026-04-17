// ============================================================================
// Yacht anatomy - clickable parts.
// All positions are in a 1000x500 SVG viewBox for the side profile.
// ============================================================================

export interface AnatomyPart {
  id: string;
  nameRu: string;
  nameEn: string;
  /** Side-view hotspot (x, y) in viewBox coords */
  side: { x: number; y: number };
  /** Top-view hotspot (x, y) - optional */
  top?: { x: number; y: number };
  descRu: string;
  descEn: string;
  useOnBoardRu: string;
  useOnBoardEn: string;
}

export const anatomyParts: AnatomyPart[] = [
  {
    id: 'bow',
    nameRu: 'Нос',
    nameEn: 'Bow',
    side: { x: 160, y: 260 },
    top: { x: 500, y: 50 },
    descRu: 'Передняя часть яхты. На Bavaria 46 - наклонный форштевень, якорный рольганг.',
    descEn: 'Forward-most part. Bavaria 46 has a raked stem and an anchor roller.',
    useOnBoardRu: 'Направление «вперёд». Ходишь по палубе - одна рука всегда на леере.',
    useOnBoardEn: 'Forward direction. When walking the deck - one hand always on lifeline.',
  },
  {
    id: 'stern',
    nameRu: 'Корма',
    nameEn: 'Stern',
    side: { x: 820, y: 280 },
    top: { x: 500, y: 450 },
    descRu: 'Задняя часть. У Bavaria 46 - широкая транцевая платформа, часто с trap (ступенькой для купания).',
    descEn: 'Aft end. Bavaria 46 has a wide transom with bathing platform (swim steps).',
    useOnBoardRu: 'Место посадки на борт. Отсюда же ставишь якорь в корму на стоянке.',
    useOnBoardEn: 'Where you board. Also where the stern anchor drops in Med-style mooring.',
  },
  {
    id: 'mast',
    nameRu: 'Мачта',
    nameEn: 'Mast',
    side: { x: 420, y: 90 },
    top: { x: 500, y: 220 },
    descRu: 'Вертикальная опора парусов. На Bavaria 46 обычно алюминиевая фрак-риг ~18м.',
    descEn: 'Vertical spar holding the sails. Bavaria 46 usually has a ~18m aluminum fractional rig.',
    useOnBoardRu: 'Не прислоняйся под нагрузкой, не хватайся за ванты чтобы не сбить настройку.',
    useOnBoardEn: 'Don\'t lean on it under load, don\'t pull on shrouds - messes with tuning.',
  },
  {
    id: 'boom',
    nameRu: 'Гик',
    nameEn: 'Boom',
    side: { x: 490, y: 210 },
    descRu: 'Горизонтальная балка у основания грота. При поворотах фордевинд пересекает лодку.',
    descEn: 'Horizontal spar at the foot of the mainsail. Crosses the boat during jibes.',
    useOnBoardRu: 'ГЛАВНАЯ опасность на борту. Всегда знай где он. При команде «gybe-ho» - голову ниже гика.',
    useOnBoardEn: 'BIGGEST hazard. Always know where it is. On "jibe-ho" - head lower than the boom.',
  },
  {
    id: 'mainsail',
    nameRu: 'Грот',
    nameEn: 'Mainsail',
    side: { x: 450, y: 140 },
    descRu: 'Главный парус, крепится к мачте и гику.',
    descEn: 'Main sail, attached to mast and boom.',
    useOnBoardRu: 'Его угол управляется гротшкотом (mainsheet) из кокпита.',
    useOnBoardEn: 'Its angle is controlled by the mainsheet from the cockpit.',
  },
  {
    id: 'jib',
    nameRu: 'Стаксель',
    nameEn: 'Jib',
    side: { x: 290, y: 190 },
    descRu: 'Передний парус. На Bavaria 46 обычно 105% от J (размер треугольника передка).',
    descEn: 'Forward sail. On Bavaria 46 usually 105% of the J triangle.',
    useOnBoardRu: 'Управляется стаксель-шкотами (jib sheets), их два - работают по очереди через лебёдки.',
    useOnBoardEn: 'Controlled by jib sheets - two of them, alternating via winches.',
  },
  {
    id: 'shrouds',
    nameRu: 'Ванты',
    nameEn: 'Shrouds',
    side: { x: 420, y: 200 },
    descRu: 'Боковые тросы, удерживающие мачту. У Bavaria 46 - обычно двойные + lower shrouds.',
    descEn: 'Side wires holding the mast. Bavaria 46 usually has caps + lower shrouds.',
    useOnBoardRu: 'Не хватайся - они ТОЛЬКО держат мачту. Для страховки есть леера.',
    useOnBoardEn: 'Don\'t grab them - they only hold the mast. Use lifelines for safety.',
  },
  {
    id: 'forestay',
    nameRu: 'Штаг',
    nameEn: 'Forestay',
    side: { x: 290, y: 160 },
    descRu: 'Передний трос от верха мачты к носу. К нему крепится стаксель.',
    descEn: 'Forward wire from masthead to bow. Jib attaches to it.',
    useOnBoardRu: 'Не используй как опору - это рабочий элемент такелажа.',
    useOnBoardEn: 'Not a handhold - it\'s working rigging.',
  },
  {
    id: 'mainsheet',
    nameRu: 'Гротшкот',
    nameEn: 'Mainsheet',
    side: { x: 630, y: 280 },
    descRu: 'Снасть управления грота. Обычно тали из нескольких блоков.',
    descEn: 'Line controlling the mainsail. Usually a multi-part block and tackle.',
    useOnBoardRu: 'Когда «выбирай» - тяни к себе. Когда «трави» - давай уходить через руку, не руку через трос.',
    useOnBoardEn: 'On "trim" - pull it in. On "ease" - let it run through your hand, not your hand through the line.',
  },
  {
    id: 'jib-sheet',
    nameRu: 'Стаксель-шкот',
    nameEn: 'Jib sheet',
    side: { x: 540, y: 295 },
    descRu: 'Шкот стакселя, проходит через лебёдку.',
    descEn: 'Jib sheet, runs through a winch.',
    useOnBoardRu: 'На повороте рабочий шкот стравливается полностью, новый выбирается с рукояткой лебёдки.',
    useOnBoardEn: 'On a tack, working sheet releases fully, new one sheeted in with winch handle.',
  },
  {
    id: 'winch',
    nameRu: 'Лебёдка',
    nameEn: 'Winch',
    side: { x: 560, y: 285 },
    descRu: 'Круглый барабан для нагруженных шкотов. У Bavaria 46 обычно 4 winch в кокпите.',
    descEn: 'Drum for loaded sheets. Bavaria 46 typically has 4 cockpit winches.',
    useOnBoardRu: '3-4 оборота по часовой. Рукоятка (handle) вставляется сверху. Пальцы держи подальше от шкота.',
    useOnBoardEn: '3-4 clockwise wraps. Handle goes on top. Keep fingers away from the loaded sheet.',
  },
  {
    id: 'cleat',
    nameRu: 'Утка',
    nameEn: 'Cleat',
    side: { x: 750, y: 290 },
    descRu: 'Деталь для крепления концов.',
    descEn: 'Fitting for securing lines.',
    useOnBoardRu: 'Крепишь узлом на утку: шлаг + восьмёрки через рога + подвёрнутый хвост.',
    useOnBoardEn: 'Cleat hitch: one wrap + figure-eights over the horns + tucked tail.',
  },
  {
    id: 'rudder',
    nameRu: 'Руль',
    nameEn: 'Rudder',
    side: { x: 810, y: 400 },
    descRu: 'Подводный плавник. На Bavaria 46 - обычно два руля (twin rudders) для стабильности при крене.',
    descEn: 'Underwater blade. Bavaria 46 has twin rudders for heeled stability.',
    useOnBoardRu: 'Управляется штурвалом (wheel). В кокпите два - обычно используется подветренный.',
    useOnBoardEn: 'Controlled by the wheel. Two wheels - usually using the leeward one.',
  },
  {
    id: 'keel',
    nameRu: 'Киль',
    nameEn: 'Keel',
    side: { x: 480, y: 420 },
    descRu: 'Подводный плавник с грузом. Удерживает от опрокидывания и дрейфа. Bavaria 46 обычно 2.05м осадка.',
    descEn: 'Underwater fin with ballast. Prevents capsize and leeway. Bavaria 46 draft is usually 2.05m.',
    useOnBoardRu: 'Киль даёт крен, но возвращает яхту обратно. При сильном крене - откренивайся (hike).',
    useOnBoardEn: 'The keel lets boat heel but rights it back. In heavy heel - hike out.',
  },
  {
    id: 'fender',
    nameRu: 'Кранец',
    nameEn: 'Fender',
    side: { x: 610, y: 325 },
    descRu: 'Мягкий буфер между бортом и причалом/другим судном.',
    descEn: 'Soft buffer between hull and dock or other vessel.',
    useOnBoardRu: 'На выходе прячь, на швартовке выставляй с того борта, которым подходишь. Крепится выбленочным к лееру.',
    useOnBoardEn: 'Stow when sailing, deploy on approach side for docking. Attaches to lifeline with clove hitch.',
  },
  {
    id: 'wheel',
    nameRu: 'Штурвал',
    nameEn: 'Wheel',
    side: { x: 720, y: 260 },
    descRu: 'Рулевое колесо. У Bavaria 46 обычно ДВА штурвала - правый и левый в кокпите.',
    descEn: 'Steering wheel. Bavaria 46 usually has TWO wheels - port and starboard in cockpit.',
    useOnBoardRu: 'Шкипер использует подветренный штурвал (видит паруса и воду лучше). Никогда не стой между штурвалом и гикой.',
    useOnBoardEn: 'Skipper uses the leeward wheel (better view of sails and water). Never stand between wheel and boom.',
  },
  {
    id: 'cockpit',
    nameRu: 'Кокпит',
    nameEn: 'Cockpit',
    side: { x: 680, y: 255 },
    descRu: 'Рабочая и жилая зона на корме. У Bavaria 46 - просторный, с обеденным столом на качке опускаемым.',
    descEn: 'Working and living area aft. Bavaria 46 has a large cockpit with a drop-down dining table.',
    useOnBoardRu: 'Здесь вся работа со шкотами. Держись за обвес или стол если стоишь под парусами.',
    useOnBoardEn: 'All sheet work happens here. Hold onto the binnacle or table when standing under sail.',
  },
];
