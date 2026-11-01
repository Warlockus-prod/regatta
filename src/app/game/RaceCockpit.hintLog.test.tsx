import * as React from "react";
import { Children, isValidElement, type ComponentProps, type ReactElement, type ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { raceTrim, makeStandardCourse } from "@/lib/race-physics";
import { createRaceNavigationSnapshot, raceWindReading } from "@/features/race-hud/navigation-model";
import { RaceHintLogPanel } from "@/features/race-hud/RaceHintLog";
import type { HintLogEntry } from "@/features/race-hud/hint-log";

// F4 contract in the race cockpit: the coach line can be switched off (and
// with no route or trim line the strip is gone); the hint log opens from the
// coach line, the race Settings and the pause sheet (over the sheet); the
// Settings have one Hints group (route, Pro trim, coach line, first race
// hints, the log, the gold note) and a Graphics group with the softer light.
const hooks = vi.hoisted(() => ({ cursor: 0, slots: [] as unknown[], lang: "en" }));
vi.mock("react", async original => ({
  ...await original<typeof import("react")>(),
  useState: (initial: unknown) => {
    const slot = hooks.cursor++;
    if (!(slot in hooks.slots)) hooks.slots[slot] = typeof initial === "function" ? initial() : initial;
    return [hooks.slots[slot], (value: unknown) => { hooks.slots[slot] = typeof value === "function" ? (value as (v: unknown) => unknown)(hooks.slots[slot]) : value; }];
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
const LOG: HintLogEntry[] = [
  { id: 2, kind: "route", text: "Prepare to tack", tone: "info", at: 42 },
  { id: 1, kind: "rule", text: "Keep clear.", tone: "danger", at: 12 },
];
type Props = ComponentProps<typeof RaceCockpit>;
function props(patch: Partial<Props["prefs"]> = {}): Props {
  return { children: <div data-testid="actual-scene" />, prefs: { mode: "simple", guidance: false, trimHints: false, rules: true, penalties: false, windDisplay: "compass", miniMap: true, coachStrip: true, firstRaceHints: true, softLight: false, sailFlow: false, ...patch }, updatePrefs: vi.fn(),
    rudder: 0, setRudder: vi.fn(), courseDelta: vi.fn(), setCourse: vi.fn(), targetHeading: 45, trim: raceTrim({}), setTrim: vi.fn(),
    heading: 45, speed: 5.7, twa: 50, time: "0:10.0", rank: 1, rows: [{ ...boat, name: "Player" }],
    windReading: raceWindReading({ heading: 45, boatSpeedKn: 5, windFrom: 355, windKnots: 14 }),
    navigation: createRaceNavigationSnapshot({ course: makeStandardCourse(), boats: [boat], windFrom: 355 }), guidance: null,
    camera: "orbit", setCamera: vi.fn(), onResetCamera: vi.fn(), paused: false, onPause: vi.fn(), onExit: vi.fn(), onRestart: vi.fn(),
    autopilot: false, onAutopilot: vi.fn(), muted: true, onSound: vi.fn(), penalty: 0, hintLog: LOG, raceId: "race-1" };
}
const render = (p: Props) => { hooks.cursor = 0; return RaceCockpit(p); };
const click = (node: Node | undefined) => (node!.props.onClick as () => void)();
const sheet = (tree: ReactNode) => nodes(tree).find(node => node.type === RacePauseSheet);
const panel = (tree: ReactNode) => nodes(tree).find(node => node.type === RaceHintLogPanel);
const switchRow = (tree: ReactNode, label: string) => nodes(tree).find(node => node.props.label === label && "checked" in node.props);
const guidance = { action: "tack", suggestedHeading: 30, distance: 40 } as unknown as NonNullable<Props["guidance"]>;
beforeEach(() => { hooks.cursor = 0; hooks.slots = []; hooks.lang = "en"; vi.stubGlobal("React", React); });
afterEach(() => { vi.unstubAllGlobals(); });

describe("coach line switch (F4)", () => {
  it("shows the coach advice by default, also for prefs written before the switch", () => {
    const legacy = props(); delete (legacy.prefs as Partial<Props["prefs"]>).coachStrip;
    for (const p of [props(), legacy]) expect(text(byTestId(render(p), "race-coach-line")!.props.children as ReactNode)).toContain("You steer; the sails trim automatically.");
  });

  it("is gone when switched off and there is no route or trim line", () => {
    expect(byTestId(render(props({ coachStrip: false })), "race-coach-line")).toBeUndefined();
  });

  it("keeps the route hint's manoeuvre calls and heading line, but drops its steady advice", () => {
    const line = byTestId(render({ ...props({ coachStrip: false, guidance: true }), guidance }), "race-coach-line")!;
    expect(byTestId(line.props.children as ReactNode, "race-route-heading")).toBeDefined();
    expect(text(line.props.children as ReactNode)).toContain("Prepare to tack");
    const hold = { ...guidance, action: "hold" } as NonNullable<Props["guidance"]>;
    const quiet = byTestId(render({ ...props({ coachStrip: false, guidance: true }), guidance: hold }), "race-coach-line")!;
    expect(text(quiet.props.children as ReactNode)).not.toContain("Hold this heading");
    expect(byTestId(quiet.props.children as ReactNode, "race-route-heading")).toBeDefined();
    expect(text(byTestId(render({ ...props({ guidance: true }), guidance: hold }), "race-coach-line")!.props.children as ReactNode)).toContain("Hold this heading");
    // The route hint switched off: no manoeuvre call either.
    expect(byTestId(render({ ...props({ coachStrip: false }), guidance }), "race-coach-line")).toBeUndefined();
  });
});

describe("race hint log in the cockpit (F4)", () => {
  it("opens from the coach line over the scene with this race's lines, and closes", () => {
    const p = props();
    const button = byTestId(render(p), "race-hint-log-open")!;
    expect(button.props["aria-label"]).toBe("Hint log (2)");
    expect(text(button.props.children as ReactNode)).toBe("2");
    click(button);
    const scene = byTestId(render(p), "race-3d")!;
    const shown = panel(scene.props.children as ReactNode)!;
    expect(shown.props.entries).toBe(LOG);
    expect(shown.props.paused).toBeFalsy();
    (shown.props.onClose as () => void)();
    expect(panel(render(p))).toBeUndefined();
  });

  it("belongs to the race it was opened in: the next race starts with it closed", () => {
    const p = props();
    click(byTestId(render(p), "race-hint-log-open"));
    expect(panel(render(p))).toBeDefined();
    expect(panel(render({ ...p, raceId: "race-2" }))).toBeUndefined();
  });

  it("opens from the pause sheet over the sheet, and closing goes back to the sheet", () => {
    const p = { ...props(), paused: true };
    const hints = sheet(render(p))!.props.hints as { label: string; open: () => void };
    expect(hints.label).toBe("Hints (2)");
    hints.open();
    const tree = render(p);
    const shown = panel(tree)!;
    expect(shown.props.paused).toBe(true);
    expect(String(shown.props.className)).toContain("overPause");
    expect(sheet(tree)).toBeDefined();
    // Markup order: the panel comes after the sheet, so it lies over it.
    const all = nodes(tree);
    expect(all.findIndex(node => node.type === RaceHintLogPanel)).toBeGreaterThan(all.findIndex(node => node.type === RacePauseSheet));
  });

  it("hides a log opened during the race while paused, so the pause sheet stays on top, and shows it again on Continue", () => {
    const p = props();
    click(byTestId(render(p), "race-hint-log-open"));
    const paused = render({ ...p, paused: true });
    expect(panel(paused)).toBeUndefined();
    expect(sheet(paused)).toBeDefined();
    expect(panel(render(p))).toBeDefined();
  });

  it("shows a log opened from the pause sheet only over the sheet", () => {
    const p = props();
    (sheet(render({ ...p, paused: true }))!.props.hints as { open: () => void }).open();
    expect(panel(render({ ...p, paused: true }))).toBeDefined();
    expect(panel(render(p))).toBeUndefined();
  });

  it("has no log entry without the page's log (the multiplayer and the replay)", () => {
    const p = { ...props(), hintLog: undefined };
    expect(byTestId(render(p), "race-hint-log-open")).toBeUndefined();
    expect(sheet(render({ ...p, paused: true }))!.props.hints).toBeUndefined();
  });
});

describe("race Settings: Hints and Graphics groups (F4)", () => {
  function settings(p: Props) {
    (sheet(render({ ...p, paused: true }))!.props.onSettings as () => void)();
    return render({ ...p, paused: true });
  }

  it("groups route, Pro trim, coach line and first race hints with the log and the gold rule", () => {
    const tree = settings(props());
    const group = byTestId(tree, "race-hints-group")!;
    const inGroup = group.props.children as ReactNode;
    for (const label of ["Route and hints", "Pro trim hints", "Coach line", "First race hints"]) expect(switchRow(inGroup, label), label).toBeDefined();
    expect(text(inGroup)).toContain("Gold needs a race without route and trim hints.");
    expect(text(byTestId(inGroup, "race-hint-log-settings")!.props.children as ReactNode)).toBe("Hint log (2)");
  });

  it("writes each new switch through the race preferences", () => {
    const p = props();
    const tree = settings(p);
    (switchRow(tree, "Coach line")!.props.onChange as (on: boolean) => void)(false);
    (switchRow(tree, "First race hints")!.props.onChange as (on: boolean) => void)(false);
    (switchRow(tree, "Softer light, clearer marks")!.props.onChange as (on: boolean) => void)(true);
    expect(p.updatePrefs).toHaveBeenNthCalledWith(1, { coachStrip: false });
    expect(p.updatePrefs).toHaveBeenNthCalledWith(2, { firstRaceHints: false });
    expect(p.updatePrefs).toHaveBeenNthCalledWith(3, { softLight: true });
    expect(switchRow(settings(props({ coachStrip: false, firstRaceHints: false, softLight: true })), "Coach line")!.props.checked).toBe(false);
    expect(switchRow(settings(props({ softLight: true })), "Softer light, clearer marks")!.props.checked).toBe(true);
    expect(byTestId(tree, "race-graphics-group")).toBeDefined();
  });

  it("switches the first race hints back on when asked to show them again", () => {
    const p = { ...props({ firstRaceHints: false }), onShowHintsAgain: vi.fn() };
    const again = byTestId(settings(p), "race-hints-again")!;
    click(nodes(again.props.children as ReactNode).find(node => node.type === "button"));
    expect(p.updatePrefs).toHaveBeenCalledWith({ firstRaceHints: true });
    expect(p.onShowHintsAgain).toHaveBeenCalled();
    const on = { ...props(), onShowHintsAgain: vi.fn() };
    click(nodes(byTestId(settings(on), "race-hints-again")!.props.children as ReactNode).find(node => node.type === "button"));
    expect(on.updatePrefs).not.toHaveBeenCalled();
  });

  it("opens the log from Settings", () => {
    const p = props();
    click(byTestId(settings(p), "race-hint-log-settings"));
    expect(panel(render({ ...p, paused: true }))).toBeDefined();
  });
});

describe("race Settings: Wind on the sails (F6)", () => {
  function settings(p: Props) {
    (sheet(render({ ...p, paused: true }))!.props.onSettings as () => void)();
    return render({ ...p, paused: true });
  }

  it("is a switch in the Graphics group, off by default, written through the race preferences", () => {
    const p = props();
    const graphics = byTestId(settings(p), "race-graphics-group")!.props.children as ReactNode;
    const row = switchRow(graphics, "Wind on the sails")!;
    expect(row.props.checked).toBe(false);
    expect(text(graphics)).toContain("coloured like telltales");
    (row.props.onChange as (on: boolean) => void)(true);
    expect(p.updatePrefs).toHaveBeenCalledWith({ sailFlow: true });
    expect(switchRow(settings(props({ sailFlow: true })), "Wind on the sails")!.props.checked).toBe(true);
  });
});
