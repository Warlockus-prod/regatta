import * as React from "react";
import { Children, isValidElement, type ComponentProps, type ReactElement, type ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { raceTrim, makeStandardCourse } from "@/lib/race-physics";
import { createRaceNavigationSnapshot, raceWindReading } from "@/features/race-hud/navigation-model";
import { raceWaterLayoutOn } from "@/lib/race-water-layout";

// Package 31, R-45 prototype, contract of the water layout:
// - it is on for a touch screen (or ?water=1), off for a mouse (or ?water=0);
// - the arrows and the assists are on the water with any stored helm control,
//   no Helm tab and no panel until a tab is opened;
// - Sails, Map and Settings open a sheet that their own button or Close closes.
const hooks = vi.hoisted(() => ({ cursor: 0, slots: [] as unknown[], lang: "en", effectCursor: 0, deps: [] as (readonly unknown[] | undefined)[], pending: [] as (() => void)[] }));
vi.mock("react", async original => ({
  ...await original<typeof import("react")>(),
  useState: (initial: unknown) => {
    const slot = hooks.cursor++;
    if (!(slot in hooks.slots)) hooks.slots[slot] = typeof initial === "function" ? initial() : initial;
    return [hooks.slots[slot], (value: unknown) => { hooks.slots[slot] = value; }];
  },
  useRef: (initial: unknown) => {
    const slot = hooks.cursor++;
    if (!(slot in hooks.slots)) hooks.slots[slot] = { current: initial };
    return hooks.slots[slot];
  },
  useSyncExternalStore: (_subscribe: unknown, get: () => unknown) => get(),
  // Effects whose dependencies changed wait for flushEffects, so a test can run them.
  useEffect: (effect: () => void, deps?: readonly unknown[]) => {
    const slot = hooks.effectCursor++;
    const before = hooks.deps[slot];
    if (!before || !deps || deps.some((value, i) => value !== before[i])) hooks.pending.push(effect);
    hooks.deps[slot] = deps;
  },
}));
vi.mock("@/components/FoundationReturn", () => ({ FoundationReturn: () => null, useFoundationReturnId: () => null }));
vi.mock("@/features/trainer-controls/labels", () => ({ useControlLabels: () => ({ helm: "Helm", controlsTitle: "Controls", heading: "Heading", course: "Course", rudder: "Rudder", mainsheet: "Mainsheet", jibsheet: "Jibsheet" }) }));
vi.mock("@/features/trainer-controls/prefs", () => ({ useControlPrefs: () => ({ prefs: { mode: "wheels", helmMapping: { boat: "rudder" } }, update: vi.fn() }), helmMappingFor: () => "rudder" }));
vi.mock("@/lib/i18n", () => ({ useI18n: () => ({ lang: hooks.lang, tl: (value: Record<string, string>) => value[hooks.lang] }) }));
vi.mock("@/lib/diagnostics-web", () => ({ recordWebDiagnostic: vi.fn() }));
import { RaceCockpit } from "./RaceCockpit";
import { RaceHelmWater } from "./RaceHelmAssist";
import { RaceHintLogPanel } from "@/features/race-hud/RaceHintLog";
import { RaceCornerInstruments } from "@/features/race-hud/RaceCornerInstruments";
import { RacePauseSheet } from "./RacePauseSheet";

type Node = ReactElement<Record<string, unknown>>;
function nodes(tree: ReactNode): Node[] {
  return Children.toArray(tree).filter(isValidElement).flatMap(element => {
    const node = element as Node;
    return [node, ...nodes(node.props.children as ReactNode), ...nodes(node.props.tabs as ReactNode)];
  });
}
const byTestId = (tree: ReactNode, id: string) => nodes(tree).find(node => node.props["data-testid"] === id);
const boat = { id: "p", pos: { x: 400, y: 1100 }, heading: 45, speed: 5, color: "#fff", lapDone: 0, isPlayer: true };
function props(water: boolean): ComponentProps<typeof RaceCockpit> {
  return { children: <div data-testid="actual-scene" />, prefs: { mode: "pro", guidance: true, trimHints: true, rules: true, penalties: false, windDisplay: "compass", miniMap: true, coachStrip: true, firstRaceHints: true, softLight: false, sailFlow: false }, updatePrefs: vi.fn(),
    rudder: 0, setRudder: vi.fn(), courseDelta: vi.fn(), setCourse: vi.fn(), targetHeading: 45, trim: raceTrim({}), setTrim: vi.fn(),
    heading: 45, speed: 5.7, twa: 50, time: "0:10.0", rank: 1, rows: [{ ...boat, name: "Player" }],
    windReading: raceWindReading({ heading: 45, boatSpeedKn: 5, windFrom: 355, windKnots: 14 }),
    navigation: createRaceNavigationSnapshot({ course: makeStandardCourse(), boats: [boat], windFrom: 355 }), guidance: null,
    camera: "orbit", setCamera: vi.fn(), onResetCamera: vi.fn(), paused: false, onPause: vi.fn(), onExit: vi.fn(), onRestart: vi.fn(),
    autopilot: false, onAutopilot: vi.fn(), muted: true, onSound: vi.fn(), penalty: 0,
    helmControl: "wheels", onHelmArrow: vi.fn(), onHelmTurn: vi.fn(), onBestVmg: vi.fn(), waterLayout: water };
}
const render = (p: ComponentProps<typeof RaceCockpit>) => { hooks.cursor = 0; hooks.effectCursor = 0; return RaceCockpit(p); };
const flushEffects = () => { hooks.pending.splice(0).forEach(effect => effect()); };
const tabButtons = (tree: ReactNode) => nodes(tree).filter(node => node.type === "nav").flatMap(nav => nodes(nav.props.children as ReactNode).filter(node => node.type === "button"));
beforeEach(() => {
  hooks.cursor = 0; hooks.slots = []; hooks.lang = "en"; hooks.effectCursor = 0; hooks.deps = []; hooks.pending = [];
  vi.stubGlobal("React", React);
  vi.useFakeTimers();
  vi.stubGlobal("window", { setInterval, clearInterval, setTimeout, clearTimeout });
});
afterEach(() => { vi.useRealTimers(); vi.unstubAllGlobals(); });

describe("the water layout flag", () => {
  // Owner's TestFlight notes on 81 and rule R-46: the race of every touch screen; a mouse keeps the dock.
  it("is on for a touch screen unless water=0, and on anywhere with water=1", () => {
    for (const query of ["", "water=true", "scene=next"]) {
      expect(raceWaterLayoutOn(new URLSearchParams(query), true)).toBe(true);
      expect(raceWaterLayoutOn(new URLSearchParams(query), false)).toBe(false);
    }
    expect(raceWaterLayoutOn(new URLSearchParams("water=1"), false)).toBe(true);
    expect(raceWaterLayoutOn(new URLSearchParams("water=0"), true)).toBe(false);
  });
  it("reads a coarse pointer as a touch screen and anything else, or no matchMedia, as a mouse", () => {
    vi.stubGlobal("window", { matchMedia: (query: string) => ({ matches: query === "(pointer: coarse)" }) });
    expect(raceWaterLayoutOn(new URLSearchParams(""))).toBe(true);
    vi.stubGlobal("window", { matchMedia: () => ({ matches: false }) });
    expect(raceWaterLayoutOn(new URLSearchParams(""))).toBe(false);
    vi.stubGlobal("window", {});
    expect(raceWaterLayoutOn(new URLSearchParams(""))).toBe(false);
  });
  it("leaves the normal cockpit as it was", () => {
    const tree = render(props(false));
    expect(nodes(tree).some(node => node.type === RaceHelmWater)).toBe(false);
    expect(byTestId(tree, "race-dock-panel")).toBeDefined();
    expect(tree.props["data-water"]).toBeUndefined();
    expect(tabButtons(tree)).toHaveLength(5);
  });
  it("needs the helm's assists: a cockpit without them keeps the dock", () => {
    const tree = render({ ...props(true), onBestVmg: undefined });
    expect(tree.props["data-water"]).toBeUndefined();
    expect(nodes(tree).some(node => node.type === RaceHelmWater)).toBe(false);
  });
});

describe("the helm on the water", () => {
  it("has the helm on the water and no panel until a tab opens", () => {
    const tree = render(props(true));
    expect(tree.props["data-water"]).toBe(true);
    expect(nodes(tree).filter(node => node.type === RaceHelmWater)).toHaveLength(1);
    expect(byTestId(tree, "race-dock-panel")).toBeUndefined();
    // Sails, Map, Settings and Hold angle: the Helm tab is gone.
    expect(tabButtons(tree)).toHaveLength(4);
    expect(tabButtons(tree).some(button => nodes(button.props.children as ReactNode).some(node => node.props.children === "Helm"))).toBe(false);
  });
  it("opens a sheet from a tab; the same tab and Close close it, the helm stays", () => {
    const p = props(true);
    let tree = render(p);
    (tabButtons(tree)[0].props.onClick as () => void)();
    tree = render(p);
    expect(byTestId(tree, "race-dock-panel")).toBeDefined();
    expect(nodes(tree).filter(node => node.type === RaceHelmWater)).toHaveLength(1);
    expect(tabButtons(tree)[0].props["aria-pressed"]).toBe(true);
    (tabButtons(tree)[0].props.onClick as () => void)();
    tree = render(p);
    expect(byTestId(tree, "race-dock-panel")).toBeUndefined();
    (tabButtons(tree)[1].props.onClick as () => void)();
    tree = render(p);
    expect(tabButtons(tree)[1].props["aria-pressed"]).toBe(true);
    (byTestId(tree, "race-water-sheet-close")!.props.onClick as () => void)();
    tree = render(p);
    expect(byTestId(tree, "race-dock-panel")).toBeUndefined();
  });
  it("asks the corner for the small wind box only in the water layout", () => {
    const corner = (water: boolean) => nodes(render(props(water))).find(node => node.type === RaceCornerInstruments)!;
    expect(corner(true).props.bare).toBe(true);
    expect(corner(false).props.bare).toBe(false);
  });
  it("closes a sheet when the race restarts, so it cannot hide the countdown", () => {
    const p = { ...props(true), raceId: "race-1" };
    let tree = render(p);
    flushEffects();
    tree = render(p);
    (tabButtons(tree)[0].props.onClick as () => void)();
    tree = render(p);
    flushEffects();
    tree = render(p);
    expect(byTestId(tree, "race-dock-panel")).toBeDefined();
    render({ ...p, raceId: "race-2" });
    flushEffects();
    tree = render({ ...p, raceId: "race-2" });
    expect(byTestId(tree, "race-dock-panel")).toBeUndefined();
  });
  it("keeps one thing over the scene: a sheet closes for the log, the log for a sheet", () => {
    const p = { ...props(true), hintLog: [] };
    let tree = render(p);
    (tabButtons(tree)[2].props.onClick as () => void)();
    tree = render(p);
    expect(byTestId(tree, "race-dock-panel")).toBeDefined();
    (byTestId(tree, "race-hint-log-settings")!.props.onClick as () => void)();
    tree = render(p);
    expect(byTestId(tree, "race-dock-panel")).toBeUndefined();
    expect(nodes(tree).some(node => node.type === RaceHintLogPanel)).toBe(true);
    (tabButtons(tree)[0].props.onClick as () => void)();
    tree = render(p);
    expect(byTestId(tree, "race-dock-panel")).toBeDefined();
    expect(nodes(tree).some(node => node.type === RaceHintLogPanel)).toBe(false);
  });
  it("Race settings in the pause sheet does not close Settings that are already open", () => {
    const p = { ...props(true), paused: true };
    let tree = render(p);
    const settings = () => nodes(render(p)).find(node => node.type === RacePauseSheet)!.props.onSettings as () => void;
    settings()();
    tree = render(p);
    expect(tabButtons(tree)[2].props["aria-pressed"]).toBe(true);
    settings()();
    tree = render(p);
    expect(tabButtons(tree)[2].props["aria-pressed"]).toBe(true);
    expect(byTestId(tree, "race-dock-panel")).toBeDefined();
  });
  it("drops the empty strip when the coach line is off and only the hidden numbers are left", () => {
    const base = props(true);
    const off = { ...base, prefs: { ...base.prefs, coachStrip: false, trimHints: false } };
    expect(byTestId(render(off), "race-coach-line")).toBeUndefined();
    const normal = props(false);
    expect(byTestId(render({ ...normal, prefs: { ...normal.prefs, coachStrip: false, trimHints: false } }), "race-coach-line")).toBeDefined();
  });
});
