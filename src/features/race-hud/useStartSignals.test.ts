import { beforeEach, describe, expect, it, vi } from "vitest";

// Contract (M3-3): a race screen's countdown plays the horn on its first
// second, a short signal on each later second and the gun at zero, each once,
// through the shared playStartSignal; a pause or a re-render repeats nothing,
// and a new race key (Restart, next race) starts with the horn again.

const hooks = vi.hoisted(() => ({ slots: [] as { deps?: unknown[]; value?: unknown }[], index: 0, played: [] as string[] }));
vi.mock("react", async original => ({
  ...await original<typeof import("react")>(),
  useRef: (initial: unknown) => { const slot = hooks.slots[hooks.index++] ??= { value: { current: initial } }; return slot.value; },
  useEffect: (fn: () => void, deps?: unknown[]) => {
    const slot = hooks.slots[hooks.index++] ??= {};
    if (slot.deps && deps && deps.every((d, i) => Object.is(d, slot.deps![i]))) return;
    slot.deps = deps; fn();
  },
}));
vi.mock("@/lib/sounds", () => ({ playStartSignal: vi.fn((signal: string) => { hooks.played.push(signal); }) }));
import { useStartSignals } from "./useStartSignals";

const screen = (second: number | null, key: string | number = "race-1") => { hooks.index = 0; useStartSignals(second, key); };
beforeEach(() => { hooks.slots = []; hooks.played = []; });

describe("start signals on a race screen", () => {
  it("plays horn, short, short, gun over 3-2-1-0 and nothing more in the race", () => {
    for (const s of [null, 3, 3, 2, 1, 0, 0, 0]) screen(s);
    expect(hooks.played).toEqual(["warning", "tick", "tick", "start"]);
  });

  it("holds through a pause without repeating the second it resumes on", () => {
    for (const s of [3, 2, null, 2, 1, 0]) screen(s);
    expect(hooks.played).toEqual(["warning", "tick", "tick", "start"]);
  });

  it("begins with the horn again for a new race key, even on the same second", () => {
    screen(3, "race-1"); screen(3, "race-2"); screen(2, "race-2");
    expect(hooks.played).toEqual(["warning", "warning", "tick"]);
  });
});
