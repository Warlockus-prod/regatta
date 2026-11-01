import * as React from "react";
import { Children, isValidElement, type ComponentProps, type ReactElement, type ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { raceTrim, makeStandardCourse } from "@/lib/race-physics";
import { createRaceNavigationSnapshot, raceWindReading } from "@/features/race-hud/navigation-model";

// M4-7 contract: the race Settings tab offers "Show hints again" with a note
// that the hints never cost a medal; pressing it calls the page's reset and
// says the hints will show again. Without the page's reset there is no entry.
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
vi.mock("@/features/trainer-controls/prefs", () => ({ useControlPrefs: () => ({ prefs: { mode: "sliders", helmMapping: { boat: "course" } }, update: vi.fn() }), helmMappingFor: () => "course" }));
vi.mock("@/lib/i18n", () => ({ useI18n: () => ({ lang: hooks.lang, tl: (value: Record<string, string>) => value[hooks.lang] }) }));
vi.mock("@/lib/diagnostics-web", () => ({ recordWebDiagnostic: vi.fn() }));
import { RaceCockpit } from "./RaceCockpit";
import { RacePauseSheet } from "./RacePauseSheet";

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
const byTestId = (tree: ReactNode, id: string) => nodes(tree).find(node => node.props["data-testid"] === id);
const boat = { id: "p", pos: { x: 400, y: 1100 }, heading: 45, speed: 5, color: "#fff", lapDone: 0, isPlayer: true };
function props(): ComponentProps<typeof RaceCockpit> {
  return { children: <div data-testid="actual-scene" />, prefs: { mode: "simple", guidance: false, trimHints: false, rules: true, penalties: false, windDisplay: "compass", miniMap: true, coachStrip: true, firstRaceHints: true, softLight: false, sailFlow: false }, updatePrefs: vi.fn(),
    rudder: 0, setRudder: vi.fn(), courseDelta: vi.fn(), setCourse: vi.fn(), targetHeading: 45, trim: raceTrim({}), setTrim: vi.fn(),
    heading: 45, speed: 5.7, twa: 50, time: "0:10.0", rank: 1, rows: [{ ...boat, name: "Player" }],
    windReading: raceWindReading({ heading: 45, boatSpeedKn: 5, windFrom: 355, windKnots: 14 }),
    navigation: createRaceNavigationSnapshot({ course: makeStandardCourse(), boats: [boat], windFrom: 355 }), guidance: null,
    camera: "orbit", setCamera: vi.fn(), onResetCamera: vi.fn(), paused: false, onPause: vi.fn(), onExit: vi.fn(), onRestart: vi.fn(),
    autopilot: false, onAutopilot: vi.fn(), muted: true, onSound: vi.fn(), penalty: 0 };
}
const render = (p: ComponentProps<typeof RaceCockpit>) => { hooks.cursor = 0; return RaceCockpit(p); };
beforeEach(() => { hooks.cursor = 0; hooks.slots = []; hooks.lang = "en"; vi.stubGlobal("React", React); });
afterEach(() => { vi.unstubAllGlobals(); });

const sheet = (tree: ReactNode) => nodes(tree).find(node => node.type === RacePauseSheet);
function openSettings(p: ComponentProps<typeof RaceCockpit>) {
  (sheet(render(p))!.props.onSettings as () => void)();
  return render(p);
}

describe("Show hints again in race Settings (M4-7)", () => {
  it("resets the first race hints and confirms it", () => {
    const onShowHintsAgain = vi.fn();
    let tree = openSettings({ ...props(), paused: true, onShowHintsAgain });
    const entry = byTestId(tree, "race-hints-again");
    expect(entry, "settings entry").toBeDefined();
    expect(text(entry!.props.children as ReactNode)).toContain("Show hints again");
    expect(text(entry!.props.children as ReactNode)).toContain("never costs you a medal");
    const button = nodes(entry!.props.children as ReactNode).find(node => node.type === "button")!;
    expect(button.props.className).toContain("min-h-11");
    (button.props.onClick as () => void)();
    expect(onShowHintsAgain).toHaveBeenCalledTimes(1);
    tree = render({ ...props(), paused: true, onShowHintsAgain });
    expect(text(byTestId(tree, "race-hints-again")!.props.children as ReactNode)).toContain("The hints will show again.");
  });

  it("has no entry without the page's reset", () => {
    expect(byTestId(openSettings({ ...props(), paused: true }), "race-hints-again")).toBeUndefined();
  });
});
