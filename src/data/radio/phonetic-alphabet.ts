// ============================================================================
// The radiotelephony spelling alphabet and the spoken figures, as data.
//
// Source: ITU Radio Regulations Appendix 14 (phonetic alphabet and figure code),
// the same table as ICAO Annex 10 and IMO SMCP. The code words and the spoken
// numbers are the international standard and stay English in every interface
// language; only the explanations around them are translated.
//
// `syllables` is the ITU pronunciation guide, one entry per syllable, and
// `stress` lists the stressed syllables (underlined in the ITU table, capitals
// in ICAO). The scripts/pregen-radio-audio.mjs generator imports this file
// directly, so it must stay free of runtime imports.
// ============================================================================

export interface PhoneticLetter {
  /** A-Z */
  letter: string;
  /** the code word, in the ITU spelling (Alfa, Juliett) */
  word: string;
  syllables: readonly string[];
  /** indexes into `syllables` that carry the stress */
  stress: readonly number[];
}

export const PHONETIC_ALPHABET: readonly PhoneticLetter[] = [
  { letter: 'A', word: 'Alfa', syllables: ['AL', 'FAH'], stress: [0] },
  { letter: 'B', word: 'Bravo', syllables: ['BRAH', 'VOH'], stress: [0] },
  { letter: 'C', word: 'Charlie', syllables: ['CHAR', 'LEE'], stress: [0] },
  { letter: 'D', word: 'Delta', syllables: ['DELL', 'TAH'], stress: [0] },
  { letter: 'E', word: 'Echo', syllables: ['ECK', 'OH'], stress: [0] },
  { letter: 'F', word: 'Foxtrot', syllables: ['FOKS', 'TROT'], stress: [0] },
  { letter: 'G', word: 'Golf', syllables: ['GOLF'], stress: [0] },
  { letter: 'H', word: 'Hotel', syllables: ['HOH', 'TELL'], stress: [1] },
  { letter: 'I', word: 'India', syllables: ['IN', 'DEE', 'AH'], stress: [0] },
  { letter: 'J', word: 'Juliett', syllables: ['JEW', 'LEE', 'ETT'], stress: [0] },
  { letter: 'K', word: 'Kilo', syllables: ['KEY', 'LOH'], stress: [0] },
  { letter: 'L', word: 'Lima', syllables: ['LEE', 'MAH'], stress: [0] },
  { letter: 'M', word: 'Mike', syllables: ['MIKE'], stress: [0] },
  { letter: 'N', word: 'November', syllables: ['NO', 'VEM', 'BER'], stress: [1] },
  { letter: 'O', word: 'Oscar', syllables: ['OSS', 'CAH'], stress: [0] },
  { letter: 'P', word: 'Papa', syllables: ['PAH', 'PAH'], stress: [1] },
  { letter: 'Q', word: 'Quebec', syllables: ['KEH', 'BECK'], stress: [1] },
  { letter: 'R', word: 'Romeo', syllables: ['ROW', 'ME', 'OH'], stress: [0] },
  { letter: 'S', word: 'Sierra', syllables: ['SEE', 'AIR', 'RAH'], stress: [1] },
  { letter: 'T', word: 'Tango', syllables: ['TANG', 'GO'], stress: [0] },
  { letter: 'U', word: 'Uniform', syllables: ['YOU', 'NEE', 'FORM'], stress: [0] },
  { letter: 'V', word: 'Victor', syllables: ['VIK', 'TAH'], stress: [0] },
  { letter: 'W', word: 'Whiskey', syllables: ['WISS', 'KEY'], stress: [0] },
  { letter: 'X', word: 'X-ray', syllables: ['ECKS', 'RAY'], stress: [0] },
  { letter: 'Y', word: 'Yankee', syllables: ['YANG', 'KEY'], stress: [0] },
  { letter: 'Z', word: 'Zulu', syllables: ['ZOO', 'LOO'], stress: [0] },
];

export interface SpokenFigure {
  /** '0'-'9', or '.' for the decimal point */
  symbol: string;
  /** what is said on the air (IMO SMCP), in capitals as in a transmission */
  word: string;
  /** pronunciation guide (ICAO / ITU), stress as above */
  syllables: readonly string[];
  stress: readonly number[];
  /** the ITU figure code word (Appendix 14), used when a figure must not be misheard */
  codeWord: string;
}

export const SPOKEN_FIGURES: readonly SpokenFigure[] = [
  { symbol: '0', word: 'ZERO', syllables: ['ZE', 'RO'], stress: [0, 1], codeWord: 'Nadazero' },
  { symbol: '1', word: 'ONE', syllables: ['WUN'], stress: [0], codeWord: 'Unaone' },
  { symbol: '2', word: 'TWO', syllables: ['TOO'], stress: [0], codeWord: 'Bissotwo' },
  { symbol: '3', word: 'THREE', syllables: ['TREE'], stress: [0], codeWord: 'Terrathree' },
  { symbol: '4', word: 'FOUR', syllables: ['FOW', 'ER'], stress: [0], codeWord: 'Kartefour' },
  { symbol: '5', word: 'FIVE', syllables: ['FIFE'], stress: [0], codeWord: 'Pantafive' },
  { symbol: '6', word: 'SIX', syllables: ['SIX'], stress: [0], codeWord: 'Soxisix' },
  { symbol: '7', word: 'SEVEN', syllables: ['SEV', 'EN'], stress: [0], codeWord: 'Setteseven' },
  { symbol: '8', word: 'EIGHT', syllables: ['AIT'], stress: [0], codeWord: 'Oktoeight' },
  { symbol: '9', word: 'NINE', syllables: ['NIN', 'ER'], stress: [0], codeWord: 'Novenine' },
  { symbol: '.', word: 'DECIMAL', syllables: ['DAY', 'SEE', 'MAL'], stress: [0, 1, 2], codeWord: 'Decimal' },
];

/** The text the "listen" button speaks for a figure: its pronunciation, so the
 *  voice says WUN and NIN-ER, not a plain English "one" and "nine". */
export function figureSpeech(figure: SpokenFigure): string {
  return figure.syllables.map((s, i) => (i === 0 ? s[0] + s.slice(1).toLowerCase() : s.toLowerCase())).join('-');
}

export type NumberContext = 'channel' | 'time' | 'course' | 'draught' | 'mmsi';

/** Numbers are said figure by figure; these are the forms a learner meets most. */
export interface NumberExample {
  id: string;
  context: NumberContext;
  /** as written on paper or a display */
  written: string;
  /** as transmitted */
  spoken: string;
}

export const NUMBER_EXAMPLES: readonly NumberExample[] = [
  { id: 'ch16', context: 'channel', written: '16', spoken: 'ONE SIX' },
  { id: 'time1630', context: 'time', written: '1630', spoken: 'ONE SIX THREE ZERO' },
  { id: 'course210', context: 'course', written: '210°', spoken: 'TWO ONE ZERO DEGREES' },
  { id: 'draught18', context: 'draught', written: '1.8 m', spoken: 'ONE DECIMAL EIGHT METRES' },
  { id: 'mmsi', context: 'mmsi', written: '211234560', spoken: 'TWO ONE ONE TWO THREE FOUR FIVE SIX ZERO' },
];

/** Names and call signs to spell. Fictional; the call-sign prefixes are mixed on purpose. */
export interface SpellTarget {
  id: string;
  kind: 'ship' | 'callsign';
  text: string;
}

export const SPELL_TARGETS: readonly SpellTarget[] = [
  { id: 'orka', kind: 'ship', text: 'ORKA' },
  { id: 'zephyr', kind: 'ship', text: 'ZEPHYR' },
  { id: 'quick-fox', kind: 'ship', text: 'QUICK FOX' },
  { id: 'wind-dancer', kind: 'ship', text: 'WIND DANCER' },
  { id: 'dj4527', kind: 'callsign', text: 'DJ4527' },
  { id: 'oz2214', kind: 'callsign', text: 'OZ2214' },
  { id: 'mxqv7', kind: 'callsign', text: 'MXQV7' },
  { id: '9ha3021', kind: 'callsign', text: '9HA3021' },
];

/** The exact transmission of a spelled name: one code word or figure per character. */
export function spellingOf(text: string): string {
  return [...text.toUpperCase()].flatMap((ch) => {
    const letter = PHONETIC_ALPHABET.find((l) => l.letter === ch);
    if (letter) return [letter.word.toUpperCase()];
    const figure = SPOKEN_FIGURES.find((f) => f.symbol === ch);
    return figure ? [figure.word] : [];
  }).join(' ');
}

/** Clips the drill can play that are not yet in the pre-generated set. The
 *  pregen script reads this list; until it runs, they use the live voice. */
export function phoneticDrillPhrases(): string[] {
  return [
    ...PHONETIC_ALPHABET.map((l) => l.word),
    ...SPOKEN_FIGURES.map(figureSpeech),
    ...SPOKEN_FIGURES.filter((f) => f.symbol !== '.').map((f) => f.codeWord),
    ...NUMBER_EXAMPLES.map((n) => n.spoken),
    ...SPELL_TARGETS.map((t) => spellingOf(t.text)),
  ];
}
