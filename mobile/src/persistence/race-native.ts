import { validateNativeRace, type NativeRaceSnapshot } from "../../../src/lib/race-native";
import { analyseRaceLocally } from "../../../src/lib/fallback-coach";
import type { Lang } from "../i18n/languages";
import { saveRaceRecord, type RaceRecord } from "./race-history";
import { PHYSICAL_RACE_EMISSION_ENABLED } from "../../../src/lib/race-context";

/** Store canonical world-space data additively. Old pixel recordings are untouched. */
export async function saveNativeRace(raw: unknown, lang: Lang, daily = false): Promise<RaceRecord> {
  const snapshot = validateNativeRace(raw);
  if (!snapshot || (!PHYSICAL_RACE_EMISSION_ENABLED && snapshot.raceContext?.model === "physical-cruiser-v1")) throw new Error("invalid-race");
  const coaching = snapshot.coaching ?? analyseRaceLocally({
    difficulty: snapshot.difficulty,
    courseInfo: { windDirection: 0, windwardMark: snapshot.course.marks[0].pos, startY: snapshot.course.startLine.a.y },
    finishTime: snapshot.finishTimeSec,
    position: snapshot.position,
    totalBoats: snapshot.totalBoats,
    samples: snapshot.samples,
    events: snapshot.events,
  }, lang);
  const webRace: NativeRaceSnapshot = { ...snapshot, coaching };
  return saveRaceRecord({
    id: snapshot.id,
    courseId: daily ? "daily" : "short",
    timeSec: snapshot.finishTimeSec + (snapshot.penaltySeconds ?? 0),
    score: coaching.score,
    replay: snapshot.samples.filter((sample, index) => index === 0 || index === snapshot.samples.length - 1 || Math.floor(sample.t) > Math.floor(snapshot.samples[index - 1].t)).map(sample => ({ x: sample.x, y: sample.y, t: sample.t, headingRad: sample.heading * Math.PI / 180, speedKn: sample.speed })),
    samples: snapshot.samples,
    events: snapshot.events,
    difficulty: snapshot.difficulty,
    windStrength: snapshot.windStrength,
    webRace,
  });
}

export function raceHistoryResponse(id: string): string {
  return `window.dispatchEvent(new CustomEvent("regatta:race-history-saved",{detail:${JSON.stringify({ id })}}));true;`;
}

export function raceHistoryFailure(code: "invalid-race" | "storage-unavailable", id?: string): string {
  const safeId = id && /^[a-zA-Z0-9_-]{1,100}$/.test(id) ? id : undefined;
  return `window.dispatchEvent(new CustomEvent("regatta:race-history-error",{detail:${JSON.stringify({ code, id: safeId })}}));true;`;
}
