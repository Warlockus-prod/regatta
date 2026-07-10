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
