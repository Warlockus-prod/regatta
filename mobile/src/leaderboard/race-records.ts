import type { RaceRecord } from "../persistence/race-history";
import { projectNativeRaceRecord, type NativeRaceRecordProjection } from "../persistence/race-record-presentation";
import { bestPerCourse, type LeaderboardCourseFilter, type LeaderboardPeriodFilter } from "./local";

export type ProjectedNativeRace = { race: RaceRecord; projection: NativeRaceRecordProjection };
export function projectNativeRaceRecords(races: readonly RaceRecord[]): ProjectedNativeRace[] {
  return races.map(race => ({ race, projection: projectNativeRaceRecord(race) }));
}

/** Call on already projected rows: filter changes never re-validate trajectories.
 * Historical score order stays intact. Each registered comparison chooses its
 * own adjusted-time PB; different groups have no shared rank. */
export function selectNativeRaceBests(entries: readonly ProjectedNativeRace[], course: LeaderboardCourseFilter,
  period: LeaderboardPeriodFilter, now = Date.now()): {
    historical: ProjectedNativeRace[]; classified: ProjectedNativeRace[]; unavailable: ProjectedNativeRace[];
  } {
  const cutoff = period === "all" ? -Infinity : now - (period === "today" ? 1 : 7) * 86400000;
  const selected = entries.filter(({ race, projection }) => {
    if (race.finishedAt < cutoff) return false;
    if (course === "all") return true;
    if (projection.kind === "unavailable") return false;
    if (projection.kind === "classified") return projection.comparison.raceContext.model === "physical-cruiser-v1"
      && projection.comparison.raceContext.profile === course;
    return (projection.title.course === "daily" ? "medium" : projection.title.course) === course;
  });
  const historical = selected.filter(entry => entry.projection.kind === "legacy-pixel" || entry.projection.kind === "historical-world-unclassified");
  const byRecord = new Map(historical.map(entry => [entry.race, entry]));
  const groups = new Map<string, ProjectedNativeRace>();
  for (const entry of selected) {
    const current = entry.projection;
    if (current.kind !== "classified") continue;
    const previous = groups.get(current.comparisonKey);
    const previousProjection = previous?.projection;
    if (!previous || previousProjection?.kind !== "classified" || current.adjustedTimeSec < previousProjection.adjustedTimeSec
      || (current.adjustedTimeSec === previousProjection.adjustedTimeSec && entry.race.finishedAt > previous.race.finishedAt)) {
      groups.set(current.comparisonKey, entry);
    }
  }
  return {
    historical: bestPerCourse(historical.map(entry => entry.race)).map(race => byRecord.get(race)!),
    classified: [...groups].sort(([a], [b]) => a < b ? -1 : a > b ? 1 : 0).map(([, entry]) => entry),
    unavailable: selected.filter(entry => entry.projection.kind === "unavailable").sort((a, b) => b.race.finishedAt - a.race.finishedAt),
  };
}
