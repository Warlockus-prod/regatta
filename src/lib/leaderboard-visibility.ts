// Owner decision R-12 (2026-11-05, audit top-11): an almost empty table is worse
// than no table, so a board shows only from ten results on. The number is ours,
// the audit gives none. A nickname is asked only when the player's own result is
// on a board that is visible, so a first race never starts with a form.

/** A board with fewer results shows the player's own record instead of the table. */
export const LEADERBOARD_MIN_RECORDS = 10;

/** Stored for a result saved before the player chose a name; the table shows a localized word. */
export const ANONYMOUS_NICKNAME = "Player";

export function leaderboardVisible(rows: readonly unknown[]): boolean {
  return rows.length >= LEADERBOARD_MIN_RECORDS;
}

/** The player's own result is on a board other people can see. */
export function entersVisibleTable(rows: ReadonlyArray<{ isMe?: boolean }>): boolean {
  return leaderboardVisible(rows) && rows.some((row) => row.isMe === true);
}

/** The board a saved result lands on; null for one that has no board of its own (the daily race). */
export function resultBoardUrl(result: {
  missionId: string | null; classified: { raceClass: string; mode: string } | null; difficulty: string; wind: string;
}): string | null {
  if (result.missionId) return `/api/leaderboard?mission=${encodeURIComponent(result.missionId)}`;
  if (!result.classified) return null;
  const query = new URLSearchParams({
    raceClass: result.classified.raceClass, raceMode: result.classified.mode, difficulty: result.difficulty, wind: result.wind,
  });
  return `/api/leaderboard?${query.toString()}`;
}
