/**
 * Bootcamp lesson quizzes. Each of the 8 lessons in
 * `mobile/src/data/bootcamp.json` has 2-3 multiple-choice questions
 * tied to the lesson's content. The screen renders one `<QuizCard>`
 * per question and tracks the result via `useBootcampQuiz()`.
 *
 * Shape:
 *   `lessonId -> Question[]`
 *
 * Each `Question` carries an `id` (stable, used as a React key), a
 * `prompt` (translated 7 ways), and 2-4 `options` of which exactly one
 * is `correct: true`. The `explanation` reads the why behind the
 * answer, shown after reveal.
 *
 * All copy is plain ASCII per `CLAUDE.md` typography rules - no
 * em-dashes, no curly quotes, no diacritic-only PL letters.
 */

import type { Lang } from '../i18n/languages';

/**
 * 7-language string map. Required: ru, en, pl. Optional: es, fr, de, it.
 * If a value is missing, the consumer falls back to en, then ru. Same
 * shape as the `tp()` extras, but stored as a record so we can serialise
 * test expectations.
 */
export type LocalizedPrompt = {
  ru: string;
  en: string;
  pl: string;
  es?: string;
  fr?: string;
  de?: string;
  it?: string;
};

export interface QuizOption {
  id: string;
  label: LocalizedPrompt;
  correct: boolean;
}

export interface QuizQuestion {
  id: string;
  prompt: LocalizedPrompt;
  options: QuizOption[];
  explanation: LocalizedPrompt;
}

export type QuizMap = Record<string, QuizQuestion[]>;

/** Resolve a localised string with the same fallback chain as `tp()`. */
export function pickPrompt(value: LocalizedPrompt, lang: Lang): string {
  switch (lang) {
    case 'ru':
      return value.ru;
    case 'pl':
      return value.pl;
    case 'es':
      return value.es ?? value.en;
    case 'fr':
      return value.fr ?? value.en;
    case 'de':
      return value.de ?? value.en;
    case 'it':
      return value.it ?? value.en;
    default:
      return value.en;
  }
}

/**
 * Static quiz bank. Counts:
 *   wind-direction:  3
 *   points-of-sail:  3
 *   how-sail-works:  2
 *   tacking:         2
 *   jibing:          2
 *   vmg-beating:     2
 *   simple-rules:    3
 *   mini-race:       2
 * Total: 19 questions across the 8 lessons.
 */
export const BOOTCAMP_QUIZZES: QuizMap = {
  'wind-direction': [
    {
      id: 'wd-q1',
      prompt: {
        ru: 'Что такое TWA?',
        en: 'What is TWA?',
        pl: 'Czym jest TWA?',
        es: 'Que es TWA?',
        fr: 'Qu\'est-ce que TWA?',
        de: 'Was ist TWA?',
        it: 'Cos\'e TWA?',
      },
      options: [
        {
          id: 'wd-q1-a',
          correct: true,
          label: {
            ru: 'Истинный угол к ветру (True Wind Angle)',
            en: 'True Wind Angle - the angle between the wind and the boat',
            pl: 'Prawdziwy kat do wiatru (True Wind Angle)',
            es: 'Angulo verdadero al viento (True Wind Angle)',
            fr: 'Angle vrai au vent (True Wind Angle)',
            de: 'Wahrer Windwinkel (True Wind Angle)',
            it: 'Angolo vero al vento (True Wind Angle)',
          },
        },
        {
          id: 'wd-q1-b',
          correct: false,
          label: {
            ru: 'Скорость яхты по воде в узлах',
            en: 'Boat speed through the water in knots',
            pl: 'Predkosc jachtu po wodzie w wezlach',
            es: 'Velocidad del barco por el agua en nudos',
            fr: 'Vitesse du bateau sur l\'eau en noeuds',
            de: 'Bootsgeschwindigkeit durch Wasser in Knoten',
            it: 'Velocita della barca sull\'acqua in nodi',
          },
        },
        {
          id: 'wd-q1-c',
          correct: false,
          label: {
            ru: 'Время оборота секундомера на старте',
            en: 'Stopwatch lap time at the start',
            pl: 'Czas okrazenia stopera na starcie',
            es: 'Tiempo de vuelta del cronometro al inicio',
            fr: 'Temps de tour du chrono au depart',
            de: 'Stoppuhr-Rundenzeit am Start',
            it: 'Tempo di giro del cronometro alla partenza',
          },
        },
      ],
      explanation: {
        ru: 'TWA - это угол между истинным направлением ветра и курсом яхты. По нему различают левентик, бейдевинд, галфвинд и т.д.',
        en: 'TWA is the angle between the true wind direction and the boat\'s heading. It distinguishes the points of sail (close-hauled, beam reach, etc.).',
        pl: 'TWA to kat miedzy prawdziwym kierunkiem wiatru a kursem jachtu. Definiuje kursy (bajdewind, polwiatr itd.).',
        es: 'TWA es el angulo entre la direccion real del viento y el rumbo del barco. Define los rumbos (cenida, traves, etc.).',
        fr: 'TWA est l\'angle entre la direction reelle du vent et le cap du bateau. Il definit les allures (au pres, travers, etc.).',
        de: 'TWA ist der Winkel zwischen der wahren Windrichtung und dem Bootskurs. Er bestimmt die Kurse (Am Wind, Halbwind usw.).',
        it: 'TWA e l\'angolo tra la direzione vera del vento e la rotta della barca. Definisce le andature (bolina, traverso, ecc.).',
      },
    },
    {
      id: 'wd-q2',
      prompt: {
        ru: 'Откуда дует ветер, когда яхта идёт бейдевиндом на TWA 45?',
        en: 'Where does the wind come from when sailing close-hauled at TWA 45?',
        pl: 'Skad wieje wiatr, gdy jacht plynie bajdewindem przy TWA 45?',
        es: 'De donde viene el viento al navegar de cenida a TWA 45?',
        fr: 'D\'ou vient le vent au pres a TWA 45?',
        de: 'Woher kommt der Wind beim Am-Wind-Kurs mit TWA 45?',
        it: 'Da dove viene il vento navigando di bolina a TWA 45?',
      },
      options: [
        {
          id: 'wd-q2-a',
          correct: false,
          label: {
            ru: 'Прямо в нос',
            en: 'Straight on the bow',
            pl: 'Prosto w dziob',
            es: 'Directo a la proa',
            fr: 'Droit dans l\'etrave',
            de: 'Direkt auf den Bug',
            it: 'Dritto sulla prua',
          },
        },
        {
          id: 'wd-q2-b',
          correct: true,
          label: {
            ru: 'Под углом 45° от носа',
            en: 'At 45 degrees off the bow',
            pl: 'Pod katem 45° od dziobu',
            es: 'A 45 grados de la proa',
            fr: 'A 45° de l\'etrave',
            de: 'In 45° vom Bug',
            it: 'A 45 gradi dalla prua',
          },
        },
        {
          id: 'wd-q2-c',
          correct: false,
          label: {
            ru: 'С кормы',
            en: 'From the stern',
            pl: 'Z rufy',
            es: 'Desde la popa',
            fr: 'De la poupe',
            de: 'Vom Heck',
            it: 'Da poppa',
          },
        },
      ],
      explanation: {
        ru: 'TWA измеряется от носа. На 45° яхта идёт самым острым курсом - бейдевиндом, на грани неходовой зоны.',
        en: 'TWA is measured from the bow. At 45 degrees the boat is on its closest possible point of sail - close-hauled, just outside the no-go zone.',
        pl: 'TWA mierzy sie od dziobu. Na 45° jacht plynie najostrzejszym kursem - bajdewindem, tuz przy strefie martwej.',
        es: 'TWA se mide desde la proa. A 45° el barco navega en el rumbo mas cenido posible, justo fuera de la zona muerta.',
        fr: 'TWA est mesure depuis l\'etrave. A 45° le bateau est au plus pres possible, juste en dehors de la zone morte.',
        de: 'TWA wird vom Bug gemessen. Bei 45° segelt das Boot am hoechsten moeglichen Kurs - hart am Wind, knapp ausserhalb der Totzone.',
        it: 'TWA si misura dalla prua. A 45° la barca naviga al piu stretto possibile, di bolina, appena fuori dalla zona morta.',
      },
    },
    {
      id: 'wd-q3',
      prompt: {
        ru: 'Что такое неходовая зона?',
        en: 'What is the no-go zone?',
        pl: 'Czym jest strefa martwa (no-go)?',
        es: 'Que es la zona muerta (no-go)?',
        fr: 'Qu\'est-ce que la zone morte (no-go)?',
        de: 'Was ist die Totzone (no-go)?',
        it: 'Cos\'e la zona morta (no-go)?',
      },
      options: [
        {
          id: 'wd-q3-a',
          correct: false,
          label: {
            ru: 'Зона без волн',
            en: 'A flat-water zone with no waves',
            pl: 'Strefa bez fal',
            es: 'Zona sin olas',
            fr: 'Zone sans vagues',
            de: 'Wellenfreie Zone',
            it: 'Zona senza onde',
          },
        },
        {
          id: 'wd-q3-b',
          correct: true,
          label: {
            ru: 'Сектор ~90° против ветра, где парус не работает',
            en: 'About 90 degrees facing the wind where the sail cannot generate drive',
            pl: 'Sektor ~90° pod wiatr, gdzie zagiel nie pracuje',
            es: 'Sector de ~90° contra el viento donde la vela no funciona',
            fr: 'Secteur ~90° face au vent ou la voile ne porte pas',
            de: 'Sektor von ca. 90° gegen den Wind, in dem das Segel keinen Vortrieb erzeugt',
            it: 'Settore di ~90° contro vento dove la vela non lavora',
          },
        },
        {
          id: 'wd-q3-c',
          correct: false,
          label: {
            ru: 'Запретная зона по правилам гонки',
            en: 'A racing-rule exclusion area near the start',
            pl: 'Strefa zakazana zgodnie z przepisami wyscigu',
            es: 'Zona prohibida por las reglas de la regata',
            fr: 'Zone interdite par les regles de course',
            de: 'Sperrzone nach den Wettfahrtregeln',
            it: 'Zona vietata dalle regole di regata',
          },
        },
      ],
      explanation: {
        ru: 'Парусная яхта не может идти прямо против ветра. Сектор примерно ±45° вокруг направления ветра - неходовой.',
        en: 'A sailboat cannot sail directly into the wind. The sector roughly +/-45 degrees around the wind direction is the no-go zone.',
        pl: 'Jacht nie moze plynac wprost na wiatr. Sektor okolo +/-45° wokol kierunku wiatru to strefa martwa.',
        es: 'Un velero no puede navegar directamente contra el viento. El sector de aproximadamente +/-45° alrededor del viento es la zona muerta.',
        fr: 'Un voilier ne peut pas naviguer droit dans le vent. Le secteur d\'environ +/-45° autour du vent est la zone morte.',
        de: 'Ein Segelboot kann nicht direkt gegen den Wind segeln. Der Sektor von ca. +/-45° um die Windrichtung ist die Totzone.',
        it: 'Una barca a vela non puo navigare dritto contro il vento. Il settore di circa +/-45° attorno al vento e la zona morta.',
      },
    },
  ],

  'points-of-sail': [
    {
      id: 'pos-q1',
      prompt: {
        ru: 'На каком курсе яхта обычно идёт быстрее всего по плоской воде?',
        en: 'Which point of sail is fastest in flat water?',
        pl: 'Na ktorym kursie jacht zwykle plynie najszybciej po plaskiej wodzie?',
        es: 'Que rumbo es mas rapido en agua plana?',
        fr: 'Quelle allure est la plus rapide sur eau plate?',
        de: 'Welcher Kurs ist auf glattem Wasser am schnellsten?',
        it: 'Quale andatura e la piu veloce in acqua piatta?',
      },
      options: [
        {
          id: 'pos-q1-a',
          correct: false,
          label: {
            ru: 'Левентик (прямо в ветер)',
            en: 'In irons (head to wind)',
            pl: 'Lewentik (prosto w wiatr)',
            es: 'En facha (de proa al viento)',
            fr: 'Vent debout',
            de: 'Im Wind',
            it: 'In panna (prua al vento)',
          },
        },
        {
          id: 'pos-q1-b',
          correct: true,
          label: {
            ru: 'Бакштаг (broad reach), TWA ~135°',
            en: 'Broad reach, TWA around 135 degrees',
            pl: 'Baksztag (broad reach), TWA okolo 135°',
            es: 'Largo (broad reach), TWA ~135°',
            fr: 'Grand largue, TWA ~135°',
            de: 'Raumwind, TWA ~135°',
            it: 'Lasco (broad reach), TWA ~135°',
          },
        },
        {
          id: 'pos-q1-c',
          correct: false,
          label: {
            ru: 'Бейдевинд (close-hauled), TWA ~45°',
            en: 'Close-hauled, TWA around 45 degrees',
            pl: 'Bajdewind (close-hauled), TWA okolo 45°',
            es: 'Cenida (close-hauled), TWA ~45°',
            fr: 'Au pres, TWA ~45°',
            de: 'Am Wind, TWA ~45°',
            it: 'Bolina (close-hauled), TWA ~45°',
          },
        },
      ],
      explanation: {
        ru: 'На бакштаге парус работает с максимальной полной тягой и мало сопротивления. Прямой фордевинд медленнее: парус загораживает сам себя.',
        en: 'On a broad reach the sail produces maximum drive with low drag. A dead run is slower because the sail blankets itself.',
        pl: 'Na baksztagu zagiel daje pelna sile przy malym oporze. Czysty fordewind jest wolniejszy: zagiel zaslania sam siebie.',
        es: 'A un largo la vela genera maxima traccion con poca resistencia. La popa pura es mas lenta: la vela se tapa a si misma.',
        fr: 'Au grand largue la voile donne sa puissance maximum avec peu de trainee. Le vent arriere est plus lent car la voile se masque.',
        de: 'Bei Raumwind erzeugt das Segel maximalen Vortrieb bei geringem Widerstand. Vor dem Wind ist es langsamer, weil sich das Segel selbst abdeckt.',
        it: 'Al lasco la vela genera massima spinta con poca resistenza. In poppa puro e piu lento: la vela si copre da sola.',
      },
    },
    {
      id: 'pos-q2',
      prompt: {
        ru: 'Что такое неходовая зона относительно курсов?',
        en: 'How does the no-go zone relate to points of sail?',
        pl: 'Czym jest strefa martwa wzgledem kursow?',
        es: 'Como se relaciona la zona muerta con los rumbos?',
        fr: 'Comment la zone morte se rapporte-t-elle aux allures?',
        de: 'Wie verhaelt sich die Totzone zu den Kursen?',
        it: 'Come si rapporta la zona morta alle andature?',
      },
      options: [
        {
          id: 'pos-q2-a',
          correct: true,
          label: {
            ru: 'Сектор острее бейдевинда: ~45° по обе стороны от ветра',
            en: 'The sector tighter than close-hauled: about 45 degrees each side of the wind',
            pl: 'Sektor ostrzejszy od bajdewindu: ~45° po obu stronach wiatru',
            es: 'Sector mas cerrado que la cenida: ~45° a cada lado del viento',
            fr: 'Secteur plus serre que le pres: ~45° de chaque cote du vent',
            de: 'Bereich noch enger als Am Wind: ca. 45° beidseitig zum Wind',
            it: 'Settore piu stretto della bolina: ~45° per lato rispetto al vento',
          },
        },
        {
          id: 'pos-q2-b',
          correct: false,
          label: {
            ru: 'Сектор сразу после фордевинда',
            en: 'The sector right after a dead run',
            pl: 'Sektor zaraz po fordewindzie',
            es: 'El sector justo despues de la popa',
            fr: 'Le secteur juste apres le vent arriere',
            de: 'Der Sektor direkt nach dem Vor-dem-Wind-Kurs',
            it: 'Il settore subito dopo la poppa',
          },
        },
        {
          id: 'pos-q2-c',
          correct: false,
          label: {
            ru: 'Любой курс ночью',
            en: 'Any point of sail at night',
            pl: 'Kazdy kurs w nocy',
            es: 'Cualquier rumbo de noche',
            fr: 'N\'importe quelle allure la nuit',
            de: 'Jeder Kurs bei Nacht',
            it: 'Qualsiasi andatura di notte',
          },
        },
      ],
      explanation: {
        ru: 'Чтобы идти к ветру, надо лавировать (зигзаг через бейдевинд). В неходовой зоне парус не наполняется и яхта теряет ход.',
        en: 'To go upwind you have to zigzag (tack through close-hauled). Inside the no-go zone the sail luffs and the boat stops.',
        pl: 'Zeby plynac pod wiatr, trzeba halsowac (zygzak przez bajdewind). W strefie martwej zagiel nie pracuje i jacht traci ped.',
        es: 'Para ir contra el viento hay que dar bordadas (zigzag por la cenida). En la zona muerta la vela flamea y el barco se para.',
        fr: 'Pour remonter au vent il faut louvoyer (zigzag au pres). Dans la zone morte la voile faseye et le bateau s\'arrete.',
        de: 'Um nach Luv zu segeln musst du kreuzen (Zickzack am Wind). In der Totzone killt das Segel und das Boot bleibt stehen.',
        it: 'Per risalire il vento bisogna bordeggiare (zigzag in bolina). Nella zona morta la vela fileggia e la barca si ferma.',
      },
    },
    {
      id: 'pos-q3',
      prompt: {
        ru: 'Какой курс называется галфвинд (beam reach)?',
        en: 'Which point of sail is called the beam reach?',
        pl: 'Ktory kurs nazywa sie polwiatr (beam reach)?',
        es: 'Que rumbo se llama traves (beam reach)?',
        fr: 'Quelle allure s\'appelle vent de travers (beam reach)?',
        de: 'Welcher Kurs heisst Halbwind (beam reach)?',
        it: 'Quale andatura si chiama traverso (beam reach)?',
      },
      options: [
        {
          id: 'pos-q3-a',
          correct: false,
          label: {
            ru: 'Ветер прямо в нос',
            en: 'Wind straight on the bow',
            pl: 'Wiatr prosto w dziob',
            es: 'Viento directo a la proa',
            fr: 'Vent droit sur l\'etrave',
            de: 'Wind direkt von vorn',
            it: 'Vento dritto sulla prua',
          },
        },
        {
          id: 'pos-q3-b',
          correct: true,
          label: {
            ru: 'Ветер прямо с борта (TWA ~90°)',
            en: 'Wind directly from the side, TWA ~90 degrees',
            pl: 'Wiatr prosto z burty (TWA ~90°)',
            es: 'Viento directamente del costado (TWA ~90°)',
            fr: 'Vent droit par le travers (TWA ~90°)',
            de: 'Wind genau von der Seite (TWA ~90°)',
            it: 'Vento dritto dal traverso (TWA ~90°)',
          },
        },
        {
          id: 'pos-q3-c',
          correct: false,
          label: {
            ru: 'Ветер прямо с кормы',
            en: 'Wind straight from astern',
            pl: 'Wiatr prosto z rufy',
            es: 'Viento directo desde la popa',
            fr: 'Vent droit de l\'arriere',
            de: 'Wind direkt von achtern',
            it: 'Vento dritto da poppa',
          },
        },
      ],
      explanation: {
        ru: 'Галфвинд - ветер строго перпендикулярно борту. Один из самых быстрых и стабильных курсов для большинства яхт.',
        en: 'A beam reach is wind exactly across the side of the boat. One of the fastest and most stable points of sail for most boats.',
        pl: 'Polwiatr to wiatr prostopadle do burty. Jeden z najszybszych i najbardziej stabilnych kursow dla wiekszosci jachtow.',
        es: 'El traves es viento perpendicular al costado. Es uno de los rumbos mas rapidos y estables para la mayoria de barcos.',
        fr: 'Le travers est un vent exactement par le travers. C\'est l\'une des allures les plus rapides et stables pour la plupart des voiliers.',
        de: 'Halbwind heisst Wind exakt querab. Einer der schnellsten und stabilsten Kurse fuer die meisten Boote.',
        it: 'Il traverso e vento esattamente al traverso della barca. E una delle andature piu veloci e stabili per la maggior parte delle barche.',
      },
    },
  ],

  'how-sail-works': [
    {
      id: 'hs-q1',
      prompt: {
        ru: 'Где на парусе генерируется наибольшая подъёмная сила (lift)?',
        en: 'Where on the sail is the most lift generated?',
        pl: 'Gdzie na zaglu generuje sie najwieksza sila nosna (lift)?',
        es: 'Donde de la vela se genera mas sustentacion (lift)?',
        fr: 'Ou sur la voile se genere le plus de portance (lift)?',
        de: 'Wo am Segel entsteht der meiste Auftrieb (lift)?',
        it: 'Dove sulla vela si genera maggior portanza (lift)?',
      },
      options: [
        {
          id: 'hs-q1-a',
          correct: true,
          label: {
            ru: 'У передней (наветренной) шкаторины - там, где воздух обтекает парус',
            en: 'Near the leading edge (luff) where air bends around the sail',
            pl: 'Przy przedniej (nawietrznej) liku - tam, gdzie powietrze oplywa zagiel',
            es: 'Cerca del borde de ataque (gratil) donde el aire rodea la vela',
            fr: 'Pres du bord d\'attaque (guindant) ou l\'air contourne la voile',
            de: 'Nahe der Vorderkante (Vorliek), wo die Luft das Segel umstroemt',
            it: 'Vicino al bordo d\'attacco (inferitura) dove l\'aria curva attorno alla vela',
          },
        },
        {
          id: 'hs-q1-b',
          correct: false,
          label: {
            ru: 'На задней шкаторине у самого гика',
            en: 'At the trailing edge (leech) by the boom',
            pl: 'Na tylnej liku przy bomie',
            es: 'En el borde de salida (baluma) junto a la botavara',
            fr: 'Sur le bord de fuite (chute) pres de la bome',
            de: 'An der Hinterkante (Achterliek) am Baum',
            it: 'Sul bordo d\'uscita (balumina) vicino al boma',
          },
        },
        {
          id: 'hs-q1-c',
          correct: false,
          label: {
            ru: 'В точке крепления к мачте у топа',
            en: 'At the head, where the sail meets the mast top',
            pl: 'W punkcie mocowania do masztu na topie',
            es: 'En el punto de amarre al mastil en la cabeza',
            fr: 'Au point de fixation a la tete de mat',
            de: 'Am Kopf, wo das Segel an der Mastspitze sitzt',
            it: 'Nel punto di attacco alla testa d\'albero',
          },
        },
      ],
      explanation: {
        ru: 'Парус работает как крыло: воздух разделяется на передней шкаторине, обтекает выпуклую сторону быстрее, создаёт разрежение и тянет яхту.',
        en: 'A sail works like a wing: air splits at the leading edge, accelerates over the curved side, creates low pressure, and pulls the boat forward.',
        pl: 'Zagiel pracuje jak skrzydlo: powietrze dzieli sie na przedniej liku, oplywa wypukla strone szybciej, tworzy podcisnienie i ciagnie jacht.',
        es: 'La vela funciona como un ala: el aire se divide en el borde de ataque, acelera sobre la cara curva, crea baja presion y empuja al barco.',
        fr: 'La voile fonctionne comme une aile: l\'air se divise au bord d\'attaque, accelere sur la face convexe, cree une depression et tire le bateau.',
        de: 'Das Segel arbeitet wie ein Fluegel: Die Luft teilt sich an der Vorderkante, beschleunigt ueber die gewoelbte Seite, erzeugt Unterdruck und zieht das Boot.',
        it: 'La vela funziona come un\'ala: l\'aria si divide al bordo d\'attacco, accelera sul lato convesso, crea bassa pressione e tira la barca.',
      },
    },
    {
      id: 'hs-q2',
      prompt: {
        ru: 'В какую сторону движется гик (boom), когда вы потравливаете гика-шкот?',
        en: 'Which way does the boom move when easing the mainsheet?',
        pl: 'W ktora strone porusza sie bom, gdy luzujesz szkot grota?',
        es: 'Hacia donde se mueve la botavara al cazar la escota mayor?',
        fr: 'Dans quel sens la bome bouge-t-elle quand on choque l\'ecoute de grand-voile?',
        de: 'Wohin bewegt sich der Baum, wenn die Grossschot gefiert wird?',
        it: 'In che direzione si muove il boma quando si lasca la randa?',
      },
      options: [
        {
          id: 'hs-q2-a',
          correct: false,
          label: {
            ru: 'К центру яхты',
            en: 'Toward the centerline',
            pl: 'W kierunku osi jachtu',
            es: 'Hacia la linea central',
            fr: 'Vers l\'axe du bateau',
            de: 'Zur Mittellinie',
            it: 'Verso l\'asse della barca',
          },
        },
        {
          id: 'hs-q2-b',
          correct: true,
          label: {
            ru: 'От центра, наружу борта',
            en: 'Away from the centerline, outboard',
            pl: 'Od osi, na zewnatrz burty',
            es: 'Lejos de la linea central, hacia afuera',
            fr: 'Loin de l\'axe, vers l\'exterieur',
            de: 'Von der Mittellinie weg, nach aussen',
            it: 'Lontano dall\'asse, verso fuori',
          },
        },
        {
          id: 'hs-q2-c',
          correct: false,
          label: {
            ru: 'Вверх к мачте',
            en: 'Upward toward the mast',
            pl: 'W gore do masztu',
            es: 'Hacia arriba al mastil',
            fr: 'Vers le haut vers le mat',
            de: 'Nach oben Richtung Mast',
            it: 'Verso l\'alto verso l\'albero',
          },
        },
      ],
      explanation: {
        ru: 'Шкот удерживает гик ближе к диаметральной плоскости. Потравить = ослабить шкот, и гик уходит наружу под действием ветра.',
        en: 'The sheet holds the boom closer to the centerline. Easing the sheet lets it swing outboard under the wind.',
        pl: 'Szkot trzyma bom blizej osi. Luzowanie pozwala mu odejsc na zewnatrz pod wplywem wiatru.',
        es: 'La escota mantiene la botavara cerca de la linea central. Al cazar suelta y el viento la lleva hacia afuera.',
        fr: 'L\'ecoute maintient la bome pres de l\'axe. La choquer la laisse pivoter vers l\'exterieur sous l\'effet du vent.',
        de: 'Die Schot haelt den Baum naeher zur Mittellinie. Fieren laesst ihn unter dem Wind nach aussen schwingen.',
        it: 'La scotta tiene il boma piu vicino all\'asse. Lascarla lo lascia ruotare fuori bordo per effetto del vento.',
      },
    },
  ],

  tacking: [
    {
      id: 'tk-q1',
      prompt: {
        ru: 'Какая команда подаётся первой перед поворотом оверштаг?',
        en: 'What is the first command before tacking?',
        pl: 'Jaka komenda pada jako pierwsza przed zwrotem przez sztag?',
        es: 'Cual es la primera orden antes de virar por avante?',
        fr: 'Quel est le premier ordre avant de virer de bord?',
        de: 'Welches Kommando kommt zuerst vor einer Wende?',
        it: 'Qual e il primo comando prima di una virata di prua?',
      },
      options: [
        {
          id: 'tk-q1-a',
          correct: true,
          label: {
            ru: '«Готовы к повороту?» / "Ready about?"',
            en: '"Ready about?" - to ask the crew to prepare',
            pl: '«Gotowi do zwrotu?» / "Ready about?"',
            es: '«Listos para virar?» / "Ready about?"',
            fr: '«Pares a virer?» / "Ready about?"',
            de: '«Klar zur Wende?» / "Ready about?"',
            it: '«Pronti a virare?» / "Ready about?"',
          },
        },
        {
          id: 'tk-q1-b',
          correct: false,
          label: {
            ru: '«Травить шкоты!» / "Ease the sheets!"',
            en: '"Ease the sheets!"',
            pl: '«Luzowac szkoty!»',
            es: '«Largar escotas!»',
            fr: '«Choquer les ecoutes!»',
            de: '«Schoten fieren!»',
            it: '«Lascare le scotte!»',
          },
        },
        {
          id: 'tk-q1-c',
          correct: false,
          label: {
            ru: '«Поворот!» / "Helm\'s a-lee!"',
            en: '"Helm\'s a-lee!" - that\'s the execution call, not the first one',
            pl: '«Zwrot!» / "Helm\'s a-lee!"',
            es: '«Cambio!» / "Helm\'s a-lee!"',
            fr: '«La barre dessous!» / "Helm\'s a-lee!"',
            de: '«Ree!» / "Helm\'s a-lee!"',
            it: '«Pronti barra!» / "Helm\'s a-lee!"',
          },
        },
      ],
      explanation: {
        ru: 'Сначала «Ready about?» (готовность), потом «Helm\'s a-lee!» (поехали). Команда успевает занять позиции и взяться за шкоты.',
        en: 'First "Ready about?" (prepare), then "Helm\'s a-lee!" (go). The crew has time to take positions and grab the sheets.',
        pl: 'Najpierw «Ready about?» (gotowosc), potem «Helm\'s a-lee!» (wykonanie). Zaloga ma czas zajac pozycje i chwycic szkoty.',
        es: 'Primero «Ready about?» (preparar), luego «Helm\'s a-lee!» (ejecutar). La tripulacion se coloca y agarra las escotas.',
        fr: 'D\'abord «Ready about?» (preparation), puis «Helm\'s a-lee!» (execution). L\'equipage se place et saisit les ecoutes.',
        de: 'Erst «Ready about?» (vorbereiten), dann «Helm\'s a-lee!» (ausfuehren). Die Crew geht in Position und nimmt die Schoten.',
        it: 'Prima «Ready about?» (preparazione), poi «Helm\'s a-lee!» (esecuzione). L\'equipaggio si posiziona e prende le scotte.',
      },
    },
    {
      id: 'tk-q2',
      prompt: {
        ru: 'Через что проходит нос яхты во время поворота оверштаг?',
        en: 'What does the bow pass through during a tack?',
        pl: 'Przez co przechodzi dziob jachtu podczas zwrotu przez sztag?',
        es: 'Que cruza la proa durante una virada por avante?',
        fr: 'Par quoi passe l\'etrave lors d\'un virement de bord?',
        de: 'Wodurch geht der Bug bei einer Wende?',
        it: 'Cosa attraversa la prua durante una virata di prua?',
      },
      options: [
        {
          id: 'tk-q2-a',
          correct: true,
          label: {
            ru: 'Через линию ветра (нос пересекает направление, откуда дует)',
            en: 'Through the wind line - the bow crosses the wind direction',
            pl: 'Przez linie wiatru (dziob przechodzi przez kierunek wiatru)',
            es: 'Por la linea del viento (la proa cruza la direccion del viento)',
            fr: 'Par la ligne du vent (l\'etrave traverse l\'axe du vent)',
            de: 'Durch die Windlinie (der Bug kreuzt die Windrichtung)',
            it: 'Attraverso la linea del vento (la prua attraversa la direzione del vento)',
          },
        },
        {
          id: 'tk-q2-b',
          correct: false,
          label: {
            ru: 'Через корму - корма проходит через ветер',
            en: 'Through the stern - the stern crosses the wind',
            pl: 'Przez rufe - to rufa przechodzi przez wiatr',
            es: 'Por la popa - la popa cruza el viento',
            fr: 'Par la poupe - la poupe traverse le vent',
            de: 'Durchs Heck - das Heck kreuzt den Wind',
            it: 'Per la poppa - la poppa attraversa il vento',
          },
        },
        {
          id: 'tk-q2-c',
          correct: false,
          label: {
            ru: 'Поворот идёт строго на 180°',
            en: 'A 180-degree spin in place',
            pl: 'Zwrot dokladnie o 180°',
            es: 'Un giro de 180° en el sitio',
            fr: 'Un demi-tour de 180° sur place',
            de: 'Eine 180-Grad-Drehung auf der Stelle',
            it: 'Una rotazione di 180° sul posto',
          },
        },
      ],
      explanation: {
        ru: 'Оверштаг = поворот через нос. Нос пересекает линию ветра (через неходовую зону), и яхта переходит с одного галса на другой.',
        en: 'Tacking turns the boat through the bow. The bow crosses the wind line (through the no-go zone), switching the boat from one tack to the other.',
        pl: 'Zwrot przez sztag = obrot przez dziob. Dziob przechodzi przez linie wiatru (przez strefe martwa) i jacht zmienia hals.',
        es: 'Virar por avante = giro por la proa. La proa cruza la linea del viento (por la zona muerta) y el barco cambia de amura.',
        fr: 'Virer de bord = passage par l\'etrave. L\'etrave traverse la ligne du vent (par la zone morte) et le bateau change d\'amure.',
        de: 'Wenden = Drehung durch den Bug. Der Bug kreuzt die Windlinie (durch die Totzone) und das Boot wechselt den Bug.',
        it: 'Virata di prua = rotazione attraverso la prua. La prua attraversa la linea del vento (per la zona morta) e la barca cambia mura.',
      },
    },
  ],

  jibing: [
    {
      id: 'jb-q1',
      prompt: {
        ru: 'В какую сторону пролетает гик во время поворота фордевинд?',
        en: 'Which way does the boom swing during a jibe?',
        pl: 'W ktora strone przeskakuje bom podczas zwrotu przez rufe?',
        es: 'Hacia donde se balancea la botavara durante una trasluchada?',
        fr: 'Dans quel sens bascule la bome lors d\'un empannage?',
        de: 'In welche Richtung schwingt der Baum bei einer Halse?',
        it: 'In che direzione oscilla il boma durante una strambata?',
      },
      options: [
        {
          id: 'jb-q1-a',
          correct: true,
          label: {
            ru: 'С одного борта на другой - резко через корму',
            en: 'From one side to the other, sharply across the stern',
            pl: 'Z jednej burty na druga - gwaltownie przez rufe',
            es: 'De un costado al otro, bruscamente por la popa',
            fr: 'D\'un cote a l\'autre, brutalement par la poupe',
            de: 'Von einer Seite zur anderen, schnell ueber das Heck',
            it: 'Da un lato all\'altro, bruscamente attraverso la poppa',
          },
        },
        {
          id: 'jb-q1-b',
          correct: false,
          label: {
            ru: 'Только вверх - гик поднимается параллельно мачте',
            en: 'Only upward - the boom lifts parallel to the mast',
            pl: 'Tylko w gore - bom podnosi sie rownolegle do masztu',
            es: 'Solo hacia arriba - la botavara se eleva paralela al mastil',
            fr: 'Uniquement vers le haut - la bome monte parallele au mat',
            de: 'Nur nach oben - der Baum hebt sich parallel zum Mast',
            it: 'Solo verso l\'alto - il boma si solleva parallelo all\'albero',
          },
        },
        {
          id: 'jb-q1-c',
          correct: false,
          label: {
            ru: 'Гик не двигается - остаётся в центре',
            en: 'It does not move at all - stays centered',
            pl: 'Bom nie rusza sie - zostaje w centrum',
            es: 'No se mueve - se queda en el centro',
            fr: 'Elle ne bouge pas - reste centree',
            de: 'Er bewegt sich nicht - bleibt mittig',
            it: 'Non si muove - resta al centro',
          },
        },
      ],
      explanation: {
        ru: 'Корма пересекает ветер, и гик резко перебрасывается с одного борта на другой. Заранее подбирают шкот, чтобы смягчить удар.',
        en: 'The stern crosses the wind and the boom swings violently from one side to the other. Crew sheets in beforehand to control the swing.',
        pl: 'Rufa przechodzi przez wiatr i bom przeskakuje gwaltownie z jednej burty na druga. Zaloga wybiera szkot wczesniej, by zlagodzic uderzenie.',
        es: 'La popa cruza el viento y la botavara se traslada violentamente de un costado al otro. Se caza la escota antes para suavizar el cambio.',
        fr: 'La poupe traverse le vent et la bome bascule violemment d\'un cote a l\'autre. On reborde l\'ecoute avant pour amortir.',
        de: 'Das Heck kreuzt den Wind und der Baum schlaegt heftig von einer Seite auf die andere. Die Crew dichtholt vorher, um die Bewegung zu kontrollieren.',
        it: 'La poppa attraversa il vento e il boma scocca violentemente da un lato all\'altro. Si caza la scotta prima per attenuare il colpo.',
      },
    },
    {
      id: 'jb-q2',
      prompt: {
        ru: 'Какую опасность несёт фордевинд при сильном ветре?',
        en: 'What hazard does jibing in heavy wind pose?',
        pl: 'Jakie zagrozenie niesie zwrot przez rufe przy silnym wietrze?',
        es: 'Que riesgo implica trasluchar con viento fuerte?',
        fr: 'Quel danger represente l\'empannage par vent fort?',
        de: 'Welche Gefahr birgt eine Halse bei starkem Wind?',
        it: 'Quale pericolo comporta strambare con vento forte?',
      },
      options: [
        {
          id: 'jb-q2-a',
          correct: false,
          label: {
            ru: 'Яхта замирает в неходовой зоне',
            en: 'The boat stalls in the no-go zone',
            pl: 'Jacht zatrzymuje sie w strefie martwej',
            es: 'El barco se detiene en la zona muerta',
            fr: 'Le bateau cale dans la zone morte',
            de: 'Das Boot bleibt in der Totzone stehen',
            it: 'La barca si blocca nella zona morta',
          },
        },
        {
          id: 'jb-q2-b',
          correct: true,
          label: {
            ru: 'Гик может ударить экипаж по голове или сломать снасть',
            en: 'The boom can hit a crew member in the head or break gear',
            pl: 'Bom moze uderzyc zaloge w glowe lub uszkodzic osprzet',
            es: 'La botavara puede golpear a un tripulante en la cabeza o romper aparejo',
            fr: 'La bome peut frapper un equipier a la tete ou casser du gréement',
            de: 'Der Baum kann jemanden am Kopf treffen oder Material brechen',
            it: 'Il boma puo colpire un membro dell\'equipaggio in testa o rompere attrezzatura',
          },
        },
        {
          id: 'jb-q2-c',
          correct: false,
          label: {
            ru: 'Парус заштилеет с подветренной стороны',
            en: 'The sail will be becalmed on the leeward side',
            pl: 'Zagiel zacisznie sie po stronie zawietrznej',
            es: 'La vela quedara en calma a sotavento',
            fr: 'La voile sera deventee sous le vent',
            de: 'Das Segel wird leeseitig flach',
            it: 'La vela rimarra in bonaccia sottovento',
          },
        },
      ],
      explanation: {
        ru: 'Резкий перелёт гика - главная опасность поворота фордевинд. Поэтому в сильный ветер гик подбирают шкотом до самого центра, а потом контролируют переход.',
        en: 'A sudden boom swing is the main jibing hazard. In heavy wind crews sheet the boom in to the centerline before letting it cross, then ease it controllably.',
        pl: 'Gwaltowny przeskok bomu to glowne zagrozenie przy fordewindzie. Przy silnym wietrze bom wybiera sie szkotem do osi, potem kontrolowanie sie luzuje.',
        es: 'El golpe brusco de la botavara es el mayor riesgo. Con viento fuerte se caza la botavara al centro antes del cambio y luego se larga con control.',
        fr: 'Le coup de bome brutal est le danger principal. Par vent fort on reborde la bome au centre avant le passage, puis on choque progressivement.',
        de: 'Das schlagartige Ueberschwingen des Baums ist die Hauptgefahr. Bei starkem Wind wird der Baum vor der Halse zur Mitte dichtgeholt und dann kontrolliert gefiert.',
        it: 'Il colpo improvviso del boma e il rischio principale. Con vento forte si caza il boma al centro prima del passaggio e poi si lasca con controllo.',
      },
    },
  ],

  'vmg-beating': [
    {
      id: 'vmg-q1',
      prompt: {
        ru: 'Что означает аббревиатура VMG?',
        en: 'What does VMG stand for?',
        pl: 'Co oznacza skrot VMG?',
        es: 'Que significa la sigla VMG?',
        fr: 'Que signifie VMG?',
        de: 'Wofuer steht die Abkuerzung VMG?',
        it: 'Cosa significa la sigla VMG?',
      },
      options: [
        {
          id: 'vmg-q1-a',
          correct: true,
          label: {
            ru: 'Velocity Made Good - скорость продвижения к цели',
            en: 'Velocity Made Good - effective speed toward the goal',
            pl: 'Velocity Made Good - efektywna predkosc w kierunku celu',
            es: 'Velocity Made Good - velocidad efectiva hacia el objetivo',
            fr: 'Velocity Made Good - vitesse effective vers la cible',
            de: 'Velocity Made Good - effektive Geschwindigkeit zum Ziel',
            it: 'Velocity Made Good - velocita effettiva verso il bersaglio',
          },
        },
        {
          id: 'vmg-q1-b',
          correct: false,
          label: {
            ru: 'Variable Mast Gear - изменяемая оснастка мачты',
            en: 'Variable Mast Gear - the rigging adjustment system',
            pl: 'Variable Mast Gear - regulowane omasztowanie',
            es: 'Variable Mast Gear - aparejo regulable del mastil',
            fr: 'Variable Mast Gear - greement reglable du mat',
            de: 'Variable Mast Gear - verstellbare Mast-Riggung',
            it: 'Variable Mast Gear - attrezzatura albero regolabile',
          },
        },
        {
          id: 'vmg-q1-c',
          correct: false,
          label: {
            ru: 'Vessel Marine GPS - судовой морской навигатор',
            en: 'Vessel Marine GPS - the marine GPS unit on board',
            pl: 'Vessel Marine GPS - morski GPS na pokladzie',
            es: 'Vessel Marine GPS - el GPS nautico a bordo',
            fr: 'Vessel Marine GPS - le GPS marin a bord',
            de: 'Vessel Marine GPS - das marine GPS-Geraet an Bord',
            it: 'Vessel Marine GPS - il GPS marino di bordo',
          },
        },
      ],
      explanation: {
        ru: 'VMG - проекция скорости яхты на направление к цели. Можно идти быстро по воде, но иметь низкий VMG, если курс не оптимален.',
        en: 'VMG is the projection of the boat\'s speed onto the direction of the goal. You can be fast through the water yet have low VMG if the course is wrong.',
        pl: 'VMG to rzut predkosci jachtu na kierunek do celu. Mozna plynac szybko po wodzie, ale miec niski VMG, gdy kurs jest niewlasciwy.',
        es: 'VMG es la proyeccion de la velocidad del barco sobre la direccion al objetivo. Puedes ser rapido en el agua y tener bajo VMG si el rumbo no es optimo.',
        fr: 'VMG est la projection de la vitesse du bateau sur la direction de la cible. On peut filer vite et avoir un VMG faible si le cap n\'est pas optimal.',
        de: 'VMG ist die Projektion der Bootsgeschwindigkeit auf die Zielrichtung. Man kann schnell durchs Wasser ziehen und doch geringen VMG haben.',
        it: 'VMG e la proiezione della velocita della barca sulla direzione del bersaglio. Si puo essere veloci sull\'acqua e avere VMG basso se la rotta non e ottimale.',
      },
    },
    {
      id: 'vmg-q2',
      prompt: {
        ru: 'Зачем яхтсмены идут зигзагом против ветра?',
        en: 'Why do sailors zigzag upwind?',
        pl: 'Dlaczego zeglarze halsuja pod wiatr w zygzak?',
        es: 'Por que los regatistas hacen zigzag contra el viento?',
        fr: 'Pourquoi les coureurs zigzaguent-ils contre le vent?',
        de: 'Warum kreuzen Segler im Zickzack gegen den Wind?',
        it: 'Perche i velisti procedono a zigzag controvento?',
      },
      options: [
        {
          id: 'vmg-q2-a',
          correct: false,
          label: {
            ru: 'Это требует устав соревнований',
            en: 'It is required by the racing rules',
            pl: 'Wymagaja tego przepisy regatowe',
            es: 'Lo exige el reglamento de regata',
            fr: 'C\'est exige par le reglement de course',
            de: 'Es wird von den Wettfahrtregeln gefordert',
            it: 'Lo richiede il regolamento di regata',
          },
        },
        {
          id: 'vmg-q2-b',
          correct: true,
          label: {
            ru: 'Прямо в ветер яхта идти не может, поэтому идёт галсами под ~45°',
            en: 'A sailboat cannot sail straight into the wind, so it tacks at about 45 degrees',
            pl: 'Jacht nie moze plynac wprost na wiatr, wiec halsuje pod katem ~45°',
            es: 'Un velero no puede ir directo contra el viento, asi que da bordadas a unos 45°',
            fr: 'Un voilier ne peut pas remonter droit dans le vent, donc il fait des bords a ~45°',
            de: 'Ein Segelboot kann nicht direkt gegen den Wind segeln, deshalb kreuzt es bei ca. 45°',
            it: 'Una barca a vela non puo navigare dritta contro vento, quindi bordeggia a circa 45°',
          },
        },
        {
          id: 'vmg-q2-c',
          correct: false,
          label: {
            ru: 'Чтобы пугать соперников',
            en: 'To intimidate competitors',
            pl: 'Zeby straszyc rywali',
            es: 'Para intimidar a los rivales',
            fr: 'Pour intimider les concurrents',
            de: 'Um Konkurrenten einzuschuechtern',
            it: 'Per intimidire gli avversari',
          },
        },
      ],
      explanation: {
        ru: 'Лавировка - это компромисс: больше пути по воде, зато можно идти на оптимальном TWA ~45°. Сумма «продвижений к ветру» (VMG) даёт максимум.',
        en: 'Beating is a tradeoff: longer path through the water, but you stay at the optimal close-hauled angle (~45 degrees). The combined upwind progress (VMG) is best.',
        pl: 'Halsowanie to kompromis: dluzsza droga po wodzie, ale plyniesz na optymalnym TWA ~45°. Suma "postepow pod wiatr" (VMG) jest najwieksza.',
        es: 'La cenida es un compromiso: mas camino por el agua, pero al angulo optimo (~45°). La suma del avance hacia barlovento (VMG) es la mejor.',
        fr: 'Tirer des bords est un compromis: chemin plus long sur l\'eau, mais a l\'angle optimal (~45°). Le gain au vent total (VMG) est maximal.',
        de: 'Kreuzen ist ein Kompromiss: laengerer Wasserweg, dafuer optimaler Am-Wind-Winkel (~45°). Der summierte Hoehengewinn (VMG) ist am groessten.',
        it: 'La bolina e un compromesso: piu strada sull\'acqua, ma all\'angolo ottimale (~45°). La somma dei guadagni controvento (VMG) e massima.',
      },
    },
  ],

  'simple-rules': [
    {
      id: 'sr-q1',
      prompt: {
        ru: 'Кто имеет право дороги: яхта на правом галсе или на левом?',
        en: 'Who has right of way: starboard tack or port tack?',
        pl: 'Kto ma pierwszenstwo: jacht na prawym halsie czy na lewym?',
        es: 'Quien tiene derecho de paso: amura a estribor o a babor?',
        fr: 'Qui a la priorite: tribord amures ou babord amures?',
        de: 'Wer hat Vorfahrt: Steuerbord-Bug oder Backbord-Bug?',
        it: 'Chi ha la precedenza: mure a tribordo o a babordo?',
      },
      options: [
        {
          id: 'sr-q1-a',
          correct: true,
          label: {
            ru: 'Правый галс (starboard) - ветер с правого борта',
            en: 'Starboard tack - wind on the starboard side',
            pl: 'Prawy hals (starboard) - wiatr z prawej burty',
            es: 'Amura a estribor (starboard) - viento por estribor',
            fr: 'Tribord amures - vent sur le cote tribord',
            de: 'Steuerbord-Bug - Wind kommt von Steuerbord',
            it: 'Mure a tribordo - vento da tribordo',
          },
        },
        {
          id: 'sr-q1-b',
          correct: false,
          label: {
            ru: 'Левый галс (port) - ветер с левого борта',
            en: 'Port tack - wind on the port side',
            pl: 'Lewy hals (port) - wiatr z lewej burty',
            es: 'Amura a babor (port) - viento por babor',
            fr: 'Babord amures - vent sur le cote babord',
            de: 'Backbord-Bug - Wind kommt von Backbord',
            it: 'Mure a babordo - vento da babordo',
          },
        },
        {
          id: 'sr-q1-c',
          correct: false,
          label: {
            ru: 'Тот, кто крикнет первым',
            en: 'Whoever shouts first',
            pl: 'Ten, kto pierwszy krzyknie',
            es: 'El que grite primero',
            fr: 'Celui qui crie en premier',
            de: 'Wer zuerst schreit',
            it: 'Chi grida per primo',
          },
        },
      ],
      explanation: {
        ru: 'Правило RRS 10 / COLREGS 12: яхта на правом галсе имеет право дороги. На левом - обязана уступать (тактическая команда «Starboard!»).',
        en: 'RRS 10 / COLREGS 12: a boat on starboard tack has right of way. The port-tack boat must keep clear (the classic call is "Starboard!").',
        pl: 'Przepis RRS 10 / COLREGS 12: jacht na prawym halsie ma pierwszenstwo. Jacht na lewym halsie musi ustepowac (komenda «Starboard!»).',
        es: 'RRS 10 / COLREGS 12: la embarcacion con amuras a estribor tiene derecho de paso. La de amuras a babor debe apartarse (grito «Starboard!»).',
        fr: 'RCV 10 / COLREG 12: le bateau tribord amures est prioritaire. Le bateau babord amures doit s\'ecarter (appel «Tribord!»).',
        de: 'RRS 10 / COLREGS 12: das Boot mit Steuerbord-Bug hat Vorfahrt. Backbord-Bug muss ausweichen (Ruf «Steuerbord!»).',
        it: 'RRS 10 / COLREGS 12: la barca con mure a tribordo ha precedenza. La barca con mure a babordo deve scansare (grido «Tribordo!»).',
      },
    },
    {
      id: 'sr-q2',
      prompt: {
        ru: 'Две яхты идут одним галсом. Кто кому уступает?',
        en: 'Two boats are on the same tack. Who gives way?',
        pl: 'Dwa jachty plyna tym samym halsem. Kto komu ustepuje?',
        es: 'Dos barcos en la misma amura. Quien cede el paso?',
        fr: 'Deux bateaux sur le meme bord. Qui doit s\'ecarter?',
        de: 'Zwei Boote auf gleichem Bug. Wer weicht aus?',
        it: 'Due barche sulla stessa mura. Chi cede?',
      },
      options: [
        {
          id: 'sr-q2-a',
          correct: false,
          label: {
            ru: 'Подветренная яхта (leeward)',
            en: 'The leeward boat',
            pl: 'Jacht zawietrzny (leeward)',
            es: 'El barco a sotavento',
            fr: 'Le bateau sous le vent',
            de: 'Das Lee-Boot',
            it: 'La barca sottovento',
          },
        },
        {
          id: 'sr-q2-b',
          correct: true,
          label: {
            ru: 'Наветренная яхта (windward) - уступает подветренной',
            en: 'The windward boat keeps clear of the leeward boat',
            pl: 'Jacht nawietrzny ustepuje zawietrznemu',
            es: 'El barco a barlovento cede al barco a sotavento',
            fr: 'Le bateau au vent s\'ecarte du bateau sous le vent',
            de: 'Das Luv-Boot weicht dem Lee-Boot aus',
            it: 'La barca sopravvento cede a quella sottovento',
          },
        },
        {
          id: 'sr-q2-c',
          correct: false,
          label: {
            ru: 'Та, что идёт быстрее',
            en: 'The faster boat',
            pl: 'Ten szybszy',
            es: 'El mas rapido',
            fr: 'Le plus rapide',
            de: 'Das schnellere',
            it: 'La piu veloce',
          },
        },
      ],
      explanation: {
        ru: 'Правило RRS 11: при одном галсе наветренная яхта (та, что выше по ветру) обязана уступать подветренной.',
        en: 'RRS 11: when on the same tack, the windward boat (the one closer to the wind) must keep clear of the leeward boat.',
        pl: 'Przepis RRS 11: na tym samym halsie jacht nawietrzny (blizszy wiatru) musi ustepowac zawietrznemu.',
        es: 'RRS 11: con la misma amura, el barco a barlovento (el mas cercano al viento) debe apartarse del de sotavento.',
        fr: 'RCV 11: sur le meme bord, le bateau au vent (le plus pres du vent) s\'ecarte du bateau sous le vent.',
        de: 'RRS 11: auf gleichem Bug muss das Luv-Boot (naeher am Wind) dem Lee-Boot ausweichen.',
        it: 'RRS 11: sulla stessa mura, la barca sopravvento (piu vicina al vento) deve scansare quella sottovento.',
      },
    },
    {
      id: 'sr-q3',
      prompt: {
        ru: 'Что делает яхта, обгоняющая другую?',
        en: 'What does a boat overtaking another have to do?',
        pl: 'Co robi jacht wyprzedzajacy inny?',
        es: 'Que debe hacer un barco que adelanta a otro?',
        fr: 'Que doit faire un bateau qui en double un autre?',
        de: 'Was muss ein ueberholendes Boot tun?',
        it: 'Cosa deve fare una barca che ne sorpassa un\'altra?',
      },
      options: [
        {
          id: 'sr-q3-a',
          correct: true,
          label: {
            ru: 'Уступает дорогу обгоняемой яхте',
            en: 'Keeps clear of the boat being overtaken',
            pl: 'Ustepuje drogi jachtowi wyprzedzanemu',
            es: 'Cede el paso al barco al que adelanta',
            fr: 'S\'ecarte du bateau qu\'il double',
            de: 'Weicht dem ueberholten Boot aus',
            it: 'Cede strada alla barca sorpassata',
          },
        },
        {
          id: 'sr-q3-b',
          correct: false,
          label: {
            ru: 'Кричит «Я обгоняю!» и идёт прямо',
            en: 'Shouts "Overtaking!" and continues straight',
            pl: 'Krzyczy «Wyprzedzam!» i plynie prosto',
            es: 'Grita «Adelanto!» y sigue recto',
            fr: 'Crie «Je double!» et continue tout droit',
            de: 'Ruft «Ich ueberhole!» und faehrt geradeaus',
            it: 'Grida «Sorpasso!» e prosegue dritto',
          },
        },
        {
          id: 'sr-q3-c',
          correct: false,
          label: {
            ru: 'Останавливается и ждёт',
            en: 'Stops and waits',
            pl: 'Zatrzymuje sie i czeka',
            es: 'Se detiene y espera',
            fr: 'S\'arrete et attend',
            de: 'Haelt an und wartet',
            it: 'Si ferma e aspetta',
          },
        },
      ],
      explanation: {
        ru: 'RRS / COLREGS: догоняющая яхта всегда уступает. Это базовое правило мореходства, действует и в гонке, и в свободном плавании.',
        en: 'RRS / COLREGS: an overtaking boat always keeps clear. It\'s a fundamental rule that applies both in racing and in free sailing.',
        pl: 'RRS / COLREGS: jacht doganiajacy zawsze ustepuje. To podstawowa zasada zeglarska, dziala w wyscigu i poza nim.',
        es: 'RRS / COLREGS: el barco que alcanza cede siempre el paso. Regla basica que aplica en regata y en navegacion libre.',
        fr: 'RCV / COLREG: le bateau qui rattrape s\'ecarte toujours. C\'est une regle de base qui s\'applique en course comme en navigation libre.',
        de: 'RRS / COLREGS: das ueberholende Boot weicht immer aus. Grundregel, die in Wettfahrt und freier Fahrt gilt.',
        it: 'RRS / COLREGS: la barca che sorpassa cede sempre. Regola di base, vale sia in regata che in navigazione libera.',
      },
    },
  ],

  'mini-race': [
    {
      id: 'mr-q1',
      prompt: {
        ru: 'Что такое стартовая линия в гонке?',
        en: 'What is the start line in a race?',
        pl: 'Czym jest linia startu w wyscigu?',
        es: 'Que es la linea de salida en una regata?',
        fr: 'Qu\'est-ce que la ligne de depart dans une regate?',
        de: 'Was ist die Startlinie in einer Wettfahrt?',
        it: 'Cos\'e la linea di partenza in una regata?',
      },
      options: [
        {
          id: 'mr-q1-a',
          correct: true,
          label: {
            ru: 'Воображаемая линия между судейским катером и стартовым знаком',
            en: 'An imaginary line between the committee boat and the start mark',
            pl: 'Wyobrazna linia miedzy lodzia komisji a znakiem startowym',
            es: 'Una linea imaginaria entre el barco de comite y la baliza de salida',
            fr: 'Une ligne imaginaire entre le bateau du comite et la bouee de depart',
            de: 'Eine gedachte Linie zwischen Wettfahrtleitungsboot und Startmarke',
            it: 'Una linea immaginaria tra la barca giuria e la boa di partenza',
          },
        },
        {
          id: 'mr-q1-b',
          correct: false,
          label: {
            ru: 'Финишная линия предыдущей гонки',
            en: 'The finish line of the previous race',
            pl: 'Linia mety poprzedniego wyscigu',
            es: 'La linea de meta de la regata anterior',
            fr: 'La ligne d\'arrivee de la course precedente',
            de: 'Die Ziellinie des vorherigen Rennens',
            it: 'La linea d\'arrivo della regata precedente',
          },
        },
        {
          id: 'mr-q1-c',
          correct: false,
          label: {
            ru: 'Линия берега напротив базы',
            en: 'The shoreline opposite the marina',
            pl: 'Linia brzegu naprzeciw mariny',
            es: 'La linea de costa frente al puerto',
            fr: 'La ligne de cote en face de la base',
            de: 'Die Uferlinie gegenueber der Basis',
            it: 'La linea costiera di fronte alla base',
          },
        },
      ],
      explanation: {
        ru: 'Стартовая линия - между судейским катером (один конец) и стартовым знаком (другой). Пересекать её до сигнала старта = фальстарт.',
        en: 'The start line runs between the committee boat (one end) and the start mark (the other). Crossing before the start signal is OCS (over early).',
        pl: 'Linia startu biegnie miedzy lodzia komisji (jeden koniec) a znakiem startowym (drugi). Przekroczenie przed sygnalem to falstart (OCS).',
        es: 'La linea de salida va entre el barco de comite (un extremo) y la baliza de salida (el otro). Cruzar antes de la senal es OCS (salida adelantada).',
        fr: 'La ligne de depart va du bateau du comite (un cote) a la bouee de depart (l\'autre). La franchir avant le signal est OCS (depart anticipe).',
        de: 'Die Startlinie verlaeuft zwischen Wettfahrtleitungsboot (ein Ende) und Startmarke (anderes Ende). Vor dem Startsignal kreuzen ist OCS (Frueh).',
        it: 'La linea di partenza va dalla barca giuria (un\'estremita) alla boa di partenza (l\'altra). Attraversarla prima del segnale e OCS (partenza anticipata).',
      },
    },
    {
      id: 'mr-q2',
      prompt: {
        ru: 'Где находится наветренный знак (windward mark) на типичной дистанции?',
        en: 'Where is the windward mark on a typical race course?',
        pl: 'Gdzie znajduje sie znak nawietrzny (windward mark) na typowej trasie?',
        es: 'Donde esta la baliza de barlovento (windward mark) en un recorrido tipico?',
        fr: 'Ou se trouve la bouee au vent (windward mark) sur un parcours typique?',
        de: 'Wo liegt die Luvboje (windward mark) auf einem typischen Kurs?',
        it: 'Dove si trova la boa di bolina (windward mark) su un percorso tipico?',
      },
      options: [
        {
          id: 'mr-q2-a',
          correct: true,
          label: {
            ru: 'Прямо вверх по ветру от линии старта',
            en: 'Directly upwind from the start line',
            pl: 'Prosto pod wiatr od linii startu',
            es: 'Directamente a barlovento de la linea de salida',
            fr: 'Directement au vent de la ligne de depart',
            de: 'Direkt in Luv von der Startlinie',
            it: 'Direttamente a sopravvento della linea di partenza',
          },
        },
        {
          id: 'mr-q2-b',
          correct: false,
          label: {
            ru: 'Прямо вниз по ветру от линии старта',
            en: 'Directly downwind from the start line',
            pl: 'Prosto z wiatrem od linii startu',
            es: 'Directamente a sotavento de la linea de salida',
            fr: 'Directement sous le vent de la ligne de depart',
            de: 'Direkt in Lee von der Startlinie',
            it: 'Direttamente sottovento della linea di partenza',
          },
        },
        {
          id: 'mr-q2-c',
          correct: false,
          label: {
            ru: 'Сбоку от трассы, не используется',
            en: 'Off to the side of the course, not used',
            pl: 'Z boku trasy, nie uzywany',
            es: 'A un lado del recorrido, no se usa',
            fr: 'Sur le cote du parcours, non utilise',
            de: 'Seitlich vom Kurs, nicht benutzt',
            it: 'Di lato al percorso, non usata',
          },
        },
      ],
      explanation: {
        ru: 'Наветренный знак - первая поворотная точка. До неё яхты лавируют против ветра. После него обычно идут на подветренный знак или финиш.',
        en: 'The windward mark is the first turning point. Boats beat upwind to reach it. After rounding, they typically run downwind to the leeward mark or the finish.',
        pl: 'Znak nawietrzny to pierwszy punkt zwrotu. Jachty halsuja pod wiatr, by do niego dojsc. Po opasaniu plyna na znak zawietrzny lub mete.',
        es: 'La baliza de barlovento es el primer punto de giro. Los barcos cinen para alcanzarla. Tras virarla, suelen correr a la baliza de sotavento o a meta.',
        fr: 'La bouee au vent est le premier point de virage. Les bateaux remontent au vent pour l\'atteindre. Apres, ils descendent vers la bouee sous le vent ou l\'arrivee.',
        de: 'Die Luvboje ist der erste Wendepunkt. Die Boote kreuzen nach Luv, um sie zu erreichen. Danach geht es meist abwaerts zur Leeboje oder ins Ziel.',
        it: 'La boa di bolina e il primo punto di virata. Le barche bordeggiano controvento per raggiungerla. Dopo si scende sottovento o al traguardo.',
      },
    },
  ],
};

/** Convenience: returns the question list for a lesson, or [] if none. */
export function getQuizForLesson(lessonId: string): QuizQuestion[] {
  return BOOTCAMP_QUIZZES[lessonId] ?? [];
}

/** True when the given lesson has at least one quiz question. */
export function hasQuiz(lessonId: string): boolean {
  return getQuizForLesson(lessonId).length > 0;
}

/** Pass threshold: >=70% correct counts as a passed quiz. */
export const QUIZ_PASS_THRESHOLD = 0.7 as const;

/** True when a recorded score (correct, total) is at or above the pass mark. */
export function isQuizPassed(score: number, total: number): boolean {
  if (total <= 0) return false;
  return score / total >= QUIZ_PASS_THRESHOLD;
}
