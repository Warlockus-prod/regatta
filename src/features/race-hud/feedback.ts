// The race feedback bus (M1-3): the short messages the solo race shows near
// the boat, one place that decides which of them are on screen. Before it, a
// 7-second rule notice and a 2.6-second race event shared one text slot, so a
// rule notice hid every tack cost, mark split and overtake behind it.
//
// Rules of the bus:
// - every message has a source; a newer message of the same source replaces
//   the older one (a new tack cost replaces the last, a new rule notice the
//   last rule notice), so nothing piles up;
// - up to FEEDBACK_LIMITS.visible messages are on screen at once, ordered by
//   priority (rule notices first), then by the time they appeared;
// - a message of higher priority takes the slot of the lowest one on a full
//   stack; the displaced message waits in the queue, as does a message that
//   finds no free slot, and is shown when a slot frees up within
//   FEEDBACK_LIMITS.maxWaitSec of being posted, otherwise it is dropped (a
//   tack cost from ten seconds ago is no longer news);
// - the contact frame is separate from the stack: a red frame round the scene,
//   a flash, or a static frame when the viewer asked for reduced motion.
//
// Pure module: time is passed in (seconds on any monotonic clock), so the
// ordering, priorities and expiry are tested without React or timers.

export type FeedbackTone = "success" | "danger" | "info";

/** Where a message comes from. One message per source is kept. */
export type FeedbackSource = "rule" | "missed-mark" | "contact" | "manoeuvre" | "mark" | "place";

/** Higher first. Rule notices and the missed-mark notice explain a penalty
 * or a finish that did not count, so they outrank the race events. */
export const FEEDBACK_PRIORITY: Readonly<Record<FeedbackSource, number>> = {
  rule: 3, "missed-mark": 3, contact: 2, manoeuvre: 1, mark: 1, place: 1,
};

/** Seconds a message stays once shown. A rule notice is longer to read. */
export const FEEDBACK_DURATION: Readonly<Record<FeedbackSource, number>> = {
  rule: 7, "missed-mark": 7, contact: 2.6, manoeuvre: 2.6, mark: 2.6, place: 2.6,
};

export const FEEDBACK_LIMITS = {
  /** Messages on screen at once, so the stack near the boat stays small. */
  visible: 2,
  /** A queued message older than this is dropped instead of shown late. */
  maxWaitSec: 2,
} as const;

/** The contact frame: a flash, or a static frame for reduced motion. */
export const CONTACT_FRAME = { flashSec: 0.9, staticSec: 1.2 } as const;

export interface FeedbackPost {
  source: FeedbackSource;
  text: string;
  tone: FeedbackTone;
}

export interface FeedbackToast extends FeedbackPost {
  id: number;
  priority: number;
  postedAt: number;
  /** When it went on screen; null while it waits in the queue. */
  shownAt: number | null;
  /** When it leaves the screen; null while queued. */
  until: number | null;
}

export interface ContactFrame {
  id: number;
  until: number;
  motion: "flash" | "static";
}

export interface FeedbackState {
  /** On screen, in display order. */
  visible: readonly FeedbackToast[];
  /** Waiting for a slot, in posting order. */
  queue: readonly FeedbackToast[];
  contact: ContactFrame | null;
  nextId: number;
}

export function createFeedbackState(): FeedbackState {
  return { visible: [], queue: [], contact: null, nextId: 1 };
}

/** Display order: higher priority first, then the one shown earlier, so a new
 * message of the same priority joins below instead of pushing the others. */
function byDisplay(a: FeedbackToast, b: FeedbackToast): number {
  return b.priority - a.priority || (a.shownAt ?? 0) - (b.shownAt ?? 0) || a.id - b.id;
}

/** Promotion order: higher priority first, then first posted. */
function byPromotion(a: FeedbackToast, b: FeedbackToast): number {
  return b.priority - a.priority || a.postedAt - b.postedAt || a.id - b.id;
}

const show = (toast: FeedbackToast, now: number): FeedbackToast =>
  ({ ...toast, shownAt: now, until: now + FEEDBACK_DURATION[toast.source] });
const unshow = (toast: FeedbackToast): FeedbackToast => ({ ...toast, shownAt: null, until: null });

/** Drop what has run out, then fill free slots from the queue. */
export function tickFeedback(state: FeedbackState, now: number): FeedbackState {
  let visible = state.visible.filter(t => t.until !== null && t.until > now);
  let queue = state.queue.filter(t => now - t.postedAt <= FEEDBACK_LIMITS.maxWaitSec);
  if (visible.length < FEEDBACK_LIMITS.visible && queue.length) {
    const ordered = [...queue].sort(byPromotion);
    const promoted = ordered.slice(0, FEEDBACK_LIMITS.visible - visible.length);
    visible = [...visible, ...promoted.map(t => show(t, now))];
    queue = queue.filter(t => !promoted.includes(t));
  }
  const contact = state.contact && state.contact.until > now ? state.contact : null;
  if (visible.length === state.visible.length && visible.every((t, i) => t === state.visible[i])
    && queue.length === state.queue.length && contact === state.contact) return state;
  return { ...state, visible: [...visible].sort(byDisplay), queue, contact };
}

/** Post a message at `now`. */
export function postFeedback(state: FeedbackState, post: FeedbackPost, now: number): FeedbackState {
  const settled = tickFeedback(state, now);
  const toast: FeedbackToast = { ...post, id: settled.nextId, priority: FEEDBACK_PRIORITY[post.source], postedAt: now, shownAt: null, until: null };
  // A newer message of the same source replaces the older one.
  let visible = settled.visible.filter(t => t.source !== post.source);
  let queue = settled.queue.filter(t => t.source !== post.source);
  if (visible.length < FEEDBACK_LIMITS.visible) visible = [...visible, show(toast, now)];
  else {
    const lowest = [...visible].sort(byDisplay).at(-1)!;
    if (toast.priority > lowest.priority) {
      // The displaced message waits for a slot; its wait counts from now.
      visible = [...visible.filter(t => t !== lowest), show(toast, now)];
      queue = [...queue, { ...unshow(lowest), postedAt: now }];
    } else queue = [...queue, toast];
  }
  return { ...settled, visible: visible.sort(byDisplay), queue, nextId: settled.nextId + 1 };
}

/** A contact: the red frame round the scene. With reduced motion it does not
 * flash; it stays still a little longer instead. */
export function postContact(state: FeedbackState, now: number, reducedMotion: boolean): FeedbackState {
  const settled = tickFeedback(state, now);
  const motion = reducedMotion ? "static" : "flash";
  const until = now + (reducedMotion ? CONTACT_FRAME.staticSec : CONTACT_FRAME.flashSec);
  return { ...settled, contact: { id: settled.nextId, until, motion }, nextId: settled.nextId + 1 };
}

/** The next time the state changes by itself (a message runs out, a queued
 * one goes stale, the frame ends), or null when nothing is pending. */
export function nextFeedbackChange(state: FeedbackState): number | null {
  const times = [
    ...state.visible.map(t => t.until ?? Infinity),
    ...state.queue.map(t => t.postedAt + FEEDBACK_LIMITS.maxWaitSec),
    state.contact?.until ?? Infinity,
  ];
  const next = Math.min(...times);
  return Number.isFinite(next) ? next : null;
}

/** Whether the viewer asked the system for reduced motion. False on the
 * server and where matchMedia is missing or throws. */
export function prefersReducedMotion(): boolean {
  try {
    return typeof window !== "undefined" && typeof window.matchMedia === "function"
      && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  } catch {
    return false;
  }
}

/** The bus source of a race event (events.ts): one tack cost, one mark split
 * and one place change on screen at a time. */
export function raceEventSource(kind: "tack" | "gybe" | "mark" | "gained" | "lost"): FeedbackSource {
  return kind === "tack" || kind === "gybe" ? "manoeuvre" : kind === "mark" ? "mark" : "place";
}
