import { describe, expect, it, vi } from "vitest";
import { HELP_KEY_LISTENER_OPTIONS, createHelpKeyListener } from "./HelpOverlay";

// Contract: Escape that closes an open help overlay stops at the overlay, so
// the solo race (which toggles its pause on Escape) never sees it; with the
// overlay closed, Escape still reaches the race.

/** A keydown on a fresh window-like target: the help listener in the capture
 * phase registered first (it lives in the root layout), then the race. */
function dispatchEscape(open: boolean) {
  const win = new EventTarget();
  const state = { open };
  const setOpen = vi.fn((next: boolean | ((o: boolean) => boolean)) => { state.open = typeof next === "function" ? next(state.open) : next; });
  const race = vi.fn();
  win.addEventListener("keydown", createHelpKeyListener(() => state.open, setOpen) as unknown as EventListener, HELP_KEY_LISTENER_OPTIONS);
  win.addEventListener("keydown", race);
  const event = Object.assign(new Event("keydown", { cancelable: true }), { key: "Escape", ctrlKey: false, metaKey: false });
  win.dispatchEvent(event);
  return { state, setOpen, race, event };
}

function fakeKey(key: string, target: unknown = null) {
  return { key, ctrlKey: false, metaKey: false, target, preventDefault: vi.fn(), stopPropagation: vi.fn(), stopImmediatePropagation: vi.fn() } as never;
}

describe("help overlay Escape", () => {
  it("closes an open overlay and keeps that Escape from the race", () => {
    const { state, setOpen, race, event } = dispatchEscape(true);
    expect(setOpen).toHaveBeenCalledWith(false);
    expect(state.open).toBe(false);
    expect(race).not.toHaveBeenCalled();
    expect(event.defaultPrevented).toBe(true);
  });

  it("leaves Escape to the race while the overlay is closed", () => {
    const { setOpen, race, event } = dispatchEscape(false);
    expect(setOpen).not.toHaveBeenCalled();
    expect(race).toHaveBeenCalledTimes(1);
    expect(event.defaultPrevented).toBe(false);
  });

  it("listens in the capture phase, before any page handler on window or below", () => {
    expect(HELP_KEY_LISTENER_OPTIONS).toEqual({ capture: true });
  });

  it("stops both the rest of the path and other window listeners, and still toggles on ?", () => {
    const setOpen = vi.fn();
    const listener = createHelpKeyListener(() => true, setOpen);
    const escape = fakeKey("Escape") as unknown as { stopPropagation: () => void; stopImmediatePropagation: () => void };
    listener(escape as never);
    expect(escape.stopPropagation).toHaveBeenCalled();
    expect(escape.stopImmediatePropagation).toHaveBeenCalled();
    const question = fakeKey("?") as unknown as { stopPropagation: () => void };
    createHelpKeyListener(() => false, setOpen)(question as never);
    expect(setOpen).toHaveBeenLastCalledWith(expect.any(Function));
    expect(question.stopPropagation).not.toHaveBeenCalled();
  });

  it("ignores keys typed into a text field", () => {
    const setOpen = vi.fn();
    const escape = fakeKey("Escape", { tagName: "INPUT" }) as unknown as { stopPropagation: () => void };
    createHelpKeyListener(() => true, setOpen)(escape as never);
    expect(setOpen).not.toHaveBeenCalled();
    expect(escape.stopPropagation).not.toHaveBeenCalled();
  });
});
