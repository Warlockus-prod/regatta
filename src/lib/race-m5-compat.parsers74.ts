// FROZEN validators of TestFlight 74 / 73 (source e64659ac), for tests only.
// ADR-0015 point 11: rows that a new build writes must still be read by an
// installed build 74 without losing entries, so a TestFlight rollback is
// safe. These are copies of the HEAD readers with their constants inlined and
// no imports from the live modules, so later changes to src/lib cannot move
// them. Never edit them to match new code: a later step that needs a new row
// shape must keep these passing or ship a new key. No app code imports this
// file.
//
// Copied from: src/lib/race-medals.ts (isMedalEntry, isMedalStoreText,
// parseMedalStore), src/lib/race-ghost.ts (isGhostTrack, isGhostStoreText),
// src/lib/race-next-step.ts (isRaceHomeStoreText), src/lib/race-context.ts
// (readRaceContext, raceClassId) and src/lib/race-record-class.ts
// (readRaceComparison, raceComparisonKey).

type Obj = Record<string, unknown>;
const object = (value: unknown): value is Obj => value !== null && typeof value === "object" && !Array.isArray(value);
const finite = (v: unknown): v is number => typeof v === "number" && Number.isFinite(v);
const positive = (v: unknown): v is number => typeof v === "number" && Number.isFinite(v) && v > 0;

// --- race-context.ts -------------------------------------------------------
const PROFILES74 = ["short", "medium", "long"] as const;
type Context74 = { version: 1; geometryRevision: 1; coordinateUnits: "race-world-v1"; metresPerUnit: 0.6;
  model: "legacy-race-v1" | "physical-cruiser-v1"; profile: string };
const coordinates = { version: 1, geometryRevision: 1, coordinateUnits: "race-world-v1", metresPerUnit: 0.6 } as const;
export type ReadRaceContext74 = { ok: true; context: Context74 } | { ok: false; reason: "invalid" | "unsupported" };

export function readRaceContext74(value: unknown): ReadRaceContext74 {
  if (value === undefined || value === null) return { ok: true, context: { ...coordinates, model: "legacy-race-v1", profile: "standard" } };
  if (typeof value !== "object" || Array.isArray(value)) return { ok: false, reason: "invalid" };
  const a = value as Obj;
  if (![a.version, a.geometryRevision].every(n => typeof n === "number" && Number.isInteger(n) && n >= 1)
    || typeof a.model !== "string" || typeof a.profile !== "string" || typeof a.coordinateUnits !== "string"
    || typeof a.metresPerUnit !== "number" || !Number.isFinite(a.metresPerUnit) || a.metresPerUnit <= 0) return { ok: false, reason: "invalid" };
  if (a.version !== 1 || a.geometryRevision !== 1 || a.coordinateUnits !== "race-world-v1" || a.metresPerUnit !== 0.6) return { ok: false, reason: "unsupported" };
  if (a.model === "legacy-race-v1" && a.profile === "standard") return { ok: true, context: { ...coordinates, model: "legacy-race-v1", profile: "standard" } };
  if (a.model === "physical-cruiser-v1" && (PROFILES74 as readonly string[]).includes(a.profile)) {
    return { ok: true, context: { ...coordinates, model: "physical-cruiser-v1", profile: a.profile } };
  }
  return { ok: false, reason: "unsupported" };
}

export function raceClassId74(context: unknown): string {
  const read = readRaceContext74(context);
  if (!read.ok) throw new RangeError("Unsupported race context");
  return `${read.context.model}:${read.context.profile}:r1`;
}

// --- race-record-class.ts --------------------------------------------------
type Comparison74 = { raceContext: Context74; mode: "simple" | "pro"; difficulty: "easy" | "medium" | "hard"; windStrength: "light" | "medium" | "heavy" };
export type ReadRaceComparison74 = { ok: true; value: Comparison74 } | { ok: false; reason: "invalid" | "unsupported" };

function readMode74(value: unknown, legacyDefault: boolean): { ok: true; mode: "simple" | "pro" } | { ok: false; reason: "invalid" | "unsupported" } {
  if (value === "simple" || value === "pro") return { ok: true, mode: value };
  if (value === undefined && legacyDefault) return { ok: true, mode: "simple" };
  return { ok: false, reason: typeof value === "string" && value.length > 0 ? "unsupported" : "invalid" };
}

export function readRaceComparison74(raw: unknown): ReadRaceComparison74 {
  if (!object(raw)) return { ok: false, reason: "invalid" };
  const context = readRaceContext74(raw.raceContext);
  if (!context.ok) return context;
  const mode = readMode74(raw.mode, context.context.model === "legacy-race-v1");
  if (!mode.ok) return mode;
  if (raw.difficulty !== "easy" && raw.difficulty !== "medium" && raw.difficulty !== "hard") return { ok: false, reason: "invalid" };
  if (raw.windStrength !== "light" && raw.windStrength !== "medium" && raw.windStrength !== "heavy") return { ok: false, reason: "invalid" };
  return { ok: true, value: { raceContext: context.context, mode: mode.mode, difficulty: raw.difficulty, windStrength: raw.windStrength } };
}

export function raceComparisonKey74(raw: unknown): string | null {
  const read = readRaceComparison74(raw);
  if (!read.ok) return null;
  const { raceContext, mode, difficulty, windStrength } = read.value;
  return raceContext.model === "legacy-race-v1"
    ? `${mode === "pro" ? "pro:" : ""}${difficulty}-${windStrength}`
    : `ctx:${raceClassId74(raceContext)}:${mode}:${difficulty}:${windStrength}`;
}

// --- race-medals.ts --------------------------------------------------------
const MEDALS74 = ["bronze", "silver", "gold"] as const;
const MAX_COURSES74 = 64;
const MEDAL_STORE_MAX_CHARS74 = 16_000;

export function isMedalEntry74(v: unknown, key: string): boolean {
  if (!v || typeof v !== "object" || Array.isArray(v)) return false;
  const e = v as Obj;
  return e.schema === 1 && typeof e.raceClass === "string" && key.startsWith(`${e.raceClass}|`)
    && typeof e.thresholdsRevision === "number" && Number.isInteger(e.thresholdsRevision) && e.thresholdsRevision >= 1
    && (MEDALS74 as readonly unknown[]).includes(e.medal) && positive(e.bestSec)
    && (e.bestNoHintsSec === null || (positive(e.bestNoHintsSec) && (e.bestNoHintsSec as number) >= (e.bestSec as number)));
}

export function parseMedalStore74(raw: string | null | undefined): Record<string, unknown> {
  try {
    const parsed: unknown = raw ? JSON.parse(raw) : {};
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return {};
    return Object.fromEntries(Object.entries(parsed).filter(([key, entry]) => isMedalEntry74(entry, key)).slice(-MAX_COURSES74));
  } catch { return {}; }
}

export function isMedalStoreText74(raw: string): boolean {
  if (raw.length > MEDAL_STORE_MAX_CHARS74) return false;
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return false;
    const entries = Object.entries(parsed);
    return entries.length <= MAX_COURSES74 && entries.every(([key, entry]) => isMedalEntry74(entry, key));
  } catch { return false; }
}

// --- race-ghost.ts ---------------------------------------------------------
const GHOST_MAX_SAMPLES74 = 1600;
const GHOST_MAX_CLASSES74 = 24;
const GHOST_STORE_MAX_CHARS74 = 480_000;
const GHOST_MAX_MARKS74 = 4;

function validSample74(v: unknown): boolean {
  if (!v || typeof v !== "object") return false;
  const s = v as Obj;
  return [s.t, s.x, s.y, s.heading, s.speed].every(finite) && (s.t as number) >= 0 && [0, 1, 2].includes(s.lap as number);
}

export function isGhostTrack74(v: unknown, classKey?: string): boolean {
  if (!v || typeof v !== "object") return false;
  const g = v as Obj;
  if (g.schema !== 1 || typeof g.classKey !== "string" || (classKey !== undefined && g.classKey !== classKey)
    || !finite(g.finishTimeSec) || g.finishTimeSec <= 0 || !Array.isArray(g.samples)
    || g.samples.length < 2 || g.samples.length > GHOST_MAX_SAMPLES74 || !g.samples.every(validSample74)) return false;
  if (g.marks !== undefined && !(Array.isArray(g.marks) && g.marks.length >= 1 && g.marks.length <= GHOST_MAX_MARKS74
    && g.marks.every((m, i, all) => finite(m) && m >= 0 && m <= (g.finishTimeSec as number) && (i === 0 || m >= (all[i - 1] as number))))) return false;
  return (g.samples as { t: number }[]).every((s, i, all) => i === 0 || s.t >= all[i - 1].t);
}

export function isGhostStoreText74(raw: string): boolean {
  if (raw.length > GHOST_STORE_MAX_CHARS74) return false;
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return false;
    const entries = Object.entries(parsed);
    return entries.length <= GHOST_MAX_CLASSES74 && entries.every(([key, track]) => isGhostTrack74(track, key));
  } catch { return false; }
}

// --- race-next-step.ts -----------------------------------------------------
const RACE_HOME_STORE_MAX_CHARS74 = 2_000;
const RACE_HOME_MAX_DAYS74 = 14;
const GOAL_KINDS74 = ["no-go", "tacks", "close-hauled"] as const;
const DAY74 = /^\d{4}-\d{2}-\d{2}$/;
const isDay74 = (v: unknown) => typeof v === "string" && DAY74.test(v);

function isRaceHomeStore74(v: unknown): boolean {
  if (!v || typeof v !== "object" || Array.isArray(v)) return false;
  const s = v as Obj;
  return s.schema === 1 && Array.isArray(s.days) && s.days.length <= RACE_HOME_MAX_DAYS74 && s.days.every(isDay74)
    && (s.goal === null || (GOAL_KINDS74 as readonly unknown[]).includes(s.goal)) && (s.dailyDone === null || isDay74(s.dailyDone));
}

export function isRaceHomeStoreText74(raw: string): boolean {
  if (raw.length > RACE_HOME_STORE_MAX_CHARS74) return false;
  try { return isRaceHomeStore74(JSON.parse(raw)); } catch { return false; }
}
