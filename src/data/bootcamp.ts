// ============================================================================
// Bootcamp - guided learning path. 8 lessons, ~5 minutes each.
// Trilingual RU / EN / PL.
// Each lesson points to an existing section on the site + adds a short
// "focus this time" description.
// ============================================================================

import type { LegacyLocalized } from '@/lib/languages';

export type BootcampLesson =
  & LegacyLocalized<'title'>
  & LegacyLocalized<'summary'>
  & LegacyLocalized<'focus'>
  & {
    id: string;
    order: number;
    emoji: string;
    estMinutes: number;
    /** Route to open for this lesson */
    route: string;
  };

export const bootcampLessons: BootcampLesson[] = [
  {
    id: 'wind-direction',
    order: 1,
    emoji: '🌬',
    titleRu: 'Ветер и направление',
    titleEn: 'Wind & direction',
    titlePl: 'Wiatr i kierunek',
    summaryRu: 'Откуда дует, куда направлен. «Неходовая зона» - почему нельзя в лоб.',
    summaryEn: 'Where the wind comes from and where it goes. The no-go zone - why you can\'t sail straight at it.',
    summaryPl: 'Skad wieje, dokad sie kieruje. Strefa martwa - dlaczego nie mozna plynac wprost na wiatr.',
    estMinutes: 5,
    route: '/simulator',
    focusRu: 'Покрути ветер (потяни метку по кольцу). Посмотри где красный сектор - туда яхта идти не может.',
    focusEn: 'Rotate the wind (drag the marker on the outer ring). See the red sector - the boat can\'t sail there.',
    focusPl: 'Obroc wiatr (przeciagnij wskaznik na zewnetrznym kole). Zobacz czerwony sektor - tam jacht nie moze plynac.',
  },
  {
    id: 'points-of-sail',
    order: 2,
    emoji: '🧭',
    titleRu: 'Курсы относительно ветра',
    titleEn: 'Points of sail',
    titlePl: 'Kursy wzgledem wiatru',
    summaryRu: 'Левентик, бейдевинд, галфвинд, бакштаг, фордевинд. Твои 5 рабочих курсов.',
    summaryEn: 'In irons, close-hauled, beam reach, broad reach, running. Your 5 working points of sail.',
    summaryPl: 'Lewentik, bajdewind, polwiatr, baksztag, fordewind. Twoich 5 roboczych kursow.',
    estMinutes: 8,
    route: '/courses',
    focusRu: 'Нажми на каждый сектор диаграммы. Запомни соответствие русских и английских названий.',
    focusEn: 'Click each sector of the diagram. Note the Russian/English name pairs.',
    focusPl: 'Kliknij kazdy sektor diagramu. Zapamietaj odpowiedniki polsko-angielskie nazw.',
  },
  {
    id: 'how-sail-works',
    order: 3,
    emoji: '⛵',
    titleRu: 'Как работает парус',
    titleEn: 'How a sail works',
    titlePl: 'Jak dziala zagiel',
    summaryRu: 'На острых курсах парус - крыло (аэродинамическая тяга). На полных - парашют (давление).',
    summaryEn: 'On close courses the sail is a wing (lift). On downwind it\'s a parachute (pressure).',
    summaryPl: 'Na kursach ostrych zagiel to skrzydlo (sila nosna). Na pelnych to spadochron (cisnienie).',
    estMinutes: 4,
    route: '/simulator',
    focusRu: 'Крути яхту на разные курсы. Смотри как меняется угол паруса автоматически.',
    focusEn: 'Rotate the boat through different points of sail. Watch the sail angle change automatically.',
    focusPl: 'Obracaj jacht przez rozne kursy. Obserwuj jak kat zagla zmienia sie automatycznie.',
  },
  {
    id: 'tacking',
    order: 4,
    emoji: '↰',
    titleRu: 'Поворот оверштаг',
    titleEn: 'Tacking',
    titlePl: 'Zwrot przez sztag',
    summaryRu: 'Поворот через нос: нос проходит через линию ветра. Безопасный, но медленный.',
    summaryEn: 'Turn through the bow: the bow crosses the wind line. Safe but slow.',
    summaryPl: 'Zwrot przez dziob: dziob przechodzi przez linie wiatru. Bezpieczny, ale wolny.',
    estMinutes: 5,
    route: '/glossary',
    focusRu: 'Найди термин «Оверштаг» и прочитай объяснение. Потом посмотри как выглядит на диаграмме курсов.',
    focusEn: 'Find "Tacking" in the glossary and read the explanation. Then visualize it on the points-of-sail diagram.',
    focusPl: 'Znajdz "Zwrot przez sztag" w slowniku i przeczytaj wyjasnienie. Potem zobacz jak wyglada na diagramie kursow.',
  },
  {
    id: 'jibing',
    order: 5,
    emoji: '↱',
    titleRu: 'Поворот фордевинд',
    titleEn: 'Jibing (gybing)',
    titlePl: 'Zwrot przez rufe',
    summaryRu: 'Поворот через корму: гик резко перелетает. Быстрый, но опасный.',
    summaryEn: 'Turn through the stern: the boom swings across violently. Fast but dangerous.',
    summaryPl: 'Zwrot przez rufe: bom gwaltownie przeskakuje. Szybki, ale niebezpieczny.',
    estMinutes: 5,
    route: '/glossary',
    focusRu: 'Найди «Поворот фордевинд» в глоссарии. Пойми почему команда кричит «gybe-ho» заранее.',
    focusEn: 'Find "Jibing" in the glossary. Understand why the crew shouts "jibe-ho" in advance.',
    focusPl: 'Znajdz "Zwrot przez rufe" w slowniku. Zrozum dlaczego zaloga krzyczy "jibe-ho" z wyprzedzeniem.',
  },
  {
    id: 'vmg-beating',
    order: 6,
    emoji: '🎯',
    titleRu: 'Лавировка и VMG',
    titleEn: 'Beating and VMG',
    titlePl: 'Halsowanie i VMG',
    summaryRu: 'Чтобы дойти против ветра - идёшь галсами под ~45°. VMG = скорость в нужную сторону, а не просто скорость по воде.',
    summaryEn: 'To go upwind you zigzag at ~45°. VMG = speed toward your goal, not speed through water.',
    summaryPl: 'Zeby plynac pod wiatr - halsujesz pod katem ~45°. VMG = predkosc w kierunku celu, a nie tylko predkosc po wodzie.',
    estMinutes: 7,
    route: '/racing',
    focusRu: 'Посмотри раздел «Upwind strategy» и блок VMG. Это объясняет почему прямо к ветру не самая быстрая дорога.',
    focusEn: 'Check the "Upwind strategy" section and the VMG block. Explains why straight up isn\'t fastest.',
    focusPl: 'Sprawdz sekcje "Upwind strategy" i blok VMG. Wyjasnia dlaczego prosto pod wiatr nie jest najszybsza droga.',
  },
  {
    id: 'simple-rules',
    order: 7,
    emoji: '📖',
    titleRu: 'Простые правила',
    titleEn: 'Simple rules',
    titlePl: 'Proste zasady',
    summaryRu: '13 базовых ситуаций RRS + 8 сценариев МППСС-72. Галсы, обгон, знаки, столкновения.',
    summaryEn: '13 core RRS situations + 8 COLREGS scenarios. Tacks, overtaking, marks, collisions.',
    summaryPl: '13 podstawowych sytuacji RRS + 8 scenariuszy COLREGS. Halsy, wyprzedzanie, znaki, kolizje.',
    estMinutes: 10,
    route: '/rules',
    focusRu: 'Прочитай все карточки. После каждой - попытайся мысленно пересказать «кто кому уступает и почему».',
    focusEn: 'Read all cards. After each, try to mentally restate "who gives way, why".',
    focusPl: 'Przeczytaj wszystkie karty. Po kazdej sprobuj mysloeom powtorzyc "kto komu ustepuje i dlaczego".',
  },
  {
    id: 'mini-race',
    order: 8,
    emoji: '🏁',
    titleRu: 'Мини-гонка',
    titleEn: 'Mini race',
    titlePl: 'Mini wyscig',
    summaryRu: 'Всё вместе на практике. Попробуй на «Лёгком» уровне.',
    summaryEn: 'Everything together in practice. Try it on "Easy" level.',
    summaryPl: 'Wszystko razem w praktyce. Sprobuj na poziomie "Latwy".',
    estMinutes: 10,
    route: '/game',
    focusRu: 'Выбери Лёгкий, пройди одну гонку. Прочитай разбор AI-тренера в конце.',
    focusEn: 'Pick Easy, run one race. Read the AI coach\'s analysis at the end.',
    focusPl: 'Wybierz Latwy, przejdz jeden wyscig. Przeczytaj analize AI-trenera na koncu.',
  },
];

export const BOOTCAMP_TOTAL_MINUTES = bootcampLessons.reduce((sum, l) => sum + l.estMinutes, 0);

// ============================================================================
// Quick refresh - 15 min condensed path for experienced sailors
// ============================================================================

export type QuickLesson =
  & LegacyLocalized<'title'>
  & LegacyLocalized<'tip'>
  & {
    id: string;
    emoji: string;
    route: string;
    estMinutes: number;
  };

export const quickRefreshLessons: QuickLesson[] = [
  {
    id: 'q-wind',
    emoji: '🌬',
    titleRu: 'Ветер: 30 секунд',
    titleEn: 'Wind: 30 sec',
    titlePl: 'Wiatr: 30 sekund',
    tipRu: 'Где источник, где мёртвая зона. Всё.',
    tipEn: 'Where wind comes from, where is no-go. Done.',
    tipPl: 'Skad wieje, gdzie strefa martwa. Gotowe.',
    route: '/simulator',
    estMinutes: 1,
  },
  {
    id: 'q-courses',
    emoji: '🧭',
    titleRu: 'Курсы: 5 штук',
    titleEn: '5 points of sail',
    titlePl: '5 kursow wiatru',
    tipRu: 'Левентик / бейдевинд / галфвинд / бакштаг / фордевинд. Запомни в этом порядке.',
    tipEn: 'In-irons / close-hauled / beam reach / broad reach / running. Memorize in order.',
    tipPl: 'Lewentik / bajdewind / polwiatr / baksztag / fordewind. Zapamietaj w tej kolejnosci.',
    route: '/courses',
    estMinutes: 2,
  },
  {
    id: 'q-maneuvers',
    emoji: '↔️',
    titleRu: 'Повороты: оверштаг vs фордевинд',
    titleEn: 'Tack vs jibe',
    titlePl: 'Zwrot przez sztag vs zwrot przez rufe',
    tipRu: 'Оверштаг - нос через ветер. Фордевинд - корма. Второй опаснее (гик).',
    tipEn: 'Tack - bow through wind. Jibe - stern. The second is dangerous (boom).',
    tipPl: 'Zwrot przez sztag - dziob przez wiatr. Zwrot przez rufe - rufa. Drugi jest niebezpieczniejszy (bom).',
    route: '/glossary',
    estMinutes: 2,
  },
  {
    id: 'q-rules',
    emoji: '📖',
    titleRu: 'Топ-3 правила',
    titleEn: 'Top-3 rules',
    titlePl: 'Top-3 zasady',
    tipRu: 'Starboard > Port. Leeward > Windward. Избегай контакта.',
    tipEn: 'Starboard > Port. Leeward > Windward. Avoid contact.',
    tipPl: 'Starboard > Port. Leeward > Windward. Unikaj kontaktu.',
    route: '/rules',
    estMinutes: 3,
  },
  {
    id: 'q-start',
    emoji: '🏁',
    titleRu: 'Стартовая процедура',
    titleEn: 'Start sequence',
    titlePl: 'Procedura startu',
    tipRu: '5-4-1-start signals. Не раньше. Разгон. Чистый ветер.',
    tipEn: '5-4-1-start signals. Not early. Build speed. Clean air.',
    tipPl: '5-4-1-start signals. Nie za wczesnie. Rozped. Czysty wiatr.',
    route: '/racing',
    estMinutes: 2,
  },
  {
    id: 'q-race',
    emoji: '⛵',
    titleRu: 'Одна гонка с AI',
    titleEn: 'One race vs AI',
    titlePl: 'Jeden wyscig z AI',
    tipRu: 'Medium сложность. Посмотри разбор тренера.',
    tipEn: 'Medium difficulty. Check the coach analysis.',
    tipPl: 'Sredni poziom. Sprawdz analize trenera.',
    route: '/game',
    estMinutes: 5,
  },
];

export const QUICK_REFRESH_TOTAL_MINUTES = quickRefreshLessons.reduce((s, l) => s + l.estMinutes, 0);
