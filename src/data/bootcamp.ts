import { windDirectionPractice } from "./foundation-practice";
// ============================================================================
// Bootcamp - guided learning path. 8 lessons, ~5 minutes each.
// Seven languages: RU (source), EN, PL, ES, FR, DE, IT.
// Each lesson points to an existing section on the site + adds a short
// "focus this time" description.
// ============================================================================

import type { LegacyLocalized } from "../lib/languages";
import { NO_GO_HALF_DEG } from "../lib/sailing-physics/constants";
import { bootcampLessonHeads } from "./bootcamp-index";

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

// id, order, emoji and title of each lesson live in bootcamp-index.ts, so the
// root layout can name the current lesson without this file's lesson text.
const lessonHead = (id: string) => {
  const head = bootcampLessonHeads.find(lesson => lesson.id === id);
  if (!head) throw new Error(`Missing lesson head ${id}`);
  return head;
};

export const bootcampLessons: BootcampLesson[] = [
  {
    ...lessonHead('wind-direction'),
    summaryRu: 'Откуда дует ветер и куда. Мёртвая зона: почему нельзя идти прямо против ветра.',
    summaryEn: 'Where the wind comes from and where it goes. The no-go zone - why you can\'t sail straight at it.',
    summaryPl: 'Skąd wieje wiatr i dokąd. Kąt martwy: dlaczego nie da się płynąć prosto pod wiatr.',
    summaryEs: 'De dónde sopla el viento y hacia dónde va. La zona muerta: por qué no puedes ir directo contra él.',
    summaryFr: 'D\'où vient le vent et où il va. La zone morte : pourquoi on ne peut pas aller droit dedans.',
    summaryDe: 'Woher der Wind kommt und wohin er weht. Der tote Winkel: warum du nicht direkt gegen den Wind segeln kannst.',
    summaryIt: 'Da dove soffia il vento e dove va. L\'angolo morto: perché non puoi andare dritto controvento.',
    estMinutes: 5,
    route: windDirectionPractice.web,
    focusRu: windDirectionPractice.task.ru,
    focusEn: windDirectionPractice.task.en,
    focusPl: windDirectionPractice.task.pl,
    focusEs: windDirectionPractice.task.es,
    focusFr: windDirectionPractice.task.fr,
    focusDe: windDirectionPractice.task.de,
    focusIt: windDirectionPractice.task.it,
  },
  {
    ...lessonHead('points-of-sail'),
    summaryRu: 'Левентик, бейдевинд, галфвинд, бакштаг, фордевинд. Твои 5 рабочих курсов.',
    summaryEn: 'In irons, close-hauled, beam reach, broad reach, running. Your 5 working points of sail.',
    summaryPl: 'Łopot, bajdewind, półwiatr, baksztag, fordewind. Twoich 5 podstawowych kursów.',
    summaryEs: 'Proa al viento, ceñida, través, largo, popa. Tus 5 rumbos básicos.',
    summaryFr: 'Vent debout, près, travers, grand largue, vent arrière. Tes 5 allures de base.',
    summaryDe: 'Im Wind, hoch am Wind, halber Wind, raumer Wind, vor dem Wind. Deine 5 Grundkurse.',
    summaryIt: 'Prua al vento, bolina, traverso, lasco, poppa. Le tue 5 andature di base.',
    estMinutes: 8,
    route: '/simulator',
    focusRu: 'Открой симулятор «Основы» и прокрути яхту через все пять курсов. Следи, как меняются название курса и угол парусов, запомни соответствие русских и английских названий.',
    focusEn: 'Open the Basics simulator and steer the boat through all five points of sail. Watch the course name and sail angle change; memorize the name pairs.',
    focusPl: 'Otwórz symulator "Podstawy" i przeprowadź jacht przez wszystkie pięć kursów. Obserwuj, jak zmieniają się nazwa kursu i kąt żagli, i zapamiętaj pary nazw: polską i angielską.',
    focusEs: 'Abre el simulador "Fundamentos" y lleva el barco por los cinco rumbos. Fíjate en cómo cambian el nombre del rumbo y el ángulo de las velas, y memoriza cada nombre junto a su equivalente en inglés.',
    focusFr: 'Ouvre le simulateur "Bases" et fais passer le bateau par les cinq allures. Observe comment changent le nom de l\'allure et l\'angle des voiles, et retiens chaque nom avec son équivalent anglais.',
    focusDe: 'Öffne den Simulator "Grundlagen" und steuere das Boot durch alle fünf Kurse. Achte darauf, wie sich Kursname und Segelwinkel ändern, und merk dir die deutschen und englischen Namen als Paare.',
    focusIt: 'Apri il simulatore "Basi" e porta la barca attraverso tutte e cinque le andature. Osserva come cambiano il nome dell\'andatura e l\'angolo delle vele, e memorizza ogni nome con il suo equivalente inglese.',
  },
  {
    ...lessonHead('how-sail-works'),
    summaryRu: "От формы паруса и ветра зависит сила. Разделим тягу вперед, боковую силу и роль киля.",
    summaryEn: "Sail shape and wind determine the force. Separate forward drive, sideways force and the keel's role.",
    summaryPl: "Kształt żagla i wiatr wpływają na siłę. Rozróżnij napęd do przodu, siłę boczną i rolę kila.",
    summaryEs: "La forma de la vela y el viento determinan la fuerza. Distingue el avance, la fuerza lateral y el papel de la quilla.",
    summaryFr: "La forme de la voile et le vent déterminent la force. Distingue la propulsion, la force latérale et le rôle de la quille.",
    summaryDe: "Segelform und Wind bestimmen die Kraft. Unterscheide Vortrieb, Seitenkraft und die Rolle des Kiels.",
    summaryIt: "La forma della vela e il vento determinano la forza. Distingui la spinta in avanti, la forza laterale e il ruolo della chiglia.",
    estMinutes: 4,
    route: '/simulator-v3?drill=hold-trim',
    focusRu: 'Первая практика в «Тренажёре»: дрилл «Держи трим» запустится сам. Подбирай углы грота и стакселя, пока трим не дойдёт до 85%, и удержи его десять секунд - почувствуй, как угол паруса превращает поток в тягу.',
    focusEn: 'First hands-on practice: the "Hold trim" drill starts automatically in the Trainer. Sheet the main and jib until trim reaches 85% and hold it for ten seconds - feel how sail angle turns flow into pull.',
    focusPl: 'Pierwsza praktyka w "Trenażerze trymu": ćwiczenie "Utrzymaj trym" uruchomi się samo. Dobieraj kąty grota i foka, aż trym dojdzie do 85%, i utrzymaj go przez dziesięć sekund. Poczuj, jak kąt żagla zamienia przepływ powietrza w ciąg.',
    focusEs: 'Primera práctica en el "Simulador de trimado": el ejercicio "Mantén el trim" arranca solo. Ajusta los ángulos de la mayor y el foque hasta que el trim llegue al 85% y mantenlo diez segundos. Siente cómo el ángulo de la vela convierte el flujo en empuje.',
    focusFr: 'Première pratique dans le simulateur "Réglage des voiles" : l\'exercice "Maintiens le trim" démarre tout seul. Règle les angles de la grand-voile et du foc jusqu\'à 85% de trim, puis tiens-le dix secondes. Sens comment l\'angle de la voile transforme l\'écoulement de l\'air en traction.',
    focusDe: 'Erste Praxis im "Segeltrimm-Trainer": Die Übung "Halte den Trimm" startet von selbst. Stell Groß und Fock ein, bis der Trimm 85% erreicht, und halte ihn zehn Sekunden. Spür, wie der Segelwinkel die Strömung in Vortrieb verwandelt.',
    focusIt: 'Prima pratica nel simulatore "Regolazione delle vele": l\'esercizio "Tieni il trim" parte da solo. Regola randa e fiocco finché il trim arriva all\'85% e tienilo per dieci secondi. Senti come l\'angolo della vela trasforma il flusso d\'aria in spinta.',
  },
  {
    ...lessonHead('tacking'),
    summaryRu: 'Поворот через нос: нос проходит через линию ветра. Безопасный, но медленный.',
    summaryEn: 'Turn through the bow: the bow crosses the wind line. Safe but slow.',
    summaryPl: 'Zwrot dziobem: dziób przechodzi przez linię wiatru. Bezpieczny, ale wolny.',
    summaryEs: 'Virada por la proa: la proa cruza la línea del viento. Segura, pero lenta.',
    summaryFr: 'Virement par l\'avant : l\'étrave passe par le lit du vent. Sûr, mais lent.',
    summaryDe: 'Drehung über den Bug: Der Bug geht durch den Wind. Sicher, aber langsam.',
    summaryIt: 'Virata di prua: la prua attraversa la linea del vento. Sicura, ma lenta.',
    estMinutes: 5,
    route: '/checklist#maneuvers',
    focusRu: 'Найди раздел про повороты. Прочитай хореографию команды: что говорит шкипер, когда наклоняешь голову, что делают шкоты при оверштаге.',
    focusEn: 'Find the "turns" section. Read the crew choreography: what the skipper calls, when you duck your head, what the sheets do during a tack.',
    focusPl: 'Znajdź sekcję o zwrotach. Przeczytaj, jak pracuje załoga: co mówi skiper, kiedy pochylasz głowę, co dzieje się ze szotami przy zwrocie przez sztag.',
    focusEs: 'Busca la sección de viradas. Lee la coreografía de la tripulación: qué dice el patrón, cuándo agachas la cabeza, qué pasa con las escotas al virar por avante.',
    focusFr: 'Trouve la section sur les virements. Lis la chorégraphie de l\'équipage : ce que dit le skipper, quand baisser la tête, ce que font les écoutes pendant un virement de bord.',
    focusDe: 'Such den Abschnitt über Wende und Halse. Lies die Choreografie der Crew: was der Skipper ruft, wann du den Kopf einziehst, was die Schoten bei der Wende machen.',
    focusIt: 'Trova la sezione sulle virate. Leggi la coreografia dell\'equipaggio: cosa dice lo skipper, quando abbassi la testa, cosa fanno le scotte durante la virata.',
  },
  {
    ...lessonHead('jibing'),
    summaryRu: 'Поворот через корму: гик резко перелетает. Быстрый, но опасный.',
    summaryEn: 'Turn through the stern: the boom swings across violently. Fast but dangerous.',
    summaryPl: 'Zwrot rufą: bom gwałtownie przelatuje na drugą burtę. Szybki, ale niebezpieczny.',
    summaryEs: 'Virada por la popa: la botavara pasa de golpe. Rápida, pero peligrosa.',
    summaryFr: 'Virement par l\'arrière : la bôme bascule d\'un coup. Rapide, mais dangereux.',
    summaryDe: 'Drehung über das Heck: Der Baum kommt mit Wucht über. Schnell, aber gefährlich.',
    summaryIt: 'Virata di poppa: il boma passa di colpo. Veloce, ma pericolosa.',
    estMinutes: 5,
    route: '/checklist#maneuvers',
    focusRu: 'Тот же раздел про повороты. Сравни оверштаг и фордевинд: почему фордевинд опаснее, почему «gybe-ho» кричат заранее, почему голова обязательно ниже гика.',
    focusEn: 'Same "turns" section. Compare tacking and jibing: why jibing is more dangerous, why "jibe-ho" is shouted in advance, why your head must go below the boom.',
    focusPl: 'Ta sama sekcja o zwrotach. Porównaj zwrot przez sztag i zwrot przez rufę: dlaczego zwrot przez rufę jest groźniejszy, dlaczego "Zwrot przez rufę!" woła się zawczasu i dlaczego głowa musi być poniżej bomu.',
    focusEs: 'La misma sección de viradas. Compara virar por avante y trasluchar: por qué trasluchar es más peligroso, por qué se avisa "¡Trasluchamos!" con antelación y por qué la cabeza tiene que ir por debajo de la botavara.',
    focusFr: 'La même section sur les virements. Compare virement de bord et empannage : pourquoi l\'empannage est plus dangereux, pourquoi on annonce "Empannez !" à l\'avance, pourquoi la tête doit passer sous la bôme.',
    focusDe: 'Derselbe Abschnitt über Wende und Halse. Vergleiche beide: warum die Halse gefährlicher ist, warum "Rund achtern!" rechtzeitig gerufen wird und warum der Kopf unter den Baum muss.',
    focusIt: 'La stessa sezione sulle virate. Confronta virata e strambata: perché strambare è più pericoloso, perché si grida "Strambo!" in anticipo, perché la testa deve stare sotto il boma.',
  },
  {
    ...lessonHead('vmg-beating'),
    summaryRu: `Чтобы дойти против ветра - идёшь галсами под ~${NO_GO_HALF_DEG}°. VMG = скорость в нужную сторону, а не просто скорость по воде. Под ветер - то же самое: бакштаг (чуть острее фордевинда) часто быстрее к знаку, чем курс прямо по ветру.`,
    summaryEn: `To go upwind you zigzag at ~${NO_GO_HALF_DEG}°. VMG = speed toward your goal, not speed through water. Downwind it is the same: a broad reach (a bit hotter than a dead run) often reaches the mark faster than heading dead downwind.`,
    summaryPl: `Żeby dopłynąć pod wiatr, halsujesz pod kątem ~${NO_GO_HALF_DEG}°. VMG = prędkość w stronę celu, a nie sama prędkość po wodzie. Z wiatrem jest tak samo: baksztag (trochę ostrzej niż fordewind) często szybciej dowozi do znaku niż kurs prosto z wiatrem.`,
    summaryEs: `Para avanzar contra el viento das bordos a ~${NO_GO_HALF_DEG}°. VMG = velocidad hacia tu objetivo, no simplemente velocidad sobre el agua. En popa pasa lo mismo: un largo (un poco más orzado que la popa) suele llegar antes a la baliza que navegar en popa cerrada.`,
    summaryFr: `Pour remonter au vent, tu tires des bords à ~${NO_GO_HALF_DEG}°. VMG = vitesse vers ton objectif, pas simplement vitesse sur l'eau. Au portant, c'est pareil : un grand largue (un peu plus lofé que le vent arrière) atteint souvent la bouée plus vite que la route plein vent arrière.`,
    summaryDe: `Um gegen den Wind voranzukommen, kreuzt du unter ~${NO_GO_HALF_DEG}°. VMG = Geschwindigkeit in Richtung Ziel, nicht einfach Fahrt durchs Wasser. Vor dem Wind gilt dasselbe: Raumer Wind (etwas höher als platt vor dem Wind) bringt dich oft schneller zur Tonne als der direkte Kurs vor dem Wind.`,
    summaryIt: `Per risalire il vento bordeggi a ~${NO_GO_HALF_DEG}°. VMG = velocità verso l'obiettivo, non semplice velocità sull'acqua. In poppa è lo stesso: un lasco (un po' più orzato della poppa piena) spesso arriva alla boa prima che andare in poppa piena.`,
    estMinutes: 7,
    route: '/racing',
    focusRu: 'Посмотри раздел «Лавировка» и блок VMG. Они объясняют, почему прямо к ветру не самая быстрая дорога. То же правило и на полных курсах: VMG есть и вверх, и вниз по ветру.',
    focusEn: 'Check the "Upwind strategy" section and the VMG block. Explains why straight up isn\'t fastest. The same rule applies downwind: there is a VMG optimum both up and down.',
    focusPl: 'Zajrzyj do sekcji "Halsowanie" i do bloku VMG. Wyjaśniają, dlaczego prosto pod wiatr to nie najszybsza droga. Ta sama zasada działa na kursach pełnych: optymalne VMG istnieje i pod wiatr, i z wiatrem.',
    focusEs: 'Consulta la sección "Barloventear" y el bloque VMG. Explican por qué ir directo contra el viento no es el camino más rápido. La misma regla vale en los rumbos portantes: hay un VMG óptimo tanto ciñendo como en popa.',
    focusFr: 'Consulte la section "Louvoyer" et le bloc VMG. Ils expliquent pourquoi aller droit vers le vent n\'est pas le plus rapide. La même règle vaut au portant : il existe un VMG optimal au près comme au portant.',
    focusDe: 'Schau dir den Abschnitt "Kreuzen" und den VMG-Block an. Sie erklären, warum der direkte Weg gegen den Wind nicht der schnellste ist. Dieselbe Regel gilt auf raumen Kursen: Ein VMG-Optimum gibt es am Wind und vor dem Wind.',
    focusIt: 'Guarda la sezione "Bordeggiare" e il blocco VMG. Spiegano perché andare dritti controvento non è la strada più veloce. La stessa regola vale nelle andature portanti: esiste un VMG ottimale sia di bolina sia in poppa.',
  },
  {
    ...lessonHead('simple-rules'),
    summaryRu: '13 базовых ситуаций RRS + 8 сценариев МППСС-72. Галсы, обгон, знаки, столкновения.',
    summaryEn: '13 core RRS situations + 8 COLREGS scenarios. Tacks, overtaking, marks, collisions.',
    summaryPl: '13 podstawowych sytuacji z RRS + 8 scenariuszy MPZZM (COLREG). Halsy, wyprzedzanie, znaki, kolizje.',
    summaryEs: '13 situaciones básicas del RRS + 8 escenarios del RIPA (COLREG). Amuras, adelantamientos, balizas, abordajes.',
    summaryFr: '13 situations de base des règles de course (RRS) + 8 scénarios RIPAM (COLREG). Amures, dépassements, bouées, abordages.',
    summaryDe: '13 Grundsituationen der Wettfahrtregeln (RRS) + 8 Szenarien aus den KVR (COLREG). Steuerbord- und Backbordbug, Überholen, Bahnmarken, Kollisionen.',
    summaryIt: '13 situazioni base del RRS + 8 scenari COLREG. Mure, sorpasso, boe, collisioni.',
    estMinutes: 10,
    route: '/rules',
    focusRu: 'Прочитай все карточки. После каждой - попытайся мысленно пересказать «кто кому уступает и почему».',
    focusEn: 'Read all cards. After each, try to mentally restate "who gives way, why".',
    focusPl: 'Przeczytaj wszystkie karty. Po każdej spróbuj w myślach powiedzieć, "kto komu ustępuje i dlaczego".',
    focusEs: 'Lee todas las tarjetas. Después de cada una, intenta explicarte "quién cede el paso a quién y por qué".',
    focusFr: 'Lis toutes les cartes. Après chacune, essaie de te redire "qui doit s\'écarter de qui, et pourquoi".',
    focusDe: 'Lies alle Karten. Versuch nach jeder, dir selbst zu erklären, "wer wem ausweicht und warum".',
    focusIt: 'Leggi tutte le schede. Dopo ognuna prova a ripeterti "chi dà la precedenza a chi e perché".',
  },
  {
    ...lessonHead('mini-race'),
    summaryRu: 'Всё вместе на практике. Попробуй на «Лёгком» уровне.',
    summaryEn: 'Everything together in practice. Try it on "Easy" level.',
    summaryPl: 'Wszystko razem w praktyce. Spróbuj na poziomie "Łatwy".',
    summaryEs: 'Todo junto en la práctica. Pruébalo en el nivel "Fácil".',
    summaryFr: 'Tout ensemble, en pratique. Essaie au niveau "Facile".',
    summaryDe: 'Alles zusammen in der Praxis. Probier es auf der Stufe "Leicht".',
    summaryIt: 'Tutto insieme, in pratica. Prova al livello "Facile".',
    estMinutes: 10,
    route: '/game',
    focusRu: 'Выбери Лёгкий, пройди одну гонку. В конце прочитай разбор: что получилось и что исправить.',
    focusEn: 'Pick Easy, run one race. At the end, read the debrief: what went well and what to fix.',
    focusPl: 'Wybierz poziom "Łatwy" i przepłyń jeden wyścig. Na koniec przeczytaj omówienie: co się udało i co poprawić.',
    focusEs: 'Elige "Fácil" y haz una regata. Al final, lee el análisis: qué salió bien y qué corregir.',
    focusFr: 'Choisis "Facile" et fais une course. À la fin, lis le bilan : ce qui a marché et ce qu\'il faut corriger.',
    focusDe: 'Wähl "Leicht" und segle eine Wettfahrt. Lies am Ende die Auswertung: was gut lief und was du verbessern kannst.',
    focusIt: 'Scegli "Facile" e fai una regata. Alla fine leggi l\'analisi: cosa è andato bene e cosa correggere.',
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
    titleEs: 'Viento: 30 segundos',
    titleFr: 'Vent : 30 secondes',
    titleDe: 'Wind: 30 Sekunden',
    titleIt: 'Vento: 30 secondi',
    tipRu: 'Где источник, где мёртвая зона. Всё.',
    tipEn: 'Where wind comes from, where is no-go. Done.',
    tipPl: 'Skąd wieje, gdzie jest kąt martwy. Tyle.',
    tipEs: 'De dónde viene el viento y dónde está la zona muerta. Nada más.',
    tipFr: 'D\'où vient le vent, où est la zone morte. C\'est tout.',
    tipDe: 'Woher der Wind kommt, wo der tote Winkel liegt. Fertig.',
    tipIt: 'Da dove arriva il vento, dov\'è l\'angolo morto. Tutto qui.',
    route: '/simulator',
    estMinutes: 1,
  },
  {
    id: 'q-courses',
    emoji: '🧭',
    titleRu: 'Курсы: 5 штук',
    titleEn: '5 points of sail',
    titlePl: '5 kursów względem wiatru',
    titleEs: '5 rumbos',
    titleFr: '5 allures',
    titleDe: '5 Kurse zum Wind',
    titleIt: '5 andature',
    tipRu: 'Левентик / бейдевинд / галфвинд / бакштаг / фордевинд. Запомни в этом порядке.',
    tipEn: 'In-irons / close-hauled / beam reach / broad reach / running. Memorize in order.',
    tipPl: 'Łopot / bajdewind / półwiatr / baksztag / fordewind. Zapamiętaj w tej kolejności.',
    tipEs: 'Proa al viento / ceñida / través / largo / popa. Apréndelos en este orden.',
    tipFr: 'Vent debout / près / travers / grand largue / vent arrière. Retiens-les dans cet ordre.',
    tipDe: 'Im Wind / hoch am Wind / halber Wind / raumer Wind / vor dem Wind. Merk sie dir in dieser Reihenfolge.',
    tipIt: 'Prua al vento / bolina / traverso / lasco / poppa. Memorizzale in quest\'ordine.',
    route: '/courses',
    estMinutes: 2,
  },
  {
    id: 'q-maneuvers',
    emoji: '↔️',
    titleRu: 'Повороты: оверштаг vs фордевинд',
    titleEn: 'Tack vs jibe',
    titlePl: 'Zwrot przez sztag czy przez rufę',
    titleEs: 'Virar por avante o trasluchar',
    titleFr: 'Virement ou empannage',
    titleDe: 'Wende oder Halse',
    titleIt: 'Virata o strambata',
    tipRu: 'Оверштаг - нос через ветер. Фордевинд - корма. Второй опаснее (гик).',
    tipEn: 'Tack - bow through wind. Jibe - stern. The second is dangerous (boom).',
    tipPl: 'Zwrot przez sztag: dziób przez linię wiatru. Zwrot przez rufę: rufa. Ten drugi jest groźniejszy (bom).',
    tipEs: 'Virada por avante: la proa cruza el viento. Trasluchada: la popa. La segunda es más peligrosa (botavara).',
    tipFr: 'Virement de bord : l\'étrave passe le vent. Empannage : l\'arrière. Le second est plus dangereux (bôme).',
    tipDe: 'Wende: Bug durch den Wind. Halse: Heck durch den Wind. Die Halse ist gefährlicher (Baum).',
    tipIt: 'Virata: la prua passa il vento. Strambata: la poppa. La seconda è più pericolosa (boma).',
    route: '/checklist',
    estMinutes: 2,
  },
  {
    id: 'q-rules',
    emoji: '📖',
    titleRu: 'Топ-3 правила',
    titleEn: 'Top-3 rules',
    titlePl: '3 najważniejsze zasady',
    titleEs: 'Las 3 reglas clave',
    titleFr: 'Les 3 règles clés',
    titleDe: 'Die 3 wichtigsten Regeln',
    titleIt: 'Le 3 regole chiave',
    tipRu: 'Starboard > Port. Leeward > Windward. Избегай контакта.',
    tipEn: 'Starboard > Port. Leeward > Windward. Avoid contact.',
    tipPl: 'Prawy hals > lewy hals. Zawietrzny > nawietrzny. Unikaj kontaktu.',
    tipEs: 'Estribor > babor. Sotavento > barlovento. Evita el contacto.',
    tipFr: 'Tribord > bâbord. Sous le vent > au vent. Évite le contact.',
    tipDe: 'Steuerbord > Backbord. Lee > Luv. Vermeide Berührungen.',
    tipIt: 'Dritta > sinistra. Sottovento > sopravvento. Evita il contatto.',
    route: '/rules',
    estMinutes: 3,
  },
  {
    id: 'q-start',
    emoji: '🏁',
    titleRu: 'Стартовая процедура',
    titleEn: 'Start sequence',
    titlePl: 'Procedura startowa',
    titleEs: 'Procedimiento de salida',
    titleFr: 'Procédure de départ',
    titleDe: 'Startverfahren',
    titleIt: 'Procedura di partenza',
    tipRu: '5-4-1-start signals. Не раньше. Разгон. Чистый ветер.',
    tipEn: '5-4-1-start signals. Not early. Build speed. Clean air.',
    tipPl: 'Sygnały 5-4-1-start. Nie za wcześnie. Rozpęd. Czysty wiatr.',
    tipEs: 'Señales 5-4-1-salida. Nunca antes. Coge velocidad. Aire limpio.',
    tipFr: 'Signaux 5-4-1-départ. Pas avant. Prends de la vitesse. Vent clair.',
    tipDe: 'Signale 5-4-1-Start. Nicht zu früh. Fahrt aufnehmen. Freier Wind.',
    tipIt: 'Segnali 5-4-1-partenza. Non in anticipo. Prendi velocità. Aria pulita.',
    route: '/racing',
    estMinutes: 2,
  },
  {
    id: 'q-race',
    emoji: '⛵',
    titleRu: 'Одна гонка с AI',
    titleEn: 'One race vs AI',
    titlePl: 'Jeden wyścig z AI',
    titleEs: 'Una regata contra la IA',
    titleFr: 'Une course contre l\'IA',
    titleDe: 'Eine Wettfahrt gegen die KI',
    titleIt: 'Una regata contro l\'IA',
    tipRu: 'Medium сложность. Посмотри разбор тренера.',
    tipEn: 'Medium difficulty. Check the coach analysis.',
    tipPl: 'Poziom "Średni". Obejrzyj analizę trenera.',
    tipEs: 'Dificultad "Media". Mira el análisis del entrenador.',
    tipFr: 'Difficulté "Moyen". Regarde l\'analyse du coach.',
    tipDe: 'Stufe "Mittel". Schau dir die Analyse des Trainers an.',
    tipIt: 'Difficoltà "Media". Guarda l\'analisi dell\'allenatore.',
    route: '/game',
    estMinutes: 5,
  },
];

export const QUICK_REFRESH_TOTAL_MINUTES = quickRefreshLessons.reduce((s, l) => s + l.estMinutes, 0);
