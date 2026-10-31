import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { SetStateAction } from "react";
import { FINISH_HOLD_MS, finishHoldActive, finishHoldMs, finishHoldStore, scheduleFinishedScreen } from "./race-finish-hold";
import type { GameState } from "./race-model";

// M1-4 contract: a player's finish keeps the scene (gameState stays 'racing')
// for FINISH_HOLD_MS with the place plate up, then shows the results; a
// timeout shows the results at once; an exit or a new race during the hold is
// never overridden.
function harness(initial: GameState = "racing") {
  let state: GameState = initial;
  const setGameState = (next: SetStateAction<GameState>) => { state = typeof next === "function" ? next(state) : next; };
  return { setGameState, get: () => state, set: (s: GameState) => { state = s; } };
}

beforeEach(() => { vi.useFakeTimers(); finishHoldStore.set(null); });
afterEach(() => { vi.useRealTimers(); finishHoldStore.set(null); });

describe("finish hold (M1-4)", () => {
  it("holds 2-3 s after a finish and not at all after a timeout", () => {
    expect(FINISH_HOLD_MS).toBeGreaterThanOrEqual(2000);
    expect(FINISH_HOLD_MS).toBeLessThanOrEqual(3000);
    expect(finishHoldMs(true)).toBe(FINISH_HOLD_MS);
    expect(finishHoldMs(false)).toBe(0);
  });

  it("a finish keeps the scene with the plate, then shows the results", () => {
    const game = harness();
    const seen: Array<ReturnType<typeof finishHoldStore.get>> = [];
    const unsubscribe = finishHoldStore.subscribe(() => seen.push(finishHoldStore.get()));
    scheduleFinishedScreen({ playerFinished: true, place: 2, total: 6, raceId: "r1", isCurrentRace: () => true, setGameState: game.setGameState });
    expect(game.get()).toBe("racing");
    expect(finishHoldStore.get()).toEqual({ raceId: "r1", place: 2, total: 6 });
    expect(finishHoldActive("r1")).toBe(true);
    vi.advanceTimersByTime(FINISH_HOLD_MS - 1);
    expect(game.get()).toBe("racing");
    vi.advanceTimersByTime(1);
    expect(game.get()).toBe("finished");
    expect(finishHoldStore.get()).toBeNull();
    expect(finishHoldActive("r1")).toBe(false);
    expect(seen).toEqual([{ raceId: "r1", place: 2, total: 6 }, null]);
    unsubscribe();
  });

  it("a timeout goes straight to the results without a plate", () => {
    const game = harness();
    scheduleFinishedScreen({ playerFinished: false, place: 6, total: 6, raceId: "r1", isCurrentRace: () => true, setGameState: game.setGameState });
    expect(game.get()).toBe("finished");
    expect(finishHoldStore.get()).toBeNull();
  });

  it("an exit or a new race during the hold is not undone", () => {
    const exit = harness();
    scheduleFinishedScreen({ playerFinished: true, place: 1, total: 4, raceId: "r1", isCurrentRace: () => true, setGameState: exit.setGameState });
    exit.set("menu");
    vi.advanceTimersByTime(FINISH_HOLD_MS);
    expect(exit.get()).toBe("menu");

    let live = "r1";
    const next = harness();
    scheduleFinishedScreen({ playerFinished: true, place: 1, total: 4, raceId: "r1", isCurrentRace: () => live === "r1", setGameState: next.setGameState });
    live = "r2";
    vi.advanceTimersByTime(FINISH_HOLD_MS);
    expect(next.get()).toBe("racing");
    expect(finishHoldStore.get()).toBeNull();
  });
});
