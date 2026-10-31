/**
 * The race sound setting on its own, with no audio code (M1-5, ADR-0019).
 * `sounds.ts` re-exports everything here and owns the one AudioContext. A
 * screen that only has to obey the setting (Boat 3D on /simulator2) imports
 * this module, so it never installs the race gesture listeners and never
 * creates the shared context.
 *
 * - Race sound is its own choice, separate from the trainer wheel clicks
 *   (`sound` in src/features/trainer-controls/prefs.ts). It is ON by default
 *   and lives in `regatta.race.sound.v1` ("on" / "off").
 * - An older explicit mute stays muted: with no race sound choice yet, the old
 *   race key `regatta.muted.v1` = "1" while the shared sound setting is off
 *   means silence, as before.
 */

import { readControlPrefs, LEGACY_RACE_MUTE_KEY } from "@/features/trainer-controls/prefs";
import { recordPreferenceChange } from "@/lib/diagnostics-controls";

export const RACE_SOUND_KEY = "regatta.race.sound.v1";
export const RACE_SOUND_EVENT = "regatta:race-sound";

/** The choice of this page when storage refused to save it; null while storage holds the truth. */
let memory: boolean | null = null;

/** True when race signals may play. Default on; an old explicit race mute stays muted. */
export function readRaceSound(): boolean {
  if (typeof window === "undefined") return false;
  // A choice storage could not save wins over the older row still stored (full quota).
  if (memory !== null) return memory;
  try {
    const stored = window.localStorage.getItem(RACE_SOUND_KEY);
    if (stored === "on") return true;
    if (stored === "off") return false;
  } catch { return true; }
  try {
    if (window.localStorage.getItem(LEGACY_RACE_MUTE_KEY) === "1" && !readControlPrefs().sound) return false;
  } catch { /* storage unavailable: the default applies */ }
  return true;
}

/** Saves the race sound choice. Call it from the toggle's click: turning sound on also unlocks audio inside that gesture (sounds.ts listens for the event). */
export function writeRaceSound(on: boolean, surface: "race" | "multiplayer" | "boat" = "race"): void {
  if (typeof window === "undefined") return;
  const previous = readRaceSound();
  memory = null;
  // In the iOS app the storage bridge (mobile/src/persistence/race-web-storage.ts) forwards this row to AsyncStorage.
  try { window.localStorage.setItem(RACE_SOUND_KEY, on ? "on" : "off"); } catch { memory = on; /* the in-memory choice holds for this page */ }
  try { recordPreferenceChange(surface, "sound", on, previous); } catch { /* diagnostics never block the choice */ }
  window.dispatchEvent(new Event(RACE_SOUND_EVENT));
}

/**
 * Saves the race sound that is in force now as an explicit choice when the
 * player has none yet (M3-2). Call it before a screen writes the trainer
 * `sound` preference: writeControlPrefs mirrors that preference into the old
 * race key, and with no race choice saved the old key would otherwise switch
 * the race silent (Boat 3D's Sound button did that). The value does not
 * change, so nothing is announced or recorded.
 */
export function pinRaceSound(): void {
  if (typeof window === "undefined" || memory !== null) return;
  try {
    const stored = window.localStorage.getItem(RACE_SOUND_KEY);
    if (stored === "on" || stored === "off") return;
    window.localStorage.setItem(RACE_SOUND_KEY, readRaceSound() ? "on" : "off");
  } catch { /* storage unavailable: nothing is mirrored either */ }
}

export function subscribeRaceSound(onChange: () => void): () => void {
  // Another tab saved a choice: storage holds the truth again.
  const onStorage = (e: StorageEvent) => { if (e.key === RACE_SOUND_KEY) { memory = null; onChange(); } };
  window.addEventListener(RACE_SOUND_EVENT, onChange);
  window.addEventListener("storage", onStorage);
  return () => {
    window.removeEventListener(RACE_SOUND_EVENT, onChange);
    window.removeEventListener("storage", onStorage);
  };
}
