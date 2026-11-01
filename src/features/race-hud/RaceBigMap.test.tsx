import * as React from "react";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { Children, isValidElement, type ComponentProps, type ReactElement, type ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { calcTWA, makeStandardCourse } from "@/lib/race-physics";
import { guidanceToTarget } from "@/lib/race-guidance";
import { createRaceNavigationSnapshot } from "./navigation-model";
import type { RaceMapView } from "./map-view";

// F3 contract (TestFlight 74: "the map is small, needs different modes and
// the ability to zoom"): the big map opens with the whole course north up;
// Zoom in / Zoom out step the zoom (out and "Whole course" are off at the
// whole course), "Whole course" goes back to it, "Bow up" turns the world so
// the bow points up, a two-finger pinch zooms, one finger drags the zoomed
// map, Close and Esc close it (Esc from anywhere, never reaching the race's
// pause key), and the route is drawn only when the host passes the hint, as
// the same sailing legs as on the water. The component is called as a
// function with its state kept in slots; effects are collected and run by
// hand against small fakes (no DOM in this suite).
const hooks = vi.hoisted(() => ({ cursor: 0, slots: [] as unknown[], effects: [] as (() => void | (() => void))[] }));
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
  useEffect: (effect: () => void | (() => void)) => { hooks.effects.push(effect); },
  useId: () => ":r0:",
}));
vi.mock("@/lib/i18n", () => ({ useI18n: () => ({ lang: "en", tl: (text: Record<string, string>) => text.en }) }));
import { RaceBigMap } from "./RaceBigMap";
import { RaceOverviewMap } from "./RaceOverviewMap";

type Node = ReactElement<Record<string, unknown>>;
function nodes(tree: ReactNode): Node[] {
  return Children.toArray(tree).filter(isValidElement).flatMap(element => {
    const node = element as Node;
    return [node, ...nodes(node.props.children as ReactNode)];
  });
}
const snapshot = createRaceNavigationSnapshot({ course: makeStandardCourse(), windFrom: 0,
  boats: [{ id: "p", pos: { x: 300, y: 1100 }, heading: 30, isPlayer: true }, { id: "r", pos: { x: 700, y: 400 }, heading: 200 }] })!;
const props = (extra: Partial<ComponentProps<typeof RaceBigMap>> = {}): ComponentProps<typeof RaceBigMap> =>
  ({ snapshot, you: "You", fleet: "Fleet", onClose: vi.fn(), ...extra });
const render = (p: ComponentProps<typeof RaceBigMap>) => { hooks.cursor = 0; hooks.effects = []; return RaceBigMap(p) as Node; };
const named = (tree: ReactNode, name: string) => nodes(tree).find(node => node.type === "button" && node.props["aria-label"] === name)!;
const testId = (tree: ReactNode, id: string) => nodes(tree).find(node => node.props["data-testid"] === id)!;
const radio = (tree: ReactNode, label: string) => nodes(tree).find(node => node.props.role === "radio" && Children.toArray(node.props.children as ReactNode).join("") === label)!;
const mapOf = (tree: ReactNode) => nodes(tree).find(node => node.type === RaceOverviewMap)!.props as unknown as ComponentProps<typeof RaceOverviewMap>;
const click = (node: Node) => (node.props.onClick as () => void)();

beforeEach(() => { hooks.cursor = 0; hooks.slots = []; hooks.effects = []; vi.stubGlobal("React", React); });
afterEach(() => {
  // The chosen orientation lives for the page; put it back for the next test.
  const p = props(); const tree = render(p); click(radio(tree, "North up"));
  vi.unstubAllGlobals();
});

describe("big race map", () => {
  it("opens as a named panel with the whole course north up and the zoom-out controls off", () => {
    const tree = render(props());
    expect(tree.props).toMatchObject({ role: "dialog", "aria-modal": "false", "data-testid": "race-big-map", "data-map-zoom": 1, "data-map-orientation": "north" });
    expect(nodes(tree).find(node => node.props.id === tree.props["aria-labelledby"])?.props.children).toBe("Course map");
    expect(named(tree, "Close map")).toBeDefined();
    expect(named(tree, "Zoom out").props.disabled).toBe(true);
    expect(testId(tree, "race-big-map-fit").props.disabled).toBe(true);
    expect(named(tree, "Zoom in").props.disabled).toBe(false);
    expect(radio(tree, "North up").props["aria-checked"]).toBe(true);
    const map = mapOf(tree);
    expect(map.snapshot).toBe(snapshot);
    expect(map.view?.rotation).toBe(0);
    expect(map.route).toBeNull();
    expect(map.caption).toBe(false);
  });

  it("zooms in and out by steps and goes back to the whole course", () => {
    const p = props();
    const base = (mapOf(render(p)).view as RaceMapView).scale;
    click(named(render(p), "Zoom in"));
    let tree = render(p);
    expect(tree.props["data-map-zoom"]).toBe(1.5);
    expect(mapOf(tree).view!.scale).toBeCloseTo(base * 1.5, 9);
    click(named(tree, "Zoom in"));
    tree = render(p);
    expect(tree.props["data-map-zoom"]).toBe(2.25);
    expect(named(tree, "Zoom out").props.disabled).toBe(false);
    click(named(tree, "Zoom out"));
    expect(render(p).props["data-map-zoom"]).toBe(1.5);
    click(testId(render(p), "race-big-map-fit"));
    tree = render(p);
    expect(tree.props["data-map-zoom"]).toBe(1);
    expect(mapOf(tree).view!.scale).toBeCloseTo(base, 9);
    for (let i = 0; i < 10; i++) click(named(render(p), "Zoom in"));
    tree = render(p);
    expect(tree.props["data-map-zoom"]).toBe(8);
    expect(named(tree, "Zoom in").props.disabled).toBe(true);
  });

  it("turns the world bow up, keeps the zoom, and remembers the choice for the next map", () => {
    const p = props();
    click(named(render(p), "Zoom in"));
    click(radio(render(p), "Bow up"));
    const tree = render(p);
    expect(tree.props["data-map-orientation"]).toBe("heading");
    expect(tree.props["data-map-zoom"]).toBe(1.5);
    expect(radio(tree, "Bow up").props["aria-checked"]).toBe(true);
    expect(mapOf(tree).view!.rotation).toBe(-30);
    hooks.slots = [];
    expect(render(props()).props["data-map-orientation"]).toBe("heading");
  });

  it("zooms with a two-finger pinch on the map, never from a button", () => {
    const p = props();
    const frame = () => nodes(render(p)).find(node => node.props.onPointerDown)!.props as Record<string, (e: unknown) => void>;
    const at = (pointerId: number, clientX: number, target: unknown = { closest: () => null }) => ({ pointerId, clientX, clientY: 100, target });
    frame().onPointerDown(at(1, 100));
    frame().onPointerDown(at(2, 200));
    frame().onPointerMove(at(2, 300));
    expect(render(p).props["data-map-zoom"]).toBe(2);
    frame().onPointerUp(at(2, 300));
    frame().onPointerMove(at(1, 50));
    expect(render(p).props["data-map-zoom"]).toBe(2);
    frame().onPointerUp(at(1, 50));
    frame().onPointerDown(at(3, 100, { closest: () => ({}) }));
    frame().onPointerDown(at(4, 300));
    frame().onPointerMove(at(4, 600));
    expect(render(p).props["data-map-zoom"]).toBe(2);
  });

  it("closes by Close and by Esc, and Esc does not reach the race's pause key", () => {
    const p = props();
    click(named(render(p), "Close map"));
    expect(p.onClose).toHaveBeenCalledTimes(1);
    const event = { key: "Escape", preventDefault: vi.fn(), stopPropagation: vi.fn() };
    (render(p).props.onKeyDown as (e: unknown) => void)(event);
    expect(p.onClose).toHaveBeenCalledTimes(2);
    expect(event.stopPropagation).toHaveBeenCalled();
    const other = { key: "ArrowLeft", preventDefault: vi.fn(), stopPropagation: vi.fn() };
    (render(p).props.onKeyDown as (e: unknown) => void)(other);
    expect(other.stopPropagation).not.toHaveBeenCalled();
    expect(p.onClose).toHaveBeenCalledTimes(2);
  });

  it("draws the route only for a passed hint, and the thinned track", () => {
    const target = { x: 520, y: 1000 };
    const samples = Array.from({ length: 900 }, (_, i) => ({ x: 300, y: 1200 - i / 9 }));
    const guidance = guidanceToTarget(snapshot.boats[0], target, 0);
    const map = mapOf(render(props({ guidance, track: samples })));
    expect(map.route![0]).toMatchObject(snapshot.boats[0].pos);
    expect(map.route!.at(-1)).toMatchObject(target);
    expect(map.track).toHaveLength(400);
    expect(map.track!.at(-1)).toEqual({ x: 300, y: samples.at(-1)!.y });
    expect(mapOf(render(props({ guidance: null }))).route).toBeNull();
  });

  // Review F3: an upwind target is reached by two sailing legs, as on the
  // water, never by a line straight into the wind through the no-go zone.
  it("draws an upwind route as sailing legs outside the no-go zone, like the route on the water", () => {
    const player = snapshot.boats[0];
    const target = { x: 300, y: 180 }; // dead upwind of the boat (wind from 0)
    const guidance = guidanceToTarget(player, target, 0);
    expect(guidance.targetInNoGo).toBe(true);
    const route = mapOf(render(props({ guidance }))).route!;
    expect(route.length).toBeGreaterThan(2);
    expect(route[0]).toMatchObject(player.pos);
    expect(route.at(-1)).toMatchObject(target);
    // The first leg leaves the boat on a sailing course, not straight at the target.
    const leg = route[Math.min(12, route.length - 1)];
    const heading = Math.atan2(leg.x - player.pos.x, -(leg.y - player.pos.y)) * 180 / Math.PI;
    expect(Math.abs(calcTWA(heading, 0))).toBeGreaterThan(30);
    // No unknown wind, no invented route.
    const calm = createRaceNavigationSnapshot({ course: makeStandardCourse(), windFrom: null, boats: [player] })!;
    expect(mapOf(render(props({ snapshot: calm, guidance }))).route).toBeNull();
  });

  it("drags the zoomed map with one finger and goes back with Whole course", () => {
    const p = props();
    const frame = () => nodes(render(p)).find(node => node.props.onPointerDown)!.props as Record<string, (e: unknown) => void>;
    const at = (clientX: number, clientY: number) => ({ pointerId: 1, clientX, clientY, target: { closest: () => null } });
    // The whole course does not move.
    frame().onPointerDown(at(100, 100)); frame().onPointerMove(at(160, 100)); frame().onPointerUp(at(160, 100));
    expect(render(p).props["data-map-panned"]).toBeUndefined();
    click(named(render(p), "Zoom in"));
    const before = mapOf(render(p)).view!;
    const boat = before.project(snapshot.boats[0].pos);
    frame().onPointerDown(at(100, 100)); frame().onPointerMove(at(160, 130)); frame().onPointerUp(at(160, 130));
    const tree = render(p);
    expect(tree.props["data-map-panned"]).toBe("");
    // The map follows the finger: the boat moved by the drag on screen.
    const after = mapOf(tree).view!.project(snapshot.boats[0].pos);
    expect(after.x - boat.x).toBeCloseTo(60, 6);
    expect(after.y - boat.y).toBeCloseTo(30, 6);
    click(testId(tree, "race-big-map-fit"));
    expect(render(p).props["data-map-panned"]).toBeUndefined();
  });

  it("keeps north up without a player boat", () => {
    const spectator = createRaceNavigationSnapshot({ course: makeStandardCourse(), windFrom: 0, boats: [{ id: "r", pos: { x: 700, y: 400 }, heading: 200 }] })!;
    const tree = render(props({ snapshot: spectator }));
    expect(radio(tree, "Bow up").props.disabled).toBe(true);
    expect(tree.props["data-map-orientation"]).toBe("north");
  });

  // Effects: Esc from anywhere (the helm in the dock has focus) closes the
  // map before the race's pause key; the wheel zooms the map, not the page;
  // focus goes to Close and back to the corner map.
  it("closes on Esc from anywhere, zooms by the wheel and moves focus to Close and back", () => {
    const listeners: Record<string, { fn: (e: unknown) => void; capture: unknown }[]> = {};
    const fakeTarget = () => ({ addEventListener: vi.fn((type: string, fn: (e: unknown) => void, capture: unknown) => { (listeners[type] ??= []).push({ fn, capture }); }), removeEventListener: vi.fn() });
    const win = fakeTarget();
    const opener = { isConnected: true, focus: vi.fn() };
    const body = {};
    const doc = { activeElement: opener as unknown, body };
    vi.stubGlobal("window", win);
    vi.stubGlobal("document", doc);
    const p = props();
    let tree = render(p);
    const frameNode = nodes(tree).find(node => node.props.onPointerDown)!;
    const frame = { ...fakeTarget(), getBoundingClientRect: () => ({ width: 300, height: 280 }) };
    (frameNode.props.ref as { current: unknown }).current = frame;
    const close = { focus: vi.fn() };
    (testId(tree, "race-big-map-close").props.ref as { current: unknown }).current = close;
    const cleanups = hooks.effects.map(effect => effect()).filter((c): c is () => void => typeof c === "function");
    expect(close.focus).toHaveBeenCalled();
    // Esc on the window, in the capture phase.
    const esc = listeners.keydown.find(l => l.capture === true)!;
    expect(esc).toBeDefined();
    const event = { key: "Escape", defaultPrevented: false, preventDefault: vi.fn(), stopImmediatePropagation: vi.fn() };
    esc.fn(event);
    expect(p.onClose).toHaveBeenCalledTimes(1);
    expect(event.preventDefault).toHaveBeenCalled();
    expect(event.stopImmediatePropagation).toHaveBeenCalled();
    esc.fn({ key: "p", defaultPrevented: false, preventDefault: vi.fn(), stopImmediatePropagation: vi.fn() });
    expect(p.onClose).toHaveBeenCalledTimes(1);
    // The wheel: a non-passive listener that keeps the page still and zooms in.
    const wheel = listeners.wheel[0];
    expect(wheel.capture).toEqual({ passive: false });
    const scroll = { deltaY: -400, preventDefault: vi.fn() };
    wheel.fn(scroll);
    expect(scroll.preventDefault).toHaveBeenCalled();
    tree = render(p);
    expect(tree.props["data-map-zoom"]).toBeCloseTo(Math.E, 2);
    // The measured frame sizes the map.
    expect(mapOf(tree).width).toBe(300);
    expect(mapOf(tree).height).toBe(280);
    // Closing: focus returns to the corner map when nothing else took it.
    doc.activeElement = body;
    cleanups.forEach(cleanup => cleanup());
    expect(opener.focus).toHaveBeenCalled();
    expect(win.removeEventListener).toHaveBeenCalledWith("keydown", esc.fn, true);
  });

  it("keeps 44 px controls, 16 px text and a solid panel under the race's signals", () => {
    const css = readFileSync(join(process.cwd(), "src/features/race-hud/RaceBigMap.module.css"), "utf8");
    expect(css).toMatch(/\.overlay \{[^}]*z-index:5;[^}]*background:var\(--bg-primary/);
    // The countdown and start flags (z 5, after the map in the markup) and
    // the toasts and contact frame (z 6) stay above the open map.
    const fx = readFileSync(join(process.cwd(), "src/features/race-hud/RaceFeedbackLayer.module.css"), "utf8");
    const z = (rule: string, source: string) => Number(new RegExp(`\\.${rule} \\{[^}]*z-index:(\\d+)`).exec(source)?.[1]);
    const map = z("overlay", css);
    expect(z("layer", fx)).toBeGreaterThan(map);
    expect(z("countdown", fx)).toBeGreaterThanOrEqual(map);
    expect(z("startFlags", fx)).toBeGreaterThanOrEqual(map);
    // A short scene keeps the zoom row inside the panel.
    expect(css).toMatch(/@container \(max-height:\d+px\) \{[^@]*\.note \{ display:none; \}/);
    expect(css).toMatch(/\.overlay \{[^}]*overflow:hidden auto/);
    expect(css).toMatch(/\.overlay \.close \{[^}]*min-width:44px/);
    expect(css).toMatch(/\.overlay \.zoom button \{[^}]*min-width:44px/);
    expect(css).toMatch(/\.frame \{[^}]*touch-action:none/);
    expect(css).toMatch(/\.note \{[^}]*font-size:14px/);
  });
});
