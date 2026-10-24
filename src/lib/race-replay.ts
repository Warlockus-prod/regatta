import type { NativeRaceSnapshot } from "./race-native";
import { angleDiff, makeStandardCourse, raceTrim, windAt } from "./race-physics";

export type ReplaySample = NativeRaceSnapshot["samples"][number];
export type ReplayCourse = NativeRaceSnapshot["course"];
export interface ReplayMetadata { schema: 1; mode: "simple" | "pro"; penaltySeconds: number }
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
export function replaySamples(raw: unknown, strictOptional = true): ReplaySample[] | null {
  if (!Array.isArray(raw) || raw.length > 5000) return null;
  const samples: ReplaySample[] = [];
  for (const item of raw) {
    if (!record(item) || !finite(item.t, 0, MAX_TIME) || !finite(item.x, -MAX_COORD, MAX_COORD) || !finite(item.y, -MAX_COORD, MAX_COORD)) continue;
    if (samples.length && item.t < samples[samples.length - 1].t) return null;
    const trim = item.trim === undefined ? undefined : replayTrim(item.trim);
    const windDir = item.windDir === undefined ? undefined : finite(item.windDir, 0, 360) ? item.windDir : null;
    if (strictOptional && (trim === null || windDir === null)) return null;
    samples.push({ t: item.t, x: Math.round(item.x * 10) / 10, y: Math.round(item.y * 10) / 10,
      heading: Math.round(number(item.heading, -720, 720, 0) * 10) / 10,
      twa: Math.round(number(item.twa, -360, 360, 0) * 10) / 10,
      speed: Math.round(number(item.speed, 0, 1000, 0) * 100) / 100, lap: Math.round(number(item.lap, 0, 100, 0)),
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
  return { schema: 1, mode: raw.mode === "pro" ? "pro" : "simple", penaltySeconds: (raw.penaltySeconds as number | undefined) ?? 0 };
}

export interface SharedReplay {
  code: string; ts: number; nickname: string | null; difficulty: string | null; windStrength: string | null;
  finishTimeSec: number | null; views: number; samples: ReplaySample[]; course: ReplayCourse; metadata: ReplayMetadata;
}

/** Read both old rows and new rows. Bad legacy scenery cannot block the track. */
export function sharedReplay(raw: unknown): SharedReplay | null {
  if (!record(raw)) return null;
  const samples = replaySamples(raw.samples, false);
  if (!samples?.length) return null;
  const nested = record(raw.course) ? raw.course.replayMetadata : undefined;
  const metadata = replayMetadata(raw.mode !== undefined || raw.penaltySeconds !== undefined ? raw : nested ?? {}) ?? replayMetadata({})!;
  return { code: label(raw.code, ""), ts: finite(raw.ts, 0, 8.64e15) ? raw.ts : 0,
    nickname: typeof raw.nickname === "string" ? raw.nickname.slice(0, 100) : null,
    difficulty: typeof raw.difficulty === "string" ? raw.difficulty.slice(0, 20) : null,
    windStrength: typeof raw.windStrength === "string" ? raw.windStrength.slice(0, 20) : null,
    finishTimeSec: finite(raw.finishTimeSec, 0, MAX_TIME) ? raw.finishTimeSec : null,
    views: finite(raw.views, 0, Number.MAX_SAFE_INTEGER) ? raw.views : 0,
    samples, course: replayCourse(raw.course, true) ?? defaultReplayCourse(), metadata };
}

/** Interpolate by recorded seconds, never by a presumed sampling interval. */
export function replayFrame(samples: readonly ReplaySample[], time: number) {
  let lo = 0, hi = Math.max(0, samples.length - 1);
  while (lo < hi) { const mid = Math.floor((lo + hi + 1) / 2); if (samples[mid].t <= time) lo = mid; else hi = mid - 1; }
  const a = samples[lo];
  if (!a) return null;
  const b = samples[Math.min(lo + 1, samples.length - 1)];
  const fraction = b.t > a.t ? Math.max(0, Math.min(1, (time - a.t) / (b.t - a.t))) : 0;
  const from = a.windDir ?? windAt(time).dir;
  return { pos: { x: a.x + (b.x - a.x) * fraction, y: a.y + (b.y - a.y) * fraction },
    heading: (a.heading + angleDiff(a.heading, b.heading) * fraction + 360) % 360,
    speed: a.speed + (b.speed - a.speed) * fraction, lapDone: a.lap,
    windDir: b.windDir !== undefined ? (from + angleDiff(from, b.windDir) * fraction + 360) % 360 : from,
    trim: a.trim ? raceTrim(a.trim) : undefined };
}
