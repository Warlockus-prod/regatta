import { afterEach, describe, expect, it, vi } from "vitest";
import { sanitizeNickname } from "@/lib/race-submission";
import type { Language } from "@/lib/product/catalog";
import { canShareNatively, createLobbyBlocker, createShareFeedback, createTapAction, defaultSailorName, roomInviteUrl, SHARE_CONFIRM_MS, shareFeedbackHoldMs, shareRoomInvite, type ShareOutcome } from "./lobby";

const LANGS: Language[] = ["ru", "en", "pl", "es", "fr", "de", "it"];
const invite = { title: "Week to Regatta", text: "Race with friends: code AB2C", url: "https://weektoregatta.com/multiplayer?code=AB2C" };

describe("multiplayer lobby rules (M2-8)", () => {
  it("names what still stops Create: an empty or unusable nickname, then a session still loading", () => {
    expect(createLobbyBlocker({ nickname: "  ", sid: "s1" })).toBe("nickname-empty");
    expect(createLobbyBlocker({ nickname: "!!", sid: "s1" })).toBe("nickname-invalid");
    expect(createLobbyBlocker({ nickname: "Ola", sid: null })).toBe("session");
    expect(createLobbyBlocker({ nickname: "Ola", sid: "s1" })).toBeNull();
  });

  it("remembers a Create tap made before the session loads instead of dropping it", () => {
    // The button used to stay disabled until the session arrived, which held a
    // quick first tap back; now that it is never disabled, that tap must wait.
    expect(createTapAction({ blocker: "session", connecting: false })).toBe("wait-for-session");
    expect(createTapAction({ blocker: null, connecting: false })).toBe("create");
    expect(createTapAction({ blocker: "nickname-empty", connecting: false })).toBe("ignore");
    expect(createTapAction({ blocker: "nickname-invalid", connecting: false })).toBe("ignore");
    expect(createTapAction({ blocker: null, connecting: true })).toBe("ignore");
  });

  it("gives a newcomer a ready name in every language that the leaderboard accepts as is", () => {
    for (const lang of LANGS) {
      const name = defaultSailorName(lang, "8f14e45f-ceea-467a-9575-0123456789ab");
      expect(sanitizeNickname(name)).toBe(name);
      expect(name).toMatch(/^\p{L}+ \d{2}$/u);
      expect(createLobbyBlocker({ nickname: name, sid: "s1" })).toBeNull();
    }
    expect(defaultSailorName("pl", "x")).toMatch(/^Żeglarz /);
    expect(defaultSailorName("ru", "x")).toMatch(/^Моряк /);
  });

  it("keeps the same default for the same session and spreads newcomers over 10..99", () => {
    expect(defaultSailorName("en", "abc")).toBe(defaultSailorName("en", "abc"));
    const numbers = new Set(Array.from({ length: 40 }, (_, i) => defaultSailorName("en", `session-${i}`).split(" ")[1]));
    expect(numbers.size).toBeGreaterThan(20);
    for (const n of numbers) expect(Number(n)).toBeGreaterThanOrEqual(10);
    expect(defaultSailorName("en", null)).toBe("Sailor 10");
  });

  it("opens the system share sheet where there is one, and does not also copy", async () => {
    const share = vi.fn(async () => {}), writeText = vi.fn(async () => {});
    expect(await shareRoomInvite({ share, clipboard: { writeText } }, invite)).toBe("shared");
    expect(share).toHaveBeenCalledWith(invite);
    expect(writeText).not.toHaveBeenCalled();
    expect(canShareNatively({ share })).toBe(true);
  });

  it("treats a closed share sheet as cancelled, without copying behind the player's back", async () => {
    const share = vi.fn(async () => { throw Object.assign(new Error("closed"), { name: "AbortError" }); }), writeText = vi.fn(async () => {});
    expect(await shareRoomInvite({ share, clipboard: { writeText } }, invite)).toBe("cancelled");
    expect(writeText).not.toHaveBeenCalled();
  });

  it("copies the invite link where there is no share sheet or it fails, and reports a dead clipboard", async () => {
    const writeText = vi.fn(async () => {});
    expect(await shareRoomInvite({ clipboard: { writeText } }, invite)).toBe("copied");
    expect(writeText).toHaveBeenCalledWith(invite.url);
    expect(canShareNatively({ clipboard: { writeText } })).toBe(false);
    const broken = vi.fn(async () => { throw new TypeError("not allowed"); });
    expect(await shareRoomInvite({ share: broken, clipboard: { writeText } }, invite)).toBe("copied");
    expect(await shareRoomInvite({ clipboard: { writeText: vi.fn(async () => { throw new Error("denied"); }) } }, invite)).toBe("failed");
    expect(await shareRoomInvite(undefined, invite)).toBe("failed");
  });
});

// TestFlight 74 feedback ("Копирование кода не понятно когда работает"): the
// card kept "Link copied" forever. A success now returns to the idle caption,
// a failure stays (its link has to be selectable) and is never a success.
describe("lobby share feedback (TestFlight 74)", () => {
  afterEach(() => { vi.useRealTimers(); });

  it("returns a success to the idle caption after a few seconds", () => {
    vi.useFakeTimers();
    for (const outcome of ["copied", "shared"] as const) {
      const seen: (ShareOutcome | null)[] = [];
      const feedback = createShareFeedback(next => seen.push(next));
      feedback.show(outcome);
      expect(seen).toEqual([outcome]);
      vi.advanceTimersByTime(SHARE_CONFIRM_MS - 1);
      expect(seen).toEqual([outcome]);
      vi.advanceTimersByTime(1);
      expect(seen).toEqual([outcome, null]);
    }
    expect(SHARE_CONFIRM_MS).toBeGreaterThanOrEqual(2000);
    expect(SHARE_CONFIRM_MS).toBeLessThanOrEqual(8000);
  });

  it("keeps a failure on the card until the next tap and never turns it into a success", () => {
    vi.useFakeTimers();
    const seen: (ShareOutcome | null)[] = [];
    const feedback = createShareFeedback(next => seen.push(next));
    feedback.show("failed");
    vi.advanceTimersByTime(60_000);
    expect(seen).toEqual(["failed"]);
    expect(shareFeedbackHoldMs("failed")).toBeNull();
    feedback.show("copied");
    vi.advanceTimersByTime(SHARE_CONFIRM_MS);
    expect(seen).toEqual(["failed", "copied", null]);
  });

  it("shows a closed share sheet as idle at once", () => {
    const seen: (ShareOutcome | null)[] = [];
    createShareFeedback(next => seen.push(next)).show("cancelled");
    expect(seen).toEqual([null]);
  });

  it("restarts the hold on a second tap and cancels the reset when the lobby goes away", () => {
    vi.useFakeTimers();
    const seen: (ShareOutcome | null)[] = [];
    const feedback = createShareFeedback(next => seen.push(next));
    feedback.show("copied");
    vi.advanceTimersByTime(SHARE_CONFIRM_MS - 1000);
    feedback.show("copied");
    vi.advanceTimersByTime(SHARE_CONFIRM_MS - 1);
    expect(seen).toEqual(["copied", "copied"]);
    vi.advanceTimersByTime(1);
    expect(seen).toEqual(["copied", "copied", null]);
    feedback.show("copied");
    feedback.dispose();
    vi.advanceTimersByTime(SHARE_CONFIRM_MS * 2);
    expect(seen).toEqual(["copied", "copied", null, "copied"]);
    expect(vi.getTimerCount()).toBe(0);
  });

  it("drops a share that resolves after the race started or the player left, so no lobby shows a result nobody tapped", async () => {
    vi.useFakeTimers();
    for (const late of ["failed", "copied", "shared"] as const) {
      for (const interrupt of ["phase-change", "leave", "unmount"] as const) {
        const seen: (ShareOutcome | null)[] = [];
        const feedback = createShareFeedback(next => seen.push(next));
        let resolve!: (outcome: ShareOutcome) => void;
        const tap = feedback.run(() => new Promise<ShareOutcome>(done => { resolve = done; }));
        if (interrupt === "unmount") feedback.dispose(); else feedback.show(null);
        resolve(late);
        await expect(tap).resolves.toBeNull();
        vi.advanceTimersByTime(60_000);
        expect(seen.filter(outcome => outcome !== null)).toEqual([]);
        expect(vi.getTimerCount()).toBe(0);
      }
    }
  });

  it("clears a failure shown before the race when the phase leaves the lobby, and lets the next tap through", async () => {
    vi.useFakeTimers();
    const seen: (ShareOutcome | null)[] = [];
    const feedback = createShareFeedback(next => seen.push(next));
    await expect(feedback.run(async () => "failed")).resolves.toBe("failed");
    expect(seen).toEqual(["failed"]);
    feedback.show(null); // countdown starts
    expect(seen.at(-1)).toBeNull();
    vi.advanceTimersByTime(60_000);
    expect(seen).toEqual(["failed", null]);
    // Back in the lobby after the race, a new tap works as before.
    await expect(feedback.run(async () => "copied")).resolves.toBe("copied");
    vi.advanceTimersByTime(SHARE_CONFIRM_MS);
    expect(seen).toEqual(["failed", null, "copied", null]);
  });

  it("lets only the newest of two overlapping taps decide what the card says", async () => {
    const seen: (ShareOutcome | null)[] = [];
    const feedback = createShareFeedback(next => seen.push(next));
    let first!: (outcome: ShareOutcome) => void;
    const slow = feedback.run(() => new Promise<ShareOutcome>(done => { first = done; }));
    const fast = feedback.run(async () => "failed");
    await fast;
    first("copied");
    await expect(slow).resolves.toBeNull();
    expect(seen).toEqual(["failed"]);
    feedback.dispose();
  });

  it("builds the invite link on the page origin, and on the site when the page has no web origin", () => {
    expect(roomInviteUrl("https://weektoregatta.com", "KZHR")).toBe("https://weektoregatta.com/multiplayer?code=KZHR");
    expect(roomInviteUrl("http://localhost:3047", "AB2C")).toBe("http://localhost:3047/multiplayer?code=AB2C");
    for (const origin of ["null", "file://", "", null, undefined]) {
      expect(roomInviteUrl(origin, "AB2C")).toBe("https://weektoregatta.com/multiplayer?code=AB2C");
    }
  });
});
