import * as React from "react";
import { Children, isValidElement, type ComponentProps, type ReactElement, type ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// M4-3 contract, the replay's own wiring: a ribbon tap moves the replay to
// 5 s before the event and plays it; a speed button changes the speed; the
// camera switch and a tap on the scene step through the race cameras.
// The component is called as a function with state kept in slots, so a
// setter's value shows on the next call (no DOM in this suite).
const hooks = vi.hoisted(() => ({ cursor: 0, slots: [] as unknown[], effects: [] as (() => void | (() => void))[], camera: "orbit", setCamera: (_: string) => {} }));
vi.mock("react", async original => ({
  ...await original<typeof import("react")>(),
  useState: (initial: unknown) => {
    const slot = hooks.cursor++;
    if (!(slot in hooks.slots)) hooks.slots[slot] = typeof initial === "function" ? (initial as () => unknown)() : initial;
    return [hooks.slots[slot], (value: unknown) => {
      hooks.slots[slot] = typeof value === "function" ? (value as (v: unknown) => unknown)(hooks.slots[slot]) : value;
    }];
  },
  useRef: (initial: unknown) => {
    const slot = hooks.cursor++;
    if (!(slot in hooks.slots)) hooks.slots[slot] = { current: initial };
    return hooks.slots[slot];
  },
  useMemo: (make: () => unknown) => make(),
  // Effects are collected, not run: a test runs them when it needs the clock.
  useEffect: (effect: () => void | (() => void)) => { hooks.effects.push(effect); },
}));
vi.mock("next/dynamic", () => ({ default: () => () => null }));
vi.mock("@/lib/i18n", () => ({ useI18n: () => ({ lang: "en", tl: (text: Record<string, string>) => text.en }) }));
vi.mock("@/features/venues/useVenue", () => ({ useVenue: () => ({ venue: { id: "gocek" } }) }));
vi.mock("@/features/race-3d/useRaceView", () => ({ useRaceView: () => ({ camera: hooks.camera, setCamera: (v: string) => hooks.setCamera(v) }) }));
vi.mock("@/lib/diagnostics-controls", () => ({ recordControlChange: () => {}, recordDiagnostic: () => {} }));
vi.mock("@/lib/diagnostics-bridge", () => ({ initializeDiagnosticBridge: () => {} }));
import { RaceReplay, ReplayControls } from "./RaceReplay";
import type { ReplayRibbonItem } from "@/lib/race-replay-teaching";

type Node = ReactElement<Record<string, unknown>>;
function nodes(tree: ReactNode): Node[] {
  return Children.toArray(tree).filter(isValidElement).flatMap(element => {
    const node = element as Node;
    return [node, ...nodes(node.props.children as ReactNode)];
  });
}
const samples = Array.from({ length: 121 }, (_, i) => ({ t: i * 0.5, x: 500, y: 1200 - i, heading: i < 20 ? 315 : 45, twa: i < 20 ? -45 : 45, speed: i >= 20 && i <= 24 ? 4.4 : 5, lap: 0 }));
const props: ComponentProps<typeof RaceReplay> = { samples, course: {} as ComponentProps<typeof RaceReplay>["course"], onClose: () => {},
  events: [{ type: "start", t: 0 }, { type: "tack", t: 10 }, { type: "mark-rounded", t: 50 }] };
const render = (p: ComponentProps<typeof RaceReplay> = props) => { hooks.cursor = 0; hooks.effects = []; return RaceReplay(p); };
const controlsOf = (tree: ReactNode) => nodes(tree).find(n => n.type === ReplayControls)!.props as unknown as ComponentProps<typeof ReplayControls>;
class FakeCanvas {}

beforeEach(() => { hooks.cursor = 0; hooks.slots = []; hooks.effects = []; hooks.camera = "orbit"; hooks.setCamera = () => {}; vi.stubGlobal("React", React); vi.stubGlobal("HTMLCanvasElement", FakeCanvas); });
afterEach(() => { vi.unstubAllGlobals(); });

describe("teaching replay wiring (M4-3)", () => {
  it("a ribbon tap seeks to 5 s before the event and starts playing", () => {
    const before = controlsOf(render());
    expect(before).toMatchObject({ playing: false, time: 0, rate: 1 });
    const mark = before.ribbon.find(i => i.kind === "mark") as ReplayRibbonItem;
    before.onJump(mark);
    // The tapped event is the marked one through its lead-in.
    expect(controlsOf(render())).toMatchObject({ playing: true, time: 45, pinned: mark.id });
    const tack = before.ribbon.find(i => i.kind === "tack") as ReplayRibbonItem;
    controlsOf(render()).onJump(tack);
    // Already playing: it keeps playing from the new place.
    expect(controlsOf(render())).toMatchObject({ playing: true, time: 5 });
    // A timeline seek lets go of the jumped-to event.
    controlsOf(render()).onSeek(20);
    expect(controlsOf(render())).toMatchObject({ time: 20, pinned: null });
    // Opened at a debrief moment that is a ribbon event: that event is marked.
    hooks.slots = [];
    expect(controlsOf(render({ ...props, startAt: 50 }))).toMatchObject({ time: 45, pinned: "mark-2" });
  });

  it("opens at a moment and plays when asked to, and a speed button sets the speed", () => {
    const opened = controlsOf(render({ ...props, autoplay: true, startAt: 31 }));
    expect(opened).toMatchObject({ playing: true, time: 26 });
    opened.onRate(4);
    expect(controlsOf(render()).rate).toBe(4);
    controlsOf(render()).onPlay();
    expect(controlsOf(render()).playing).toBe(false);
  });

  it("the clock holds at the jump target until the 3D scene has drawn its first frame", () => {
    let tick: ((now: number) => void) | null = null;
    vi.stubGlobal("requestAnimationFrame", (cb: (now: number) => void) => { tick = cb; return 1; });
    vi.stubGlobal("cancelAnimationFrame", () => {});
    vi.stubGlobal("document", { hidden: false });
    // Run the replay's effects as React would after this render, then 2 s of frames.
    const frames = (from: number) => {
      const cleanups = hooks.effects.map(effect => effect());
      for (let now = from; now <= from + 2000; now += 50) tick!(now);
      cleanups.forEach(cleanup => typeof cleanup === "function" && cleanup());
    };
    const sceneOf = (tree: ReactNode) => nodes(tree).find(n => "boatsRef" in n.props)!;
    // Opened from the results at a moment: playing, 5 s before it.
    let tree = render({ ...props, autoplay: true, startAt: 31 });
    expect(controlsOf(tree)).toMatchObject({ playing: true, time: 26 });
    frames(1000);
    // The scene is still loading: the 5 s lead is not spent.
    tree = render({ ...props, autoplay: true, startAt: 31 });
    expect(controlsOf(tree)).toMatchObject({ playing: true, time: 26 });
    (sceneOf(tree).props.onReady as () => void)();
    tree = render({ ...props, autoplay: true, startAt: 31 });
    frames(4000);
    expect(controlsOf(render({ ...props, autoplay: true, startAt: 31 })).time).toBeGreaterThan(27);
  });

  it("the camera switch and a tap on the scene step to the next race camera", () => {
    const picked: string[] = [];
    hooks.setCamera = v => picked.push(v);
    const tree = render();
    const cycle = nodes(tree).find(n => n.props["data-testid"] === "replay-camera-cycle")!;
    (cycle.props.onClick as () => void)();
    expect(picked).toEqual(["stern"]);
    hooks.camera = "high";
    const scene = nodes(render()).find(n => n.props["data-testid"] === "replay-scene")!;
    const canvas = new FakeCanvas();
    const p = (t: number) => ({ pointerId: 1, clientX: 100, clientY: 100, timeStamp: t, target: canvas, isPrimary: true, button: 0 });
    (scene.props.onPointerDown as (e: unknown) => void)(p(1000));
    (scene.props.onPointerUp as (e: unknown) => void)(p(1100));
    expect(picked).toEqual(["stern", "orbit"]);
  });
});
