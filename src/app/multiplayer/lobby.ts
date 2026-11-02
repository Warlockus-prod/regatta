// M2-8 multiplayer lobby rules, kept free of React so they are tested alone.
import type { Language } from "@/lib/product/catalog";
import { sanitizeNickname } from "@/lib/race-submission";

/** What still stops "Create lobby"; null when it can go. The button never
 * greys out: the lobby names the missing piece next to it instead. */
export type CreateBlocker = "nickname-empty" | "nickname-invalid" | "session" | null;

export function createLobbyBlocker(input: { nickname: string; sid: string | null }): CreateBlocker {
  if (!input.nickname.trim()) return "nickname-empty";
  if (sanitizeNickname(input.nickname) === null) return "nickname-invalid";
  if (!input.sid) return "session";
  return null;
}

/** What a tap on Create does. The button is never disabled, so a tap can come
 * before the session has loaded: that tap is remembered and runs as soon as the
 * session arrives, instead of being lost. A tap with a nickname problem or
 * while the lobby is already being created does nothing else. */
export type CreateTap = "create" | "wait-for-session" | "ignore";

export function createTapAction(input: { blocker: CreateBlocker; connecting: boolean }): CreateTap {
  if (input.connecting) return "ignore";
  if (input.blocker === "session") return "wait-for-session";
  return input.blocker ? "ignore" : "create";
}

const SAILOR: Record<Language, string> = {
  ru: "Моряк", en: "Sailor", pl: "Żeglarz", es: "Marinero", fr: "Marin", de: "Segler", it: "Velista",
};

/** A first-time player gets a ready name ("Sailor 42"), so Create works on the
 * first tap. The number comes from the session id: the same visitor keeps the
 * same name, two newcomers in one room rarely share it. It passes the
 * leaderboard nickname rule (sanitizeNickname) in every language. */
export function defaultSailorName(lang: Language, seed: string | null): string {
  let hash = 0;
  for (const char of seed ?? "") hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
  return `${SAILOR[lang] ?? SAILOR.en} ${10 + (hash % 90)}`;
}

export type ShareOutcome = "shared" | "copied" | "cancelled" | "failed";
type ShareNavigator = { share?: (data: ShareData) => Promise<void>; clipboard?: { writeText: (text: string) => Promise<void> } };

/** The system share sheet where the browser has one (phones), otherwise the
 * invite link goes to the clipboard. Closing the share sheet is not a failure
 * and does not copy behind the player's back. */
export async function shareRoomInvite(nav: ShareNavigator | undefined, invite: { title: string; text: string; url: string }): Promise<ShareOutcome> {
  if (typeof nav?.share === "function") {
    try {
      await nav.share(invite);
      return "shared";
    } catch (error) {
      if ((error as { name?: string } | null)?.name === "AbortError") return "cancelled";
    }
  }
  try {
    if (!nav?.clipboard) return "failed";
    await nav.clipboard.writeText(invite.url);
    return "copied";
  } catch {
    return "failed";
  }
}

export function canShareNatively(nav: ShareNavigator | undefined): boolean {
  return typeof nav?.share === "function";
}

/** The site the invite link points at when the page itself has no web origin
 * to share (a file or about:blank page): a friend opens the same lobby there. */
export const INVITE_ORIGIN = "https://weektoregatta.com";

/** The invite link for a room. Only an http(s) origin is shared as is. */
export function roomInviteUrl(origin: string | null | undefined, code: string): string {
  const base = origin && /^https?:\/\//.test(origin) ? origin : INVITE_ORIGIN;
  return `${base}/multiplayer?code=${encodeURIComponent(code)}`;
}

/** TestFlight 74 feedback: the card said "Link copied" forever, so a player
 * could not tell when a tap had copied. A confirmation now stays this long and
 * the card returns to the idle caption that says what a tap does. */
export const SHARE_CONFIRM_MS = 4000;

/** How long an outcome stays on the card before the idle caption returns:
 * a success for SHARE_CONFIRM_MS, a closed share sheet not at all, and a
 * failure until the next tap (null), because the link it shows has to stay
 * there to be selected and copied by hand. */
export function shareFeedbackHoldMs(outcome: ShareOutcome | null): number | null {
  if (outcome === "copied" || outcome === "shared") return SHARE_CONFIRM_MS;
  if (outcome === "cancelled") return 0;
  return null;
}

type Timers = { setTimeout: (run: () => void, ms: number) => unknown; clearTimeout: (id: unknown) => void };

/** Shows a share outcome and puts the card back to idle on time. One timer at
 * a time: a new tap replaces the pending reset, and dispose() (unmount, leaving
 * the room) cancels it so nothing fires on a screen that is gone.
 *
 * run() owns the whole tap: a share sheet can stay open while the race starts
 * or the player leaves the room, so every show() or dispose() bumps a
 * generation and an attempt that resolves after that is dropped instead of
 * landing on a lobby screen where nobody tapped. */
export function createShareFeedback(onChange: (outcome: ShareOutcome | null) => void, timers: Timers = {
  setTimeout: (run, ms) => globalThis.setTimeout(run, ms),
  clearTimeout: id => globalThis.clearTimeout(id as ReturnType<typeof globalThis.setTimeout>),
}) {
  let pending: unknown = null;
  let generation = 0;
  const cancel = () => { if (pending !== null) { timers.clearTimeout(pending); pending = null; } };
  const apply = (outcome: ShareOutcome | null) => {
    cancel();
    const hold = shareFeedbackHoldMs(outcome);
    onChange(hold === 0 ? null : outcome);
    if (hold !== null && hold > 0) pending = timers.setTimeout(() => { pending = null; onChange(null); }, hold);
  };
  return {
    show(outcome: ShareOutcome | null) {
      generation += 1;
      apply(outcome);
    },
    /** One tap: shows the attempt's outcome unless a show(), a newer run() or
     * dispose() came first. Resolves to what was shown, or null if dropped. */
    async run(attempt: () => Promise<ShareOutcome>): Promise<ShareOutcome | null> {
      generation += 1;
      const ticket = generation;
      const outcome = await attempt();
      if (ticket !== generation) return null;
      apply(outcome);
      return outcome;
    },
    dispose() {
      generation += 1;
      cancel();
    },
  };
}
