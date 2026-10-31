import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { silenceSailAudio, toggleSailAudio, type AudioNodes } from "./useSailAudio";

vi.mock("@/lib/diagnostics-web", () => ({ recordWebDiagnostic: vi.fn() }));

// Contract (M3-2, ADR-0019): Boat 3D follows the shared race sound setting.
// While race sound is off its sound toggle does not turn on and no
// AudioContext is created; switching race sound off silences a running
// ambience and lets its context sleep.

function fakeNodes(state: "running" | "suspended" = "running") {
  const gain = { setTargetAtTime: vi.fn() };
  const ctx = { state, currentTime: 3, resume: vi.fn(async () => undefined), suspend: vi.fn(async () => undefined) };
  return { ctx, master: { gain }, windG: {}, waterG: {}, flogG: {} } as unknown as AudioNodes & { ctx: typeof ctx; master: { gain: typeof gain } };
}

describe("Boat 3D ambience and the race sound setting", () => {
  it("stays off and builds no AudioContext while race sound is off", () => {
    const ref = { current: null as AudioNodes | null };
    const create = vi.fn(() => fakeNodes());
    expect(toggleSailAudio(false, ref, false, create)).toBe(false);
    expect(create).not.toHaveBeenCalled();
    expect(ref.current).toBeNull();
  });

  it("turns on and builds once while race sound is on, then turns off again", () => {
    const ref = { current: null as AudioNodes | null };
    const nodes = fakeNodes("suspended");
    const create = vi.fn(() => nodes);
    expect(toggleSailAudio(false, ref, true, create)).toBe(true);
    expect(create).toHaveBeenCalledTimes(1);
    expect(nodes.ctx.resume).toHaveBeenCalledTimes(1);
    expect(nodes.master.gain.setTargetAtTime).toHaveBeenLastCalledWith(0.9, 3, 0.05);
    expect(toggleSailAudio(true, ref, true, create)).toBe(false);
    expect(nodes.master.gain.setTargetAtTime).toHaveBeenLastCalledWith(0, 3, 0.05);
    expect(create).toHaveBeenCalledTimes(1);
  });

  it("silences a running ambience and suspends its context when race sound goes off", () => {
    const nodes = fakeNodes("running");
    silenceSailAudio({ current: nodes });
    expect(nodes.master.gain.setTargetAtTime).toHaveBeenCalledWith(0, 3, 0.05);
    expect(nodes.ctx.suspend).toHaveBeenCalledTimes(1);
    expect(() => silenceSailAudio({ current: null })).not.toThrow();
  });

  it("reads the setting without the race audio module, so /simulator2 never gets the race gesture listeners", async () => {
    const { readFileSync } = await import("node:fs");
    const source = readFileSync(new URL("./useSailAudio.ts", import.meta.url), "utf8");
    expect(source).toContain("@/lib/race-sound-pref");
    expect(source).not.toMatch(/from ['"]@\/lib\/sounds['"]/);
  });
});

// Contract (M3-2 fix): a press of the Boat 3D Sound button never changes the
// race sound behind the player's back and never does nothing. Driven through
// the real race sound setting and the real trainer preferences, the way
// Simulator3D presses it: `updatePrefs({ sound: toggle() })`.
describe("Boat 3D Sound button with the real race and trainer settings", () => {
  const data = new Map<string, string>();
  beforeEach(() => {
    vi.resetModules(); data.clear();
    vi.stubGlobal("window", Object.assign(new EventTarget(), {
      localStorage: { getItem: (k: string) => data.get(k) ?? null, setItem: (k: string, v: string) => { data.set(k, String(v)); }, removeItem: (k: string) => { data.delete(k); } },
    }));
  });
  afterEach(() => vi.unstubAllGlobals());

  async function screen() {
    const audio = await import("./useSailAudio");
    const race = await import("@/lib/race-sound-pref");
    const controls = await import("@/features/trainer-controls/prefs");
    const ref = { current: null as AudioNodes | null };
    const create = vi.fn(() => fakeNodes("suspended"));
    let ambience = false;
    const press = () => {
      ambience = audio.pressSailSound(ambience && race.readRaceSound(), ref, create);
      controls.writeControlPrefs({ ...controls.readControlPrefs(), sound: ambience });
      return ambience;
    };
    return { race, press, create };
  }

  it("on, off, on from a new player: every press flips Boat 3D and the race stays on", async () => {
    const { race, press } = await screen();
    expect(race.readRaceSound()).toBe(true);
    expect([press(), race.readRaceSound()]).toEqual([true, true]);
    expect([press(), race.readRaceSound()]).toEqual([false, true]);
    expect([press(), race.readRaceSound()]).toEqual([true, true]);
    expect([press(), race.readRaceSound()]).toEqual([false, true]);
  });

  it("asks for race sound when the race is muted, and an off press never changes the race", async () => {
    const { race, press } = await screen();
    race.writeRaceSound(false);
    // Sound asked for while the race is muted: race sound comes on with it, in one press.
    expect([press(), race.readRaceSound()]).toEqual([true, true]);
    // The player mutes the race elsewhere; Boat 3D goes quiet, and its next press is "on" again.
    race.writeRaceSound(false);
    expect([press(), race.readRaceSound()]).toEqual([true, true]);
    expect([press(), race.readRaceSound()]).toEqual([false, true]);
    race.writeRaceSound(false);
    expect([press(), press(), race.readRaceSound()]).toEqual([true, false, true]);
  });

  it("turns race sound on in one press for a player muted through the old race key", async () => {
    data.set("regatta.muted.v1", "1");
    const { race, press, create } = await screen();
    expect(race.readRaceSound()).toBe(false);
    const heard = vi.fn();
    race.subscribeRaceSound(heard);
    expect(press()).toBe(true);
    expect(race.readRaceSound()).toBe(true);
    expect(data.get("regatta.race.sound.v1")).toBe("on");
    expect(heard).toHaveBeenCalledTimes(1);
    expect(create).toHaveBeenCalledTimes(1);
    // Turning the ambience off afterwards leaves the race on.
    expect([press(), race.readRaceSound()]).toEqual([false, true]);
  });
});
