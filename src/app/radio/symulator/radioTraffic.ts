// ============================================================================
// Who is on the air, on which channel, and how strong.
//
// This is the RF side of the world, deliberately kept OUT of radioModel.ts:
// that file is a pure UI state machine with a passing test suite, and radio
// propagation is not its job. The audio engine reads this; nothing else does.
//
// Everything is a pure function of (channel, time), so it is deterministic and
// unit-testable - which matters, because the squelch threshold is now a
// behavioural contract: at SQL 5 a weak call must NOT open the gate; at SQL 4
// it must.
//
// THE S-SCALE (0..10) is shared by the noise floor, every carrier, and the
// squelch setting itself (radioModel clamps squelch to 0..10). That shared
// scale is what makes the squelch lesson learnable by ear:
//
//   0 ....... 2.5 ...... 4 ............. 9 ...... 10
//   | noise floor |   weak call      strong call  nothing
//                     (distant)      (coast stn)  ever opens
// ============================================================================

/** the loudest the bare noise floor ever reads on the S-scale */
export const NOISE_CEILING = 2.5;
/** a distant yacht on 1 W: the call the exam is about */
export const SIG_WEAK = 4;
/**
 * A coast station or a boat alongside. It breaks even the tightest squelch -
 * level 10 is "tight squelch", not a mute switch, and what a tight squelch loses
 * is the WEAK call, not every call. Teaching "SQL 10 = you hear nothing ever"
 * would be the wrong lesson: the danger is subtler than that, and subtler is
 * exactly why people fail it.
 */
export const SIG_STRONG = 10;

export interface Over {
  /** ms since epoch when this transmission starts */
  startMs: number;
  durMs: number;
  /** 0..10 on the S-scale */
  signal: number;
  voice: 'male' | 'female';
}

/** scripted overs, keyed by channel number ('16', '12', ...) */
const scripted = new Map<string, Over[]>();

/**
 * Put a transmission on the air. Used by the lesson-3 "test call" button and by
 * scenarios that want a station to answer audibly.
 */
export function scriptOver(channelNum: string, over: Over): void {
  const list = scripted.get(channelNum) ?? [];
  // drop overs that are already in the past so the map cannot grow forever
  const now = over.startMs;
  scripted.set(channelNum, [...list.filter((o) => o.startMs + o.durMs > now), over]);
}

export function clearTraffic(): void {
  scripted.clear();
}

/**
 * A proper avalanche mix. The first version multiplied and shifted without one,
 * and the low bits stayed correlated: channel 16 came out busy about 30% of the
 * time instead of the ~3% it is supposed to be, which is a bad lie to tell about
 * the distress and calling channel.
 */
function hash32(a: number, b: number): number {
  let h = (a * 0x9e3779b1) ^ (b * 0x85ebca6b);
  h = Math.imul(h ^ (h >>> 16), 0x2545f491);
  h = Math.imul(h ^ (h >>> 13), 0x27d4eb2f);
  return (h ^ (h >>> 16)) >>> 0;
}

/**
 * Ambient background traffic: a deterministic, seeded pattern per channel.
 * No Math.random - the same channel at the same second always sounds the same,
 * so the behaviour is reproducible and testable.
 *
 * CH 16 is quiet the great majority of the time. That is not a shortcut: a
 * distress and calling channel that chattered constantly would teach the learner
 * to tune it out, which is the opposite of the point.
 */
function ambient(channelNum: string, tMs: number): number {
  // CH 70 is data only: it NEVER makes audio, not even noise.
  if (channelNum === '70') return 0;

  const slot = Math.floor(tMs / 1000);
  const block = Math.floor(slot / 12);              // a 12-second block
  const r = hash32(Number(channelNum), block) / 0xffffffff;  // 0..1, stable in the block
  const phase = slot % 12;                          // where we are inside it

  // busy channels: port / marina / VTS chatter comes and goes
  const busy = channelNum === '12' || channelNum === '14' || channelNum === '71';
  const watch = channelNum === '16';

  if (busy && r < 0.45 && phase < 5) return 6 + r * 4;   // a few seconds of traffic
  if (watch && r < 0.12 && phase < 3) return 6 + r * 4;  // 16 is mostly quiet, and that is the point
  return 0;
}

/**
 * Signal strength on the air right now for this channel: the strongest of the
 * scripted overs and the ambient traffic. 0 means nobody is transmitting.
 */
export function signalOn(channelNum: string, tMs: number): number {
  if (channelNum === '70') return 0;
  let best = ambient(channelNum, tMs);
  for (const o of scripted.get(channelNum) ?? []) {
    if (tMs >= o.startMs && tMs < o.startMs + o.durMs && o.signal > best) best = o.signal;
  }
  return best;
}

/**
 * Would a receiver set to this squelch hear this signal? The audio engine adds
 * hysteresis; this is the plain contract that the tests pin down.
 *
 * Squelch 0 is the OPEN position of the real control ("OPEN is completely open;
 * 10 is tight squelch; 1 is loose squelch" - IC-M323 p.14). It is a LATCHED
 * setting, not a momentary monitor key: neither exam radio has a MON key or any
 * other squelch defeat.
 */
export function opensGate(squelch: number, signal: number, noiseFloor = 0): boolean {
  if (squelch === 0) return true;
  return Math.max(signal, noiseFloor) >= squelch;
}
