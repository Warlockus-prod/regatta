import { normalize } from '../rozmowa/dialogueGrading';

// ============================================================================
// Dictating a position out loud.
//
// This is the single place where SRC candidates fumble most, and it is not
// because the rules are hard - there are five of them - but because nobody ever
// makes you SAY a position, only read one. So the first time it is said aloud is
// under exam pressure, or worse, into a MAYDAY.
//
// GRADING, and why it has three outcomes instead of two.
//
// The transcriber writes spoken numerals as digits. "FIVE FOUR" comes back as
// "5-4"; the forbidden "fifty four" comes back as "54". That difference is what
// lets us grade this at all - and it also means a naive keyword list accepting
// BOTH forms would pass the exact error the drill exists to catch. (It did. The
// review caught it before this shipped.)
//
// But the reverse is a real risk too: strike "54 degrees" from the list and any
// correct speaker whose digits the transcriber happened to merge gets failed for
// something they said right. Neither false verdict is acceptable in a drill whose
// whole subject is precision.
//
// So an element lands in one of three states:
//   ok    - the strict digit-by-digit form is there. Unambiguous.
//   warn  - only the merged/POINT form came back. We CANNOT tell whether you said
//           it wrong or the transcriber collapsed it, so we say exactly that
//           instead of inventing a verdict. Does not count as passed.
//   miss  - the element is simply not there.
// ============================================================================

export interface PosElement {
  id: string;
  /** what had to be said, named the way the learner will recognise it */
  label: string;
  /** strict forms: hearing one of these proves the rule was followed */
  anyOf: string[];
  /** forms that are either the classic error or a transcriber artefact - we cannot tell */
  warnOf?: string[];
}

export interface PosItem {
  id: string;
  lat: string;
  lon: string;
  /** the model reading, in SMCP */
  say: string;
  must: PosElement[];
  trapPl: string;
  trapRu: string;
}

export const POS_RULES_PL = [
  'Kazda cyfra osobno, po angielsku: 54 to FIVE FOUR, nigdy "fifty four".',
  'Ulamek to DECIMAL, nigdy POINT: 30.5 to THREE ZERO DECIMAL FIVE.',
  'Jednostki mowimy zawsze: DEGREES po stopniach, MINUTES po minutach.',
  'Dlugosc ma trzy cyfry - zero wiodace tez wymawiamy: 018 to ZERO ONE EIGHT.',
  'Na koncu polkula: NORTH albo SOUTH, potem EAST albo WEST. Najpierw szerokosc.',
];

export const POS_RULES_RU = [
  'Каждая цифра отдельно, по-английски: 54 - это FIVE FOUR, никогда «fifty four».',
  'Дробная часть - DECIMAL, а не POINT: 30.5 - это THREE ZERO DECIMAL FIVE.',
  'Единицы произносим всегда: DEGREES после градусов, MINUTES после минут.',
  'У долготы три цифры, ведущий ноль тоже проговариваем: 018 - это ZERO ONE EIGHT.',
  'В конце полушарие: NORTH или SOUTH, затем EAST или WEST. Сначала широта.',
];

export const POSITIONS: PosItem[] = [
  {
    id: 'p1-gdansk-basic',
    lat: '54 30.5 N',
    lon: '018 45.2 E',
    say: 'FIVE FOUR DEGREES THREE ZERO DECIMAL FIVE MINUTES NORTH, ZERO ONE EIGHT DEGREES FOUR FIVE DECIMAL TWO MINUTES EAST',
    must: [
      {
        id: 'lat-deg',
        label: 'stopnie szerokosci: FIVE FOUR DEGREES',
        anyOf: ['5 4 degrees', 'five four degrees'],
        warnOf: ['54 degrees', 'fifty four degrees'],
      },
      {
        id: 'lat-min',
        label: 'minuty szerokosci: THREE ZERO DECIMAL FIVE MINUTES',
        anyOf: ['3 0 decimal 5 minutes', '3 0 decimal 5 minute', 'three zero decimal five minutes'],
        warnOf: ['30 decimal 5 minutes', 'thirty decimal five', '30 5 minutes', '3 0 5 minutes', 'thirty point five'],
      },
      { id: 'lat-hem', label: 'polkula szerokosci: NORTH', anyOf: ['north'] },
      {
        id: 'lon-deg',
        label: 'stopnie dlugosci: ZERO ONE EIGHT DEGREES',
        anyOf: ['0 1 8 degrees', '018 degrees', 'zero one eight degrees'],
        warnOf: ['18 degrees', 'eighteen degrees'],
      },
      {
        id: 'lon-min',
        label: 'minuty dlugosci: FOUR FIVE DECIMAL TWO MINUTES',
        anyOf: ['4 5 decimal 2 minutes', '4 5 decimal 2 minute', 'four five decimal two minutes'],
        warnOf: ['45 decimal 2 minutes', 'forty five decimal two', '45 2 minutes', '4 5 2 minutes', 'forty five point two'],
      },
      { id: 'lon-hem', label: 'polkula dlugosci: EAST', anyOf: ['east'] },
    ],
    trapPl: 'Baza. Ludzie mowia "fifty four point three" zamiast cyfra po cyfrze i DECIMAL, oraz gubia slowa DEGREES / MINUTES.',
    trapRu: 'База. Говорят «fifty four point three» вместо чтения по цифрам и DECIMAL, теряют слова DEGREES / MINUTES.',
  },
  {
    id: 'p2-leading-zero-lon',
    lat: '55 07.4 N',
    lon: '008 30.9 E',
    say: 'FIVE FIVE DEGREES ZERO SEVEN DECIMAL FOUR MINUTES NORTH, ZERO ZERO EIGHT DEGREES THREE ZERO DECIMAL NINE MINUTES EAST',
    must: [
      {
        id: 'lat-deg',
        label: 'stopnie szerokosci: FIVE FIVE DEGREES',
        anyOf: ['5 5 degrees', 'five five degrees'],
        warnOf: ['55 degrees', 'fifty five degrees'],
      },
      {
        id: 'lat-min',
        label: 'minuty szerokosci: ZERO SEVEN DECIMAL FOUR MINUTES',
        anyOf: ['0 7 decimal 4 minutes', '0 7 decimal 4 minute', '07 decimal 4 minutes', 'zero seven decimal four minutes'],
        warnOf: ['07 4 minutes', '0 7 4 minutes', '7 4 minutes', 'seven point four'],
      },
      { id: 'lat-hem', label: 'polkula szerokosci: NORTH', anyOf: ['north'] },
      {
        id: 'lon-deg',
        label: 'stopnie dlugosci: ZERO ZERO EIGHT DEGREES',
        anyOf: ['0 0 8 degrees', '008 degrees', 'zero zero eight degrees'],
        warnOf: ['8 degrees', 'eight degrees'],
      },
      {
        id: 'lon-min',
        label: 'minuty dlugosci: THREE ZERO DECIMAL NINE MINUTES',
        anyOf: ['3 0 decimal 9 minutes', '3 0 decimal 9 minute', 'three zero decimal nine minutes'],
        warnOf: ['30 decimal 9 minutes', 'thirty decimal nine', '30 9 minutes', '3 0 9 minutes', 'thirty point nine'],
      },
      { id: 'lon-hem', label: 'polkula dlugosci: EAST', anyOf: ['east'] },
    ],
    trapPl: 'Zera wiodace. Dlugosc ma trzy cyfry, wiec ZERO ZERO EIGHT, a nie "eight degrees". Minuty szerokosci tez maja dwie cyfry: ZERO SEVEN, nie "seven".',
    trapRu: 'Ведущие нули. У долготы три цифры: ZERO ZERO EIGHT, а не «eight degrees». Минуты широты тоже двузначные: ZERO SEVEN, не «seven».',
  },
  {
    id: 'p3-trailing-decimal-zero',
    lat: '54 24.0 N',
    lon: '019 39.0 E',
    say: 'FIVE FOUR DEGREES TWO FOUR DECIMAL ZERO MINUTES NORTH, ZERO ONE NINE DEGREES THREE NINE DECIMAL ZERO MINUTES EAST',
    must: [
      {
        id: 'lat-deg',
        label: 'stopnie szerokosci: FIVE FOUR DEGREES',
        anyOf: ['5 4 degrees', 'five four degrees'],
        warnOf: ['54 degrees', 'fifty four degrees'],
      },
      {
        id: 'lat-min',
        label: 'minuty szerokosci: TWO FOUR DECIMAL ZERO MINUTES',
        anyOf: ['2 4 decimal 0 minutes', '2 4 decimal zero minutes', 'two four decimal zero minutes'],
        warnOf: ['24 decimal 0 minutes', '24 decimal zero minutes', 'twenty four decimal zero', '24 minutes', '24 0 minutes', '2 4 minutes', 'twenty four minutes'],
      },
      { id: 'lat-hem', label: 'polkula szerokosci: NORTH', anyOf: ['north'] },
      {
        id: 'lon-deg',
        label: 'stopnie dlugosci: ZERO ONE NINE DEGREES',
        anyOf: ['0 1 9 degrees', '019 degrees', 'zero one nine degrees'],
        warnOf: ['19 degrees', 'nineteen degrees'],
      },
      {
        id: 'lon-min',
        label: 'minuty dlugosci: THREE NINE DECIMAL ZERO MINUTES',
        anyOf: ['3 9 decimal 0 minutes', '3 9 decimal zero minutes', 'three nine decimal zero minutes'],
        warnOf: ['39 decimal 0 minutes', '39 decimal zero minutes', 'thirty nine decimal zero', '39 minutes', '39 0 minutes', 'thirty nine minutes'],
      },
      { id: 'lon-hem', label: 'polkula dlugosci: EAST', anyOf: ['east'] },
    ],
    trapPl: 'Koncowe DECIMAL ZERO. Kandydat mowi "TWO FOUR MINUTES" i polyka ulamek - odbiorca nie wie, czy uslyszal cala liczbe.',
    trapRu: 'Конечный DECIMAL ZERO. Кандидат говорит «TWO FOUR MINUTES» и глотает дробную часть: приёмник не знает, всю ли цифру услышал.',
  },
  {
    id: 'p4-lat-vs-lon',
    lat: '57 18.2 N',
    lon: '011 58.7 E',
    say: 'FIVE SEVEN DEGREES ONE EIGHT DECIMAL TWO MINUTES NORTH, ZERO ONE ONE DEGREES FIVE EIGHT DECIMAL SEVEN MINUTES EAST',
    must: [
      {
        id: 'lat-deg',
        label: 'stopnie szerokosci: FIVE SEVEN DEGREES',
        anyOf: ['5 7 degrees', 'five seven degrees'],
        warnOf: ['57 degrees', 'fifty seven degrees'],
      },
      {
        id: 'lat-min',
        label: 'minuty szerokosci: ONE EIGHT DECIMAL TWO MINUTES',
        anyOf: ['1 8 decimal 2 minutes', '1 8 decimal 2 minute', 'one eight decimal two minutes'],
        warnOf: ['18 decimal 2 minutes', 'eighteen decimal two', '18 2 minutes', '1 8 2 minutes', 'eighteen point two'],
      },
      { id: 'lat-hem', label: 'polkula szerokosci: NORTH', anyOf: ['north'] },
      {
        id: 'lon-deg',
        label: 'stopnie dlugosci: ZERO ONE ONE DEGREES',
        anyOf: ['0 1 1 degrees', '011 degrees', 'zero one one degrees'],
        warnOf: ['11 degrees', 'eleven degrees'],
      },
      {
        id: 'lon-min',
        label: 'minuty dlugosci: FIVE EIGHT DECIMAL SEVEN MINUTES',
        anyOf: ['5 8 decimal 7 minutes', '5 8 decimal 7 minute', 'five eight decimal seven minutes'],
        warnOf: ['58 decimal 7 minutes', 'fifty eight decimal seven', '58 7 minutes', '5 8 7 minutes', 'fifty eight point seven'],
      },
      { id: 'lon-hem', label: 'polkula dlugosci: EAST', anyOf: ['east'] },
    ],
    trapPl: 'Szerokosc i dlugosc maja lustrzane minuty (18.2 i 58.7). Kolejnosc jest jedna: najpierw szerokosc N/S, dopiero potem dlugosc E/W.',
    trapRu: 'У широты и долготы зеркальные минуты (18.2 и 58.7). Порядок один: сначала широта N/S, потом долгота E/W.',
  },
  {
    id: 'p5-repeated-digit',
    lat: '55 55.5 N',
    lon: '015 15.5 E',
    say: 'FIVE FIVE DEGREES FIVE FIVE DECIMAL FIVE MINUTES NORTH, ZERO ONE FIVE DEGREES ONE FIVE DECIMAL FIVE MINUTES EAST',
    must: [
      {
        id: 'lat-deg',
        label: 'stopnie szerokosci: FIVE FIVE DEGREES',
        anyOf: ['5 5 degrees', 'five five degrees'],
        warnOf: ['55 degrees', 'fifty five degrees', 'double five degrees'],
      },
      {
        id: 'lat-min',
        label: 'minuty szerokosci: FIVE FIVE DECIMAL FIVE MINUTES',
        anyOf: ['5 5 decimal 5 minutes', '5 5 decimal 5 minute', 'five five decimal five minutes'],
        warnOf: ['55 decimal 5 minutes', 'fifty five decimal five', '55 5 minutes', '5 5 5 minutes', 'fifty five point five', 'double five'],
      },
      { id: 'lat-hem', label: 'polkula szerokosci: NORTH', anyOf: ['north'] },
      {
        id: 'lon-deg',
        label: 'stopnie dlugosci: ZERO ONE FIVE DEGREES',
        anyOf: ['0 1 5 degrees', '015 degrees', 'zero one five degrees'],
        warnOf: ['15 degrees', 'fifteen degrees'],
      },
      {
        id: 'lon-min',
        label: 'minuty dlugosci: ONE FIVE DECIMAL FIVE MINUTES',
        anyOf: ['1 5 decimal 5 minutes', '1 5 decimal 5 minute', 'one five decimal five minutes'],
        warnOf: ['15 decimal 5 minutes', 'fifteen decimal five', '15 5 minutes', '1 5 5 minutes', 'fifteen point five'],
      },
      { id: 'lon-hem', label: 'polkula dlugosci: EAST', anyOf: ['east'] },
    ],
    trapPl: 'Powtorzone cyfry. Nie ma "DOUBLE FIVE" w pozycji - kazda cyfra osobno, piec razy FIVE. Ludzie skracaja i gubia jedna piatke.',
    trapRu: 'Повторяющиеся цифры. Никакого «DOUBLE FIVE» в позиции: каждая цифра отдельно, пять раз FIVE. Люди сокращают и теряют одну пятёрку.',
  },
  {
    id: 'p6-south-west',
    lat: '33 55.8 S',
    lon: '018 25.3 W',
    say: 'THREE THREE DEGREES FIVE FIVE DECIMAL EIGHT MINUTES SOUTH, ZERO ONE EIGHT DEGREES TWO FIVE DECIMAL THREE MINUTES WEST',
    must: [
      {
        id: 'lat-deg',
        label: 'stopnie szerokosci: THREE THREE DEGREES',
        anyOf: ['3 3 degrees', 'three three degrees'],
        warnOf: ['33 degrees', 'thirty three degrees'],
      },
      {
        id: 'lat-min',
        label: 'minuty szerokosci: FIVE FIVE DECIMAL EIGHT MINUTES',
        anyOf: ['5 5 decimal 8 minutes', '5 5 decimal 8 minute', 'five five decimal eight minutes'],
        warnOf: ['55 decimal 8 minutes', 'fifty five decimal eight', '55 8 minutes', '5 5 8 minutes', 'fifty five point eight'],
      },
      { id: 'lat-hem', label: 'polkula szerokosci: SOUTH (nie NORTH)', anyOf: ['south'] },
      {
        id: 'lon-deg',
        label: 'stopnie dlugosci: ZERO ONE EIGHT DEGREES',
        anyOf: ['0 1 8 degrees', '018 degrees', 'zero one eight degrees'],
        warnOf: ['18 degrees', 'eighteen degrees'],
      },
      {
        id: 'lon-min',
        label: 'minuty dlugosci: TWO FIVE DECIMAL THREE MINUTES',
        anyOf: ['2 5 decimal 3 minutes', '2 5 decimal 3 minute', 'two five decimal three minutes'],
        warnOf: ['25 decimal 3 minutes', 'twenty five decimal three', '25 3 minutes', '2 5 3 minutes', 'twenty five point three'],
      },
      { id: 'lon-hem', label: 'polkula dlugosci: WEST (nie EAST)', anyOf: ['west'] },
    ],
    trapPl: 'Polkula na autopilocie. Stopnie dlugosci te same co w pozycji z Zatoki Gdanskiej (018), ale tu jest SOUTH i WEST. Kto mowi NORTH / EAST z pamieci, oblewa.',
    trapRu: 'Полушарие на автопилоте. Градусы долготы те же, что в гданьской позиции (018), но здесь SOUTH и WEST. Кто по привычке говорит NORTH / EAST, тот проваливает.',
  },
  {
    id: 'p7-south-west-zeros',
    lat: '07 40.0 S',
    lon: '005 09.0 W',
    say: 'ZERO SEVEN DEGREES FOUR ZERO DECIMAL ZERO MINUTES SOUTH, ZERO ZERO FIVE DEGREES ZERO NINE DECIMAL ZERO MINUTES WEST',
    must: [
      {
        id: 'lat-deg',
        label: 'stopnie szerokosci: ZERO SEVEN DEGREES',
        anyOf: ['0 7 degrees', '07 degrees', 'zero seven degrees'],
        warnOf: ['7 degrees', 'seven degrees'],
      },
      {
        id: 'lat-min',
        label: 'minuty szerokosci: FOUR ZERO DECIMAL ZERO MINUTES',
        anyOf: ['4 0 decimal 0 minutes', '4 0 decimal zero minutes', 'four zero decimal zero minutes'],
        warnOf: ['40 decimal 0 minutes', '40 decimal zero minutes', 'forty decimal zero', '40 minutes', '40 0 minutes', 'forty minutes'],
      },
      { id: 'lat-hem', label: 'polkula szerokosci: SOUTH', anyOf: ['south'] },
      {
        id: 'lon-deg',
        label: 'stopnie dlugosci: ZERO ZERO FIVE DEGREES',
        anyOf: ['0 0 5 degrees', '005 degrees', 'zero zero five degrees'],
        warnOf: ['5 degrees', 'five degrees'],
      },
      {
        id: 'lon-min',
        label: 'minuty dlugosci: ZERO NINE DECIMAL ZERO MINUTES',
        anyOf: ['0 9 decimal 0 minutes', '0 9 decimal zero minutes', '09 decimal 0 minutes', '09 decimal zero minutes', 'zero nine decimal zero minutes'],
        warnOf: ['9 minutes', '09 0 minutes', 'nine minutes'],
      },
      { id: 'lon-hem', label: 'polkula dlugosci: WEST', anyOf: ['west'] },
    ],
    trapPl: 'Wszystkie zera naraz: zero wiodace w szerokosci (ZERO SEVEN), dwa zera w dlugosci (ZERO ZERO FIVE), zero w minutach (ZERO NINE) i zero koncowe po DECIMAL. Plus polkula S / W.',
    trapRu: 'Все нули сразу: ведущий ноль в широте (ZERO SEVEN), два нуля в долготе (ZERO ZERO FIVE), ноль в минутах (ZERO NINE) и конечный ноль после DECIMAL. Плюс полушарие S / W.',
  },
  {
    id: 'p8-zero-minutes-boss',
    lat: '62 00.9 N',
    lon: '020 03.0 E',
    say: 'SIX TWO DEGREES ZERO ZERO DECIMAL NINE MINUTES NORTH, ZERO TWO ZERO DEGREES ZERO THREE DECIMAL ZERO MINUTES EAST',
    must: [
      {
        id: 'lat-deg',
        label: 'stopnie szerokosci: SIX TWO DEGREES',
        anyOf: ['6 2 degrees', 'six two degrees'],
        warnOf: ['62 degrees', 'sixty two degrees'],
      },
      {
        id: 'lat-min',
        label: 'minuty szerokosci: ZERO ZERO DECIMAL NINE MINUTES',
        anyOf: ['0 0 decimal 9 minutes', '0 0 decimal 9 minute', '00 decimal 9 minutes', 'zero zero decimal nine minutes'],
        warnOf: ['00 9 minutes', '0 0 9 minutes', 'zero zero point nine'],
      },
      { id: 'lat-hem', label: 'polkula szerokosci: NORTH', anyOf: ['north'] },
      {
        id: 'lon-deg',
        label: 'stopnie dlugosci: ZERO TWO ZERO DEGREES',
        anyOf: ['0 2 0 degrees', '020 degrees', 'zero two zero degrees'],
        warnOf: ['20 degrees', 'twenty degrees'],
      },
      {
        id: 'lon-min',
        label: 'minuty dlugosci: ZERO THREE DECIMAL ZERO MINUTES',
        anyOf: ['0 3 decimal 0 minutes', '0 3 decimal zero minutes', '03 decimal 0 minutes', '03 decimal zero minutes', 'zero three decimal zero minutes'],
        warnOf: ['3 minutes', '03 0 minutes', 'three minutes'],
      },
      { id: 'lon-hem', label: 'polkula dlugosci: EAST', anyOf: ['east'] },
    ],
    trapPl: 'Final. Minuty ZERO ZERO DECIMAL NINE, dlugosc ZERO TWO ZERO z zerem w srodku i na koncu, minuty dlugosci z zerem wiodacym i koncowym. Kazde zero musi zostac wypowiedziane.',
    trapRu: 'Финал. Минуты ZERO ZERO DECIMAL NINE, долгота ZERO TWO ZERO с нулём в середине и в конце, минуты с ведущим и конечным нулём. Каждый ноль надо произнести.',
  },
];

// --- grading -----------------------------------------------------------------

export type PosStatus = 'ok' | 'warn' | 'miss';

export interface PosCheck {
  id: string;
  label: string;
  status: PosStatus;
  /** the ambiguous form we actually heard, when status is 'warn' */
  heardAs?: string;
}

export interface PosResult {
  checks: PosCheck[];
  score: number;
  /** every element unambiguously correct. A warn is not a pass. */
  passed: boolean;
}

/**
 * Latitude first, then longitude. Always, in that order.
 *
 * Every element could be word-perfect and the position still be wrong: read the
 * longitude first and a receiver who trusts the order plots a different sea. The
 * per-element checks are set-membership tests and cannot see order at all, so it
 * is checked separately, off the hemisphere words that terminate each half.
 */
function orderCheck(said: string, must: PosElement[]): PosCheck {
  const label = 'kolejnosc: najpierw szerokosc (N/S), potem dlugosc (E/W)';
  const find = (id: string) => {
    const el = must.find((m) => m.id === id);
    if (!el) return -1;
    return Math.min(...el.anyOf.map((k) => {
      const i = said.indexOf(normalize(k));
      return i < 0 ? Number.POSITIVE_INFINITY : i;
    }));
  };
  const lat = find('lat-hem');
  const lon = find('lon-hem');
  // If a hemisphere is missing the element itself already fails; we cannot judge
  // the order, and claiming it was right would be inventing a verdict.
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) return { id: 'order', label, status: 'miss' };
  return { id: 'order', label, status: lat < lon ? 'ok' : 'miss' };
}

export function gradePosition(transcript: string, must: PosElement[]): PosResult {
  const said = ` ${normalize(transcript)} `;

  const checks: PosCheck[] = must.map((el) => {
    if (el.anyOf.some((k) => said.includes(normalize(k)))) {
      return { id: el.id, label: el.label, status: 'ok' as const };
    }
    const amb = (el.warnOf ?? []).find((k) => said.includes(normalize(k)));
    if (amb) return { id: el.id, label: el.label, status: 'warn' as const, heardAs: amb };
    return { id: el.id, label: el.label, status: 'miss' as const };
  });

  checks.push(orderCheck(said, must));

  const ok = checks.filter((c) => c.status === 'ok').length;
  return {
    checks,
    score: Math.round((ok / checks.length) * 100),
    passed: ok === checks.length,
  };
}
