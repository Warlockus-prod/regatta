import * as React from "react";
import { Children, isValidElement, type ComponentProps, type ReactElement, type ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { raceTrim, makeStandardCourse } from "@/lib/race-physics";
import { createRaceNavigationSnapshot, raceWindReading } from "@/features/race-hud/navigation-model";

// Package 13 (ADR-0022, audit B17) contract of the cockpit's helm:
// - the race's helm control picks the Helm panel: arrows (with the two
//   assists), or the wheel or sliders with the assists in a row above;
// - the wheel shows the helm the boat gets (keys and assists included) unless
//   the wheel itself is turned;
// - the former course hold is "Hold angle" (R-10), pressed by the assist's hold.
const hooks = vi.hoisted(() => ({ cursor: 0, slots: [] as unknown[], lang: "en" }));
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
  useEffect: () => {},
}));
vi.mock("@/components/FoundationReturn", () => ({ FoundationReturn: () => null, useFoundationReturnId: () => null }));
vi.mock("@/features/trainer-controls/labels", () => ({ useControlLabels: () => ({ helm: "Helm", controlsTitle: "Controls", heading: "Heading", course: "Course", rudder: "Rudder", mainsheet: "Mainsheet", jibsheet: "Jibsheet" }) }));
vi.mock("@/features/trainer-controls/prefs", () => ({ useControlPrefs: () => ({ prefs: { mode: "sliders", helmMapping: { boat: "rudder" } }, update: vi.fn() }), helmMappingFor: () => "rudder" }));
vi.mock("@/lib/i18n", () => ({ useI18n: () => ({ lang: hooks.lang, tl: (value: Record<string, string>) => value[hooks.lang] }) }));
vi.mock("@/lib/diagnostics-web", () => ({ recordWebDiagnostic: vi.fn() }));
import { RaceCockpit } from "./RaceCockpit";
import { RaceHelmArrows, RaceHelmAssistRow } from "./RaceHelmAssist";
import { WheelDeck } from "@/features/trainer-controls/WheelDeck";
import { NO_HELM_VIEW } from "@/lib/helm-assist";

type Node = ReactElement<Record<string, unknown>>;
function nodes(tree: ReactNode): Node[] {
  return Children.toArray(tree).filter(isValidElement).flatMap(element => {
    const node = element as Node;
    return [node, ...nodes(node.props.children as ReactNode)];
  });
}
const byTestId = (tree: ReactNode, id: string) => nodes(tree).find(node => node.props["data-testid"] === id);
const boat = { id: "p", pos: { x: 400, y: 1100 }, heading: 45, speed: 5, color: "#fff", lapDone: 0, isPlayer: true };
function props(): ComponentProps<typeof RaceCockpit> {
  return { children: <div data-testid="actual-scene" />, prefs: { mode: "pro", guidance: true, trimHints: true, rules: true, penalties: false, windDisplay: "compass", miniMap: true, coachStrip: true, firstRaceHints: true, softLight: false, sailFlow: false }, updatePrefs: vi.fn(),
    rudder: 0, setRudder: vi.fn(), courseDelta: vi.fn(), setCourse: vi.fn(), targetHeading: 45, trim: raceTrim({}), setTrim: vi.fn(),
    heading: 45, speed: 5.7, twa: 50, time: "0:10.0", rank: 1, rows: [{ ...boat, name: "Player" }],
    windReading: raceWindReading({ heading: 45, boatSpeedKn: 5, windFrom: 355, windKnots: 14 }),
    navigation: createRaceNavigationSnapshot({ course: makeStandardCourse(), boats: [boat], windFrom: 355 }), guidance: null,
    camera: "orbit", setCamera: vi.fn(), onResetCamera: vi.fn(), paused: false, onPause: vi.fn(), onExit: vi.fn(), onRestart: vi.fn(),
    autopilot: false, onAutopilot: vi.fn(), muted: true, onSound: vi.fn(), penalty: 0 };
}
const render = (p: ComponentProps<typeof RaceCockpit>) => { hooks.cursor = 0; return RaceCockpit(p); };
const tabButton = (tree: ReactNode, index: number) => nodes(tree).filter(node => node.type === "nav").flatMap(nav => nodes(nav.props.children as ReactNode).filter(node => node.type === "button"))[index];
beforeEach(() => { hooks.cursor = 0; hooks.slots = []; hooks.lang = "en"; vi.stubGlobal("React", React); });
afterEach(() => { vi.unstubAllGlobals(); });

const helmProps = (helmControl: "arrows" | "wheels" | "sliders", extra: Partial<ComponentProps<typeof RaceCockpit>> = {}): ComponentProps<typeof RaceCockpit> => ({
  ...props(), helmControl, helmView: NO_HELM_VIEW, onHelmArrow: vi.fn(), onHelmTurn: vi.fn(), onBestVmg: vi.fn(), ...extra });
const panel = (tree: ReactNode) => byTestId(tree, "race-dock-panel")!.props.children as ReactNode;
const first = <T,>(tree: ReactNode, type: T) => nodes(tree).find(node => node.type === type);

describe("the race helm control picks the Helm panel (package 13)", () => {
  it("arrows: the arrows with the assists, the sheets beside them in Pro", () => {
    const arrows = first(panel(render(helmProps("arrows"))), RaceHelmArrows)!;
    expect(arrows.props.pro).toBe(true);
    expect(arrows.props.sheets).toBeTruthy();
    expect(first(panel(render(helmProps("arrows"))), WheelDeck)).toBeUndefined();
    const simple = helmProps("arrows", { prefs: { ...props().prefs, mode: "simple" } });
    expect(first(panel(render(simple)), RaceHelmArrows)!.props.sheets).toBeUndefined();
  });
  it("wheels and sliders: the assists in a row above the helm", () => {
    const wheels = panel(render(helmProps("wheels")));
    expect(first(wheels, RaceHelmAssistRow)).toBeDefined();
    expect(first(wheels, WheelDeck)).toBeDefined();
    const sliders = panel(render(helmProps("sliders")));
    expect(first(sliders, RaceHelmAssistRow)).toBeDefined();
    // No room for the sheets under the assist row: in Pro they stay on the Sails tab.
    expect(nodes(sliders).filter(node => node.type === "input").map(node => node.props["aria-label"])).toEqual(["Rudder"]);
  });
  it("without the helm props the panel is the trainers' controls, as before", () => {
    const tree = panel(render(props()));
    expect(first(tree, RaceHelmArrows)).toBeUndefined();
    expect(first(tree, RaceHelmAssistRow)).toBeUndefined();
  });
});

describe("the wheel reflects any input (audit B17)", () => {
  const wheelRudder = (p: ComponentProps<typeof RaceCockpit>) => (first(panel(render(p)), WheelDeck)!.props.helm as { rudder: number; value: string }) ;
  it("shows the helm the loop applied when the wheel itself is centred", () => {
    const helm = wheelRudder(helmProps("wheels", { helmView: { ...NO_HELM_VIEW, rudder: -1 } }));
    expect(helm.rudder).toBe(-1);
    expect(helm.value).toBe("-35°");
  });
  it("shows the wheel while the wheel is turned", () => {
    expect(wheelRudder(helmProps("wheels", { rudder: 0.4, helmView: { ...NO_HELM_VIEW, rudder: -1 } })).rudder).toBe(0.4);
  });
});

describe("Hold angle (R-10)", () => {
  const holdButton = (tree: ReactNode) => byTestId(tree, "race-hold-angle")!;
  it("is named for the angle and pressed by the assist's hold, not by the course hold", () => {
    expect(nodes(holdButton(render(helmProps("arrows"))).props.children as ReactNode).length).toBeGreaterThan(0);
    expect(holdButton(render(helmProps("arrows", { autopilot: true }))).props["aria-pressed"]).toBe(false);
    expect(holdButton(render(helmProps("arrows", { helmView: { ...NO_HELM_VIEW, hold: "wind" } }))).props["aria-pressed"]).toBe(true);
    const label = (holdButton(render(helmProps("arrows"))).props.children as React.ReactElement<{ children: string }>).props.children;
    expect(label).toBe("Hold angle");
  });
});
