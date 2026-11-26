import * as React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { ComponentProps, ReactElement, ReactNode } from "react";

// Contract (M3-4): the multiplayer Settings tab offers the Vibration switch
// right after the race sound switch, bound to the stored choice, only where
// the device can vibrate; turning it off saves "off" for the multiplayer
// surface.

vi.mock("@/lib/i18n", () => ({ useI18n: () => ({ lang: "en", tl: (copy: Record<string, string>) => copy.en, tp: (_ru: string, en: string) => en }) }));
vi.mock("react", async original => {
  const actual = await original<typeof import("react")>();
  return {
    ...actual,
    // Client render: hooks read the live value, not the server default.
    useSyncExternalStore: (_subscribe: unknown, get: () => unknown) => get(),
    // Open the Settings tab (the cockpit's only "helm"-initialised state).
    useState: (init: unknown) => actual.useState(init === "helm" ? "settings" : init),
  };
});
const record = vi.hoisted(() => vi.fn());
vi.mock("@/lib/diagnostics-web", () => ({ recordWebDiagnostic: record }));

const data = new Map<string, string>();
let host: EventTarget & { localStorage: unknown; navigator: unknown; matchMedia?: unknown; ReactNativeWebView?: unknown; __REGATTA_RACE_HAPTICS__?: unknown };
beforeEach(() => {
  vi.stubGlobal("React", React); data.clear(); record.mockReset();
  host = Object.assign(new EventTarget(), {
    localStorage: { getItem: (k: string) => data.get(k) ?? null, setItem: (k: string, v: string) => { data.set(k, v); }, removeItem: (k: string) => { data.delete(k); } },
    navigator: { maxTouchPoints: 0 },
    matchMedia: () => ({ matches: false, addEventListener() {}, removeEventListener() {} }),
  });
  vi.stubGlobal("window", host);
});
afterEach(() => vi.unstubAllGlobals());

const { MultiplayerCockpit } = await import("./MultiplayerCockpit");
type Props = ComponentProps<typeof MultiplayerCockpit>;
const props: Props = {
  children: null, frame: null, phase: "racing", countdown: 0, reconnecting: false, code: "ABCD",
  rudder: 0, course: null, setRudder() {}, setCourse() {}, courseDelta() {},
  camera: "stern", setCamera() {}, onResetCamera() {}, onLeave() {},
  guidanceOn: true, setGuidanceOn() {}, windReading: null, navigation: null,
  windDisplay: "compass", setWindDisplay() {}, miniMap: true, setMiniMap() {},
};

let tree: ReactNode = null;
function Probe() { tree = MultiplayerCockpit(props); return tree as ReactElement; }
function find(node: ReactNode, testId: string): ReactElement<Record<string, unknown>> | null {
  if (!node || typeof node !== "object") return null;
  if (Array.isArray(node)) { for (const child of node) { const hit = find(child, testId); if (hit) return hit; } return null; }
  const element = node as ReactElement<Record<string, unknown>>;
  if (element.props?.["data-testid"] === testId) return element;
  return find(element.props?.children as ReactNode, testId);
}

describe("multiplayer vibration switch", () => {
  it("is hidden on a desktop browser and in an app build without the native handler", () => {
    expect(renderToStaticMarkup(<Probe />)).toContain('data-testid="race-sound-switch"');
    expect(renderToStaticMarkup(<Probe />)).not.toContain("race-haptics-switch");
    host.ReactNativeWebView = { postMessage: () => undefined };
    expect(renderToStaticMarkup(<Probe />)).not.toContain("race-haptics-switch");
  });

  it("sits right after race sound where the device can vibrate, bound to the stored choice", () => {
    host.navigator = { maxTouchPoints: 5, vibrate: () => true };
    const html = renderToStaticMarkup(<Probe />);
    expect(html).toMatch(/data-testid="race-sound-switch"[^>]*\/><\/label><label[^>]*><span>Vibration<\/span><input[^>]*data-testid="race-haptics-switch"/);
    expect(find(tree, "race-haptics-switch")!.props.checked).toBe(true);
    data.set("regatta.race.haptics.v1", "off");
    renderToStaticMarkup(<Probe />);
    expect(find(tree, "race-haptics-switch")!.props.checked).toBe(false);
  });

  it("saves the change for the multiplayer surface", () => {
    host.ReactNativeWebView = { postMessage: () => undefined };
    host.__REGATTA_RACE_HAPTICS__ = true;
    renderToStaticMarkup(<Probe />);
    const change = find(tree, "race-haptics-switch")!.props.onChange as (e: { target: { checked: boolean } }) => void;
    change({ target: { checked: false } });
    expect(data.get("regatta.race.haptics.v1")).toBe("off");
    expect(record).toHaveBeenCalledWith(expect.objectContaining({ preference: "haptics", surface: "multiplayer", value: false, previous: true }));
  });
});
