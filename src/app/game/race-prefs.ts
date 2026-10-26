'use client';

import { useCallback, useSyncExternalStore } from "react";
import { isNativeRace, readRaceSearch } from "@/lib/race-native-env";
import { DEFAULT_RACE_ASSISTS, sanitizeRaceAssists, type RaceAssists } from "@/lib/race-visual-prefs";
import { recordPreferenceChange } from "@/lib/diagnostics-controls";

export interface RacePrefs extends RaceAssists { mode: "simple" | "pro"; }
export const RACE_MODE_KEY = "regatta.race.mode.v1";
export const RACE_ASSISTS_KEY = "regatta.race.assists.v1";
const EVENT = "regatta:race-prefs";
const DEFAULTS: RacePrefs = { mode: "simple", ...DEFAULT_RACE_ASSISTS };
let cachedKey = "";
let cached = DEFAULTS;
let memory: RacePrefs | null = null;

export function readRacePrefs(): RacePrefs {
  try {
    const mode = localStorage.getItem(RACE_MODE_KEY);
    const text = localStorage.getItem(RACE_ASSISTS_KEY) ?? "{}";
    const override = readRaceSearch().get("mode");
    const key = `${mode}|${text}|${override}|${JSON.stringify(memory)}`;
    if (key === cachedKey) return cached;
    const a: unknown = JSON.parse(text);
    cachedKey = key;
    cached = { ...DEFAULTS, ...memory, mode: override === "pro" || override === "simple" ? override : mode === "pro" || mode === "simple" ? mode : memory?.mode ?? "simple",
      ...sanitizeRaceAssists(a, memory ?? DEFAULTS) };
    return cached;
  } catch { return memory ?? DEFAULTS; }
}
function subscribe(fn: () => void) {
  window.addEventListener(EVENT, fn); window.addEventListener("storage", fn);
  return () => { window.removeEventListener(EVENT, fn); window.removeEventListener("storage", fn); };
}
export function writeRacePrefs(patch: Partial<RacePrefs>, surface: "race" | "multiplayer" = "race"): void {
  const previous = readRacePrefs();
  const next: RacePrefs = { ...sanitizeRaceAssists({ ...previous, ...patch }, previous),
    mode: patch.mode === "simple" || patch.mode === "pro" ? patch.mode : previous.mode };
  memory = next;
  try { localStorage.setItem(RACE_MODE_KEY, next.mode); localStorage.setItem(RACE_ASSISTS_KEY, JSON.stringify(next)); } catch { /* in-memory controls still work */ }
  // A one-shot deep link must not override a mode the learner just selected.
  try { const u = new URL(window.location.href); u.searchParams.delete("mode"); window.history.replaceState(window.history.state, "", u); } catch { /* local file */ }
  if (isNativeRace()) {
    const w = window as Window & { ReactNativeWebView?: { postMessage(message: string): void }; __REGATTA_EMBED__?: { query?: string | Record<string, string> } };
    if (w.__REGATTA_EMBED__?.query) { const q = new URLSearchParams(w.__REGATTA_EMBED__.query); q.delete("mode"); w.__REGATTA_EMBED__.query = q.toString(); }
    w.ReactNativeWebView?.postMessage(JSON.stringify({ type: "race-prefs", mode: next.mode, assists: sanitizeRaceAssists(next) }));
  }
  if (patch.windDisplay !== undefined) recordPreferenceChange(surface, "wind-display", next.windDisplay, previous.windDisplay);
  if (patch.miniMap !== undefined) recordPreferenceChange(surface, "mini-map", next.miniMap, previous.miniMap);
  window.dispatchEvent(new Event(EVENT));
}
export function useRacePrefs(surface: "race" | "multiplayer" = "race") {
  const prefs = useSyncExternalStore(subscribe, readRacePrefs, () => DEFAULTS);
  const update = useCallback((patch: Partial<RacePrefs>) => writeRacePrefs(patch, surface), [surface]);
  return { prefs, update };
}
