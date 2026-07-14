// ============================================================================
// Event -> sound. A pure function, so it can be unit-tested without WebAudio.
//
// The old code played ONE tone whenever `beeps` went up, which meant a
// successful keypress and a REFUSED transmission on channel 70 made the exact
// same sound. On a real set they do not, and the difference is the lesson: the
// radio is telling you "no". A learner who cannot hear the refusal learns
// nothing from it.
//
// radioModel.ts is not touched: both call sites already hold (event, prev, next),
// which is everything this needs.
// ============================================================================

import { CHANNELS, type RadioEvent, type RadioState } from '../radioModel';
import type { Cue } from './RadioAudioEngine';

export function cuesFor(e: RadioEvent, prev: RadioState, next: RadioState): Cue[] {
  // power is its own thing and overrides everything
  if (next.power !== prev.power) return [next.power ? 'power-on' : 'power-off'];
  if (!next.power) return [];

  const cues: Cue[] = [];

  // MENU > Configuration > Key Beep, Off = "silent operation" (M330GE p.49).
  // It silences the KEY BEEPS only - it cannot silence the DSC alarm, and no
  // setting on the real radio can. That is the difference between a preference
  // and a safety function, and it is worth the learner feeling it.
  const beepsOn = next.keyBeep;

  switch (e.type) {
    case 'ptt-down':
      // the reducer refuses PTT on a data-only channel and bumps `beeps`; that
      // refusal must SOUND like a refusal.
      if (next.ptt) return ['tx-key'];
      return beepsOn ? ['error-beep'] : [];
    case 'ptt-up':
      return prev.ptt ? ['tx-unkey'] : [];
    case 'dial-rotate':
      // only when a value actually moved (at the clamps, nothing happens)
      if (next.volume !== prev.volume || next.squelch !== prev.squelch
        || next.channelIndex !== prev.channelIndex || next.backlight !== prev.backlight) {
        return ['dial-tick'];
      }
      return [];
    case 'aqua-down':
      return next.aquaActive ? ['aqua-start'] : [];
    case 'aqua-up':
      return prev.aquaActive ? ['aqua-stop'] : [];
    default:
      break;
  }

  // a DSC packet left the radio
  if (isTxScreen(next.screen) && !isTxScreen(prev.screen)) cues.push('dsc-tx');

  // The DSC alarm is NOT cued from here: it rings for as long as a screen is up,
  // not for an instant, so the page drives it directly (start on the alarm
  // screens, stop when they close).

  // everything else the radio beeps at
  if (beepsOn && next.beeps > prev.beeps && cues.length === 0) cues.push('key-beep');

  return cues;
}

function isTxScreen(screen: string): boolean {
  return screen === 'distress-tx' || screen === 'cancel-tx' || screen === 'otherdsc-sent';
}

/** the slice of state the audio engine needs, derived from the full state */
export function audioView(s: RadioState) {
  const ch = CHANNELS[s.channelIndex];
  return {
    power: s.power,
    volume: s.volume,
    squelch: s.squelch,
    channelNum: ch.num,
    noVoice: ch.noVoice === true,
    ptt: s.ptt,
  };
}
