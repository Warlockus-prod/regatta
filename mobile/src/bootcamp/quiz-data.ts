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
 * Typography: no em/en dashes, no curly quotes, guillemets only in
 * Russian, full native spelling in every language (Polish included).
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
        es: '¿Qué es el TWA?',
        fr: 'Qu\'est-ce que le TWA ?',
        de: 'Was ist TWA?',
        it: 'Che cos\'è il TWA?',
      },
      options: [
        {
          id: 'wd-q1-a',
          correct: true,
          label: {
            ru: 'Истинный угол к ветру (True Wind Angle)',
            en: 'True Wind Angle - the angle between the wind and the boat',
            pl: 'Kąt wiatru prawdziwego (True Wind Angle)',
            es: 'Ángulo del viento real (True Wind Angle)',
            fr: 'Angle du vent réel (True Wind Angle)',
            de: 'Wahrer Windwinkel (True Wind Angle)',
            it: 'Angolo del vento reale (True Wind Angle)',
          },
        },
        {
          id: 'wd-q1-b',
          correct: false,
          label: {
            ru: 'Скорость яхты по воде в узлах',
            en: 'Boat speed through the water in knots',
            pl: 'Prędkość jachtu po wodzie w węzłach',
            es: 'Velocidad del barco en el agua, en nudos',
            fr: 'Vitesse du bateau sur l\'eau, en nœuds',
            de: 'Bootsgeschwindigkeit durchs Wasser in Knoten',
            it: 'Velocità della barca sull\'acqua, in nodi',
          },
        },
        {
          id: 'wd-q1-c',
          correct: false,
          label: {
            ru: 'Время оборота секундомера на старте',
            en: 'Stopwatch lap time at the start',
            pl: 'Czas okrążenia na stoperze przy starcie',
            es: 'Tiempo de vuelta del cronómetro en la salida',
            fr: 'Temps au tour du chrono au départ',
            de: 'Rundenzeit der Stoppuhr beim Start',
            it: 'Tempo sul giro del cronometro alla partenza',
          },
        },
      ],
      explanation: {
        ru: 'TWA - это угол между истинным направлением ветра и курсом яхты. По нему различают левентик, бейдевинд, галфвинд и т.д.',
        en: 'TWA is the angle between the true wind direction and the boat\'s heading. It distinguishes the points of sail (close-hauled, beam reach, etc.).',
        pl: 'TWA to kąt między kierunkiem wiatru prawdziwego a kursem jachtu. Po nim rozróżnia się łopot, bajdewind, półwiatr itd.',
        es: 'El TWA es el ángulo entre la dirección del viento real y el rumbo del barco. Con él se distinguen proa al viento, ceñida, través, etc.',
        fr: 'Le TWA est l\'angle entre la direction du vent réel et le cap du bateau. C\'est lui qui distingue vent debout, près, travers, etc.',
        de: 'TWA ist der Winkel zwischen der wahren Windrichtung und dem Kurs des Bootes. Danach unterscheidet man im Wind, hoch am Wind, halber Wind usw.',
        it: 'Il TWA è l\'angolo tra la direzione del vento reale e la rotta della barca. In base a esso si distinguono prua al vento, bolina, traverso, ecc.',
      },
    },
    {
      id: 'wd-q2',
      prompt: {
        ru: 'Откуда дует ветер, когда яхта идёт бейдевиндом на TWA 45?',
        en: 'Where does the wind come from when sailing close-hauled at TWA 45?',
        pl: 'Skąd wieje wiatr, gdy jacht płynie bajdewindem przy TWA 45?',
        es: '¿De dónde viene el viento cuando el barco navega de ceñida con TWA 45?',
        fr: 'D\'où vient le vent quand le bateau est au près à TWA 45 ?',
        de: 'Woher kommt der Wind, wenn das Boot hoch am Wind mit TWA 45 segelt?',
        it: 'Da dove arriva il vento quando la barca va di bolina a TWA 45?',
      },
      options: [
        {
          id: 'wd-q2-a',
          correct: false,
          label: {
            ru: 'Прямо в нос',
            en: 'Straight on the bow',
            pl: 'Prosto w dziób',
            es: 'Justo por la proa',
            fr: 'Pile dans l\'étrave',
            de: 'Genau von vorn',
            it: 'Dritto in prua',
          },
        },
        {
          id: 'wd-q2-b',
          correct: true,
          label: {
            ru: 'Под углом 45° от носа',
            en: 'At 45 degrees off the bow',
            pl: 'Pod kątem 45° od dziobu',
            es: 'A 45° de la proa',
            fr: 'À 45° de l\'étrave',
            de: '45° seitlich vom Bug',
            it: 'A 45° dalla prua',
          },
        },
        {
          id: 'wd-q2-c',
          correct: false,
          label: {
            ru: 'С кормы',
            en: 'From the stern',
            pl: 'Od rufy',
            es: 'Por la popa',
            fr: 'Par l\'arrière',
            de: 'Von achtern',
            it: 'Da poppa',
          },
        },
      ],
      explanation: {
        ru: 'TWA измеряется от носа. На 45° яхта идёт самым острым курсом - бейдевиндом, на грани неходовой зоны.',
        en: 'TWA is measured from the bow. At 45 degrees the boat is on its closest possible point of sail - close-hauled, just outside the no-go zone.',
        pl: 'TWA mierzy się od dziobu. Przy 45° jacht płynie najostrzejszym kursem, bajdewindem, na granicy kąta martwego.',
        es: 'El TWA se mide desde la proa. A 45° el barco va en su rumbo más cerrado, la ceñida, justo en el límite de la zona muerta.',
        fr: 'Le TWA se mesure depuis l\'étrave. À 45°, le bateau est à son allure la plus serrée, le près, juste à la limite de la zone morte.',
        de: 'TWA wird vom Bug aus gemessen. Bei 45° segelt das Boot den höchsten Kurs, hoch am Wind, direkt an der Grenze zum toten Winkel.',
        it: 'Il TWA si misura dalla prua. A 45° la barca è all\'andatura più stretta, la bolina, al limite dell\'angolo morto.',
      },
    },
    {
      id: 'wd-q3',
      prompt: {
        ru: 'Что такое неходовая зона?',
        en: 'What is the no-go zone?',
        pl: 'Czym jest kąt martwy?',
        es: '¿Qué es la zona muerta?',
        fr: 'Qu\'est-ce que la zone morte ?',
        de: 'Was ist der tote Winkel?',
        it: 'Che cos\'è l\'angolo morto?',
      },
      options: [
        {
          id: 'wd-q3-a',
          correct: false,
          label: {
            ru: 'Зона без волн',
            en: 'A flat-water zone with no waves',
            pl: 'Strefa bez fal',
            es: 'Una zona sin olas',
            fr: 'Une zone sans vagues',
            de: 'Ein Bereich ohne Wellen',
            it: 'Una zona senza onde',
          },
        },
        {
          id: 'wd-q3-b',
          correct: true,
          label: {
            ru: 'Сектор ~90° против ветра, где парус не работает',
            en: 'About 90 degrees facing the wind where the sail cannot generate drive',
            pl: 'Sektor ~90° pod wiatr, w którym żagiel nie pracuje',
            es: 'Un sector de ~90° de cara al viento donde la vela no trabaja',
            fr: 'Un secteur de ~90° face au vent où la voile ne porte pas',
            de: 'Ein Sektor von ~90° gegen den Wind, in dem das Segel nicht zieht',
            it: 'Un settore di ~90° controvento in cui la vela non lavora',
          },
        },
        {
          id: 'wd-q3-c',
          correct: false,
          label: {
            ru: 'Запретная зона по правилам гонки',
            en: 'A racing-rule exclusion area near the start',
            pl: 'Strefa zakazana przez przepisy regatowe',
            es: 'Una zona prohibida por las reglas de regata',
            fr: 'Une zone interdite par les règles de course',
            de: 'Eine Sperrzone nach den Wettfahrtregeln',
            it: 'Una zona vietata dal regolamento di regata',
          },
        },
      ],
      explanation: {
        ru: 'Парусная яхта не может идти прямо против ветра. Сектор примерно ±45° вокруг направления ветра - неходовой.',
        en: 'A sailboat cannot sail directly into the wind. The sector roughly +/-45 degrees around the wind direction is the no-go zone.',
        pl: 'Jacht żaglowy nie popłynie prosto pod wiatr. Sektor mniej więcej ±45° wokół kierunku wiatru to kąt martwy.',
        es: 'Un velero no puede navegar directamente contra el viento. El sector de más o menos ±45° alrededor de la dirección del viento es la zona muerta.',
        fr: 'Un voilier ne peut pas avancer droit contre le vent. Le secteur d\'environ ±45° autour de la direction du vent est la zone morte.',
        de: 'Ein Segelboot kann nicht direkt gegen den Wind segeln. Der Sektor von etwa ±45° um die Windrichtung ist der tote Winkel.',
        it: 'Una barca a vela non può andare dritta controvento. Il settore di circa ±45° attorno alla direzione del vento è l\'angolo morto.',
      },
    },
  ],

  'points-of-sail': [
    {
      id: 'pos-q1',
      prompt: {
        ru: 'На каком курсе яхта обычно идёт быстрее всего по плоской воде?',
        en: 'Which point of sail is fastest in flat water?',
        pl: 'Na którym kursie jacht zwykle płynie najszybciej po płaskiej wodzie?',
        es: '¿En qué rumbo suele ir más rápido el barco en aguas llanas?',
        fr: 'À quelle allure le bateau va-t-il en général le plus vite sur mer plate ?',
        de: 'Auf welchem Kurs ist das Boot auf glattem Wasser meist am schnellsten?',
        it: 'In quale andatura la barca di solito va più veloce in acqua piatta?',
      },
      options: [
        {
          id: 'pos-q1-a',
          correct: false,
          label: {
            ru: 'Левентик (прямо в ветер)',
            en: 'In irons (head to wind)',
            pl: 'Łopot (dziobem do wiatru)',
            es: 'Proa al viento',
            fr: 'Vent debout',
            de: 'Im Wind (Bug genau im Wind)',
            it: 'Prua al vento',
          },
        },
        {
          id: 'pos-q1-b',
          correct: true,
          label: {
            ru: 'Галфвинд (beam reach), TWA ~90°',
            en: 'Beam reach, TWA around 90 degrees',
            pl: 'Półwiatr (beam reach), TWA ok. 90°',
            es: 'Través (beam reach), TWA ~90°',
            fr: 'Travers (beam reach), TWA ~90°',
            de: 'Halber Wind (beam reach), TWA ~90°',
            it: 'Traverso (beam reach), TWA ~90°',
          },
        },
        {
          id: 'pos-q1-c',
          correct: false,
          label: {
            ru: 'Бейдевинд (close-hauled), TWA ~45°',
            en: 'Close-hauled, TWA around 45 degrees',
            pl: 'Bajdewind (close-hauled), TWA ok. 45°',
            es: 'Ceñida (close-hauled), TWA ~45°',
            fr: 'Près (close-hauled), TWA ~45°',
            de: 'Hoch am Wind (close-hauled), TWA ~45°',
            it: 'Bolina (close-hauled), TWA ~45°',
          },
        },
      ],
      explanation: {
        ru: 'На галфвинде паруса сильнее всего толкают лодку вперед, а крен и сопротивление еще умеренные. Острее больше силы уходит в крен и дрейф, полнее паруса работают хуже, а на прямом фордевинде грот загораживает стаксель.',
        en: 'On a beam reach the sails drive the boat forward hardest while heel and drag are still moderate. Closer to the wind more of the force goes into heel and leeway; further off the sails work less well, and on a dead run the main blankets the jib.',
        pl: 'Na półwietrze żagle najmocniej pchają jacht do przodu, a przechył i opór są jeszcze umiarkowane. Ostrzej więcej siły idzie w przechył i dryf, pełniej żagle pracują słabiej, a na czystym fordewindzie grot zasłania foka.',
        es: 'De través las velas empujan el barco hacia delante con más fuerza, con escora y resistencia todavía moderadas. Más cerca del viento, más fuerza se va en escora y abatimiento; más abierto, las velas rinden menos, y en la popa cerrada la mayor tapa el foque.',
        fr: 'Au travers, les voiles poussent le bateau vers l\'avant au maximum, avec une gîte et une traînée encore modérées. Plus près du vent, la force part en gîte et en dérive ; plus abattu, les voiles travaillent moins bien, et au plein vent arrière la grand-voile masque le foc.',
        de: 'Bei halbem Wind treiben die Segel das Boot am stärksten voran, Krängung und Widerstand sind noch mäßig. Höher am Wind geht mehr Kraft in Krängung und Abdrift, raumer arbeiten die Segel schlechter, und platt vor dem Wind deckt das Groß die Fock ab.',
        it: 'Al traverso le vele spingono la barca in avanti con più forza, con sbandamento e resistenza ancora moderati. Più vicino al vento la forza finisce in sbandamento e scarroccio; più in poppa le vele rendono meno, e in poppa piena la randa copre il fiocco.',
      },
    },
    {
      id: 'pos-q2',
      prompt: {
        ru: 'Что такое неходовая зона относительно курсов?',
        en: 'How does the no-go zone relate to points of sail?',
        pl: 'Gdzie leży kąt martwy względem kursów?',
        es: '¿Qué relación tiene la zona muerta con los rumbos?',
        fr: 'Où se situe la zone morte par rapport aux allures ?',
        de: 'Wo liegt der tote Winkel im Vergleich zu den Kursen?',
        it: 'Dove si trova l\'angolo morto rispetto alle andature?',
      },
      options: [
        {
          id: 'pos-q2-a',
          correct: true,
          label: {
            ru: 'Сектор острее бейдевинда: ~45° по обе стороны от ветра',
            en: 'The sector tighter than close-hauled: about 45 degrees each side of the wind',
            pl: 'Sektor ostrzejszy niż bajdewind: ~45° po obu stronach wiatru',
            es: 'El sector más cerrado que la ceñida: ~45° a cada lado del viento',
            fr: 'Le secteur plus serré que le près : ~45° de chaque côté du vent',
            de: 'Der Bereich noch höher als hoch am Wind: ~45° zu beiden Seiten des Windes',
            it: 'Il settore più stretto della bolina: ~45° per lato rispetto al vento',
          },
        },
        {
          id: 'pos-q2-b',
          correct: false,
          label: {
            ru: 'Сектор сразу после фордевинда',
            en: 'The sector right after a dead run',
            pl: 'Sektor zaraz za fordewindem',
            es: 'El sector justo después de la popa',
            fr: 'Le secteur juste après le vent arrière',
            de: 'Der Bereich gleich hinter dem Kurs vor dem Wind',
            it: 'Il settore subito dopo la poppa',
          },
        },
        {
          id: 'pos-q2-c',
          correct: false,
          label: {
            ru: 'Любой курс ночью',
            en: 'Any point of sail at night',
            pl: 'Każdy kurs w nocy',
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
        pl: 'Żeby płynąć pod wiatr, trzeba halsować (zygzakiem, bajdewindem). W kącie martwym żagiel się nie napełnia i jacht traci prędkość.',
        es: 'Para ir hacia el viento hay que dar bordos (en zigzag, de ceñida). En la zona muerta la vela no se llena y el barco pierde arrancada.',
        fr: 'Pour remonter au vent, il faut louvoyer (en zigzag, au près). Dans la zone morte, la voile ne se gonfle pas et le bateau perd son erre.',
        de: 'Um nach Luv zu kommen, musst du kreuzen (im Zickzack, hoch am Wind). Im toten Winkel füllt sich das Segel nicht und das Boot verliert Fahrt.',
        it: 'Per risalire il vento bisogna bordeggiare (a zigzag, di bolina). Nell\'angolo morto la vela non si gonfia e la barca perde abbrivio.',
      },
    },
    {
      id: 'pos-q3',
      prompt: {
        ru: 'Какой курс называется галфвинд (beam reach)?',
        en: 'Which point of sail is called the beam reach?',
        pl: 'Który kurs to półwiatr (beam reach)?',
        es: '¿Qué rumbo se llama través (beam reach)?',
        fr: 'Quelle allure appelle-t-on le travers (beam reach) ?',
        de: 'Welcher Kurs heißt halber Wind (beam reach)?',
        it: 'Quale andatura si chiama traverso (beam reach)?',
      },
      options: [
        {
          id: 'pos-q3-a',
          correct: false,
          label: {
            ru: 'Ветер прямо в нос',
            en: 'Wind straight on the bow',
            pl: 'Wiatr prosto w dziób',
            es: 'Viento justo por la proa',
            fr: 'Vent pile sur l\'étrave',
            de: 'Wind genau von vorn',
            it: 'Vento dritto in prua',
          },
        },
        {
          id: 'pos-q3-b',
          correct: true,
          label: {
            ru: 'Ветер прямо с борта (TWA ~90°)',
            en: 'Wind directly from the side, TWA ~90 degrees',
            pl: 'Wiatr prostopadle w burtę (TWA ~90°)',
            es: 'Viento justo por el costado (TWA ~90°)',
            fr: 'Vent pile par le travers (TWA ~90°)',
            de: 'Wind genau von der Seite (TWA ~90°)',
            it: 'Vento dritto al traverso (TWA ~90°)',
          },
        },
        {
          id: 'pos-q3-c',
          correct: false,
          label: {
            ru: 'Ветер прямо с кормы',
            en: 'Wind straight from astern',
            pl: 'Wiatr prosto od rufy',
            es: 'Viento justo por la popa',
            fr: 'Vent pile dans le dos',
            de: 'Wind genau von achtern',
            it: 'Vento dritto in poppa',
          },
        },
      ],
      explanation: {
        ru: 'Галфвинд - ветер строго перпендикулярно борту. Один из самых быстрых и стабильных курсов для большинства яхт.',
        en: 'A beam reach is wind exactly across the side of the boat. One of the fastest and most stable points of sail for most boats.',
        pl: 'Półwiatr to wiatr dokładnie prostopadły do burty. Jeden z najszybszych i najstabilniejszych kursów dla większości jachtów.',
        es: 'El través es el viento justo perpendicular al costado. Es uno de los rumbos más rápidos y estables para la mayoría de los barcos.',
        fr: 'Le travers, c\'est le vent exactement perpendiculaire au bateau. C\'est l\'une des allures les plus rapides et les plus stables pour la plupart des voiliers.',
        de: 'Halber Wind heißt: Der Wind kommt genau quer ein. Für die meisten Boote einer der schnellsten und stabilsten Kurse.',
        it: 'Il traverso è il vento esattamente perpendicolare al fianco. È una delle andature più veloci e stabili per la maggior parte delle barche.',
      },
    },
  ],

  'how-sail-works': [
    {
      id: 'hs-q1',
      prompt: {
        ru: 'Где на парусе генерируется наибольшая подъёмная сила (lift)?',
        en: 'Where on the sail is the most lift generated?',
        pl: 'W której części żagla powstaje największa siła nośna (lift)?',
        es: '¿En qué parte de la vela se genera más sustentación (lift)?',
        fr: 'Où la voile produit-elle le plus de portance (lift) ?',
        de: 'Wo am Segel entsteht der meiste Auftrieb (lift)?',
        it: 'In quale parte della vela si genera più portanza (lift)?',
      },
      options: [
        {
          id: 'hs-q1-a',
          correct: true,
          label: {
            ru: 'У передней (наветренной) шкаторины - там, где воздух обтекает парус',
            en: 'Near the leading edge (luff) where air bends around the sail',
            pl: 'Przy liku przednim (nawietrznym), gdzie powietrze opływa żagiel',
            es: 'Cerca del grátil (borde de ataque), donde el aire rodea la vela',
            fr: 'Près du guindant (bord d\'attaque), là où l\'air contourne la voile',
            de: 'Nahe am Vorliek (Vorderkante), wo die Luft das Segel umströmt',
            it: 'Vicino all\'inferitura (bordo d\'entrata), dove l\'aria gira attorno alla vela',
          },
        },
        {
          id: 'hs-q1-b',
          correct: false,
          label: {
            ru: 'На задней шкаторине у самого гика',
            en: 'At the trailing edge (leech) by the boom',
            pl: 'Na liku tylnym, tuż przy bomie',
            es: 'En la baluma, junto a la botavara',
            fr: 'Sur la chute, tout près de la bôme',
            de: 'Am Achterliek, direkt am Baum',
            it: 'Sulla balumina, vicino al boma',
          },
        },
        {
          id: 'hs-q1-c',
          correct: false,
          label: {
            ru: 'В точке крепления к мачте у топа',
            en: 'At the head, where the sail meets the mast top',
            pl: 'W miejscu mocowania do topu masztu',
            es: 'En el punto de unión con el tope del mástil',
            fr: 'Au point de fixation en tête de mât',
            de: 'Am Befestigungspunkt oben am Masttopp',
            it: 'Nel punto di attacco in testa d\'albero',
          },
        },
      ],
      explanation: {
        ru: 'Парус работает как крыло: воздух разделяется на передней шкаторине, обтекает выпуклую сторону быстрее, создаёт разрежение и тянет яхту.',
        en: 'A sail works like a wing: air splits at the leading edge, accelerates over the curved side, creates low pressure, and pulls the boat forward.',
        pl: 'Żagiel pracuje jak skrzydło: powietrze rozdziela się na liku przednim, szybciej opływa wypukłą stronę, tworzy podciśnienie i ciągnie jacht.',
        es: 'La vela trabaja como un ala: el aire se divide en el grátil, pasa más rápido por la cara convexa, crea una depresión y tira del barco.',
        fr: 'La voile travaille comme une aile : l\'air se sépare au guindant, passe plus vite sur la face convexe, crée une dépression et tire le bateau.',
        de: 'Das Segel arbeitet wie ein Flügel: Die Luft teilt sich am Vorliek, strömt schneller über die gewölbte Seite, erzeugt Unterdruck und zieht das Boot.',
        it: 'La vela lavora come un\'ala: l\'aria si divide all\'inferitura, scorre più veloce sul lato convesso, crea una depressione e tira la barca.',
      },
    },
    {
      id: 'hs-q2',
      prompt: {
        ru: 'В какую сторону движется гик (boom), когда вы потравливаете гика-шкот?',
        en: 'Which way does the boom move when easing the mainsheet?',
        pl: 'W którą stronę idzie bom, gdy luzujesz szot grota?',
        es: '¿Hacia dónde se mueve la botavara cuando lascas la escota de mayor?',
        fr: 'Dans quel sens part la bôme quand tu choques l\'écoute de grand-voile ?',
        de: 'Wohin bewegt sich der Baum, wenn du die Großschot fierst?',
        it: 'In che direzione si muove il boma quando laschi la scotta della randa?',
      },
      options: [
        {
          id: 'hs-q2-a',
          correct: false,
          label: {
            ru: 'К центру яхты',
            en: 'Toward the centerline',
            pl: 'Do środka jachtu',
            es: 'Hacia el centro del barco',
            fr: 'Vers le centre du bateau',
            de: 'Zur Bootsmitte',
            it: 'Verso il centro della barca',
          },
        },
        {
          id: 'hs-q2-b',
          correct: true,
          label: {
            ru: 'От центра, наружу борта',
            en: 'Away from the centerline, outboard',
            pl: 'Od środka, na zewnątrz za burtę',
            es: 'Hacia fuera, lejos del centro',
            fr: 'Vers l\'extérieur, loin de l\'axe',
            de: 'Von der Mitte weg nach außen',
            it: 'Verso l\'esterno, lontano dal centro',
          },
        },
        {
          id: 'hs-q2-c',
          correct: false,
          label: {
            ru: 'Вверх к мачте',
            en: 'Upward toward the mast',
            pl: 'W górę, do masztu',
            es: 'Hacia arriba, hacia el mástil',
            fr: 'Vers le haut, vers le mât',
            de: 'Nach oben zum Mast',
            it: 'Verso l\'alto, verso l\'albero',
          },
        },
      ],
      explanation: {
        ru: 'Шкот удерживает гик ближе к диаметральной плоскости. Потравить = ослабить шкот, и гик уходит наружу под действием ветра.',
        en: 'The sheet holds the boom closer to the centerline. Easing the sheet lets it swing outboard under the wind.',
        pl: 'Szot trzyma bom bliżej płaszczyzny symetrii. Poluzować szot znaczy go zwolnić, a wiatr odsuwa wtedy bom na zewnątrz.',
        es: 'La escota mantiene la botavara cerca de crujía. Lascar es soltar escota, y el viento empuja la botavara hacia fuera.',
        fr: 'L\'écoute retient la bôme près de l\'axe du bateau. Choquer, c\'est relâcher l\'écoute : le vent pousse alors la bôme vers l\'extérieur.',
        de: 'Die Schot hält den Baum nahe an der Mittschiffslinie. Fieren heißt, die Schot nachzulassen, und der Wind drückt den Baum nach außen.',
        it: 'La scotta tiene il boma vicino all\'asse della barca. Lascare vuol dire mollare la scotta, e il vento spinge il boma verso l\'esterno.',
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
        es: '¿Cuál es la primera orden antes de virar por avante?',
        fr: 'Quel est le premier ordre avant de virer de bord ?',
        de: 'Welches Kommando kommt vor der Wende zuerst?',
        it: 'Qual è il primo comando prima di virare?',
      },
      options: [
        {
          id: 'tk-q1-a',
          correct: true,
          label: {
            ru: '«Приготовиться к повороту!» / "Ready about?"',
            en: '"Ready about?" - to ask the crew to prepare',
            pl: '"Klar do zwrotu!" (Ready about)',
            es: '"¡Listos para virar!" (Ready about)',
            fr: '"Paré à virer !" (Ready about)',
            de: '"Klar zur Wende!" (Ready about)',
            it: '"Pronti a virare!" (Ready about)',
          },
        },
        {
          id: 'tk-q1-b',
          correct: false,
          label: {
            ru: '«Травить шкоты!» / "Ease the sheets!"',
            en: '"Ease the sheets!"',
            pl: '"Luzuj szoty!"',
            es: '"¡Lasca escotas!"',
            fr: '"Choquez les écoutes !"',
            de: '"Schoten fieren!"',
            it: '"Lascare le scotte!"',
          },
        },
        {
          id: 'tk-q1-c',
          correct: false,
          label: {
            ru: '«Поворот!» / "Helm\'s a-lee!"',
            en: '"Helm\'s a-lee!" - that\'s the execution call, not the first one',
            pl: '"Zwrot przez sztag!" (Helm\'s a-lee)',
            es: '"¡Viramos!" (Helm\'s a-lee)',
            fr: '"Envoyez !" (Helm\'s a-lee)',
            de: '"Ree!" (Helm\'s a-lee)',
            it: '"Viro!" (Helm\'s a-lee)',
          },
        },
      ],
      explanation: {
        ru: 'Сначала «Ready about?» (готовность), потом «Helm\'s a-lee!» (поехали). Команда успевает занять позиции и взяться за шкоты.',
        en: 'First "Ready about?" (prepare), then "Helm\'s a-lee!" (go). The crew has time to take positions and grab the sheets.',
        pl: 'Najpierw "Klar do zwrotu!" (przygotowanie), potem "Zwrot przez sztag!" (wykonanie). Załoga zdąży zająć miejsca i chwycić szoty.',
        es: 'Primero "¡Listos para virar!" (preparación) y luego "¡Viramos!" (ejecución). La tripulación tiene tiempo de colocarse y coger las escotas.',
        fr: 'D\'abord "Paré à virer !" (préparation), puis "Envoyez !" (exécution). L\'équipage a le temps de se placer et de prendre les écoutes.',
        de: 'Erst "Klar zur Wende!" (vorbereiten), dann "Ree!" (ausführen). Die Crew hat Zeit, ihre Plätze einzunehmen und die Schoten zu greifen.',
        it: 'Prima "Pronti a virare!" (preparazione), poi "Viro!" (esecuzione). L\'equipaggio ha il tempo di prendere posizione e afferrare le scotte.',
      },
    },
    {
      id: 'tk-q2',
      prompt: {
        ru: 'Через что проходит нос яхты во время поворота оверштаг?',
        en: 'What does the bow pass through during a tack?',
        pl: 'Przez co przechodzi dziób jachtu podczas zwrotu przez sztag?',
        es: '¿Por dónde pasa la proa durante una virada por avante?',
        fr: 'Par où passe l\'étrave pendant un virement de bord ?',
        de: 'Wodurch geht der Bug bei einer Wende?',
        it: 'Che cosa attraversa la prua durante una virata?',
      },
      options: [
        {
          id: 'tk-q2-a',
          correct: true,
          label: {
            ru: 'Через линию ветра (нос пересекает направление, откуда дует)',
            en: 'Through the wind line - the bow crosses the wind direction',
            pl: 'Przez linię wiatru (dziób przecina kierunek, z którego wieje)',
            es: 'Por la línea del viento (la proa cruza la dirección de la que sopla)',
            fr: 'Par le lit du vent (l\'étrave traverse la direction d\'où il souffle)',
            de: 'Durch den Wind (der Bug kreuzt die Richtung, aus der er weht)',
            it: 'La linea del vento (la prua attraversa la direzione da cui soffia)',
          },
        },
        {
          id: 'tk-q2-b',
          correct: false,
          label: {
            ru: 'Через корму - корма проходит через ветер',
            en: 'Through the stern - the stern crosses the wind',
            pl: 'Przez rufę: to rufa przechodzi przez wiatr',
            es: 'Por la popa: es la popa la que cruza el viento',
            fr: 'Par l\'arrière : c\'est l\'arrière qui passe le vent',
            de: 'Über das Heck: Das Heck geht durch den Wind',
            it: 'La poppa: è la poppa che passa il vento',
          },
        },
        {
          id: 'tk-q2-c',
          correct: false,
          label: {
            ru: 'Поворот идёт строго на 180°',
            en: 'A 180-degree spin in place',
            pl: 'Zwrot o dokładnie 180°',
            es: 'Un giro de exactamente 180°',
            fr: 'Un demi-tour d\'exactement 180°',
            de: 'Eine Drehung um genau 180°',
            it: 'Una rotazione di esattamente 180°',
          },
        },
      ],
      explanation: {
        ru: 'Оверштаг = поворот через нос. Нос пересекает линию ветра (через неходовую зону), и яхта переходит с одного галса на другой.',
        en: 'Tacking turns the boat through the bow. The bow crosses the wind line (through the no-go zone), switching the boat from one tack to the other.',
        pl: 'Zwrot przez sztag to zwrot dziobem. Dziób przecina linię wiatru (przez kąt martwy) i jacht przechodzi z jednego halsu na drugi.',
        es: 'Virar por avante es girar por la proa. La proa cruza la línea del viento (atravesando la zona muerta) y el barco pasa de una amura a la otra.',
        fr: 'Virer de bord, c\'est tourner par l\'avant. L\'étrave passe le lit du vent (à travers la zone morte) et le bateau change d\'amure.',
        de: 'Wenden heißt: Drehung über den Bug. Der Bug geht durch den Wind (durch den toten Winkel), und das Boot wechselt von einem Bug auf den anderen.',
        it: 'Virare vuol dire girare con la prua. La prua attraversa la linea del vento (passando per l\'angolo morto) e la barca cambia mure.',
      },
    },
  ],

  jibing: [
    {
      id: 'jb-q1',
      prompt: {
        ru: 'В какую сторону пролетает гик во время поворота фордевинд?',
        en: 'Which way does the boom swing during a jibe?',
        pl: 'W którą stronę przelatuje bom podczas zwrotu przez rufę?',
        es: '¿Hacia dónde pasa la botavara durante una trasluchada?',
        fr: 'Dans quel sens passe la bôme pendant un empannage ?',
        de: 'Wohin schwingt der Baum bei einer Halse?',
        it: 'In che direzione passa il boma durante una strambata?',
      },
      options: [
        {
          id: 'jb-q1-a',
          correct: true,
          label: {
            ru: 'С одного борта на другой - резко через корму',
            en: 'From one side to the other, sharply across the stern',
            pl: 'Z burty na burtę, gwałtownie nad rufą',
            es: 'De una banda a la otra, de golpe, por encima de la popa',
            fr: 'D\'un bord à l\'autre, brutalement, au-dessus de l\'arrière',
            de: 'Von einer Seite auf die andere, schlagartig über das Heck',
            it: 'Da un lato all\'altro, di colpo, sopra la poppa',
          },
        },
        {
          id: 'jb-q1-b',
          correct: false,
          label: {
            ru: 'Только вверх - гик поднимается параллельно мачте',
            en: 'Only upward - the boom lifts parallel to the mast',
            pl: 'Tylko w górę: bom unosi się równolegle do masztu',
            es: 'Solo hacia arriba: la botavara sube paralela al mástil',
            fr: 'Seulement vers le haut : la bôme monte parallèlement au mât',
            de: 'Nur nach oben: Der Baum hebt sich parallel zum Mast',
            it: 'Solo verso l\'alto: il boma si alza parallelo all\'albero',
          },
        },
        {
          id: 'jb-q1-c',
          correct: false,
          label: {
            ru: 'Гик не двигается - остаётся в центре',
            en: 'It does not move at all - stays centered',
            pl: 'Bom się nie rusza, zostaje na środku',
            es: 'La botavara no se mueve: se queda en el centro',
            fr: 'La bôme ne bouge pas : elle reste au centre',
            de: 'Der Baum bewegt sich nicht, er bleibt mittig',
            it: 'Il boma non si muove: resta al centro',
          },
        },
      ],
      explanation: {
        ru: 'Корма пересекает ветер, и гик резко перебрасывается с одного борта на другой. Заранее подбирают шкот, чтобы смягчить удар.',
        en: 'The stern crosses the wind and the boom swings violently from one side to the other. Crew sheets in beforehand to control the swing.',
        pl: 'Rufa przechodzi przez linię wiatru i bom gwałtownie przerzuca się z burty na burtę. Szot wybiera się wcześniej, żeby złagodzić uderzenie.',
        es: 'La popa cruza el viento y la botavara pasa de golpe de una banda a la otra. Antes se caza la escota para suavizar el golpe.',
        fr: 'L\'arrière passe le vent et la bôme bascule brutalement d\'un bord à l\'autre. On borde l\'écoute avant pour amortir le choc.',
        de: 'Das Heck geht durch den Wind, und der Baum schlägt von einer Seite auf die andere. Vorher wird die Schot dichtgeholt, um den Schlag abzufedern.',
        it: 'La poppa attraversa il vento e il boma passa di colpo da un lato all\'altro. Prima si cazza la scotta per attutire il colpo.',
      },
    },
    {
      id: 'jb-q2',
      prompt: {
        ru: 'Какую опасность несёт фордевинд при сильном ветре?',
        en: 'What hazard does jibing in heavy wind pose?',
        pl: 'Czym grozi zwrot przez rufę przy silnym wietrze?',
        es: '¿Qué peligro tiene trasluchar con viento fuerte?',
        fr: 'Quel est le danger d\'un empannage par vent fort ?',
        de: 'Welche Gefahr birgt eine Halse bei starkem Wind?',
        it: 'Che pericolo comporta una strambata con vento forte?',
      },
      options: [
        {
          id: 'jb-q2-a',
          correct: false,
          label: {
            ru: 'Яхта замирает в неходовой зоне',
            en: 'The boat stalls in the no-go zone',
            pl: 'Jacht zatrzymuje się w kącie martwym',
            es: 'El barco se queda parado en la zona muerta',
            fr: 'Le bateau s\'arrête dans la zone morte',
            de: 'Das Boot bleibt im toten Winkel stehen',
            it: 'La barca si ferma nell\'angolo morto',
          },
        },
        {
          id: 'jb-q2-b',
          correct: true,
          label: {
            ru: 'Гик может ударить экипаж по голове или сломать снасть',
            en: 'The boom can hit a crew member in the head or break gear',
            pl: 'Bom może uderzyć kogoś w głowę albo uszkodzić osprzęt',
            es: 'La botavara puede golpear a alguien en la cabeza o romper la jarcia',
            fr: 'La bôme peut frapper un équipier à la tête ou casser du matériel',
            de: 'Der Baum kann jemanden am Kopf treffen oder Beschläge brechen',
            it: 'Il boma può colpire qualcuno alla testa o rompere l\'attrezzatura',
          },
        },
        {
          id: 'jb-q2-c',
          correct: false,
          label: {
            ru: 'Парус заштилеет с подветренной стороны',
            en: 'The sail will be becalmed on the leeward side',
            pl: 'Żagiel straci wiatr po stronie zawietrznej',
            es: 'La vela se quedará sin viento a sotavento',
            fr: 'La voile sera déventée sous le vent',
            de: 'Das Segel verliert in Lee den Wind',
            it: 'La vela resterà senza vento sottovento',
          },
        },
      ],
      explanation: {
        ru: 'Резкий перелёт гика - главная опасность поворота фордевинд. Поэтому перед поворотом гика-шкот выбирают как можно туже, а после перекидки быстро травят. В сильный ветер до центра гик не выбрать, и он проходит большую дугу: держись и пригибайся.',
        en: 'A sudden boom swing is the main jibing hazard. So before the gybe the mainsheet is hauled in as tight as possible and eased quickly once the boom has crossed. In strong wind it cannot be brought to the centre and the boom sweeps a wide arc: hold on and duck.',
        pl: 'Gwałtowny przerzut bomu to główne zagrożenie przy zwrocie przez rufę. Dlatego przed zwrotem szot grota wybiera się jak najmocniej, a po przerzucie szybko luzuje. Przy silnym wietrze bomu nie da się wybrać do środka i przechodzi on szerokim łukiem: trzymaj się i schyl głowę.',
        es: 'El paso brusco de la botavara es el mayor peligro de la trasluchada. Por eso, antes de trasluchar, se caza la escota de mayor todo lo posible y se larga rápido cuando la botavara ha pasado. Con viento fuerte no se puede llevar al centro y barre un arco amplio: agárrate y agacha la cabeza.',
        fr: 'Le passage brutal de la bôme est le principal danger de l\'empannage. Avant d\'empanner, on borde donc l\'écoute de grand-voile au maximum, puis on la choque vite une fois la bôme passée. Par vent fort, impossible de la ramener au centre : elle balaie un grand arc, tiens-toi et baisse la tête.',
        de: 'Das schlagartige Überkommen des Baums ist die Hauptgefahr der Halse. Deshalb wird die Großschot vor der Halse so dicht wie möglich geholt und nach dem Überkommen schnell gefiert. Bei starkem Wind lässt sich der Baum nicht bis zur Mitte holen und schlägt in einem weiten Bogen über: festhalten und Kopf runter.',
        it: 'Il passaggio brusco del boma è il pericolo principale della strambata. Per questo prima di strambare si cazza la scotta della randa il più possibile e la si lasca in fretta appena il boma è passato. Con vento forte non si riesce a portarlo al centro e il boma spazza un arco ampio: tieniti e abbassa la testa.',
      },
    },
  ],

  'vmg-beating': [
    {
      id: 'vmg-q1',
      prompt: {
        ru: 'Что означает аббревиатура VMG?',
        en: 'What does VMG stand for?',
        pl: 'Co oznacza skrót VMG?',
        es: '¿Qué significa la sigla VMG?',
        fr: 'Que veut dire le sigle VMG ?',
        de: 'Wofür steht die Abkürzung VMG?',
        it: 'Che cosa significa la sigla VMG?',
      },
      options: [
        {
          id: 'vmg-q1-a',
          correct: true,
          label: {
            ru: 'Velocity Made Good - скорость продвижения к цели',
            en: 'Velocity Made Good - effective speed toward the goal',
            pl: 'Velocity Made Good: prędkość zbliżania się do celu',
            es: 'Velocity Made Good: velocidad de avance hacia el objetivo',
            fr: 'Velocity Made Good : vitesse de progression vers l\'objectif',
            de: 'Velocity Made Good: Geschwindigkeit in Richtung Ziel',
            it: 'Velocity Made Good: velocità di avvicinamento all\'obiettivo',
          },
        },
        {
          id: 'vmg-q1-b',
          correct: false,
          label: {
            ru: 'Variable Mast Gear - изменяемая оснастка мачты',
            en: 'Variable Mast Gear - the rigging adjustment system',
            pl: 'Variable Mast Gear: regulowane olinowanie masztu',
            es: 'Variable Mast Gear: jarcia regulable del mástil',
            fr: 'Variable Mast Gear : gréement réglable du mât',
            de: 'Variable Mast Gear: verstellbares Mastrigg',
            it: 'Variable Mast Gear: attrezzatura regolabile dell\'albero',
          },
        },
        {
          id: 'vmg-q1-c',
          correct: false,
          label: {
            ru: 'Vessel Marine GPS - судовой морской навигатор',
            en: 'Vessel Marine GPS - the marine GPS unit on board',
            pl: 'Vessel Marine GPS: jachtowy nawigator GPS',
            es: 'Vessel Marine GPS: el GPS náutico de a bordo',
            fr: 'Vessel Marine GPS : le GPS marine du bord',
            de: 'Vessel Marine GPS: das Marine-GPS an Bord',
            it: 'Vessel Marine GPS: il GPS nautico di bordo',
          },
        },
      ],
      explanation: {
        ru: 'VMG - проекция скорости яхты на направление к цели. Можно идти быстро по воде, но иметь низкий VMG, если курс не оптимален.',
        en: 'VMG is the projection of the boat\'s speed onto the direction of the goal. You can be fast through the water yet have low VMG if the course is wrong.',
        pl: 'VMG to rzut prędkości jachtu na kierunek do celu. Można płynąć szybko po wodzie, a mieć niskie VMG, jeśli kurs nie jest optymalny.',
        es: 'El VMG es la proyección de la velocidad del barco sobre la dirección al objetivo. Puedes ir rápido en el agua y tener un VMG bajo si el rumbo no es el óptimo.',
        fr: 'La VMG est la projection de la vitesse du bateau sur la direction de l\'objectif. On peut aller vite sur l\'eau et avoir une VMG faible si le cap n\'est pas optimal.',
        de: 'VMG ist die Projektion der Bootsgeschwindigkeit auf die Richtung zum Ziel. Du kannst schnell durchs Wasser fahren und trotzdem eine niedrige VMG haben, wenn der Kurs nicht optimal ist.',
        it: 'La VMG è la proiezione della velocità della barca sulla direzione dell\'obiettivo. Puoi andare veloce sull\'acqua e avere una VMG bassa se la rotta non è ottimale.',
      },
    },
    {
      id: 'vmg-q2',
      prompt: {
        ru: 'Зачем яхтсмены идут зигзагом против ветра?',
        en: 'Why do sailors zigzag upwind?',
        pl: 'Dlaczego żeglarze płyną pod wiatr zygzakiem?',
        es: '¿Por qué los navegantes suben contra el viento en zigzag?',
        fr: 'Pourquoi les marins remontent-ils au vent en zigzag ?',
        de: 'Warum segeln Segler im Zickzack gegen den Wind?',
        it: 'Perché i velisti risalgono il vento a zigzag?',
      },
      options: [
        {
          id: 'vmg-q2-a',
          correct: false,
          label: {
            ru: 'Это требует устав соревнований',
            en: 'It is required by the racing rules',
            pl: 'Wymagają tego przepisy regatowe',
            es: 'Lo exige el reglamento de regatas',
            fr: 'Le règlement de course l\'exige',
            de: 'Die Wettfahrtregeln verlangen es',
            it: 'Lo richiede il regolamento di regata',
          },
        },
        {
          id: 'vmg-q2-b',
          correct: true,
          label: {
            ru: 'Прямо в ветер яхта идти не может, поэтому идёт галсами под ~45°',
            en: 'A sailboat cannot sail straight into the wind, so it tacks at about 45 degrees',
            pl: 'Jacht nie popłynie prosto pod wiatr, więc halsuje pod kątem ~45°',
            es: 'El barco no puede ir directo contra el viento, así que da bordos a ~45°',
            fr: 'Un voilier ne peut pas aller droit contre le vent, il tire donc des bords à ~45°',
            de: 'Direkt gegen den Wind kann ein Boot nicht segeln, deshalb kreuzt es unter ~45°',
            it: 'La barca non può andare dritta controvento, quindi bordeggia a ~45°',
          },
        },
        {
          id: 'vmg-q2-c',
          correct: false,
          label: {
            ru: 'Чтобы пугать соперников',
            en: 'To intimidate competitors',
            pl: 'Żeby straszyć rywali',
            es: 'Para asustar a los rivales',
            fr: 'Pour effrayer les concurrents',
            de: 'Um die Gegner einzuschüchtern',
            it: 'Per spaventare gli avversari',
          },
        },
      ],
      explanation: {
        ru: 'Лавировка - это компромисс: больше пути по воде, зато можно идти на оптимальном TWA ~45°. Сумма «продвижений к ветру» (VMG) даёт максимум.',
        en: 'Beating is a tradeoff: longer path through the water, but you stay at the optimal close-hauled angle (~45 degrees). The combined upwind progress (VMG) is best.',
        pl: 'Halsowanie to kompromis: dłuższa droga po wodzie, ale płyniesz na optymalnym TWA ~45°. Suma "postępów pod wiatr" (VMG) jest wtedy największa.',
        es: 'Dar bordos es un compromiso: recorres más camino por el agua, pero navegas con el TWA óptimo de ~45°. La suma del avance hacia barlovento (VMG) es máxima.',
        fr: 'Louvoyer est un compromis : plus de route sur l\'eau, mais tu navigues au TWA optimal de ~45°. Le gain au vent cumulé (VMG) est alors maximal.',
        de: 'Kreuzen ist ein Kompromiss: ein längerer Weg durchs Wasser, dafür segelst du mit dem optimalen TWA von ~45°. Der summierte Höhengewinn (VMG) ist so am größten.',
        it: 'Bordeggiare è un compromesso: più strada sull\'acqua, ma navighi al TWA ottimale di ~45°. La somma dei guadagni controvento (VMG) è massima.',
      },
    },
  ],

  'simple-rules': [
    {
      id: 'sr-q1',
      prompt: {
        ru: 'Кто имеет право дороги: яхта на правом галсе или на левом?',
        en: 'Who has right of way: starboard tack or port tack?',
        pl: 'Kto ma prawo drogi: jacht na prawym halsie czy na lewym?',
        es: '¿Quién tiene derecho de paso: el barco amurado a estribor o el amurado a babor?',
        fr: 'Qui est prioritaire : le bateau tribord amures ou bâbord amures ?',
        de: 'Wer hat Wegerecht: das Boot auf Steuerbordbug oder auf Backbordbug?',
        it: 'Chi ha diritto di rotta: la barca con mure a dritta o quella con mure a sinistra?',
      },
      options: [
        {
          id: 'sr-q1-a',
          correct: true,
          label: {
            ru: 'Правый галс (starboard) - ветер с правого борта',
            en: 'Starboard tack - wind on the starboard side',
            pl: 'Prawy hals (starboard): wiatr z prawej burty',
            es: 'Amurado a estribor (starboard): viento por estribor',
            fr: 'Tribord amures (starboard) : le vent vient de tribord',
            de: 'Steuerbordbug (starboard): Wind von Steuerbord',
            it: 'Mure a dritta (starboard): vento da dritta',
          },
        },
        {
          id: 'sr-q1-b',
          correct: false,
          label: {
            ru: 'Левый галс (port) - ветер с левого борта',
            en: 'Port tack - wind on the port side',
            pl: 'Lewy hals (port): wiatr z lewej burty',
            es: 'Amurado a babor (port): viento por babor',
            fr: 'Bâbord amures (port) : le vent vient de bâbord',
            de: 'Backbordbug (port): Wind von Backbord',
            it: 'Mure a sinistra (port): vento da sinistra',
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
            fr: 'Celui qui crie le premier',
            de: 'Wer zuerst ruft',
            it: 'Chi grida per primo',
          },
        },
      ],
      explanation: {
        ru: 'Правило RRS 10 / COLREGS 12: яхта на правом галсе имеет право дороги. На левом - обязана уступать (тактическая команда «Starboard!»).',
        en: 'RRS 10 / COLREGS 12: a boat on starboard tack has right of way. The port-tack boat must keep clear (the classic call is "Starboard!").',
        pl: 'Przepis 10 RRS / prawidło 12 MPZZM: jacht na prawym halsie ma prawo drogi. Jacht na lewym musi ustąpić drogi (w regatach woła się wtedy "Starboard!").',
        es: 'RRS 10 / RIPA 12: el barco amurado a estribor tiene derecho de paso. El amurado a babor debe mantenerse separado (el grito típico es "Starboard!").',
        fr: 'RRS 10 / RIPAM 12 : le bateau tribord amures est prioritaire. Le bateau bâbord amures doit se maintenir à l\'écart (on crie "Tribord !").',
        de: 'RRS 10 / KVR 12: Das Boot auf Steuerbordbug hat Wegerecht. Das Boot auf Backbordbug muss sich freihalten (Zuruf: "Steuerbord!").',
        it: 'RRS 10 / COLREG 12: la barca con mure a dritta ha diritto di rotta. Quella con mure a sinistra deve tenersi discosta (il grido tipico è "Starboard!").',
      },
    },
    {
      id: 'sr-q2',
      prompt: {
        ru: 'Две яхты идут одним галсом. Кто кому уступает?',
        en: 'Two boats are on the same tack. Who gives way?',
        pl: 'Dwa jachty płyną tym samym halsem. Kto komu ustępuje?',
        es: 'Dos barcos navegan con la misma amura. ¿Quién cede el paso?',
        fr: 'Deux bateaux sont sur la même amure. Qui doit s\'écarter ?',
        de: 'Zwei Boote segeln auf demselben Bug. Wer muss ausweichen?',
        it: 'Due barche navigano con le stesse mure. Chi deve dare la precedenza?',
      },
      options: [
        {
          id: 'sr-q2-a',
          correct: false,
          label: {
            ru: 'Подветренная яхта (leeward)',
            en: 'The leeward boat',
            pl: 'Jacht zawietrzny (leeward)',
            es: 'El barco de sotavento (leeward)',
            fr: 'Le bateau sous le vent (leeward)',
            de: 'Das Leeboot (leeward)',
            it: 'La barca sottovento (leeward)',
          },
        },
        {
          id: 'sr-q2-b',
          correct: true,
          label: {
            ru: 'Наветренная яхта (windward) - уступает подветренной',
            en: 'The windward boat keeps clear of the leeward boat',
            pl: 'Jacht nawietrzny (windward): ustępuje zawietrznemu',
            es: 'El barco de barlovento (windward): cede el paso al de sotavento',
            fr: 'Le bateau au vent (windward) : il s\'écarte du bateau sous le vent',
            de: 'Das Luvboot (windward): Es weicht dem Leeboot aus',
            it: 'La barca sopravvento (windward): dà la precedenza a quella sottovento',
          },
        },
        {
          id: 'sr-q2-c',
          correct: false,
          label: {
            ru: 'Та, что идёт быстрее',
            en: 'The faster boat',
            pl: 'Ten, który płynie szybciej',
            es: 'El que va más rápido',
            fr: 'Le plus rapide',
            de: 'Das schnellere Boot',
            it: 'Quella più veloce',
          },
        },
      ],
      explanation: {
        ru: 'Правило RRS 11: при одном галсе наветренная яхта (та, что выше по ветру) обязана уступать подветренной.',
        en: 'RRS 11: when on the same tack, the windward boat (the one closer to the wind) must keep clear of the leeward boat.',
        pl: 'Przepis 11 RRS: na tym samym halsie jacht nawietrzny (ten wyżej na wietrze) musi ustąpić zawietrznemu.',
        es: 'Regla 11 del RRS: con la misma amura, el barco de barlovento (el que está más arriba respecto al viento) debe mantenerse separado del de sotavento.',
        fr: 'Règle 11 des RRS : sur la même amure, le bateau au vent (celui qui est le plus haut par rapport au vent) doit s\'écarter du bateau sous le vent.',
        de: 'RRS-Regel 11: Auf gleichem Bug muss das Luvboot (das weiter in Luv liegt) dem Leeboot ausweichen.',
        it: 'Regola 11 RRS: con le stesse mure, la barca sopravvento (quella più in alto rispetto al vento) deve tenersi discosta da quella sottovento.',
      },
    },
    {
      id: 'sr-q3',
      prompt: {
        ru: 'Что делает яхта, обгоняющая другую?',
        en: 'What does a boat overtaking another have to do?',
        pl: 'Co robi jacht, który wyprzedza inny?',
        es: '¿Qué hace un barco que adelanta a otro?',
        fr: 'Que fait un bateau qui en dépasse un autre ?',
        de: 'Was tut ein Boot, das ein anderes überholt?',
        it: 'Che cosa fa una barca che ne sorpassa un\'altra?',
      },
      options: [
        {
          id: 'sr-q3-a',
          correct: true,
          label: {
            ru: 'Уступает дорогу обгоняемой яхте',
            en: 'Keeps clear of the boat being overtaken',
            pl: 'Ustępuje drogi wyprzedzanemu jachtowi',
            es: 'Se mantiene separado del barco al que adelanta',
            fr: 'Il s\'écarte du bateau qu\'il dépasse',
            de: 'Es weicht dem überholten Boot aus',
            it: 'Si tiene discosta dalla barca sorpassata',
          },
        },
        {
          id: 'sr-q3-b',
          correct: false,
          label: {
            ru: 'Кричит «Я обгоняю!» и идёт прямо',
            en: 'Shouts "Overtaking!" and continues straight',
            pl: 'Krzyczy "Wyprzedzam!" i płynie prosto',
            es: 'Grita "¡Te adelanto!" y sigue recto',
            fr: 'Il crie "Je double !" et continue tout droit',
            de: 'Es ruft "Ich überhole!" und fährt geradeaus weiter',
            it: 'Grida "Sorpasso!" e tira dritto',
          },
        },
        {
          id: 'sr-q3-c',
          correct: false,
          label: {
            ru: 'Останавливается и ждёт',
            en: 'Stops and waits',
            pl: 'Zatrzymuje się i czeka',
            es: 'Se detiene y espera',
            fr: 'Il s\'arrête et attend',
            de: 'Es hält an und wartet',
            it: 'Si ferma e aspetta',
          },
        },
      ],
      explanation: {
        ru: 'RRS / COLREGS: догоняющая яхта всегда уступает. Это базовое правило мореходства, действует и в гонке, и в свободном плавании.',
        en: 'RRS / COLREGS: an overtaking boat always keeps clear. It\'s a fundamental rule that applies both in racing and in free sailing.',
        pl: 'RRS / MPZZM: jacht doganiający zawsze ustępuje. To podstawowa zasada żeglugi, obowiązuje w regatach i poza nimi.',
        es: 'RRS / RIPA: el barco que alcanza a otro siempre se mantiene separado. Es una regla básica de la navegación, en regata y fuera de ella.',
        fr: 'RRS / RIPAM : le bateau qui en rattrape un autre s\'écarte toujours. C\'est une règle de base de la navigation, en course comme en croisière.',
        de: 'RRS / KVR: Wer aufholt, weicht immer aus. Eine Grundregel der Seefahrt, in der Wettfahrt wie beim freien Segeln.',
        it: 'RRS / COLREG: la barca che ne raggiunge un\'altra si tiene sempre discosta. È una regola base della navigazione, in regata come in crociera.',
      },
    },
  ],

  'mini-race': [
    {
      id: 'mr-q1',
      prompt: {
        ru: 'Что такое стартовая линия в гонке?',
        en: 'What is the start line in a race?',
        pl: 'Czym jest linia startu w wyścigu?',
        es: '¿Qué es la línea de salida de una regata?',
        fr: 'Qu\'est-ce que la ligne de départ d\'une course ?',
        de: 'Was ist die Startlinie einer Wettfahrt?',
        it: 'Che cos\'è la linea di partenza di una regata?',
      },
      options: [
        {
          id: 'mr-q1-a',
          correct: true,
          label: {
            ru: 'Воображаемая линия между судейским катером и стартовым знаком',
            en: 'An imaginary line between the committee boat and the start mark',
            pl: 'Wyobrażona linia między łodzią komisji sędziowskiej a znakiem startowym',
            es: 'Una línea imaginaria entre el barco del comité y la baliza de salida',
            fr: 'Une ligne imaginaire entre le bateau comité et la bouée de départ',
            de: 'Eine gedachte Linie zwischen dem Startschiff und der Starttonne',
            it: 'Una linea immaginaria tra la barca giuria e la boa di partenza',
          },
        },
        {
          id: 'mr-q1-b',
          correct: false,
          label: {
            ru: 'Финишная линия предыдущей гонки',
            en: 'The finish line of the previous race',
            pl: 'Linia mety poprzedniego wyścigu',
            es: 'La línea de llegada de la regata anterior',
            fr: 'La ligne d\'arrivée de la course précédente',
            de: 'Die Ziellinie der vorigen Wettfahrt',
            it: 'La linea di arrivo della regata precedente',
          },
        },
        {
          id: 'mr-q1-c',
          correct: false,
          label: {
            ru: 'Линия берега напротив базы',
            en: 'The shoreline opposite the marina',
            pl: 'Linia brzegu naprzeciwko przystani',
            es: 'La línea de costa frente a la base',
            fr: 'Le rivage en face de la base',
            de: 'Die Uferlinie gegenüber dem Hafen',
            it: 'La linea di costa di fronte alla base',
          },
        },
      ],
      explanation: {
        ru: 'Стартовая линия - между судейским катером (один конец) и стартовым знаком (другой). Пересекать её до сигнала старта = фальстарт.',
        en: 'The start line runs between the committee boat (one end) and the start mark (the other). Crossing before the start signal is OCS (over early).',
        pl: 'Linia startu biegnie między łodzią komisji (jeden koniec) a znakiem startowym (drugi). Przekroczenie jej przed sygnałem startu to falstart (OCS).',
        es: 'La línea de salida va del barco del comité (un extremo) a la baliza de salida (el otro). Cruzarla antes de la señal de salida es una salida anticipada (OCS).',
        fr: 'La ligne de départ va du bateau comité (une extrémité) à la bouée de départ (l\'autre). La franchir avant le signal de départ, c\'est un départ anticipé (OCS).',
        de: 'Die Startlinie liegt zwischen Startschiff (ein Ende) und Starttonne (anderes Ende). Wer sie vor dem Startsignal überquert, macht einen Frühstart (OCS).',
        it: 'La linea di partenza va dalla barca giuria (un\'estremità) alla boa di partenza (l\'altra). Tagliarla prima del segnale di partenza è una partenza anticipata (OCS).',
      },
    },
    {
      id: 'mr-q2',
      prompt: {
        ru: 'Где находится наветренный знак (windward mark) на типичной дистанции?',
        en: 'Where is the windward mark on a typical race course?',
        pl: 'Gdzie leży znak nawietrzny (windward mark) na typowej trasie?',
        es: '¿Dónde está la baliza de barlovento (windward mark) en un recorrido típico?',
        fr: 'Où se trouve la bouée au vent (windward mark) sur un parcours classique ?',
        de: 'Wo liegt die Luvtonne (windward mark) auf einer typischen Regattabahn?',
        it: 'Dove si trova la boa di bolina (windward mark) in un percorso tipico?',
      },
      options: [
        {
          id: 'mr-q2-a',
          correct: true,
          label: {
            ru: 'Прямо вверх по ветру от линии старта',
            en: 'Directly upwind from the start line',
            pl: 'Prosto pod wiatr od linii startu',
            es: 'Justo a barlovento de la línea de salida',
            fr: 'Juste au vent de la ligne de départ',
            de: 'Direkt in Luv der Startlinie',
            it: 'Dritta sopravvento rispetto alla linea di partenza',
          },
        },
        {
          id: 'mr-q2-b',
          correct: false,
          label: {
            ru: 'Прямо вниз по ветру от линии старта',
            en: 'Directly downwind from the start line',
            pl: 'Prosto z wiatrem od linii startu',
            es: 'Justo a sotavento de la línea de salida',
            fr: 'Juste sous le vent de la ligne de départ',
            de: 'Direkt in Lee der Startlinie',
            it: 'Dritta sottovento rispetto alla linea di partenza',
          },
        },
        {
          id: 'mr-q2-c',
          correct: false,
          label: {
            ru: 'Сбоку от трассы, не используется',
            en: 'Off to the side of the course, not used',
            pl: 'Z boku trasy, nieużywany',
            es: 'A un lado del recorrido, sin usar',
            fr: 'Sur le côté du parcours, inutilisée',
            de: 'Seitlich der Bahn, wird nicht benutzt',
            it: 'Di lato al percorso, non usata',
          },
        },
      ],
      explanation: {
        ru: 'Наветренный знак - первая поворотная точка. До неё яхты лавируют против ветра. После него обычно идут на подветренный знак или финиш.',
        en: 'The windward mark is the first turning point. Boats beat upwind to reach it. After rounding, they typically run downwind to the leeward mark or the finish.',
        pl: 'Znak nawietrzny to pierwszy punkt zwrotny. Jachty halsują do niego pod wiatr. Po jego opłynięciu zwykle płyną do znaku zawietrznego albo na metę.',
        es: 'La baliza de barlovento es el primer punto de giro. Los barcos llegan a ella dando bordos contra el viento. Después suelen ir a la baliza de sotavento o a la llegada.',
        fr: 'La bouée au vent est la première marque à contourner. Les bateaux y montent en louvoyant. Ensuite, ils descendent en général vers la bouée sous le vent ou l\'arrivée.',
        de: 'Die Luvtonne ist die erste Wendemarke. Die Boote kreuzen gegen den Wind zu ihr hinauf. Danach geht es meist zur Leetonne oder ins Ziel.',
        it: 'La boa di bolina è il primo punto di virata del percorso. Le barche la raggiungono bordeggiando controvento. Dopo di solito vanno alla boa di poppa o all\'arrivo.',
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
