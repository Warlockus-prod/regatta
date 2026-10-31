import { beforeEach, describe, expect, it, vi } from "vitest";
import type { RaceSoundscape } from "@/lib/race-soundscape-audio";

// Contract (M3-2): the soundscape is live only while the boat is raced
// (countdown and race, not paused, race sound on); the results, the replay,
// the menu, the briefing, a pause and a mute switch it off, and unmounting
// the race disposes it (stops the looping beds) exactly once.

// A minimal effect runner: effects keep their slot between renders, run when
// their deps change, and the previous cleanup runs first, as in React.
const hooks = vi.hoisted(() => ({ slots: [] as { deps?: unknown[]; cleanup?: void | (() => void) }[], index: 0 }));
vi.mock("react", async original => ({ ...await original<typeof import("react")>(), useEffect: (fn: () => void | (() => void), deps?: unknown[]) => {
  const slot = hooks.slots[hooks.index] ??= {};
  hooks.index++;
  if (slot.deps && deps && deps.every((d, i) => Object.is(d, slot.deps![i]))) return;
  slot.cleanup?.();
  slot.deps = deps; slot.cleanup = fn();
} }));
import { useRaceSoundscapeLifecycle } from "./useRaceSoundscape";

const scape = () => ({ update: vi.fn(), winch: vi.fn(), thud: vi.fn(), setLive: vi.fn(), silence: vi.fn(), dispose: vi.fn() }) satisfies RaceSoundscape;
let soundscape: ReturnType<typeof scape>;
const RaceScreen = (phase: string, paused = false, soundOn = true) => { hooks.index = 0; useRaceSoundscapeLifecycle(soundscape, phase, paused, soundOn); };
const unmount = () => { for (const slot of hooks.slots) slot.cleanup?.(); hooks.slots = []; };
const lastLive = () => soundscape.setLive.mock.calls.at(-1)?.[0];
beforeEach(() => { hooks.slots = []; soundscape = scape(); });

describe("race soundscape lifecycle in the solo race", () => {
  it("is live in the countdown and the race, and off on results, replay, menu and briefing", () => {
    RaceScreen("menu"); expect(lastLive()).toBe(false);
    RaceScreen("briefing"); expect(lastLive()).toBe(false);
    RaceScreen("countdown"); expect(lastLive()).toBe(true);
    RaceScreen("racing"); expect(lastLive()).toBe(true);
    RaceScreen("finished"); expect(lastLive()).toBe(false);
    RaceScreen("replay"); expect(lastLive()).toBe(false);
    RaceScreen("racing"); expect(lastLive()).toBe(true);
    RaceScreen("menu"); expect(lastLive()).toBe(false);
    expect(soundscape.dispose).not.toHaveBeenCalled();
  });

  it("goes off on pause and on mute, and back on when the race resumes with sound", () => {
    RaceScreen("racing"); expect(lastLive()).toBe(true);
    RaceScreen("racing", true); expect(lastLive()).toBe(false);
    RaceScreen("racing", false); expect(lastLive()).toBe(true);
    RaceScreen("racing", false, false); expect(lastLive()).toBe(false);
    RaceScreen("racing", false, true); expect(lastLive()).toBe(true);
    // A re-render in the same state sends nothing new.
    const calls = soundscape.setLive.mock.calls.length;
    RaceScreen("racing"); RaceScreen("racing");
    expect(soundscape.setLive).toHaveBeenCalledTimes(calls);
  });

  it("disposes the soundscape once when the race unmounts, not on re-renders", () => {
    RaceScreen("racing"); RaceScreen("finished"); RaceScreen("racing", true);
    expect(soundscape.dispose).not.toHaveBeenCalled();
    unmount();
    expect(soundscape.dispose).toHaveBeenCalledTimes(1);
  });
});
