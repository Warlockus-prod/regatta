'use client';

// Package 13 (ADR-0022): the race's helm control on the web and in the app's
// WebView, beside race-prefs.ts (its own row, so the race preferences and their
// mocks stay as they were).

import { useSyncExternalStore } from "react";
import { RACE_HELM_KEY, isRaceHelmControl, resolveRaceHelmControl, type RaceHelmControl } from "@/lib/race-helm";
import { CONTROL_PREFS_EVENT, CONTROL_PREFS_KEY } from "@/features/trainer-controls/prefs";
import { recordPreferenceChange } from "@/lib/diagnostics-controls";

/**
 * Package 13 (ADR-0022): the race's helm control, its own row. A new install
 * steers with the arrows; a device that saved the trainers' controls keeps
 * their mode until the player picks a race control (race-helm.ts). Inside the
 * app the injected record says whether the app saved one (`saved`).
 */
const HELM_EVENT = "regatta:race-helm";
function savedTrainerMode(): unknown {
  if (typeof window === "undefined") return null;
  const injected = (window as Window & { __REGATTA_CONTROLS__?: unknown }).__REGATTA_CONTROLS__;
  if (injected && typeof injected === "object") {
    const record = injected as { saved?: unknown; mode?: unknown };
    return record.saved === true ? record.mode : null;
  }
  try {
    const text = localStorage.getItem(CONTROL_PREFS_KEY);
    return text ? (JSON.parse(text) as { mode?: unknown } | null)?.mode ?? null : null;
  } catch { return null; }
}
let helmMemory: RaceHelmControl | null = null;
export function readRaceHelmControl(): RaceHelmControl {
  if (typeof window === "undefined") return resolveRaceHelmControl(helmMemory, null);
  let stored: unknown = helmMemory;
  try { stored = localStorage.getItem(RACE_HELM_KEY) ?? helmMemory; } catch { /* in-memory choice */ }
  return resolveRaceHelmControl(stored, savedTrainerMode());
}
export function writeRaceHelmControl(next: RaceHelmControl, surface: "race" | "multiplayer" = "race"): void {
  if (!isRaceHelmControl(next)) return;
  const previous = readRaceHelmControl();
  helmMemory = next;
  // The app's race storage bridge carries this row to native storage (RACE_WEB_STORAGE_KEYS).
  try { localStorage.setItem(RACE_HELM_KEY, next); } catch { /* in-memory choice still works */ }
  recordPreferenceChange(surface, "race-helm", next, previous);
  window.dispatchEvent(new Event(HELM_EVENT));
}
function subscribeHelm(fn: () => void) {
  window.addEventListener(HELM_EVENT, fn); window.addEventListener("storage", fn); window.addEventListener(CONTROL_PREFS_EVENT, fn);
  return () => { window.removeEventListener(HELM_EVENT, fn); window.removeEventListener("storage", fn); window.removeEventListener(CONTROL_PREFS_EVENT, fn); };
}
export function useRaceHelmControl(surface: "race" | "multiplayer" = "race") {
  const helm = useSyncExternalStore(subscribeHelm, readRaceHelmControl, () => "arrows" as RaceHelmControl);
  return { helm, setHelm: (next: RaceHelmControl) => writeRaceHelmControl(next, surface) };
}
