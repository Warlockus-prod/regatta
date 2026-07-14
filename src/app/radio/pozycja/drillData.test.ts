import { describe, it, expect } from 'vitest';
import { POSITIONS, gradePosition } from './drillData';
import { normalize } from '../rozmowa/dialogueGrading';

// ============================================================================
// The whole value of this drill lives in one distinction: FIVE FOUR (correct)
// comes back from the transcriber as "5-4", and the forbidden "fifty four" comes
// back as "54". A keyword list that accepts both grades nothing.
//
// The first draft of this data accepted both. These tests exist so it cannot
// happen again quietly.
// ============================================================================

const p1 = POSITIONS.find((p) => p.id === 'p1-gdansk-basic')!;

describe('the drill actually discriminates', () => {
  it('passes a textbook reading, exactly as the transcriber returns it', () => {
    // measured against our own TTS -> STT loop in production
    const heard = '5-4 DEGREES, 3-0-DECIMAL-5 MINUTES NORTH, 0-1-8 DEGREES, 4-5-DECIMAL-2 MINUTES EAST';
    const r = gradePosition(heard, p1.must);
    expect(r.passed).toBe(true);
    expect(r.score).toBe(100);
  });

  it('does NOT pass "fifty four degrees" - the error the drill exists to catch', () => {
    const heard = 'fifty four degrees thirty point five minutes north, eighteen degrees forty five point two minutes east';
    const r = gradePosition(heard, p1.must);
    expect(r.passed).toBe(false);
    // and it must not be reported as a clean miss either: we heard SOMETHING
    const latDeg = r.checks.find((c) => c.id === 'lat-deg')!;
    expect(latDeg.status).toBe('warn');
  });

  it('flags a lost DECIMAL rather than silently passing it', () => {
    // "thirty point five" is what a POINT reading collapses to
    const r = gradePosition('5 4 degrees 30 5 minutes north 0 1 8 degrees 45 2 minutes east', p1.must);
    expect(r.checks.find((c) => c.id === 'lat-min')!.status).toBe('warn');
    expect(r.passed).toBe(false);
  });

  it('fails a dropped hemisphere outright - a position without N/S is not a position', () => {
    const r = gradePosition('5 4 degrees 3 0 decimal 5 minutes, 0 1 8 degrees 4 5 decimal 2 minutes', p1.must);
    expect(r.checks.find((c) => c.id === 'lat-hem')!.status).toBe('miss');
    expect(r.checks.find((c) => c.id === 'lon-hem')!.status).toBe('miss');
    expect(r.passed).toBe(false);
  });

  it('does NOT pass a merged MINUTES reading either - the hole the first fix left open', () => {
    // "THIRTY DECIMAL FIVE" is rule 1 broken, and it transcribes to "30 decimal 5".
    // The first version of this data listed that in anyOf, so the drill's own subject
    // scored 100%. Degrees were guarded; minutes were not.
    const heard = '5-4 degrees 30 decimal 5 minutes north, 018 degrees 45 decimal 2 minutes east';
    const r = gradePosition(heard, p1.must);
    expect(r.checks.find((c) => c.id === 'lat-min')!.status).toBe('warn');
    expect(r.checks.find((c) => c.id === 'lon-min')!.status).toBe('warn');
    expect(r.passed).toBe(false);
  });

  it('keeps a ZERO-led merged run as a pass - it is not ambiguous', () => {
    // "07" can only come from ZERO SEVEN: the error we hunt drops the zero ("seven" -> "7").
    const p2 = POSITIONS.find((p) => p.id === 'p2-leading-zero-lon')!;
    const r = gradePosition('5 5 degrees 07 decimal 4 minutes north, 008 degrees 3 0 decimal 9 minutes east', p2.must);
    expect(r.checks.find((c) => c.id === 'lat-min')!.status).toBe('ok');
    expect(r.checks.find((c) => c.id === 'lon-deg')!.status).toBe('ok');
  });

  it('fails a reading that puts longitude before latitude', () => {
    // Every element can be word-perfect and the position still be wrong.
    const backwards = '018 degrees 4 5 decimal 2 minutes east, 5 4 degrees 3 0 decimal 5 minutes north';
    const r = gradePosition(backwards, p1.must);
    expect(r.checks.find((c) => c.id === 'order')!.status).toBe('miss');
    expect(r.passed).toBe(false);
    // ...and the elements themselves are all still correct, which is exactly why
    // set-membership checks alone could never catch this.
    expect(r.checks.filter((c) => c.id !== 'order').every((c) => c.status === 'ok')).toBe(true);
  });

  it('does not accept a bare "18 degrees" for a three-digit longitude', () => {
    const r = gradePosition('0 1 8 degrees', p1.must);
    expect(r.checks.find((c) => c.id === 'lon-deg')!.status).toBe('ok');

    const bare = gradePosition('eighteen degrees', p1.must);
    expect(bare.checks.find((c) => c.id === 'lon-deg')!.status).toBe('warn');
  });
});

describe('every item is internally consistent', () => {
  it('the model reading passes its own grader - all eight of them', () => {
    for (const item of POSITIONS) {
      // the model `say` is the SMCP form; graded as if spoken and transcribed verbatim
      const r = gradePosition(item.say, item.must);
      const failed = r.checks.filter((c) => c.status !== 'ok').map((c) => c.id);
      expect(`${item.id}: ${failed.join(',')}`).toBe(`${item.id}: `);
    }
  });

  it('no warnOf entry is reachable while its anyOf also matches', () => {
    // if a warn form is a substring of a correct form, the ok-check must win.
    // (It does - anyOf is tested first - but a warn phrase that ONLY ever appears
    // inside a correct phrase is dead weight and hides a mistake in the data.)
    for (const item of POSITIONS) {
      for (const el of item.must) {
        for (const w of el.warnOf ?? []) {
          const alwaysInsideCorrect = el.anyOf.every((a) => normalize(a).includes(normalize(w)));
          expect(`${item.id}/${el.id}/${w}: ${alwaysInsideCorrect}`).toContain('false');
        }
      }
    }
  });

  it('no anyOf entry accepts a merged reading of a NONZERO-led digit group', () => {
    // The structural form of the bug: "30 decimal 5" in anyOf grades the merged
    // reading as unambiguously correct. A zero-led run ("018", "07", "00") is fine -
    // the error we hunt drops the leading zero, so it cannot produce one.
    for (const item of POSITIONS) {
      for (const el of item.must) {
        for (const a of el.anyOf) {
          expect(`${item.id}/${el.id}/"${a}"`).not.toMatch(/(?<!\d)[1-9]\d/);
        }
      }
    }
  });

  it('longitude is three digits and latitude two, in every item', () => {
    for (const item of POSITIONS) {
      expect(item.lat).toMatch(/^\d{2} \d{2}\.\d [NS]$/);
      expect(item.lon).toMatch(/^\d{3} \d{2}\.\d [EW]$/);
    }
  });

  it('carries no em-dash or en-dash anywhere (project typography rule)', () => {
    const blob = JSON.stringify(POSITIONS);
    expect(blob).not.toMatch(/[\u2013\u2014]/);   // escaped, or this file would trip the hook itself
  });
});
