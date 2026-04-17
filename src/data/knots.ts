// ============================================================================
// 6 essential knots for sailors
// Each knot: purpose + 4-6 step instructions + common mistake
// Steps are intentionally text-first; illustrations are simple SVGs matching each step.
// ============================================================================

export interface KnotStep {
  titleRu: string;
  titleEn: string;
  detailsRu: string;
  detailsEn: string;
}

export interface Knot {
  id: string;
  emoji: string;
  nameRu: string;
  nameEn: string;
  useRu: string;
  useEn: string;
  bavariaUseRu?: string; // where on Bavaria 46 specifically
  bavariaUseEn?: string;
  steps: KnotStep[];
  mistakeRu: string;
  mistakeEn: string;
}

export const knots: Knot[] = [
  {
    id: 'figure-eight',
    emoji: '8️⃣',
    nameRu: 'Восьмёрка (стопорный)',
    nameEn: 'Figure-eight (stopper)',
    useRu: 'На конце шкота или фала, чтобы тот не выскочил из блока или канала.',
    useEn: 'At the end of a sheet or halyard so it doesn\'t pull through a block or cleat.',
    bavariaUseRu: 'Обычно стоит на концах всех шкотов в кокпите Bavaria 46.',
    bavariaUseEn: 'Usually already tied at the end of every sheet in the Bavaria 46 cockpit.',
    steps: [
      {
        titleRu: 'Сделай петлю',
        titleEn: 'Form a loop',
        detailsRu: 'Возьми конец верёвки и сложи пополам - получилась петля.',
        detailsEn: 'Take the rope\'s end and fold it back on itself - you have a loop.',
      },
      {
        titleRu: 'Заведи хвост за себя',
        titleEn: 'Pass the tail behind',
        detailsRu: 'Короткий конец проведи сзади длинного.',
        detailsEn: 'Pass the short end behind the long end.',
      },
      {
        titleRu: 'И через петлю',
        titleEn: 'Through the loop',
        detailsRu: 'Протяни хвост через образовавшуюся петлю сверху вниз.',
        detailsEn: 'Thread the tail through the loop, top to bottom.',
      },
      {
        titleRu: 'Затяни',
        titleEn: 'Tighten',
        detailsRu: 'Потяни одновременно за оба конца - получится «восьмёрка». Оставь хвост ~10 см.',
        detailsEn: 'Pull both ends - you get a figure-eight. Leave a ~10 cm tail.',
      },
    ],
    mistakeRu: 'Сделать простой узел вместо восьмёрки - он будет туго развязываться под нагрузкой.',
    mistakeEn: 'Tying a simple overhand knot instead - it jams under load and is hard to untie.',
  },
  {
    id: 'bowline',
    emoji: '🪢',
    nameRu: 'Беседочный (bowline)',
    nameEn: 'Bowline',
    useRu: 'Непроскальзывающая петля на конце. Стандарт для привязки паруса, штормового лееера, спасконца.',
    useEn: 'A non-slipping loop. Standard for attaching a sail, storm line, throwing rope.',
    bavariaUseRu: 'На швартовах, соединении стакселя с штагом, на конце спасконца.',
    bavariaUseEn: 'On docklines, jib-to-forestay connection, end of a throw line.',
    steps: [
      {
        titleRu: '«Озеро, дерево, заяц»',
        titleEn: '"Rabbit, tree, hole"',
        detailsRu: 'Мнемоника: сделай маленькую петлю ("озеро"), длинный конец ("дерево"), короткий конец - "заяц".',
        detailsEn: 'Memo: small loop ("hole"), long end ("tree"), short end - "rabbit".',
      },
      {
        titleRu: 'Заяц выходит из озера',
        titleEn: 'Rabbit out of the hole',
        detailsRu: 'Короткий конец пропусти через маленькую петлю СНИЗУ ВВЕРХ.',
        detailsEn: 'Thread the short end UP through the small loop.',
      },
      {
        titleRu: 'Вокруг дерева',
        titleEn: 'Around the tree',
        detailsRu: 'Теперь обведи коротким концом длинный стоячий конец сзади.',
        detailsEn: 'Now wrap the short end around the long standing end behind.',
      },
      {
        titleRu: 'И обратно в озеро',
        titleEn: 'Back into the hole',
        detailsRu: 'Протяни короткий конец снова через маленькую петлю, теперь СВЕРХУ ВНИЗ.',
        detailsEn: 'Thread the short end back through the small loop, now DOWN.',
      },
      {
        titleRu: 'Затяни',
        titleEn: 'Tighten',
        detailsRu: 'Потяни за основную петлю и за стоячий конец. Хвост должен остаться ~10 см.',
        detailsEn: 'Pull the main loop and the standing end. Leave a ~10 cm tail.',
      },
    ],
    mistakeRu: 'Завернуть «зайца» не в ту сторону - получится не беседочный, а похожий, но скользящий узел. Проверяй: правильный беседочный узнаётся по перевёрнутой восьмёрке в центре.',
    mistakeEn: 'Wrapping the "rabbit" the wrong way gives a slip knot, not a bowline. Check: correct bowline looks like an inverted 8 in the middle.',
  },
  {
    id: 'cleat-hitch',
    emoji: '⚓',
    nameRu: 'Крепление на утку',
    nameEn: 'Cleat hitch',
    useRu: 'Закрепить конец на утке (причальная, мачтовая, на гике).',
    useEn: 'Secure a line to a cleat (dock, mast, boom).',
    bavariaUseRu: 'На всех швартовых утках Bavaria 46 - на носу, корме и миделе. На утках для ходовых концов в кокпите.',
    bavariaUseEn: 'On every mooring cleat of Bavaria 46 - bow, stern, midship. On cockpit cleats for working lines.',
    steps: [
      {
        titleRu: 'Обведи основание утки',
        titleEn: 'Wrap around the base',
        detailsRu: 'Один полный оборот вокруг основания (не рогов).',
        detailsEn: 'One full wrap around the base (not the horns).',
      },
      {
        titleRu: 'Восьмёрка через рога',
        titleEn: 'Figure-eight the horns',
        detailsRu: 'Делай восьмёрки через рога: под ближний рог, над дальним, снова под ближний. 2-3 восьмёрки.',
        detailsEn: 'Figure-eight around the horns: under the near horn, over the far, back under. 2-3 eights.',
      },
      {
        titleRu: 'Последняя петля - подвёрнута',
        titleEn: 'Last tuck - folded under',
        detailsRu: 'Последний виток заверни хвост ПОД последнюю петлю, чтобы она зажалась.',
        detailsEn: 'Tuck the tail UNDER the last loop so it\'s pinched.',
      },
      {
        titleRu: 'Чтобы не распускалось',
        titleEn: 'Security check',
        detailsRu: 'Потяни за хвост - должно держать. При рывке за основной конец узел не должен соскочить.',
        detailsEn: 'Pull on the tail - should hold. Yank the standing part - knot must not slip.',
      },
    ],
    mistakeRu: 'Слишком много восьмёрок (5+) - узел трудно распустить мокрыми руками в спешке.',
    mistakeEn: 'Too many figure-eights (5+) - hard to untie with wet hands in a hurry.',
  },
  {
    id: 'clove-hitch',
    emoji: '🔗',
    nameRu: 'Выбленочный (clove hitch)',
    nameEn: 'Clove hitch',
    useRu: 'Быстрое временное крепление на круглом объекте (леер, штаг, ветка).',
    useEn: 'Quick temporary attachment to a round object (lifeline, stanchion, branch).',
    bavariaUseRu: 'Крепить кранцы к леерам (Bavaria 46 имеет двойные леера по периметру).',
    bavariaUseEn: 'Tying fenders to lifelines (Bavaria 46 has double lifelines around the deck).',
    steps: [
      {
        titleRu: 'Один оборот',
        titleEn: 'First wrap',
        detailsRu: 'Обведи верёвку вокруг опоры один раз.',
        detailsEn: 'Wrap the rope around the post once.',
      },
      {
        titleRu: 'Второй оборот крест-накрест',
        titleEn: 'Second wrap crossing',
        detailsRu: 'Второй виток сделай так, чтобы он пересёк первый крест-накрест.',
        detailsEn: 'Second wrap goes across the first (crossing X).',
      },
      {
        titleRu: 'Хвост под вторую петлю',
        titleEn: 'Tuck under second loop',
        detailsRu: 'Проведи хвост ПОД вторую петлю и потяни.',
        detailsEn: 'Pass the tail UNDER the second loop and pull.',
      },
      {
        titleRu: 'Затяни',
        titleEn: 'Tighten',
        detailsRu: 'Затяни оба конца равномерно. Узел держится за счёт зажима между двумя витками.',
        detailsEn: 'Tighten both ends evenly. The knot holds by pinching between the two wraps.',
      },
    ],
    mistakeRu: 'Не пересечь первый оборот - тогда узел не зафиксируется и будет скользить.',
    mistakeEn: 'If the wraps don\'t cross, the knot slides and fails.',
  },
  {
    id: 'round-turn-two-half-hitches',
    emoji: '🔁',
    nameRu: 'Шлаг + два полуштыка',
    nameEn: 'Round turn + two half hitches',
    useRu: 'Крепление к кольцу, столбу, поручню когда нагрузка непостоянная.',
    useEn: 'Attachment to a ring, post, rail where load may change direction.',
    bavariaUseRu: 'Швартовка за кнехт или кольцо на причале, закрепление штормового якоря.',
    bavariaUseEn: 'Mooring to a bollard or ring, securing a storm anchor.',
    steps: [
      {
        titleRu: 'Два оборота (шлаг)',
        titleEn: 'Two full turns',
        detailsRu: 'Два полных оборота вокруг опоры. Это снимает нагрузку с узла.',
        detailsEn: 'Two full wraps around the post. This takes load off the knot.',
      },
      {
        titleRu: 'Первый полуштык',
        titleEn: 'First half hitch',
        detailsRu: 'Обведи хвост вокруг стоячего конца и проведи через свою же петлю. Это один полуштык.',
        detailsEn: 'Wrap the tail around the standing part and through its own loop. One half hitch.',
      },
      {
        titleRu: 'Второй полуштык',
        titleEn: 'Second half hitch',
        detailsRu: 'Повтори то же самое - ещё один полуштык.',
        detailsEn: 'Repeat - second half hitch.',
      },
      {
        titleRu: 'Затяни и проверь',
        titleEn: 'Tighten and check',
        detailsRu: 'Оба полуштыка должны быть в одну сторону. Проверь что хвост прижат.',
        detailsEn: 'Both half hitches should go the same way. Check the tail is pinned.',
      },
    ],
    mistakeRu: 'Сделать один шлаг вместо двух - узел меньше держит при рывках.',
    mistakeEn: 'Only one round turn - the knot takes more load and slips easier.',
  },
  {
    id: 'sheet-bend',
    emoji: '🪢',
    nameRu: 'Шкотовый (sheet bend)',
    nameEn: 'Sheet bend',
    useRu: 'Соединить два конца разной толщины или материала.',
    useEn: 'Join two ropes of different thickness or material.',
    bavariaUseRu: 'Удлинить короткий швартов, соединить буксировочный конец с линем.',
    bavariaUseEn: 'Extend a short dockline, join a tow line to a lighter line.',
    steps: [
      {
        titleRu: 'Петля на толстом конце',
        titleEn: 'Loop on the thicker rope',
        detailsRu: 'Сделай U-образную петлю на более толстом конце. Тонкий работает "вторым".',
        detailsEn: 'Make a U-shaped loop on the thicker rope. The thin one is the "worker".',
      },
      {
        titleRu: 'Тонкий пропусти снизу',
        titleEn: 'Thin rope up through',
        detailsRu: 'Проведи тонкий конец снизу вверх через петлю.',
        detailsEn: 'Pass the thin rope up through the loop.',
      },
      {
        titleRu: 'Вокруг петли',
        titleEn: 'Around the loop',
        detailsRu: 'Обведи тонким концом ОБЕ части петли снаружи (не между ними).',
        detailsEn: 'Wrap the thin rope around BOTH parts of the loop on the outside.',
      },
      {
        titleRu: 'Сам через себя',
        titleEn: 'Under itself',
        detailsRu: 'Проведи тонкий конец ПОД собой (под своим же входящим).',
        detailsEn: 'Tuck the thin end UNDER itself (under its own incoming part).',
      },
      {
        titleRu: 'Затяни одновременно',
        titleEn: 'Tighten together',
        detailsRu: 'Держи толстую петлю неподвижно, тяни тонкий конец. Оба хвоста должны оказаться с одной стороны.',
        detailsEn: 'Hold the thick loop, pull the thin rope. Both tails should end up on the same side.',
      },
    ],
    mistakeRu: 'Хвосты на разных сторонах - так узел ослаблен почти на 50%. Пересвяжи.',
    mistakeEn: 'Tails on opposite sides - about 50% weaker. Retie.',
  },
];
