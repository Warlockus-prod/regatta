import * as React from "react";
import { Children, isValidElement, type ComponentProps, type ReactElement, type ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { raceTrim, makeStandardCourse } from "@/lib/race-physics";
import { createRaceNavigationSnapshot, raceWindReading } from "@/features/race-hud/navigation-model";

// M2-1 contract: a tap on the scene canvas steps to the next camera (orbit ->
// behind -> above -> orbit); a drag, a pinch, a long press or a tap on a HUD
// button over the scene does not; the status row has a named camera button
// that does the same for keyboard and screen readers.
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
import { RACE_CAMERA_SWITCH, RaceCockpit, sceneTapHandlers } from "./RaceCockpit";
import { createTapTracker } from "@/features/race-scene/camera";

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
class FakeCanvas {}
beforeEach(() => { hooks.cursor = 0; hooks.slots = []; hooks.lang = "en"; vi.stubGlobal("React", React); vi.stubGlobal("HTMLCanvasElement", FakeCanvas); });
afterEach(() => { vi.unstubAllGlobals(); });


type Handlers = ReturnType<typeof sceneTapHandlers>;
const pointer = (id: number, x: number, y: number, t: number, target: unknown, extra: { isPrimary?: boolean; button?: number } = {}) =>
  ({ pointerId: id, clientX: x, clientY: y, timeStamp: t, target, isPrimary: extra.isPrimary ?? true, button: extra.button ?? 0 });
function press(h: Handlers, id: number, from: [number, number], to: [number, number], ms: number, target: unknown, extra?: { isPrimary?: boolean; button?: number }) {
  h.onPointerDown(pointer(id, from[0], from[1], 1000, target, extra));
  h.onPointerMove(pointer(id, to[0], to[1], 1000 + ms / 2, target, extra));
  h.onPointerUp(pointer(id, to[0], to[1], 1000 + ms, target, extra));
}

describe("race camera switch (M2-1)", () => {
  it("wires the scene so a tap on the canvas steps to the next camera", () => {
    for (const [camera, next] of [["orbit", "stern"], ["stern", "high"], ["high", "orbit"]] as const) {
      const setCamera = vi.fn();
      hooks.slots = [];
      const scene = byTestId(render({ ...props(), camera, setCamera }), "race-3d")!;
      const h = scene.props as unknown as Handlers;
      press(h, 1, [100, 100], [102, 101], 120, new FakeCanvas());
      expect(setCamera).toHaveBeenCalledTimes(1);
      expect(setCamera).toHaveBeenCalledWith(next);
    }
  });

  it("does not switch on a drag, a long press, a pinch, the right button or a HUD button", () => {
    const onTap = vi.fn();
    const tracker = createTapTracker();
    const h = sceneTapHandlers(() => tracker, onTap);
    const canvas = new FakeCanvas();
    press(h, 1, [100, 100], [160, 100], 200, canvas); // orbit drag
    press(h, 2, [100, 100], [100, 100], 900, canvas); // look around, held
    press(h, 3, [100, 100], [100, 100], 100, canvas, { button: 2 });
    press(h, 4, [100, 100], [100, 100], 100, { tagName: "BUTTON" }); // the Menu or the mini map over the scene
    const hud = { tagName: "BUTTON" };
    h.onPointerDown(pointer(8, 100, 100, 0, hud)); h.onPointerUp(pointer(8, 100, 100, 50, canvas)); // pressed on the HUD, let go over the water
    h.onPointerDown(pointer(9, 100, 100, 0, canvas)); h.onPointerUp(pointer(9, 100, 100, 50, hud)); // pressed on the water, let go on the HUD
    h.onPointerDown(pointer(5, 100, 100, 0, canvas));
    h.onPointerDown(pointer(6, 200, 200, 10, canvas, { isPrimary: false }));
    h.onPointerUp(pointer(6, 190, 190, 60, canvas, { isPrimary: false }));
    h.onPointerUp(pointer(5, 100, 100, 70, canvas)); // pinch
    expect(onTap).not.toHaveBeenCalled();
    press(h, 7, [100, 100], [101, 100], 100, canvas);
    expect(onTap).toHaveBeenCalledTimes(1);
  });

  it.each([["en", "Switch camera: Behind"], ["ru", "Сменить камеру: За кормой"], ["pl", "Zmień kamerę: Za rufą"]])(
    "names the status-row camera button with the current camera in %s, 44 px, and steps the cycle", (lang, name) => {
      hooks.lang = lang;
      const setCamera = vi.fn();
      const row = byTestId(render({ ...props(), camera: "stern", setCamera }), "race-status-row")!;
      const button = byTestId(row.props.children as ReactNode, "race-camera-cycle")!;
      expect(button.props["aria-label"]).toBe(name);
      expect(String(button.props.className)).toMatch(/min-h-11 min-w-11/);
      expect(String(button.props.className)).not.toMatch(/cyan/);
      (button.props.onClick as () => void)();
      expect(setCamera).toHaveBeenCalledWith("high");
      expect(Object.keys(RACE_CAMERA_SWITCH)).toEqual(["ru", "en", "pl", "es", "fr", "de", "it"]);
    });
});
