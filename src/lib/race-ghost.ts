import { raceClassId, type RaceContext } from "./race-context";
import { angleDiff } from "./race-physics";

/** Personal ghost (P09, ADR-0012): your own best finished race in the same
 * class, sailed again beside you. It never collides, never holds right of way,
 * never enters ranks or rules and never changes your physics. */
export const GHOST_STORAGE_KEY = "regatta.race.ghost.v1";
export const GHOST_MAX_SAMPLES = 1600;
const GHOST_MAX_CLASSES = 24;

export interface GhostConditions {
  raceContext: RaceContext;
  mode: "simple" | "pro";
  difficulty: string;
  windStrength: string;
  missionId: string | null;
}
export interface GhostSample { t: number; x: number; y: number; heading: number; speed: number; lap: number }
export interface GhostTrack { schema: 1; classKey: string; finishTimeSec: number; samples: GhostSample[] }
type GhostStore = Record<string, GhostTrack>;

/** Same course/model revision, control class, fleet difficulty, wind and mission. */
export function ghostClassKey(c: GhostConditions): string {
  return [raceClassId(c.raceContext), c.mode, c.difficulty, c.windStrength, c.missionId ?? "-"].join("|");
}

const finite = (v: unknown): v is number => typeof v === "number" && Number.isFinite(v);
function validSample(v: unknown): v is GhostSample {
  if (!v || typeof v !== "object") return false;
  const s = v as Record<string, unknown>;
  return [s.t, s.x, s.y, s.heading, s.speed].every(finite) && (s.t as number) >= 0 && [0, 1, 2].includes(s.lap as number);
}
export function isGhostTrack(v: unknown, classKey?: string): v is GhostTrack {
  if (!v || typeof v !== "object") return false;
  const g = v as Record<string, unknown>;
  if (g.schema !== 1 || typeof g.classKey !== "string" || (classKey !== undefined && g.classKey !== classKey)
    || !finite(g.finishTimeSec) || g.finishTimeSec <= 0 || !Array.isArray(g.samples)
    || g.samples.length < 2 || g.samples.length > GHOST_MAX_SAMPLES || !g.samples.every(validSample)) return false;
  // Time must not run backwards: a corrupted track would teleport.
  return (g.samples as GhostSample[]).every((s, i, all) => i === 0 || s.t >= all[i - 1].t);
}

/** A finished race as a compact track, or null when it cannot be a fair ghost. */
export function makeGhostTrack(classKey: string, finishTimeSec: number,
  samples: readonly { t: number; x: number; y: number; heading: number; speed: number; lap: number }[]): GhostTrack | null {
  const round = (n: number) => Math.round(n * 100) / 100;
  const compact = samples.slice(0, GHOST_MAX_SAMPLES).map(s => ({ t: round(s.t), x: round(s.x), y: round(s.y),
    heading: round(s.heading), speed: round(s.speed), lap: s.lap }));
  const track = { schema: 1 as const, classKey, finishTimeSec, samples: compact };
  return isGhostTrack(track, classKey) && samples.length <= GHOST_MAX_SAMPLES ? track : null;
}

/** The faster finished race of the same class wins. Other classes are kept. */
export function rememberGhost(store: GhostStore, track: GhostTrack): { store: GhostStore; replaced: boolean } {
  const current = store[track.classKey];
  if (isGhostTrack(current, track.classKey) && current.finishTimeSec <= track.finishTimeSec) return { store, replaced: false };
  const next: GhostStore = { ...store, [track.classKey]: track };
  const keys = Object.keys(next);
  // Bound storage: drop the oldest-inserted other classes first.
  while (keys.length > GHOST_MAX_CLASSES) delete next[keys.shift()!];
  return { store: next, replaced: true };
}

/** Pose at race time t; before the first sample it waits at the start, after
 * the last it stays where it finished. */
export function ghostPose(track: GhostTrack, t: number) {
  const s = track.samples;
  let lo = 0, hi = s.length - 1;
  if (!(t > s[0].t)) return { pos: { x: s[0].x, y: s[0].y }, heading: s[0].heading, speed: 0, lapDone: s[0].lap };
  while (lo < hi) { const mid = Math.floor((lo + hi + 1) / 2); if (s[mid].t <= t) lo = mid; else hi = mid - 1; }
  const a = s[lo], b = s[Math.min(lo + 1, s.length - 1)];
  const f = b.t > a.t ? Math.max(0, Math.min(1, (t - a.t) / (b.t - a.t))) : 0;
  return { pos: { x: a.x + (b.x - a.x) * f, y: a.y + (b.y - a.y) * f },
    heading: (a.heading + angleDiff(a.heading, b.heading) * f + 360) % 360,
    speed: lo === s.length - 1 ? 0 : a.speed + (b.speed - a.speed) * f, lapDone: a.lap };
}

export function readGhostStore(storage: Pick<Storage, "getItem"> | null): GhostStore {
  try {
    const raw = storage?.getItem(GHOST_STORAGE_KEY);
    const parsed: unknown = raw ? JSON.parse(raw) : {};
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return {};
    return Object.fromEntries(Object.entries(parsed).filter(([key, track]) => isGhostTrack(track, key))) as GhostStore;
  } catch { return {}; }
}
export function writeGhostStore(storage: Pick<Storage, "setItem"> | null, store: GhostStore): boolean {
  try { storage?.setItem(GHOST_STORAGE_KEY, JSON.stringify(store)); return !!storage; } catch { return false; }
}
