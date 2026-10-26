import { beforeEach, describe, expect, it, vi } from "vitest";
import { defaultReplayCourse, sharedReplay } from "@/lib/race-replay";
import { LEGACY_RACE_CONTEXT, PHYSICAL_RACE_PROFILES, physicalRaceContext } from "@/lib/race-context";
import { makePhysicalRaceCourse } from "@/lib/race-courses";

const mocks = vi.hoisted(() => ({ getReplay: vi.fn() }));
vi.mock("@/lib/db", () => mocks);
import { GET } from "./route";
const samples = [{ t: 0, x: 500, y: 1250, heading: 45, twa: 45, speed: 5, lap: 0 },
  { t: 89 + 1 / 30, x: 500, y: 1251, heading: 180, twa: 180, speed: 6, lap: 2,
    windDir: 2, trim: { mainSheet: .3, jibSheet: .4, reef: .2, jibFurl: 1, mainHoisted: false } }];
const row = { code: "ABC234", ts: 1, sid: "private", nickname: "Sailor", difficulty: "easy", wind_strength: "light", mission_id: null,
  finish_time_sec: samples[1].t, samples_json: JSON.stringify(samples), events_json: "[]", course_json: null, views: 1 };
const request = () => GET(new Request("http://localhost/api/replay/ABC234"), { params: Promise.resolve({ code: "ABC234" }) });
beforeEach(() => { mocks.getReplay.mockReset().mockReturnValue(row); });

describe("GET shared replay compatibility", () => {
  it("reads old rows with absent metadata and leaves coordinates unchanged", async () => {
    const result = await (await request()).json();
    expect(result.mode).toBe("simple");
    expect(result.penaltySeconds).toBe(0);
    expect(result.samples).toEqual(samples);
    expect(result.course).toBeNull();
    expect(result).not.toHaveProperty("sid");
  });
  it("returns rig/wind, exact finish and course metadata without a DB migration", async () => {
    const course = { ...defaultReplayCourse(), replayMetadata: { schema: 1, mode: "pro", penaltySeconds: 5 } };
    mocks.getReplay.mockReturnValue({ ...row, course_json: JSON.stringify(course) });
    const result = await (await request()).json();
    expect(result).toMatchObject({ mode: "pro", penaltySeconds: 5, finishTimeSec: samples[1].t, course });
    expect(result.samples).toEqual(samples);
  });

  it("keeps a missing row at404 and malformed legacy scenery on the existing fallback path", async () => {
    mocks.getReplay.mockReturnValueOnce(null);
    expect((await request()).status).toBe(404);
    const course = { marks: "old-bad-scenery" };
    mocks.getReplay.mockReturnValue({ ...row, course_json: JSON.stringify(course) });
    const response = await request();
    expect(response.status).toBe(200);
    const result = await response.json();
    expect(result.course).toEqual(course);
    expect(sharedReplay(result)?.course).toEqual(defaultReplayCourse());
    expect(result).not.toHaveProperty("raceContext");
  });

  it("returns an explicit legacy context instead of losing its context-only metadata", async () => {
    const course = { ...defaultReplayCourse(), replayMetadata: { raceContext: LEGACY_RACE_CONTEXT } };
    mocks.getReplay.mockReturnValue({ ...row, course_json: JSON.stringify(course) });
    const result = await (await request()).json();
    expect(result.raceContext).toEqual(LEGACY_RACE_CONTEXT);
    expect(result.course).toEqual(course);
    expect(sharedReplay(result)?.metadata.raceContext).toEqual(LEGACY_RACE_CONTEXT);
  });

  it.each(PHYSICAL_RACE_PROFILES)("reads a canonical stored %s physical replay without transforming coordinates or time", async profile => {
    const course = { ...makePhysicalRaceCourse(profile), replayMetadata: { mode: "pro", penaltySeconds: 5, raceContext: physicalRaceContext(profile) } };
    const track = samples.map(sample => ({ ...sample, x: 400, y: 1050 }));
    mocks.getReplay.mockReturnValue({ ...row, samples_json: JSON.stringify(track), course_json: JSON.stringify(course) });
    const response = await request();
    expect(response.status).toBe(200);
    const result = await response.json();
    expect(result).toMatchObject({ samples: track, course, raceContext: physicalRaceContext(profile), mode: "pro", penaltySeconds: 5 });
    expect(sharedReplay(result)?.metadata.raceContext).toEqual(physicalRaceContext(profile));
    expect(result.finishTimeSec).toBe(samples[1].t);
  });

  it("refuses future stored contexts and malformed physical geometry without a legacy DTO", async () => {
    const context = physicalRaceContext("short");
    for (const raceContext of [{ ...context, geometryRevision: 2 }, { ...context, model: "future-model" }, { ...context, metresPerUnit: 1 }]) {
      mocks.getReplay.mockReturnValue({ ...row, course_json: JSON.stringify({ ...makePhysicalRaceCourse("short"), replayMetadata: { raceContext } }) });
      const response = await request();
      expect(response.status).toBe(422);
      expect(await response.json()).toEqual({ error: "Unsupported replay context" });
    }
    mocks.getReplay.mockReturnValue({ ...row, course_json: JSON.stringify({ ...makePhysicalRaceCourse("long"), replayMetadata: { mode: "pro", raceContext: context } }) });
    expect((await request()).status).toBe(422);
  });

  it("does not expose a physical replay after silently dropping a corrupt sample or losing its exact finish", async () => {
    const course = { ...makePhysicalRaceCourse("short"), replayMetadata: { mode: "pro", raceContext: physicalRaceContext("short") } };
    const track = samples.map(sample => ({ ...sample, x: 400, y: 1050 }));
    for (const patch of [
      { samples_json: JSON.stringify([{ ...track[0], t: "bad" }, track[1]]) },
      { samples_json: JSON.stringify([{ ...track[0], speed: -1 }, track[1]]) },
      { finish_time_sec: samples[1].t + 1 },
    ]) {
      mocks.getReplay.mockReturnValue({ ...row, samples_json: JSON.stringify(track), course_json: JSON.stringify(course), ...patch });
      expect((await request()).status).toBe(422);
    }
  });
});
