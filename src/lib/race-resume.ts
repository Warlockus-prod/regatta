/**
 * Race-setup resume.
 *
 * The /game route can be interrupted in many ways: user reloads the page
 * mid-race, the tab is killed, mobile browser unloads in the background.
 * Restoring the *exact* live race state (boat positions, log samples,
 * accumulated tacks) is technically possible but high-risk: any schema
 * skew between the saved blob and current code crashes the restore
 * silently.
 *
 * This module takes the safer path: persist only the *intent* (which
 * difficulty + wind + mission + nickname the user chose) and the
 * timestamp of the last interaction. On reload, if the saved intent is
 * fresh (under 30 minutes old), the briefing screen offers a "Resume"
 * button that re-opens with those settings pre-filled. The user loses
 * their position log but doesn't lose the click-path that got them
 * into a race in the first place.
 *
 * Schema is versioned via the `v` field. If the shape ever changes
 * incompatibly, bump the version and old saves are silently ignored.
 */

const STORAGE_KEY = 'regatta.race-resume.v1';
const MAX_AGE_MS = 30 * 60 * 1000; // 30 minutes

export type Difficulty = 'easy' | 'medium' | 'hard';
export type WindStrength = 'light' | 'medium' | 'heavy';

export interface SavedRaceSetup {
  v: 1;
  difficulty: Difficulty;
  windStrength: WindStrength;
  /** Mission ID if a mission race was being set up; null for free-sail. */
  missionId: string | null;
  /** Last `gameState` value from the GameClient state machine. Useful so
   *  the resume offer can say "you were halfway through a race" vs
   *  "you were on the briefing screen". */
  phase: 'menu' | 'briefing' | 'countdown' | 'racing' | 'finished';
  /** Date.now() at last save - used to age out stale records. */
  ts: number;
}

function isDifficulty(s: unknown): s is Difficulty {
  return s === 'easy' || s === 'medium' || s === 'hard';
}
function isWindStrength(s: unknown): s is WindStrength {
  return s === 'light' || s === 'medium' || s === 'heavy';
}
function isPhase(s: unknown): s is SavedRaceSetup['phase'] {
  return s === 'menu' || s === 'briefing' || s === 'countdown' || s === 'racing' || s === 'finished';
}

export function saveRaceSetup(setup: Omit<SavedRaceSetup, 'v' | 'ts'>): void {
  if (typeof window === 'undefined') return;
  try {
    const blob: SavedRaceSetup = { v: 1, ts: Date.now(), ...setup };
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(blob));
  } catch {
    /* quota or storage disabled - silent fail */
  }
}

export function loadRaceSetup(): SavedRaceSetup | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (
      !parsed
      || typeof parsed !== 'object'
      || parsed.v !== 1
      || typeof parsed.ts !== 'number'
      || !isDifficulty(parsed.difficulty)
      || !isWindStrength(parsed.windStrength)
      || (parsed.missionId !== null && typeof parsed.missionId !== 'string')
      || !isPhase(parsed.phase)
    ) {
      return null;
    }
    if (Date.now() - parsed.ts > MAX_AGE_MS) {
      // Aged out - silently drop
      window.localStorage.removeItem(STORAGE_KEY);
      return null;
    }
    return parsed as SavedRaceSetup;
  } catch {
    return null;
  }
}

export function clearRaceSetup(): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    /* silent */
  }
}
