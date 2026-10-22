'use client';

import { useCallback, useSyncExternalStore } from "react";
import type { RaceCamera } from "./pose";

// How the solo race is shown, shared by the race menu and the race screen
// (localStorage "regatta.race.view.v1" = "2d" | "3d", "regatta.race.camera.v1"
// = "stern" | "high"). A link with ?view=3d (the app opens the race that way)
// switches to 3D and remembers it.
export const RACE_VIEW_STORAGE_KEY = "regatta.race.view.v1";
export const RACE_CAMERA_STORAGE_KEY = "regatta.race.camera.v1";
const EVENT = "regatta:race-view";

function read3d(): boolean {
  try {
    const fromUrl = new URLSearchParams(window.location.search).get("view");
    if (fromUrl === "3d" || fromUrl === "2d") return fromUrl === "3d";
    return localStorage.getItem(RACE_VIEW_STORAGE_KEY) === "3d";
  } catch {
    return false;
  }
}

function readCamera(): RaceCamera {
  try {
    return localStorage.getItem(RACE_CAMERA_STORAGE_KEY) === "high" ? "high" : "stern";
  } catch {
    return "stern";
  }
}

function subscribe(onChange: () => void) {
  window.addEventListener(EVENT, onChange);
  window.addEventListener("storage", onChange);
  return () => {
    window.removeEventListener(EVENT, onChange);
    window.removeEventListener("storage", onChange);
  };
}

function write(key: string, value: string) {
  try { localStorage.setItem(key, value); } catch { /* private mode: keep for this page only */ }
  // A ?view= in the address would override the choice on the next read.
  try {
    const url = new URL(window.location.href);
    if (key === RACE_VIEW_STORAGE_KEY && url.searchParams.has("view")) {
      url.searchParams.set("view", value);
      window.history.replaceState(window.history.state, "", url);
    }
  } catch { /* no history API: the stored value still applies after a reload without ?view */ }
  window.dispatchEvent(new Event(EVENT));
}

export interface RaceViewState {
  view3d: boolean;
  camera: RaceCamera;
  setView3d: (on: boolean) => void;
  setCamera: (camera: RaceCamera) => void;
}

export function useRaceView(): RaceViewState {
  const view3d = useSyncExternalStore(subscribe, read3d, () => false);
  const camera = useSyncExternalStore(subscribe, readCamera, () => "stern" as const);
  const setView3d = useCallback((on: boolean) => write(RACE_VIEW_STORAGE_KEY, on ? "3d" : "2d"), []);
  const setCamera = useCallback((next: RaceCamera) => write(RACE_CAMERA_STORAGE_KEY, next), []);
  return { view3d, camera, setView3d, setCamera };
}
