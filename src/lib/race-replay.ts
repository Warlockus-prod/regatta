import type { NativeRaceSnapshot } from "./race-native";
import { makeStandardCourse } from "./race-physics";
import { readRaceContext, type RaceContext, type ReadRaceContext } from "./race-context";
import { matchesPhysicalRaceCourse } from "./race-courses";
import { physicalRaceSamplesValid } from "./physical-race-record";
export { replayFrame } from "./race-replay-frame";

export type ReplaySample = NativeRaceSnapshot["samples"][number];
export type ReplayCourse = NativeRaceSnapshot["course"];
export interface ReplayMetadata { schema: 1; mode: "simple" | "pro"; penaltySeconds: number; raceContext?: RaceContext }
export type StoredReplayCourse = ReplayCourse & { replayMetadata?: ReplayMetadata };
const MAX_COORD = 100_000;
const MAX_TIME = 86_400;
const record = (v: unknown): v is Record<string, unknown> => !!v && typeof v === "object" && !Array.isArray(v);
const finite = (v: unknown, min: number, max: number): v is number => typeof v === "number" && Number.isFinite(v) && v >= min && v <= max;
const number = (v: unknown, min: number, max: number, fallback: number) => typeof v === "number" && Number.isFinite(v) ? Math.min(max, Math.max(min, v)) : fallback;
const point = (v: unknown): v is { x: number; y: number } => record(v) && finite(v.x, -MAX_COORD, MAX_COORD) && finite(v.y, -MAX_COORD, MAX_COORD);
const label = (v: unknown, fallback: string) => typeof v === "string" ? v.slice(0, 160) : fallback;

/** Keep only the replay rig fields. Unknown client keys never reach storage. */
export function replayTrim(raw: unknown): ReplaySample["trim"] | null {
  if (!record(raw) || !["mainSheet", "jibSheet", "reef", "jibFurl"].every(key => finite(raw[key], 0, 1)) || typeof raw.mainHoisted !== "boolean") return null;
  return { mainSheet: raw.mainSheet as number, jibSheet: raw.jibSheet as number, reef: raw.reef as number, jibFurl: raw.jibFurl as number, mainHoisted: raw.mainHoisted };
}

/** Legacy numeric samples still work. New optional rig/wind data is bounded.
 * Preserve exact simulation timestamps, including a short final interval. */
export function replaySamples(raw: unknown, strictOptional = true, preserveRecordedValues = false): ReplaySample[] | null {
  if (!Array.isArray(raw) || raw.length > 5000) return null;
  const samples: ReplaySample[] = [];
  const precision = (value: number, scale: number) => preserveRecordedValues ? value : Math.round(value * scale) / scale;
  for (const item of raw) {
    if (!record(item) || !finite(item.t, 0, MAX_TIME) || !finite(item.x, -MAX_COORD, MAX_COORD) || !finite(item.y, -MAX_COORD, MAX_COORD)) continue;
    if (samples.length && item.t < samples[samples.length - 1].t) return null;
    const trim = item.trim === undefined ? undefined : replayTrim(item.trim);
    const windDir = item.windDir === undefined ? undefined : finite(item.windDir, 0, 360) ? item.windDir : null;
    if (strictOptional && (trim === null || windDir === null)) return null;
    samples.push({ t: item.t, x: precision(item.x, 10), y: precision(item.y, 10),
      heading: precision(number(item.heading, -720, 720, 0), 10),
      twa: precision(number(item.twa, -360, 360, 0), 10),
      speed: precision(number(item.speed, 0, 1000, 0), 100), lap: Math.round(number(item.lap, 0, 100, 0)),
      ...(trim ? { trim } : {}), ...(windDir !== null && windDir !== undefined ? { windDir } : {}) });
  }
  return samples;
}

/** Preserve stored world coordinates, rather than guessing a pixel scale. */
export function replayCourse(raw: unknown, legacy = false): ReplayCourse | null {
  if (!record(raw) || !record(raw.startLine) || !point(raw.startLine.a) || !point(raw.startLine.b) || !Array.isArray(raw.marks) || raw.marks.length < 1 || raw.marks.length > 20) return null;
  const finish = legacy && raw.finishLine === undefined ? raw.startLine : raw.finishLine;
  if (!record(finish) || !point(finish.a) || !point(finish.b)) return null;
  const marks: ReplayCourse["marks"] = [];
  for (const item of raw.marks) {
    if (!record(item) || !point(item.pos) || !finite(item.radius ?? (legacy ? 14 : undefined), 0, 1000) || !["start", "windward", "finish"].includes(String(item.type))) return null;
    const title = label(item.label, item.type === "windward" ? "Windward" : "Start");
    const mark: ReplayCourse["marks"][number] = { pos: { ...item.pos }, radius: (item.radius ?? 14) as number, type: item.type as "start" | "windward" | "finish", label: title,
      labelEn: label(item.labelEn, title), labelPl: label(item.labelPl, title),
      ...(item.roundSide === "port" || item.roundSide === "starboard" ? { roundSide: item.roundSide } : {}) };
    for (const key of ["labelEs", "labelFr", "labelDe", "labelIt"] as const) if (typeof item[key] === "string") Object.assign(mark, { [key]: label(item[key], title) });
    marks.push(mark);
  }
  return { marks, startLine: { a: { ...raw.startLine.a }, b: { ...raw.startLine.b } }, finishLine: { a: { ...finish.a }, b: { ...finish.b } } };
}

export function defaultReplayCourse(): ReplayCourse { return replayCourse(makeStandardCourse())!; }

export function replayMetadata(raw: unknown): ReplayMetadata | null {
  if (!record(raw) || (raw.mode !== undefined && raw.mode !== "simple" && raw.mode !== "pro") || (raw.penaltySeconds !== undefined && !finite(raw.penaltySeconds, 0, 3600))) return null;
  if (raw.schema !== undefined && raw.schema !== 1) return null;
  const context = readRaceContext(raw.raceContext);
  if (!context.ok) return null;
  if (context.context.model === "physical-cruiser-v1" && raw.mode !== "simple" && raw.mode !== "pro") return null;
  return { schema: 1, mode: raw.mode === "pro" ? "pro" : "simple", penaltySeconds: (raw.penaltySeconds as number | undefined) ?? 0,
    ...(raw.raceContext != null ? { raceContext: context.context } : {}) };
}

/** Inspect both supported metadata locations before any legacy normalization.
 * A mode at the top must not hide unknown or conflicting stored coordinates. */
export function readReplayRecordContext(raw: unknown): ReadRaceContext {
  if (!record(raw)) return { ok: false, reason: "invalid" };
  const nested = record(raw.course) && record(raw.course.replayMetadata) ? raw.course.replayMetadata : undefined;
  for (const schema of [raw.schema, nested?.schema]) {
    if (schema !== undefined && schema !== 1) return { ok: false, reason: typeof schema === "number" && Number.isInteger(schema) && schema > 1 ? "unsupported" : "invalid" };
  }
  const direct = readRaceContext(raw.raceContext), stored = readRaceContext(nested?.raceContext);
  if (!direct.ok) return direct;
  if (!stored.ok) return stored;
  if (raw.raceContext != null && nested?.raceContext != null
    && (direct.context.model !== stored.context.model || direct.context.profile !== stored.context.profile)) return { ok: false, reason: "invalid" };
  return raw.raceContext != null ? direct : stored;
}

export function replayRecordMetadata(raw: unknown): ReplayMetadata | null {
  if (!record(raw)) return null;
  const context = readReplayRecordContext(raw);
  if (!context.ok) return null;
  const nested = record(raw.course) && record(raw.course.replayMetadata) ? raw.course.replayMetadata : undefined;
  const source = raw.mode !== undefined || raw.penaltySeconds !== undefined ? raw : nested ?? {};
  return replayMetadata({ mode: source.mode, penaltySeconds: source.penaltySeconds,
    ...(raw.raceContext != null || nested?.raceContext != null ? { raceContext: context.context } : {}) });
}

export interface SharedReplay {
  code: string; ts: number; nickname: string | null; difficulty: string | null; windStrength: string | null;
  finishTimeSec: number | null; views: number; samples: ReplaySample[]; course: ReplayCourse; metadata: ReplayMetadata;
  /** M4-3: the logged events the replay ribbon reads (start, tacks, the mark rounding). */
  events: ReplayEvent[];
}

export interface ReplayEvent { type: "start" | "tack" | "mark-rounded"; t: number }
const RIBBON_EVENTS: readonly string[] = ["start", "tack", "mark-rounded"];

/** The ribbon's events of a stored replay. Lenient: an old row without events,
 * or an entry that is not one of them, only leaves the ribbon shorter. */
export function replayEvents(raw: unknown): ReplayEvent[] {
  if (!Array.isArray(raw)) return [];
  const out: ReplayEvent[] = [];
  for (const item of raw.slice(0, 2000)) {
    if (record(item) && typeof item.type === "string" && RIBBON_EVENTS.includes(item.type) && finite(item.t, 0, MAX_TIME)) {
      out.push({ type: item.type as ReplayEvent["type"], t: item.t });
    }
  }
  return out;
}

/** Read both old rows and new rows. Bad legacy scenery cannot block the track. */
export function sharedReplay(raw: unknown): SharedReplay | null {
  if (!record(raw)) return null;
  const context = readReplayRecordContext(raw);
  if (!context.ok) return null;
  if (context.context.model === "physical-cruiser-v1") {
    if (raw.finishTimeSec != null && !finite(raw.finishTimeSec, .01, 3600)) return null;
    if (!physicalRaceSamplesValid(raw.samples, context.context, typeof raw.finishTimeSec === "number" ? raw.finishTimeSec : undefined)) return null;
  }
  const samples = replaySamples(raw.samples, false, context.context.model === "physical-cruiser-v1");
  if (!samples?.length) return null;
  const parsedMetadata = replayRecordMetadata(raw);
  const course = replayCourse(raw.course, context.context.model === "legacy-race-v1");
  if (context.context.model === "physical-cruiser-v1" && (!parsedMetadata || !course || !matchesPhysicalRaceCourse(context.context, raw.course))) return null;
  const metadata = parsedMetadata ?? replayMetadata({})!;
  return { code: label(raw.code, ""), ts: finite(raw.ts, 0, 8.64e15) ? raw.ts : 0,
    nickname: typeof raw.nickname === "string" ? raw.nickname.slice(0, 100) : null,
    difficulty: typeof raw.difficulty === "string" ? raw.difficulty.slice(0, 20) : null,
    windStrength: typeof raw.windStrength === "string" ? raw.windStrength.slice(0, 20) : null,
    finishTimeSec: finite(raw.finishTimeSec, 0, MAX_TIME) ? raw.finishTimeSec : null,
    views: finite(raw.views, 0, Number.MAX_SAFE_INTEGER) ? raw.views : 0,
    samples, course: course ?? defaultReplayCourse(), metadata, events: replayEvents(raw.events) };
}
