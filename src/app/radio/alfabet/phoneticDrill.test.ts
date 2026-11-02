import { describe, expect, it } from 'vitest';
import { PHONETIC_ALPHABET, SPOKEN_FIGURES, SPELL_TARGETS, spellingOf } from '@/data/radio/phonetic-alphabet';
import {
  PHONETIC_PROGRESS_KEY, ROUND_SIZE, gradeSpelling, isCorrect, loadPhoneticProgress, makeQuestion, makeRound,
  matchToken, recordPhoneticRound, roundScore, seededRandom, starsFor, type DrillQuestion,
} from '@/lib/radio-phonetic';

function memoryStore(initial: Record<string, string> = {}) {
  const data = { ...initial };
  return { getItem: (k: string) => data[k] ?? null, setItem: (k: string, v: string) => { data[k] = v; }, data };
}

describe('spelling grader', () => {
  it('passes the standard spelling of every drill target', () => {
    for (const t of SPELL_TARGETS) {
      const r = gradeSpelling(t.text, spellingOf(t.text));
      expect(r.passed, t.text).toBe(true);
      expect(r.score, t.text).toBe(100);
      expect(r.checks.every((c) => c.status === 'ok'), t.text).toBe(true);
    }
  });

  it('maps every code word and figure word back to its character', () => {
    for (const l of PHONETIC_ALPHABET) expect(matchToken(l.word)).toMatchObject({ kind: 'char', char: l.letter, standard: true });
    for (const f of SPOKEN_FIGURES) expect(matchToken(f.word)).toMatchObject({ kind: 'char', char: f.symbol, standard: true });
  });

  it('rejects bare letters: O R K A is not a spelling', () => {
    const r = gradeSpelling('ORKA', 'O R K A');
    expect(r.passed).toBe(false);
    expect(r.score).toBe(0);
  });

  it('rejects a wrong code word, a wrong order, a missing and an extra word', () => {
    const wrong = gradeSpelling('ORKA', 'OSCAR ROMEO KILO BRAVO');
    expect(wrong.passed).toBe(false);
    expect(wrong.checks[3]).toMatchObject({ char: 'A', status: 'wrong', heard: 'BRAVO' });
    expect(wrong.score).toBe(75);

    expect(gradeSpelling('ORKA', 'ROMEO OSCAR KILO ALFA').passed).toBe(false);

    const missing = gradeSpelling('ORKA', 'OSCAR ROMEO KILO');
    expect(missing.passed).toBe(false);
    expect(missing.checks[3].status).toBe('missing');

    const extra = gradeSpelling('ORKA', 'OSCAR ROMEO KILO ALFA BRAVO');
    expect(extra.passed).toBe(false);
    expect(extra.extra).toEqual(['BRAVO']);
  });

  it('rejects misspelt code words that are not on the list', () => {
    expect(gradeSpelling('ORKA', 'OSKAR ROMEO KILO ALFA').passed).toBe(false);
    expect(gradeSpelling('MXQV7', 'MIKE EXRAY QUEBEC VICTOR SEVEN').passed).toBe(false);
    expect(gradeSpelling('DJ4527', 'DELTA JULIETT FOR FIVE TWO SEVEN').passed).toBe(false);
  });

  it('accepts same-sounding variants but tells the learner the standard', () => {
    const r = gradeSpelling('ORKA', 'Oscar Romeo Kilo Alpha');
    expect(r.passed).toBe(true);
    expect(r.checks[3]).toMatchObject({ status: 'variant', expected: 'ALFA' });
    expect(gradeSpelling('9HA3021', 'niner hotel alfa tree zero too wun').passed).toBe(true);
    expect(gradeSpelling('MXQV7', 'mike x ray quebec victor seven').passed).toBe(true);
  });

  it('accepts numerals only from recognised speech, never from typing', () => {
    expect(gradeSpelling('DJ4527', 'DELTA JULIETT 4 5 2 7').passed).toBe(false);
    expect(gradeSpelling('DJ4527', 'DELTA JULIETT 4 5 2 7', { allowNumerals: true }).passed).toBe(true);
  });

  it('ignores the space in a ship name and filler words around the spelling', () => {
    expect(gradeSpelling('QUICK FOX', 'I spell QUEBEC UNIFORM INDIA CHARLIE KILO FOXTROT OSCAR X-RAY over').passed).toBe(true);
  });
});

describe('recognition questions and the scored round', () => {
  it('builds questions whose answer is one of four distinct options', () => {
    const rnd = seededRandom(7);
    for (const kind of ['word-to-letter', 'letter-to-word', 'figure-to-say'] as const) {
      for (let i = 0; i < 40; i++) {
        const q = makeQuestion(kind, rnd);
        expect(q.options).toHaveLength(4);
        expect(new Set(q.options).size).toBe(4);
        expect(q.options).toContain(q.answer);
      }
    }
  });

  it('checks word-to-letter against the real table', () => {
    const rnd = seededRandom(3);
    for (let i = 0; i < 30; i++) {
      const q = makeQuestion('word-to-letter', rnd);
      const entry = PHONETIC_ALPHABET.find((l) => l.word === q.prompt)!;
      expect(q.answer).toBe(entry.letter);
      for (const o of q.options) expect(isCorrect(q, o)).toBe(o === entry.letter);
    }
  });

  it('never accepts an answer outside the options or a near miss', () => {
    const q: DrillQuestion = { id: 'x', kind: 'letter-to-word', prompt: 'J', options: ['Juliett', 'Kilo', 'Lima', 'Mike'], answer: 'Juliett' };
    expect(isCorrect(q, 'Juliett')).toBe(true);
    expect(isCorrect(q, 'Juliet')).toBe(false);
    expect(isCorrect(q, 'juliett')).toBe(false);
    expect(isCorrect(q, 'Kilo')).toBe(false);
    expect(isCorrect({ ...q, options: ['Kilo', 'Lima', 'Mike', 'Oscar'] }, 'Juliett')).toBe(false);
  });

  it('makes a deterministic round of ten different questions', () => {
    const a = makeRound(42);
    expect(a).toHaveLength(ROUND_SIZE);
    expect(new Set(a.map((q) => q.id)).size).toBe(ROUND_SIZE);
    expect(makeRound(42)).toEqual(a);
    expect(a.filter((q) => q.kind === 'figure-to-say')).toHaveLength(3);
  });

  it('scores only correct answers, unanswered and wrong ones count as wrong', () => {
    const round = makeRound(5);
    expect(roundScore(round, round.map((q) => q.answer))).toBe(100);
    expect(roundScore(round, round.map((q) => q.options.find((o) => o !== q.answer)!))).toBe(0);
    expect(roundScore(round, round.map(() => null))).toBe(0);
    const seven = round.map((q, i) => (i < 7 ? q.answer : q.options.find((o) => o !== q.answer)!));
    expect(roundScore(round, seven)).toBe(70);
  });

  it('awards stars at 90, 70 and 50 percent', () => {
    expect([100, 90, 89, 70, 69, 50, 49, 0].map(starsFor)).toEqual([3, 3, 2, 2, 1, 1, 0, 0]);
  });
});

describe('phonetic progress', () => {
  it('keeps the best score and counts rounds', () => {
    const store = memoryStore();
    expect(loadPhoneticProgress(store)).toMatchObject({ best: 0, stars: 0, rounds: 0 });
    recordPhoneticRound(80, store, 1);
    const after = recordPhoneticRound(40, store, 2);
    expect(after).toEqual({ best: 80, stars: 2, rounds: 2, lastAt: 2 });
    expect(JSON.parse(store.data[PHONETIC_PROGRESS_KEY])).toEqual(after);
  });

  it('survives a corrupt or hostile stored value', () => {
    expect(loadPhoneticProgress(memoryStore({ [PHONETIC_PROGRESS_KEY]: '{oops' }))).toMatchObject({ best: 0, rounds: 0 });
    expect(loadPhoneticProgress(memoryStore({ [PHONETIC_PROGRESS_KEY]: '{"best":900,"rounds":-3}' }))).toMatchObject({ best: 100, stars: 3, rounds: 0 });
  });
});
