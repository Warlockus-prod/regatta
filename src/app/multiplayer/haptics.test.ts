import { beforeEach, describe, expect, it, vi } from "vitest";
import type { MPMessage } from "@/lib/mp-client";

// Contract (M3-4): in multiplayer only the player's own mark rounding and
// finish from server state events vibrate (never another boat, a no-go entry
// or before the player has an id), and the start gun vibrates once in both
// race screens while the warning horn, the short signals and a recall do not.

const haptics = vi.hoisted(() => [] as string[]);
vi.mock("@/lib/sounds", () => ({ playStartSignal: vi.fn() }));
vi.mock("@/lib/race-haptics", async original => {
  const actual = await original<typeof import("@/lib/race-haptics")>();
  const raceHaptic = vi.fn((event: string) => { haptics.push(event); });
  return { ...actual, raceHaptic, raceStartHaptic: (signal: string | null | undefined) => { if (signal === "start") raceHaptic("start"); } };
});
import { playerHapticEvents, playerSoundEvents } from "./haptics";
import { createServerStartSignals } from "./start-signals";

beforeEach(() => { haptics.length = 0; });

describe("multiplayer state events", () => {
  it("keeps only the player's own mark and finish", () => {
    const events = [
      { id: "me", type: "mark", t: 40 }, { id: "bot-1", type: "mark", t: 40 },
      { id: "me", type: "no-go-entered", t: 41 }, { id: "bot-2", type: "finish", t: 90 }, { id: "me", type: "finish", t: 95 },
    ];
    expect(playerHapticEvents(events, "me")).toEqual(["mark", "finish"]);
  });

  it("vibrates nothing before the player has an id or without events", () => {
    expect(playerHapticEvents([{ id: "", type: "mark" }], "")).toEqual([]);
    expect(playerHapticEvents(undefined, "me")).toEqual([]);
  });
});

describe("multiplayer state event sounds (M3-3)", () => {
  it("plays the player's own mark, finish and no-go entry, never another boat's", () => {
    const events = [
      { id: "me", type: "mark", t: 40 }, { id: "bot-1", type: "mark", t: 40 }, { id: "bot-1", type: "no-go-entered", t: 40 },
      { id: "me", type: "no-go-entered", t: 41 }, { id: "bot-2", type: "finish", t: 90 }, { id: "me", type: "finish", t: 95 },
    ];
    expect(playerSoundEvents(events, "me")).toEqual(["mark", "no-go", "finish"]);
  });

  it("is silent before the player has an id, without events, or for unknown types", () => {
    expect(playerSoundEvents([{ id: "", type: "mark" }], "")).toEqual([]);
    expect(playerSoundEvents(undefined, "me")).toEqual([]);
    expect(playerSoundEvents([{ id: "me", type: "nogo" }], "me")).toEqual([]);
  });
});

describe("the start gun vibrates", () => {
  const countdown = (remain: number): MPMessage => ({ type: "countdown", remain });
  const phase = (p: "lobby" | "countdown" | "racing" | "finished"): MPMessage => ({ type: "phase", phase: p });

  it("once over the server countdown, at the gun only", () => {
    const signals = createServerStartSignals();
    signals.onMessage(phase("countdown"));
    for (let remain = 5; remain > 0; remain -= 0.05) signals.onMessage(countdown(remain));
    signals.onMessage(countdown(0));
    signals.onMessage(phase("racing"));
    expect(haptics).toEqual(["start"]);
  });

  it("on the racing phase when the zero message was not seen", () => {
    const signals = createServerStartSignals();
    signals.onMessage(phase("countdown"));
    signals.onMessage(countdown(1.2));
    signals.onMessage(phase("racing"));
    expect(haptics).toEqual(["start"]);
  });

  it("not for a player who resumes into a running race", () => {
    const signals = createServerStartSignals();
    signals.onMessage({ type: "joined", code: "ABCD", id: "p1", isHost: false });
    signals.onMessage(phase("racing"));
    expect(haptics).toEqual([]);
  });
});
