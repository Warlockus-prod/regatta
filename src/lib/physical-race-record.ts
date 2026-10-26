import { physicalCourseDefinition } from "./race-courses";
import type { PhysicalRaceContext } from "./race-context";

const object = (v: unknown): v is Record<string, unknown> => !!v && typeof v === "object" && !Array.isArray(v);
const finite = (v: unknown, min: number, max: number): v is number => typeof v === "number" && Number.isFinite(v) && v >= min && v <= max;

/** New world-space records never inherit the old replay reader's coercion or
 * row-dropping policy. Optional finish is only for a completed recording;
 * unfinished shared replays retain their genuine last timestamp. */
export function physicalRaceSamplesValid(raw: unknown, context: PhysicalRaceContext, finishTimeSec?: number): boolean {
  const definition = physicalCourseDefinition(context.profile);
  if (!Array.isArray(raw) || raw.length < 2 || raw.length > 5000) return false;
  const width = definition.bounds.widthMetres / context.metresPerUnit;
  const height = definition.bounds.heightMetres / context.metresPerUnit;
  let previous = -1;
  for (const sample of raw) {
    if (!object(sample) || !finite(sample.t, 0, 3600) || sample.t < previous
      || !finite(sample.x, 0, width) || !finite(sample.y, 0, height)
      || !finite(sample.heading, -360, 720) || !finite(sample.twa, -180, 180)
      || !finite(sample.speed, 0, 100) || !finite(sample.lap, 0, 2) || !Number.isInteger(sample.lap)) return false;
    if (sample.windDir !== undefined && !finite(sample.windDir, 0, 360)) return false;
    if (sample.trim !== undefined && (!object(sample.trim)
      || !["mainSheet", "jibSheet", "reef", "jibFurl"].every(key => finite((sample.trim as Record<string, unknown>)[key], 0, 1))
      || typeof sample.trim.mainHoisted !== "boolean")) return false;
    previous = sample.t;
  }
  if (raw[0].t !== 0) return false;
  if (finishTimeSec !== undefined && (!finite(finishTimeSec, .01, 3600)
    || Math.abs(previous - finishTimeSec) > 1e-7 || raw[raw.length - 1].lap !== 2)) return false;
  return true;
}
