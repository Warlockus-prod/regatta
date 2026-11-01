import * as React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { ComponentProps, ReactElement, ReactNode } from "react";

// F2 (TestFlight 74: "the helm is not fixed, easy to scroll and lose it"), the
// multiplayer race uses the solo race dock styles, so it gets the same rules.
// Contract: while the multiplayer race is on screen the Helm panel is pinned
// (never a scroll container, no pan or zoom from it), the other tabs and the
// results scroll in their own panel, the Settings icon is 22 px and the page
// itself is locked from scrolling until the cockpit leaves.

const state = vi.hoisted(() => ({ tab: "helm", effects: [] as (() => void | (() => void))[] }));
vi.mock("@/lib/i18n", () => ({ useI18n: () => ({ lang: "en", tl: (copy: Record<string, string>) => copy.en, tp: (_ru: string, en: string) => en }) }));
vi.mock("react", async original => {
  const actual = await original<typeof import("react")>();
  return {
    ...actual,
    useSyncExternalStore: (_subscribe: unknown, get: () => unknown) => get(),
    // The cockpit's only "helm"-initialised state is its tab.
    useState: (init: unknown) => actual.useState(init === "helm" ? state.tab : init),
    useEffect: (effect: () => void | (() => void)) => { state.effects.push(effect); },
  };
});
vi.mock("@/lib/diagnostics-web", () => ({ recordWebDiagnostic: vi.fn() }));

const scrollTo = vi.fn();
beforeEach(() => {
  vi.stubGlobal("React", React);
  state.tab = "helm"; state.effects = []; scrollTo.mockReset();
  vi.stubGlobal("window", Object.assign(new EventTarget(), {
    localStorage: { getItem: () => null, setItem() {}, removeItem() {} },
    navigator: { maxTouchPoints: 0 }, scrollTo,
    matchMedia: () => ({ matches: false, addEventListener() {}, removeEventListener() {} }),
  }));
});
afterEach(() => vi.unstubAllGlobals());

const { MultiplayerCockpit } = await import("./MultiplayerCockpit");
const { GearIcon } = await import("@/features/trainer-controls/GearIcon");
const { RACE_SCROLL_LOCK_ATTRIBUTE } = await import("@/components/game-layer");
const styles = (await import("../game/RaceCockpit.module.css")).default;
type Props = ComponentProps<typeof MultiplayerCockpit>;
const base: Props = {
  children: null, frame: null, phase: "racing", countdown: 0, reconnecting: false, code: "ABCD",
  rudder: 0, course: null, setRudder() {}, setCourse() {}, courseDelta() {},
  camera: "stern", setCamera() {}, onResetCamera() {}, onLeave() {},
  guidanceOn: true, setGuidanceOn() {}, windReading: null, navigation: null,
  windDisplay: "compass", setWindDisplay() {}, miniMap: true, setMiniMap() {},
};

type Node = ReactElement<Record<string, unknown>>;
function all(node: ReactNode): Node[] {
  if (!node || typeof node !== "object") return [];
  if (Array.isArray(node)) return node.flatMap(all);
  const element = node as Node;
  return [element, ...all(element.props?.children as ReactNode)];
}
function render(props: Partial<Props> = {}) {
  let tree: ReactNode = null;
  function Probe() { tree = MultiplayerCockpit({ ...base, ...props }); return tree as ReactElement; }
  renderToStaticMarkup(<Probe />);
  return all(tree);
}
const panel = (nodes: Node[]) => nodes.find(node => node.props["data-testid"] === "multiplayer-dock-panel")!;

describe("multiplayer pinned helm (F2)", () => {
  it("pins the Helm panel during the countdown and the race, and nowhere else", () => {
    for (const phase of ["countdown", "racing"] as const) {
      const helm = panel(render({ phase }));
      expect(helm.props["data-pinned"], phase).toBe(true);
      expect(String(helm.props.className).split(" "), phase).toContain(styles.pinned);
    }
    for (const tab of ["map", "settings"]) {
      state.tab = tab;
      const other = panel(render());
      expect(other.props["data-pinned"], tab).toBeUndefined();
      expect(String(other.props.className).split(" "), tab).not.toContain(styles.pinned);
    }
    state.tab = "helm";
    // The results list after the finish scrolls in the panel.
    expect(panel(render({ phase: "finished" })).props["data-pinned"]).toBeUndefined();
  });

  it("draws the Settings tab icon at 22 px", () => {
    expect(render().find(node => node.type === GearIcon)?.props.size).toBe(22);
  });

  it("locks the page from scrolling while the cockpit is on screen and releases it after", () => {
    const attributes = new Set<string>();
    vi.stubGlobal("document", { body: { setAttribute: (name: string) => attributes.add(name), removeAttribute: (name: string) => attributes.delete(name) } });
    render();
    const cleanups = state.effects.map(effect => effect());
    expect(attributes.has(RACE_SCROLL_LOCK_ATTRIBUTE)).toBe(true);
    expect(scrollTo).toHaveBeenCalledWith(0, 0);
    for (const cleanup of cleanups) if (typeof cleanup === "function") cleanup();
    expect(attributes.has(RACE_SCROLL_LOCK_ATTRIBUTE)).toBe(false);
  });
});

// F4: the softer light is a race setting; the online race has the same switch.
describe("multiplayer softer light switch (F4)", () => {
  it("shows the switch in Settings, checked from the race setting, and writes it", () => {
    state.tab = "settings";
    const setSoftLight = vi.fn();
    const box = render({ softLight: true, setSoftLight }).find(node => node.props["data-testid"] === "race-soft-light-switch")!;
    expect(box.props.checked).toBe(true);
    (box.props.onChange as (e: { target: { checked: boolean } }) => void)({ target: { checked: false } });
    expect(setSoftLight).toHaveBeenCalledWith(false);
    expect(render().find(node => node.props["data-testid"] === "race-soft-light-switch")).toBeUndefined();
    state.tab = "helm";
  });
});

