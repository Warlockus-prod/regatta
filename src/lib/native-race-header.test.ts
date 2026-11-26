import { afterEach, describe, expect, it, vi } from "vitest";
import { announceOwnRaceHeader } from "./native-race-header";

// Package 11 (audit K6): the live room's cockpit tells the app it draws its
// own header, so the native one steps aside; a browser without the bridge is untouched.
describe("own race header message", () => {
  afterEach(() => { vi.unstubAllGlobals(); });

  it("posts the flag through the app bridge", () => {
    const postMessage = vi.fn();
    vi.stubGlobal("window", { ReactNativeWebView: { postMessage } });
    announceOwnRaceHeader(true);
    announceOwnRaceHeader(false);
    expect(postMessage.mock.calls.map(([message]) => JSON.parse(message as string))).toEqual([
      { type: "race-header", own: true }, { type: "race-header", own: false }]);
  });

  it("does nothing in a plain browser", () => {
    vi.stubGlobal("window", {});
    expect(() => announceOwnRaceHeader(true)).not.toThrow();
  });
});
