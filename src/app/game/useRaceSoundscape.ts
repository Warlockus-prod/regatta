'use client';

import { useEffect } from 'react';
import { raceSoundscapeLive } from '@/lib/race-soundscape';
import type { RaceSoundscape } from '@/lib/race-soundscape-audio';

/**
 * The race soundscape's phase wiring (M3-2, ADR-0019). The race loop stops
 * at the finish tick, so this is what silences wind and water on the results
 * screen, the replay, the menu and the briefing, during a pause and when race
 * sound goes off; unmounting the race stops the looping beds. A hidden page
 * is handled inside the runtime.
 */
export function useRaceSoundscapeLifecycle(soundscape: RaceSoundscape, phase: string, paused: boolean, soundOn: boolean): void {
  const live = raceSoundscapeLive(phase, paused, soundOn);
  useEffect(() => { soundscape.setLive(live); }, [soundscape, live]);
  useEffect(() => () => soundscape.dispose(), [soundscape]);
}
