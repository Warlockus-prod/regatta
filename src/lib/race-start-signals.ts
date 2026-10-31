/**
 * Start signals over the existing countdown (M3-3), shared by the solo race
 * (/game) and multiplayer (/multiplayer). Pure: no audio, no React. The sounds
 * live in src/lib/sounds.ts (playStartSignal), the flags in
 * src/features/race-hud/RaceStartFlags.tsx.
 *
 * The countdown length and the start rules are unchanged (owner decision #15
 * is not adopted): this only decides which signal goes with which second.
 *
 * - The first second of a countdown sounds the horn: the warning signal, the
 *   class flag goes up (RRS 26).
 * - Every later second above zero is a short signal (the old beep). The flags
 *   follow RRS 26 compressed into the same seconds: flag P goes up on the
 *   second after the warning (preparatory signal), comes down on the last
 *   second (the one-minute signal), and the class flag comes down at the gun.
 * - Zero is the gun. The gun closes a countdown that was heard: a player who
 *   joins at or after the start hears no gun.
 * - A repeated second plays nothing (pause and resume, a re-render, the
 *   server's several countdown messages per second).
 * - Individual recall (RRS 29.1, flag X with one sound signal) follows the
 *   race's own early-start detection in src/lib/race-rules.ts; nothing here
 *   decides that a start was premature.
 */

import type { RaceRuleEvent } from "@/lib/race-rules";

export type StartSignal = "warning" | "tick" | "start" | "recall";
export type StartFlag = "class" | "preparatory" | "recall";

export interface StartSignalCue {
  /** The signal for this countdown second, or null when nothing should sound. null = not counting (menu, pause). */
  at(second: number | null | undefined): StartSignal | null;
  reset(): void;
}

export function createStartSignalCue(): StartSignalCue {
  let last: number | null = null;
  let counted = false;
  return {
    at(second) {
      if (second === null || second === undefined || !Number.isFinite(second)) return null;
      const s = Math.max(0, Math.ceil(second));
      if (s === last) return null;
      const first = last === null;
      last = s;
      if (s === 0) {
        if (!counted) return null;
        counted = false;
        return "start";
      }
      counted = true;
      return first ? "warning" : "tick";
    },
    reset() { last = null; counted = false; },
  };
}

/** The solo race's countdown starts at 3 (GameClient), the server's at 5 (ws-server COUNTDOWN_SEC). */
export const SOLO_COUNTDOWN_FROM = 3;
export const SERVER_COUNTDOWN_FROM = 5;

/**
 * The flags shown over the scene for a countdown that starts at `from`: the
 * class flag from the warning horn to the gun, flag P from the second after
 * the warning until the last second (RRS 26 order: warning, preparatory,
 * one-minute, start), flag X while the player is over early, otherwise none.
 */
export function startFlags(second: number | null | undefined, recall = false, from = SOLO_COUNTDOWN_FROM): StartFlag[] {
  if (second !== null && second !== undefined && Number.isFinite(second) && second > 0) {
    const s = Math.ceil(second);
    return s < from && s > 1 ? ["class", "preparatory"] : ["class"];
  }
  return recall ? ["recall"] : [];
}

/**
 * The player's recall state change in this step's rule events: true when the
 * race detected the player's premature start, false when the player has
 * returned and cleared it, null when neither happened.
 */
export function playerRecallChange(events: readonly RaceRuleEvent[], playerId = "player"): boolean | null {
  let change: boolean | null = null;
  for (const e of events) {
    if (e.boatId !== playerId) continue;
    if (e.kind === "early-start") change = true;
    else if (e.kind === "start-clear") change = false;
  }
  return change;
}
