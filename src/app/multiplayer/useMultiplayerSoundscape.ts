'use client';

import { useEffect, useState } from 'react';
import { calcTWA } from '@/lib/race-physics';
import { NO_GO } from '@/lib/race-manoeuvres';
import { createSilentTargets, mapRaceSoundscape, raceSoundscapeLive, type RaceSoundscapeInput } from '@/lib/race-soundscape';
import { createRaceSoundscape } from '@/lib/race-soundscape-audio';
import type { RaceWindReading } from '@/features/race-hud/navigation-model';
import { useRaceSoundscapeLifecycle } from '../game/useRaceSoundscape';
import type { MultiplayerFrame } from './presentation';

/**
 * The multiplayer soundscape input (M3-2 tail, ADR-0019): the player's own
 * boat from the server snapshot, mapped by the same race-soundscape.ts as the
 * solo race. Apparent wind from the HUD wind reading (true wind when there is
 * none), the server speed, in irons inside the no-go angle. The server
 * publishes no heel and trims every boat itself, so heel is 0 (slaps follow
 * the speed only) and the mode is Simple: no luff flogging, only in irons.
 * Fills `out` and returns it, or null when the frame has no player boat or
 * our boat has finished.
 */
export function multiplayerSoundscapeInput(frame: MultiplayerFrame, reading: RaceWindReading | null, soundOn: boolean, hidden: boolean, out: RaceSoundscapeInput): RaceSoundscapeInput | null {
  const player = frame.boats.find(boat => boat.isPlayer);
  if (!player || multiplayerOwnFinished(frame)) return null;
  out.apparentWindKn = reading?.apparentKnots ?? frame.windKnots;
  out.boatSpeedKn = player.speed;
  out.heelDeg = player.physics?.heel ?? 0;
  out.inIrons = Math.abs(calcTWA(player.heading, frame.windDir)) < NO_GO.angleDeg;
  out.luffing = false;
  out.mode = "simple";
  out.paused = hidden;
  out.muted = !soundOn;
  return out;
}

/**
 * Our own boat has crossed the finish. The room only reaches "finished" once
 * every boat is home or the time limit runs out, and the server stops
 * stepping a finished boat, so its speed and heading freeze at the line: for
 * the soundscape our finish is the end of the race, as it is in solo.
 */
export function multiplayerOwnFinished(frame: MultiplayerFrame | null): boolean {
  const player = frame?.boats.find(boat => boat.isPlayer);
  return !!player && (player.lapDone >= 2 || player.finishTime !== undefined);
}

export interface MultiplayerSoundscapeState {
  phase: string;
  /** The socket dropped and the client is resuming: silence until it is back. */
  reconnecting: boolean;
  soundOn: boolean;
  /** The HUD frame, published at most ten times per second by the render loop. */
  frame: MultiplayerFrame | null;
  windReading: RaceWindReading | null;
}

/**
 * Wind, water, hull slaps and flogging for /multiplayer on the shared race
 * AudioContext (it never creates one). Live only in the server countdown and
 * the race until our own boat finishes, with race sound on and the socket
 * connected; our finish, the results, the lobby, the menu and a disconnect
 * are silent, unmounting stops the beds.
 * Fed once per HUD frame (the render loop's 100 ms cadence), the runtime
 * throttles on top of that. One input and one target object for the page.
 */
export function useMultiplayerSoundscape({ phase, reconnecting, soundOn, frame, windReading }: MultiplayerSoundscapeState): void {
  const [scape] = useState(() => ({ soundscape: createRaceSoundscape(), out: createSilentTargets(),
    input: { apparentWindKn: 0, boatSpeedKn: 0, heelDeg: 0, luffing: false, inIrons: false, mode: "simple", paused: false, muted: false } as RaceSoundscapeInput }));
  // A dropped socket and our own finish both hold the beds off, like a pause.
  const held = reconnecting || multiplayerOwnFinished(frame);
  // Declared first, so a race going live is switched on before its first update.
  useRaceSoundscapeLifecycle(scape.soundscape, phase, held, soundOn);
  useEffect(() => {
    if (!frame || !raceSoundscapeLive(phase, held, soundOn)) return;
    const hidden = typeof document !== "undefined" && document.hidden;
    const input = multiplayerSoundscapeInput(frame, windReading, soundOn, hidden, scape.input);
    if (input) scape.soundscape.update(mapRaceSoundscape(input, scape.out));
  }, [scape, frame, windReading, phase, held, soundOn]);
}
