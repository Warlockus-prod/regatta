import * as React from "react";
import { readFileSync } from "node:fs";
import { Children, isValidElement, type ComponentProps, type ReactElement, type ReactNode } from "react";
import { beforeEach, afterEach, describe, expect, it, vi } from "vitest";
import { raceTrim, makeStandardCourse } from "@/lib/race-physics";
import { createRaceNavigationSnapshot, raceWindReading } from "@/features/race-hud/navigation-model";
import { RaceOverviewMap } from "@/features/race-hud/RaceOverviewMap";
import { RaceWindInstrument, RaceWindSettings } from "@/features/race-hud/RaceWindInstrument";
import { RaceCornerInstruments, RaceMiniMapButton } from "@/features/race-hud/RaceCornerInstruments";
import { RaceBigMap } from "@/features/race-hud/RaceBigMap";
import { recordWebDiagnostic } from "@/lib/diagnostics-web";

// Keep hook slots across explicit rerenders to exercise the actual tab and
// settings handlers, including several commands before the next React render.
const hooks = vi.hoisted(() => ({ cursor: 0, slots: [] as unknown[], mode: "wheels" as "wheels" | "sliders", lang: "en", updateControls: vi.fn() }));
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
  // Read the live external stores (finish hold, full screen) as a client would.
  useSyncExternalStore: (_subscribe: unknown, get: () => unknown) => get(),
  useEffect: () => {},
}));
vi.mock("@/components/FoundationReturn", () => ({ FoundationReturn: () => null, useFoundationReturnId: () => null }));
vi.mock("@/features/trainer-controls/labels", () => ({ useControlLabels: () => ({ sound: "Wheel clicks", helm: "Helm", controlsTitle: "Controls", heading: "Heading", course: "Course", rudder: "Rudder", mainsheet: "Mainsheet", jibsheet: "Jibsheet" }) }));
vi.mock("@/features/trainer-controls/prefs", () => ({ useControlPrefs: () => ({ prefs: { mode: hooks.mode, helmMapping: { boat: "course" }, sound: true }, update: hooks.updateControls }), helmMappingFor: () => "course" }));
vi.mock("@/lib/i18n", () => ({ useI18n: () => ({ lang: hooks.lang, tl: (value: Record<string, string>) => value[hooks.lang] }) }));
vi.mock("@/lib/diagnostics-web", () => ({ recordWebDiagnostic: vi.fn() }));
import { RaceCockpit, RaceModePicker } from "./RaceCockpit";
import { RacePauseSheet } from "./RacePauseSheet";
import { finishHoldStore } from "./race-finish-hold";
import { FULLSCREEN_OFFER_KEY } from "./race-fullscreen";
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
  return { children: <div data-testid="actual-scene" />, prefs: { mode: "pro", guidance: true, trimHints: true, rules: true, penalties: false, windDisplay: "compass", miniMap: true, coachStrip: true, firstRaceHints: true, softLight: false, sailFlow: false }, updatePrefs: vi.fn(),
    rudder: 0, setRudder: vi.fn(), courseDelta: vi.fn(), setCourse: vi.fn(), targetHeading: 45, trim: raceTrim({}), setTrim: vi.fn(),
    heading: 45, speed: 5, twa: 50, time: "0:10.0", rank: 1, rows: [{ ...boat, name: "Player" }],
    windReading, navigation, guidance: null, camera: "orbit", setCamera: vi.fn(), onResetCamera: vi.fn(),
    paused: false, onPause: vi.fn(), onExit: vi.fn(), onRestart: vi.fn(), autopilot: false, onAutopilot: vi.fn(), muted: true, onSound: vi.fn(), penalty: 0 };
}
function multiProps(): ComponentProps<typeof MultiplayerCockpit> {
  return { children: <div data-testid="actual-scene" />, frame: { boats: [{ ...boat, name: "Player" }], windDir: 355, windKnots: 14, time: 10, guidance: null },
    phase: "racing", countdown: 0, reconnecting: false, code: "ABCD", rudder: 0, course: 45, setRudder: vi.fn(), setCourse: vi.fn(), courseDelta: vi.fn(),
    camera: "orbit", setCamera: vi.fn(), onResetCamera: vi.fn(), onLeave: vi.fn(), guidanceOn: true, setGuidanceOn: vi.fn(),
    windReading, navigation, windDisplay: "compass", setWindDisplay: vi.fn(), miniMap: true, setMiniMap: vi.fn() };
}
beforeEach(() => { hooks.cursor = 0; hooks.slots = []; hooks.mode = "wheels"; hooks.lang = "en"; vi.mocked(recordWebDiagnostic).mockReset(); vi.stubGlobal("React", React); });
afterEach(() => { vi.unstubAllGlobals(); finishHoldStore.set(null); });

describe("solo map and wind integration", () => {
  it.each([
    ["ru", "Открыть карту трассы", "Мини-карта в углу"],
    ["en", "Open course map", "Mini-map in the corner"],
    ["pl", "Otwórz mapę trasy", "Minimapa w rogu"],
    ["es", "Abrir el mapa del recorrido", "Minimapa en la esquina"],
    ["fr", "Ouvrir la carte du parcours", "Mini-carte dans le coin"],
    ["de", "Kurskarte öffnen", "Minikarte in der Ecke"],
    ["it", "Apri la mappa del percorso", "Minimappa nell'angolo"],
  ])("keeps the %s corner action and saved visibility control connected to the actual cockpit", (lang, open, setting) => {
    hooks.lang = lang;
    const props = soloProps();
    const render = () => { hooks.cursor = 0; return RaceCockpit(props); };
    const initial = render();
    const cornerNode = nodes(initial).find(node => node.type === RaceCornerInstruments)!;
    const corner = RaceCornerInstruments(cornerNode.props as ComponentProps<typeof RaceCornerInstruments>);
    const miniNode = nodes(corner).find(node => node.type === RaceMiniMapButton)!;
    const openButton = nodes(RaceMiniMapButton(miniNode.props as ComponentProps<typeof RaceMiniMapButton>)).find(node => node.type === "button")!;
    expect(openButton.props["aria-label"]).toBe(open);
    // F3: the corner map opens the big map over the scene, not the dock's Map tab.
    expect(nodes(initial).some(node => node.type === RaceBigMap)).toBe(false);
    click(openButton);
    const map = render();
    expect(nodes(map).find(node => node.type === RaceBigMap)?.props.snapshot).toBe(navigation);
    expect(nodes(map).some(node => node.type === RaceOverviewMap)).toBe(false);
    expect(nodes(map).find(node => node.type === RaceCornerInstruments)?.props.navigation).toBe(navigation);
    const settingsButton = nodes(map).find(node => node.type === "button" && Children.toArray(node.props.children as ReactNode).some(child => isValidElement(child) && child.type !== "span"))!;
    click(settingsButton);
    const toggle = nodes(render()).find(node => node.props.label === setting)!;
    expect(toggle).toBeDefined();
    (toggle.props.onChange as (value: boolean) => void)(false);
    expect(props.updatePrefs).toHaveBeenLastCalledWith({ miniMap: false });
  });
  it("gives the big map the race track and the route hint only while hints are on, and keeps the race running", () => {
    const props = soloProps();
    const target = { x: 520, y: 210 };
    const samples = [{ x: 400, y: 1150 }, { x: 410, y: 1120 }];
    props.track = vi.fn(() => samples);
    props.guidance = { target } as NonNullable<typeof props.guidance>;
    const render = () => { hooks.cursor = 0; return RaceCockpit(props); };
    (nodes(render()).find(node => node.type === RaceCornerInstruments)!.props.onOpenMap as () => void)();
    const big = nodes(render()).find(node => node.type === RaceBigMap)!;
    expect(big.props).toMatchObject({ snapshot: navigation, track: samples, guidance: props.guidance });
    expect(String(big.props.className)).toBeTruthy();
    props.prefs = { ...props.prefs, guidance: false };
    expect(nodes(render()).find(node => node.type === RaceBigMap)?.props.guidance).toBeNull();
    // Opening the map neither pauses nor exits; the helm tab stays selected.
    expect(props.onPause).not.toHaveBeenCalled();
    expect(button(render(), "Helm").props["aria-pressed"]).toBe(true);
    (big.props.onClose as () => void)();
    expect(nodes(render()).some(node => node.type === RaceBigMap)).toBe(false);
  });

  // Review F3: the race keeps running under the map, so the start countdown,
  // the start flags and the race toasts come after it in the scene (and above
  // it, RaceBigMap.test.tsx checks the layers); a restart or the next race
  // starts with the map closed; the pause sheet hides it.
  it("keeps the countdown and toasts over the open map, and closes it for the next race and under the pause sheet", () => {
    const props = { ...soloProps(), raceId: "race-1", countdown: 7 };
    const render = () => { hooks.cursor = 0; return RaceCockpit(props); };
    (nodes(render()).find(node => node.type === RaceCornerInstruments)!.props.onOpenMap as () => void)();
    const list = nodes(render());
    const at = (match: (node: Node) => boolean) => list.findIndex(match);
    const map = at(node => node.type === RaceBigMap);
    expect(map).toBeGreaterThan(-1);
    expect(at(node => node.props["data-testid"] === "race-countdown")).toBeGreaterThan(map);
    expect(at(node => typeof node.type === "function" && node.type.name === "RaceStartFlags")).toBeGreaterThan(map);
    expect(at(node => typeof node.type === "function" && node.type.name === "RaceFeedbackLayer")).toBeGreaterThan(map);
    // The pause sheet hides it; Continue brings it back.
    props.paused = true;
    expect(nodes(render()).some(node => node.type === RaceBigMap)).toBe(false);
    props.paused = false;
    expect(nodes(render()).some(node => node.type === RaceBigMap)).toBe(true);
    // Restart: the same cockpit, a new race id, the map closed.
    props.raceId = "race-2";
    expect(nodes(render()).some(node => node.type === RaceBigMap)).toBe(false);
  });

  it("keeps the real map, detailed wind and fleet together outside the scene", () => {
    const props = soloProps();
    const render = () => { hooks.cursor = 0; return RaceCockpit(props); };
    const initial = render();
    expect(button(initial, "Helm").props["aria-pressed"]).toBe(true);
    const compact = nodes(initial).find(node => node.type === RaceCornerInstruments)!;
    expect(compact.props).toMatchObject({ wind: windReading, navigation, miniMap: true, windDisplay: "compass" });
    expect(nodes(initial).some(node => node.type === RaceOverviewMap)).toBe(false);
    click(button(initial, "Course map"));
    const map = render();
    expect(nodes(map).find(node => node.type === RaceOverviewMap)?.props.snapshot).toBe(navigation);
    expect(nodes(map).filter(node => node.type === RaceWindInstrument)).toHaveLength(1);
    expect(nodes(map).find(node => node.type === RaceCornerInstruments)?.props.wind).toBe(windReading);
    expect(nodes(map).some(node => node.type === "ol")).toBe(true);
    expect(text(map)).toContain("Fleet");
    expect(nodes(map).find(node => node.props["data-testid"] === "race-3d")?.props.children).toContain(props.children);
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
    expect(nodes(map).filter(node => node.type === RaceWindInstrument)).toHaveLength(1);
    expect(nodes(map).find(node => node.type === RaceCornerInstruments)?.props.wind).toBe(windReading);
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

  // F3: the corner map opens the big map over the scene; the dock (helm, tabs) stays.
  it("opens the big map from the corner with the hint's route only while hints are on, and closes it", () => {
    const props = multiProps();
    const target = { x: 500, y: 200 };
    props.frame = { ...props.frame!, guidance: { target } as NonNullable<NonNullable<typeof props.frame>["guidance"]> };
    const samples = [{ x: 400, y: 1150 }, { x: 410, y: 1120 }];
    props.track = vi.fn(() => samples);
    const render = () => { hooks.cursor = 0; return MultiplayerCockpit(props); };
    const open = nodes(render()).find(node => node.type === RaceCornerInstruments)!;
    (open.props.onOpenMap as () => void)();
    let tree = render();
    const list = nodes(tree);
    const big = list.find(node => node.type === RaceBigMap)!;
    // The online race shows the player's track too (recorded by the client).
    expect(big.props).toMatchObject({ snapshot: navigation, guidance: props.frame.guidance, track: samples });
    expect(nodes(tree).some(node => node.type === "nav")).toBe(true);
    // The start flags stay over the open map.
    expect(list.findIndex(node => typeof node.type === "function" && node.type.name === "RaceStartFlags")).toBeGreaterThan(list.indexOf(big));
    props.guidanceOn = false;
    expect(nodes(render()).find(node => node.type === RaceBigMap)?.props.guidance).toBeNull();
    (big.props.onClose as () => void)();
    tree = render();
    expect(nodes(tree).some(node => node.type === RaceBigMap)).toBe(false);
    expect(props.setRudder).not.toHaveBeenCalled();
  });

  it("retains received result UI and shows unknown telemetry without inventing a frame", () => {
    const props = multiProps(); props.phase = "finished"; props.frame = null; props.navigation = null; props.windReading = null;
    props.results = <div data-testid="actual-results" />;
    hooks.cursor = 0; const tree = MultiplayerCockpit(props);
    expect(nodes(tree).find(node => node.type === RaceCornerInstruments)?.props.wind).toBeNull();
    expect(nodes(tree).some(node => node.props["data-testid"] === "actual-results")).toBe(true);
    expect(nodes(tree).some(node => node.type === RaceOverviewMap)).toBe(false);
    expect(nodes(tree).some(node => node.type === "nav")).toBe(false);
  });
});

// M1-2 contract: the race has exactly one Menu control; it opens the pause
// sheet, whose Exit leaves only after a confirmation (or at once in the
// finish hold), whose Restart restarts and whose Settings opens the dock.
describe("solo game layer: status row and pause sheet", () => {
  const render = (props: ComponentProps<typeof RaceCockpit>) => { hooks.cursor = 0; return RaceCockpit(props); };
  const buttonsNamed = (tree: ReactNode, label: string) => nodes(tree).filter(node => node.type === "button" && text(node.props.children as ReactNode) === label);
  /** Render the sheet with its own hook slots, as React would for a child. */
  const sheet = (tree: ReactNode) => {
    const node = nodes(tree).find(node => node.type === RacePauseSheet);
    expect(node, "pause sheet").toBeDefined();
    const start = 1000;
    return () => { hooks.cursor = start; return RacePauseSheet(node!.props as unknown as ComponentProps<typeof RacePauseSheet>); };
  };

  it("shows one Menu control and no separate pause button; Menu toggles the pause", () => {
    const props = soloProps();
    const tree = render(props);
    expect(buttonsNamed(tree, "Menu")).toHaveLength(1);
    expect(buttonsNamed(tree, "Pause")).toHaveLength(0);
    expect(buttonsNamed(tree, "Resume")).toHaveLength(0);
    expect(nodes(tree).some(node => node.type === RacePauseSheet)).toBe(false);
    const menu = buttonsNamed(tree, "Menu")[0];
    expect(menu.props["aria-expanded"]).toBe(false);
    click(menu);
    expect(props.onPause).toHaveBeenCalledTimes(1);
    expect(props.onExit).not.toHaveBeenCalled();
    // Time, place and speed share the one row over the scene.
    const row = nodes(tree).find(node => node.props["data-testid"] === "race-status-row")!;
    const scene = nodes(tree).find(node => node.props["data-testid"] === "race-3d")!;
    expect(nodes(scene.props.children as ReactNode).some(node => node.props["data-testid"] === "race-status-row")).toBe(true);
    expect(text(row.props.children as ReactNode)).toContain("0:10.0");
    expect(text(row.props.children as ReactNode)).toContain("1/1");
    expect(text(row.props.children as ReactNode)).toContain("PRO");
  });

  it("opens the sheet while paused: Continue resumes, Restart restarts, Race settings opens the dock settings", () => {
    const props = { ...soloProps(), paused: true };
    const tree = render(props);
    expect(buttonsNamed(tree, "Menu")).toHaveLength(1);
    expect(buttonsNamed(tree, "Menu")[0].props["aria-expanded"]).toBe(true);
    const view = sheet(tree)();
    click(button(view, "Resume"));
    expect(props.onPause).toHaveBeenCalledTimes(1);
    click(button(view, "Restart"));
    expect(props.onRestart).toHaveBeenCalledTimes(1);
    click(button(view, "Race settings"));
    const settings = render(props);
    expect(nodes(settings).some(node => node.type === RaceWindSettings)).toBe(true);
    expect(props.onExit).not.toHaveBeenCalled();
  });

  it("asks before leaving a race in progress and leaves only on the confirmation", () => {
    const props = { ...soloProps(), paused: true, onExitPrompt: vi.fn() };
    const draw = sheet(render(props));
    click(button(draw(), "Exit"));
    expect(props.onExit).not.toHaveBeenCalled();
    // The diagnostics journal hears the question and the answer (race.lifecycle exit-ask / exit-stay).
    expect(props.onExitPrompt.mock.calls).toEqual([["ask"]]);
    const confirm = draw();
    expect(text(confirm)).toContain("Leave the race?");
    click(button(confirm, "Stay"));
    expect(props.onExit).not.toHaveBeenCalled();
    expect(props.onExitPrompt.mock.calls).toEqual([["ask"], ["stay"]]);
    click(button(draw(), "Exit"));
    click(button(draw(), "Exit"));
    expect(props.onExit).toHaveBeenCalledTimes(1);
    expect(props.onExitPrompt.mock.calls).toEqual([["ask"], ["stay"], ["ask"]]);
  });

  it("dims and disables steering and trim during this race's finish hold, then leaves without asking", () => {
    const props = { ...soloProps(), raceId: "race-a" };
    const free = render(props);
    const panel = (tree: ReactNode) => nodes(tree).find(node => node.props["data-held"] !== undefined || (typeof node.props.className === "string" && node.props.className.includes("panel")))!;
    expect(panel(free).props.inert).toBeUndefined();
    expect(button(free, "Hold heading").props.disabled).toBe(false);
    finishHoldStore.set({ raceId: "race-b", place: 2, total: 6 });
    expect(panel(render(props)).props.inert).toBeUndefined();
    finishHoldStore.set({ raceId: "race-a", place: 2, total: 6 });
    const held = render(props);
    expect(panel(held).props.inert).toBe(true);
    expect(button(held, "Hold heading").props.disabled).toBe(true);
    // Map and Settings stay usable while the plate shows.
    click(button(held, "Course map"));
    expect(panel(render(props)).props.inert).toBeUndefined();
    const paused = { ...props, paused: true, onExitPrompt: vi.fn() };
    const draw = sheet(render(paused));
    click(button(draw(), "Exit"));
    expect(paused.onExit).toHaveBeenCalledTimes(1);
    expect(paused.onExitPrompt).not.toHaveBeenCalled();
  });

  it("names the fleet in the text colour with a boat-colour dot", () => {
    const props = soloProps();
    props.rows = [{ ...boat, name: "Player" }, { id: "ai0", name: "Aurora", color: "#d55e00", pos: boat.pos, heading: 0, speed: 0, lapDone: 0, isPlayer: false }];
    render(props);
    click(button(render(props), "Course map"));
    const items = nodes(render(props)).filter(node => node.type === "li");
    expect(items).toHaveLength(2);
    for (const [index, item] of items.entries()) {
      const spans = nodes(item.props.children as ReactNode).filter(node => node.type === "span");
      const dot = spans.find(node => node.props["aria-hidden"] === "true")!;
      const name = spans.find(node => node.props["aria-hidden"] !== "true")!;
      expect((dot.props.style as { background: string }).background).toBe(props.rows[index].color);
      expect(name.props.style).toBeUndefined();
    }
    expect(text(items[1].props.children as ReactNode)).toContain("Aurora");
  });

  it.each([
    ["en", "+5 s", "120 m", "Start", "Control mode"],
    ["ru", "+5 с", "120 м", "Старт", "Режим управления"],
    ["pl", "+5 s", "120 m", "Start", "Tryb sterowania"],
  ])("writes %s units, the start signal and the mode picker name from the shared copy", (lang, penalty, metres, start, mode) => {
    hooks.lang = lang;
    const props = { ...soloProps(), penalty: 5, countdown: 0,
      guidance: { action: "hold", suggestedHeading: 40, distance: 120 / 1, state: undefined } as unknown as ComponentProps<typeof RaceCockpit>["guidance"] };
    // The route hint converts course units to metres with METRES_PER_UNIT.
    const tree = render(props);
    const all = text(tree);
    expect(all).toContain(penalty);
    expect(all).toContain(start);
    expect(all).not.toContain("START");
    const route = nodes(tree).find(node => node.props["data-testid"] === "race-route-heading")!;
    expect(text(route.props.children as ReactNode)).toMatch(new RegExp(`· \\d+ ${metres.split(" ")[1]}$`));
    hooks.cursor = 0;
    const picker = RaceModePicker({ prefs: props.prefs, update: vi.fn() });
    expect(nodes(picker).find(node => node.props.role === "radiogroup")?.props["aria-label"]).toBe(mode);
  });

  it("offers full screen once on a desktop browser and keeps the entry in the pause sheet", () => {
    const store = new Map<string, string>();
    const requestFullscreen = vi.fn(() => Promise.resolve());
    vi.stubGlobal("window", { matchMedia: () => ({ matches: true }), localStorage: { getItem: (key: string) => store.get(key) ?? null, setItem: (key: string, value: string) => { store.set(key, value); } } });
    vi.stubGlobal("document", { fullscreenEnabled: true, fullscreenElement: null, documentElement: { requestFullscreen } });
    const props = { ...soloProps(), fullscreenOffer: true };
    const first = render(props);
    const offer = buttonsNamed(first, "Full screen");
    expect(offer).toHaveLength(1);
    click(offer[0]);
    expect(requestFullscreen).toHaveBeenCalledTimes(1);
    expect(store.get(FULLSCREEN_OFFER_KEY)).toBe("1");
    expect(buttonsNamed(render(props), "Full screen")).toHaveLength(0);
    // The native app and phones never get it.
    hooks.slots = [];
    expect(buttonsNamed(render({ ...props, fullscreenOffer: false }), "Full screen")).toHaveLength(0);
    hooks.slots = [];
    const paused = render({ ...props, paused: true });
    expect(buttonsNamed(paused, "Full screen")).toHaveLength(0);
    expect(buttonsNamed(sheet(paused)(), "Full screen")).toHaveLength(1);
  });

  it("leaves a named slot for the race sound switch in the row and in the pause sheet", () => {
    const placements: string[] = [];
    const props = { ...soloProps(), paused: true, raceSoundToggle: (placement: "status" | "pause") => { placements.push(placement); return <span data-testid={`sound-${placement}`} />; } };
    const tree = render(props);
    expect(placements).toEqual(["status", "pause"]);
    expect(nodes(tree).some(node => node.props["data-testid"] === "sound-status")).toBe(true);
    expect(nodes(sheet(tree)()).some(node => node.props["data-testid"] === "sound-pause")).toBe(true);
  });

  it("keeps race sound and wheel clicks as two separate switches in the race settings (M1-5)", () => {
    const props = { ...soloProps(), paused: true };
    click(button(sheet(render(props))(), "Race settings"));
    const settings = nodes(render(props));
    const sound = settings.find(node => node.props.label === "Sound")!;
    const clicks = settings.find(node => node.props.label === "Wheel clicks")!;
    expect(sound, "race sound switch").toBeDefined();
    expect(clicks, "wheel clicks switch").toBeDefined();
    expect(sound.props.checked).toBe(!props.muted);
    (sound.props.onChange as (on: boolean) => void)(true);
    expect(props.onSound).toHaveBeenCalledTimes(1);
    expect(clicks.props.checked).toBe(true);
    (clicks.props.onChange as (on: boolean) => void)(false);
    expect(hooks.updateControls).toHaveBeenLastCalledWith({ sound: false });
  });
});

// Review fix (M1-2): RaceCockpit.module.css is shared with the multiplayer
// cockpit and the 3D replay, which still render the .toolbar and .metrics rows.
// The solo game layer may change only the solo cockpit: its portrait layout is
// scoped to the .gameLayer root class, which the multiplayer cockpit lacks.
describe("shared cockpit stylesheet stays intact for multiplayer and replay", () => {
  const css = readFileSync(new URL("./RaceCockpit.module.css", import.meta.url), "utf8");
  const rules = (selector: string) => css.split("}").filter(block => block.split("{")[0].split(",").some(part => part.trim().endsWith(selector)));

  it("keeps the toolbar, metrics and fleet marker rules the other cockpits use", () => {
    expect(rules(".toolbar").some(rule => /height:52px/.test(rule))).toBe(true);
    expect(rules(".metrics").some(rule => /display:grid/.test(rule))).toBe(true);
    expect(rules(".fleet strong").some(rule => /margin-left:auto/.test(rule))).toBe(true);
  });

  it("scopes the floating portrait notice and the auto dock row to the solo cockpit", () => {
    const portrait = css.split("@media").filter(block => block.includes("orientation:portrait"));
    for (const block of portrait) {
      for (const line of block.split("\n")) {
        if (/position:absolute/.test(line) && /\.notice/.test(line)) expect(line.trim().startsWith(".gameLayer .notice")).toBe(true);
        if (/grid-template-rows:minmax\(0,1fr\) auto/.test(line)) expect(line).toContain(".gameLayer .workspace");
      }
    }
    expect(css).toContain(".gameLayer .notice { position:absolute");
    hooks.cursor = 0;
    expect(String((RaceCockpit(soloProps()) as Node).props.className)).toContain("gameLayer");
    hooks.cursor = 0;
    expect(String((MultiplayerCockpit(multiProps()) as Node).props.className)).not.toContain("gameLayer");
  });

  // Browser check 2026-10-31: the status row cut the sound switch at 320, 375
  // and in a 390 px desktop window. The row never wraps, so narrow scenes drop
  // the optional parts: the full-screen offer (still in the pause sheet) and
  // the visible "/ target" speed (kept for screen readers).
  it("drops the optional status row parts in narrow scenes so the sound switch stays inside", () => {
    const widthOf = (source: string, selector: string) => {
      const found = [...source.matchAll(/@container \(max-width:(\d+)px\) \{([^}]*)\}/g)].find(m => m[2].includes(selector));
      return found ? Number(found[1]) : 0;
    };
    expect(widthOf(css, ".statusEnd .statusAction { display:none;")).toBeGreaterThanOrEqual(719);
    const fx = readFileSync(new URL("../../features/race-hud/RaceFeedbackLayer.module.css", import.meta.url), "utf8");
    expect(widthOf(fx, ".target { position:absolute;")).toBeGreaterThanOrEqual(419);
    expect(widthOf(css, ".modeBadge { display:none;")).toBeGreaterThanOrEqual(359);
  });

  it("keeps the status row chips solid on hover over the scene", () => {
    const hover = rules(".menuButton:hover").join("}");
    expect(hover).toContain("background:var(--bg-card");
    expect(hover).not.toContain("--hover-bg");
  });
});
