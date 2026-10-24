'use client';

import { useCallback, useSyncExternalStore } from "react";
import { isNativeRace, readRaceSearch } from "@/lib/race-native";

export interface RacePrefs { mode: "simple" | "pro"; guidance: boolean; trimHints: boolean; rules: boolean; penalties: boolean; }
export const RACE_MODE_KEY = "regatta.race.mode.v1";
export const RACE_ASSISTS_KEY = "regatta.race.assists.v1";
const EVENT = "regatta:race-prefs";
const DEFAULTS: RacePrefs = { mode: "simple", guidance: true, trimHints: true, rules: true, penalties: false };
let cachedKey = "";
let cached = DEFAULTS;
let memory: RacePrefs | null = null;

function read(): RacePrefs {
  try {
    const mode = localStorage.getItem(RACE_MODE_KEY);
    const text = localStorage.getItem(RACE_ASSISTS_KEY) ?? "{}";
    const override = readRaceSearch().get("mode");
    const key = `${mode}|${text}|${override}|${JSON.stringify(memory)}`;
    if (key === cachedKey) return cached;
    const a = JSON.parse(text) as Record<string, unknown>;
    cachedKey = key;
    cached = { ...DEFAULTS, ...memory, mode: override === "pro" || override === "simple" ? override : mode === "pro" || mode === "simple" ? mode : memory?.mode ?? "simple",
      ...Object.fromEntries(["guidance", "trimHints", "rules", "penalties"].filter(k => typeof a[k] === "boolean").map(k => [k, a[k]])) };
    return cached;
  } catch { return memory ?? DEFAULTS; }
}
function subscribe(fn: () => void) {
  window.addEventListener(EVENT, fn); window.addEventListener("storage", fn);
  return () => { window.removeEventListener(EVENT, fn); window.removeEventListener("storage", fn); };
}
export function useRacePrefs() {
  const prefs = useSyncExternalStore(subscribe, read, () => DEFAULTS);
  const update = useCallback((patch: Partial<RacePrefs>) => {
    const next = { ...read(), ...patch };
    memory = next;
    try { localStorage.setItem(RACE_MODE_KEY, next.mode); localStorage.setItem(RACE_ASSISTS_KEY, JSON.stringify(next)); } catch { /* in-memory controls still work */ }
    // A one-shot deep link must not override a mode the learner just selected.
    try { const u = new URL(window.location.href); u.searchParams.delete("mode"); window.history.replaceState(window.history.state, "", u); } catch { /* local file */ }
    if (isNativeRace()) {
      const w = window as Window & { ReactNativeWebView?: { postMessage(message: string): void }; __REGATTA_EMBED__?: { query?: string | Record<string, string> } };
      if (w.__REGATTA_EMBED__?.query) { const q = new URLSearchParams(w.__REGATTA_EMBED__.query); q.delete("mode"); w.__REGATTA_EMBED__.query = q.toString(); }
      w.ReactNativeWebView?.postMessage(JSON.stringify({ type: "race-prefs", mode: next.mode, assists: { guidance: next.guidance, trimHints: next.trimHints, rules: next.rules, penalties: next.penalties } }));
    }
    window.dispatchEvent(new Event(EVENT));
  }, []);
  return { prefs, update };
}
