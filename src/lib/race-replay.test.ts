import { describe, expect, it } from "vitest";
import { defaultReplayCourse, replayCourse, replayFrame, replaySamples, sharedReplay } from "./race-replay";

const trim = { mainSheet: .3, jibSheet: .4, reef: .25, jibFurl: 1, mainHoisted: false };
const samples = [
  { t: 0, x: 500, y: 1250, heading: 350, twa: 40, speed: 4, lap: 0 },
  { t: .5, x: 510, y: 1240, heading: 10, twa: 50, speed: 6, lap: 1 },
  { t: .5 + 1 / 30, x: 511, y: 1239, heading: 12, twa: 52, speed: 6, lap: 2, trim, windDir: 2 },
];

describe("shared race replays", () => {
  it("keeps an old 1000 by 1400 world-space track on its original course", () => {
    const course = { startLine: { a: { x: 400, y: 1250 }, b: { x: 600, y: 1250 } },
      marks: [{ pos: { x: 500, y: 180 }, type: "windward", label: "Windward" }] };
    const replay = sharedReplay({ code: "ABC234", samples, course });
    expect(replay?.samples[0]).toMatchObject({ x: 500, y: 1250 });
    expect(replay?.course.startLine).toEqual(course.startLine);
    expect(replay?.course.finishLine).toEqual(course.startLine);
    expect(replay?.course.marks[0].pos).toEqual({ x: 500, y: 180 });
    expect(replay?.metadata).toEqual({ schema: 1, mode: "simple", penaltySeconds: 0 });
  });
  it("uses a safe standard course for missing or malformed old scenery", () => {
    expect(sharedReplay({ samples })?.course).toEqual(defaultReplayCourse());
    expect(sharedReplay({ samples, course: { marks: "bad" } })?.course).toEqual(defaultReplayCourse());
    expect(sharedReplay({ samples: [] })).toBeNull();
  });
  it("samples the actual short final interval and preserves t=0 and exact finish", () => {
    const time = .5 + 1 / 30;
    const rebuilt = replaySamples(samples)!;
    expect(rebuilt[0].t).toBe(0);
    expect(rebuilt.at(-1)?.t).toBe(time);
    expect(replayFrame(rebuilt, .25)).toMatchObject({ pos: { x: 505, y: 1245 }, heading: 0, speed: 5, lapDone: 0 });
    expect(replayFrame(rebuilt, .5 + 1 / 60)?.pos.x).toBeCloseTo(510.5);
    expect(replayFrame(rebuilt, time)).toMatchObject({ pos: { x: 511, y: 1239 }, lapDone: 2, trim, windDir: 2 });
  });
  it("preserves lowered and furled sails, reads bounded metadata and strips padding", () => {
    const source = { samples: samples.map(s => ({ ...s, pad: "drop" })), finishTimeSec: 89,
      course: { ...defaultReplayCourse(), replayMetadata: { schema: 1, mode: "pro", penaltySeconds: 5, extra: "drop" } } };
    const before = structuredClone(source);
    const replay = sharedReplay(source)!;
    expect(replay.metadata).toEqual({ schema: 1, mode: "pro", penaltySeconds: 5 });
    expect(replay.samples.at(-1)?.trim).toEqual(trim);
    expect(replay.finishTimeSec! + replay.metadata.penaltySeconds).toBe(94);
    expect(replay.samples[0]).not.toHaveProperty("pad");
    expect(source).toEqual(before);
  });
  it("rejects invalid new rig/wind/timestamp fields while old reads drop bad optional data", () => {
    expect(replaySamples([{ ...samples[0], trim: { ...trim, jibFurl: 2 } }])).toBeNull();
    expect(replaySamples([{ ...samples[0], windDir: -1 }])).toBeNull();
    expect(replaySamples([samples[1], samples[0]])).toBeNull();
    expect(sharedReplay({ samples: [{ ...samples[0], windDir: "bad", trim: "bad" }] })?.samples).toEqual([samples[0]]);
    expect(replayCourse({ ...defaultReplayCourse(), marks: [{ ...defaultReplayCourse().marks[0], radius: 1001 }] })).toBeNull();
  });
  it("wraps recorded heading and wind by their shortest arcs", () => {
    const frame = replayFrame([{ ...samples[0], windDir: 358 }, { ...samples[1], windDir: 2 }], .25)!;
    expect(frame.heading).toBe(0);
    expect(frame.windDir).toBe(0);
  });
});
