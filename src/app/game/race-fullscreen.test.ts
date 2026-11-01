import { afterEach, describe, expect, it, vi } from "vitest";
import { FULLSCREEN_OFFER_KEY, fullscreenOfferAnswered, fullscreenState, markFullscreenOfferAnswered } from "./race-fullscreen";

afterEach(() => vi.unstubAllGlobals());

describe("race full-screen offer", () => {
  it("is offered only where a fine pointer and the Fullscreen API exist", () => {
    expect(fullscreenState()).toBe("unsupported");
    vi.stubGlobal("window", { matchMedia: () => ({ matches: false }) });
    vi.stubGlobal("document", { fullscreenEnabled: true, fullscreenElement: null });
    expect(fullscreenState()).toBe("unsupported");
    vi.stubGlobal("window", { matchMedia: () => ({ matches: true }) });
    expect(fullscreenState()).toBe("off");
    vi.stubGlobal("document", { fullscreenEnabled: true, fullscreenElement: {} });
    expect(fullscreenState()).toBe("on");
    vi.stubGlobal("document", { fullscreenEnabled: false, fullscreenElement: null });
    expect(fullscreenState()).toBe("unsupported");
  });
  it("remembers the answer per browser and survives unavailable storage", () => {
    const store = new Map<string, string>();
    const storage = { getItem: (key: string) => store.get(key) ?? null, setItem: (key: string, value: string) => { store.set(key, value); } };
    expect(fullscreenOfferAnswered(storage)).toBe(false);
    markFullscreenOfferAnswered(storage);
    expect(store.get(FULLSCREEN_OFFER_KEY)).toBe("1");
    expect(fullscreenOfferAnswered(storage)).toBe(true);
    const broken = { getItem: () => { throw new Error("blocked"); }, setItem: () => { throw new Error("blocked"); } };
    expect(fullscreenOfferAnswered(broken)).toBe(false);
    expect(() => markFullscreenOfferAnswered(broken)).not.toThrow();
    expect(fullscreenOfferAnswered(null)).toBe(false);
  });
});
