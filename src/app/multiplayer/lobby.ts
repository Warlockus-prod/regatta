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
