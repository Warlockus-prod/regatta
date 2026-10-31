import * as React from "react";
import { Children, isValidElement, type ComponentProps, type ReactElement, type ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { raceTrim, makeStandardCourse } from "@/lib/race-physics";
import { createRaceNavigationSnapshot, raceWindReading } from "@/features/race-hud/navigation-model";
import { RaceHapticsToggle } from "@/features/race-hud/RaceHapticsToggle";
import { RaceSoundToggle } from "@/features/race-hud/RaceSoundToggle";

// M3-4 contract: the vibration switch sits beside race sound in the pause
// sheet and in the Settings tab, bound to the stored choice, and is absent
// where the device cannot vibrate (no haptics prop).
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
  return { children: <div data-testid="actual-scene" />, prefs: { mode: "simple", guidance: false, trimHints: false, rules: true, penalties: false, windDisplay: "compass", miniMap: true }, updatePrefs: vi.fn(),
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

const soundSlot = (placement: string) => <RaceSoundToggle on onChange={() => undefined} showLabel={placement === "pause"} />;
const sheet = (tree: ReactNode) => nodes(tree).find(node => node.type === RacePauseSheet);
// The settings rows are the cockpit's Toggle elements: { label, checked, onChange }.
const switchRow = (tree: ReactNode, label: string) => nodes(tree).find(node => node.props.label === label && "checked" in node.props);
function openSettings(p: ComponentProps<typeof RaceCockpit>) {
  (sheet(render(p))!.props.onSettings as () => void)();
  return render(p);
}

describe("race vibration switch (M3-4)", () => {
  it("adds the vibration row after the race sound row in the pause sheet", () => {
    const setOn = vi.fn();
    const tree = render({ ...props(), paused: true, raceSoundToggle: soundSlot, haptics: { on: true, setOn } });
    const extras = nodes(sheet(tree)!.props.sound as ReactNode);
    const sound = extras.findIndex(node => node.type === RaceSoundToggle), haptics = extras.findIndex(node => node.type === RaceHapticsToggle);
    expect(sound).toBeGreaterThanOrEqual(0);
    expect(haptics).toBeGreaterThan(sound);
    expect(extras[haptics].props.on).toBe(true);
    (extras[haptics].props.onChange as (on: boolean) => void)(false);
    expect(setOn).toHaveBeenCalledWith(false);
  });

  it("puts a Vibration switch in the Settings tab bound to the choice", () => {
    const setOn = vi.fn();
    const tree = openSettings({ ...props(), paused: true, raceSoundToggle: soundSlot, haptics: { on: false, setOn } });
    const row = switchRow(tree, "Vibration");
    expect(row, "settings row").toBeDefined();
    expect(row!.props.checked).toBe(false);
    (row!.props.onChange as (on: boolean) => void)(true);
    expect(setOn).toHaveBeenCalledWith(true);
    // Right after the race sound switch.
    const rows = nodes(tree).filter(node => typeof node.props.label === "string" && "checked" in node.props).map(node => node.props.label);
    expect(rows.indexOf("Vibration")).toBe(rows.indexOf("Sound") + 1);
  });

  it("shows no vibration switch where the device cannot vibrate", () => {
    const p = { ...props(), paused: true, raceSoundToggle: soundSlot };
    expect(nodes(sheet(render(p))!.props.sound as ReactNode).some(node => node.type === RaceHapticsToggle)).toBe(false);
    expect(switchRow(openSettings(p), "Vibration")).toBeUndefined();
  });
});
