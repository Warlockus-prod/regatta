import * as React from "react";
import { Children, isValidElement, type ComponentProps, type ReactElement, type ReactNode } from "react";
import { beforeEach, afterEach, describe, expect, it, vi } from "vitest";
import { raceTrim, makeStandardCourse } from "@/lib/race-physics";
import { createRaceNavigationSnapshot, raceWindReading } from "@/features/race-hud/navigation-model";
import { RaceOverviewMap } from "@/features/race-hud/RaceOverviewMap";
import { RaceWindInstrument, RaceWindSettings } from "@/features/race-hud/RaceWindInstrument";
import { recordWebDiagnostic } from "@/lib/diagnostics-web";

// Keep hook slots across explicit rerenders to exercise the actual tab and
// settings handlers, including several commands before the next React render.
const hooks = vi.hoisted(() => ({ cursor: 0, slots: [] as unknown[], mode: "wheels" as "wheels" | "sliders" }));
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
}));
vi.mock("@/components/FoundationReturn", () => ({ FoundationReturn: () => null, useFoundationReturnId: () => null }));
vi.mock("@/features/trainer-controls/labels", () => ({ useControlLabels: () => ({ helm: "Helm", controlsTitle: "Controls", heading: "Heading", course: "Course", rudder: "Rudder", mainsheet: "Mainsheet", jibsheet: "Jibsheet" }) }));
vi.mock("@/features/trainer-controls/prefs", () => ({ useControlPrefs: () => ({ prefs: { mode: hooks.mode, helmMapping: { boat: "course" } }, update: vi.fn() }), helmMappingFor: () => "course" }));
vi.mock("@/lib/i18n", () => ({ useI18n: () => ({ lang: "en", tl: (value: Record<string, string>) => value.en }) }));
vi.mock("@/lib/diagnostics-web", () => ({ recordWebDiagnostic: vi.fn() }));
import { RaceCockpit } from "./RaceCockpit";
import { MultiplayerCockpit } from "../multiplayer/MultiplayerCockpit";

type Node = ReactElement<Record<string, unknown>>;
function nodes(tree: ReactNode): Node[] {
  return Children.toArray(tree).filter(isValidElement).flatMap(element => {
    const node = element as Node;
    return [node, ...nodes(node.props.children as ReactNode)];
  });
}
function text(tree: ReactNode): string {
  return Children.toArray(tree).map(node => isValidElement(node) ? text((node.props as { children?: ReactNode }).children) : String(node)).join("");
}
function button(tree: ReactNode, label: string): Node {
  const node = nodes(tree).find(node => node.type === "button" && text(node.props.children as ReactNode) === label);
  expect(node, `button ${label}`).toBeDefined();
  return node!;
}
const click = (node: Node) => (node.props.onClick as () => void)();
const boat = { id: "p", pos: { x: 400, y: 1100 }, heading: 45, speed: 5, color: "#fff", lapDone: 0, isPlayer: true };
const navigation = createRaceNavigationSnapshot({ course: makeStandardCourse(), boats: [boat], windFrom: 355 });
const windReading = raceWindReading({ heading: 45, boatSpeedKn: 5, windFrom: 355, windKnots: 14 });
function soloProps(): ComponentProps<typeof RaceCockpit> {
  return { children: <div data-testid="actual-scene" />, prefs: { mode: "pro", guidance: true, trimHints: true, rules: true, penalties: false, windDisplay: "compass" }, updatePrefs: vi.fn(),
    rudder: 0, setRudder: vi.fn(), courseDelta: vi.fn(), setCourse: vi.fn(), targetHeading: 45, trim: raceTrim({}), setTrim: vi.fn(),
    heading: 45, speed: 5, twa: 50, time: "0:10.0", rank: 1, rows: [{ ...boat, name: "Player" }],
    windReading, navigation, guidance: null, camera: "orbit", setCamera: vi.fn(), onResetCamera: vi.fn(),
    paused: false, onPause: vi.fn(), onExit: vi.fn(), autopilot: false, onAutopilot: vi.fn(), muted: true, onSound: vi.fn(), penalty: 0 };
}
function multiProps(): ComponentProps<typeof MultiplayerCockpit> {
  return { children: <div data-testid="actual-scene" />, frame: { boats: [{ ...boat, name: "Player" }], windDir: 355, windKnots: 14, time: 10, guidance: null },
    phase: "racing", countdown: 0, reconnecting: false, code: "ABCD", rudder: 0, course: 45, setRudder: vi.fn(), setCourse: vi.fn(), courseDelta: vi.fn(),
    camera: "orbit", setCamera: vi.fn(), onResetCamera: vi.fn(), onLeave: vi.fn(), guidanceOn: true, setGuidanceOn: vi.fn(),
    windReading, navigation, windDisplay: "compass", setWindDisplay: vi.fn() };
}
beforeEach(() => { hooks.cursor = 0; hooks.slots = []; hooks.mode = "wheels"; vi.mocked(recordWebDiagnostic).mockReset(); vi.stubGlobal("React", React); });
afterEach(() => vi.unstubAllGlobals());

describe("solo map and wind integration", () => {
  it("keeps the real map, detailed wind and fleet together outside the scene", () => {
    const props = soloProps();
    const render = () => { hooks.cursor = 0; return RaceCockpit(props); };
    const initial = render();
    expect(button(initial, "Helm").props["aria-pressed"]).toBe(true);
    const compact = nodes(initial).find(node => node.type === RaceWindInstrument)!;
    expect(compact.props).toMatchObject({ reading: windReading, compact: true, display: "compass" });
    expect(nodes(initial).some(node => node.type === RaceOverviewMap)).toBe(false);
    click(button(initial, "Course map"));
    const map = render();
    expect(nodes(map).find(node => node.type === RaceOverviewMap)?.props.snapshot).toBe(navigation);
    expect(nodes(map).filter(node => node.type === RaceWindInstrument)).toHaveLength(2);
    expect(nodes(map).some(node => node.type === "ol")).toBe(true);
    expect(text(map)).toContain("Fleet");
    expect(nodes(map).find(node => node.props["data-testid"] === "race-3d")?.props.children).toBe(props.children);
  });

  it("records only real map enter/leave transitions, even before rerender and when diagnostics fail", () => {
    const props = soloProps(); hooks.cursor = 0;
    const tree = RaceCockpit(props), map = button(tree, "Course map"), helm = button(tree, "Helm");
    click(map); click(map); click(helm); click(helm);
    expect(vi.mocked(recordWebDiagnostic).mock.calls.map(([event]) => event)).toEqual([
      { type: "control.change", surface: "race", control: "race-map", value: true, previous: false, outcome: "accepted" },
      { type: "control.change", surface: "race", control: "race-map", value: false, previous: true, outcome: "accepted" },
    ]);
    vi.mocked(recordWebDiagnostic).mockImplementation(() => { throw new Error("unavailable"); });
    expect(() => click(map)).not.toThrow();
    hooks.cursor = 0;
    expect(button(RaceCockpit(props), "Course map").props["aria-pressed"]).toBe(true);
  });

  it("routes wind settings to the existing preferences writer and preserves helm slider names", () => {
    hooks.mode = "sliders";
    const props = soloProps();
    const render = () => { hooks.cursor = 0; return RaceCockpit(props); };
    const helm = render();
    const course = nodes(helm).find(node => node.type === "input" && node.props["aria-label"] === "Course")!;
    (course.props.onChange as (event: unknown) => void)({ target: { value: "270" } });
    expect(props.setCourse).toHaveBeenCalledWith(270);
    click(button(helm, "Settings"));
    const settings = nodes(render()).find(node => node.type === RaceWindSettings)!;
    (settings.props.onChange as (display: string) => void)("both");
    expect(props.updatePrefs).toHaveBeenCalledWith({ windDisplay: "both" });
  });
});

describe("authoritative multiplayer map and wind integration", () => {
  it("keeps fleet access in Map and preserves inert reconnecting helm controls", () => {
    const props = multiProps(); props.reconnecting = true;
    const render = () => { hooks.cursor = 0; return MultiplayerCockpit(props); };
    const initial = render();
    expect(nodes(initial).some(node => node.props.inert === true)).toBe(true);
    click(button(initial, "Course map"));
    const map = render();
    expect(nodes(map).find(node => node.type === RaceOverviewMap)?.props.snapshot).toBe(navigation);
    expect(nodes(map).filter(node => node.type === RaceWindInstrument)).toHaveLength(2);
    expect(text(map)).toContain("Fleet");
    expect(nodes(map).some(node => node.type === "ol")).toBe(true);
    click(button(map, "Settings"));
    const settings = nodes(render()).find(node => node.type === RaceWindSettings)!;
    (settings.props.onChange as (display: string) => void)("off");
    expect(props.setWindDisplay).toHaveBeenCalledWith("off");
    expect(vi.mocked(recordWebDiagnostic).mock.calls.map(([event]) => event)).toEqual([
      expect.objectContaining({ surface: "multiplayer", control: "race-map", value: true, previous: false }),
      expect.objectContaining({ surface: "multiplayer", control: "race-map", value: false, previous: true }),
    ]);
    expect(props.setRudder).not.toHaveBeenCalled();
    expect(props.setCourse).not.toHaveBeenCalled();
  });

  it("retains received result UI and shows unknown telemetry without inventing a frame", () => {
    const props = multiProps(); props.phase = "finished"; props.frame = null; props.navigation = null; props.windReading = null;
    props.results = <div data-testid="actual-results" />;
    hooks.cursor = 0; const tree = MultiplayerCockpit(props);
    expect(nodes(tree).find(node => node.type === RaceWindInstrument)?.props.reading).toBeNull();
    expect(nodes(tree).some(node => node.props["data-testid"] === "actual-results")).toBe(true);
    expect(nodes(tree).some(node => node.type === RaceOverviewMap)).toBe(false);
    expect(nodes(tree).some(node => node.type === "nav")).toBe(false);
  });
});
