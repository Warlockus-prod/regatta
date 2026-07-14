import { otherDscRows, softkeys, type RadioState } from './radioModel';

// ============================================================================
// "?" hint ("Podpowiedz - pokaz na radiu") from the vhf-trainer design.
//
// Given the CURRENT scenario step and the CURRENT radio state, return the
// data-testid of the control the user should press right now. The page feeds it
// to RadioFront's existing `highlightControl` spotlight, so the hint reuses the
// same amber pulse the guided course uses.
//
// Softkey positions are DYNAMIC (softkeys() re-labels them per screen and per
// page), so a hint never hardcodes "soft-2" - it resolves the index by looking
// up the label that is actually showing. That keeps the hint correct on both
// device profiles (the M330 and M323 softkey layouts differ).
// ============================================================================

/** Which soft-N currently carries this label, if any. */
function softIdx(s: RadioState, label: string): string | null {
  const i = softkeys(s).indexOf(label);
  return i >= 0 ? `soft-${i}` : null;
}

/** First of the labels that is currently on a softkey. */
function anySoft(s: RadioState, ...labels: string[]): string | null {
  for (const l of labels) {
    const hit = softIdx(s, l);
    if (hit) return hit;
  }
  return null;
}

/**
 * In a compose screen the user must first walk the cursor to the right row and
 * then confirm, so the hint follows the cursor: [v] until the row is reached,
 * then [ENT].
 */
function composeHint(s: RadioState, wantRow: number): string {
  return s.odCursor === wantRow ? 'key-ent' : 'key-down';
}

/**
 * The control to press for `stepId` right now, or null when there is nothing to
 * press (e.g. waiting for the coast station to answer).
 */
export function hintFor(stepId: string, s: RadioState): string | null {
  // Nothing works on a dead radio - always point at the dial first.
  if (!s.power) return 'dial-center';

  switch (stepId) {
    case 'power':
      return 'dial-center';

    // --- distress -----------------------------------------------------------
    case 'compose':
      // reach the Distress screen: softkey if it is on this page, else the menu
      return s.screen === 'distress-compose' ? 'key-ent' : (anySoft(s, 'DISTRESS') ?? 'key-menu');
    case 'nature':
      return s.screen === 'distress-nature' ? 'key-ent' : 'key-ent';
    case 'hold':
      return s.screen === 'distress-hold' ? 'distress-key' : 'distress-cover';
    case 'ack':
    case 'dsc-ack':
      return null; // waiting for the other station - nothing to press

    case 'alarmoff':
    case 'alarm-off':
    case 'dsc-alarmoff':
    case 'test-done':
      return anySoft(s, 'ALARM OFF') ?? 'soft-0';

    // --- distress cancel ----------------------------------------------------
    case 'cancel-open':
      return anySoft(s, 'CANCEL') ?? 'soft-0';
    case 'cancel-continue':
      return anySoft(s, 'CONTINUE') ?? 'soft-1';
    case 'finish':
      return anySoft(s, 'FINISH', 'STBY') ?? 'soft-0';

    // --- receiving side -----------------------------------------------------
    case 'accept':
      return anySoft(s, 'ACCEPT') ?? 'soft-0';

    // --- Other DSC: open the compose screen ---------------------------------
    case 'otherdsc':
      return s.screen === 'otherdsc-compose'
        ? 'key-ent'
        : (anySoft(s, 'OTHER DSC') ?? 'key-menu');
    case 'type':
      // choosing the call type: M330 changes Type in compose, M323 picks it in
      // the DSC Calls menu - either way the user is walking a list.
      if (s.screen === 'otherdsc-field' || s.screen === 'm323-dsc-calls' || s.screen === 'menu') return 'key-ent';
      if (s.screen === 'otherdsc-compose') return composeHint(s, 0);
      return anySoft(s, 'OTHER DSC') ?? 'key-menu';

    // --- Other DSC: fill the rows and send ----------------------------------
    case 'urgency-sent':
    case 'safety-sent':
    case 'test-sent':
    case 'ship-sent':
    case 'group-sent': {
      if (s.screen === 'otherdsc-field') return 'key-ent';
      if (s.screen === 'otherdsc-compose') return composeHint(s, otherDscRows(s).length); // the [Send] row
      return anySoft(s, 'OTHER DSC') ?? 'key-menu';
    }

    // --- channels / power ---------------------------------------------------
    case 'ch12':
    case 'ch71':
      return 'key-down';
    case 'ch16-relay':
      return 'key-16c';
    case 'lowpower':
      return anySoft(s, 'HI/LO') ?? 'key-right'; // page the softkeys until HI/LO shows

    default:
      // every spoken step ends in -voice (mayday-voice, panpan-voice, ...)
      if (stepId.endsWith('-voice') || stepId.endsWith('voice')) return 'ptt';
      return null;
  }
}
