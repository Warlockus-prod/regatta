import * as React from "react";
import { Children, isValidElement, type ComponentProps, type ReactElement, type ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { raceTrim, makeStandardCourse } from "@/lib/race-physics";
import { createRaceNavigationSnapshot, raceWindReading } from "@/features/race-hud/navigation-model";

// F5 contract: the race Settings tab's Hints group has "How to race", a 44 px
// button that opens the race intro through the page; without the page's
// handler there is no entry.
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
const byTestId = (tree: ReactNode, id: string) => nodes(tree).find(node => node.props["data-testid"] === id);
const boat = { id: "p", pos: { x: 400, y: 1100 }, heading: 45, speed: 5, color: "#fff", lapDone: 0, isPlayer: true };
function props(): ComponentProps<typeof RaceCockpit> {
  return { children: <div />, prefs: { mode: "simple", guidance: false, trimHints: false, rules: true, penalties: false, windDisplay: "compass", miniMap: true, coachStrip: true, firstRaceHints: true, softLight: false, sailFlow: false }, updatePrefs: vi.fn(),
    rudder: 0, setRudder: vi.fn(), courseDelta: vi.fn(), setCourse: vi.fn(), targetHeading: 45, trim: raceTrim({}), setTrim: vi.fn(),
    heading: 45, speed: 5.7, twa: 50, time: "0:10.0", rank: 1, rows: [{ ...boat, name: "Player" }],
    windReading: raceWindReading({ heading: 45, boatSpeedKn: 5, windFrom: 355, windKnots: 14 }),
    navigation: createRaceNavigationSnapshot({ course: makeStandardCourse(), boats: [boat], windFrom: 355 }), guidance: null,
    camera: "orbit", setCamera: vi.fn(), onResetCamera: vi.fn(), paused: true, onPause: vi.fn(), onExit: vi.fn(), onRestart: vi.fn(),
    autopilot: false, onAutopilot: vi.fn(), muted: true, onSound: vi.fn(), penalty: 0 };
}
const render = (p: ComponentProps<typeof RaceCockpit>) => { hooks.cursor = 0; return RaceCockpit(p); };
function openSettings(p: ComponentProps<typeof RaceCockpit>) {
  (nodes(render(p)).find(node => node.type === RacePauseSheet)!.props.onSettings as () => void)();
  return render(p);
}
beforeEach(() => { hooks.cursor = 0; hooks.slots = []; hooks.lang = "en"; vi.stubGlobal("React", React); });
afterEach(() => { vi.unstubAllGlobals(); });

describe("How to race in race Settings (F5)", () => {
  it("opens the race intro from the Hints group", () => {
    const onShowIntro = vi.fn();
    const tree = openSettings({ ...props(), onShowIntro });
    const group = byTestId(tree, "race-hints-group")!;
    const entry = byTestId(group.props.children as ReactNode, "race-intro-settings");
    expect(entry, "settings entry").toBeDefined();
    expect(entry!.props.children).toBe("How to race");
    expect(entry!.props.className).toContain("min-h-11");
    (entry!.props.onClick as () => void)();
    expect(onShowIntro).toHaveBeenCalledTimes(1);
    hooks.lang = "ru";
    expect(byTestId(render({ ...props(), onShowIntro }), "race-intro-settings")!.props.children).toBe("Как проходит гонка");
  });

  it("has no entry without the page's handler", () => {
    expect(byTestId(openSettings(props()), "race-intro-settings")).toBeUndefined();
  });
});
