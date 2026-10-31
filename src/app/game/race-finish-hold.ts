// M1-4 finish hold for the solo race (/game). When the player crosses the
// finish, the 3D scene stays on screen for FINISH_HOLD_MS with a small place
// plate (RaceFinishPlate.tsx) before the results screen replaces it. A timeout
// (did not finish) goes straight to the results.
//
// Only the moment the results screen appears is delayed: the race loop still
// does all of its race-end bookkeeping (results, records, coach request,
// native save, analytics) in the finish tick, before calling
// scheduleFinishedScreen(). prefers-reduced-motion skips the plate's entrance
// animation (.page-enter in globals.css), not the hold itself.

import type { Dispatch, SetStateAction } from "react";
import type { GameState } from "./race-model";

/** How long the scene holds after the player's own finish. */
export const FINISH_HOLD_MS = 2500;

/** The hold applies to a real finish only; a timeout shows the results at once. */
export function finishHoldMs(playerFinished: boolean): number {
  return playerFinished ? FINISH_HOLD_MS : 0;
}

/** What the place plate shows while the scene holds. */
export interface FinishHold { raceId: string; place: number; total: number }

let current: FinishHold | null = null;
const listeners = new Set<() => void>();

/** A tiny external store, so the plate can be mounted anywhere over the scene
 * (useSyncExternalStore) without a new state setter in the race loop. */
export const finishHoldStore = {
  get(): FinishHold | null { return current; },
  /** Server render and static tests: no hold. */
  getServer(): FinishHold | null { return null; },
  subscribe(listener: () => void): () => void {
    listeners.add(listener);
    return () => { listeners.delete(listener); };
  },
  set(next: FinishHold | null): void {
    if (current === next) return;
    current = next;
    for (const listener of listeners) listener();
  },
};

/** True while the finish hold of this race is running. */
export function finishHoldActive(raceId: string): boolean {
  return finishHoldStore.get()?.raceId === raceId;
}

export interface FinishedScreenRequest {
  playerFinished: boolean;
  place: number;
  total: number;
  raceId: string;
  /** True while the race that ended is still the live one (no new race, no exit). */
  isCurrentRace: () => boolean;
  setGameState: Dispatch<SetStateAction<GameState>>;
}

/** Called by the race loop in place of setGameState('finished'), after its
 * race-end bookkeeping. A finish holds the scene; a timeout does not. When the
 * hold ends, the results replace the scene only if the same race is still
 * running: an exit to the menu or a new race during the hold is never undone. */
export function scheduleFinishedScreen(request: FinishedScreenRequest): void {
  const { playerFinished, place, total, raceId, isCurrentRace, setGameState } = request;
  const holdMs = finishHoldMs(playerFinished);
  if (holdMs === 0) {
    finishHoldStore.set(null);
    setGameState("finished");
    return;
  }
  finishHoldStore.set({ raceId, place, total });
  setTimeout(() => {
    if (finishHoldStore.get()?.raceId === raceId) finishHoldStore.set(null);
    const live = isCurrentRace();
    setGameState((state) => (state === "racing" && live ? "finished" : state));
  }, holdMs);
}
