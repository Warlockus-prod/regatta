// M5 step 8 (ADR-0015 point 12): the leaderboard archive of the free race.
// Results saved without a recorded mode (older solo races of the legacy
// model) stay readable as "Архив: режим не записан", a view over
// race_results (src/lib/db.ts topArchive), never a migration. Switch B
// (M5 step 12) sets the cutover to its deploy time: from then on the archive
// shows only rows saved before it, so a result of an old client that still
// posts unclassified rows can never enter the frozen archive. Until switch B
// there is no cutover and the archive is the whole unclassified free pool
// minus the quick online race.

/** Milliseconds since the epoch, or null before switch B. */
export const RACE_ARCHIVE_CUTOVER_MS: number | null = null;
