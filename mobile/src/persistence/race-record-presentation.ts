import { readRaceContext, type RaceClassId } from "../../../src/lib/race-context";
import { raceComparisonKey, readRaceComparison, readRaceResultSelection, type RaceComparison } from "../../../src/lib/race-record-class";
import { matchesRegisteredRaceCourse } from "../../../src/lib/race-result-eligibility";
import { classifyNativeReplayEntry } from "../replay/entry";
import type { RaceRecord } from "./race-history";
import type { RaceRecordTitle } from "../../../src/lib/race-record-copy";

export type HistoricalRaceCourseId = "short" | "medium" | "long" | "daily";
export type NativeRaceTitle = RaceRecordTitle;
type HistoricalProjection = {
  kind: "legacy-pixel" | "historical-world-unclassified";
  title: Extract<NativeRaceTitle, { kind: "historical" }>;
  /** Internal historical grouping only. Never display or log this raw value. */
  historicalKey: string;
};
export type NativeRaceRecordProjection = HistoricalProjection | {
  kind: "classified";
  title: Extract<NativeRaceTitle, { kind: "registered" }>;
  comparison: RaceComparison;
  comparisonKey: string;
  classId: RaceClassId;
  rawFinishTimeSec: number;
  penaltySeconds: number;
  adjustedTimeSec: number;
} | {
  kind: "unavailable";
  title: Extract<NativeRaceTitle, { kind: "unavailable" }>;
  reason: "unsupported" | "corrupt";
};

const historicalCourse = (id: string): HistoricalRaceCourseId | null =>
  id === "short" || id === "medium" || id === "long" || id === "daily" ? id : null;
const unavailable = (reason: "unsupported" | "corrupt"): NativeRaceRecordProjection => ({ kind: "unavailable", title: { kind: "unavailable" }, reason });

/** Derive once per stable history array, not on every row render. Replay
 * readability is intentionally broader than registered PB eligibility. */
export function projectNativeRaceRecord(record: Pick<RaceRecord, "courseId" | "webRace">): NativeRaceRecordProjection {
  const entry = classifyNativeReplayEntry(record);
  if (entry.kind === "unavailable") return unavailable(entry.reason);
  if (entry.kind === "missing" || typeof record.courseId !== "string") return unavailable("corrupt");
  const historical = (kind: HistoricalProjection["kind"]): HistoricalProjection => ({
    kind, title: { kind: "historical", course: historicalCourse(record.courseId) }, historicalKey: record.courseId,
  });
  if (entry.kind === "legacy-pixel") return historical("legacy-pixel");
  const snapshot = record.webRace;
  if (!snapshot) return unavailable("corrupt");
  const context = readRaceContext(snapshot.raceContext);
  if (!context.ok) return unavailable(context.reason === "unsupported" ? "unsupported" : "corrupt");
  if (context.context.model === "physical-cruiser-v1" && snapshot.missionId !== null) return unavailable("corrupt");
  if (snapshot.mode === undefined) return historical("historical-world-unclassified");
  const selection = readRaceResultSelection(snapshot);
  if (!selection.ok) return unavailable(selection.reason === "unsupported" ? "unsupported" : "corrupt");
  if (selection.value.kind === "legacy-unclassified"
    || snapshot.missionId !== null || (context.context.model === "legacy-race-v1" && record.courseId === "daily")
    || !matchesRegisteredRaceCourse(context.context, snapshot.course)) return historical("historical-world-unclassified");
  const comparison = readRaceComparison(snapshot);
  const comparisonKey = raceComparisonKey(snapshot);
  if (!comparison.ok || !comparisonKey) return unavailable("corrupt");
  const penaltySeconds = snapshot.penaltySeconds ?? 0;
  return { kind: "classified", title: { kind: "registered", classId: selection.value.classId },
    comparison: comparison.value, comparisonKey, classId: selection.value.classId,
    rawFinishTimeSec: snapshot.finishTimeSec, penaltySeconds, adjustedTimeSec: snapshot.finishTimeSec + penaltySeconds };
}
