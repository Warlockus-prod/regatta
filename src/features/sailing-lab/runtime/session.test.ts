import { describe, expect, it } from "vitest";
import { createInitialState, getBoatParams } from "../../../lib/sailing-physics";
import { createSailingSession, sessionInput, stepSailingSession, type SessionInput } from "./session";
import { createFixedClock, SAILING_STEP_SECONDS } from "./fixed-clock";
import { engineTrimFromEase } from "./trim-controls";
import { yachtFromSession } from "./presentation";
import { readSessionSnapshot, replaySession, writeSessionSnapshot } from "./snapshot";
import { stepRuntime } from "../../simulator-v3/runtime/step-runtime";

const params = getBoatParams();
const input: SessionInput = { controls: engineTrimFromEase({ mainEase: .5, jibEase: .7, reef: 0 }),
  steering: { mode: "course-assist", heading: 0 }, wind: { speed: 12, direction: 70, mode: "gust" } };
const create = () => createSailingSession(createInitialState({ tws: 12, twa: 70, boatSpeed: 5 }), input, params, 1234);

describe("one sailing session for all views", () => {
  it("replays physical sheet/car commands and restores their exact next tick", () => {
    const detailed: SessionInput = { ...input, mainTrim: { workingLength: 9, traveler: 0 } };
    const initial = createSailingSession(createInitialState({ tws: 12, twa: 70, boatSpeed: 5 }), detailed, params, 1234);
    const events = [{ atTick: 80, input: { ...detailed, mainTrim: { workingLength: 13, traveler: .6 } } }];
    const expected = replaySession(initial, events, 400, params);
    for (const fps of [15, 30, 60, 120]) {
      let state = initial;
      const clock = createFixedClock();
      for (let frame = 0; frame <= fps * 14; frame++) clock.advance(frame * 1000 / fps, true, () => {
        if (state.ticks < 400) state = stepSailingSession(state, state.ticks >= 80 ? events[0].input : detailed, params);
      });
      expect(state).toEqual(expected);
    }
    const read = readSessionSnapshot(writeSessionSnapshot(expected));
    if (!read.ok) throw new Error("Detailed snapshot rejected");
    expect(stepSailingSession(read.session, sessionInput(read.session), params)).toEqual(stepSailingSession(expected, sessionInput(expected), params));
    const yacht = yachtFromSession(expected);
    expect(yacht.mainTrim?.pose).toEqual(expected.mainTrim?.pose);
    expect(yacht.twist).toBe(expected.mainTrim?.twist);
    const corrupt = JSON.parse(writeSessionSnapshot(expected));
    corrupt.session.mainTrim.pose.rise += .2;
    expect(readSessionSnapshot(JSON.stringify(corrupt)).ok).toBe(false);
    expect(() => stepSailingSession(expected, input, params)).toThrow("new session");
  });
  it("rejects non-finite input and does not silently fake a backed jib", () => {
    expect(() => stepSailingSession(create(), { ...input, controls: { ...input.controls, mainSheet: Number.NaN } }, params)).toThrow();
    expect(() => stepSailingSession(create(), { ...input, controls: { ...input.controls, jibSide: -1 } }, params)).toThrow();
  });
  it("Trainer adapter and direct session produce exactly the same entire state", () => {
    let direct = create(), trainer = { ...create(), targetHeading: 0 };
    for (let tick = 0; tick < 600; tick++) {
      const controls = tick < 200 ? input.controls : { ...input.controls, mainSheet: .9, reef: .4 };
      direct = stepSailingSession(direct, { ...input, controls }, params);
      trainer = stepRuntime(trainer, controls, 0, params, SAILING_STEP_SECONDS, "gust");
    }
    const { targetHeading, ...core } = trainer;
    expect(targetHeading).toBe(0);
    expect(core).toEqual(direct);
  });
  it.each([15, 30, 60, 120])("identical gust, maneuver and position at %i FPS", fps => {
    let state = create();
    const clock = createFixedClock();
    for (let frame = 0; frame <= fps * 20; frame++) clock.advance(frame * 1000 / fps, true, () => {
      const steering = { mode: "course-assist" as const, heading: state.ticks >= 150 ? 140 : 0 };
      state = stepSailingSession(state, { ...input, steering }, params);
    });
    expect(state).toEqual(replaySession(create(), [{ atTick: 150, input: { ...input, steering: { mode: "course-assist", heading: 140 } } }], 600, params));
  });
  it("2D/3D projection does not tick, reset or alter the session", () => {
    const state = replaySession(create(), [], 150, params);
    const before = writeSessionSnapshot(state);
    for (let i = 0; i < 20; i++) {
      const yacht = yachtFromSession(state);
      expect(yacht.boomAngle).toBe(state.rig.main);
      expect(yacht.twist).toBe(state.live.mainTwist);
      expect(yacht.travel).toEqual({ x: state.position.east, z: -state.position.north });
    }
    expect(writeSessionSnapshot(state)).toBe(before);
  });
  it("preserves the exact next tick through a mid-gust snapshot", () => {
    const state = replaySession(create(), [], 200, params);
    expect(state.wind.gust).not.toBeNull();
    const read = readSessionSnapshot(writeSessionSnapshot(state));
    expect(read.ok).toBe(true);
    if (!read.ok) throw new Error("Snapshot rejected");
    expect(stepSailingSession(read.session, sessionInput(read.session), params)).toEqual(stepSailingSession(state, sessionInput(state), params));
  });
  it("rejects corrupt, incompatible and unbounded snapshots", () => {
    expect(readSessionSnapshot("{")).toEqual({ ok: false, reason: "corrupt" });
    expect(readSessionSnapshot('{"version":2}')).toEqual({ ok: false, reason: "incompatible" });
    for (const key of ["boat", "wind", "live", "rig", "lastDiag", "main", "jib", "position"]) {
      const envelope = JSON.parse(writeSessionSnapshot(create()));
      envelope.session[key] = { invalid: 1 };
      expect(readSessionSnapshot(JSON.stringify(envelope)).ok).toBe(false);
    }
    expect(() => writeSessionSnapshot({ ...create(), ticks: -1 })).toThrow();
    expect(() => replaySession(create(), [{ atTick: -1, input }], 100, params)).toThrow();
    expect(() => replaySession(create(), [], 108_001, params)).toThrow();
  });
  it("does not turn a stationary boat with hidden helm assistance disabled", () => {
    const command: SessionInput = { ...input, wind: { speed: 0, direction: 0, mode: "steady" }, steering: { mode: "helm", rudder: 1, lowSpeedAssist: false } };
    const state = createSailingSession(createInitialState({ tws: 0, heading: 90, boatSpeed: 0 }), command, params);
    expect(stepSailingSession(state, command, params).boat.heading).toBe(90);
    expect(stepSailingSession(state, { ...command, steering: { mode: "helm", rudder: 1, lowSpeedAssist: true } }, params).boat.heading).toBeGreaterThan(90);
  });
});
