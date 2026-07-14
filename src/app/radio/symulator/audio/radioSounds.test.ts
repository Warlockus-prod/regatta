import { describe, expect, it } from 'vitest';
import { createInitialRadio, radioReducer, CHANNELS, type RadioState } from '../radioModel';
import { cuesFor, audioView } from './radioSounds';
import { SIG_WEAK, SIG_STRONG, opensGate, signalOn, scriptOver, clearTraffic } from '../radioTraffic';

// ============================================================================
// The squelch threshold is a BEHAVIOURAL CONTRACT, not decoration: a radio with
// the squelch set too high is deaf to the very call the exam is about, and the
// only thing that tells the learner is their ear. These tests pin that down.
// ============================================================================

function on(): RadioState {
  const s = createInitialRadio();
  return radioReducer(s, { type: 'dial-hold' });
}

/** walk the radio to a channel by number */
function toChannel(s: RadioState, num: string): RadioState {
  const target = CHANNELS.findIndex((c) => c.num === num);
  let cur = s;
  while (cur.channelIndex !== target) {
    cur = radioReducer(cur, { type: cur.channelIndex < target ? 'up' : 'down' });
  }
  return cur;
}

describe('squelch gate', () => {
  it('a correctly set squelch hears the weak distant call', () => {
    // the taught procedure lands the learner at 3-4
    expect(opensGate(3, SIG_WEAK)).toBe(true);
    expect(opensGate(4, SIG_WEAK)).toBe(true);
  });

  it('a squelch turned up "for silence" goes deaf to that same call', () => {
    // this is the failure the exam is really testing
    expect(opensGate(5, SIG_WEAK)).toBe(false);
    expect(opensGate(8, SIG_WEAK)).toBe(false);
  });

  it('a strong station still gets through a high squelch, but not a maxed one', () => {
    expect(opensGate(8, SIG_STRONG)).toBe(true);
    expect(opensGate(10, SIG_STRONG)).toBe(false); // max squelch = deaf radio
  });

  it('squelch 0 is the monitor position: always open, hiss and all', () => {
    expect(opensGate(0, 0)).toBe(true);
  });

  it('an idle channel opens the gate only while the noise floor is above it', () => {
    expect(opensGate(1, 0, 2.2)).toBe(true);   // noise breaks through a low squelch
    expect(opensGate(3, 0, 2.2)).toBe(false);  // just above the floor: silence
  });
});

describe('traffic', () => {
  it('channel 70 is never audible - it is data only', () => {
    for (let t = 0; t < 60_000; t += 500) expect(signalOn('70', t)).toBe(0);
  });

  it('a scripted over is on the air only for its duration', () => {
    clearTraffic();
    scriptOver('16', { startMs: 1000, durMs: 2000, signal: SIG_WEAK, voice: 'male' });
    expect(signalOn('16', 999)).toBe(0);
    expect(signalOn('16', 1500)).toBe(SIG_WEAK);
    expect(signalOn('16', 3001)).toBe(0);
    clearTraffic();
  });

  it('is deterministic: the same channel at the same time always sounds the same', () => {
    clearTraffic();
    expect(signalOn('12', 123_456)).toBe(signalOn('12', 123_456));
  });
});

describe('cues', () => {
  it('a refused PTT on channel 70 sounds like a refusal, not a keypress', () => {
    const s = toChannel(on(), '70');
    const next = radioReducer(s, { type: 'ptt-down' });
    expect(next.ptt).toBe(false);                       // the reducer refuses
    expect(cuesFor({ type: 'ptt-down' }, s, next)).toEqual(['error-beep']);
  });

  it('a real PTT keys the transmitter', () => {
    const s = toChannel(on(), '16');
    const next = radioReducer(s, { type: 'ptt-down' });
    expect(next.ptt).toBe(true);
    expect(cuesFor({ type: 'ptt-down' }, s, next)).toEqual(['tx-key']);
  });

  it('power on and off are their own sounds', () => {
    const off = createInitialRadio();
    const powered = radioReducer(off, { type: 'dial-hold' });
    expect(cuesFor({ type: 'dial-hold' }, off, powered)).toEqual(['power-on']);
    const back = radioReducer(powered, { type: 'dial-hold' });
    expect(cuesFor({ type: 'dial-hold' }, powered, back)).toEqual(['power-off']);
  });

  it('a dial rotate that changes nothing (at the clamp) makes no sound', () => {
    const s = on();
    // walk squelch to its floor, then try to go further
    let cur = radioReducer(s, { type: 'dial-push' });   // volume
    cur = radioReducer(cur, { type: 'dial-push' });     // squelch
    for (let i = 0; i < 12; i++) cur = radioReducer(cur, { type: 'dial-rotate', dir: -1 });
    expect(cur.squelch).toBe(0);
    const next = radioReducer(cur, { type: 'dial-rotate', dir: -1 });
    expect(cuesFor({ type: 'dial-rotate', dir: -1 }, cur, next)).toEqual([]);
  });

  it('a dead radio makes no sound at all', () => {
    const off = createInitialRadio();
    const next = radioReducer(off, { type: 'menu' });
    expect(cuesFor({ type: 'menu' }, off, next)).toEqual([]);
  });
});

describe('audioView', () => {
  it('marks channel 70 as voiceless', () => {
    expect(audioView(toChannel(on(), '70')).noVoice).toBe(true);
    expect(audioView(toChannel(on(), '16')).noVoice).toBe(false);
  });

  it('monitors the gate on the volume screen, but never on the squelch screen', () => {
    const vol = radioReducer(on(), { type: 'dial-push' });
    expect(audioView(vol).monitor).toBe(true);
    const sql = radioReducer(vol, { type: 'dial-push' });
    expect(sql.screen).toBe('squelch');
    expect(audioView(sql).monitor).toBe(false); // the squelch lesson lives here
  });
});
