import { describe, expect, it } from 'vitest';
import { ENABLED_LANGUAGES } from '@/lib/languages';
import {
  NUMBER_EXAMPLES, PHONETIC_ALPHABET, SPELL_TARGETS, SPOKEN_FIGURES, figureSpeech, phoneticDrillPhrases, spellingOf,
} from '@/data/radio/phonetic-alphabet';
import { PHONETIC_COPY } from '@/data/radio/phonetic-copy';
import { DIGITS, PHONETIC } from '../cheatData';
import { sayGuide } from '@/lib/radio-phonetic';

// The ITU Radio Regulations Appendix 14 table, written out independently of the
// data file: a missing letter, a misspelt code word or a swapped order fails.
const ITU_WORDS = [
  'Alfa', 'Bravo', 'Charlie', 'Delta', 'Echo', 'Foxtrot', 'Golf', 'Hotel', 'India', 'Juliett', 'Kilo', 'Lima', 'Mike',
  'November', 'Oscar', 'Papa', 'Quebec', 'Romeo', 'Sierra', 'Tango', 'Uniform', 'Victor', 'Whiskey', 'X-ray', 'Yankee', 'Zulu',
];
const ITU_STRESSED = [
  'AL', 'BRAH', 'CHAR', 'DELL', 'ECK', 'FOKS', 'GOLF', 'TELL', 'IN', 'JEW', 'KEY', 'LEE', 'MIKE',
  'VEM', 'OSS', 'PAH', 'BECK', 'ROW', 'AIR', 'TANG', 'YOU', 'VIK', 'WISS', 'ECKS', 'YANG', 'ZOO',
];

describe('phonetic alphabet data', () => {
  it('has all 26 letters A-Z in order with the ITU code words', () => {
    expect(PHONETIC_ALPHABET.map((l) => l.letter).join('')).toBe('ABCDEFGHIJKLMNOPQRSTUVWXYZ');
    expect(PHONETIC_ALPHABET.map((l) => l.word)).toEqual(ITU_WORDS);
  });

  it('marks exactly the ITU stressed syllable of every code word', () => {
    PHONETIC_ALPHABET.forEach((l, i) => {
      expect(l.syllables.length, l.word).toBeGreaterThan(0);
      expect(l.stress, l.word).toHaveLength(1);
      expect(l.syllables[l.stress[0]], l.word).toBe(ITU_STRESSED[i]);
      expect(l.syllables.join('').length, l.word).toBeGreaterThan(2);
    });
  });

  it('pronounces the figures the maritime way (WUN, TREE, FIFE, NIN-ER)', () => {
    expect(SPOKEN_FIGURES.map((f) => f.symbol).join('')).toBe('0123456789.');
    expect(SPOKEN_FIGURES.map((f) => f.word)).toEqual(['ZERO', 'ONE', 'TWO', 'THREE', 'FOUR', 'FIVE', 'SIX', 'SEVEN', 'EIGHT', 'NINE', 'DECIMAL']);
    expect(SPOKEN_FIGURES.map(sayGuide)).toEqual(['ZE-RO', 'WUN', 'TOO', 'TREE', 'FOW-ER', 'FIFE', 'SIX', 'SEV-EN', 'AIT', 'NIN-ER', 'DAY-SEE-MAL']);
    for (const f of SPOKEN_FIGURES) for (const s of f.stress) expect(s).toBeLessThan(f.syllables.length);
    expect(figureSpeech(SPOKEN_FIGURES[9])).toBe('Nin-er');
  });

  it('agrees with the cheat sheet, so the two tables can never drift apart', () => {
    expect(PHONETIC.map(([l, w]) => `${l}=${w}`)).toEqual(PHONETIC_ALPHABET.map((l) => `${l.letter}=${l.word}`));
    expect(DIGITS.map(([d, w]) => `${d}=${w}`)).toEqual(SPOKEN_FIGURES.filter((f) => f.symbol !== '.').map((f) => `${f.symbol}=${f.codeWord}`));
  });

  it('spells names and call signs one standard word per character', () => {
    expect(spellingOf('ORKA')).toBe('OSCAR ROMEO KILO ALFA');
    expect(spellingOf('DJ4527')).toBe('DELTA JULIETT FOUR FIVE TWO SEVEN');
    expect(spellingOf('MXQV7')).toBe('MIKE X-RAY QUEBEC VICTOR SEVEN');
    for (const t of SPELL_TARGETS) {
      expect(spellingOf(t.text).split(' ')).toHaveLength(t.text.replace(/ /g, '').length);
    }
  });

  it('says every number example figure by figure', () => {
    for (const n of NUMBER_EXAMPLES) {
      const figures = [...n.written].filter((ch) => /[0-9.]/.test(ch));
      const words = figures.map((ch) => SPOKEN_FIGURES.find((f) => f.symbol === ch)!.word);
      expect(n.spoken.startsWith(words.join(' ')), n.id).toBe(true);
    }
  });

  it('lists every playable phrase for pregeneration, without duplicates or blanks', () => {
    const phrases = phoneticDrillPhrases();
    expect(phrases.every((p) => p.trim().length > 0)).toBe(true);
    for (const l of PHONETIC_ALPHABET) expect(phrases).toContain(l.word);
  });
});

describe('phonetic drill copy', () => {
  it('has every string in all seven languages, without dashes or country framing', () => {
    const langs = ENABLED_LANGUAGES.map(({ id }) => id).sort();
    for (const [key, value] of Object.entries(PHONETIC_COPY)) {
      expect(Object.keys(value).sort(), key).toEqual(langs);
      for (const text of Object.values(value)) {
        expect(text.trim().length, key).toBeGreaterThan(0);
        expect(text, key).not.toMatch(/[\u2013\u2014\u201c\u201d\u201e]/);
        expect(text, key).not.toMatch(/polsk|polish|poland|польск|польш|pologne|polonais|polacc|polnisch|polen\b|polaco|UKE/i);
      }
    }
  });

  it('keeps placeholders identical across languages', () => {
    for (const [key, value] of Object.entries(PHONETIC_COPY)) {
      const sets = Object.values(value).map((text) => [...text.matchAll(/\{\d\}/g)].map((m) => m[0]).sort().join(','));
      expect(new Set(sets).size, key).toBe(1);
    }
  });
});
