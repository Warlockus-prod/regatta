import { renderToStaticMarkup } from "react-dom/server";
import * as React from "react";
import { Children, isValidElement, type ComponentProps, type ReactElement, type ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// M4-3 contract: the replay opened from the results plays on open, and at a
// moment opens 5 s before it; it has the speeds 0.5x-4x with the one that is
// on pressed, the race cameras and the event ribbon whose buttons jump to
// 5 s before their event. The e2e selectors (e2e/replay.spec.ts) stay: one
// slider, one output, a "2×" button, a "Camera" picker.
const i18n = vi.hoisted(() => ({ lang: "en" }));
vi.mock("next/dynamic", () => ({ default: () => () => null }));
vi.mock("@/lib/i18n", () => ({ useI18n: () => ({ lang: i18n.lang, tl: (text: Record<string, string>) => text[i18n.lang] ?? text.en }) }));
vi.mock("@/features/venues/useVenue", () => ({ useVenue: () => ({ venue: { id: "gocek" } }) }));
vi.mock("@/features/race-3d/useRaceView", () => ({ useRaceView: () => ({ camera: "orbit", setCamera: () => {} }) }));
vi.mock("@/lib/diagnostics-controls", () => ({ recordControlChange: () => {}, recordDiagnostic: () => {} }));
vi.mock("@/lib/diagnostics-bridge", () => ({ initializeDiagnosticBridge: () => {} }));
import { RaceReplay, ReplayControls, ribbonItemText } from "./RaceReplay";
import { replayRibbon, type ReplayRibbonItem } from "@/lib/race-replay-teaching";

type Node = ReactElement<Record<string, unknown>>;
function nodes(tree: ReactNode): Node[] {
  return Children.toArray(tree).filter(isValidElement).flatMap(element => {
    const node = element as Node;
    return [node, ...nodes(node.props.children as ReactNode)];
  });
}
const text = (tree: ReactNode): string =>
  Children.toArray(tree).map(node => isValidElement(node) ? text((node.props as { children?: ReactNode }).children) : String(node)).join("");

const samples = Array.from({ length: 121 }, (_, i) => ({ t: i * 0.5, x: 500, y: 1200 - i, heading: i < 20 ? 315 : 45, twa: i < 20 ? -45 : 45, speed: i >= 20 && i <= 24 ? 4.4 : 5, lap: 0 }));
const events = [{ type: "start", t: 0 }, { type: "tack", t: 10 }, { type: "mark-rounded", t: 50 }];
const replayProps = { samples, course: {} as ComponentProps<typeof RaceReplay>["course"], onClose: () => {}, events };
const ribbon = replayRibbon({ samples, events, judgeItems: [{ id: "j", time: 31, kind: "give-way" }] });

function controls(patch: Partial<ComponentProps<typeof ReplayControls>> = {}) {
  const props: ComponentProps<typeof ReplayControls> = { playing: false, time: 0, first: 0, total: 60, rate: 1, ribbon,
    onPlay: vi.fn(), onSeek: vi.fn(), onRate: vi.fn(), onJump: vi.fn(), ...patch };
  return { props, tree: ReplayControls(props) };
}

beforeEach(() => { i18n.lang = "en"; vi.stubGlobal("React", React); });
afterEach(() => { vi.unstubAllGlobals(); });

describe("teaching replay (M4-3)", () => {
  it("plays on open from the results and opens 5 s before a moment", () => {
    const opened = renderToStaticMarkup(<RaceReplay {...replayProps} autoplay startAt={40} />);
    expect(opened).toContain('data-testid="replay-play">Pause</button>');
    expect(opened).toContain("<output>0:35</output>");
    const plain = renderToStaticMarkup(<RaceReplay {...replayProps} />);
    expect(plain).toContain('data-testid="replay-play">Resume</button>');
    expect(plain).toContain("<output>0:00</output>");
    // A moment before the recording opens at its start, not before it.
    expect(renderToStaticMarkup(<RaceReplay {...replayProps} autoplay startAt={2} />)).toContain("<output>0:00</output>");
  });

  it("keeps the e2e selectors: one slider, one output, the speed buttons and the camera picker", () => {
    const html = renderToStaticMarkup(<RaceReplay {...replayProps} />);
    expect(html.match(/type="range"/g)).toHaveLength(1);
    expect(html.match(/<output>/g)).toHaveLength(1);
    expect(html.match(/aria-pressed="(true|false)"/g)).toHaveLength(4);
    expect(html).toMatch(/aria-pressed="true"[^>]*>1×<\/button>/);
    expect(html).toContain(">2×</button>");
    expect(html).toMatch(/<select[^>]*aria-label="Camera"/);
    // The race's camera switch, named with the camera that is on.
    expect(html).toMatch(/data-testid="replay-camera-cycle" aria-label="Switch camera: Around the boat"/);
    expect(html).toContain('data-testid="replay-ribbon"');
  });

  it("the speed buttons pick 0.5x, 1x, 2x and 4x and only the one that is on is cyan", () => {
    const { props, tree } = controls({ rate: 2 });
    const speed = nodes(tree).filter(n => n.type === "button" && "aria-pressed" in n.props);
    expect(speed.map(n => text(n.props.children as ReactNode))).toEqual(["0.5×", "1×", "2×", "4×"]);
    // The language's own decimal mark, as on the ribbon; "2×" stays for the e2e.
    i18n.lang = "ru";
    const ru = nodes(controls({ rate: 2 }).tree).filter(n => n.type === "button" && "aria-pressed" in n.props);
    expect(ru.map(n => text(n.props.children as ReactNode))).toEqual(["0,5×", "1×", "2×", "4×"]);
    i18n.lang = "en";
    expect(speed.map(n => n.props["aria-pressed"])).toEqual([false, false, true, false]);
    expect(speed.map(n => JSON.stringify(n.props.style).includes("--accent-cyan"))).toEqual([false, false, true, false]);
    (speed[3].props.onClick as () => void)();
    expect(props.onRate).toHaveBeenCalledWith(4);
    (speed[0].props.onClick as () => void)();
    expect(props.onRate).toHaveBeenLastCalledWith(0.5);
  });

  it("a ribbon button jumps to its event's target and the event the replay is at is marked", () => {
    const { props, tree } = controls({ time: 26 });
    const items = nodes(tree).filter(n => n.type === "button" && "data-kind" in n.props);
    expect(items.map(n => n.props["data-kind"])).toEqual(["start", "tack", "judge", "mark"]);
    expect(items.map(n => text(n.props.children as ReactNode))).toEqual(["0:00 Start", "0:10 Tack, lost 0.6 kn", "0:31 You had to keep clear", "0:50 Windward mark"]);
    // At 26 s the tack (10 s) has happened, the judge item (31 s) not yet:
    // an event is never marked before it happens.
    expect(items.map(n => n.props["aria-current"])).toEqual([undefined, "true", undefined, undefined]);
    // Jumped to the judge item (26 s is its target): it is the one marked.
    const pinned = nodes(controls({ time: 26, pinned: "judge-j" }).tree).filter(n => n.type === "button" && "data-kind" in n.props);
    expect(pinned.map(n => n.props["aria-current"])).toEqual([undefined, undefined, "true", undefined]);
    (items[1].props.onClick as () => void)();
    const jumped = (props.onJump as ReturnType<typeof vi.fn>).mock.calls[0][0] as ReplayRibbonItem;
    expect(jumped).toMatchObject({ kind: "tack", t: 10, seekT: 5 });
    // No events, no ribbon.
    expect(nodes(controls({ ribbon: [] }).tree).some(n => n.props["data-testid"] === "replay-ribbon")).toBe(false);
  });

  it("the ribbon speaks every language with its own decimal mark and knots unit", () => {
    const tack = ribbon.find(i => i.kind === "tack")!;
    expect(ribbonItemText(tack, "ru")).toBe("0:10 Поворот оверштаг, потеря 0,6 уз");
    expect(ribbonItemText(tack, "pl")).toBe("0:10 Zwrot przez sztag, strata 0,6 w.");
    expect(ribbonItemText(tack, "fr")).toBe("0:10 Virement de bord, perte 0,6 nd");
    expect(ribbonItemText({ id: "j", kind: "judge", t: -3, seekT: 0, judgeKind: "early-start", jostle: false }, "de")).toBe("-0:03 Frühstart");
    expect(ribbonItemText({ id: "j", kind: "judge", t: 2, seekT: 0, judgeKind: "contact", jostle: true }, "en")).toBe("0:02 Crowd at the start");
    expect(ribbonItemText({ ...tack, lossKn: null } as ReplayRibbonItem, "en")).toBe("0:10 Tack");
  });
});
