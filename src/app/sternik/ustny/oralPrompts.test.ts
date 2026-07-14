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

  // --- every reversal the review demonstrated, pinned -------------------------

  const q = (id: string) => ORAL_PROMPTS.find((p) => p.id === id)!;

  it('Q1: giving way to the vessel on your PORT side must not pass', () => {
    const wrong = 'Ustepuje ta jednostka, ktora ma druga po swojej lewej burcie. Manewr wykonuje wczesnie i wyraznie, przechodze za rufa. Druga jednostka utrzymuje kurs i predkosc.';
    const r = gradeTurn(wrong, q('sternik-oral-01').must);
    expect(r.checks.find((c) => c.id === 'q1-e1')!.ok).toBe(false);
    expect(r.passed).toBe(false);   // three of four right used to be enough
  });

  it('Q2: "the overtaken gives way to the overtaker" is Rule 13 backwards', () => {
    const wrong = 'Jednostka wyprzedzana zawsze ustepuje jednostce wyprzedzajacej. Widze tylko biale swiatlo rufowe, ponad 22 stopnie za trawersem. Obowiazek trwa az do calkowitego wyminiecia.';
    const r = gradeTurn(wrong, q('sternik-oral-02').must);
    expect(r.checks.find((c) => c.id === 'q2-e1')!.ok).toBe(false);
    expect(r.passed).toBe(false);
  });

  it('Q3: a SOUTH cardinal description must not score on the NORTH question', () => {
    const wrong = 'Znak kardynalny polnocny jest u gory zolty, a na dole czarny, dwa czarne stozki wierzcholkami do dolu, mijam go od strony poludniowej.';
    const r = gradeTurn(wrong, q('sternik-oral-03').must);
    expect(r.checks.find((c) => c.id === 'q3-e1')!.ok).toBe(false);
    expect(r.checks.find((c) => c.id === 'q3-e2')!.ok).toBe(false);
    expect(r.checks.find((c) => c.id === 'q3-e4')!.ok).toBe(false);
    expect(r.passed).toBe(false);
  });

  it('Q3: naming the mark does not answer which side to pass it', () => {
    // "polnocny" is in the mark's own NAME, so a bare "polnoc" keyword could never be missed
    const partial = 'Znak kardynalny polnocny ma dwa czarne stozki skierowane do gory, jest czarny u gory i zolty na dole, a swiatlo jest biale i migajace.';
    expect(gradeTurn(partial, q('sternik-oral-03').must).checks.find((c) => c.id === 'q3-e4')!.ok).toBe(false);
  });

  it('Q7: garbling the limits into "12 nautical miles" must not score', () => {
    const wrong = 'Patent sternika motorowodnego uprawnia do prowadzenia jachtow motorowych po wodach srodladowych i morskich do 12 mil morskich od brzegu. Bez patentu mozna prowadzic jacht o mocy do 60 kilowatow.';
    const r = gradeTurn(wrong, q('sternik-oral-07').must);
    expect(r.checks.find((c) => c.id === 'q7-e2')!.ok).toBe(false);
    expect(r.passed).toBe(false);
  });

  it('Q8: swapping the two alcohol thresholds must not score', () => {
    const wrong = 'Stan po uzyciu alkoholu to powyzej 0,5 promila, a nietrzezwosc to od 0,2 do 0,5. Rejestracji podlega jacht powyzej 7,5 metra albo silnik powyzej 15 kW.';
    const r = gradeTurn(wrong, q('sternik-oral-08').must);
    expect(r.checks.find((c) => c.id === 'q8-e1')!.ok).toBe(false);
    expect(r.checks.find((c) => c.id === 'q8-e2')!.ok).toBe(false);
    expect(r.passed).toBe(false);
  });

  it('Q8: "I do not remember the thresholds" is not a correct answer', () => {
    expect(gradeTurn('Nie pamietam progow rejestracji.', q('sternik-oral-08').must)
      .checks.find((c) => c.id === 'q8-e3')!.ok).toBe(false);
  });
});

describe('a correct answer is not called a reversal', () => {
  const q = (id: string) => ORAL_PROMPTS.find((p) => p.id === id)!;

  it('the contrast phrasing "nie w prawo, tylko w lewo" is CORRECT and must pass', () => {
    // The clause naming the gear names the WRONG direction - because it denies it.
    // Read literally this is the reversed rule; read as Polish it is textbook.
    const said = 'Efekt sruby to praca boczna smigla, ktora znosi rufe na bok. Na wstecznym rufa nie idzie w prawo, tylko w lewo. Do przodu rufa nie idzie w lewo, tylko w prawo. Efekt jest najsilniejszy przy malej predkosci.';
    const r = gradeTurn(said, q('sternik-oral-10').must);
    expect(r.checks.find((c) => c.id === 'q10-e3')!.ok).toBe(true);
    expect(r.checks.find((c) => c.id === 'q10-e2')!.ok).toBe(true);
    expect(r.passed).toBe(true);
  });

  it('the mirror of that phrasing, which IS reversed, still fails', () => {
    const said = 'Na wstecznym rufa nie idzie w lewo, tylko w prawo. Praca boczna smigla znosi rufe na bok, najsilniej przy malej predkosci.';
    expect(gradeTurn(said, q('sternik-oral-10').must).checks.find((c) => c.id === 'q10-e3')!.ok).toBe(false);
  });

  it('answering only the question asked (astern) passes - it is not unpassable', () => {
    const said = 'Efekt sruby, czyli praca boczna smigla, znosi rufe na bok. Przy prawoskretnej srubie na biegu wstecznym rufa scaga w lewo. Efekt jest najsilniejszy przy malej predkosci i mocnym dodaniu gazu, wiec wykorzystuje go przy cumowaniu.';
    expect(gradeTurn(said, q('sternik-oral-10').must).passed).toBe(true);
  });

  it('mentioning that IALA B is the other way round does not fail you', () => {
    // The better the candidate, the more likely they add this sentence.
    const said = 'Prawa strona toru wodnego jest zielona i stozkowa, a lewa czerwona i walcowa. Kierunek oznakowania jest od morza w kierunku portu. W regionie IALA B jest odwrotnie: prawa strona jest czerwona.';
    const r = gradeTurn(said, q('sternik-oral-04').must);
    expect(r.checks.find((c) => c.id === 'q4-e1')!.ok).toBe(true);
    expect(r.passed).toBe(true);
  });

  it('but stating IALA B as if it were the rule here still fails', () => {
    const said = 'Prawa strona toru wodnego nie jest zielona, jest czerwona. Lewa strona nie jest czerwona, jest zielona. Kierunek od morza do portu, system IALA.';
    expect(gradeTurn(said, q('sternik-oral-04').must).checks.find((c) => c.id === 'q4-e1')!.ok).toBe(false);
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
