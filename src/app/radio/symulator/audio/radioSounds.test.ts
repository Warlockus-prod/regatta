import { describe, expect, it } from 'vitest';
import { createInitialRadio, radioReducer, menuItems, softkeys, CHANNELS, type RadioState } from '../radioModel';
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

/**
 * Walk the radio to a channel by number. The arrows only move the CHANNEL from
 * standby - on a menu screen they move the cursor instead - so get out of
 * whatever screen we are on first.
 */
function toChannel(s: RadioState, num: string): RadioState {
  const target = CHANNELS.findIndex((c) => c.num === num);
  let cur = s;
  let guard = 0;
  while (cur.screen !== 'standby' && guard++ < 8) cur = radioReducer(cur, { type: 'clr' });
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

  it('a tight squelch still lets a strong station through - it is not a mute switch', () => {
    // Level 10 is "tight squelch", not "deaf". What a tight squelch loses is the
    // WEAK call, and that subtlety is exactly why people fail on it.
    expect(opensGate(10, SIG_STRONG)).toBe(true);
    expect(opensGate(10, SIG_WEAK)).toBe(false);
  });

  it('squelch 0 is the OPEN position: always open, hiss and all', () => {
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

  it('channel 16 is quiet the great majority of the time', () => {
    // A distress and calling channel that chattered constantly would teach the
    // learner to tune it out - the exact opposite of the point. (The first hash
    // had correlated low bits and left 16 busy about a third of the time.)
    clearTraffic();
    let busy = 0;
    const N = 4000;
    for (let i = 0; i < N; i++) if (signalOn('16', i * 1000) > 0) busy++;
    expect(busy / N).toBeLessThan(0.10);
  });

  it('a port channel carries real traffic - but is not permanently occupied', () => {
    clearTraffic();
    let busy = 0;
    const N = 4000;
    for (let i = 0; i < N; i++) if (signalOn('12', i * 1000) > 0) busy++;
    expect(busy / N).toBeGreaterThan(0.05);
    expect(busy / N).toBeLessThan(0.35);
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

  it('no screen can force the squelch open - neither exam radio has a monitor', () => {
    // An earlier version opened the gate while the VOL screen was up. Neither the
    // IC-M330GE nor the IC-M323 has a MON key or any squelch defeat: the only way
    // to hear the hiss is to SET the squelch to OPEN, and that is a latched
    // setting that survives leaving the screen.
    const vol = radioReducer(on(), { type: 'dial-push' });
    expect(vol.screen).toBe('volume');
    expect(audioView(vol)).not.toHaveProperty('monitor');
    expect(audioView(vol).squelch).toBe(4); // still closed, so still silent
  });
});

describe('key beep (MENU > Configuration > Key Beep)', () => {
  /** walk MENU > Configuration and toggle Key Beep off */
  function beepsOff(): RadioState {
    let s = on();
    s = radioReducer(s, { type: 'menu' });
    const idx = menuItems(s).indexOf('Configuration');
    for (let i = 0; i < idx; i++) s = radioReducer(s, { type: 'down' });
    s = radioReducer(s, { type: 'ent' });   // into Configuration
    expect(s.screen).toBe('config');
    return radioReducer(s, { type: 'ent' }); // toggle
  }

  it('is On by default and can be turned Off, exactly like the real set', () => {
    expect(on().keyBeep).toBe(true);
    expect(beepsOff().keyBeep).toBe(false);
  });

  it('silences the key beep', () => {
    const s = beepsOff();
    const next = radioReducer(s, { type: 'clr' });
    expect(cuesFor({ type: 'clr' }, s, next)).not.toContain('key-beep');
  });

  it('CANNOT silence the DSC alarm - no setting on the radio can', () => {
    // The alarm is driven by the screen, not by cuesFor, precisely so that a
    // preference can never mute a safety function.
    const s = beepsOff();
    expect(s.keyBeep).toBe(false);
    const ptt = radioReducer(toChannel(s, '70'), { type: 'ptt-down' });
    // even the refusal beep is a key beep, so it goes quiet...
    expect(cuesFor({ type: 'ptt-down' }, toChannel(s, '70'), ptt)).toEqual([]);
    // ...but the alarm cue is not in cuesFor's vocabulary at all
    expect(cuesFor({ type: 'ptt-down' }, toChannel(s, '70'), ptt)).not.toContain('alarm-start');
  });
});

describe('scan and dual watch', () => {
  it('refuses to scan with the squelch OPEN, like the manual demands', () => {
    let s = on();
    // squelch to OPEN
    s = radioReducer(s, { type: 'dial-push' });
    s = radioReducer(s, { type: 'dial-push' });
    for (let i = 0; i < 6; i++) s = radioReducer(s, { type: 'dial-rotate', dir: -1 });
    expect(s.squelch).toBe(0);
    s = radioReducer(s, { type: 'clr' });

    const page = radioReducer(s, { type: 'soft-page', dir: 1 });   // SCAN lives on page 2
    const idx = softkeys(page).indexOf('SCAN');
    expect(idx).toBeGreaterThanOrEqual(0);
    const tried = radioReducer(page, { type: 'soft', index: idx });
    expect(tried.scanActive).toBe(false);
  });

  it('a scan pauses on a busy channel instead of chopping the station up', () => {
    let s = on();
    const page = radioReducer(s, { type: 'soft-page', dir: 1 });
    const idx = softkeys(page).indexOf('SCAN');
    s = radioReducer(page, { type: 'soft', index: idx });
    expect(s.scanActive).toBe(true);
    const before = s.channelIndex;
    const paused = radioReducer(s, { type: 'scan-tick', busy: true });
    expect(paused.channelIndex).toBe(before);
    const moved = radioReducer(s, { type: 'scan-tick', busy: false });
    expect(moved.channelIndex).not.toBe(before);
  });

  it('dual watch parks on 16 when someone is on it, and comes back when they go', () => {
    let s = toChannel(on(), '12');
    const page = radioReducer(s, { type: 'soft-page', dir: 1 });
    const idx = softkeys(page).indexOf('DW');
    s = radioReducer(page, { type: 'soft', index: idx });
    expect(s.dualWatch).toBe(true);

    const onSixteen = radioReducer(s, { type: 'dw-tick', sixteenBusy: true });
    expect(CHANNELS[onSixteen.channelIndex].num).toBe('16');
    expect(onSixteen.dwOnSixteen).toBe(true);

    const back = radioReducer(onSixteen, { type: 'dw-tick', sixteenBusy: false });
    expect(CHANNELS[back.channelIndex].num).toBe('12');
  });
});
