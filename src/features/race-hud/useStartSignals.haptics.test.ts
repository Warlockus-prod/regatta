import { afterEach, beforeEach, expect, it, vi } from "vitest";

// Contract (M3-4): on the solo race screen the start gun vibrates once; the
// warning horn and the short signals of the countdown never vibrate.

const hooks = vi.hoisted(() => ({ slots: [] as { deps?: unknown[]; value?: unknown }[], index: 0, haptics: [] as string[] }));
vi.mock("react", async original => ({
  ...await original<typeof import("react")>(),
  useRef: (initial: unknown) => { const slot = hooks.slots[hooks.index++] ??= { value: { current: initial } }; return slot.value; },
  useEffect: (fn: () => void, deps?: unknown[]) => {
    const slot = hooks.slots[hooks.index++] ??= {};
    if (slot.deps && deps && deps.every((d, i) => Object.is(d, slot.deps![i]))) return;
    slot.deps = deps; fn();
  },
}));
vi.mock("@/lib/sounds", () => ({ playStartSignal: vi.fn() }));
vi.mock("@/lib/diagnostics-web", () => ({ recordWebDiagnostic: vi.fn() }));
import { useStartSignals } from "./useStartSignals";
import { HAPTIC_PATTERNS, resetRaceHapticsForTests } from "@/lib/race-haptics";

const screen = (second: number | null) => { hooks.index = 0; useStartSignals(second, "race-1"); };
let clock = 0;
const vibrate = vi.fn((pattern: number[]) => { hooks.haptics.push(pattern.join(",")); return true; });
beforeEach(() => {
  hooks.slots = []; hooks.haptics = []; clock = 0; resetRaceHapticsForTests();
  vi.stubGlobal("window", Object.assign(new EventTarget(), { localStorage: { getItem: () => null, setItem: () => undefined }, navigator: { vibrate, maxTouchPoints: 5 } }));
  vi.stubGlobal("performance", { now: () => clock });
});
afterEach(() => vi.unstubAllGlobals());

it("asks for the start haptic at the gun only, once", () => {
  // One second between countdown steps, so the 300 ms throttle never hides a wrong vibration.
  for (const s of [null, 3, 2, 1, 0, 0]) { clock += 1000; screen(s); }
  expect(hooks.haptics).toEqual([HAPTIC_PATTERNS.start.join(",")]);
});
