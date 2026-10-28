import { describe, expect, it } from "vitest";
import { replayFrame } from "./race-replay-frame";
import { replayFrame as publicFrame, type ReplaySample } from "./race-replay";

const hoisted = { mainSheet: .31, jibSheet: .42, reef: .2, jibFurl: .1, mainHoisted: true };
const lowered = { mainSheet: .73, jibSheet: .64, reef: .3, jibFurl: 1, mainHoisted: false };
const samples: ReplaySample[] = [
  { t: 0, x: 400.123456789, y: 1050.987654321, heading: 350, twa: -45, speed: 1, lap: 0, windDir: 350, trim: hoisted },
  { t: .17, x: 403.123456789, y: 1048.987654321, heading: 10, twa: -45, speed: 3, lap: 1, windDir: 10, trim: lowered },
  { t: 4.81, x: 491.987654321, y: 1030.123456789, heading: 55, twa: -45, speed: 5, lap: 2, windDir: 55, trim: hoisted },
];

describe("synchronous replay interpolation entry", () => {
  it("retains the public function identity and the genuine empty-track result", () => {
    expect(publicFrame).toBe(replayFrame);
    expect(replayFrame([], 0)).toBeNull();
  });

  it("interpolates the actual irregular interval and wraps heading/wind across north", () => {
    const frame = replayFrame(samples, .085)!;
    expect(frame.pos.x).toBeCloseTo(401.623456789, 10);
    expect(frame.pos.y).toBeCloseTo(1049.987654321, 10);
    expect(frame.heading).toBe(0);
    expect(frame.windDir).toBe(0);
    expect(frame.speed).toBe(2);
    expect(frame.lapDone).toBe(0);
    expect(frame.trim).toMatchObject(hoisted);
  });

  it("preserves fractional endpoints and applies deployment changes at the recorded sample boundary", () => {
    const before = JSON.stringify(samples);
    expect(replayFrame(samples, .169)?.trim).toMatchObject(hoisted);
    expect(replayFrame(samples, .17)?.trim).toMatchObject(lowered);
    const frame = replayFrame(samples, 4.81)!;
    expect(frame.pos).toEqual({ x: samples[2].x, y: samples[2].y });
    expect(frame.heading).toBe(55);
    expect(frame.lapDone).toBe(2);
    expect(frame.trim).toMatchObject(hoisted);
    expect(replayFrame(samples, 20)).toEqual(frame);
    expect(JSON.stringify(samples)).toBe(before);
  });
});
