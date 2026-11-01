import * as React from "react";
import { readFileSync } from "node:fs";
import { Children, isValidElement, type ComponentProps, type ReactElement, type ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { raceTrim, makeStandardCourse } from "@/lib/race-physics";
import { createRaceNavigationSnapshot, raceWindReading } from "@/features/race-hud/navigation-model";

// F2 (TestFlight 74 feedback, 2026-10-31): "the helm is not fixed, easy to
// scroll and lose it" and "everything is so small it is barely readable".
// Contract: while racing, the Helm panel is never a scroll container and takes
// no pan or zoom gesture (only the wheels move), the page itself does not
// scroll, the other tabs scroll inside their own panel, and the dock's text is
// at least 16 px (secondary 14 px) with a 22 px Settings icon.
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
import { GearIcon } from "@/features/trainer-controls/GearIcon";
import styles from "./RaceCockpit.module.css";

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

describe("pinned helm (F2)", () => {
  it("pins the Helm panel and lets the other tabs scroll in their own panel", () => {
    const p = props();
    let tree = render(p);
    const helm = byTestId(tree, "race-dock-panel")!;
    expect(helm.props["data-pinned"]).toBe(true);
    expect(String(helm.props.className).split(" ")).toContain(styles.pinned);
    for (const index of [1, 2, 3]) {
      (tabButton(render(p), index).props.onClick as () => void)();
      tree = render(p);
      const panel = byTestId(tree, "race-dock-panel")!;
      expect(panel.props["data-pinned"], `tab ${index}`).toBeUndefined();
      expect(String(panel.props.className).split(" ")).not.toContain(styles.pinned);
    }
    (tabButton(render(p), 0).props.onClick as () => void)();
    expect(byTestId(render(p), "race-dock-panel")!.props["data-pinned"]).toBe(true);
  });

  it("draws the Settings tab icon at 22 px", () => {
    const gear = nodes(render(props())).find(node => node.type === GearIcon);
    expect(gear?.props.size).toBe(22);
  });
});

const strip = (source: string) => source.replace(/\/\*[\s\S]*?\*\//g, "");
const css = strip(readFileSync(new URL("./RaceCockpit.module.css", import.meta.url), "utf8"));
/** Every declaration block whose selector list contains exactly `selector`. */
const rules = (selector: string, source = css) => source.split("}")
  .filter(block => block.includes("{") && block.split("{").at(-2)!.split(",").some(part => part.trim().split(/\s+/).join(" ") === selector))
  .map(block => block.split("{").at(-1)!).join(";");
const sizes = (declarations: string) => [...declarations.matchAll(/font-size:\s*(\d+(?:\.\d+)?)px/g)].map(match => Number(match[1]));

describe("pinned helm and readable dock CSS (F2)", () => {
  it("never scrolls the pinned Helm panel or lets a drag on it pan or zoom", () => {
    const pinned = rules(".panel.pinned");
    expect(pinned).toMatch(/overflow:\s*hidden/);
    expect(pinned).toMatch(/touch-action:\s*none/);
    expect(pinned).toMatch(/overscroll-behavior:\s*none/);
    // It also beats the older ".panel:has(.wheels) { overflow-y:auto }".
    expect(rules(".panel.pinned:has(.wheels)")).toMatch(/overflow:\s*hidden/);
    expect(css.lastIndexOf(".panel.pinned")).toBeGreaterThan(css.lastIndexOf(".panel:has(.wheels) { overflow-y:auto"));
    // The cockpit allows vertical panning only: no pinch or double-tap zoom.
    expect(rules(".cockpit")).toMatch(/touch-action:\s*pan-y/);
    expect(rules(".panel:not(.pinned)")).toMatch(/touch-action:\s*pan-y/);
  });

  it("stops the page itself from scrolling during the game layer", () => {
    const globals = strip(readFileSync(new URL("../globals.css", import.meta.url), "utf8"));
    const lock = rules("body[data-game-layer]", globals);
    expect(lock).toMatch(/overflow:\s*hidden/);
    expect(lock).toMatch(/overscroll-behavior:\s*none/);
    expect(rules("html:has(body[data-game-layer])", globals)).toMatch(/overflow:\s*hidden/);
    // The multiplayer race keeps the site header but locks the page the same way.
    expect(rules("body[data-race-scroll-lock]", globals)).toMatch(/overflow:\s*hidden/);
    expect(rules("html:has(body[data-race-scroll-lock])", globals)).toMatch(/overflow:\s*hidden/);
  });

  it("lays the Pro sliders out to fit the pinned panel, which no longer scrolls to reveal a clipped one", () => {
    const sliders = rules(".pinned .sliders");
    expect(sliders).toMatch(/flex-direction:\s*column/);
    expect(sliders).toMatch(/min-height:\s*100%/);
    const row = rules(".pinned .sliders .range");
    expect(row).toMatch(/display:\s*grid/);
    expect(row).toMatch(/margin:\s*0/);
  });

  it("wraps whole Settings choice buttons instead of letting a word spill past its button", () => {
    expect(rules(".segmented")).toMatch(/flex-wrap:\s*wrap/);
    const button = rules(".segmented button");
    expect(button).toMatch(/min-width:\s*auto/);
    expect(button).not.toMatch(/min-width:\s*0/);
  });

  it("keeps dock text at 16 px and secondary text at 14 px or larger", () => {
    for (const selector of [".cockpit button", ".notice", ".tabs button", ".range", ".toggle", ".fleet li", ".mapPanel h2"]) {
      const found = sizes(rules(selector));
      expect(found.length, selector).toBeGreaterThan(0);
      expect(Math.min(...found), selector).toBeGreaterThanOrEqual(16);
    }
    // Wheel captions on the Helm tab (scoped to the race over the shared deck),
    // the Map legend, the status-row units and the multiplayer metric labels.
    const caption = ':global([data-testid="wheel-deck"] [role="slider"] > div';
    expect(Math.min(...sizes(rules(`.wheels ${caption} b)`)))).toBeGreaterThanOrEqual(16);
    for (const selector of [".trimAdvice", ".options p", `.wheels ${caption})`, `.wheels ${caption} small)`, ".mapPanel figcaption", ".readout small", ".metrics>div>span", ".metrics>div>strong>small"]) {
      const found = sizes(rules(selector));
      expect(found.length, selector).toBeGreaterThan(0);
      expect(Math.min(...found), selector).toBeGreaterThanOrEqual(14);
    }
    // No media query shrinks the coach line again (it was 10-11 px in build 74).
    expect(css).not.toMatch(/\.notice\s*\{[^}]*font-size:\s*1[0-3]px/);
    expect(css).not.toMatch(/\.trimAdvice\s*\{[^}]*font-size:\s*1[0-3]px/);
    expect(css).not.toMatch(/\.metrics[^{]*\{[^}]*font-size:\s*1[0-3]px/);
  });

  it("keeps the wheel captions inside the 50 px the shared deck reserves", () => {
    const lineHeight = (declarations: string) => Number(declarations.match(/line-height:\s*(\d+)px/)?.[1]);
    const caption = ':global([data-testid="wheel-deck"] [role="slider"] > div';
    const value = lineHeight(rules(`.wheels ${caption})`)), name = lineHeight(rules(`.wheels ${caption} b)`)), unit = lineHeight(rules(`.wheels ${caption} small)`));
    // Helm: name, value, unit. Sheet: a name that wraps to two lines, value.
    expect(name + value + unit).toBeLessThanOrEqual(50);
    expect(2 * name + value).toBeLessThanOrEqual(50);
  });

  it("caps the floating portrait coach line so the boat stays in view", () => {
    const portrait = css.slice(css.lastIndexOf("@media(max-width:767px) and (orientation:portrait)"));
    expect(rules(".gameLayer .notice", portrait)).toMatch(/max-height:\s*80px/);
  });
});
