import { describe, expect, it } from 'vitest';
import { gradeTurn, hits, normalize } from './dialogueGrading';
import { DIALOGUES } from './dialogues';

// ============================================================================
// The grader has exactly one job it must never get wrong: a CORRECT transmission
// must never be marked as missing something. Telling a learner their perfect
// MAYDAY was missing the word MAYDAY does not just annoy them - it teaches them
// to distrust the trainer, and then to distrust their own correct procedure.
// ============================================================================

const find = (id: string) => {
  const d = DIALOGUES.find((x) => x.id === id);
  if (!d) throw new Error(`no dialogue ${id}`);
  return d;
};

describe('normalization', () => {
  it('survives the punctuation speech-to-text actually returns', () => {
    // this is what gpt-4o-transcribe really sends back
    expect(normalize('Mayday! Mayday! Mayday!')).toBe('mayday mayday mayday');
    expect(normalize('Pan-pan, pan-pan, pan-pan.')).toBe('pan pan pan pan pan pan');
    expect(normalize('S.P. 9012')).toBe('s p 9012');
    expect(normalize('54deg 30.5\' N')).toBe('54deg 30 5 n');
  });

  it('strips Polish diacritics, so a station name matches either way', () => {
    expect(normalize('Zatoka Gdańska')).toBe('zatoka gdanska');
    expect(normalize('Władysławowo')).toBe('wladyslawowo');
  });
});

describe('a perfect transmission always passes', () => {
  it.each(DIALOGUES.map((d) => [d.id, d] as const))('%s: every scripted turn scores 100', (_id, d) => {
    for (const turn of d.turns) {
      const { score, passed } = gradeTurn(turn.youSay, turn.must);
      expect({ turn: turn.youSay.slice(0, 40), score }).toEqual({ turn: turn.youSay.slice(0, 40), score: 100 });
      expect(passed).toBe(true);
    }
  });
});

describe('the punctuation trap', () => {
  it('grades a MAYDAY the transcriber punctuated - the bug that would have failed everyone', () => {
    const mayday = find('mayday-dialogue').turns[0];
    const asHeard = 'Mayday! Mayday! Mayday! This is Wind Dancer, Wind Dancer, Wind Dancer, call sign Sierra Papa 9012. My position is 54 degrees 30.5 minutes north, 018 degrees 45.2 minutes east. I am on fire in the engine compartment. I require immediate assistance. Three persons on board. Over.';
    const { score, checks } = gradeTurn(asHeard, mayday.must);
    expect(checks.find((c) => c.id === 'mayday')?.ok).toBe(true);
    expect(score).toBe(100);
  });

  it('grades a PAN-PAN the transcriber punctuated', () => {
    const panpan = find('panpan-medico').turns[0];
    const asHeard = 'Pan-pan, pan-pan, pan-pan. All stations, all stations, all stations. This is Wind Dancer, call sign Sierra Papa 9012. My position is 54 degrees 30.5 north, 018 degrees 45.2 east. I have a crew member with a deep cut to the hand and heavy bleeding. I request medical advice. Three persons on board. Over.';
    expect(gradeTurn(asHeard, panpan.must).checks.find((c) => c.id === 'panpan')?.ok).toBe(true);
  });

  it('grades the EXACT transcript prod returned when we spoke a MAYDAY at it', () => {
    // Not a guess. Our own TTS read the distress call, our own STT heard it back,
    // and this is verbatim what came out - digits, hyphens and all. It is here so
    // that this shape can never silently stop matching.
    const fromProd = 'MAYDAY, MAYDAY, MAYDAY, THIS IS, WIND DANCER, WIND DANCER, WIND DANCER, CALL SIGN, SIERRA PAPA 9012, MY POSITION IS, 5-4 DEGREES, 3-0-DECIMAL-5 MINUTES NORTH, I AM ON FIRE IN THE ENGINE COMPARTMENT, I REQUIRE IMMEDIATE ASSISTANCE, THREE PERSONS ON BOARD, OVER.';
    const { score, checks } = gradeTurn(fromProd, find('mayday-dialogue').turns[0].must);
    expect(checks.filter((c) => !c.ok)).toEqual([]);
    expect(score).toBe(100);
  });

  it('accepts the vessel name however a Polish speaker gets rendered', () => {
    const turn = find('radio-check').turns[0];
    const identity = turn.must.find((m) => m.id === 'identity')!;
    for (const heard of ['this is Vind Dancer', 'THIS IS WINDANCER', 'this is Wind Dancers']) {
      expect(hits(heard, identity)).toBe(true);
    }
  });

  it('accepts a call sign as digits, as words, or with periods', () => {
    const callsign = find('radio-check').turns[0].must.find((m) => m.id === 'callsign')!;
    for (const heard of ['call sign S.P. 9012', 'call sign Sierra Papa 9 0 1 2', 'call sign sierra papa nine zero one two']) {
      expect(hits(heard, callsign)).toBe(true);
    }
  });
});

describe('a bad transmission still fails', () => {
  it('a MAYDAY with no position and no POB does not pass', () => {
    const mayday = find('mayday-dialogue').turns[0];
    const { passed, checks } = gradeTurn('Mayday mayday mayday, this is Wind Dancer, I am on fire, I require immediate assistance.', mayday.must);
    expect(checks.find((c) => c.id === 'position')?.ok).toBe(false);
    expect(checks.find((c) => c.id === 'pob')?.ok).toBe(false);
    expect(passed).toBe(false);
  });

  it('silence scores zero', () => {
    expect(gradeTurn('', find('radio-check').turns[0].must).score).toBe(0);
  });
});

describe('the conversations themselves', () => {
  it('nobody transmits after the learner says OUT', () => {
    // OUT means the exchange is finished. A station that answers it is
    // procedurally impossible - and it is the lesson of the first dialogue.
    for (const d of DIALOGUES) {
      for (const t of d.turns) {
        const saysOut = /\bOUT\.?$/.test(t.youSay.trim());
        if (saysOut) expect({ id: d.id, reply: t.stationSays }).toEqual({ id: d.id, reply: '' });
      }
    }
  });

  it('every turn the learner must answer ends with OVER, not OUT', () => {
    for (const d of DIALOGUES) {
      d.turns.forEach((t, i) => {
        const isLast = i === d.turns.length - 1;
        if (!isLast) expect({ id: d.id, i, ends: t.youSay.trim().slice(-5) }).toEqual({ id: d.id, i, ends: 'OVER.' });
      });
    }
  });

  it('the coast station imposes radio silence on a MAYDAY', () => {
    expect(find('mayday-dialogue').turns[0].stationSays).toContain('SEELONCE MAYDAY');
  });

  it('urgency traffic is moved off channel 16 to a Polish Rescue Radio working channel', () => {
    const medico = find('panpan-medico');
    // moves to CH62 (a real Polish Rescue Radio working channel), off the calling channel 16
    const moved = medico.turns.some((t) => /CHANNEL SIX TWO/.test(t.stationSays));
    expect(moved).toBe(true);
  });
});

describe('audit 2026-07-17: per-turn expected channel drives channel discipline', () => {
  // Content spoken after a "change to channel X" must be marked as belonging on
  // the working channel, so LiveDialogue can flag it when the learner never
  // turned the knob and script the station carrier on the right channel.
  it('marina-berth carries the berth details and readback on CH12, hail on 16', () => {
    const t = find('marina-berth').turns;
    expect(t[0].channel).toBeUndefined();       // hail on the dialogue channel (16)
    expect(t[1].channel).toBeUndefined();        // "CHANGING TO 12" is announced on 16
    expect(t[2].channel).toBe('12');             // berth details belong on 12
    expect(t[3].channel).toBe('12');             // readback on 12
  });

  it('ship-to-ship carries the manoeuvre agreement on CH6', () => {
    const t = find('ship-to-ship').turns;
    expect(t[2].channel).toBe('6');
    expect(t[3].channel).toBe('6');
  });

  it('a set per-turn channel always differs from the dialogue start channel', () => {
    for (const d of DIALOGUES) {
      for (const [i, t] of d.turns.entries()) {
        if (t.channel !== undefined) {
          expect({ id: d.id, i, channel: t.channel }).not.toEqual({ id: d.id, i, channel: d.channel });
        }
      }
    }
  });
});

describe('distress signals cannot be traded or faked (audit hardening)', () => {
  const anyItem = (id: string) => {
    for (const d of DIALOGUES) for (const t of d.turns) {
      const m = t.must.find((x) => x.id === id);
      if (m) return m;
    }
    throw new Error(`no must-item with id ${id}`);
  };

  it('OUT/OVER match whole tokens, not substrings (about != OUT, moreover != OVER)', () => {
    const out = anyItem('out');
    const over = anyItem('over');
    expect(hits('this is baltic star radio check out', out)).toBe(true);
    expect(hits('i was talking about the weather', out)).toBe(false);
    expect(hits('go ahead over', over)).toBe(true);
    expect(hits('moreover the wind rose', over)).toBe(false);
  });

  it('MAYDAY is required three times and is critical', () => {
    const mayday = anyItem('mayday');
    expect(mayday.critical).toBe(true);
    expect(hits('mayday mayday mayday this is wind dancer', mayday)).toBe(true);
    expect(hits('mayday mayday this is wind dancer', mayday)).toBe(false);   // only twice
    expect(hits('this is wind dancer we have a fire', mayday)).toBe(false);  // missing
  });

  it('PAN-PAN is the full three-fold signal and is critical', () => {
    const panpan = anyItem('panpan');
    expect(panpan.critical).toBe(true);
    expect(hits('pan pan pan pan pan pan all stations', panpan)).toBe(true);
    expect(hits('pan pan pan all stations', panpan)).toBe(false);   // only 1.5x
  });

  it('a MAYDAY turn does not pass when the signal word is missing', () => {
    const turn = find('mayday-dialogue').turns.find((t) => t.must.some((m) => m.id === 'mayday'));
    if (!turn) throw new Error('no mayday turn');
    const missing = 'this is wind dancer sierra papa 9012 position 54 30 5 north 018 45 2 east fire on board require immediate assistance three persons on board over';
    expect(gradeTurn(missing, turn.must).passed).toBe(false);
  });
});

describe('audit 2026-07-17: prowords are end-anchored, OUT + distress content are critical', () => {
  const anyItem = (id: string) => {
    for (const d of DIALOGUES) for (const t of d.turns) { const m = t.must.find((x) => x.id === id); if (m) return m; }
    throw new Error(`no must-item ${id}`);
  };

  it('OUT ticks only at the close, not as a substring or when the turn ends with OVER', () => {
    const out = anyItem('out');
    expect(hits('marina gdynia this is wind dancer radio check out', out)).toBe(true);
    expect(hits('i was talking about the weather over', out)).toBe(false);       // "about" is not OUT
    expect(hits('marina gdynia this is wind dancer radio check over', out)).toBe(false); // closed with OVER
  });

  it('OVER ticks only at the close, not when it opens the turn or is "moreover"', () => {
    const over = anyItem('over');
    expect(hits('go ahead this is wind dancer over', over)).toBe(true);
    expect(hits('over to you marina gdynia this is wind dancer radio check', over)).toBe(false);
    expect(hits('moreover the wind rose radio check', over)).toBe(false);
  });

  it('OUT is critical: an otherwise-correct radio check closed with OVER fails', () => {
    const rc = find('radio-check');
    const closer = rc.turns.find((t) => t.must.some((m) => m.id === 'out'));
    if (!closer) throw new Error('no OUT-closing turn');
    expect(gradeTurn(closer.youSay, closer.must).passed).toBe(true);
    const wrong = closer.youSay.replace(/OUT\.?\s*$/i, 'OVER.');
    expect(gradeTurn(wrong, closer.must).passed).toBe(false);
  });

  it('mayday-dialogue first turn fails without a position (position is critical)', () => {
    const turn = find('mayday-dialogue').turns.find((t) => t.must.some((m) => m.id === 'mayday'))!;
    expect(gradeTurn(turn.youSay, turn.must).passed).toBe(true);
    const noPos = turn.youSay.replace(/MY POSITION IS[^.]*\./i, '');
    expect(gradeTurn(noPos, turn.must).passed).toBe(false);
  });

  it('PAN-PAN must be a consecutive three-fold signal, not scattered pans', () => {
    const panpan = anyItem('panpan');
    expect(hits('pan pan pan pan pan pan all stations', panpan)).toBe(true);
    expect(hits('pan pan pan all stations pan pan', panpan)).toBe(false);   // 1.5x then interrupted
    expect(hits('pan pan all stations pan pan pan', panpan)).toBe(false);
  });
});
