// What the leaderboard asks /api/leaderboard for (M1-7, M5 step 8). A free
// race result belongs to one course class (the classic legacy course or a
// metric course of ADR-0015) and one mode, so every course x mode x level x
// wind is its own table. Results saved without a mode (older races and old
// app versions) are the frozen archive of the classic course, the quick
// online race has its own board, and missions keep theirs; none of these is
// ever merged into a course table.

import { LEGACY_RACE_CONTEXT, PHYSICAL_RACE_DEFAULT_PROFILE, PHYSICAL_RACE_PROFILES, physicalRaceContext, raceClassId,
  type PhysicalRaceProfile } from "@/lib/race-context";
import type { RaceResultDifficulty, RaceResultMode, RaceResultWind } from "@/lib/race-record-class";

export type LeaderboardBoard = "free" | "online" | "mission";
/** The free race's course: a metric profile or the classic (legacy) course. */
export type LeaderboardCourse = PhysicalRaceProfile | "classic";
export type LeaderboardSelection = {
  board: LeaderboardBoard;
  course: LeaderboardCourse;
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

/** The free-race class of the classic course (every Simple and Pro result of /game before switch B). */
export const STANDARD_RACE_CLASS = raceClassId(LEGACY_RACE_CONTEXT);

/** The course choices in screen order: the metric courses, then the classic one. */
export const LEADERBOARD_COURSES: readonly LeaderboardCourse[] = [...PHYSICAL_RACE_PROFILES, "classic"];

/** The course the page opens on: the default solo race (switch B), the classic course before it. */
export const DEFAULT_LEADERBOARD_COURSE: LeaderboardCourse = PHYSICAL_RACE_DEFAULT_PROFILE ?? "classic";

/** The race class of a course. */
export function courseRaceClass(course: LeaderboardCourse): string {
  return course === "classic" ? STANDARD_RACE_CLASS : raceClassId(physicalRaceContext(course));
}

/** The table on screen: one course and mode of the free race, the online board, or one mission. */
export function leaderboardUrl(s: LeaderboardSelection): string {
  if (s.board === "mission") return `/api/leaderboard?mission=${encodeURIComponent(s.missionId)}`;
  if (s.board === "online") return `/api/leaderboard?${new URLSearchParams({ board: "online", difficulty: s.difficulty, wind: s.wind }).toString()}`;
  const query = new URLSearchParams({ raceClass: courseRaceClass(s.course), raceMode: s.mode, difficulty: s.difficulty, wind: s.wind });
  return `/api/leaderboard?${query.toString()}`;
}

/** The classic course's archive: free results saved without a mode, for the same difficulty and wind. */
export function archiveUrl(s: Pick<LeaderboardSelection, "difficulty" | "wind">): string {
  return `/api/leaderboard?${new URLSearchParams({ board: "archive", difficulty: s.difficulty, wind: s.wind }).toString()}`;
}

/** The archive belongs to the classic course of the free race only. */
export function showsArchive(s: Pick<LeaderboardSelection, "board" | "course">): boolean {
  return s.board === "free" && s.course === "classic";
}

/** "1:38.5": minutes, seconds and tenths, as the race clock shows them. */
export function formatLeaderboardTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const sec = Math.floor(seconds % 60);
  const tenths = Math.floor((seconds * 10) % 10);
  return `${m}:${sec.toString().padStart(2, "0")}.${tenths}`;
}
