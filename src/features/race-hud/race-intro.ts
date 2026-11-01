// F5 race intro (TestFlight 74: "needs onboarding or a hint for everything"):
// four small cards before the first solo race on this device (the goal, the
// helm and sheets, the wind from the bow, the HUD), the same cards on request
// from the lobby, the race settings, the multiplayer menu and the app's Race
// hub ("How to race", /game?intro=1).
//
// Rules:
// - by itself only on the lobby's start (or the app hub's hand-off, which is
//   that start), once per device, never in the physical trial (?race=, its
//   own course and note) and never in multiplayer (only its "How to race");
//   "Again", "Restart", the "i" briefing and the reload resume never show it;
//   "before the first race" means before the first race since the intro
//   exists: a device that raced before it still sees it once;
// - "Start race" on the last card goes straight to the countdown: the goal and
//   wind cards say what the classic course briefing says, so the first race is
//   one screen, not two; "Skip" takes the lobby start's own step (the briefing
//   on a course's first start);
// - "seen" is written on Start race and on Skip, and when the intro opened on
//   request in the solo race is read to its last card ("Got it"); not on the
//   cards in between or on Close, so a page closed in the middle shows the
//   intro again next time. The multiplayer variant (no Pro, no hint log)
//   never records it;
// - the row survives the app through the race storage allowlist
//   (mobile/src/persistence/race-web-storage.ts).
//
// Pure: storage is injected, so the rules are tested without React.

export const RACE_INTRO_KEY = "regatta.race.intro-seen.v1";
export const RACE_INTRO_CARDS = ["goal", "steer", "wind", "hud"] as const;
export type RaceIntroCard = typeof RACE_INTRO_CARDS[number];

/** Why the intro is open: by itself before the first race, or on request from
 * the lobby, the race settings, the multiplayer menu or the app's Race hub
 * (the race page opened with ?intro=1). "closed": not open. */
export type RaceIntroOpen = "closed" | "first" | "lobby" | "race" | "multiplayer" | "hub";
/** How it ended: "start" (last card, first race), "skip", "close" (on
 * request, the header) or "done" (on request, Got it on the last card). */
export type RaceIntroEnd = "start" | "skip" | "close" | "done";

/** A start request opens the intro by itself only from the lobby's start,
 * outside the trial, on a device that has not seen it. */
export function raceIntroDue(input: { trigger: string; trial: boolean; seen: boolean }): boolean {
  return input.trigger === "start" && !input.trial && !input.seen;
}

/** The race page opened only to read the intro (the app's Race hub, or a
 * shared /game?intro=1): never in the physical trial, a saved replay or a
 * race whose setup came with the link (that race starts by itself). */
export function raceIntroRequested(search: URLSearchParams, context: { trial: boolean; linkedSetup: boolean }): boolean {
  return search.get("intro") === "1" && !context.trial && !context.linkedSetup && !search.has("replayId");
}

/** An intro opened on request records "seen" only when read to the end in the solo race. */
export function raceIntroEndRecordsSeen(opened: RaceIntroOpen, end: RaceIntroEnd): boolean {
  if (opened === "first") return end === "start" || end === "skip";
  return end === "done" && opened !== "multiplayer" && opened !== "closed";
}

/** Where the first race goes after the intro. */
export function stepAfterRaceIntro(end: "start" | "skip", briefingSeen: boolean): "countdown" | "briefing" {
  return end === "start" || briefingSeen ? "countdown" : "briefing";
}

/** Next or Back, never past either end. */
export function raceIntroMove(index: number, move: "next" | "back"): number {
  return Math.max(0, Math.min(RACE_INTRO_CARDS.length - 1, index + (move === "next" ? 1 : -1)));
}

// --- The device record -------------------------------------------------

type IntroStorage = Pick<Storage, "getItem" | "setItem">;
const browserStorage = (): IntroStorage | null => {
  try { return typeof localStorage === "undefined" ? null : localStorage; } catch { return null; }
};
// Storage can be missing or throw (private mode): this visit still remembers.
let memory = false;

/** True once this device has finished or skipped the intro. Any other row counts as not seen. */
export function hasSeenRaceIntro(storage: IntroStorage | null = browserStorage()): boolean {
  if (memory) return true;
  try { return storage?.getItem(RACE_INTRO_KEY) === "1"; } catch { return false; }
}

export function markRaceIntroSeen(storage: IntroStorage | null = browserStorage()): void {
  memory = true;
  try { storage?.setItem(RACE_INTRO_KEY, "1"); } catch { /* the in-memory record keeps this visit consistent */ }
}

/** Tests only: forget this visit's record. */
export function resetRaceIntroMemory(): void { memory = false; }
