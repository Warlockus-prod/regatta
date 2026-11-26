import type { Difficulty } from "../data/race-difficulty";

/**
 * Package 9 (audit B10): the website's Race hub offers one "Play" that starts
 * with the last used race setup. The race page remembers the setup each time
 * a race counts down (src/app/game/GameClient.tsx); the hub reads it back.
 * The daily race and the metric trial are never remembered: they have their
 * own entries. The app keeps its own hub setup in AsyncStorage
 * (mobile/src/persistence/race-hub-setup.ts).
 *
 * Storage shape (localStorage, `regatta.race.last-setup.v1`):
 *   { "v": 1, "kind": "free", "difficulty": "easy|medium|hard", "wind": "light|medium|heavy" }
 *   { "v": 1, "kind": "mission", "missionId": "<id>" }
 * Anything else reads as the default first race (easy, medium wind).
 */
export const LAST_RACE_SETUP_KEY = "regatta.race.last-setup.v1";
export type RaceWind = "light" | "medium" | "heavy";
export type LastRaceSetup = { kind: "free"; difficulty: Difficulty; wind: RaceWind } | { kind: "mission"; missionId: string };
export const DEFAULT_LAST_RACE_SETUP: LastRaceSetup = { kind: "free", difficulty: "easy", wind: "medium" };

const DIFFICULTIES: readonly string[] = ["easy", "medium", "hard"];
const WINDS: readonly string[] = ["light", "medium", "heavy"];
const MISSION_ID = /^[a-z0-9-]{1,48}$/;

export function parseLastRaceSetup(raw: string | null): LastRaceSetup | null {
  if (!raw || raw.length > 512) return null;
  try {
    const value: unknown = JSON.parse(raw);
    if (!value || typeof value !== "object") return null;
    const row = value as Record<string, unknown>;
    if (row.v !== 1) return null;
    if (row.kind === "mission" && typeof row.missionId === "string" && MISSION_ID.test(row.missionId)) return { kind: "mission", missionId: row.missionId };
    if (row.kind === "free" && typeof row.difficulty === "string" && DIFFICULTIES.includes(row.difficulty) && typeof row.wind === "string" && WINDS.includes(row.wind)) {
      return { kind: "free", difficulty: row.difficulty as Difficulty, wind: row.wind as RaceWind };
    }
    return null;
  } catch { return null; }
}

/** Storage may be missing or throw (private mode): the first race is the fallback. */
export function readLastRaceSetup(storage: Pick<Storage, "getItem"> | null | undefined): LastRaceSetup {
  try { return parseLastRaceSetup(storage?.getItem(LAST_RACE_SETUP_KEY) ?? null) ?? DEFAULT_LAST_RACE_SETUP; }
  catch { return DEFAULT_LAST_RACE_SETUP; }
}

export function rememberLastRaceSetup(storage: Pick<Storage, "setItem"> | null | undefined, setup: LastRaceSetup): void {
  const row = setup.kind === "mission" ? { v: 1, kind: "mission", missionId: setup.missionId } : { v: 1, kind: "free", difficulty: setup.difficulty, wind: setup.wind };
  try { storage?.setItem(LAST_RACE_SETUP_KEY, JSON.stringify(row)); }
  catch { /* The hub then offers the first race; the race itself is unaffected. */ }
}

/**
 * The race route for a setup. `play` starts at once: the race page hands the
 * linked setup over without its lobby (src/app/game/race-setup-flow.ts), and a
 * first race on this device still opens the briefing first. Without `play` the
 * lobby opens with the same choices filled in, to change them.
 */
export function raceSetupHref(setup: LastRaceSetup, play: boolean): string {
  const query = setup.kind === "mission" ? `mission=${encodeURIComponent(setup.missionId)}` : `difficulty=${setup.difficulty}&wind=${setup.wind}`;
  return `/game?${query}${play ? "&play=1" : ""}`;
}
