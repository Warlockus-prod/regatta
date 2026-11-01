// When the solo race loop raises two feedback cues (M1-3): the cost of a tack
// or gybe, and a contact with another boat. Pure, so the loop and the tests
// share one definition.

import { RACE_START_JOSTLE_SECONDS } from "@/lib/race-start-jostle";

/** The cost of a manoeuvre is told when the boat is slowest, not seconds later. */
export const TURN_COST = {
  /** The minimum has passed once the speed is this much above it, knots. */
  recoverKn: 0.05,
  /** A boat that never picks up again is told after this many seconds. */
  timeoutSec: 4,
  /** A smaller loss is not worth a message, knots. */
  minLossKn: 0.2,
  /** A loss above this is shown in the danger tone, knots. */
  bigLossKn: 1.5,
} as const;

export interface TurnWatch {
  kind: "tack" | "gybe";
  /** Race time the boat settled on the new side. */
  t: number;
  /** Best speed before the manoeuvre, knots. */
  before: number;
  /** Slowest speed so far, knots. */
  min: number;
}

export interface TurnCost { kind: "tack" | "gybe"; lossKn: number }

/** Feed the speed of one tick after a manoeuvre. The watch ends, with its
 * cost, at the first tick the boat is clearly picking up again (the minimum
 * is behind it) or at the timeout; a loss below TURN_COST.minLossKn ends it
 * without a cost. */
export function watchTurn(turn: TurnWatch, t: number, speedKn: number): { turn: TurnWatch | null; cost: TurnCost | null } {
  const min = Number.isFinite(speedKn) ? Math.min(turn.min, speedKn) : turn.min;
  const recovered = Number.isFinite(speedKn) && speedKn >= min + TURN_COST.recoverKn;
  if (!recovered && t - turn.t < TURN_COST.timeoutSec) return { turn: { ...turn, min }, cost: null };
  const lossKn = turn.before - min;
  return { turn: null, cost: lossKn >= TURN_COST.minLossKn ? { kind: turn.kind, lossKn } : null };
}

export const CONTACT_CUE = {
  /** A new contact frame no sooner than this after the last one, seconds. */
  cooldownSec: 1.5,
} as const;

export interface ContactCueState {
  /** The player overlapped another boat on the previous tick. */
  touching: boolean;
  /** Race time of the last frame, null before the first. */
  lastAt: number | null;
}

export function createContactCueState(): ContactCueState {
  return { touching: false, lastAt: null };
}

interface Point { x: number; y: number }
interface CueBoat { id: string; pos: Point; lapDone: number; isPlayer?: boolean }

/** The player's hull overlaps another boat still racing (the overlap
 * resolveCollisions pushes apart). Finished boats have left the course. */
export function playerTouching(boats: readonly CueBoat[], separation: number): boolean {
  const player = boats.find(b => b.isPlayer);
  if (!player || player.lapDone >= 2) return false;
  return boats.some(b => b !== player && b.lapDone < 2 && Math.hypot(b.pos.x - player.pos.x, b.pos.y - player.pos.y) < separation);
}

/** A contact frame is due when a contact begins, once the race is on and past
 * the start jostle (M0-3: crowding right after the signal stays quiet), and
 * not within the cooldown of the last frame. */
export function contactCue(state: ContactCueState, sample: { touching: boolean; t: number; racing: boolean }): { state: ContactCueState; cue: boolean } {
  const began = sample.touching && !state.touching;
  const quiet = !sample.racing || sample.t < RACE_START_JOSTLE_SECONDS;
  const cooled = state.lastAt === null || sample.t - state.lastAt >= CONTACT_CUE.cooldownSec;
  const cue = began && !quiet && cooled;
  return { state: { touching: sample.touching, lastAt: cue ? sample.t : state.lastAt }, cue };
}
