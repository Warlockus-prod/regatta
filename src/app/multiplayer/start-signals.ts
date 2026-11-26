import { createStartSignalCue } from "@/lib/race-start-signals";
import { playStartSignal } from "@/lib/sounds";
import { raceStartHaptic } from "@/lib/race-haptics";
import type { MPMessage } from "@/lib/mp-client";

/**
 * Multiplayer start signals (M3-3) from the server's countdown events, through
 * the same cue and the same playStartSignal as the solo race, so both races
 * sound alike: the horn on the first countdown second heard, a short signal
 * on each later second, the gun at zero. The server sends several countdown
 * messages per second; a repeated second plays nothing. A player who joins at
 * or after the start hears no gun.
 *
 * A session resume (ws-server sends 'joined' and then the room's current
 * phase) is a snapshot, not a transition: a resumed 'racing' phase is silent
 * (no late gun), a resumed 'countdown' phase keeps the countdown heard so far
 * (the next second is a short signal, not the warning horn again).
 * Silent while race sound is off; the gun also vibrates (M3-4) while the
 * vibration switch is on.
 */
export function createServerStartSignals() {
  const cue = createStartSignalCue();
  let resumed = false;
  return {
    onMessage(msg: MPMessage): void {
      if (msg.type === "joined") { resumed = true; return; }
      if (msg.type === "phase") {
        const snapshot = resumed;
        resumed = false;
        if (msg.phase === "countdown") { if (!snapshot) cue.reset(); return; }
        if (msg.phase === "racing" && !snapshot) { const signal = cue.at(0); if (signal) { playStartSignal(signal); raceStartHaptic(signal); } return; }
        cue.reset();
        return;
      }
      if (msg.type === "countdown") {
        const signal = cue.at(Math.max(0, Math.ceil(msg.remain)));
        if (signal) { playStartSignal(signal); raceStartHaptic(signal); }
      }
    },
    /** Leaving the room: the next room's countdown starts from the horn. */
    reset(): void { cue.reset(); resumed = false; },
  };
}
