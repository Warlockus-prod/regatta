import { normalize, type MustItem } from '../../radio/rozmowa/dialogueGrading';

// ============================================================================
// Saying the answer out loud.
//
// The written exam is multiple choice, and a person can pass it by recognising
// four options without ever being able to produce one. The examiner does ask.
// So does the sea: nobody on a boat ever hands you four options.
//
// Twelve questions, each with a model answer and the elements that have to be
// IN it. You speak, it is transcribed, and each element is checked - the same
// machinery as the radio trainer, because it is the same skill: composing a
// correct sentence under pressure, in Polish, out loud.
//
// TWO THINGS THE REVIEW CHANGED, both worth knowing about:
//
// 1. Keyword lists have to survive Polish inflection. "wyprzedzajacy ustepuje"
//    fails on "Jednostka wyprzedzajaca zawsze ustepuje jednostce wyprzedzanej" -
//    a perfect answer - because of gender agreement and one interposed word. Every
//    list here is stemmed ("wyprzedzajac", not "wyprzedzajacy") for that reason.
//
// 2. A keyword must test the FACT, not the vocabulary. "zielony" and "czerwony"
//    both appearing somewhere passes a candidate who states IALA B - the reversed
//    system - which is exactly the error the question exists to catch. So the
//    colour is bound to the side: "zielony po prawej".
// ============================================================================

// --- binding a fact to a side ------------------------------------------------
//
// Several of these questions turn entirely on WHICH side, and no keyword can
// express that. Both colours appear in the answer that swaps them. A fixed phrase
// ("prawa strona zielona") is defeated by the words Polish puts in between
// ("prawa strona toru wodnego JEST zielona"). A loose word-gap lets "prawa strona
// czerwona, lewa zielona" through on adjacency. And nearest-word proximity fails
// in the most misleading way of all: in "...w prawo, a na wstecznym... w lewo",
// the word "prawo" sits four words BEFORE "wstecznym" while "lewo" sits five
// words after it, so the astern element scores the starboard answer.
//
// What works is reading it the way a person does: by CLAUSE. Clauses survive an
// unpunctuated transcript, because Polish marks the contrast with a word - "a",
// "ale", "natomiast", "tylko".
//
// THREE THINGS A NAIVE CLAUSE READER STILL GETS WRONG, all found by review:
//
//   1. NEGATION. "Na wstecznym rufa nie idzie w prawo, tylko w lewo" is correct,
//      and the clause naming the side names the WRONG direction. Read literally it
//      scores as the reversed rule. A denial asserts nothing: it contributes
//      neither evidence nor disqualification.
//
//   2. THE SUBJECT CARRIES. Once the denial is skipped, the clause that does the
//      asserting ("tylko w lewo") has no side word of its own. It inherits the
//      subject from the clause before it - and drops it the moment the OTHER side
//      is named, or the answer's second half would be scored against its first.
//
//   3. THE COUNTERFACTUAL. "W regionie IALA B jest odwrotnie: prawa strona jest
//      czerwona" is a sentence a GOOD candidate adds - and it states the reversed
//      rule out loud. The better the learner, the more certainly they failed. A
//      sentence that flags itself as the other region is not evidence about this
//      one, so it is dropped whole.

// A comma BETWEEN DIGITS is a decimal point, not a clause boundary: splitting on it
// tore "0,2 do 0,5" into pieces and lost the threshold the alcohol question grades.
const SPLIT = /(?<!\d)[,.;:!?]+(?!\d)|\s+(?:a|ale|oraz|natomiast|zas|wiec|czyli|tylko|lecz|jedynie)\s+/i;
const SENTENCE = /(?<=[.!?])\s+/;

/** A denial. "nie jest zielona" does not assert red - it asserts nothing. */
const NEG = /^(nie|nigdy)$/;

/** A sentence about the OTHER buoyage region says nothing about ours. */
const COUNTERFACTUAL = /\b(iala b|region b|regionie b|regionu b|odwrotnie|na odwrot)\b/;

const positions = (words: string[], re: RegExp): number[] =>
  words.reduce<number[]>((acc, w, i) => (re.test(w) ? [...acc, i] : acc), []);

/** Sentences that are evidence about THIS rule, split into clauses. */
function evidence(raw: string): string[][] {
  return raw
    .split(SENTENCE)
    .filter((sent) => !COUNTERFACTUAL.test(normalize(sent)))
    .flatMap((sent) => sent.split(SPLIT))
    .map((c) => normalize(c).split(' ').filter(Boolean))
    .filter((c) => c.length > 0);
}

/**
 * Is `side` paired with `right` rather than with `wrong`?
 *
 * `other` is the opposing side (lewa for prawa, wstecz for przod). It is what
 * stops the subject from carrying across the answer's second half.
 *
 * A clause that names the side and the right word, and not the wrong one, is
 * evidence. A clause that names the side and the WRONG word is the reversed rule,
 * stated, and disqualifying. If nothing settles it - a terse "prawa zielona lewa
 * czerwona" with no separator anywhere - fall back to which word sits closer, with
 * ties going to the learner. That fallback is refused outright when the transcript
 * contains a denial, because word distance cannot see a "nie".
 */
function binds(raw: string, side: RegExp, other: RegExp, right: RegExp, wrong: RegExp): boolean {
  let good = 0;
  let bad = 0;
  // A denied clause leaves its subject hanging for exactly ONE clause - the one that
  // does the asserting ("...nie idzie w prawo, TYLKO W LEWO"). It must not carry
  // further than that: a subject that survived to the next sentence picked up the
  // "dwa czarne stozki" of the topmark and scored it as the mark's body colour.
  let pending = false;

  for (const words of evidence(raw)) {
    const own = words.some((w) => side.test(w));
    const neg = words.some((w) => NEG.test(w));

    if (!own && words.some((w) => other.test(w))) { pending = false; continue; }
    if (own && neg) { pending = true; continue; }       // a denial asserts nothing
    if (!own && !pending) continue;
    if (neg) { pending = false; continue; }

    const r = words.some((w) => right.test(w));
    const x = words.some((w) => wrong.test(w));
    if (r && !x) good++;
    else if (x && !r) bad++;
    pending = false;                                    // the subject is spent
  }
  if (good > 0 || bad > 0) return good > 0 && bad === 0;

  const words = normalize(raw).split(' ');
  if (words.some((w) => NEG.test(w))) return false;   // unproven beats guessed

  const s = positions(words, side);
  const r = positions(words, right);
  const w = positions(words, wrong);
  if (s.length === 0 || r.length === 0) return false;

  const gap = (a: number[], b: number[]) => Math.min(...a.flatMap((x) => b.map((y) => Math.abs(x - y))));
  return gap(s, r) <= (w.length ? gap(s, w) : Infinity);
}

/** Does a clause mentioning `subject` also carry `needs`, and stay clear of `banned`? */
function clauseSays(raw: string, subject: RegExp, needs: RegExp, banned?: RegExp): boolean {
  return evidence(raw).some((words) => {
    const t = words.join(' ');
    if (!subject.test(t)) return false;
    if (banned && banned.test(t)) return false;
    return needs.test(t);
  });
}

// Whole words only: "prawoskretnej" is the propeller, not a side, and matching it
// as one would pair every right-handed prop with itself.
const RIGHT = /^praw(a|o|e|ej|ym|ych)?$/;
const LEFT = /^lew(a|o|e|ej|ym|ych)?$/;
const GREEN = /^zielon/;
const RED = /^czerwon/;
const AHEAD = /^(przod|przodu|przedni\w*)$/;
const ASTERN = /^wstecz\w*$/;
const TOP = /^gor(a|y|ze|na|nej|ne)?$/;
const BOTTOM = /^dol(u|e|na|nej|ne)?$/;
const BLACK = /^czarn/;
const YELLOW = /^zolt/;

export interface OralPrompt {
  id: string;
  topic: 'prawo drogi' | 'znaki' | 'bezpieczenstwo' | 'przepisy' | 'manewrowanie' | 'locja';
  questionPl: string;
  questionRu: string;
  modelPl: string;
  modelRu: string;
  must: MustItem[];
  whyPl: string;
  whyRu: string;
}

export const ORAL_PROMPTS: OralPrompt[] = [
  {
    id: 'sternik-oral-01',
    topic: 'prawo drogi',
    questionPl: 'Dwie łodzie motorowe zbliżają się na kursach krzyżujących. Która z nich ustępuje i jak powinna wykonać manewr?',
    questionRu: 'Две моторные лодки сближаются на пересекающихся курсах. Кто уступает и как выполняется маневр?',
    modelPl: 'Ustępuje ta jednostka, która ma drugą po swojej prawej burcie, czyli ta, która w nocy widzi czerwone światło burtowe drugiej łodzi. Manewr wykonuje odpowiednio wcześnie i wyraźnie, zwykle zmieniając kurs w prawo i przechodząc za rufą drugiej jednostki. Nie wolno przecinać jej kursu przed dziobem. Jednostka utrzymująca kurs i prędkość (ta, która ma prawo drogi) utrzymuje kurs i prędkość, ale cały czas obserwuje i może, a w końcu musi, manewrować sama, żeby uniknąć zderzenia.',
    modelRu: 'Уступает то судно, у которого другое находится по правому борту, то есть тот, кто ночью видит красный бортовой огонь другого. Маневр делается заблаговременно и заметно: обычно поворот вправо и проход за кормой другого судна. Пересекать его курс перед носом нельзя. Судно, сохраняющее курс и скорость (имеющее право дороги), держит курс и скорость, но наблюдает и в конце концов обязано маневрировать само, чтобы избежать столкновения.',
    must: [
      {
        id: 'q1-e1',
        label: 'Kto ustępuje: ten, kto ma drugą jednostkę po PRAWEJ burcie (widzi jej czerwone światło)',
        anyOf: [
          'po prawej burcie', 'po swojej prawej', 'z prawej burty', 'z prawej strony',
          'prawej burcie', 'prawa burta', 'po prawej',
          // seeing the other vessel's RED sidelight means she is on your starboard:
          // the same fact, and a candidate is entitled to state it that way
          'czerwone światło', 'czerwona lampa',
        ],
        // Say "lewej" here and the rule is inverted. That is not a fumbled detail
        // that the one-miss allowance may forgive - it is the rule, backwards.
        critical: true,
      },
      {
        id: 'q1-e2',
        label: 'Manewr wczesny i wyraźny',
        anyOf: ['wczesn', 'wyraźn', 'zdecydowan', 'zawczasu', 'widoczn', 'znaczna zmiana', 'duża zmiana kursu'],
      },
      {
        id: 'q1-e3',
        label: 'Przejść za rufą, nie przecinać przed dziobem',
        anyOf: ['za rufą', 'za rufę', 'za jego rufą', 'za jej rufą', 'przechodzę za', 'przejdę za', 'przejść za', 'nie przecina', 'wolno przecinać', 'nie można przecinać', 'unikam przecinania', 'nie przechodzę przed dziobem'],
      },
      {
        id: 'q1-e4',
        label: 'Jednostka z prawem drogi utrzymuje kurs i prędkość',
        anyOf: ['utrzymuje kurs', 'kurs i prędkość', 'nie zmienia kursu', 'trzyma kurs', 'utrzymuj'],
      },
    ],
    whyPl: 'Klasyczny błąd: kandydat mówi tylko kto ma pierwszeństwo i nie mówi, że manewr ma być wczesny, wyraźny i za rufą.',
    whyRu: 'Классическая ошибка: говорят только о том, кто главный, и забывают, что маневр должен быть ранним, заметным и с проходом за кормой.',
  },
  {
    id: 'sternik-oral-02',
    topic: 'prawo drogi',
    questionPl: 'Kto ustępuje przy wyprzedzaniu i po czym poznajesz, że to ty jesteś jednostką wyprzedzającą?',
    questionRu: 'Кто уступает при обгоне и как понять, что обгоняющий это именно ты?',
    modelPl: 'Jednostka wyprzedzająca zawsze ustępuje jednostce wyprzedzanej, niezależnie od tego, czy wyprzedzam jacht żaglowy, czy motorowy. Jestem jednostką wyprzedzającą, jeśli zbliżam się z sektora ponad 22,5 stopnia za trawersem drugiej łodzi, czyli w nocy widzę tylko jej białe światło rufowe, bez świateł burtowych. Obowiązek ustępowania trwa aż do całkowitego wyminięcia i oddalenia się. Późniejsza zmiana wzajemnego namiaru nie zwalnia mnie z tego obowiązku.',
    modelRu: 'Обгоняющий всегда уступает обгоняемому, неважно, парусное это судно или моторное. Я обгоняющий, если подхожу из сектора более 22,5 градуса позади траверза, то есть ночью вижу только его белый кормовой огонь, без бортовых. Обязанность уступать сохраняется до полного обгона и расхождения. Изменение пеленга потом не освобождает меня от этой обязанности.',
    must: [
      {
        id: 'q2-e1',
        label: 'WYPRZEDZAJĄCY ustępuje wyprzedzanemu (nie odwrotnie)',
        anyOf: ['wyprzedzając', 'ustępuje wyprzedzanemu', 'ustępuje wyprzedzanej'],
        // Both participles appear in the sentence that reverses the rule, so a
        // keyword is useless: what decides it is WHICH VESSEL IS THE SUBJECT (the
        // one that gives way). Polish marks that by CASE, not word order: the
        // subject is nominative (wyprzedzajac-a / -y / -e, or a verb form), the
        // vessel given way to is dative (-ej / -emu). Position-based heuristics
        // failed both ways (a verb-first nominative "ustepuje jednostka wyprzedzana"
        // is backwards but passed; the gerund "przy wyprzedzaniu" before the verb
        // false-failed correct answers). So classify by ending, ignore position.
        test: (raw) => {
          const w = normalize(raw).split(' ');
          if (!w.some((x) => /^ustepuj/.test(x))) return false;
          // the OVERTAKING vessel as the subject giving way: nominative participle
          // (ends a/y/e, not the dative -ej/-emu) or a finite verb form
          const overtakingSubject = w.some((x) =>
            /^wyprzedzaj\w*(a|y|e)$/.test(x) || x === 'wyprzedza' || x === 'wyprzedzam' || x === 'wyprzedzaja' || x === 'wyprzedzajac' || x === 'wyprzedzajacy');
          // the OVERTAKEN vessel as the (nominative) subject = the rule backwards.
          // Excludes the gerund "wyprzedzaniu/wyprzedzania" (ends -iu/-ia, not a/y/e).
          const overtakenSubject = w.some((x) => /^wyprzedzan(a|y|e)$/.test(x));
          return overtakingSubject && !overtakenSubject;
        },
        critical: true,
      },
      {
        id: 'q2-e2',
        label: 'Sektor ponad 22,5 stopnia za trawersem',
        anyOf: ['22', '22 5', '22 i pół', 'dwadzieścia dwa', 'trawers', 'zza rufy', 'od rufy', 'z tyłu', 'sektor rufowy'],
      },
      {
        id: 'q2-e3',
        label: 'W nocy widać tylko białe światło rufowe',
        anyOf: ['rufowe', 'światło rufowe', 'białe światło', 'tylko białe', 'bez świateł burtowych'],
      },
      {
        id: 'q2-e4',
        label: 'Obowiązek trwa aż do całkowitego wyminięcia',
        anyOf: ['aż do', 'całkowit', 'do końca', 'wymin', 'minie i oddali', 'oddal', 'dopóki'],
      },
    ],
    whyPl: 'Ludzie myślą, że motorówka zawsze ustępuje żaglówce - przy wyprzedzaniu jest odwrotnie: żaglówka wyprzedzająca motorówkę też ustępuje.',
    whyRu: 'Многие думают, что моторка всегда уступает парусу. При обгоне наоборот: парусник, обгоняющий моторку, тоже уступает.',
  },
  {
    id: 'sternik-oral-03',
    topic: 'znaki',
    questionPl: 'Opisz znak kardynalny północny: jak wygląda, jakie ma światło i z której strony go mijamy?',
    questionRu: 'Опиши северный кардинальный знак: как выглядит, какой огонь и с какой стороны его обходят?',
    modelPl: 'Znak kardynalny północny jest u góry czarny, a na dole żółty. Znak szczytowy to dwa czarne stożki jeden nad drugim, oba skierowane wierzchołkami do góry. Światło jest białe, migające bardzo szybko albo szybko, w sposób ciągły, czyli VQ albo Q. Bezpieczna woda jest po północnej stronie znaku, więc mijam go od północy.',
    modelRu: 'Северный кардинальный знак сверху черный, снизу желтый. Топовая фигура: два черных конуса один над другим, оба вершинами вверх. Огонь белый, очень частый или частый, непрерывный: VQ или Q. Безопасная вода севернее знака, значит обхожу его с севера.',
    must: [
      {
        id: 'q3-e1',
        label: 'CZARNY u góry, ŻÓŁTY na dole (odwrotnie to znak południowy)',
        anyOf: ['czarny nad żółtym', 'czarny u góry'],
        // Naming both colours proves nothing: the south cardinal has the same two,
        // the other way up. What is graded is which colour is on which half.
        test: (raw) => /czarny nad zoltym/.test(normalize(raw))
          || (binds(raw, TOP, BOTTOM, BLACK, YELLOW) && binds(raw, BOTTOM, TOP, YELLOW, BLACK)),
        critical: true,
      },
      {
        id: 'q3-e2',
        label: 'Dwa stożki wierzchołkami DO GÓRY (do dołu to znak południowy)',
        anyOf: ['wierzchołkami do góry', 'stożki do góry'],
        test: (raw) => {
          const t = normalize(raw);
          if (!/stozk|stozek/.test(t)) return false;
          if (/do dolu|w dol|ku dolowi|wierzcholkami w dol/.test(t)) return false;   // that is the south mark
          return /do gory|w gore|ku gorze|skierowane do gory/.test(t);
        },
        critical: true,
      },
      {
        id: 'q3-e3',
        label: 'Światło białe, migające ciągle (Q lub VQ)',
        anyOf: ['białe', 'migające', 'miga', 'bardzo szybko', 'szybko', 'ciągle', 'bez przerwy', 'vq'],
      },
      {
        id: 'q3-e4',
        label: 'Mijamy go od strony PÓŁNOCNEJ (bezpieczna woda na północ od znaku)',
        // A bare "polnoc" was satisfied by the word "polnocny" in the mark's own
        // NAME, so the one thing this question tests could never be missed. The
        // phrase has to be about passing, not about what the mark is called.
        anyOf: [
          'od północy', 'od strony północnej', 'po północnej stronie', 'północnej stronie',
          'na północ od', 'z północy', 'na północy',
        ],
        critical: true,
      },
    ],
    whyPl: 'Kandydaci mylą znaki kardynalne z bocznymi i nie potrafią powiedzieć, że bezpieczna woda jest po tej stronie, którą nazywa się znak.',
    whyRu: 'Кардинальные знаки путают с латеральными и не могут сказать, что безопасная вода с той стороны, которая знак и называет.',
  },
  {
    id: 'sternik-oral-04',
    topic: 'znaki',
    questionPl: 'System IALA A: jak wyglądają znaki boczne prawej i lewej strony toru wodnego i jak ustalasz, gdzie jest prawa strona?',
    questionRu: 'Система IALA A: как выглядят латеральные знаки правой и левой стороны фарватера и как определить, где правая сторона?',
    modelPl: 'W Polsce obowiązuje system IALA A. Prawa strona toru wodnego jest zielona, znak jest stożkowy i ma zielone światło, a lewa strona jest czerwona, znak walcowy, ze światłem czerwonym. Strony określa się patrząc w umownym kierunku oznakowania, czyli zwykle od strony morza w kierunku portu albo w górę rzeki. Wchodząc do portu zostawiam więc zielony znak po prawej burcie, a czerwony po lewej.',
    modelRu: 'В Польше действует система IALA A. Правая сторона фарватера зеленая, знак конический, огонь зеленый; левая сторона красная, знак цилиндрический, огонь красный. Стороны определяются по условному направлению ограждения: обычно с моря в сторону порта или вверх по реке. Заходя в порт, зеленый знак оставляю справа, красный слева.',
    must: [
      {
        id: 'q4-e1',
        label: 'ZIELONY po prawej, CZERWONY po lewej (nie odwrotnie - to już IALA B)',
        anyOf: ['zielony po prawej', 'czerwony po lewej'],
        // Both colours are named in the answer that swaps them, so the keyword is
        // useless here: what is graded is which colour each side is paired WITH.
        test: (raw) => binds(raw, RIGHT, LEFT, GREEN, RED) && binds(raw, LEFT, RIGHT, RED, GREEN),
        critical: true,
      },
      {
        id: 'q4-e2',
        label: 'Kształt: stożkowy po prawej, walcowy po lewej',
        anyOf: ['stożkow', 'walcow', 'cylindryczn', 'puszkow'],
      },
      {
        id: 'q4-e3',
        label: 'Kierunek oznakowania: od morza w kierunku portu / w górę rzeki',
        anyOf: ['od morza', 'w kierunku portu', 'do portu', 'kierunek oznakowania', 'umowny kierunek', 'w górę rzeki', 'wchodząc do portu'],
      },
      {
        id: 'q4-e4',
        label: 'System IALA A obowiązuje w Polsce',
        anyOf: ['iala', 'jala', 'ajala', 'i a l a', 'region a', 'w polsce', 'polsce'],
      },
    ],
    whyPl: 'Region A i region B mają odwrotne kolory. Sama para "zielony i czerwony" nic nie znaczy - trzeba powiedzieć, który kolor jest po której stronie i w którą stronę patrzysz.',
    whyRu: 'В регионах A и B цвета противоположны. Просто пара «зеленый и красный» ничего не значит: надо сказать, какой цвет с какой стороны и в какую сторону смотришь.',
  },
  {
    id: 'sternik-oral-05',
    topic: 'bezpieczenstwo',
    questionPl: 'Człowiek wypadł za burtę. Opisz po kolei, co robisz jako sternik.',
    questionRu: 'Человек за бортом. Опиши по порядку свои действия как рулевого.',
    modelPl: 'Krzyczę głośno człowiek za burtą, żeby zaalarmować całą załogę, i natychmiast rzucam koło ratunkowe albo inny pływający przedmiot jak najbliżej rozbitka. Wyznaczam jedną osobę, która tylko obserwuje człowieka w wodzie i cały czas pokazuje go ręką, i wciskam przycisk MOB na GPS, żeby zapisać pozycję. Zawracam i podchodzę powoli, a przy samej burcie wyłączam bieg albo silnik, żeby śmigło nie pracowało przy człowieku. Wyciągam go w najniższym miejscu burty, a jeśli sami nie damy rady, wzywam pomoc na kanale 16.',
    modelRu: 'Громко кричу человек за бортом, чтобы поднять всю команду, и сразу бросаю спасательный круг или любой плавающий предмет как можно ближе к человеку. Назначаю одного наблюдателя, который только смотрит на него и постоянно показывает рукой, и жму кнопку MOB на GPS. Разворачиваюсь, подхожу медленно, а у самого борта выключаю передачу или двигатель, чтобы винт не работал рядом с человеком. Поднимаю его в самом низком месте борта, при необходимости вызываю помощь на 16 канале.',
    must: [
      {
        id: 'q5-e1',
        label: 'Alarm: krzyk człowiek za burtą',
        anyOf: ['człowiek za burtą', 'krzyczę', 'krzyk', 'alarm', 'alarmuje', 'głośno'],
      },
      {
        id: 'q5-e2',
        label: 'Rzucamy koło ratunkowe / pływający przedmiot',
        anyOf: ['koło ratunkowe', 'koło', 'rzucam', 'pas ratunkowy', 'boja', 'pływający przedmiot'],
      },
      {
        id: 'q5-e3',
        label: 'Wyznaczony obserwator nie spuszcza wzroku',
        anyOf: ['obserwator', 'obserwuje', 'obserwacj', 'jedną osob', '1 osob', 'wyznaczam osobę', 'wskazuje', 'pokazuje ręką', 'nie spuszcza wzroku', 'patrzy cały czas'],
      },
      {
        id: 'q5-e4',
        label: 'Zapis pozycji: przycisk MOB na GPS',
        anyOf: ['mob', 'gps', 'zaznaczam pozycję', 'zapisuję pozycję', 'pozycję'],
      },
      {
        id: 'q5-e5',
        label: 'Przy burcie silnik na luz / wyłączony, śmigło nie pracuje',
        anyOf: ['luz', 'na luz', 'jałowy', 'wyłączam silnik', 'wyłączam bieg', 'wyłączam napęd', 'śmigło', 'śrubę', 'neutralny'],
      },
    ],
    whyPl: 'Najczęstszy błąd: kandydat opowiada o manewrze, a zapomina o obserwatorze i o wyłączeniu śmigła przy podejmowaniu człowieka.',
    whyRu: 'Частая ошибка: рассказывают про маневр, но забывают про наблюдателя и про то, что винт у борта должен быть выключен.',
  },
  {
    id: 'sternik-oral-06',
    topic: 'bezpieczenstwo',
    questionPl: 'Jak wzywasz pomocy w sytuacji bezpośredniego zagrożenia życia i co dokładnie podajesz przez radio?',
    questionRu: 'Как вызвать помощь при прямой угрозе жизни и что именно передать по радио?',
    modelPl: 'Przy bezpośrednim zagrożeniu życia nadaję wezwanie na kanale 16 albo alarm DSC na kanale 70. Zaczynam od trzykrotnego słowa MAYDAY, potem podaję nazwę jachtu, moją pozycję, rodzaj niebezpieczeństwa, liczbę osób na pokładzie i jakiej pomocy potrzebuję. Równolegle używam środków wzrokowych: czerwona raca, pomarańczowy dym, powolne podnoszenie i opuszczanie ramion. Na wodach śródlądowych dzwonię na numer alarmowy 112 albo wzywam WOPR.',
    modelRu: 'При прямой угрозе жизни передаю вызов на 16 канале или сигнал DSC на 70 канале. Начинаю с троекратного MAYDAY, затем название яхты, свою позицию, характер бедствия, число людей на борту и какая помощь нужна. Параллельно применяю визуальные сигналы: красная ракета, оранжевый дым, медленное поднимание и опускание рук. На внутренних водах звоню 112 или вызываю WOPR.',
    must: [
      {
        id: 'q6-e1',
        label: 'Kanał 16 (lub DSC na kanale 70)',
        anyOf: ['kanał 16', 'kanale 16', 'kanału 16', 'szesnastym', 'szesnasty', 'szesnastce', 'kanał 70', 'kanale 70', 'dsc'],
      },
      {
        id: 'q6-e2',
        label: 'MAYDAY powtórzone trzy razy',
        anyOf: ['mayday', 'may day', 'mejdej', 'majdej', 'trzy razy', '3 razy', 'trzykrotn'],
      },
      // Position and persons-on-board are the load-bearing content of any distress
      // message: a rescue cannot start without them. They were one tradeable element
      // that passed on ANY single word; split out and each made required so a learner
      // cannot omit the position and the head-count and still score the call.
      {
        id: 'q6-e3-pos',
        label: 'Podajesz pozycję',
        anyOf: ['pozycję', 'pozycja', 'pozycji', 'współrzędne', 'gdzie jestem'],
        critical: true,
      },
      {
        id: 'q6-e3-pob',
        label: 'Podajesz liczbę osób na pokładzie',
        anyOf: ['liczbę osób', 'ile osób', 'osób na pokładzie', 'liczba osób', 'osoby na pokładzie'],
        critical: true,
      },
      {
        id: 'q6-e3-info',
        label: 'Podajesz nazwę jachtu i rodzaj niebezpieczeństwa',
        anyOf: ['nazwę', 'nazwa jachtu', 'rodzaj niebezpieczeństwa', 'rodzaj zagrożenia', 'co się stało'],
      },
      {
        id: 'q6-e4',
        label: 'Środki wzrokowe: raca, dym, ruch ramion',
        anyOf: ['raca', 'race', 'rac', 'rakiet', 'flar', 'dym', 'pomarańczow', 'ramion', 'ramiona', 'środki wzrokowe'],
      },
      {
        id: 'q6-e5',
        label: 'Na śródlądziu numer alarmowy 112 / WOPR',
        anyOf: ['112', 'numer alarmowy', 'wopr', 'służby ratownicze', 'telefon alarmowy'],
      },
    ],
    whyPl: 'Kandydat mówi MAYDAY, ale nie potrafi wyliczyć treści wezwania - a bez pozycji i liczby osób wezwanie jest bezużyteczne.',
    whyRu: 'Говорят MAYDAY, но не могут перечислить содержание вызова, а без позиции и числа людей вызов бесполезен.',
  },
  {
    id: 'sternik-oral-07',
    topic: 'przepisy',
    questionPl: 'Do czego uprawnia patent sternika motorowodnego i kiedy patent w ogóle nie jest potrzebny?',
    questionRu: 'Что дает патент sternika motorowodnego и когда патент вообще не нужен?',
    modelPl: 'Patent sternika motorowodnego uprawnia do prowadzenia jachtów motorowych po wodach śródlądowych, a po wodach morskich jachtami o długości kadłuba do 12 metrów, w strefie do 2 mil morskich od brzegu i w porze dziennej. Osoba, która nie ukończyła 16 lat, może prowadzić jacht o mocy silnika do 60 kilowatów. Patent można uzyskać od 14 roku życia. Patentu nie trzeba mieć na jachtach motorowych o mocy silnika do 10 kilowatów, a także na jachtach o mocy do 75 kilowatów i długości kadłuba do 13 metrów, których prędkość jest konstrukcyjnie ograniczona do 15 kilometrów na godzinę, czyli na houseboatach.',
    modelRu: 'Патент sternika motorowodnego дает право управлять моторными яхтами на внутренних водах, а на морских водах яхтами длиной корпуса до 12 метров, в зоне до 2 морских миль от берега и в светлое время суток. Тот, кому нет 16 лет, может управлять яхтой с мощностью двигателя до 60 кВт. Патент можно получить с 14 лет. Патент не нужен на моторных яхтах с двигателем до 10 кВт, а также на яхтах до 75 кВт и длиной корпуса до 13 м, у которых максимальная скорость конструктивно ограничена 15 км/ч, то есть на хаусботах.',
    must: [
      {
        id: 'q7-e1',
        label: 'Wody śródlądowe',
        anyOf: ['śródlądow', 'wodach śródlądowych', 'śródlądowe', 'śródlądzie'],
      },
      {
        id: 'q7-e2',
        label: 'Morze: kadłub do 12 METRÓW i strefa do 2 MIL MORSKICH od brzegu',
        anyOf: ['12 metrów', '2 mile morskie'],
        // A bare "12" and a bare "2 mil" matched "do 12 mil morskich od brzegu" -
        // an answer that garbles both limits into one wrong one - and scored it
        // correct. The number has to be bound to its unit, on a word boundary.
        test: (raw) => {
          const t = normalize(raw);
          // Polish STT spells small numbers, and "do" takes the genitive: "do
          // dwoch mil morskich", "dwunastu metrow". Accept the inflected words too.
          const hull = /\b12\s+(m\b|metr)/.test(t) || /\b(dwanascie|dwunastu)\s+metr/.test(t);
          const zone = /\b2\s+(mile|mil|mm)\b/.test(t) || /\b(dwie|dwoch|dwu)\s+mil/.test(t);
          return hull && zone;
        },
        critical: true,
      },
      {
        id: 'q7-e3',
        label: 'Poniżej 16 lat: moc silnika do 60 kW',
        anyOf: ['60 kw', '60 kilowat', '60 kilowatów'],
      },
      {
        id: 'q7-e4',
        label: 'Bez patentu do 10 kW (i houseboat do 75 kW / 15 km/h)',
        anyOf: ['10 kw', '10 kilowat', 'do 10', 'bez patentu', 'nie trzeba patentu', 'nie jest wymagany', 'houseboat', '75 kw'],
      },
    ],
    whyPl: 'Ludzie mylą uprawnienia sternika motorowodnego z motorowodnym sternikiem morskim i podają przypadkowe metry i mile.',
    whyRu: 'Путают полномочия sternika motorowodnego с motorowodny sternik morski и называют случайные метры и мили.',
  },
  {
    id: 'sternik-oral-08',
    topic: 'przepisy',
    questionPl: 'Jakie są limity alkoholu dla prowadzącego jacht i który jacht podlega obowiązkowej rejestracji?',
    questionRu: 'Какие пределы алкоголя для управляющего яхтой и какая яхта подлежит обязательной регистрации?',
    modelPl: 'Stan po użyciu alkoholu to od 0,2 do 0,5 promila we krwi, a powyżej 0,5 promila to już stan nietrzeźwości. W obu przypadkach nie wolno prowadzić jachtu i grozi za to odpowiedzialność. Obowiązkowej rejestracji podlega jacht o długości kadłuba powyżej 7,5 metra albo napędzany silnikiem o mocy większej niż 15 kilowatów. Wymagane wyposażenie ratunkowe zależy od akwenu i wielkości jachtu, ale podstawą jest zawsze kamizelka albo pas ratunkowy dla każdej osoby na pokładzie.',
    modelRu: 'Состояние после употребления алкоголя это от 0,2 до 0,5 промилле в крови, свыше 0,5 промилле уже состояние опьянения. В обоих случаях управлять яхтой нельзя, за это предусмотрена ответственность. Обязательной регистрации подлежит яхта длиной корпуса более 7,5 метра либо с двигателем мощностью более 15 кВт. Требуемое спасательное оснащение зависит от акватории и размера яхты, но базовое всегда одно: жилет или спасательный пояс на каждого человека на борту.',
    must: [
      {
        id: 'q8-e1',
        label: 'Stan PO UŻYCIU alkoholu: od 0,2 do 0,5 promila',
        anyOf: ['po użyciu alkoholu'],
        // "po uzyciu" and "0 5" both appear in the answer that swaps the two states.
        // What is graded is which THRESHOLD sits in the clause that names the state.
        test: (raw) => clauseSays(raw, /po uzyciu/, /\b0 2\b|zero dwa|dwie dziesiate/, /powyzej/),
        critical: true,
      },
      {
        id: 'q8-e2',
        label: 'Stan NIETRZEŹWOŚCI: powyżej 0,5 promila',
        anyOf: ['nietrzeźw'],
        test: (raw) => clauseSays(raw, /nietrzezw/, /powyzej/) && clauseSays(raw, /nietrzezw/, /\b0 5\b|zero piec|piec dziesiatych/),
        critical: true,
      },
      {
        id: 'q8-e3',
        label: 'Rejestracja: kadłub powyżej 7,5 m lub silnik powyżej 15 kW',
        // "rejestracj" was in this list, so "Nie pamietam progow rejestracji" -
        // an explicit "I do not know" - ticked the element green. A topic word is
        // not an answer. Only the numbers are.
        anyOf: ['7 5', 'siedem i pół', '15 kw', '15 kilowat', '15 kilowatów'],
      },
      {
        id: 'q8-e4',
        label: 'Kamizelka / pas ratunkowy dla każdej osoby na pokładzie',
        anyOf: ['kamizelk', 'pas ratunkowy', 'dla każdej osoby', 'środki ratunkowe'],
      },
    ],
    whyPl: 'Kandydaci znają limity z ruchu drogowego, ale nie umieją podać progu 0,2 i 0,5 promila ani progów rejestracji 7,5 m / 15 kW.',
    whyRu: 'Пределы из ПДД помнят, а пороги 0,2 и 0,5 промилле и пороги регистрации 7,5 м / 15 кВт назвать не могут.',
  },
  {
    id: 'sternik-oral-09',
    topic: 'manewrowanie',
    questionPl: 'Podchodzisz burtą do kei przy silnym wietrze. Jak przygotowujesz jacht i jak wykonujesz manewr?',
    questionRu: 'Подходишь бортом к причалу при сильном ветре. Как готовишь яхту и как выполняешь маневр?',
    modelPl: 'Najpierw oceniam kierunek i siłę wiatru oraz prąd i planuję podejście dziobem pod wiatr albo pod prąd, bo wtedy najlepiej kontroluję prędkość. Rozkładam odbijacze na burcie podejścia i przygotowuję cumy: dziobową, rufową i szpringi, a załoga wie, kto co podaje i komu. Podchodzę wolno, ale z prędkością dającą sterowność, pod kątem około trzydziestu stopni do kei, potem wyrównuję jacht równolegle i hamuję krótkim wstecznym. Najpierw zakładam cumę dziobową albo szpring, dopiero potem resztę.',
    modelRu: 'Сначала оцениваю направление и силу ветра и течение и планирую подход носом против ветра или против течения, так лучше контролируется скорость. Раскладываю кранцы по борту подхода и готовлю концы: носовой, кормовой и шпринги, команда знает, кто что подает. Подхожу медленно, но со скоростью, дающей управляемость, под углом около тридцати градусов к причалу, затем выравниваю яхту параллельно и торможу коротким задним ходом. Сначала подаю носовой конец или шпринг, потом остальные.',
    must: [
      {
        id: 'q9-e1',
        label: 'Ocena wiatru i prądu przed manewrem',
        anyOf: ['wiatr', 'wiatru', 'prąd', 'kierunek wiatru', 'oceniam', 'sprawdzam wiatr'],
      },
      {
        id: 'q9-e2',
        label: 'Odbijacze na burcie podejścia',
        anyOf: ['odbijacz', 'odbijacze', 'fendery', 'fender'],
      },
      {
        id: 'q9-e3',
        label: 'Cumy: dziobowa, rufowa, szpringi',
        anyOf: ['cuma', 'cumy', 'cumę', 'dziobowa', 'rufowa', 'szpring'],
      },
      {
        id: 'q9-e4',
        label: 'Podejście wolno, pod wiatr / pod prąd, z zachowaniem sterowności',
        anyOf: ['wolno', 'powoli', 'mała prędkość', 'pod wiatr', 'pod prąd', 'sterowność', 'dziobem pod wiatr'],
      },
      {
        id: 'q9-e5',
        label: 'Zatrzymanie wstecznym',
        anyOf: ['wsteczny', 'wstecz', 'wstecznym', 'hamuję', 'zatrzymuję', 'biegiem wstecznym'],
      },
    ],
    whyPl: 'Typowy błąd: podejście z wiatrem i za szybko - jacht nie chce się zatrzymać, a odbijacze i cumy są jeszcze w bakiście.',
    whyRu: 'Типичная ошибка: подход по ветру и слишком быстро, яхта не останавливается, а кранцы и концы еще в рундуке.',
  },
  {
    id: 'sternik-oral-10',
    topic: 'manewrowanie',
    questionPl: 'Co to jest efekt śruby i jak wpływa na jacht z prawoskrętną śrubą na biegu wstecznym?',
    questionRu: 'Что такое эффект винта и как он влияет на яхту с винтом правого вращения на заднем ходу?',
    modelPl: 'Efekt śruby, czyli praca boczna śmigła, to zjawisko, w którym pracująca śruba nie tylko pcha jacht do przodu lub do tyłu, ale także znosi rufę na bok. Przy śrubie prawoskrętnej na biegu do przodu rufa idzie lekko w prawo, a na biegu wstecznym rufa wyraźnie ściąga w lewo, więc jacht cofa się z tendencją do skrętu. Efekt jest najsilniejszy przy małej prędkości i mocnym dodaniu gazu, bo ster jest wtedy jeszcze nieskuteczny. Dobry sternik nie walczy z tym, tylko planuje cumowanie tak, żeby rufa sama dochodziła do kei od tej strony, w którą ściąga.',
    modelRu: 'Эффект винта, то есть боковая работа винта, это когда работающий винт не только толкает яхту вперед или назад, но и сносит корму вбок. При винте правого вращения на переднем ходу корма слегка уходит вправо, а на заднем ходу корма заметно тянет влево, поэтому яхта пятится с тенденцией к повороту. Эффект сильнее всего на малой скорости и при резкой даче газа, когда руль еще не работает. Хороший рулевой не борется с этим, а планирует швартовку так, чтобы корма сама подходила к причалу с той стороны, куда ее тянет.',
    must: [
      {
        id: 'q10-e1',
        label: 'Śruba znosi rufę na bok (praca boczna śmigła)',
        // Bound to the stern, never bare: hits() folds diacritics and matches
        // substrings, so a bare 'ściąga' fired on "ściągam gaz" and a bare
        // 'znosi' on "wiatr znosi jacht" - neither says a word about prop walk.
        anyOf: ['znosi ruf', 'rufę znosi', 'śruba znosi', 'śruba ściąga', 'ściąga rufę', 'rufa ściąga', 'ściąga w lewo', 'ściąga w prawo', 'na bok', 'w bok', 'praca boczna', 'boczna'],
      },
      {
        id: 'q10-e2',
        label: 'Prawoskrętna DO PRZODU: rufa w PRAWO',
        anyOf: ['do przodu w prawo', 'rufa w prawo', 'ściąga w prawo'],
        // "rufa idzie lekko w prawo" has two words inside the phrase, and a
        // reversed answer contains every keyword the correct one does. Only the
        // pairing of the gear with the direction says anything.
        // NOT critical: the question asks what happens ON THE ASTERN GEAR, and a
        // complete answer to the question as asked may never mention going ahead.
        // Requiring it made the question unpassable for a correct candidate.
        test: (raw) => binds(raw, AHEAD, ASTERN, RIGHT, LEFT),
      },
      {
        id: 'q10-e3',
        label: 'Na WSTECZNYM: rufa w LEWO',
        anyOf: ['wstecznym w lewo', 'rufa w lewo', 'ściąga w lewo'],
        test: (raw) => binds(raw, ASTERN, AHEAD, LEFT, RIGHT),
        critical: true,
      },
      {
        id: 'q10-e4',
        label: 'Najsilniejszy przy małej prędkości; wykorzystujemy go przy cumowaniu',
        anyOf: ['mała prędkość', 'małej prędkości', 'dodaniu gazu', 'wykorzyst', 'planuje', 'przy cumowaniu', 'przy manewrach', 'silniejszy'],
      },
    ],
    whyPl: 'Kandydat mówi, że łódź na wstecznym nie słuchała steru, ale nie umie nazwać efektu śruby ani powiedzieć, W KTÓRĄ stronę ściąga rufa. Sama "rufa" i samo "wstecz" nie są odpowiedzią - liczy się kierunek.',
    whyRu: 'Говорят, что на заднем ходу лодка не слушалась руля, но не могут назвать эффект винта и сказать, В КАКУЮ сторону тянет корму. Просто «корма» и просто «назад» это не ответ: важно направление.',
  },
  {
    id: 'sternik-oral-11',
    topic: 'locja',
    questionPl: 'Czym różni się kurs kompasowy od rzeczywistego i jak jeden przeliczasz na drugi?',
    questionRu: 'Чем компасный курс отличается от истинного и как одно пересчитать в другое?',
    modelPl: 'Kurs kompasowy to ten, który odczytuję wprost z kompasu na jachcie. Żeby dostać kurs magnetyczny, uwzględniam dewiację, czyli błąd wywołany metalem i polem magnetycznym samej łodzi, który biorę z tabeli dewiacji. Do kursu magnetycznego dodaję deklinację, czyli różnicę między północą magnetyczną a geograficzną, i dopiero wtedy mam kurs rzeczywisty, który naniosę na mapę. Deklinację odczytuję z róży kursów na mapie razem z roczną poprawką.',
    modelRu: 'Компасный курс это то, что я снимаю прямо с компаса на яхте. Чтобы получить магнитный курс, учитываю девиацию, то есть ошибку от металла и магнитного поля самой лодки, беру ее из таблицы девиации. К магнитному курсу прибавляю склонение, то есть разницу между магнитным и географическим севером, и только тогда получаю истинный курс, который наношу на карту. Склонение читаю с картушки на карте вместе с годовой поправкой.',
    must: [
      {
        id: 'q11-e1',
        label: 'Kurs kompasowy odczytany z kompasu jachtu',
        anyOf: ['kompasowy', 'z kompasu', 'odczytuję', 'wskazanie kompasu'],
      },
      {
        id: 'q11-e2',
        label: 'Dewiacja: błąd własnego kompasu / metalu jachtu, z tabeli dewiacji',
        anyOf: ['dewiacj', 'tabela dewiacji', 'metal', 'pole magnetyczne jachtu', 'własne pole', 'błąd kompasu'],
      },
      {
        id: 'q11-e3',
        label: 'Deklinacja: różnica północy magnetycznej i geograficznej, z mapy',
        anyOf: ['deklinacj', 'geograficzn', 'róża', 'róży', 'z mapy', 'poprawka roczna'],
      },
      {
        id: 'q11-e4',
        label: 'Kolejność: kompasowy + dewiacja = magnetyczny, + deklinacja = rzeczywisty',
        anyOf: ['kurs rzeczywisty', 'rzeczywisty', 'kurs magnetyczny', 'magnetyczny', 'dodaję', 'dodać', 'uwzględniam', 'po uwzględnieniu'],
      },
    ],
    whyPl: 'Klasyczne pomylenie dewiacji z deklinacją - dewiacja to błąd jachtu, deklinacja to błąd Ziemi.',
    whyRu: 'Классика: путают девиацию и склонение. Девиация это ошибка лодки, склонение это ошибка Земли.',
  },
  {
    id: 'sternik-oral-12',
    topic: 'locja',
    questionPl: 'Jak podajesz swoją pozycję współrzędnymi geograficznymi i na co przy tym uważasz?',
    questionRu: 'Как ты сообщаешь свою позицию географическими координатами и на что при этом обращаешь внимание?',
    modelPl: 'Pozycję podaję zawsze w tej samej kolejności: najpierw szerokość geograficzna, potem długość geograficzna. Szerokość to dwie cyfry stopni i minuty z określeniem północna albo południowa, a długość to trzy cyfry stopni i minuty z określeniem wschodnia albo zachodnia. Cyfry czytam pojedynczo i nigdy nie opuszczam litery kierunku, bo bez niej pozycja nie jest jednoznaczna. Na przykład: 54 stopnie 30,5 minuty północnej, 018 stopni 45,2 minuty wschodniej.',
    modelRu: 'Позицию всегда даю в одном порядке: сначала широта, потом долгота. Широта это две цифры градусов и минуты с указанием северная или южная, долгота это три цифры градусов и минуты с указанием восточная или западная. Цифры читаю по одной и никогда не опускаю букву направления, без нее позиция неоднозначна. Например: 54 градуса 30,5 минуты северной, 018 градусов 45,2 минуты восточной.',
    must: [
      { id: 'q12-e1', label: 'Najpierw szerokość geograficzna', anyOf: ['szerokość', 'najpierw szerokość', 'szerokość geograficzna'] },
      { id: 'q12-e2', label: 'Potem długość geograficzna', anyOf: ['długość', 'długość geograficzna', 'potem długość'] },
      { id: 'q12-e3', label: 'Stopnie i minuty', anyOf: ['stopni', 'stopnie', 'stopnia', 'minut', 'minuty', 'minuta'] },
      {
        id: 'q12-e4',
        label: 'Określenie kierunku: północna/południowa i wschodnia/zachodnia',
        anyOf: ['północna', 'południowa', 'wschodnia', 'zachodnia', 'północ', 'południe', 'wschód', 'zachód'],
      },
      {
        id: 'q12-e5',
        label: 'Cyfry czytane pojedynczo',
        anyOf: ['pojedynczo', 'cyfra po cyfrze', 'każdą cyfrę', 'po jednej', 'osobno'],
      },
    ],
    whyPl: 'Ten sam błąd, co na egzaminie SRC: ludzie mówią pięćdziesiąt cztery przecinek trzy i gubią literę kierunku - pozycja przestaje być jednoznaczna. Poćwicz to na głos w Dyktowaniu pozycji.',
    whyRu: 'Та же ошибка, что на экзамене SRC: говорят пятьдесят четыре запятая три и теряют букву направления, позиция перестает быть однозначной. Отработай это вслух в «Диктовке позиции».',
  },
];
