import AsyncStorage from "@react-native-async-storage/async-storage";
import { DEFAULT_HUB_SETUP, HUB_DIFFICULTIES, HUB_WINDS, hubMissions, type HubPreset, type HubRaceSetup } from "../navigation/race-setup";

/**
 * Package 9 (audit B10): the Race hub's one "Play" starts with the last used
 * setup, and Home's "Go straight to a race" plays the same one. The hub saves
 * every change (the choices live under "Change"); "Clear all data" removes it
 * with the other `regatta.` keys. Mode and venue stay in venue.ts.
 *
 *   key   = `regatta.race.hub-setup.v1`
 *   value = { v: 1, preset, difficulty, wind, missionId | null }
 *
 * Anything unreadable, or a mission that no longer exists, reads as the
 * default first race.
 */
export const RACE_HUB_SETUP_KEY = "regatta.race.hub-setup.v1";
const PRESETS: readonly HubPreset[] = ["learn", "free", "mission"];

export function parseHubSetup(raw: string | null): HubRaceSetup | null {
  if (!raw || raw.length > 512) return null;
  try {
    const v = JSON.parse(raw) as Record<string, unknown> | null;
    if (!v || typeof v !== "object" || v.v !== 1) return null;
    const preset = PRESETS.find(p => p === v.preset);
    const difficulty = HUB_DIFFICULTIES.find(d => d === v.difficulty);
    const wind = HUB_WINDS.find(w => w === v.wind);
    if (!preset || !difficulty || !wind) return null;
    const missionId = hubMissions.find(m => m.id === v.missionId)?.id ?? null;
    if (preset === "mission" && !missionId) return null;
    return { preset, difficulty, wind, missionId };
  } catch { return null; }
}

export async function readHubSetup(): Promise<HubRaceSetup> {
  try { return parseHubSetup(await AsyncStorage.getItem(RACE_HUB_SETUP_KEY)) ?? DEFAULT_HUB_SETUP; }
  catch { return DEFAULT_HUB_SETUP; }
}

export function writeHubSetup(setup: HubRaceSetup): void {
  const row = { v: 1, preset: setup.preset, difficulty: setup.difficulty, wind: setup.wind, missionId: setup.missionId };
  void AsyncStorage.setItem(RACE_HUB_SETUP_KEY, JSON.stringify(row)).catch(() => undefined);
}
