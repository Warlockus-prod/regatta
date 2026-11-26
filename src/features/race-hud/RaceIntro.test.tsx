import * as React from "react";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { Children, isValidElement, type ReactElement, type ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// Contract (F5): the race intro is four cards. Before the first race the
// header says Skip and the last card's one primary action is Start race; on
// request the header says Close and the last card Got it. Next and Back move
// between cards, Esc skips or closes, and no key reaches the race underneath,
// also when a tap left the focus on the page body: the sheet catches every key
// first, on the window, and Tab from outside comes back into it. The page
// behind is inert while it is open. Each card has its own schematic picture,
// hidden from screen readers, and the dialog is named by the card title and
// described by its text. From multiplayer it leaves out Pro and the hint log.
const hooks = vi.hoisted(() => ({ cursor: 0, slots: [] as unknown[], lang: "en", ids: 0, effects: [] as (() => void | (() => void))[] }));
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
  useId: () => `id${hooks.ids++}`,
  useEffect: (effect: () => void | (() => void)) => { hooks.effects.push(effect); },
}));
vi.mock("@/lib/i18n", () => ({ useI18n: () => ({ lang: hooks.lang, tl: (value: Record<string, string>) => value[hooks.lang] }) }));
import { RaceIntro, inertOutside, type RaceIntroProps } from "./RaceIntro";

type Node = ReactElement<Record<string, unknown>>;
function nodes(tree: ReactNode): Node[] {
  return Children.toArray(tree).filter(isValidElement).flatMap(element => {
    const node = element as Node;
    return [node, ...nodes(node.props.children as ReactNode)];
  });
}
const byTestId = (tree: ReactNode, id: string) => nodes(tree).find(node => node.props["data-testid"] === id);
const render = (p: RaceIntroProps) => { hooks.cursor = 0; return RaceIntro(p); };
const markup = (p: RaceIntroProps) => { hooks.cursor = 0; return renderToStaticMarkup(<RaceIntro {...p} />); };
const click = (tree: ReactNode, id: string) => {
  const node = byTestId(tree, id);
  expect(node, id).toBeDefined();
  (node!.props.onClick as () => void)();
};
// The page around the sheet: the window's key listeners and the focus, on the body by default.
type Listener = { type: string; fn: (e: unknown) => void; capture: unknown };
const page = { listeners: [] as Listener[], removed: [] as Listener[], body: { tag: "body" } as object, active: null as unknown };
/** Renders the sheet as it opens: its effects run once, as on mount, and their cleanups are returned. */
const mount = (p: RaceIntroProps) => {
  hooks.effects = [];
  const tree = render(p);
  const cleanups = hooks.effects.map(effect => effect()).filter((c): c is () => void => typeof c === "function");
  return { tree, unmount: () => cleanups.forEach(c => c()) };
};
const key = (value: string, shiftKey = false) => {
  const event = { key: value, shiftKey, preventDefault: vi.fn(), stopImmediatePropagation: vi.fn() };
  const listeners = page.listeners.filter(l => l.type === "keydown");
  expect(listeners).toHaveLength(1);
  listeners[0].fn(event);
  return event;
};
beforeEach(() => {
  hooks.cursor = 0; hooks.slots = []; hooks.lang = "en"; hooks.ids = 0; hooks.effects = [];
  page.listeners = []; page.removed = []; page.active = page.body;
  vi.stubGlobal("React", React);
  vi.stubGlobal("HTMLElement", class {});
  vi.stubGlobal("window", {
    addEventListener: (type: string, fn: (e: unknown) => void, capture: unknown) => { page.listeners.push({ type, fn, capture }); },
    removeEventListener: (type: string, fn: (e: unknown) => void, capture: unknown) => {
      page.removed.push({ type, fn, capture }); page.listeners = page.listeners.filter(l => !(l.type === type && l.fn === fn && l.capture === capture));
    },
  });
  vi.stubGlobal("document", { get activeElement() { return page.active; }, body: page.body });
});
afterEach(() => { vi.unstubAllGlobals(); });

describe("the race intro before the first race", () => {
  it("walks four cards to Start race, the one primary action of the last card", () => {
    const onEnd = vi.fn();
    const p: RaceIntroProps = { open: "first", pro: false, onEnd };
    const cards: string[] = [];
    let tree = render(p);
    for (let i = 0; i < 3; i++) {
      const sheet = nodes(tree).find(node => node.props.role === "dialog")!;
      cards.push(sheet.props["data-card"] as string);
      expect(byTestId(tree, "race-intro-start")).toBeUndefined();
      click(tree, "race-intro-next");
      tree = render(p);
    }
    expect(markup(p)).toContain("Step 4 of 4");
    cards.push(nodes(tree).find(node => node.props.role === "dialog")!.props["data-card"] as string);
    expect(cards).toEqual(["goal", "steer", "wind", "hud"]);
    expect(byTestId(tree, "race-intro-next")).toBeUndefined();
    const primaries = nodes(tree).filter(node => node.type === "button" && String(node.props.className).includes("primary"));
    expect(primaries.map(node => node.props["data-testid"])).toEqual(["race-intro-start"]);
    expect(markup(p)).toContain(">Start the race</button>");
    click(tree, "race-intro-start");
    expect(onEnd).toHaveBeenCalledWith("start");
  });

  it("skips from any card with one tap or Esc, and keeps every key out of the race with the focus on the page body", () => {
    const onEnd = vi.fn();
    const p: RaceIntroProps = { open: "first", pro: false, onEnd };
    expect(markup(p)).toContain(">Skip</button>");
    click(render(p), "race-intro-skip");
    expect(onEnd).toHaveBeenLastCalledWith("skip");
    const sheet = mount(p);
    // One listener, on the window's capture phase: it runs before the race's own window listener.
    expect(page.listeners).toEqual([expect.objectContaining({ type: "keydown", capture: true })]);
    expect(page.active).toBe(page.body);
    const esc = key("Escape");
    expect(onEnd).toHaveBeenLastCalledWith("skip");
    expect(esc.stopImmediatePropagation).toHaveBeenCalled();
    expect(esc.preventDefault).toHaveBeenCalled();
    for (const value of ["p", "P", "ArrowUp", " ", "q"]) expect(key(value).stopImmediatePropagation, value).toHaveBeenCalled();
    expect(onEnd).toHaveBeenCalledTimes(2);
    sheet.unmount();
    expect(page.listeners).toEqual([]);
    expect(page.removed).toEqual([expect.objectContaining({ type: "keydown", capture: true })]);
  });

  it("moves with the arrow keys and Back", () => {
    const p: RaceIntroProps = { open: "first", pro: false, onEnd: vi.fn() };
    mount(p);
    key("ArrowLeft");
    expect(markup(p)).toContain("Step 1 of 4");
    expect(byTestId(render(p), "race-intro-back")).toBeUndefined();
    key("ArrowRight");
    expect(markup(p)).toContain("Step 2 of 4");
    click(render(p), "race-intro-back");
    expect(markup(p)).toContain("Step 1 of 4");
  });

  it("brings Tab from outside back into the sheet and keeps it there", () => {
    const p: RaceIntroProps = { open: "first", pro: false, onEnd: vi.fn() };
    const { tree } = mount(p);
    const head = { focus: vi.fn() }, tail = { focus: vi.fn() };
    const dialog = nodes(tree).find(node => node.props.role === "dialog")!;
    expect(dialog.props.tabIndex).toBe(-1);
    const sheet: { querySelectorAll: () => unknown[]; contains: (n: unknown) => boolean } = { querySelectorAll: () => [head, tail], contains: n => n === sheet || n === head || n === tail };
    (dialog.props.ref as { current: unknown }).current = sheet;
    expect(key("Tab").preventDefault).toHaveBeenCalled();
    expect(head.focus).toHaveBeenCalledTimes(1);
    key("Tab", true);
    expect(tail.focus).toHaveBeenCalledTimes(1);
    page.active = tail;
    key("Tab");
    expect(head.focus).toHaveBeenCalledTimes(2);
    page.active = head;
    expect(key("Tab").preventDefault).not.toHaveBeenCalled();
    // A tap on the card text focuses the sheet itself: Tab goes on to its first button.
    page.active = sheet;
    key("Tab");
    expect(head.focus).toHaveBeenCalledTimes(3);
  });
});

describe("the race intro on request", () => {
  it("says Close and ends on Got it, never Start race", () => {
    const onEnd = vi.fn();
    const p: RaceIntroProps = { open: "race", pro: true, onEnd };
    expect(markup(p)).toContain(">Close</button>");
    mount(p);
    for (let i = 0; i < 3; i++) click(render(p), "race-intro-next");
    const tree = render(p);
    expect(byTestId(tree, "race-intro-start")).toBeUndefined();
    click(tree, "race-intro-done");
    expect(onEnd).toHaveBeenLastCalledWith("done");
    key("Escape");
    expect(onEnd).toHaveBeenLastCalledWith("close");
  });

  it("from multiplayer leaves out Pro, its sheets and the hint log", () => {
    const card = (open: RaceIntroProps["open"], n: number) => {
      hooks.slots = [];
      const p: RaceIntroProps = { open, pro: true, onEnd: vi.fn() };
      for (let i = 0; i < n; i++) click(render(p), "race-intro-next");
      return markup(p);
    };
    const steer = card("multiplayer", 1), hud = card("multiplayer", 3);
    expect(steer).toContain("In an online race the sails trim themselves");
    for (const html of [steer, hud]) {
      const text = html.match(/<h2[^>]*>.*<\/p>/)![0];
      expect(text).not.toMatch(/\bPro\b|sheet|hint log|bulb/);
    }
    expect(card("lobby", 3)).toContain("The bulb by the coach line opens the race&#x27;s hint log.");
    expect(card("lobby", 1)).toContain("In Pro the mainsheet");
  });
});

describe("the page behind", () => {
  type Fake = { name: string; inert: boolean; parentElement: Fake | null; children: Fake[];
    hasAttribute: (n: string) => boolean; setAttribute: (n: string, v: string) => void; removeAttribute: (n: string) => void };
  const el = (name: string, parent: Fake | null, inert = false): Fake => {
    const node: Fake = { name, inert, parentElement: parent, children: [],
      hasAttribute: () => node.inert, setAttribute: () => { node.inert = true; }, removeAttribute: () => { node.inert = false; } };
    parent?.children.push(node);
    return node;
  };
  it("is inert while the sheet is open, and only what the sheet changed comes back", () => {
    const body = el("body", null);
    page.body = body;
    vi.stubGlobal("document", { activeElement: null, body });
    const nav = el("nav", body), root = el("root", body), dialog = el("already-inert", body, true);
    const menu = el("menu", root), layer = el("layer", root);
    const restore = inertOutside(layer);
    expect([nav, menu, dialog].map(n => n.inert)).toEqual([true, true, true]);
    expect([root, layer, body].map(n => n.inert)).toEqual([false, false, false]);
    restore();
    expect([nav, menu, root, layer].map(n => n.inert)).toEqual([false, false, false, false]);
    expect(dialog.inert).toBe(true);
    page.body = { tag: "body" };
  });
});

describe("cards and pictures", () => {
  it("names the dialog by the card title, describes it by the text and hides the picture", () => {
    const html = markup({ open: "first", pro: false, onEnd: vi.fn() });
    expect(html).toMatch(/role="dialog" aria-modal="true" aria-labelledby="id0" aria-describedby="id1"/);
    expect(html).toContain('<h2 id="id0">The goal: start, windward mark, finish</h2>');
    expect(html).toMatch(/<p id="id1">Cross the start line after the signal/);
    expect(html).toMatch(/class="[^"]*picture[^"]*" aria-hidden="true"><svg[^>]*data-testid="race-intro-picture-goal"/);
  });

  it("draws its own picture on every card", () => {
    const p: RaceIntroProps = { open: "first", pro: true, onEnd: vi.fn() };
    const pictures: string[] = [];
    for (let i = 0; i < 4; i++) {
      pictures.push(markup(p).match(/data-testid="(race-intro-picture-[a-z]+)"/)![1]);
      if (i < 3) click(render(p), "race-intro-next");
    }
    expect(pictures).toEqual(["race-intro-picture-goal", "race-intro-picture-steer", "race-intro-picture-wind", "race-intro-picture-hud"]);
  });

  it("tells a Pro player the sheets are theirs and a Simple player that the sails trim themselves", () => {
    const steer = (pro: boolean) => {
      hooks.slots = [];
      const p: RaceIntroProps = { open: "first", pro, onEnd: vi.fn() };
      click(render(p), "race-intro-next");
      return markup(p);
    };
    expect(steer(true)).toContain("In Pro the mainsheet and the jib sheet sit beside the helm: trim and ease them");
    expect(steer(false)).toContain("In Simple mode the sails trim themselves.");
  });

  it("reads in every language", () => {
    for (const lang of ["ru", "pl", "es", "fr", "de", "it"]) {
      hooks.lang = lang; hooks.slots = [];
      const html = markup({ open: "first", pro: false, onEnd: vi.fn() });
      expect(html, lang).not.toContain("The goal");
      expect(html).toMatch(/<h2 id="id\d+">\S/);
    }
  });

  it("keeps body text at 16 px, the step at 14 px, buttons 44 px and adds no animation", () => {
    const css = readFileSync(join(process.cwd(), "src/features/race-hud/RaceIntro.module.css"), "utf8");
    expect(css).toMatch(/\.text p \{[^}]*font-size:16px; line-height:24px/);
    expect(css).toMatch(/\.step \{[^}]*font-size:14px/);
    expect(css).toMatch(/\.secondary,\.primary \{[^}]*min-height:48px; min-width:44px/);
    expect(css).toMatch(/\.head \.secondary \{ min-height:44px; \}/);
    expect(css).not.toMatch(/animation:|transition:|@keyframes/);
  });
});
