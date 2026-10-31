import { describe, expect, it, vi } from "vitest";
import { sanitizeNickname } from "@/lib/race-submission";
import type { Language } from "@/lib/product/catalog";
import { canShareNatively, createLobbyBlocker, createTapAction, defaultSailorName, shareRoomInvite } from "./lobby";

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
