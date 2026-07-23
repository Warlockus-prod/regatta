import { describe, it, expect } from 'vitest';
import { SCENARIOS } from './scenarios';
import { VOICE_KINDS } from '@/app/api/radio-voice/voiceGrading';
import {
  createInitialRadio, radioReducer,
  type RadioEvent, type RadioModel, type RadioState,
} from './radioModel';

// Drive a scenario through the pure reducer + the same linear step engine the
// page uses (page.tsx): the current step's check() marks it done and advances;
// voice steps advance here too (in the app onVoiceComplete does that after a
// passing grade - separately covered by voiceGrading.test.ts). This proves each
// scenario is actually completable on the shipped state machine.
function play(id: string, events: RadioEvent[], model: RadioModel = 'M330') {
  const sc = SCENARIOS.find((s) => s.id === id);
  if (!sc) throw new Error(`no scenario ${id}`);
  let state: RadioState = sc.init ? sc.init(createInitialRadio(model).vessel) : createInitialRadio(model);
  const done = new Set<string>();
  const mistakes = new Set<string>();
  let idx = 0;
  for (const e of events) {
    const prev = state;
    state = radioReducer(state, e);
    for (const m of sc.mistakes) if (m.detect(e, prev, state, done)) mistakes.add(m.id);
    const step = sc.steps[idx];
    if (step && !done.has(step.id) && step.check(e, prev, state)) { done.add(step.id); idx += 1; }
  }
  return { sc, state, done, mistakes };
}

const rep = (n: number, e: RadioEvent): RadioEvent[] => Array.from({ length: n }, () => e);
const complete = (id: string, events: RadioEvent[], model: RadioModel = 'M330') => {
  const { sc, done } = play(id, events, model);
  return done.size === sc.steps.length;
};

describe('scenario catalogue integrity', () => {
  it('has unique ids and non-empty steps', () => {
    const ids = SCENARIOS.map((s) => s.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const s of SCENARIOS) {
      expect(s.steps.length).toBeGreaterThan(0);
      expect(new Set(s.steps.map((st) => st.id)).size).toBe(s.steps.length);
    }
  });

  it('every voice step uses a kind the grader knows', () => {
    const known = new Set<string>(VOICE_KINDS);
    for (const s of SCENARIOS) {
      for (const st of s.steps) {
        if (st.voice) expect(known.has(st.voice.kind)).toBe(true);
      }
    }
  });

  it('ships the expected count (6 originals + 7 transmit + 2 receive)', () => {
    expect(SCENARIOS.length).toBe(19);
  });

  it('covers all four DSC call types across the catalogue', () => {
    const sends = SCENARIOS.flatMap((s) => s.steps).map((st) => st.id);
    // type-selection steps exist for Individual / Group / Test; All Ships is
    // the default used by the urgency/safety scenarios.
    expect(SCENARIOS.some((s) => s.id === 'routine-ship')).toBe(true);   // Individual
    expect(SCENARIOS.some((s) => s.id === 'group-call')).toBe(true);     // Group
    expect(SCENARIOS.some((s) => s.id === 'dsc-test')).toBe(true);       // Test
    expect(SCENARIOS.some((s) => s.id === 'mob-panpan')).toBe(true);     // All Ships
    expect(sends.length).toBeGreaterThan(0);
  });
});

describe('new scenarios are completable (M330)', () => {
  it('routine-marina: power -> CH12 -> voice', () => {
    // CH16 (idx15) -> CH12 (idx11): four channel-down steps.
    expect(complete('routine-marina', [
      { type: 'dial-hold' }, ...rep(4, { type: 'down' }), { type: 'ptt-down' },
    ])).toBe(true);
  });

  it('vts-report: power -> CH71 -> voice', () => {
    // CH16 (idx15) -> CH71 (idx39): 24 channel-up steps.
    expect(complete('vts-report', [
      { type: 'dial-hold' }, ...rep(24, { type: 'up' }), { type: 'ptt-down' },
    ])).toBe(true);
  });

  it('panpan-medico: All Ships / Urgency then voice on 16', () => {
    expect(complete('panpan-medico', [
      { type: 'dial-hold' },
      { type: 'soft', index: 1 },              // OTHER DSC (All Ships default)
      { type: 'down' }, { type: 'ent' },       // category field
      { type: 'down' }, { type: 'down' }, { type: 'ent' }, // -> Urgency, back
      { type: 'down' }, { type: 'down' }, { type: 'ent' }, // -> Send row, send
      { type: 'ptt-down' },
    ])).toBe(true);
  });

  it('dsc-test: choose Test, send, ACK, alarm off (no voice)', () => {
    expect(complete('dsc-test', [
      { type: 'dial-hold' },
      { type: 'soft', index: 1 },              // OTHER DSC
      { type: 'ent' }, { type: 'down' }, { type: 'ent' }, // type field -> Test
      { type: 'down' }, { type: 'down' }, { type: 'ent' }, // -> Send row, send
      { type: 'otherdsc-ack' },
      { type: 'soft', index: 0 },              // ALARM OFF
    ])).toBe(true);
  });

  it('routine-ship: Individual DSC, ACK, working channel, voice', () => {
    expect(complete('routine-ship', [
      { type: 'dial-hold' },
      { type: 'soft', index: 1 },              // OTHER DSC
      { type: 'ent' }, { type: 'up' }, { type: 'up' }, { type: 'ent' }, // type -> Individual
      { type: 'down' }, { type: 'down' }, { type: 'down' }, { type: 'ent' }, // -> Send row, send
      { type: 'otherdsc-ack' },
      { type: 'soft', index: 0 },              // ALARM OFF -> working channel
      { type: 'ptt-down' },
    ])).toBe(true);
  });

  it('group-call: choose Group, send, voice (no ACK)', () => {
    expect(complete('group-call', [
      { type: 'dial-hold' },
      { type: 'soft', index: 1 },              // OTHER DSC
      { type: 'ent' }, { type: 'up' }, { type: 'ent' },    // type field -> Group
      { type: 'down' }, { type: 'down' }, { type: 'down' }, { type: 'ent' }, // -> Send row, send
      { type: 'ptt-down' },
    ])).toBe(true);
  });

  it('mayday-relay: on 16, spoken relay (no red key)', () => {
    const { done, mistakes } = play('mayday-relay', [
      { type: 'dial-hold' }, { type: 'key-16c' }, { type: 'ptt-down' },
    ]);
    expect(done.size).toBe(3);
    expect(mistakes.size).toBe(0);
  });
});

describe('receiving-side scenarios (start via init)', () => {
  it('receive-distress: alarm off -> watch 16 -> voice acknowledge', () => {
    const { done } = play('receive-distress', [
      { type: 'soft', index: 0 },  // ALARM OFF -> standby on 16
      { type: 'ptt-down' },        // RECEIVED MAYDAY voice
    ]);
    expect(done.size).toBe(2);
  });

  it('receive-call: accept -> working channel -> voice answer', () => {
    const { done, state } = play('receive-call', [
      { type: 'soft', index: 0 },  // ACCEPT -> switch to proposed CH 72
      { type: 'ptt-down' },        // answer on the working channel
    ]);
    expect(done.size).toBe(2);
    expect(state.channelIndex).toBeGreaterThan(0); // moved off the default
  });

  it('receive-distress: transmitting your OWN distress is flagged', () => {
    const { mistakes } = play('receive-distress', [
      { type: 'distress-down' }, { type: 'distress-held' },
    ]);
    expect(mistakes.has('own-distress-on-receive')).toBe(true);
  });
});

describe('new scenarios are completable (M323 cross-model)', () => {
  it('dsc-test via the M323 DSC Calls menu', () => {
    expect(complete('dsc-test', [
      { type: 'dial-hold' },
      { type: 'menu' }, { type: 'ent' },       // Menu -> DSC Calls
      ...rep(4, { type: 'down' }), { type: 'ent' }, // -> Test Call
      { type: 'down' }, { type: 'ent' },       // -> Send row, send
      { type: 'otherdsc-ack' },
      { type: 'soft', index: 0 },
    ], 'M323')).toBe(true);
  });
});

describe('mistake detectors fire', () => {
  it('marina: keying PTT on 16 is flagged', () => {
    const { mistakes } = play('routine-marina', [
      { type: 'dial-hold' }, { type: 'ptt-down' }, // still on 16
    ]);
    expect(mistakes.has('marina-on-16')).toBe(true);
  });

  it('medico + relay: pressing the red DISTRESS key is flagged', () => {
    const medico = play('panpan-medico', [{ type: 'dial-hold' }, { type: 'distress-held' }]);
    expect(medico.mistakes.has('red-button-medico')).toBe(true);
    const relay = play('mayday-relay', [{ type: 'dial-hold' }, { type: 'distress-held' }]);
    expect(relay.mistakes.has('relay-red-button')).toBe(true);
  });
});
