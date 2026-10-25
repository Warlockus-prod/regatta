import { renderToStaticMarkup } from "react-dom/server";
import * as React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { ComponentProps } from "react";
import type { RaceCockpit } from "./RaceCockpit";
import { recordWebDiagnostic } from "@/lib/diagnostics-web";
import { createDiagnosticJournal } from "@/lib/diagnostics";
const capture = vi.hoisted(() => ({ cockpit: null as ComponentProps<typeof RaceCockpit> | null }));
vi.mock("react", async original => {
  const actual = await original<typeof import("react")>();
  return { ...actual, useState: (initial: unknown) => actual.useState(initial === "menu" ? "racing" : initial) };
});
vi.mock("next/dynamic", () => ({ default: () => () => null }));
vi.mock("./RaceCockpit", () => ({ RaceCockpit: (props: ComponentProps<typeof RaceCockpit>) => { capture.cockpit = props; return null; }, RaceModePicker: () => null }));
vi.mock("./race-prefs", () => ({ useRacePrefs: () => ({ prefs: { mode: "pro", guidance: true, trimHints: true, rules: true, penalties: false }, update: vi.fn() }) }));
vi.mock("@/lib/i18n", () => ({ useI18n: () => ({ lang: "en", tl: (text: Record<string, string>) => text.en, tp: (_ru: string, en: string) => en }) }));
vi.mock("@/lib/diagnostics-web", () => ({ recordWebDiagnostic: vi.fn() }));
import GameClient from "./GameClient";
beforeEach(() => { capture.cockpit = null; vi.mocked(recordWebDiagnostic).mockReset(); vi.stubGlobal("React", React); });
afterEach(() => { vi.unstubAllGlobals(); });
describe("actual solo cockpit target handlers", () => {
  it("records the normalized trim and newest absolute helm targets for successive commands", () => {
    const journal = createDiagnosticJournal({ now: () => 0 });
    vi.mocked(recordWebDiagnostic).mockImplementation(event => journal.record(event));
    renderToStaticMarkup(<GameClient />);
    const cockpit = capture.cockpit!;
    const patch = Object.freeze({ mainSheet: 2, jibFurl: 1, mainHoisted: false });
    cockpit.setTrim(patch); cockpit.setTrim({ mainSheet: 2 });
    cockpit.setCourse(750); cockpit.setCourse(390);
    cockpit.setRudder(5); cockpit.setRudder(-.4); cockpit.setRudder(-.4);
    const events = journal.snapshot().entries.map(entry => entry.event);
    expect(events).toContainEqual(expect.objectContaining({ control: "mainsheet", value: 1, outcome: "accepted" }));
    expect(events).toContainEqual(expect.objectContaining({ control: "mainsheet", value: 1, previous: 1, outcome: "noop" }));
    expect(events).toContainEqual(expect.objectContaining({ control: "jib-furl", value: 1, outcome: "accepted" }));
    expect(events).toContainEqual(expect.objectContaining({ control: "main-hoisted", value: false, outcome: "accepted" }));
    expect(events).toContainEqual(expect.objectContaining({ control: "course", value: 30, previous: 30, outcome: "noop" }));
    expect(events).toContainEqual(expect.objectContaining({ control: "rudder", value: -.4, previous: -.4, outcome: "noop" }));
    expect(patch.mainSheet).toBe(2);
    expect(events.every(event => event.type !== "control.change" || event.control !== "rudder" || Math.abs(event.value as number) <= 1)).toBe(true);
  });
  it("keeps real cockpit commands callable when diagnostic recording throws", () => {
    vi.mocked(recordWebDiagnostic).mockImplementation(() => { throw new Error("diagnostic unavailable"); });
    renderToStaticMarkup(<GameClient />);
    const cockpit = capture.cockpit!;
    expect(() => { cockpit.setTrim({ mainSheet: .3 }); cockpit.setRudder(.4); cockpit.setCourse(270); cockpit.onPause(); cockpit.onExit(); }).not.toThrow();
    expect(recordWebDiagnostic).toHaveBeenCalledWith(expect.objectContaining({ type: "control.change", control: "course", value: 270 }));
  });
});
