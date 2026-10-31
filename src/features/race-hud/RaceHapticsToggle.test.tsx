import * as React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// Contract (M3-4): the vibration switch is a 44 px row named "Vibration" in
// all seven languages, with its state in aria-pressed, cyan only while on; it
// is offered only where the device can vibrate, defaults to on, and a click
// saves the opposite choice for its race surface.

const locale = vi.hoisted(() => ({ value: "en" }));
vi.mock("@/lib/i18n", () => ({ useI18n: () => ({ tl: (copy: Record<string, string>) => copy[locale.value] }) }));
vi.mock("react", async original => ({
  ...await original<typeof import("react")>(),
  // Client render: the hook reads the live value, not the server default.
  useSyncExternalStore: (_subscribe: unknown, get: () => unknown) => get(),
}));
const record = vi.hoisted(() => vi.fn());
vi.mock("@/lib/diagnostics-web", () => ({ recordWebDiagnostic: record }));

const data = new Map<string, string>();
let host: EventTarget & { localStorage: unknown; navigator: unknown; ReactNativeWebView?: unknown; __REGATTA_RACE_HAPTICS__?: unknown };
beforeEach(() => {
  vi.stubGlobal("React", React); locale.value = "en"; data.clear(); record.mockReset();
  host = Object.assign(new EventTarget(), {
    localStorage: { getItem: (k: string) => data.get(k) ?? null, setItem: (k: string, v: string) => { data.set(k, v); } },
    navigator: { maxTouchPoints: 0 },
  });
  vi.stubGlobal("window", host);
});
afterEach(() => vi.unstubAllGlobals());

const { RaceHapticsToggle, useRaceHaptics } = await import("./RaceHapticsToggle");
const render = (on: boolean) => renderToStaticMarkup(<RaceHapticsToggle on={on} onChange={() => undefined} />);

describe("RaceHapticsToggle", () => {
  it("names itself in every language and states on or off through aria-pressed", () => {
    for (const [lang, name] of [["ru", "Вибрация"], ["en", "Vibration"], ["pl", "Wibracje"], ["es", "Vibración"], ["fr", "Vibrations"], ["de", "Vibration"], ["it", "Vibrazione"]] as const) {
      locale.value = lang;
      const on = render(true), off = render(false);
      expect(on, lang).toContain(`>${name}<`);
      expect(on, lang).toContain('aria-pressed="true"');
      expect(off, lang).toContain('aria-pressed="false"');
      expect(on + off, lang).not.toMatch(/[\u2013\u2014\u2026\u201c\u201d]/);
    }
  });

  it("is a 44 px target, cyan only while on, with a local icon and no animation", () => {
    const on = render(true), off = render(false);
    for (const html of [on, off]) {
      expect(html).toContain("min-h-11");
      expect(html).toContain('aria-hidden="true"');
      expect(html).not.toMatch(/href|url\(|https?:|animate|transition/);
    }
    expect(on).toContain("--accent-cyan");
    expect(on).toContain('data-haptics-icon="on"');
    expect(off).not.toContain("--accent-cyan");
    expect(off).toContain('data-haptics-icon="off"');
  });
});

describe("useRaceHaptics", () => {
  let seen: ReturnType<typeof useRaceHaptics> | null = null;
  function Probe({ surface }: { surface?: "race" | "multiplayer" }) { seen = useRaceHaptics(surface); return null; }

  it("is not offered on a desktop browser without a vibration motor", () => {
    renderToStaticMarkup(<Probe />);
    expect(seen!.available).toBe(false);
  });

  it("is offered on a touch browser with navigator.vibrate and in the app WebView", () => {
    host.navigator = { maxTouchPoints: 5, vibrate: () => true };
    renderToStaticMarkup(<Probe />);
    expect(seen!.available).toBe(true);
    host.navigator = { maxTouchPoints: 0 };
    host.ReactNativeWebView = { postMessage: () => undefined };
    renderToStaticMarkup(<Probe />);
    expect(seen!.available).toBe(false); // an app build without the native handler
    host.__REGATTA_RACE_HAPTICS__ = true;
    renderToStaticMarkup(<Probe />);
    expect(seen!.available).toBe(true);
  });

  it("defaults to on and saves the choice for its surface", () => {
    renderToStaticMarkup(<Probe surface="multiplayer" />);
    expect(seen!.on).toBe(true);
    seen!.setOn(false);
    expect(data.get("regatta.race.haptics.v1")).toBe("off");
    expect(record).toHaveBeenCalledWith(expect.objectContaining({ preference: "haptics", surface: "multiplayer", value: false }));
    renderToStaticMarkup(<Probe />);
    expect(seen!.on).toBe(false);
  });
});
