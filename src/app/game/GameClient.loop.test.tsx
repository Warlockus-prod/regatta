import { renderToStaticMarkup } from "react-dom/server";
import * as React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { ComponentProps } from "react";
import type { RaceCockpit } from "./RaceCockpit";
import type { RaceLoopInput } from "./useRaceLoop";
// GameClient owns the race refs and the loop (useRaceLoop) reads them. Render
// the actual racing GameClient and drive the actual cockpit commands: the refs
// the loop receives must be the ones those commands write.
const capture = vi.hoisted(() => ({ cockpit: null as ComponentProps<typeof RaceCockpit> | null, loop: [] as RaceLoopInput[], lifecycle: [] as unknown[][],
  soundscape: { update: vi.fn(), winch: vi.fn(), thud: vi.fn(), setLive: vi.fn(), silence: vi.fn(), dispose: vi.fn() } }));
vi.mock("@/lib/race-soundscape-audio", () => ({ createRaceSoundscape: () => capture.soundscape }));
vi.mock("./useRaceSoundscape", () => ({ useRaceSoundscapeLifecycle: (...args: unknown[]) => { capture.lifecycle.push(args); } }));
vi.mock("react", async original => {
  const actual = await original<typeof import("react")>();
  return { ...actual, useState: (initial: unknown) => actual.useState(initial === "menu" ? "racing" : initial) };
});
vi.mock("next/dynamic", () => ({ default: () => () => null }));
vi.mock("./RaceCockpit", () => ({ RaceCockpit: (props: ComponentProps<typeof RaceCockpit>) => { capture.cockpit = props; return null; }, RaceModePicker: () => null }));
vi.mock("./race-prefs", () => ({ useRacePrefs: () => ({ prefs: { mode: "pro", guidance: true, trimHints: true, rules: true, penalties: false }, update: vi.fn() }) }));
vi.mock("@/lib/i18n", () => ({ useI18n: () => ({ lang: "en", tl: (text: Record<string, string>) => text.en, tp: (_ru: string, en: string) => en }) }));
vi.mock("@/lib/diagnostics-web", () => ({ recordWebDiagnostic: vi.fn() }));
vi.mock("./useRaceLoop", () => ({ useRaceLoop: (input: RaceLoopInput) => { capture.loop.push(input); } }));
import GameClient from "./GameClient";
beforeEach(() => { capture.cockpit = null; capture.loop = []; capture.lifecycle = []; for (const fn of Object.values(capture.soundscape)) fn.mockClear(); vi.stubGlobal("React", React); });
afterEach(() => { vi.unstubAllGlobals(); });

describe("solo race loop wiring", () => {
  it("runs the loop once per render with the racing state and the refs the cockpit commands write", () => {
    renderToStaticMarkup(<GameClient />);
    expect(capture.loop).toHaveLength(1);
    const [loop] = capture.loop;
    expect(loop).toMatchObject({ gameState: "racing", difficulty: "medium", windStrength: "medium", paused: false, lang: "en" });
    for (const [name, ref] of Object.entries(loop.refs)) expect(ref, name).toHaveProperty("current");
    for (const [name, setter] of Object.entries(loop.set)) expect(setter, name).toBeTypeOf("function");
    const cockpit = capture.cockpit!;
    cockpit.setRudder(.4);
    expect(loop.refs.rudderRef.current).toBe(.4);
    expect(loop.refs.autopilotOnRef.current).toBe(false);
    cockpit.setCourse(270);
    expect(loop.refs.autopilotHeadingRef.current).toBe(270);
    expect(loop.refs.autopilotOnRef.current).toBe(true);
    cockpit.setTrim({ mainSheet: .3 });
    expect(loop.refs.trimRef.current.mainSheet).toBe(.3);
    expect(loop.refs.pausedRef.current).toBe(false);
    cockpit.onPause();
    expect(loop.refs.pausedRef.current).toBe(true);
  });

  it("hands the race soundscape to the loop and rattles the winch when the player moves a sheet (M3-2)", () => {
    renderToStaticMarkup(<GameClient />);
    const [loop] = capture.loop;
    expect(loop.soundscape).toBe(capture.soundscape);
    const cockpit = capture.cockpit!;
    const before = loop.refs.trimRef.current.jibSheet;
    cockpit.setTrim({ jibSheet: before + .1 });
    expect(capture.soundscape.winch).toHaveBeenCalledTimes(1);
    expect(capture.soundscape.winch.mock.calls[0][0]).toBeCloseTo(.1, 6);
    // Twist is not a winch.
    cockpit.setTrim({ mainTwist: .8 });
    expect(capture.soundscape.winch).toHaveBeenCalledTimes(1);
  });

  it("hands the same soundscape, the race phase, the pause and the sound setting to the soundscape lifecycle", () => {
    renderToStaticMarkup(<GameClient />);
    expect(capture.lifecycle).toHaveLength(1);
    const [soundscape, phase, paused, soundOn] = capture.lifecycle[0];
    expect(soundscape).toBe(capture.soundscape);
    expect(capture.loop[0].soundscape).toBe(soundscape);
    expect([phase, paused]).toEqual(["racing", false]);
    expect(soundOn).toBeTypeOf("boolean");
  });

  it("adopts the crew's trim on a switch to Pro without a winch ratchet", () => {
    renderToStaticMarkup(<GameClient />);
    const [loop] = capture.loop;
    loop.refs.racePrefsRef.current = { ...loop.refs.racePrefsRef.current, mode: "simple" };
    const crewTrim = { ...loop.refs.trimRef.current, mainSheet: .62, jibSheet: .41 };
    loop.refs.boatsRef.current = [{ id: "player", isPlayer: true, trim: crewTrim } as unknown as (typeof loop.refs.boatsRef.current)[number]];
    capture.cockpit!.updatePrefs({ mode: "pro" });
    expect(loop.refs.trimRef.current.mainSheet).toBeCloseTo(.62, 6);
    expect(capture.soundscape.winch).not.toHaveBeenCalled();
  });
});
