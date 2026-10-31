import * as React from "react";
import { readFileSync } from "node:fs";
import { Children, isValidElement, type ComponentProps, type ReactElement, type ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { raceTrim, makeStandardCourse } from "@/lib/race-physics";
import { createRaceNavigationSnapshot, raceWindReading } from "@/features/race-hud/navigation-model";
import { RaceFeedbackLayer } from "@/features/race-hud/RaceFeedbackLayer";
import { createFeedbackState, postContact, postFeedback } from "@/features/race-hud/feedback";

// M1-3 contract: the start countdown is big over the scene (not a line in the
// dock); the feedback toasts and the contact frame sit in the scene above the
// HUD; the speed readout carries the polar target; the contact frame flashes
// only where motion is allowed.
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
const dockNotice = (tree: ReactNode) => nodes(tree).find(node => node.props.role === "status" && node.props.tabIndex === 0)!;
beforeEach(() => { hooks.cursor = 0; hooks.slots = []; hooks.lang = "en"; vi.stubGlobal("React", React); });
afterEach(() => { vi.unstubAllGlobals(); });

describe("race cockpit feedback (M1-3)", () => {
  it.each([[3, "3"], [1, "1"], [0, "Start"]])("draws the countdown %s big over the scene, not in the dock notice", (n, shown) => {
    const tree = render({ ...props(), countdown: n });
    const scene = byTestId(tree, "race-3d")!;
    const countdown = byTestId(scene.props.children as ReactNode, "race-countdown");
    expect(countdown, "countdown inside the scene").toBeDefined();
    expect(text(countdown!.props.children as ReactNode)).toBe(shown);
    expect(nodes(dockNotice(tree).props.children as ReactNode).some(node => node.type === "strong")).toBe(false);
    expect(byTestId(render(props()), "race-countdown")).toBeUndefined();
  });

  it("puts the bus toasts and the contact frame into the scene", () => {
    let bus = postFeedback(createFeedbackState(), { source: "rule", text: "Keep clear.", tone: "danger" }, 0);
    bus = postFeedback(bus, { source: "manoeuvre", text: "Tack: -1.2 kn", tone: "info" }, .5);
    bus = postContact(bus, .6, true);
    const tree = render({ ...props(), feedback: { toasts: bus.visible, contact: bus.contact } });
    const scene = byTestId(tree, "race-3d")!;
    const layer = nodes(scene.props.children as ReactNode).find(node => node.type === RaceFeedbackLayer)!;
    expect(layer.props.toasts).toBe(bus.visible);
    expect(layer.props.contact).toBe(bus.contact);
    // Without a bus the layer is still there, empty, so the live region stays mounted.
    const idle = nodes(render(props())).find(node => node.type === RaceFeedbackLayer)!;
    expect(idle.props).toMatchObject({ toasts: [], contact: null });
  });

  it.each([
    ["en", 6, "on", "Target speed"],
    ["ru", 7.5, "below", "Целевая скорость"],
    ["pl", 6.4, "near", "Prędkość docelowa"],
  ])("reads the %s speed against the polar target", (lang, target, state, label) => {
    hooks.lang = lang;
    const tree = render({ ...props(), targetSpeed: target });
    const speed = byTestId(tree, "race-speed")!;
    expect(nodes(speed.props.children as ReactNode).find(node => node.type === "strong")!.props["data-target"]).toBe(state);
    const shown = byTestId(speed.props.children as ReactNode, "race-target-speed")!;
    expect(text(shown.props.children as ReactNode)).toBe(`${label} / ${target.toFixed(1)}`);
    // No target in the no-go zone or when it is unknown.
    for (const none of [0, null, undefined]) {
      const bare = byTestId(render({ ...props(), targetSpeed: none }), "race-speed")!;
      expect(byTestId(bare.props.children as ReactNode, "race-target-speed")).toBeUndefined();
    }
  });
});

describe("feedback layer markup", () => {
  it("renders the toasts in bus order with their tone and a still frame for reduced motion", () => {
    let bus = postFeedback(createFeedbackState(), { source: "place", text: "Overtake! You're 2nd", tone: "success" }, 0);
    bus = postFeedback(bus, { source: "missed-mark", text: "Finish not counted.", tone: "danger" }, .2);
    const html = renderToStaticMarkup(<RaceFeedbackLayer toasts={bus.visible} contact={postContact(bus, .3, true).contact} />);
    expect(html.indexOf("Finish not counted.")).toBeLessThan(html.indexOf("Overtake!"));
    expect(html).toContain('data-tone="danger" data-source="missed-mark"');
    expect(html).toContain('data-tone="success" data-source="place"');
    expect(html).toContain('data-motion="static"');
    expect(html).toContain('role="status" aria-live="polite"');
    expect(renderToStaticMarkup(<RaceFeedbackLayer toasts={[]} contact={postContact(bus, .3, false).contact} />)).toContain('data-motion="flash"');
  });

  it("flashes only when motion is allowed, never in cyan, and reads at 16/24", () => {
    const css = readFileSync(new URL("../../features/race-hud/RaceFeedbackLayer.module.css", import.meta.url), "utf8");
    const motionBlock = css.slice(css.indexOf("@media (prefers-reduced-motion:no-preference)"));
    const outside = css.replace(motionBlock.slice(0, motionBlock.indexOf("}\n}") + 3), "");
    expect(motionBlock).toMatch(/\.contact\[data-motion=flash\] \{ animation:/);
    expect(outside).not.toMatch(/animation:/);
    expect(css).not.toMatch(/accent-cyan/);
    expect(css).toMatch(/\.toast \{[^}]*font-size:16px; line-height:24px;/);
    expect(css).toMatch(/\.layer \{[^}]*pointer-events:none;/);
  });
});
