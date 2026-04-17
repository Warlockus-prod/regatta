/**
 * Versioned localStorage helper — safe reset on schema mismatch.
 * All keys live under "regatta." namespace and carry an embedded version.
 */

const CURRENT_VERSION = 1;
const NS = 'regatta.';

interface StorageEnvelope<T> {
  v: number;
  data: T;
}

function isStorageAvailable(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    const k = '__regatta_test__';
    window.localStorage.setItem(k, '1');
    window.localStorage.removeItem(k);
    return true;
  } catch {
    return false;
  }
}

export function storageGet<T>(key: string, fallback: T): T {
  if (!isStorageAvailable()) return fallback;
  try {
    const raw = window.localStorage.getItem(NS + key);
    if (!raw) return fallback;
    const env = JSON.parse(raw) as StorageEnvelope<T>;
    if (env.v !== CURRENT_VERSION) {
      // Schema mismatch — safe reset of this key. Future: run migration.
      window.localStorage.removeItem(NS + key);
      return fallback;
    }
    return env.data;
  } catch {
    return fallback;
  }
}

export function storageSet<T>(key: string, value: T): void {
  if (!isStorageAvailable()) return;
  try {
    const env: StorageEnvelope<T> = { v: CURRENT_VERSION, data: value };
    window.localStorage.setItem(NS + key, JSON.stringify(env));
  } catch {
    // Quota or disabled — silently drop
  }
}

export function storageRemove(key: string): void {
  if (!isStorageAvailable()) return;
  try { window.localStorage.removeItem(NS + key); } catch { /* ignore */ }
}

// ============================================================================
// Bootcamp progress
// ============================================================================

export interface BootcampProgress {
  completed: string[];  // lesson ids
  current: string | null; // current lesson id (resumable)
  startedAt: number;      // ms
  updatedAt: number;      // ms
}

const BOOTCAMP_KEY = 'bootcamp';

export function getBootcampProgress(): BootcampProgress {
  return storageGet(BOOTCAMP_KEY, {
    completed: [],
    current: null,
    startedAt: 0,
    updatedAt: 0,
  });
}

export function setBootcampProgress(p: BootcampProgress): void {
  storageSet(BOOTCAMP_KEY, p);
}

export function markLessonComplete(lessonId: string): void {
  const p = getBootcampProgress();
  if (!p.completed.includes(lessonId)) p.completed.push(lessonId);
  p.updatedAt = Date.now();
  if (p.startedAt === 0) p.startedAt = Date.now();
  setBootcampProgress(p);
}

export function setCurrentLesson(lessonId: string | null): void {
  const p = getBootcampProgress();
  p.current = lessonId;
  p.updatedAt = Date.now();
  if (p.startedAt === 0 && lessonId !== null) p.startedAt = Date.now();
  setBootcampProgress(p);
}

export function resetBootcamp(): void {
  storageRemove(BOOTCAMP_KEY);
}
