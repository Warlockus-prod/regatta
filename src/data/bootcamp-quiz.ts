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

import type { Language as Lang } from "../lib/product/catalog";
// The no-go number is the engine's (src/data/no-go-zone.ts); relative import for Metro.
import { NO_GO_HALF_DEG } from "../lib/sailing-physics/constants";

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
        ru: 'Флаг на корме вытянут на юг. Как называется этот ветер?',
        en: 'The flag at the stern streams out to the south. What is this wind called?',
        pl: 'Bandera na rufie wyciąga się na południe. Jak nazywa się ten wiatr?',
        es: 'La bandera de popa ondea hacia el sur. ¿Cómo se llama este viento?',
        fr: 'Le pavillon arrière flotte vers le sud. Comment s\'appelle ce vent ?',
        de: 'Die Flagge am Heck weht nach Süden aus. Wie heißt dieser Wind?',
        it: 'La bandiera di poppa sventola verso sud. Come si chiama questo vento?',
      },
      options: [
        {
          id: 'wd-q1-a',
          correct: true,
          label: {
            ru: 'Северный: ветер называют по стороне, откуда он дует',
            en: 'A north wind: a wind is named after where it comes from',
            pl: 'Północny: wiatr nazywa się od strony, z której wieje',
            es: 'Viento del norte: el viento se nombra por donde viene',
            fr: 'Vent du nord : un vent porte le nom de sa provenance',
            de: 'Nordwind: Ein Wind heißt nach der Richtung, aus der er kommt',
            it: 'Vento da nord: il vento prende il nome da dove arriva',
          },
        },
        {
          id: 'wd-q1-b',
          correct: false,
          label: {
            ru: 'Южный: туда показывает флаг',
            en: 'A south wind: that is where the flag points',
            pl: 'Południowy: tam wskazuje bandera',
            es: 'Viento del sur: hacia allí apunta la bandera',
            fr: 'Vent du sud : c\'est là que pointe le pavillon',
            de: 'Südwind: Dorthin zeigt die Flagge',
            it: 'Vento da sud: è lì che punta la bandiera',
          },
        },
        {
          id: 'wd-q1-c',
          correct: false,
          label: {
            ru: 'Сказать нельзя, пока не знаешь курс лодки',
            en: 'You cannot tell until you know the boat\'s heading',
            pl: 'Nie da się powiedzieć, dopóki nie znasz kursu jachtu',
            es: 'No se puede saber sin conocer el rumbo del barco',
            fr: 'Impossible à dire sans connaître le cap du bateau',
            de: 'Das lässt sich ohne den Kurs des Bootes nicht sagen',
            it: 'Non si può dire finché non sai la rotta della barca',
          },
        },
      ],
      explanation: {
        ru: 'Ветер называют по тому, откуда он приходит. Флаг улетает по ветру, на юг, значит, воздух идёт с севера: ветер северный. Курс лодки название ветра не меняет, он меняет только сторону лодки, в которую ветер дует.',
        en: 'A wind is named after where it comes from. The flag streams downwind, to the south, so the air comes from the north: a north wind. The boat\'s heading does not change the name, only the side of the boat the wind blows on.',
        pl: 'Wiatr nazywa się od strony, z której przychodzi. Bandera leci z wiatrem, na południe, więc powietrze idzie z północy: wiatr północny. Kurs jachtu nie zmienia nazwy wiatru, zmienia tylko burtę, w którą wiatr wieje.',
        es: 'El viento se nombra por donde viene. La bandera ondea a favor del viento, hacia el sur, así que el aire llega del norte: viento del norte. El rumbo del barco no cambia el nombre, solo el costado por el que entra el viento.',
        fr: 'Un vent porte le nom de sa provenance. Le pavillon flotte sous le vent, vers le sud : l\'air vient donc du nord, c\'est un vent du nord. Le cap du bateau ne change pas ce nom, seulement le côté du bateau où souffle le vent.',
        de: 'Ein Wind heißt nach der Richtung, aus der er kommt. Die Flagge weht mit dem Wind nach Süden, die Luft kommt also aus Norden: Nordwind. Der Kurs des Bootes ändert den Namen nicht, nur die Seite des Bootes, auf die der Wind trifft.',
        it: 'Il vento prende il nome da dove arriva. La bandiera sventola sottovento, verso sud, quindi l\'aria arriva da nord: vento da nord. La rotta della barca non cambia il nome, cambia solo il lato della barca su cui soffia il vento.',
      },
    },
    {
      id: 'wd-q2',
      prompt: {
        ru: 'Ветер дует в правый борт, поперёк лодки. На какую сторону уходит гик с гротом?',
        en: 'The wind blows on the starboard side, across the boat. Which side does the boom with the mainsail go to?',
        pl: 'Wiatr wieje w prawą burtę, w poprzek jachtu. Na którą stronę idzie bom z grotem?',
        es: 'El viento entra por estribor, de través. ¿Hacia qué lado va la botavara con la mayor?',
        fr: 'Le vent souffle sur tribord, en travers du bateau. De quel côté part la bôme avec la grand-voile ?',
        de: 'Der Wind kommt von Steuerbord, quer zum Boot. Auf welche Seite geht der Baum mit dem Großsegel?',
        it: 'Il vento entra da dritta, di traverso. Da che lato va la boma con la randa?',
      },
      options: [
        {
          id: 'wd-q2-a',
          correct: false,
          label: {
            ru: 'На правую сторону, навстречу ветру',
            en: 'To the starboard side, into the wind',
            pl: 'Na prawą stronę, pod wiatr',
            es: 'A estribor, hacia el viento',
            fr: 'Sur tribord, face au vent',
            de: 'Nach Steuerbord, dem Wind entgegen',
            it: 'A dritta, verso il vento',
          },
        },
        {
          id: 'wd-q2-b',
          correct: true,
          label: {
            ru: 'На левую сторону, от ветра: она подветренная',
            en: 'To the port side, away from the wind: that is the leeward side',
            pl: 'Na lewą stronę, od wiatru: to strona zawietrzna',
            es: 'A babor, lejos del viento: es el lado de sotavento',
            fr: 'Sur bâbord, à l\'opposé du vent : c\'est le côté sous le vent',
            de: 'Nach Backbord, vom Wind weg: das ist die Leeseite',
            it: 'A sinistra, lontano dal vento: è il lato sottovento',
          },
        },
        {
          id: 'wd-q2-c',
          correct: false,
          label: {
            ru: 'Остаётся по центру лодки',
            en: 'It stays on the centreline',
            pl: 'Zostaje na środku jachtu',
            es: 'Se queda en el centro del barco',
            fr: 'Elle reste dans l\'axe du bateau',
            de: 'Er bleibt mittschiffs',
            it: 'Resta al centro della barca',
          },
        },
      ],
      explanation: {
        ru: 'Ветер давит на парус и уводит гик на сторону, противоположную ветру. Сторона, откуда дует ветер, наветренная (здесь правая), другая подветренная (левая).',
        en: 'The wind pushes the sail and carries the boom to the side away from it. The side the wind comes from is windward (here starboard), the other is leeward (port).',
        pl: 'Wiatr naciska na żagiel i odsuwa bom na stronę przeciwną do wiatru. Strona, z której wieje wiatr, jest nawietrzna (tu prawa), druga zawietrzna (lewa).',
        es: 'El viento empuja la vela y lleva la botavara al lado contrario. El lado por donde entra el viento es barlovento (aquí estribor), el otro es sotavento (babor).',
        fr: 'Le vent pousse la voile et emmène la bôme du côté opposé. Le côté d\'où vient le vent est au vent (ici tribord), l\'autre est sous le vent (bâbord).',
        de: 'Der Wind drückt auf das Segel und schiebt den Baum auf die windabgewandte Seite. Die Seite, von der der Wind kommt, ist Luv (hier Steuerbord), die andere Lee (Backbord).',
        it: 'Il vento spinge la vela e porta la boma dal lato opposto. Il lato da cui arriva il vento è sopravvento (qui dritta), l\'altro è sottovento (sinistra).',
      },
    },
    {
      id: 'wd-q3',
      prompt: {
        ru: 'Что такое мёртвая зона?',
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
            ru: 'Сектор прямо за кормой, куда под парусами идти нельзя',
            en: 'The sector dead astern, where a boat cannot sail',
            pl: 'Sektor prosto za rufą, w który nie da się płynąć na żaglach',
            es: 'El sector justo por popa, hacia el que no se puede navegar a vela',
            fr: 'Le secteur pile derrière, où un voilier ne peut pas aller',
            de: 'Der Sektor genau achteraus, in den man unter Segeln nicht fahren kann',
            it: 'Il settore dritto a poppa, dove a vela non si può andare',
          },
        },
        {
          id: 'wd-q3-b',
          correct: true,
          label: {
            ru: `Сектор ±${NO_GO_HALF_DEG}° по обе стороны от ветра, где парус не тянет`,
            en: `The sector within ±${NO_GO_HALF_DEG}° either side of the wind, where the sail cannot drive`,
            pl: `Sektor ±${NO_GO_HALF_DEG}° po obu stronach wiatru, w którym żagiel nie pracuje`,
            es: `El sector de ±${NO_GO_HALF_DEG}° a cada lado del viento, donde la vela no tira`,
            fr: `Le secteur de ±${NO_GO_HALF_DEG}° de chaque côté du vent, où la voile ne porte pas`,
            de: `Der Sektor von ±${NO_GO_HALF_DEG}° zu beiden Seiten des Windes, in dem das Segel nicht zieht`,
            it: `Il settore di ±${NO_GO_HALF_DEG}° per lato rispetto al vento, in cui la vela non lavora`,
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
        ru: `Парусная яхта не может идти прямо против ветра. Сектор примерно ±${NO_GO_HALF_DEG}° вокруг направления ветра - мёртвая зона.`,
        en: `A sailboat cannot sail directly into the wind. The sector roughly ±${NO_GO_HALF_DEG}° around the wind direction is the no-go zone.`,
        pl: `Jacht żaglowy nie popłynie prosto pod wiatr. Sektor mniej więcej ±${NO_GO_HALF_DEG}° wokół kierunku wiatru to kąt martwy.`,
        es: `Un velero no puede navegar directamente contra el viento. El sector de más o menos ±${NO_GO_HALF_DEG}° alrededor de la dirección del viento es la zona muerta.`,
        fr: `Un voilier ne peut pas avancer droit contre le vent. Le secteur d'environ ±${NO_GO_HALF_DEG}° autour de la direction du vent est la zone morte.`,
        de: `Ein Segelboot kann nicht direkt gegen den Wind segeln. Der Sektor von etwa ±${NO_GO_HALF_DEG}° um die Windrichtung ist der tote Winkel.`,
        it: `Una barca a vela non può andare dritta controvento. Il settore di circa ±${NO_GO_HALF_DEG}° attorno alla direzione del vento è l'angolo morto.`,
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
            ru: `Бейдевинд (close-hauled), TWA ~${NO_GO_HALF_DEG}°`,
            en: `Close-hauled, TWA around ${NO_GO_HALF_DEG} degrees`,
            pl: `Bajdewind (close-hauled), TWA ok. ${NO_GO_HALF_DEG}°`,
            es: `Ceñida (close-hauled), TWA ~${NO_GO_HALF_DEG}°`,
            fr: `Près (close-hauled), TWA ~${NO_GO_HALF_DEG}°`,
            de: `Hoch am Wind (close-hauled), TWA ~${NO_GO_HALF_DEG}°`,
            it: `Bolina (close-hauled), TWA ~${NO_GO_HALF_DEG}°`,
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
        ru: 'Что такое мёртвая зона относительно курсов?',
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
            ru: `Сектор острее бейдевинда: ~${NO_GO_HALF_DEG}° по обе стороны от ветра`,
            en: `The sector tighter than close-hauled: about ${NO_GO_HALF_DEG} degrees each side of the wind`,
            pl: `Sektor ostrzejszy niż bajdewind: ~${NO_GO_HALF_DEG}° po obu stronach wiatru`,
            es: `El sector más cerrado que la ceñida: ~${NO_GO_HALF_DEG}° a cada lado del viento`,
            fr: `Le secteur plus serré que le près : ~${NO_GO_HALF_DEG}° de chaque côté du vent`,
            de: `Der Bereich noch höher als hoch am Wind: ~${NO_GO_HALF_DEG}° zu beiden Seiten des Windes`,
            it: `Il settore più stretto della bolina: ~${NO_GO_HALF_DEG}° per lato rispetto al vento`,
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
            ru: 'Сектор около галфвинда, где лодку сильнее всего кренит',
            en: 'The sector around a beam reach, where the boat heels most',
            pl: 'Sektor w okolicy półwiatru, gdzie jacht najbardziej się przechyla',
            es: 'El sector cerca del través, donde el barco escora más',
            fr: 'Le secteur autour du travers, où le bateau gîte le plus',
            de: 'Der Bereich um den halben Wind, in dem das Boot am stärksten krängt',
            it: 'Il settore intorno al traverso, dove la barca sbanda di più',
          },
        },
      ],
      explanation: {
        ru: 'Чтобы идти к ветру, надо лавировать (зигзаг через бейдевинд). В мёртвой зоне парус не наполняется и яхта теряет ход.',
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
        ru: 'Оверштаг = поворот через нос. Нос пересекает линию ветра (через мёртвую зону), и яхта переходит с одного галса на другой.',
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
            ru: 'Яхта замирает в мёртвой зоне',
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
        en: 'A sudden boom swing is the main jibing hazard. So before the gybe the mainsheet is hauled in as tight as possible and eased quickly once the boom has crossed. In strong wind it cannot be brought to the center and the boom sweeps a wide arc: hold on and duck.',
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
        ru: 'Что показывает VMG на лавировке?',
        en: 'What does VMG show when you beat upwind?',
        pl: 'Co pokazuje VMG na halsówce?',
        es: '¿Qué indica el VMG cuando ciñes dando bordos?',
        fr: 'Que mesure la VMG quand tu louvoies ?',
        de: 'Was zeigt die VMG beim Kreuzen?',
        it: 'Che cosa indica la VMG quando bordeggi?',
      },
      options: [
        {
          id: 'vmg-q1-a',
          correct: true,
          label: {
            ru: 'С какой скоростью яхта продвигается против ветра',
            en: 'How fast the boat is making ground straight upwind',
            pl: 'Z jaką prędkością jacht posuwa się pod wiatr',
            es: 'A qué velocidad avanza el barco contra el viento',
            fr: 'À quelle vitesse le bateau progresse contre le vent',
            de: 'Wie schnell das Boot gegen den Wind Höhe gewinnt',
            it: 'A che velocità la barca guadagna controvento',
          },
        },
        {
          id: 'vmg-q1-b',
          correct: false,
          label: {
            ru: 'С какой скоростью яхта приближается к знаку в стороне от линии ветра',
            en: 'How fast the boat is closing on a mark that lies off the wind line',
            pl: 'Z jaką prędkością jacht zbliża się do znaku leżącego z boku linii wiatru',
            es: 'A qué velocidad se acerca el barco a una baliza situada fuera de la línea del viento',
            fr: 'À quelle vitesse le bateau se rapproche d\'une bouée située hors de l\'axe du vent',
            de: 'Wie schnell sich das Boot einer Bahnmarke abseits der Windachse nähert',
            it: 'A che velocità la barca si avvicina a una boa fuori dalla linea del vento',
          },
        },
        {
          id: 'vmg-q1-c',
          correct: false,
          label: {
            ru: 'Скорость яхты по воде, как её показывает лаг',
            en: 'The boat\'s speed through the water, as the log shows it',
            pl: 'Prędkość jachtu po wodzie, jak pokazuje ją log',
            es: 'La velocidad del barco en el agua que marca la corredera',
            fr: 'La vitesse du bateau sur l\'eau, celle qu\'affiche le loch',
            de: 'Die Fahrt durchs Wasser, wie die Logge sie anzeigt',
            it: 'La velocità della barca sull\'acqua, quella del log',
          },
        },
      ],
      explanation: {
        ru: 'VMG (Velocity Made Good) - проекция скорости яхты на направление ветра: сколько узлов она выигрывает против ветра на лавировке или по ветру на полных курсах. Скорость приближения к знаку, который лежит в стороне от ветра, называется VMC. Лаг показывает скорость по воде: она бывает высокой при низком VMG, если курс слишком полный.',
        en: 'VMG (velocity made good) is the boat\'s speed projected onto the wind direction: how many knots she gains upwind on a beat, or downwind on a run. The rate of closing on a mark that lies off the wind is called VMC. The log shows speed through the water, which can be high while VMG is low if you sail too free.',
        pl: 'VMG (velocity made good) to rzut prędkości jachtu na kierunek wiatru: ile węzłów zyskuje pod wiatr na halsówce albo z wiatrem na kursach pełnych. Prędkość zbliżania się do znaku leżącego z boku wiatru to VMC. Log pokazuje prędkość po wodzie: bywa wysoka przy niskim VMG, jeśli płyniesz za pełnym kursem.',
        es: 'El VMG (velocity made good) es la proyección de la velocidad del barco sobre la dirección del viento: cuántos nudos gana contra el viento en ceñida o a favor en los rumbos portantes. La velocidad de acercamiento a una baliza situada fuera del eje del viento se llama VMC. La corredera mide la velocidad en el agua, que puede ser alta con un VMG bajo si el rumbo es demasiado abierto.',
        fr: 'La VMG (velocity made good) est la vitesse du bateau projetée sur la direction du vent : combien de nœuds il gagne au vent en louvoyant, ou sous le vent au portant. La vitesse de rapprochement d\'une bouée située hors de l\'axe du vent s\'appelle la VMC. Le loch donne la vitesse sur l\'eau, qui peut être élevée avec une VMG faible si tu navigues trop abattu.',
        de: 'VMG (Velocity Made Good) ist die Bootsgeschwindigkeit, projiziert auf die Windrichtung: wie viele Knoten das Boot beim Kreuzen nach Luv oder raumschots nach Lee gutmacht. Die Annäherung an eine Bahnmarke abseits der Windachse heißt VMC. Die Logge zeigt die Fahrt durchs Wasser, die hoch sein kann, während die VMG niedrig ist, wenn du zu weit abfällst.',
        it: 'La VMG (velocity made good) è la velocità della barca proiettata sulla direzione del vento: quanti nodi guadagna controvento di bolina o sottovento nelle andature portanti. La velocità di avvicinamento a una boa fuori dall\'asse del vento si chiama VMC. Il log misura la velocità sull\'acqua, che può essere alta con una VMG bassa se la rotta è troppo poggiata.',
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
            ru: `Прямо в ветер яхта идти не может, поэтому идёт галсами под ~${NO_GO_HALF_DEG}°`,
            en: `A sailboat cannot sail straight into the wind, so it tacks at about ${NO_GO_HALF_DEG} degrees`,
            pl: `Jacht nie popłynie prosto pod wiatr, więc halsuje pod kątem ~${NO_GO_HALF_DEG}°`,
            es: `El barco no puede ir directo contra el viento, así que da bordos a ~${NO_GO_HALF_DEG}°`,
            fr: `Un voilier ne peut pas aller droit contre le vent, il tire donc des bords à ~${NO_GO_HALF_DEG}°`,
            de: `Direkt gegen den Wind kann ein Boot nicht segeln, deshalb kreuzt es unter ~${NO_GO_HALF_DEG}°`,
            it: `La barca non può andare dritta controvento, quindi bordeggia a ~${NO_GO_HALF_DEG}°`,
          },
        },
        {
          id: 'vmg-q2-c',
          correct: false,
          label: {
            ru: 'Зигзагом путь по воде короче, чем прямо к знаку',
            en: 'A zigzag is a shorter path through the water than a straight line to the mark',
            pl: 'Zygzakiem droga po wodzie jest krótsza niż prosto do znaku',
            es: 'En zigzag el camino por el agua es más corto que ir recto a la baliza',
            fr: 'En zigzag, la route sur l\'eau est plus courte que tout droit vers la bouée',
            de: 'Im Zickzack ist der Weg durchs Wasser kürzer als geradeaus zur Bahnmarke',
            it: 'A zigzag il percorso sull\'acqua è più corto che andare dritti alla boa',
          },
        },
      ],
      explanation: {
        ru: `Лавировка - это компромисс: больше пути по воде, зато можно идти на оптимальном TWA ~${NO_GO_HALF_DEG}°. Сумма «продвижений к ветру» (VMG) даёт максимум.`,
        en: `Beating is a tradeoff: longer path through the water, but you stay at the optimal close-hauled angle (~${NO_GO_HALF_DEG} degrees). The combined upwind progress (VMG) is best.`,
        pl: `Halsowanie to kompromis: dłuższa droga po wodzie, ale płyniesz na optymalnym TWA ~${NO_GO_HALF_DEG}°. Suma "postępów pod wiatr" (VMG) jest wtedy największa.`,
        es: `Dar bordos es un compromiso: recorres más camino por el agua, pero navegas con el TWA óptimo de ~${NO_GO_HALF_DEG}°. La suma del avance hacia barlovento (VMG) es máxima.`,
        fr: `Louvoyer est un compromis : plus de route sur l'eau, mais tu navigues au TWA optimal de ~${NO_GO_HALF_DEG}°. Le gain au vent cumulé (VMG) est alors maximal.`,
        de: `Kreuzen ist ein Kompromiss: ein längerer Weg durchs Wasser, dafür segelst du mit dem optimalen TWA von ~${NO_GO_HALF_DEG}°. Der summierte Höhengewinn (VMG) ist so am größten.`,
        it: `Bordeggiare è un compromesso: più strada sull'acqua, ma navighi al TWA ottimale di ~${NO_GO_HALF_DEG}°. La somma dei guadagni controvento (VMG) è massima.`,
      },
    },
  ],

  'simple-rules': [
    {
      id: 'sr-q1',
      prompt: {
        ru: 'В гонке у кого право дороги: у яхты на правом галсе или на левом?',
        en: 'In a race, who has right of way: starboard tack or port tack?',
        pl: 'Kto w regatach ma prawo drogi: jacht na prawym halsie czy na lewym?',
        es: 'En regata, ¿quién tiene derecho de paso: el barco amurado a estribor o el amurado a babor?',
        fr: 'En course, qui est prioritaire : le bateau tribord amures ou bâbord amures ?',
        de: 'Wer hat in der Wettfahrt Wegerecht: das Boot auf Steuerbordbug oder auf Backbordbug?',
        it: 'In regata, chi ha diritto di rotta: la barca con mure a dritta o quella con mure a sinistra?',
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
            ru: 'У той, что ближе к знаку',
            en: 'The one closer to the mark',
            pl: 'Ten, który jest bliżej znaku',
            es: 'El que está más cerca de la baliza',
            fr: 'Celui qui est le plus près de la bouée',
            de: 'Das Boot, das näher an der Bahnmarke ist',
            it: 'Quella più vicina alla boa',
          },
        },
      ],
      explanation: {
        ru: 'Правило 10 ППГ (RRS): яхта на правом галсе имеет право дороги, яхта на левом обязана уступить (окрик «Starboard!»). Вне гонки действует МППСС, и там говорят иначе: по правилу 12 парусное судно с ветром в левый борт уступает дорогу, а судно с ветром в правый борт сохраняет курс и скорость.',
        en: 'RRS 10: a boat on starboard tack has right of way and the port-tack boat must keep clear (the classic call is "Starboard!"). Outside a race the COLREGS apply, and they put it differently: under Rule 12 the sailing vessel with the wind on her port side gives way, and the one with the wind on her starboard side stands on, keeping her course and speed.',
        pl: 'Przepis 10 RRS: jacht na prawym halsie ma prawo drogi, jacht na lewym musi ustąpić (w regatach woła się wtedy "Starboard!"). Poza regatami obowiązuje MPZZM, które mówi o tym inaczej: według prawidła 12 statek żaglowy z wiatrem z lewej burty ustępuje z drogi, a statek z wiatrem z prawej burty utrzymuje kurs i prędkość.',
        es: 'Regla 10 del RRS: el barco amurado a estribor tiene derecho de paso y el amurado a babor debe mantenerse separado (el grito típico es "Starboard!"). Fuera de regata rige el RIPA, que lo dice de otro modo: según la regla 12, el velero que recibe el viento por babor se aparta, y el que lo recibe por estribor mantiene su rumbo y velocidad.',
        fr: 'Règle 10 des RRS : le bateau tribord amures est prioritaire, le bateau bâbord amures doit se maintenir à l\'écart (on crie "Tribord !"). Hors course, c\'est le RIPAM, qui le dit autrement : selon la règle 12, le voilier qui reçoit le vent par bâbord s\'écarte de la route, celui qui le reçoit par tribord maintient son cap et sa vitesse.',
        de: 'RRS-Regel 10: Das Boot auf Steuerbordbug hat Wegerecht, das Boot auf Backbordbug muss sich freihalten (Zuruf: "Steuerbord!"). Außerhalb der Wettfahrt gelten die KVR, die es anders sagen: Nach Regel 12 weicht das Segelfahrzeug mit dem Wind von Backbord aus, das mit dem Wind von Steuerbord hält Kurs und Geschwindigkeit bei.',
        it: 'Regola 10 RRS: la barca con mure a dritta ha diritto di rotta e quella con mure a sinistra deve tenersi discosta (il grido tipico è "Starboard!"). Fuori regata vale il COLREG, che lo dice in modo diverso: per la regola 12 il veliero con il vento a sinistra lascia libera la rotta, quello con il vento a dritta mantiene rotta e velocità.',
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
            ru: 'Держит свой курс: уступать должна обгоняемая яхта',
            en: 'Holds her course: the boat being overtaken must keep clear',
            pl: 'Trzyma swój kurs: ustąpić musi jacht wyprzedzany',
            es: 'Mantiene su rumbo: debe apartarse el barco adelantado',
            fr: 'Il garde son cap : c\'est au bateau dépassé de s\'écarter',
            de: 'Es hält seinen Kurs: Das überholte Boot muss ausweichen',
            it: 'Tiene la sua rotta: deve spostarsi la barca sorpassata',
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
        ru: 'В гонке по правилу 12 ППГ (RRS) яхта чисто позади уступает яхте чисто впереди. Вне гонки по правилу 13 МППСС обгоняющее судно уступает дорогу, а обгоняемое сохраняет курс и скорость.',
        en: 'In a race, RRS 12: a boat clear astern keeps clear of a boat clear ahead. Outside a race, COLREGS Rule 13: the overtaking vessel gives way and the one being overtaken stands on, keeping her course and speed.',
        pl: 'W regatach według przepisu 12 RRS jacht czysto z tyłu ustępuje jachtowi czysto z przodu. Poza regatami według prawidła 13 MPZZM statek wyprzedzający ustępuje z drogi, a wyprzedzany utrzymuje kurs i prędkość.',
        es: 'En regata, regla 12 del RRS: el barco claramente a popa se mantiene separado del que está claramente a proa. Fuera de regata, regla 13 del RIPA: el buque que alcanza se aparta y el alcanzado mantiene su rumbo y velocidad.',
        fr: 'En course, règle 12 des RRS : le bateau en route libre derrière s\'écarte de celui en route libre devant. Hors course, règle 13 du RIPAM : le navire qui rattrape s\'écarte de la route et celui qui est rattrapé maintient son cap et sa vitesse.',
        de: 'In der Wettfahrt gilt RRS-Regel 12: Ein klar achteraus liegendes Boot hält sich von einem klar voraus liegenden frei. Außerhalb der Wettfahrt gilt KVR-Regel 13: Der Überholer weicht aus, das überholte Fahrzeug hält Kurs und Geschwindigkeit bei.',
        it: 'In regata, regola 12 RRS: la barca libera dietro si tiene discosta da quella libera avanti. Fuori regata, regola 13 COLREG: la nave che raggiunge lascia libera la rotta e quella raggiunta mantiene rotta e velocità.',
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

// The pass mark lives with the answer key, which grades saved progress without
// this file's text.
export { QUIZ_PASS_THRESHOLD, isQuizPassed } from "./bootcamp-quiz-key";
