// What the leaderboard asks /api/leaderboard for (M1-7). Simple and Pro are
// separate classified tables of the standard course; results saved without a
// mode (older races, and every mission) are their own list, never merged into
// a mode's table.

import { LEGACY_RACE_CONTEXT, raceClassId } from "@/lib/race-context";
import type { RaceResultDifficulty, RaceResultMode, RaceResultWind } from "@/lib/race-record-class";

export type LeaderboardBoard = "free" | "mission";
export type LeaderboardSelection = {
  board: LeaderboardBoard;
  mode: RaceResultMode;
  difficulty: RaceResultDifficulty;
  wind: RaceResultWind;
  missionId: string;
};

export interface LeaderboardRow {
  nickname: string;
  isMe: boolean;
  finish_time_sec: number;
  score: number | null;
  penalty_seconds?: number | null;
}

/** The free-race class every Simple and Pro result of /game belongs to. */
export const STANDARD_RACE_CLASS = raceClassId(LEGACY_RACE_CONTEXT);

/** The table on screen: one mode of the free race, or one mission. */
export function leaderboardUrl(s: LeaderboardSelection): string {
  if (s.board === "mission") return `/api/leaderboard?mission=${encodeURIComponent(s.missionId)}`;
  const query = new URLSearchParams({ raceClass: STANDARD_RACE_CLASS, raceMode: s.mode, difficulty: s.difficulty, wind: s.wind });
  return `/api/leaderboard?${query.toString()}`;
}

/** Free-race results stored without a mode, for the same difficulty and wind. */
export function unrecordedModeUrl(s: Pick<LeaderboardSelection, "difficulty" | "wind">): string {
  return `/api/leaderboard?${new URLSearchParams({ difficulty: s.difficulty, wind: s.wind }).toString()}`;
}

/** "1:38.5": minutes, seconds and tenths, as the race clock shows them. */
export function formatLeaderboardTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const sec = Math.floor(seconds % 60);
  const tenths = Math.floor((seconds * 10) % 10);
  return `${m}:${sec.toString().padStart(2, "0")}.${tenths}`;
}
