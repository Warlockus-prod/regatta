import { renderToStaticMarkup } from "react-dom/server";
import * as React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { ComponentProps } from "react";
import type { RaceCockpit } from "./RaceCockpit";
import type { RaceLoopInput } from "./useRaceLoop";
// M1-2: the actual GameClient gives countdown, race and replay the whole
// viewport (the site header steps aside) and wires the pause sheet's Restart
// to a new countdown with the same setup.
const capture = vi.hoisted(() => ({ phase: "racing", cockpit: null as ComponentProps<typeof RaceCockpit> | null, loop: [] as RaceLoopInput[] }));
vi.mock("react", async original => {
  const actual = await original<typeof import("react")>();
  return { ...actual, useState: (initial: unknown) => actual.useState(initial === "menu" ? capture.phase : initial) };
});
vi.mock("next/dynamic", () => ({ default: () => () => null }));
vi.mock("./RaceCockpit", () => ({ RaceCockpit: (props: ComponentProps<typeof RaceCockpit>) => { capture.cockpit = props; return null; }, RaceModePicker: () => null }));
vi.mock("./RaceResults", () => ({ RaceResults: () => null }));
vi.mock("./RaceReplay", () => ({ RaceReplay: () => null }));
vi.mock("./GameMenu", () => ({ GameMenu: () => null }));
vi.mock("./RaceBriefing", () => ({ RaceBriefing: () => null }));
vi.mock("./race-prefs", () => ({ useRacePrefs: () => ({ prefs: { mode: "pro", guidance: true, trimHints: true, rules: true, penalties: false }, update: vi.fn() }) }));
vi.mock("@/lib/i18n", () => ({ useI18n: () => ({ lang: "en", tl: (text: Record<string, string>) => text.en, tp: (_ru: string, en: string) => en }) }));
vi.mock("@/lib/diagnostics-web", () => ({ recordWebDiagnostic: vi.fn() }));
vi.mock("./useRaceLoop", () => ({ useRaceLoop: (input: RaceLoopInput) => { capture.loop.push(input); } }));
vi.mock("@/lib/sounds", async original => ({ ...(await original<typeof import("@/lib/sounds")>()), writeRaceSound: vi.fn() }));
import GameClient from "./GameClient";
import { RaceSoundToggle } from "@/features/race-hud/RaceSoundToggle";
import { writeRaceSound } from "@/lib/sounds";
beforeEach(() => { vi.mocked(writeRaceSound).mockClear(); capture.cockpit = null; capture.loop = []; capture.phase = "racing"; vi.stubGlobal("React", React); });
afterEach(() => { vi.unstubAllGlobals(); });

const rootHeight = (markup: string) => markup.match(/^<div[^>]*style="height:([^"]+)"/)?.[1];

describe("solo race game layer", () => {
  it.each([["countdown"], ["racing"], ["replay"]])("gives %s the whole viewport on the site", phase => {
    capture.phase = phase;
    expect(rootHeight(renderToStaticMarkup(<GameClient />))).toBe("100dvh");
  });
  it.each([["menu"], ["finished"]])("keeps %s below the site header", phase => {
    capture.phase = phase;
    expect(rootHeight(renderToStaticMarkup(<GameClient />))).toBe("calc(100dvh - var(--site-nav-h, 56px))");
  });

  it("passes the race id, the desktop full-screen offer and a Restart that starts a new countdown", () => {
    renderToStaticMarkup(<GameClient />);
    const cockpit = capture.cockpit!;
    const [loop] = capture.loop;
    expect(cockpit.fullscreenOffer).toBe(true);
    expect(cockpit.raceId).toBe("");
    cockpit.onPause();
    expect(loop.refs.pausedRef.current).toBe(true);
    cockpit.onRestart();
    expect(loop.refs.raceIdRef.current).toMatch(/^race_/);
    expect(loop.refs.pausedRef.current).toBe(false);
  });

  it("places the M1-5 race sound switch in the status row (icon) and the pause sheet (labelled)", () => {
    renderToStaticMarkup(<GameClient />);
    const slot = capture.cockpit!.raceSoundToggle;
    expect(slot, "race sound slot wired").toBeDefined();
    const status = slot!("status") as React.ReactElement<ComponentProps<typeof RaceSoundToggle>>;
    const pause = slot!("pause") as React.ReactElement<ComponentProps<typeof RaceSoundToggle>>;
    expect(status.type).toBe(RaceSoundToggle);
    expect(pause.type).toBe(RaceSoundToggle);
    expect(status.props.showLabel).toBe(false);
    expect(pause.props.showLabel).toBe(true);
    expect(typeof status.props.on).toBe("boolean");
    expect(status.props.onChange).toBe(pause.props.onChange);
  });

  it("binds the Settings tab Sound switch to the race sound, not to the wheel clicks", () => {
    renderToStaticMarkup(<GameClient />);
    const cockpit = capture.cockpit!;
    const status = cockpit.raceSoundToggle!("status") as React.ReactElement<ComponentProps<typeof RaceSoundToggle>>;
    // One choice behind the status row chip, the pause sheet and the Settings tab.
    expect(cockpit.muted).toBe(!status.props.on);
    cockpit.onSound();
    expect(writeRaceSound).toHaveBeenCalledWith(!status.props.on, "race");
  });
});
