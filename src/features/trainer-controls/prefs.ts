'use client';

import { useCallback, useSyncExternalStore } from "react";
import type { Sensitivity } from "./mapping";
import { recordDiagnostic, recordPreferenceChange } from "@/lib/diagnostics-controls";
import type { DiagnosticInput } from "@/lib/diagnostics";

// One record per device for every trainer surface (Basics, Trainer, 3D boat).
// Web: localStorage. Inside the iOS app the WebView injects the app's copy as
// window.__REGATTA_CONTROLS__ before the page runs, and changes made in the
// page are posted back so the app keeps the same choice
// (docs/design/trainer-controls-concept.md, section 7 and owner decisions).

export type ControlMode = "sliders" | "wheels";
export type HelmMapping = "course" | "rudder";
export type Surface = "basics" | "trainer" | "boat";

export interface DockLayout {
  /** Card ids shown in the Favorites tab, in order. */
  favorites: string[];
}

export interface ControlPrefs {
  version: 1;
  mode: ControlMode;
  /** Per surface override; missing = the surface default (course, 3D boat: rudder). */
  helmMapping: Partial<Record<Surface, HelmMapping>>;
  /** Owner decision 4: off by default, the learner returns the helm like on a boat. */
  helmReturnToCenter: boolean;
  sensitivity: Sensitivity;
  jibSheetSide: "left" | "right";
  /** Owner decision 6: no vibration; wheel clicks are sound and play only when sound is on. */
  sound: boolean;
  dock: Partial<Record<Surface, DockLayout>>;
}

export const CONTROL_PREFS_KEY = "regatta.controls.v1";
export const CONTROL_PREFS_EVENT = "regatta:controls-prefs";
export const LEGACY_RACE_MUTE_KEY = "regatta.muted.v1";

export const DEFAULT_CONTROL_PREFS: ControlPrefs = {
  version: 1,
  mode: "wheels",
  helmMapping: {},
  helmReturnToCenter: false,
  sensitivity: 1,
  jibSheetSide: "left",
  sound: false,
  dock: {},
};

const SURFACE_HELM_DEFAULT: Record<Surface, HelmMapping> = { basics: "course", trainer: "course", boat: "rudder" };

export function helmMappingFor(prefs: ControlPrefs, surface: Surface): HelmMapping {
  if (surface === "basics") return "course"; // Basics steers by heading only
  return prefs.helmMapping[surface] ?? SURFACE_HELM_DEFAULT[surface];
}

/** Accepts anything (storage, injected object, posted message) and returns a valid record. */
export function sanitizeControlPrefs(raw: unknown): ControlPrefs {
  const out: ControlPrefs = { ...DEFAULT_CONTROL_PREFS, helmMapping: {}, dock: {} };
  if (!raw || typeof raw !== "object") return out;
  const r = raw as Record<string, unknown>;
  if (r.mode === "sliders" || r.mode === "wheels") out.mode = r.mode;
  if (r.helmMapping && typeof r.helmMapping === "object") {
    for (const s of ["trainer", "boat"] as const) {
      const v = (r.helmMapping as Record<string, unknown>)[s];
      if (v === "course" || v === "rudder") out.helmMapping[s] = v;
    }
  }
  if (typeof r.helmReturnToCenter === "boolean") out.helmReturnToCenter = r.helmReturnToCenter;
  if (r.sensitivity === 0.5 || r.sensitivity === 1 || r.sensitivity === 2) out.sensitivity = r.sensitivity;
  if (r.jibSheetSide === "left" || r.jibSheetSide === "right") out.jibSheetSide = r.jibSheetSide;
  if (typeof r.sound === "boolean") out.sound = r.sound;
  if (r.dock && typeof r.dock === "object") {
    for (const s of ["basics", "trainer", "boat"] as const) {
      const d = (r.dock as Record<string, unknown>)[s] as { favorites?: unknown } | undefined;
      if (d && Array.isArray(d.favorites)) {
        const ids = d.favorites.filter((x): x is string => typeof x === "string" && x.length > 0 && x.length < 40).slice(0, 12);
        out.dock[s] = { favorites: Array.from(new Set(ids)) };
      }
    }
  }
  return out;
}

type ControlsWindow = Window & {
  __REGATTA_CONTROLS__?: unknown;
  ReactNativeWebView?: { postMessage: (message: string) => void };
};

export function readControlPrefs(): ControlPrefs {
  if (typeof window === "undefined") return DEFAULT_CONTROL_PREFS;
  const w = window as ControlsWindow;
  let stored: unknown = null;
  try {
    const text = window.localStorage.getItem(CONTROL_PREFS_KEY);
    stored = text ? JSON.parse(text) : null;
  } catch {
    stored = null;
  }
  // The app's copy wins over the WebView's own storage: the app Settings screen is the source of truth there.
  if (w.__REGATTA_CONTROLS__ && typeof w.__REGATTA_CONTROLS__ === "object") {
    return sanitizeControlPrefs({ ...(stored as object | null ?? {}), ...(w.__REGATTA_CONTROLS__ as object) });
  }
  const clean = sanitizeControlPrefs(stored);
  // Preserve an explicit older race choice only until this device has a
  // canonical sound preference. The injected native record always wins.
  if (!stored || typeof stored !== "object" || typeof (stored as { sound?: unknown }).sound !== "boolean") {
    try {
      const legacy = window.localStorage.getItem(LEGACY_RACE_MUTE_KEY);
      if (legacy === "0" || legacy === "1") clean.sound = legacy === "0";
    } catch { /* Keep the silent default when storage is unavailable. */ }
  }
  return clean;
}

export function writeControlPrefs(next: ControlPrefs) {
  if (typeof window === "undefined") return;
  const w = window as ControlsWindow;
  const previous = readControlPrefs();
  const clean = sanitizeControlPrefs(next);
  let persisted = true;
  try {
    window.localStorage.setItem(CONTROL_PREFS_KEY, JSON.stringify(clean));
    window.localStorage.setItem(LEGACY_RACE_MUTE_KEY, clean.sound ? "0" : "1");
  } catch { persisted = false; }
  if (w.__REGATTA_CONTROLS__) w.__REGATTA_CONTROLS__ = clean;
  try { w.ReactNativeWebView?.postMessage(JSON.stringify({ type: "controls-prefs", prefs: clean })); } catch { /* not in the app */ }
  window.dispatchEvent(new CustomEvent(CONTROL_PREFS_EVENT));
  const fields = [["mode", "mode"], ["helmReturnToCenter", "return-center"], ["sensitivity", "sensitivity"], ["jibSheetSide", "jib-side"], ["sound", "sound"]] as const;
  for (const [key, preference] of fields) if (previous[key] !== clean[key]) recordDiagnostic({ type: "control.preferences", surface: "app", outcome: "accepted", preference, value: clean[key], previous: previous[key] } as Extract<DiagnosticInput, { type: "control.preferences" }>);
  for (const surface of ["trainer", "boat"] as const) if (helmMappingFor(previous, surface) !== helmMappingFor(clean, surface)) recordDiagnostic({ type: "control.preferences", surface, outcome: "accepted", preference: "helm-mapping", value: helmMappingFor(clean, surface), previous: helmMappingFor(previous, surface) });
  for (const surface of ["basics", "trainer", "boat"] as const) {
    const before = previous.dock[surface]?.favorites ?? [], after = clean.dock[surface]?.favorites ?? [];
    if (JSON.stringify(before) !== JSON.stringify(after)) recordPreferenceChange(surface, "favorites-count", after.length, before.length, true);
  }
  recordDiagnostic({ type: "storage.operation", surface: "app", outcome: persisted ? "accepted" : "failed", action: "write", target: "preferences", ...(persisted ? {} : { reason: "storage-write" }) });
}

let snapshotKey: string | null = null;
let snapshotValue: ControlPrefs = DEFAULT_CONTROL_PREFS;

function snapshot(): ControlPrefs {
  let key = "";
  try { key = window.localStorage.getItem(CONTROL_PREFS_KEY) ?? ""; } catch { key = ""; }
  try { key += `|${JSON.stringify((window as ControlsWindow).__REGATTA_CONTROLS__ ?? null)}`; } catch { /* not serializable */ }
  if (key !== snapshotKey) {
    snapshotKey = key;
    snapshotValue = readControlPrefs();
  }
  return snapshotValue;
}

function subscribe(onChange: () => void) {
  const onStorage = (e: StorageEvent) => { if (e.key === CONTROL_PREFS_KEY) onChange(); };
  window.addEventListener(CONTROL_PREFS_EVENT, onChange);
  window.addEventListener("storage", onStorage);
  return () => {
    window.removeEventListener(CONTROL_PREFS_EVENT, onChange);
    window.removeEventListener("storage", onStorage);
  };
}

const serverSnapshot = () => DEFAULT_CONTROL_PREFS;

/**
 * Hydration-safe hook: the server render and hydration use the defaults,
 * then React re-renders with the stored record (useSyncExternalStore), so
 * no SSR mismatch on the trainer pages.
 */
export function useControlPrefs() {
  const prefs = useSyncExternalStore(subscribe, snapshot, serverSnapshot);
  const update = useCallback((patch: Partial<ControlPrefs> | ((p: ControlPrefs) => ControlPrefs)) => {
    const current = readControlPrefs();
    const next = typeof patch === "function" ? patch(current) : { ...current, ...patch };
    writeControlPrefs(next);
  }, []);
  return { prefs, update };
}
