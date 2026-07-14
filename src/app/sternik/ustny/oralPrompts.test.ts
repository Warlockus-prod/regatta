import { describe, it, expect } from 'vitest';
import { ORAL_PROMPTS } from './oralPrompts';
import { gradeTurn, hits } from '../../radio/rozmowa/dialogueGrading';

// ============================================================================
// Two ways a spoken-answer trainer lies to a learner, and a test for each.
//
// FALSE REJECT: the keyword list is frozen in one Polish inflection, so a fully
// correct answer scores zero. ("wyprzedzajacy ustepuje" does not match the
// natural "Jednostka wyprzedzajaca zawsze ustepuje jednostce wyprzedzanej".)
// Guard: the model answer must pass its own grader, every element.
//
// FALSE ACCEPT: the keyword tests the vocabulary instead of the fact, so stating
// the REVERSED rule still scores. Guard: known wrong answers must fail.
// ============================================================================

describe('the model answer passes its own grader', () => {
  // Collect across all twelve before asserting: an expect() inside the loop stops
  // at the first bad prompt and hides every one after it, which is how a broken
  // keyword list in question 10 survived a "passing" run of this very test.
  it('every element of every one of the twelve', () => {
    const broken = ORAL_PROMPTS.flatMap((p) =>
      p.must.filter((m) => !hits(p.modelPl, m)).map((m) => `${p.id}/${m.id}`));
    expect(broken).toEqual([]);
  });

  it('and scores a pass, not just a partial', () => {
    const failed = ORAL_PROMPTS.filter((p) => !gradeTurn(p.modelPl, p.must).passed).map((p) => p.id);
    expect(failed).toEqual([]);
  });
});

describe('a natural correct answer is not rejected on inflection', () => {
  it('overtaking, phrased the way a person actually says it', () => {
    const q = ORAL_PROMPTS.find((p) => p.id === 'sternik-oral-02')!;
    const said = 'Jednostka wyprzedzajaca zawsze ustepuje jednostce wyprzedzanej. Zblizam sie zza rufy, ponad 22 stopnie za trawersem, i w nocy widze tylko biale swiatlo rufowe. Ustepuje dopoki go calkowicie nie wymine i nie oddale sie.';
    expect(gradeTurn(said, q.must).passed).toBe(true);
  });

  it('crossing, with the manoeuvre described in adjectives rather than adverbs', () => {
    const q = ORAL_PROMPTS.find((p) => p.id === 'sternik-oral-01')!;
    const said = 'Ustepuje ten, kto ma druga lodz po prawej burcie. Manewr ma byc wczesny i wyrazny, przechodze za jej rufa i nie wolno przecinac jej kursu. Druga jednostka utrzymuje kurs i predkosc.';
    expect(gradeTurn(said, q.must).passed).toBe(true);
  });
});

describe('the reversed rule does not score', () => {
  it('IALA B colours (red to starboard) must fail the IALA A question', () => {
    const q = ORAL_PROMPTS.find((p) => p.id === 'sternik-oral-04')!;
    const wrong = 'Prawa strona toru wodnego jest czerwona, a lewa zielona. Patrze od morza w kierunku portu.';
    const r = gradeTurn(wrong, q.must);
    expect(r.checks.find((c) => c.id === 'q4-e1')!.ok).toBe(false);
    expect(r.checks.find((c) => c.id === 'q4-e2')!.ok).toBe(false);
    expect(r.passed).toBe(false);
  });

  it('reversed prop walk (stern to starboard astern) must fail', () => {
    const q = ORAL_PROMPTS.find((p) => p.id === 'sternik-oral-10')!;
    const wrong = 'Na wstecznym rufa idzie w prawo, a do przodu w lewo. To praca boczna smigla, najsilniejsza przy malej predkosci.';
    const r = gradeTurn(wrong, q.must);
    expect(r.checks.find((c) => c.id === 'q10-e2')!.ok).toBe(false);
    expect(r.checks.find((c) => c.id === 'q10-e3')!.ok).toBe(false);
  });

  it('holds up when the transcriber returns no punctuation at all', () => {
    const iala = ORAL_PROMPTS.find((p) => p.id === 'sternik-oral-04')!;
    const prop = ORAL_PROMPTS.find((p) => p.id === 'sternik-oral-10')!;

    // correct, unpunctuated: the conjunction "a" still marks the clause
    expect(hits('prawa strona jest zielona a lewa strona jest czerwona', iala.must[0])).toBe(true);
    expect(hits('do przodu rufa idzie w prawo a na wstecznym rufa scaga w lewo', prop.must[1])).toBe(true);
    expect(hits('do przodu rufa idzie w prawo a na wstecznym rufa scaga w lewo', prop.must[2])).toBe(true);

    // reversed, unpunctuated: still caught
    expect(hits('prawa strona jest czerwona a lewa zielona', iala.must[0])).toBe(false);
    expect(hits('na wstecznym rufa idzie w prawo a do przodu w lewo', prop.must[2])).toBe(false);

    // terse, no separator anywhere: falls back to proximity, still correct
    expect(hits('prawa zielona lewa czerwona', iala.must[0])).toBe(true);
    expect(hits('prawa czerwona lewa zielona', iala.must[0])).toBe(false);
  });

  it('a distress question is not satisfied by the number 16 appearing anywhere', () => {
    const q = ORAL_PROMPTS.find((p) => p.id === 'sternik-oral-06')!;
    const wrong = 'Mam 16 osob na pokladzie i 70 litrow paliwa.';
    expect(gradeTurn(wrong, q.must).checks.find((c) => c.id === 'q6-e1')!.ok).toBe(false);
  });
});

describe('the data itself', () => {
  it('has no dead keyword: every entry can survive normalization', () => {
    // "22,5" and "0,2" can never match - normalize() strips the comma. An entry
    // that cannot possibly fire is not a safety net, it is a decoration that
    // hides how thin the real list is.
    for (const p of ORAL_PROMPTS) {
      for (const m of p.must) {
        for (const k of m.anyOf) {
          expect(`${p.id}/${m.id}/"${k}"`).not.toMatch(/[,.]/);
        }
      }
    }
  });

  it('carries no em-dash or en-dash, and no Polish diacritics in the PL text', () => {
    for (const p of ORAL_PROMPTS) {
      const pl = `${p.questionPl} ${p.modelPl} ${p.whyPl} ${p.must.map((m) => m.label).join(' ')}`;
      expect(pl).not.toMatch(/[\u2013\u2014]/);
      expect(pl).not.toMatch(/[ąężłóćńśźĄĘŻŁÓĆŃŚŹ]/);
    }
  });

  it('covers all six exam topics', () => {
    const topics = new Set(ORAL_PROMPTS.map((p) => p.topic));
    expect(topics.size).toBe(6);
    expect(ORAL_PROMPTS).toHaveLength(12);
  });
});
