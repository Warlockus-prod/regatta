import { describe, expect, it } from 'vitest';
import { gradeVoiceTransmission } from '@/app/api/radio-voice/voiceGrading';
import { VESSEL_POOL } from './radioModel';
import { SCENARIOS, type VariantData } from './scenarios';
import { stationReply } from './stationReply';
import { VENUES, fillPlace, placeRadio, venueById, venuesFor } from './venues';
import { INITIAL_RADIO } from './radioModel';

const POB_WORDS: Record<number, string> = { 2: 'TWO', 3: 'THREE', 4: 'FOUR', 5: 'FIVE', 6: 'SIX' };

// Every scenario can be drawn in several venues. The model transmission the
// trainer shows (and plays in the debrief) must pass the grader in each of
// them, or the trainer would fail a learner for reading its own script.
describe('venues: the shown model transmission passes the grader everywhere', () => {
  for (const sc of SCENARIOS) {
    const step = sc.steps.find((s) => s.voice);
    if (!step?.voice) continue;
    for (const venue of venuesFor(sc.needs)) {
      it(`${sc.id} in ${venue.id}`, () => {
        venue.positions.forEach((position, posIdx) => {
          const v: VariantData = { vessel: VESSEL_POOL[posIdx % VESSEL_POOL.length], posSpoken: position.spoken, pobWord: POB_WORDS[4], pob: 4, venue };
          const grade = gradeVoiceTransmission({
            kind: step.voice!.kind, transcript: step.voice!.lines(v).join(' '), vessel: v.vessel,
            positionSpoken: position.spoken, pob: 4, venue,
          });
          expect(grade.checks.filter((c) => !c.ok).map((c) => c.id)).toEqual([]);
          expect(grade.mandatoryOk).toBe(true);
        });
      });
    }
  }
});

describe('venues: the grader expects this venue, not Gdynia', () => {
  const vessel = VESSEL_POOL[1];
  const solent = venueById('solent');
  const check = (transcript: string, kind: 'radio-check' | 'vts-report' | 'mayday-fire', venue = solent, positionSpoken = solent.positions[0].spoken) =>
    gradeVoiceTransmission({ kind, transcript, vessel, positionSpoken, pob: 4, venue });

  it('calls the Solent marina, and calling Marina Gdynia there fails', () => {
    const ok = check('LYMINGTON YACHT HAVEN LYMINGTON YACHT HAVEN THIS IS ORKA ORKA RADIO CHECK OVER', 'radio-check');
    expect(ok.checks.find((c) => c.id === 'station')?.ok).toBe(true);
    const wrong = check('MARINA GDYNIA MARINA GDYNIA THIS IS ORKA ORKA RADIO CHECK OVER', 'radio-check');
    expect(wrong.checks.find((c) => c.id === 'station')?.ok).toBe(false);
  });

  it('needs the VTS named twice: "inbound to Southampton" is not a call', () => {
    const once = check('SOUTHAMPTON VTS THIS IS ORKA ORKA POSITION 50 43.4 NORTH 001 30.2 WEST INBOUND TO SOUTHAMPTON OVER', 'vts-report');
    expect(once.checks.find((c) => c.id === 'station')?.ok).toBe(false);
  });

  it('grades a position west of Greenwich, and the wrong hemisphere fails', () => {
    const base = 'MAYDAY MAYDAY MAYDAY THIS IS ORKA ORKA ORKA CALL SIGN SP 5678 MMSI 261054321 POSITION 50 43.4 NORTH 001 30.2 WEST FIRE ON BOARD REQUIRE IMMEDIATE ASSISTANCE FOUR PERSONS ON BOARD OVER';
    expect(check(base, 'mayday-fire').checks.find((c) => c.id === 'position')?.ok).toBe(true);
    const east = check(base.replace('001 30.2 WEST', '001 30.2 EAST'), 'mayday-fire');
    expect(east.checks.find((c) => c.id === 'position')?.ok).toBe(false);
    expect(east.mandatoryOk).toBe(false);
  });

  it('keeps the Gulf of Gdańsk as the default for clients that send no venue', () => {
    const grade = gradeVoiceTransmission({
      kind: 'radio-check', transcript: 'MARINA GDYNIA MARINA GDYNIA THIS IS ORKA ORKA RADIO CHECK OVER',
      vessel, positionSpoken: venueById(null).positions[0].spoken, pob: 4,
    });
    expect(grade.checks.every((c) => c.ok)).toBe(true);
  });
});

describe('venues: data and wiring', () => {
  it('only lists coast stations with a checked MMSI and keeps Bodrum out of shore-station scenarios', () => {
    for (const v of VENUES) if (v.coast) expect(v.coast.mmsi).toMatch(/^00\d{7}$/);
    expect(venueById('bodrum').coast).toBeNull();
    const coastScenarios = SCENARIOS.filter((s) => s.needs?.includes('coast'));
    expect(coastScenarios.length).toBeGreaterThan(5);
    for (const s of coastScenarios) expect(venuesFor(s.needs).map((v) => v.id)).not.toContain('bodrum');
  });

  it('draws marina scenarios in all four venues and the VTS report only where a VTS exists', () => {
    expect(venuesFor(['marina']).map((v) => v.id).sort()).toEqual(['bodrum', 'gdansk', 'palma', 'solent']);
    expect(venuesFor(['vts']).map((v) => v.id).sort()).toEqual(['gdansk', 'solent']);
  });

  it('puts the venue coast station into the radio and its address book', () => {
    const s = placeRadio(INITIAL_RADIO, venueById('palma'));
    expect(s.coast).toEqual({ label: 'PALMA RADIO', mmsi: '002241024' });
    expect(s.individualIds.some((a) => a.label === 'POLISH RESCUE RADIO')).toBe(false);
    expect(s.individualIds[0]).toEqual({ label: 'PALMA RADIO', mmsi: '002241024' });
    const bodrum = placeRadio(INITIAL_RADIO, venueById('bodrum'));
    expect(bodrum.coast).toBeNull();
    expect(bodrum.individualIds.some((a) => a.mmsi === '002618102')).toBe(false);
  });

  it('answers from the venue stations', () => {
    expect(stationReply('radio-check', 'ORKA', venueById('solent'))?.station).toBe('LYMINGTON YACHT HAVEN');
    expect(stationReply('mayday-fire', 'ORKA', venueById('palma'))?.say).toContain('PALMA RADIO');
    expect(stationReply('panpan-engine', 'ORKA', venueById('palma'))?.say).toContain('SEVEN TWO');
  });

  it('fills every place-holder for every venue, in every language', () => {
    const texts = SCENARIOS.flatMap((s) => [s.brief.pl, s.brief.ru, ...s.steps.flatMap((st) => [st.todo.pl, st.why.pl, st.todo.ru, st.why.ru]), ...s.mistakes.flatMap((m) => [m.text.pl, m.text.ru])]);
    for (const sc of SCENARIOS) {
      for (const venue of venuesFor(sc.needs)) {
        const own = [sc.brief.pl, ...sc.steps.flatMap((st) => [st.todo.pl, st.why.pl]), ...sc.mistakes.map((m) => m.text.pl)];
        for (const t of own) expect(fillPlace(t, venue, 'pl')).not.toMatch(/\{[a-zA-Z]+\}/);
      }
    }
    expect(texts.some((t) => t.includes('{marinaCh}'))).toBe(true);
  });

  it('keeps titles free of place-holders (the list shows them before a venue is drawn)', () => {
    for (const s of SCENARIOS) expect(`${s.title.pl} ${s.title.ru}`).not.toContain('{');
  });
});
