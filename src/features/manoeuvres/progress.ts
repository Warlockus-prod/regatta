// Stars per exercise, stored only on this device. No accounts, no sync.
import type { ManoeuvreExercise } from "@/data/manoeuvres";

export const MANOEUVRES_STORAGE_KEY = "regatta.manoeuvres.v1";
export type Stars = Record<string, 0 | 1 | 2 | 3>;

interface StorageLike { getItem(key: string): string | null; setItem(key: string, value: string): void }

/** Unknown, corrupt or future records read as no progress, never as a crash. */
export function parseProgress(raw: string | null, knownIds: readonly string[]): Stars {
  if (!raw) return {};
  try {
    const data = JSON.parse(raw) as unknown;
    if (!data || typeof data !== "object" || (data as { version?: unknown }).version !== 1) return {};
    const stars = (data as { stars?: unknown }).stars;
    if (!stars || typeof stars !== "object") return {};
    const out: Stars = {};
    for (const id of knownIds) {
      const value = (stars as Record<string, unknown>)[id];
      if (value === 1 || value === 2 || value === 3) out[id] = value;
    }
    return out;
  } catch {
    return {};
  }
}

export function readProgress(storage: StorageLike | null, knownIds: readonly string[]): Stars {
  try { return parseProgress(storage?.getItem(MANOEUVRES_STORAGE_KEY) ?? null, knownIds); } catch { return {}; }
}

/** Keeps the best result. Returns the stored stars, or null if the write failed. */
export function recordStars(storage: StorageLike | null, current: Stars, id: string, stars: 0 | 1 | 2 | 3): Stars | null {
  const best = Math.max(current[id] ?? 0, stars) as 0 | 1 | 2 | 3;
  const next = { ...current, ...(best > 0 ? { [id]: best } : {}) };
  try {
    storage?.setItem(MANOEUVRES_STORAGE_KEY, JSON.stringify({ version: 1, stars: next }));
    return next;
  } catch {
    return null;
  }
}

/** The first exercise of each track is open; the next opens with at least one star on the previous. */
export function isUnlocked(exercises: readonly ManoeuvreExercise[], stars: Stars, id: string): boolean {
  const exercise = exercises.find(e => e.id === id);
  if (!exercise) return false;
  const track = exercises.filter(e => e.track === exercise.track);
  const index = track.findIndex(e => e.id === id);
  return index === 0 || (stars[track[index - 1].id] ?? 0) >= 1;
}

export function nextExercise(exercises: readonly ManoeuvreExercise[], id: string): ManoeuvreExercise | undefined {
  const exercise = exercises.find(e => e.id === id);
  if (!exercise) return undefined;
  const track = exercises.filter(e => e.track === exercise.track);
  return track[track.findIndex(e => e.id === id) + 1];
}
