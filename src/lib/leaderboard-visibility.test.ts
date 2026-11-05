import { describe, expect, it } from "vitest";
import { LEADERBOARD_MIN_RECORDS, entersVisibleTable, leaderboardVisible, resultBoardUrl } from "./leaderboard-visibility";

const rows = (count: number, mine = -1) => Array.from({ length: count }, (_, index) => ({ isMe: index === mine }));

describe("which board is visible (R-12)", () => {
  it("opens at exactly ten results", () => {
    expect(LEADERBOARD_MIN_RECORDS).toBe(10);
    expect(leaderboardVisible(rows(0))).toBe(false);
    expect(leaderboardVisible(rows(9))).toBe(false);
    expect(leaderboardVisible(rows(10))).toBe(true);
  });

  it("asks for a nickname only when the player's own result is on a visible board", () => {
    expect(entersVisibleTable(rows(9, 0))).toBe(false);
    expect(entersVisibleTable(rows(20))).toBe(false);
    expect(entersVisibleTable(rows(10, 9))).toBe(true);
  });

  it("finds the board of a saved result, and none for the daily race", () => {
    expect(resultBoardUrl({ missionId: "sub-90", classified: null, difficulty: "easy", wind: "light" })).toBe("/api/leaderboard?mission=sub-90");
    expect(resultBoardUrl({ missionId: null, classified: null, difficulty: "easy", wind: "light" })).toBeNull();
    expect(resultBoardUrl({ missionId: null, classified: { raceClass: "c1", mode: "pro" }, difficulty: "easy", wind: "light" }))
      .toBe("/api/leaderboard?raceClass=c1&raceMode=pro&difficulty=easy&wind=light");
  });
});
