// Contract for GET /api/leaderboard: rows never carry the raw `regatta_sid`
// (the unauthenticated write key), `isMe` is true only for the caller's own
// cookie, and bad mission / difficulty / wind values are refused before any
// query runs.

import { describe, it, expect, beforeEach, vi } from 'vitest';

const mocks = vi.hoisted(() => {
  const rows = () => [
    { nickname: 'Ola', sid: 'other-sid', difficulty: 'easy', wind_strength: 'light', mission_id: null, finish_time_sec: 70, score: 10, ts: 1 },
    { nickname: 'Me', sid: 'me-sid', difficulty: 'easy', wind_strength: 'light', mission_id: null, finish_time_sec: 80, score: 5, ts: 2 },
  ];
  const classifiedRows = () => rows().map(row => ({ ...row, race_class_id: "physical-cruiser-v1:short:r1", race_mode: "pro",
    raw_finish_time_sec: row.finish_time_sec - 5, penalty_seconds: 5, race_context_json: "PRIVATE_STORED_JSON", future_private: "PRIVATE_FUTURE_FIELD" }));
  return {
    sid: 'me-sid' as string | undefined,
    rows,
    classifiedRows,
    db: {
      topByDifficulty: vi.fn<(difficulty: string, wind: string, limit?: number) => ReturnType<typeof rows>>(() => rows()),
      topByMission: vi.fn<(missionId: string, limit?: number) => ReturnType<typeof rows>>(() => rows()),
      topByRaceClass: vi.fn<(...args: unknown[]) => ReturnType<typeof classifiedRows> | null>(() => classifiedRows()),
      topArchive: vi.fn<(...args: unknown[]) => ReturnType<typeof rows> | null>(() => rows()),
      topOnline: vi.fn<(...args: unknown[]) => ReturnType<typeof rows> | null>(() => rows()),
    },
  };
});

vi.mock('next/headers', () => ({
  cookies: async () => ({ get: (name: string) => (name === 'regatta_sid' && mocks.sid ? { value: mocks.sid } : undefined) }),
}));
vi.mock('@/lib/db', () => mocks.db);

import { GET } from './route';
import { LEGACY_RACE_CONTEXT, PHYSICAL_RACE_PROFILES, physicalRaceContext, raceClassId } from "@/lib/race-context";

function get(query: string): Promise<Response> {
  return GET(new Request('http://localhost/api/leaderboard' + query));
}

beforeEach(() => {
  mocks.sid = 'me-sid';
  mocks.db.topByDifficulty.mockClear();
  mocks.db.topByMission.mockClear();
  mocks.db.topByRaceClass.mockReset().mockImplementation(() => mocks.classifiedRows());
  mocks.db.topArchive.mockReset().mockImplementation(() => mocks.rows());
  mocks.db.topOnline.mockReset().mockImplementation(() => mocks.rows());
});

describe("GET /api/leaderboard - exact classified boards", () => {
  const query = (extra = "") => `?raceClass=physical-cruiser-v1:short:r1&raceMode=pro&difficulty=easy&wind=light${extra}`;
  function noQueries() {
    expect(mocks.db.topByDifficulty).not.toHaveBeenCalled(); expect(mocks.db.topByMission).not.toHaveBeenCalled(); expect(mocks.db.topByRaceClass).not.toHaveBeenCalled();
  }

  it("retains old default and mission DTOs without adding guessed classification", async () => {
    for (const [query, expected] of [["", { mode: "free", difficulty: "medium", wind: "medium" }], ["?mission=sub-90", { mode: "mission", mission: "sub-90" }]] as const) {
      const response = await get(query); const body = await response.json();
      expect(response.status).toBe(200); expect(body).toMatchObject(expected);
      expect(Object.keys(body).sort()).toEqual([...Object.keys(expected), "rows"].sort());
    }
    expect(mocks.db.topByRaceClass).not.toHaveBeenCalled();
  });

  it("strips sid and stored arbitrary JSON while returning separate canonical metadata", async () => {
    const res = await get(query()); const body = await res.json();
    expect(res.status).toBe(200); expect(body).toMatchObject({ mode: "free", difficulty: "easy", wind: "light",
      raceClass: "physical-cruiser-v1:short:r1", raceMode: "pro", raceContext: physicalRaceContext("short") });
    expect(mocks.db.topByRaceClass).toHaveBeenCalledWith("physical-cruiser-v1:short:r1", "pro", "easy", "light", 20);
    expect(mocks.db.topByDifficulty).not.toHaveBeenCalled(); expect(mocks.db.topByMission).not.toHaveBeenCalled();
    expect(body.rows.map((row: { isMe: boolean }) => row.isMe)).toEqual([false, true]);
    expect(body.rows[0]).toMatchObject({ raw_finish_time_sec: 65, penalty_seconds: 5 });
    expect(JSON.stringify(body)).not.toMatch(/other-sid|me-sid|PRIVATE_|race_context_json|future_private/);
  });

  it("uses only registered classes and both explicit modes, including readable disabled physical classes", async () => {
    for (const context of [LEGACY_RACE_CONTEXT, ...PHYSICAL_RACE_PROFILES.map(physicalRaceContext)]) for (const mode of ["simple", "pro"]) {
      const res = await get(`?raceClass=${raceClassId(context)}&raceMode=${mode}&difficulty=easy&wind=light`);
      expect(res.status).toBe(200); expect(await res.json()).toMatchObject({ raceContext: context, raceClass: raceClassId(context), raceMode: mode, mode: "free" });
    }
    expect(mocks.db.topByRaceClass).toHaveBeenCalledTimes(8);
  });

  it.each(["raceClass", "raceMode", "difficulty", "wind"])("requires the explicit %s selector rather than a default", async name => {
    const params = new URLSearchParams(query().slice(1)); params.delete(name);
    expect((await get("?" + params)).status).toBe(400); noQueries();
  });

  it.each(["raceClass", "raceMode", "difficulty", "wind"])("rejects duplicate %s selectors even when identical", async name => {
    const params = new URLSearchParams(query().slice(1)); params.append(name, params.get(name)!);
    expect((await get("?" + params)).status).toBe(400); noQueries();
  });

  it.each(["mission", "daily", "dailyDay", "day"])("rejects a linked %s selector including an empty one", async name => {
    expect((await get(query(`&${name}=`))).status).toBe(400); noQueries();
  });

  it.each(["raceClass=unknown", "raceClass=physical-cruiser-v1:short:r2", "raceMode=future", "raceMode=", "difficulty=extreme", "wind=hurricane"])("rejects an unsupported selector without querying: %s", async pair => {
    const params = new URLSearchParams(query().slice(1)); const [name, value] = pair.split("="); params.set(name, value);
    expect((await get("?" + params)).status).toBe(400); noQueries();
  });

  it("returns a canonical empty board as200 but an actual DB failure as500", async () => {
    mocks.db.topByRaceClass.mockReturnValueOnce([]);
    const empty = await get(query()); expect(empty.status).toBe(200); expect(await empty.json()).toMatchObject({ rows: [], raceMode: "pro" });
    mocks.db.topByRaceClass.mockReturnValueOnce(null);
    const failed = await get(query()); expect(failed.status).toBe(500); expect(await failed.json()).toEqual({ error: "Leaderboard unavailable" });
    expect(mocks.db.topByDifficulty).not.toHaveBeenCalled(); expect(mocks.db.topByMission).not.toHaveBeenCalled();
  });
});

describe('GET /api/leaderboard', () => {
  it.each(['?difficulty=easy&wind=light', '?mission=sub-90'])('%s: no sid in any row, isMe only for the cookie sid', async (q) => {
    const res = await get(q);
    expect(res.status).toBe(200);
    const body = await res.json();
    for (const row of body.rows) expect(row).not.toHaveProperty('sid');
    expect(JSON.stringify(body)).not.toMatch(/other-sid|me-sid/);
    expect(body.rows.map((r: { nickname: string; isMe: boolean }) => [r.nickname, r.isMe])).toEqual([['Ola', false], ['Me', true]]);
  });

  it('without a cookie nobody is "me"', async () => {
    mocks.sid = undefined;
    const body = await (await get('?difficulty=easy&wind=light')).json();
    expect(body.rows.every((r: { isMe: boolean }) => r.isMe === false)).toBe(true);
  });

  it.each([
    '?mission=' + 'm'.repeat(41),
    '?mission=../etc',
    '?difficulty=extreme&wind=light',
    '?difficulty=easy&wind=hurricane',
  ])('400 for %s without querying', async (q) => {
    expect((await get(q)).status).toBe(400);
    expect(mocks.db.topByDifficulty).not.toHaveBeenCalled();
    expect(mocks.db.topByMission).not.toHaveBeenCalled();
  });
});

// Contract (M5 step 8, ADR-0015 point 12): two new boards behind an explicit
// `board` selector, the frozen archive (with the cutover of
// src/lib/race-archive.ts, null before switch B) and the quick online race.
// Every request without `board` reaches exactly the old query; a malformed
// board request runs no query at all.
describe("GET /api/leaderboard - archive and online boards (M5 step 8)", () => {
  const none = () => { for (const fn of Object.values(mocks.db)) expect(fn).not.toHaveBeenCalled(); };

  it("serves the archive with its cutover and the online board, without sid", async () => {
    const archive = await get("?board=archive&difficulty=hard&wind=heavy");
    expect(archive.status).toBe(200);
    const a = await archive.json();
    expect(a).toMatchObject({ mode: "archive", difficulty: "hard", wind: "heavy", cutoverTs: null });
    expect(mocks.db.topArchive).toHaveBeenCalledWith("hard", "heavy", null, 20);
    const online = await (await get("?board=online&difficulty=easy&wind=light")).json();
    expect(online).toMatchObject({ mode: "online", difficulty: "easy", wind: "light" });
    expect(mocks.db.topOnline).toHaveBeenCalledWith("easy", "light", 20);
    for (const body of [a, online]) {
      expect(body.rows.map((r: { nickname: string; isMe: boolean }) => [r.nickname, r.isMe])).toEqual([["Ola", false], ["Me", true]]);
      expect(JSON.stringify(body)).not.toMatch(/other-sid|me-sid/);
    }
    expect(mocks.db.topByDifficulty).not.toHaveBeenCalled();
  });

  it("keeps the old pool request on the old query, with the old answer shape", async () => {
    const body = await (await get("?difficulty=easy&wind=light")).json();
    expect(Object.keys(body).sort()).toEqual(["difficulty", "mode", "rows", "wind"]);
    expect(mocks.db.topByDifficulty).toHaveBeenCalledWith("easy", "light", 20);
    expect(mocks.db.topArchive).not.toHaveBeenCalled(); expect(mocks.db.topOnline).not.toHaveBeenCalled();
  });

  it.each(["?board=archive", "?board=online&difficulty=easy", "?board=future&difficulty=easy&wind=light", "?board=archive&difficulty=extreme&wind=light",
    "?board=archive&board=archive&difficulty=easy&wind=light", "?board=online&difficulty=easy&wind=light&mission=sub-90",
    "?board=archive&difficulty=easy&wind=light&raceClass=legacy-race-v1:standard:r1", "?board=online&difficulty=easy&wind=light&raceMode=pro",
    "?board=archive&difficulty=easy&wind=light&daily=1"])("400 for %s without any query", async q => {
    expect((await get(q)).status).toBe(400); none();
  });

  it("500 on an actual DB failure, an empty board is 200", async () => {
    mocks.db.topOnline.mockReturnValueOnce([]);
    expect(await (await get("?board=online&difficulty=easy&wind=light")).json()).toMatchObject({ rows: [], mode: "online" });
    mocks.db.topArchive.mockReturnValueOnce(null);
    expect((await get("?board=archive&difficulty=easy&wind=light")).status).toBe(500);
  });
});
