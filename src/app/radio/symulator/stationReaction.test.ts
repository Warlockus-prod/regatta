import { describe, expect, it } from 'vitest';
import { pickReaction, REACTION_LINES } from './stationReaction';

// The re-prompt bank must ask about the FIRST thing a real operator would ask,
// and every line it can pick must be pre-generatable (matches what the manifest
// bakes), so the audio is never a surprise live call.
describe('stationReaction: spoken re-prompt on a poor transmission', () => {
  it('asks "say again" when nothing readable came back', () => {
    expect(pickReaction([], { unreadable: true }).say).toMatch(/UNREADABLE.*SAY AGAIN/);
  });

  it('asks for the distress signal first in a distress call', () => {
    // position is also missing, but the missing MAYDAY is asked about first
    const r = pickReaction(['mayday', 'position'], { distress: true });
    expect(r.say).toMatch(/DISTRESS SIGNAL/);
  });

  it('does NOT treat a missing mayday as a distress prompt on a routine call', () => {
    // no distress flag -> falls through past the distress branch to position
    const r = pickReaction(['mayday', 'position'], { distress: false });
    expect(r.say).toMatch(/WHAT IS YOUR POSITION/);
  });

  it('asks the position, persons, name and closing in priority order', () => {
    expect(pickReaction(['position']).say).toMatch(/POSITION/);
    expect(pickReaction(['pob']).say).toMatch(/PERSONS ON BOARD/);
    expect(pickReaction(['persons']).say).toMatch(/PERSONS ON BOARD/);
    expect(pickReaction(['callsign']).say).toMatch(/NAME AND CALL SIGN/);
    expect(pickReaction(['over']).say).toMatch(/FINISH WITH OVER/);
  });

  it('falls back to a plain "say again" for anything else', () => {
    expect(pickReaction(['something-unknown']).say).toBe('SAY AGAIN, OVER.');
  });

  it('every reaction it can return is in REACTION_LINES (so it is pre-generated)', () => {
    const bank = new Set(REACTION_LINES);
    const ids = ['mayday', 'position', 'pob', 'persons', 'nature', 'assistance', 'request', 'callsign', 'identity', 'over', 'out', 'zzz'];
    for (const distress of [true, false]) {
      for (const id of ids) {
        expect(bank.has(pickReaction([id], { distress }).say)).toBe(true);
      }
      expect(bank.has(pickReaction([], { unreadable: true, distress }).say)).toBe(true);
    }
  });
});
