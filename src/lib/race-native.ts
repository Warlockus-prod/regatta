import type { Coaching } from "./fallback-coach";
import { PHYSICAL_RACE_EMISSION_ENABLED, readRaceContext, type RaceContext } from "./race-context";
import { matchesPhysicalRaceCourse } from "./race-courses";
import { physicalRaceSamplesValid } from "./physical-race-record";
import { isNativeRace } from "./race-native-env";
export { isNativeRace, navigateNativeRace, readRaceSearch } from "./race-native-env";

/** Versioned local race payload shared by the web scene and native history. */
export interface NativeRaceSnapshot {
  schema: 1;
  raceContext?: RaceContext;
  id: string;
  mode?: "simple" | "pro";
  difficulty: "easy" | "medium" | "hard";
  windStrength: "light" | "medium" | "heavy";
  missionId: string | null;
  finishTimeSec: number;
  position: number;
  totalBoats: number;
  course: {
    marks: Array<{ pos: { x: number; y: number }; radius: number; type: "start" | "windward" | "finish"; label: string; labelEn: string; labelPl: string; roundSide?: "port" | "starboard" }>;
    startLine: { a: { x: number; y: number }; b: { x: number; y: number } };
    finishLine: { a: { x: number; y: number }; b: { x: number; y: number } };
  };
  samples: Array<{ t: number; x: number; y: number; heading: number; twa: number; speed: number; lap: number;
    trim?: { mainSheet: number; jibSheet: number; reef: number; jibFurl: number; mainHoisted: boolean }; windDir?: number }>;
  events: Array<{ type: "start" | "tack" | "mark-rounded" | "finish" | "no-go-entered"; t: number; note?: string }>;
  coaching?: Coaching;
  penaltySeconds?: number;
}

type NativeRaceWindow = Window & {
  __REGATTA_RACE_REPLAY__?: unknown;
  ReactNativeWebView?: { postMessage: (message: string) => void };
};

const record = (v: unknown): v is Record<string, unknown> => Boolean(v) && typeof v === "object" && !Array.isArray(v);
const finite = (v: unknown, low: number, high: number): v is number => typeof v === "number" && Number.isFinite(v) && v >= low && v <= high;
const point = (v: unknown) => record(v) && finite(v.x, -10000, 10000) && finite(v.y, -10000, 10000);
const line = (v: unknown) => record(v) && point(v.a) && point(v.b);
const short = (v: unknown, max = 160): v is string => typeof v === "string" && v.length <= max;

/** A WebView message is untrusted even when the scene is bundled locally. */
export function validateNativeRace(raw: unknown): NativeRaceSnapshot | null {
  try { if (JSON.stringify(raw).length > 1024 * 1024) return null; } catch { return null; }
  if (!record(raw) || raw.schema !== 1 || !short(raw.id, 100) || !/^[a-zA-Z0-9_-]{1,100}$/.test(raw.id)) return null;
  const context = readRaceContext(raw.raceContext);
  if (!context.ok) return null;
  if (context.context.model === "physical-cruiser-v1" && raw.mode !== "simple" && raw.mode !== "pro") return null;
  if (raw.mode !== undefined && raw.mode !== "simple" && raw.mode !== "pro") return null;
  if (!["easy", "medium", "hard"].includes(String(raw.difficulty)) || !["light", "medium", "heavy"].includes(String(raw.windStrength))) return null;
  if (raw.missionId !== null && !short(raw.missionId, 80)) return null;
  if (!finite(raw.finishTimeSec, .01, 3600) || !finite(raw.totalBoats, 1, 20) || !Number.isInteger(raw.totalBoats) || !finite(raw.position, 1, raw.totalBoats) || !Number.isInteger(raw.position)) return null;
  if (!record(raw.course) || !line(raw.course.startLine) || !line(raw.course.finishLine) || !Array.isArray(raw.course.marks) || raw.course.marks.length < 1 || raw.course.marks.length > 20) return null;
  if (!raw.course.marks.every(m => record(m) && point(m.pos) && finite(m.radius, 0, 1000) && ["start", "windward", "finish"].includes(String(m.type)) && short(m.label) && short(m.labelEn) && short(m.labelPl) && (m.roundSide === undefined || m.roundSide === "port" || m.roundSide === "starboard"))) return null;
  if (context.context.model === "physical-cruiser-v1" && !matchesPhysicalRaceCourse(context.context, raw.course)) return null;
  if (!Array.isArray(raw.samples) || raw.samples.length < 2 || raw.samples.length > 7201) return null;
  if (context.context.model === "physical-cruiser-v1" && !physicalRaceSamplesValid(raw.samples, context.context, raw.finishTimeSec)) return null;
  let previous = -1;
  for (const s of raw.samples) {
    if (!record(s) || !finite(s.t, 0, 3600) || s.t < previous || !point(s) || !finite(s.heading, -360, 720) || !finite(s.twa, -180, 180) || !finite(s.speed, 0, 100) || !finite(s.lap, 0, 2) || !Number.isInteger(s.lap)) return null;
    if (s.windDir !== undefined && !finite(s.windDir, 0, 360)) return null;
    if (s.trim !== undefined && (!record(s.trim) || !["mainSheet", "jibSheet", "reef", "jibFurl"].every(k => finite((s.trim as Record<string, unknown>)[k], 0, 1)) || typeof s.trim.mainHoisted !== "boolean")) return null;
    previous = s.t;
  }
  if (!Array.isArray(raw.events) || raw.events.length > 2000 || !raw.events.every(e => record(e) && ["start", "tack", "mark-rounded", "finish", "no-go-entered"].includes(String(e.type)) && finite(e.t, 0, 3600) && (e.note === undefined || short(e.note, 200)))) return null;
  if (raw.penaltySeconds !== undefined && !finite(raw.penaltySeconds, 0, 3600)) return null;
  if (raw.coaching !== undefined) {
    const c = raw.coaching;
    if (!record(c) || !short(c.overall, 4000) || !finite(c.score, 0, 100) || !short(c.nextGoalRu, 4000) || !Array.isArray(c.strengths) || c.strengths.length > 50 || !c.strengths.every(s => short(s, 4000)) || !Array.isArray(c.mistakes) || c.mistakes.length > 100) return null;
    if (c.nextGoal !== undefined && !short(c.nextGoal, 4000)) return null;
    if (!c.mistakes.every(m => record(m) && finite(m.timeStart, 0, 3600) && finite(m.timeEnd, 0, 3600) && ["minor", "major"].includes(String(m.severity)) && short(m.titleRu, 4000) && short(m.explanationRu, 4000) && short(m.fixRu, 4000) && ["title", "explanation", "fix"].every(k => m[k] === undefined || short(m[k], 4000)))) return null;
  }
  return (raw.raceContext === undefined ? raw : { ...raw, raceContext: context.context }) as unknown as NativeRaceSnapshot;
}

export function readNativeRaceReplay(): NativeRaceSnapshot | null {
  return typeof window === "undefined" ? null : validateNativeRace((window as NativeRaceWindow).__REGATTA_RACE_REPLAY__);
}

export function postNativeRace(snapshot: NativeRaceSnapshot): boolean {
  const validated = validateNativeRace(snapshot);
  if (!isNativeRace() || !validated || (!PHYSICAL_RACE_EMISSION_ENABLED && validated.raceContext?.model === "physical-cruiser-v1")) return false;
  try {
    (window as NativeRaceWindow).ReactNativeWebView?.postMessage(JSON.stringify({ type: "race-finished", race: validated }));
    return Boolean((window as NativeRaceWindow).ReactNativeWebView);
  } catch { return false; }
}

export type NativeRaceStarted = Pick<NativeRaceSnapshot, "id" | "difficulty" | "windStrength" | "missionId" | "raceContext"> & { mode: "simple" | "pro" };

export function validateNativeRaceStarted(raw: unknown): NativeRaceStarted | null {
  if (!record(raw) || typeof raw.id !== "string" || !/^[a-zA-Z0-9_-]{1,100}$/.test(raw.id) || typeof raw.mode !== "string" || !["simple", "pro"].includes(raw.mode) || typeof raw.difficulty !== "string" || !["easy", "medium", "hard"].includes(raw.difficulty) || typeof raw.windStrength !== "string" || !["light", "medium", "heavy"].includes(raw.windStrength) || !(raw.missionId === null || typeof raw.missionId === "string" && raw.missionId.length <= 100)) return null;
  const context = readRaceContext(raw.raceContext);
  if (!context.ok) return null;
  return { id: raw.id, mode: raw.mode, difficulty: raw.difficulty, windStrength: raw.windStrength, missionId: raw.missionId,
    ...(raw.raceContext !== undefined ? { raceContext: context.context } : {}) } as NativeRaceStarted;
}

/** Start telemetry is optional and independent of local race execution. */
export function postNativeRaceStarted(race: NativeRaceStarted): boolean {
  const validated = validateNativeRaceStarted(race);
  if (!isNativeRace() || !validated || (!PHYSICAL_RACE_EMISSION_ENABLED && validated.raceContext?.model === "physical-cruiser-v1")) return false;
  try {
    (window as NativeRaceWindow).ReactNativeWebView?.postMessage(JSON.stringify({ type: "race-started", ...validated }));
    return Boolean((window as NativeRaceWindow).ReactNativeWebView);
  } catch { return false; }
}
