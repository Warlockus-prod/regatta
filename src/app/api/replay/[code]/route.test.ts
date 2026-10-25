import { beforeEach, describe, expect, it, vi } from "vitest";
import { defaultReplayCourse } from "@/lib/race-replay";

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
});
