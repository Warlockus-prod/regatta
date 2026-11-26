import { beforeEach, describe, expect, it, vi } from "vitest";
import type { MPMessage } from "@/lib/mp-client";

// Contract (M3-3): multiplayer plays the same horn, short signals and gun as
// the solo race, from the server's countdown events and through the same
// playStartSignal; the several messages per second play each second once,
// a player who joins a race already running hears no gun, and a session
// resume (joined + the room's current phase) replays no gun and no horn.

const played = vi.hoisted(() => [] as string[]);
vi.mock("@/lib/sounds", () => ({ playStartSignal: vi.fn((signal: string) => { played.push(signal); }) }));
import { playStartSignal } from "@/lib/sounds";
import { createServerStartSignals } from "./start-signals";

const countdown = (remain: number): MPMessage => ({ type: "countdown", remain });
const phase = (p: "lobby" | "countdown" | "racing" | "finished"): MPMessage => ({ type: "phase", phase: p });
const joined: MPMessage = { type: "joined", code: "ABCD", id: "p1", isHost: false };
beforeEach(() => { played.length = 0; vi.mocked(playStartSignal).mockClear(); });

describe("multiplayer start signals from the server", () => {
  it("plays horn, four short signals and the gun over the server's 5 s countdown", () => {
    const signals = createServerStartSignals();
    signals.onMessage(phase("countdown"));
    for (let remain = 5; remain > 0; remain -= 0.05) signals.onMessage(countdown(remain));
    signals.onMessage(countdown(0));
    signals.onMessage(phase("racing"));
    signals.onMessage({ type: "state", t: 0.1, wind: { dir: 0, speed: 12 }, boats: [] } as unknown as MPMessage);
    expect(played).toEqual(["warning", "tick", "tick", "tick", "tick", "start"]);
    expect(playStartSignal).toHaveBeenCalledTimes(6);
  });

  it("fires the gun on the racing phase when the zero message was not seen", () => {
    const signals = createServerStartSignals();
    signals.onMessage(phase("countdown"));
    signals.onMessage(countdown(1.2)); signals.onMessage(countdown(0.6));
    signals.onMessage(phase("racing"));
    expect(played).toEqual(["warning", "tick", "start"]);
  });

  it("stays silent for a player who joins a race already running", () => {
    const signals = createServerStartSignals();
    signals.onMessage(phase("racing"));
    expect(played).toEqual([]);
  });

  it("fires no late gun when the player resumes the session after the start", () => {
    const signals = createServerStartSignals();
    signals.onMessage(joined);
    signals.onMessage(phase("countdown"));
    for (const remain of [5, 4, 3]) signals.onMessage(countdown(remain));
    // The socket drops at 3 and the player resumes inside the grace window, mid-race.
    signals.onMessage(joined);
    signals.onMessage(phase("racing"));
    expect(played).toEqual(["warning", "tick", "tick"]);
  });

  it("goes on with short signals, not the horn again, when the player resumes during the countdown", () => {
    const signals = createServerStartSignals();
    signals.onMessage(joined);
    signals.onMessage(phase("countdown"));
    signals.onMessage(countdown(5)); signals.onMessage(countdown(4));
    signals.onMessage(joined);
    signals.onMessage(phase("countdown"));
    for (const remain of [2, 1, 0]) signals.onMessage(countdown(remain));
    signals.onMessage(phase("racing"));
    expect(played).toEqual(["warning", "tick", "tick", "tick", "start"]);
  });

  it("starts the next room's countdown with the horn after leaving mid-countdown", () => {
    const signals = createServerStartSignals();
    signals.onMessage(joined); signals.onMessage(phase("countdown")); signals.onMessage(countdown(5));
    signals.reset();
    signals.onMessage(joined); signals.onMessage(phase("countdown")); signals.onMessage(countdown(5));
    expect(played).toEqual(["warning", "warning"]);
  });

  it("starts the next race's countdown with the horn again", () => {
    const signals = createServerStartSignals();
    signals.onMessage(phase("countdown")); signals.onMessage(countdown(2)); signals.onMessage(phase("racing"));
    signals.onMessage(phase("finished")); signals.onMessage(phase("lobby"));
    signals.onMessage(phase("countdown")); signals.onMessage(countdown(5));
    expect(played).toEqual(["warning", "start", "warning"]);
  });
});
