'use client';

import { useEffect, useRef } from "react";
import { createStartSignalCue, type StartSignalCue } from "@/lib/race-start-signals";
import { playStartSignal } from "@/lib/sounds";
import { raceStartHaptic } from "@/lib/race-haptics";

/**
 * Start signals for one race screen (M3-3): the solo race passes its own
 * countdown, multiplayer the server's countdown events, so both sound alike
 * through the same playStartSignal; the gun also vibrates (M3-4). `second` is the countdown second shown,
 * 0 at and after the start, null while not counting (menu, lobby, pause).
 * A new `raceKey` starts a new countdown (Restart, the next race).
 */
export function useStartSignals(second: number | null, raceKey: string | number): void {
  const cue = useRef<{ key: string | number; cue: StartSignalCue } | null>(null);
  useEffect(() => {
    if (!cue.current || cue.current.key !== raceKey) cue.current = { key: raceKey, cue: createStartSignalCue() };
    const signal = cue.current.cue.at(second);
    if (signal) { playStartSignal(signal); raceStartHaptic(signal); }
  }, [second, raceKey]);
}
