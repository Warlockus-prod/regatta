/**
 * Trainer control preferences, shared with the web trainers.
 *
 * Storage shape:
 *   key   = `regatta.controls.v1` (same key and record as the website,
 *           src/features/trainer-controls/prefs.ts)
 *   value = JSON record. The app keeps it as the source of truth: SimWebView
 *           injects it as window.__REGATTA_CONTROLS__ before the page runs,
 *           and the page posts { type: "controls-prefs", prefs } back when the
 *           learner changes something in the trainer's own settings sheet.
 *
 * Owner decision 2026-10-24: wheels by default, existing slider choices stay; no
 * vibration, wheel clicks are sound and play only when sound is on.
 */

import { useEffect, useSyncExternalStore } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

export const CONTROLS_STORAGE_KEY = 'regatta.controls.v1';

export type ControlMode = 'sliders' | 'wheels';

export interface ControlPrefsRecord {
  version: 1;
  mode: ControlMode;
  sound: boolean;
  /** Everything else the web keeps (helm mapping, favorites, sensitivity...). Passed through untouched. */
  [key: string]: unknown;
}

export const DEFAULT_CONTROL_PREFS: ControlPrefsRecord = { version: 1, mode: 'wheels', sound: false };

/** Keeps known fields valid and passes the rest through for the web to sanitize. */
export function coerceControlPrefs(raw: unknown): ControlPrefsRecord {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return { ...DEFAULT_CONTROL_PREFS };
  const r = raw as Record<string, unknown>;
  return {
    ...r,
    version: 1,
    mode: r.mode === 'sliders' ? 'sliders' : 'wheels',
    sound: r.sound === true,
  };
}

let current: ControlPrefsRecord = { ...DEFAULT_CONTROL_PREFS };
let ready = false;
let loading: Promise<void> | null = null;
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());

function load(): Promise<void> {
  if (!loading) {
    loading = AsyncStorage.getItem(CONTROLS_STORAGE_KEY)
      .then((text) => { current = coerceControlPrefs(text ? JSON.parse(text) : null); })
      .catch(() => { current = { ...DEFAULT_CONTROL_PREFS }; })
      .finally(() => { ready = true; emit(); });
  }
  return loading;
}

export function setControlPrefs(next: unknown) {
  current = coerceControlPrefs(next);
  emit();
  void AsyncStorage.setItem(CONTROLS_STORAGE_KEY, JSON.stringify(current)).catch(() => undefined);
}

export function patchControlPrefs(patch: Partial<ControlPrefsRecord>) {
  setControlPrefs({ ...current, ...patch });
}

const subscribe = (l: () => void) => { listeners.add(l); return () => { listeners.delete(l); }; };
const snapshot = () => current;
const readySnapshot = () => ready;

/** Live, app-wide control preferences (Settings and every trainer screen see the same value). */
export function useControlPrefs() {
  useEffect(() => { void load(); }, []);
  const prefs = useSyncExternalStore(subscribe, snapshot, snapshot);
  const isReady = useSyncExternalStore(subscribe, readySnapshot, readySnapshot);
  return { prefs, ready: isReady, patch: patchControlPrefs, replace: setControlPrefs };
}

/** For tests: forget the in-memory copy. */
export function __resetControlPrefsForTests() {
  current = { ...DEFAULT_CONTROL_PREFS };
  ready = false;
  loading = null;
}
