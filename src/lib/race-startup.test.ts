import { describe, expect, it, vi } from "vitest";
import { Scene } from "three";
import { watchFirstSceneFrame } from "@/features/simulator-3d/SceneStartup";
import { createFixedClock } from "@/features/sailing-lab/runtime/fixed-clock";
import { createRaceStartupGate } from "./race-startup";
import { stepBoat, type RaceBoat } from "./race-physics";

describe("solo race waits for its loaded visual frame", () => {
  it("keeps countdown eligibility and the actual boat frozen through a seven-second cold startup", () => {
    const gate = createRaceStartupGate(); gate.reset("race_current");
    const scene = new Scene(), clock = createFixedClock();
    const boat: RaceBoat = { id: "player", name: "Player", color: "#00d4ff", pos: { x: 400, y: 1080 }, heading: 45, speed: 0, lapDone: 0 };
    const initial = structuredClone(boat);
    let paint: FrameRequestCallback | null = null, seconds = 0, now = 0;
    const ready = vi.fn(() => {
      if (gate.rendered("race_current")) clock.synchronize(now, gate.active(false, false));
    });
    const dispose = watchFirstSceneFrame(scene, ready, callback => { paint = callback; return 1; }, () => {});
    const frame = (timestamp: number) => clock.advance(now = timestamp, gate.active(false, false), dt => {
      seconds += dt; stepBoat(boat, dt, 0, 1, { turn: 0 }, { steering: "responsive" });
    });
    for (let f = 0; f <= 420; f++) frame(f * 1000 / 60);
    expect(gate.ready).toBe(false); expect(clock.ticks).toBe(0); expect(boat).toEqual(initial);
    // A model-loaded/useFrame signal cannot release the clock. The scene must render.
    Reflect.apply(scene.onAfterRender, scene, []);
    frame(7010); expect(clock.ticks).toBe(0); expect(ready).not.toHaveBeenCalled();
    now = 7016;
    expect(paint).not.toBeNull(); (paint as unknown as FrameRequestCallback)(now);
    expect(gate.ready).toBe(true); expect(ready).toHaveBeenCalledOnce();
    for (let f = 1; f <= 60; f++) frame(7016 + f * 1000 / 60);
    expect(clock.ticks).toBe(30); expect(seconds).toBeCloseTo(1, 10);
    expect(boat).not.toEqual(initial); dispose();
  });

  it("resets every new race and refuses a late frame from the previous race", () => {
    const gate = createRaceStartupGate();
    gate.reset("first"); const oldReady = () => gate.rendered("first");
    expect(oldReady()).toBe(true); expect(oldReady()).toBe(false);
    gate.reset("second");
    expect(gate.ready).toBe(false); expect(oldReady()).toBe(false);
    expect(gate.active(false, false)).toBe(false);
    expect(gate.rendered("second")).toBe(true); expect(gate.active(false, false)).toBe(true);
    expect(gate.active(true, false)).toBe(false); expect(gate.active(false, true)).toBe(false);
  });
});
