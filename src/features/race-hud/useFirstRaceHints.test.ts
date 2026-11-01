import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createFeedbackState, postFeedback, type FeedbackPost, type FeedbackToast } from "./feedback";
import { FIRST_RACE_HINTS, FIRST_RACE_HINTS_KEY, HINT_TIMING, resetFirstRaceHints } from "./first-race-hints";

// Contract (M4-7): the page posts a hint to the feedback bus as an "info"
// toast tagged with its id, records it as seen only once that toast has been
// on screen for HINT_TIMING.readSec while the race runs (a hint still waiting
// for a slot, or one that runs out behind the pause sheet, is not seen), and
// "Show hints again" empties both the device row and what the race loop reads.
// The mock runs every effect on every render, after the previous run's cleanup.
const hooks = vi.hoisted(() => ({ cursor: 0, slots: [] as unknown[], effect: 0, cleanups: [] as (undefined | (() => void))[] }));
vi.mock("react", async original => ({
  ...await original<typeof import("react")>(),
  useRef: (initial: unknown) => {
    const slot = hooks.cursor++;
    if (!(slot in hooks.slots)) hooks.slots[slot] = { current: initial };
    return hooks.slots[slot];
  },
  useCallback: (fn: unknown) => fn,
  useEffect: (fn: () => unknown) => {
    const slot = hooks.effect++;
    hooks.cleanups[slot]?.();
    const cleanup = fn();
    hooks.cleanups[slot] = typeof cleanup === "function" ? cleanup as () => void : undefined;
  },
}));
import { useFirstRaceHints } from "./useFirstRaceHints";

const values = new Map<string, string>();
const storage = { getItem: (k: string) => values.get(k) ?? null, setItem: (k: string, v: string) => { values.set(k, v); }, removeItem: (k: string) => { values.delete(k); } };
beforeEach(() => {
  hooks.cursor = 0; hooks.slots = []; hooks.effect = 0; hooks.cleanups = []; values.clear();
  vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout", "performance"] });
  vi.stubGlobal("window", { localStorage: storage });
  resetFirstRaceHints(storage);
});
afterEach(() => { vi.useRealTimers(); vi.unstubAllGlobals(); });

const render = (post: (m: FeedbackPost) => void, visible: readonly FeedbackToast[], paused = false) => {
  hooks.cursor = 0; hooks.effect = 0;
  return useFirstRaceHints(post, visible, { current: "en" }, paused);
};
const readMs = HINT_TIMING.readSec * 1000;

describe("first race hints on the page", () => {
  it("posts a tagged info toast and records it as seen only once it is on screen", () => {
    values.set(FIRST_RACE_HINTS_KEY, JSON.stringify(["crossing"]));
    const posted: FeedbackPost[] = [];
    let page = render(m => posted.push(m), []);
    // The device record is read on mount: the crossing was shown before.
    expect(page.hintsRef.current.seen).toEqual(new Set(["crossing"]));
    page.showHint({ id: "no-go" });
    expect(posted).toEqual([{ source: "hint", text: expect.stringContaining("No-go zone"), tone: "info", tag: "no-go" }]);
    // Waiting in the queue behind two rule notices: not seen yet.
    let bus = postFeedback(createFeedbackState(), { source: "rule", text: "a", tone: "danger" }, 0);
    bus = postFeedback(bus, { source: "missed-mark", text: "b", tone: "danger" }, 0);
    bus = postFeedback(bus, posted[0], 0);
    page = render(m => posted.push(m), bus.visible);
    expect(bus.queue.map(t => t.tag)).toEqual(["no-go"]);
    expect(page.hintsRef.current.seen.has("no-go")).toBe(false);
    expect(values.get(FIRST_RACE_HINTS_KEY)).toBe(JSON.stringify(["crossing"]));
    // On screen: seen once it has been up for the reading time, on the device and for the loop.
    const onScreen = postFeedback(createFeedbackState(), posted[0], 0).visible;
    page = render(m => posted.push(m), onScreen);
    vi.advanceTimersByTime(readMs - 1);
    expect(page.hintsRef.current.seen.has("no-go")).toBe(false);
    // Another toast coming and going does not restart its reading time.
    page = render(m => posted.push(m), [...onScreen]);
    vi.advanceTimersByTime(1);
    expect(page.hintsRef.current.seen).toEqual(new Set(["no-go", "crossing"]));
    expect(JSON.parse(values.get(FIRST_RACE_HINTS_KEY)!)).toEqual(["no-go", "crossing"]);
  });

  it("does not record a hint the player could not read behind the pause sheet", () => {
    const toast = postFeedback(createFeedbackState(), { source: "hint", text: "x", tone: "info", tag: "first-tack" }, 0).visible;
    let page = render(() => {}, toast);
    vi.advanceTimersByTime(500);
    // Paused (or the app went to the background) just after it went up: the toast runs out behind the sheet.
    page = render(() => {}, toast, true);
    vi.advanceTimersByTime(readMs * 5);
    page = render(() => {}, [], true);
    page = render(() => {}, []);
    vi.advanceTimersByTime(readMs * 5);
    expect(page.hintsRef.current.seen.has("first-tack")).toBe(false);
    expect(values.has(FIRST_RACE_HINTS_KEY)).toBe(false);
    // Shown again (a later race) and resumed with the hint still up: the reading time before the pause counts.
    const again = postFeedback(createFeedbackState(), { source: "hint", text: "x", tone: "info", tag: "first-tack" }, 30).visible;
    page = render(() => {}, again);
    vi.advanceTimersByTime(500);
    page = render(() => {}, again, true);
    vi.advanceTimersByTime(readMs * 5);
    page = render(() => {}, again);
    vi.advanceTimersByTime(readMs - 500 - 1);
    expect(page.hintsRef.current.seen.has("first-tack")).toBe(false);
    vi.advanceTimersByTime(1);
    expect(page.hintsRef.current.seen.has("first-tack")).toBe(true);
    expect(JSON.parse(values.get(FIRST_RACE_HINTS_KEY)!)).toEqual(["first-tack"]);
  });

  it("Show hints again clears the device row and bumps the revision the loop reads", () => {
    values.set(FIRST_RACE_HINTS_KEY, JSON.stringify(FIRST_RACE_HINTS));
    const page = render(() => {}, []);
    expect(page.hintsRef.current.seen.size).toBe(FIRST_RACE_HINTS.length);
    page.showAgain();
    expect(values.has(FIRST_RACE_HINTS_KEY)).toBe(false);
    expect(page.hintsRef.current).toEqual({ seen: new Set(), revision: 1 });
    // The next race setup reads the device record again: still nothing seen.
    page.reload();
    expect(page.hintsRef.current.seen).toEqual(new Set());
  });
});
