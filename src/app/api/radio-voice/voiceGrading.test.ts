import { describe, expect, it } from 'vitest';
import { POSITION_POOL, VESSEL_POOL } from '@/app/radio/symulator/radioModel';
import { gradeVoiceTransmission } from './voiceGrading';

const vessel = VESSEL_POOL[0];
const position = POSITION_POOL[0].spoken;
const correctMayday = [
  'MAYDAY MAYDAY MAYDAY',
  'THIS IS BALTIC STAR BALTIC STAR BALTIC STAR',
  'CALL SIGN SP 1234 MMSI 261012345',
  'POSITION 54 30.5 NORTH 018 45.2 EAST',
  'FIRE ON BOARD FIRE IS NOT UNDER CONTROL',
  'REQUIRE IMMEDIATE ASSISTANCE',
  'FOUR PERSONS ON BOARD',
  'OVER',
].join(' ');

describe('radio voice grading', () => {
  it('accepts a complete ordered MAYDAY with the assigned variant', () => {
    const grade = gradeVoiceTransmission({
      kind: 'mayday-fire', transcript: correctMayday, vessel,
      positionSpoken: position, pob: 4,
    });
    expect(grade.score).toBe(100);
    expect(grade.checks.every((check) => check.ok)).toBe(true);
  });

  it('rejects a generic position and wrong persons on board', () => {
    const transcript = correctMayday
      .replace('54 30.5 NORTH 018 45.2 EAST', 'somewhere north')
      .replace('FOUR PERSONS', 'TWO PERSONS');
    const grade = gradeVoiceTransmission({
      kind: 'mayday-fire', transcript, vessel,
      positionSpoken: position, pob: 4,
    });
    expect(grade.checks.find((check) => check.id === 'position')?.ok).toBe(false);
    expect(grade.checks.find((check) => check.id === 'persons')?.ok).toBe(false);
    expect(grade.score).toBeLessThan(90);
  });

  it('checks the order of a radio check call', () => {
    const grade = gradeVoiceTransmission({
      kind: 'radio-check',
      transcript: 'RADIO CHECK THIS IS BALTIC STAR MARINA GDYNIA MARINA GDYNIA OVER',
      vessel,
      positionSpoken: position,
      pob: 4,
    });
    expect(grade.checks.find((check) => check.id === 'order')?.ok).toBe(false);
  });
});

describe('routine / test / medical / relay call grading', () => {
  const grade = (kind: Parameters<typeof gradeVoiceTransmission>[0]['kind'], transcript: string) =>
    gradeVoiceTransmission({ kind, transcript, vessel, positionSpoken: position, pob: 4 });

  it('accepts a correct marina berth request', () => {
    const g = grade('routine-marina',
      'MARINA GDYNIA MARINA GDYNIA THIS IS BALTIC STAR BALTIC STAR REQUEST A BERTH FOR TONIGHT FOUR PERSONS ON BOARD OVER');
    expect(g.score).toBe(100);
  });

  it('flags a marina call with no request and no OVER', () => {
    const g = grade('routine-marina', 'MARINA GDYNIA MARINA GDYNIA THIS IS BALTIC STAR BALTIC STAR');
    expect(g.checks.find((c) => c.id === 'request')?.ok).toBe(false);
    expect(g.checks.find((c) => c.id === 'over')?.ok).toBe(false);
    expect(g.score).toBeLessThan(100);
  });

  it('accepts a correct VTS report', () => {
    const g = grade('vts-report',
      'VTS ZATOKA GDANSKA VTS ZATOKA GDANSKA THIS IS BALTIC STAR BALTIC STAR CALL SIGN SP 1234 POSITION 54 30.5 NORTH 018 45.2 EAST INBOUND TO GDYNIA REQUEST PERMISSION TO ENTER OVER');
    expect(g.score).toBe(100);
  });

  it('accepts a correct ship-to-ship routine call', () => {
    const g = grade('routine-ship',
      'TRAINING SHIP TRAINING SHIP THIS IS BALTIC STAR BALTIC STAR WHAT IS YOUR POSITION AND E T A OVER');
    expect(g.score).toBe(100);
  });

  it('accepts a correct medical PAN PAN with exact MMSI and position', () => {
    const g = grade('panpan-medico',
      'PAN PAN PAN PAN PAN PAN ALL STATIONS ALL STATIONS ALL STATIONS THIS IS BALTIC STAR BALTIC STAR BALTIC STAR MMSI 261012345 POSITION 54 30.5 NORTH 018 45.2 EAST ONE CREW MEMBER INJURED HEAVY BLEEDING REQUEST MEDICAL ADVICE FOUR PERSONS ON BOARD OVER');
    expect(g.score).toBe(100);
  });

  it('accepts a correct MAYDAY RELAY of another vessel', () => {
    const g = grade('mayday-relay',
      'MAYDAY RELAY MAYDAY RELAY MAYDAY RELAY ALL STATIONS ALL STATIONS ALL STATIONS THIS IS BALTIC STAR BALTIC STAR BALTIC STAR RECEIVED THE FOLLOWING MAYDAY FROM YACHT NEPTUN POSITION FIVE FOUR FOUR ZERO NORTH ZERO ONE EIGHT FIVE ZERO EAST NEPTUN IS SINKING THREE PERSONS ON BOARD OVER');
    expect(g.score).toBe(100);
  });

  it('flags a MAYDAY RELAY that omits the relay proword (self-distress confusion)', () => {
    const g = grade('mayday-relay',
      'MAYDAY MAYDAY MAYDAY THIS IS BALTIC STAR BALTIC STAR BALTIC STAR POSITION FIVE FOUR NORTH NEPTUN IS SINKING OVER');
    expect(g.checks.find((c) => c.id === 'relay3')?.ok).toBe(false);
  });

  it('accepts a correct MAYDAY acknowledgement of a received distress', () => {
    const g = grade('mayday-ack',
      'MAYDAY NEPTUN NEPTUN NEPTUN THIS IS BALTIC STAR BALTIC STAR BALTIC STAR RECEIVED MAYDAY OVER');
    expect(g.score).toBe(100);
  });

  it('accepts a correct answer to an incoming individual call', () => {
    const g = grade('answer-call',
      'TRAINING SHIP TRAINING SHIP THIS IS BALTIC STAR BALTIC STAR GO AHEAD OVER');
    expect(g.score).toBe(100);
  });

  it('accepts a correct group call to the regatta fleet', () => {
    const g = grade('routine-group',
      'REGATTA FLEET REGATTA FLEET THIS IS BALTIC STAR BALTIC STAR ASSEMBLE AT THE START LINE OVER');
    expect(g.score).toBe(100);
  });
});

describe('a distress grader must not be tradeable (audit hardening)', () => {
  const g = (kind: Parameters<typeof gradeVoiceTransmission>[0]['kind'], transcript: string, pob = 4) =>
    gradeVoiceTransmission({ kind, transcript, vessel, positionSpoken: position, pob });

  it('marks the defining signal mandatory and passes it for a correct MAYDAY', () => {
    const grade = g('mayday-fire', correctMayday);
    expect(grade.checks.find((c) => c.id === 'mayday3')?.mandatory).toBe(true);
    expect(grade.mandatoryOk).toBe(true);
  });

  it('fails a MAYDAY that omits the word MAYDAY, however high the percentage', () => {
    const noSignal = correctMayday.replace('MAYDAY MAYDAY MAYDAY', 'HELP HELP HELP');
    const grade = g('mayday-fire', noSignal);
    expect(grade.checks.find((c) => c.id === 'mayday3')?.ok).toBe(false);
    expect(grade.mandatoryOk).toBe(false);
  });

  it('fails a SECURITE hazard call spoken with the wrong signal (PAN PAN)', () => {
    const wrongLevel = 'PAN PAN PAN PAN PAN PAN ALL STATIONS ALL STATIONS ALL STATIONS THIS IS BALTIC STAR BALTIC STAR POSITION 54 30.5 NORTH 018 45.2 EAST SUBMERGED CONTAINER NAVIGATE WITH CAUTION OUT';
    const grade = g('securite-hazard', wrongLevel);
    expect(grade.checks.find((c) => c.id === 'securite3')?.ok).toBe(false);
    expect(grade.mandatoryOk).toBe(false);
  });

  it('does not tick OUT/OVER for an unrelated word ending in those letters', () => {
    const endsLookout = 'SECURITE SECURITE SECURITE ALL STATIONS ALL STATIONS ALL STATIONS THIS IS BALTIC STAR BALTIC STAR POSITION 54 30.5 NORTH 018 45.2 EAST SUBMERGED CONTAINER KEEP A SHARP LOOKOUT';
    expect(g('securite-hazard', endsLookout).checks.find((c) => c.id === 'out')?.ok).toBe(false);
    const endsMoreover = 'MARINA GDYNIA MARINA GDYNIA THIS IS BALTIC STAR BALTIC STAR RADIO CHECK MOREOVER';
    expect(g('radio-check', endsMoreover).checks.find((c) => c.id === 'over')?.ok).toBe(false);
  });

  it('does not count a person tally hidden inside a larger number', () => {
    const twentyOne = correctMayday.replace('FOUR PERSONS ON BOARD', 'TWENTY ONE PERSONS ON BOARD');
    expect(g('mayday-fire', twentyOne, 1).checks.find((c) => c.id === 'persons')?.ok).toBe(false);
    const one = correctMayday.replace('FOUR PERSONS ON BOARD', 'ONE PERSON ON BOARD');
    expect(g('mayday-fire', one, 1).checks.find((c) => c.id === 'persons')?.ok).toBe(true);
  });
});
