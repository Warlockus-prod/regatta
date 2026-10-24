import type { VoiceKind } from '../../api/radio-voice/voiceGrading';
import { DEFAULT_VENUE, type Venue } from './venues';

// ============================================================================
// What the other station says back, out loud.
//
// A trainer where you speak and the radio only ever writes at you trains half
// the skill. On the exam - and at sea - you are judged on how you handle what
// you HEAR: the reply comes back clipped, over a noisy channel, and you have to
// catch the working channel out of it.
//
// The lines follow IMO SMCP. They are a fixed pool, which is what makes the TTS
// affordable: each phrase is generated once and then cached.
// ============================================================================

export interface StationLine {
  /** what is said, in radio English - this is what gets spoken */
  say: string;
  /** who says it, for the log */
  station: string;
}

/** The answering stations are the run's venue (venues.ts): Polish Rescue Radio
 *  and Marina Gdynia in the Gulf of Gdańsk, Solent Coastguard and Lymington
 *  Yacht Haven in the Solent, and so on. */
export function stationReply(kind: VoiceKind, vesselName: string, venue: Venue = DEFAULT_VENUE): StationLine | null {
  const you = vesselName.toUpperCase();
  const RESCUE = venue.coast?.call ?? 'COAST STATION';
  const WORK = venue.coast?.workSpoken ?? 'SIX SEVEN';
  const MARINA = venue.marina?.call ?? 'MARINA';
  const VTS = venue.vts?.call ?? 'VTS';
  switch (kind) {
    case 'mayday-mob':
    case 'mayday-fire':
      return { station: RESCUE, say: `MAYDAY. ${you}, ${you}, ${you}, THIS IS ${RESCUE}, ${RESCUE}, ${RESCUE}. RECEIVED MAYDAY. RESCUE UNIT DISPATCHED. REMAIN ON CHANNEL ONE SIX. OVER.` };
    case 'mayday-relay':
      return { station: RESCUE, say: `MAYDAY RELAY ${you}, THIS IS ${RESCUE}, RECEIVED MAYDAY RELAY. WE TAKE OVER COORDINATION. REMAIN ON CHANNEL ONE SIX. OVER.` };
    case 'mayday-ack':
      return { station: RESCUE, say: `${you}, THIS IS ${RESCUE}, ROGER, KEEP LISTENING ON CHANNEL ONE SIX. OUT.` };
    case 'panpan-mob':
      return { station: RESCUE, say: `PAN PAN ${you}, THIS IS ${RESCUE}, RECEIVED PAN PAN. VESSELS IN THE AREA ALERTED. REPORT WHEN THE PERSON IS RECOVERED. OVER.` };
    case 'panpan-engine':
      return { station: RESCUE, say: `PAN PAN ${you}, THIS IS ${RESCUE}, RECEIVED PAN PAN. TOWING ARRANGED. SWITCH TO CHANNEL ${WORK}. OVER.` };
    case 'panpan-medico':
      return { station: RESCUE, say: `PAN PAN ${you}, THIS IS ${RESCUE}, RECEIVED PAN PAN. MEDICAL ADVICE FOLLOWS ON CHANNEL ${WORK}. OVER.` };
    case 'securite-hazard':
      return { station: RESCUE, say: `${you}, THIS IS ${RESCUE}, ROGER, YOUR SAFETY MESSAGE IS RECEIVED AND WILL BE BROADCAST. OUT.` };
    case 'cancel-false':
      return { station: RESCUE, say: `${you}, THIS IS ${RESCUE}, YOUR CANCELLATION IS RECEIVED. NO FURTHER ACTION. OUT.` };
    case 'radio-check':
      return { station: MARINA, say: `${you}, THIS IS ${MARINA}, READING YOU LOUD AND CLEAR. OVER.` };
    case 'routine-marina':
      return { station: MARINA, say: `${you}, THIS IS ${MARINA}, BERTH AVAILABLE. PROCEED TO PONTOON C. OVER.` };
    case 'vts-report':
      return { station: VTS, say: `${you}, THIS IS ${VTS}, YOUR REPORT IS RECEIVED. NO REPORTED TRAFFIC IN THE FAIRWAY. OUT.` };
    case 'routine-ship':
      return { station: 'TRAINING SHIP', say: `${you}, THIS IS TRAINING SHIP, GO AHEAD ON CHANNEL SEVEN TWO. OVER.` };
    case 'routine-group':
      // the answering station is the fleet, not the caller's own vessel
      return { station: 'REGATTA FLEET', say: `${you}, THIS IS REGATTA FLEET, MESSAGE RECEIVED. OUT.` };
    case 'answer-call':
      // the learner answered a call FROM the training ship, so the training ship replies
      return { station: 'TRAINING SHIP', say: `${you}, THIS IS TRAINING SHIP, ROGER. OVER.` };
    default:
      return null;
  }
}
